<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

// ── PRNG seedé ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-12), v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── Monde : 3 objets scriptés, zone d'occlusion ───────────────
// A et B traversent l'occlusion en parallèle (~26 frames > T_lost) ;
// C croise le chemin de A hors occlusion, puis s'arrête à f = 45.
const T = 110
const OCC = { x0: 15.5, x1: 23, y0: 7.5, y1: 14.5 }

function gtPos(id: number, f: number): { x: number; y: number } {
  if (id === 0) return { x: 3 + 0.28 * f, y: 6 + 0.04 * f }
  if (id === 1) return { x: 3 + 0.28 * f, y: 12.5 }
  const fc = Math.min(f, 45)
  return { x: 32 - 0.2 * fc, y: 3.5 + 0.06 * fc }
}
function inOcc(p: { x: number; y: number }): boolean {
  return p.x >= OCC.x0 && p.x <= OCC.x1 && p.y >= OCC.y0 && p.y <= OCC.y1
}

// ── Paramètres interactifs ────────────────────────────────────
const sigma = ref(0.35)   // bruit de détection (m)
const tLost = ref(6)      // frames de survie sans détection
const byteTrack = ref(false)
const THETA_H = 0.5       // seuil haute confiance
const GATE = 9.21         // porte χ²(2 ddl) à 99 %

// ── Détections précomputées (seedées) ─────────────────────────
interface Det { x: number; y: number; score: number; gt: number }
const detFrames = computed<Det[][]>(() => {
  const rng = mulberry32(31)
  const frames: Det[][] = []
  for (let f = 0; f < T; f++) {
    const dets: Det[] = []
    for (let id = 0; id < 3; id++) {
      const p = gtPos(id, f)
      const occ = inOcc(p)
      const draw = rng(), nx = gauss(rng), ny = gauss(rng)
      if (draw < (occ ? 0.15 : 0.05)) continue
      dets.push({ x: p.x + sigma.value * nx, y: p.y + sigma.value * ny, score: occ ? 0.35 : 0.92, gt: id })
    }
    frames.push(dets)
  }
  return frames
})

// ── Filtre de Kalman [x, y, vx, vy], vitesse constante ────────
type Vec4 = number[]
type Mat4 = number[][]
const Qd = [0.004, 0.004, 0.003, 0.003] // bruit de processus (les manœuvres)

function kfPredict(x: Vec4, P: Mat4): { x: Vec4; P: Mat4 } {
  const nx = [x[0] + x[2], x[1] + x[3], x[2], x[3]]
  // FP puis (FP)Fᵀ, F = [[1,0,1,0],[0,1,0,1],[0,0,1,0],[0,0,0,1]]
  const FP = P.map(r => r.slice())
  for (let j = 0; j < 4; j++) { FP[0][j] = P[0][j] + P[2][j]; FP[1][j] = P[1][j] + P[3][j] }
  const nP = FP.map(r => r.slice())
  for (let i = 0; i < 4; i++) { nP[i][0] = FP[i][0] + FP[i][2]; nP[i][1] = FP[i][1] + FP[i][3] }
  for (let i = 0; i < 4; i++) nP[i][i] += Qd[i]
  return { x: nx, P: nP }
}

// S = H P Hᵀ + R (2×2), R = σ²I — le tracker connaît le bruit réel
function innovCov(P: Mat4) {
  const r = sigma.value * sigma.value
  const s00 = P[0][0] + r, s01 = P[0][1], s11 = P[1][1] + r
  return { s00, s01, s11, det: s00 * s11 - s01 * s01 }
}
function maha2(x: Vec4, P: Mat4, d: Det): number {
  const { s00, s01, s11, det } = innovCov(P)
  const nx = d.x - x[0], ny = d.y - x[1]
  return (s11 * nx * nx - 2 * s01 * nx * ny + s00 * ny * ny) / det
}
function kfUpdate(x: Vec4, P: Mat4, d: Det): { x: Vec4; P: Mat4 } {
  const { s00, s01, s11, det } = innovCov(P)
  const i00 = s11 / det, i01 = -s01 / det, i11 = s00 / det
  const K = [0, 1, 2, 3].map(i => [
    P[i][0] * i00 + P[i][1] * i01,
    P[i][0] * i01 + P[i][1] * i11,
  ])
  const vx = d.x - x[0], vy = d.y - x[1]
  const nx = [0, 1, 2, 3].map(i => x[i] + K[i][0] * vx + K[i][1] * vy)
  const nP = [0, 1, 2, 3].map(i => [0, 1, 2, 3].map(j =>
    P[i][j] - K[i][0] * P[0][j] - K[i][1] * P[1][j]))
  return { x: nx, P: nP }
}

// ── Association optimale par énumération (hongrois exact, N ≤ 4)
// Non-appariement pénalisé à GATE ; paires hors porte interdites.
function assign(cost: number[][]): number[] {
  const nT = cost.length, nD = nT > 0 ? cost[0].length : 0
  let best: number[] = new Array(nD).fill(-1), bestC = Infinity
  const cur: number[] = new Array(nD).fill(-1)
  const usedT = new Array(nT).fill(false)
  function rec(j: number, acc: number) {
    if (acc >= bestC) return
    if (j === nD) {
      const total = acc + GATE * usedT.filter(u => !u).length
      if (total < bestC - 1e-12) { bestC = total; best = cur.slice() }
      return
    }
    for (let i = 0; i < nT; i++) {
      if (usedT[i] || cost[i][j] >= GATE) continue
      usedT[i] = true; cur[j] = i
      rec(j + 1, acc + cost[i][j])
      usedT[i] = false
    }
    cur[j] = -1
    rec(j + 1, acc + GATE) // détection j non appariée
  }
  rec(0, 0)
  return best
}

// ── Tracker ───────────────────────────────────────────────────
interface Track {
  id: number; x: Vec4; P: Mat4; hits: number; misses: number
  confirmed: boolean; gt: number; trail: { x: number; y: number }[]
}
const N_INIT = 3
const tracks = ref<Track[]>([])
const frame = ref(0)
const idsw = ref(0)
const nextId = ref(1)
let lastTrackOfGt: Record<number, number> = {}

// Une passe d'association : met à jour les tracks appariés, renvoie les ensembles
function runPass(dets: Det[], cand: Track[], matchedT: Set<Track>, matchedD: Set<Det>) {
  if (cand.length === 0 || dets.length === 0) return
  const cost = cand.map(tr => dets.map(d => maha2(tr.x, tr.P, d)))
  const a = assign(cost)
  a.forEach((ti, j) => {
    if (ti < 0) return
    const tr = cand[ti], d = dets[j]
    const up = kfUpdate(tr.x, tr.P, d)
    tr.x = up.x; tr.P = up.P; tr.hits++; tr.misses = 0
    if (tr.hits >= N_INIT) tr.confirmed = true
    tr.gt = d.gt
    matchedT.add(tr); matchedD.add(d)
  })
}

function stepOnce() {
  if (frame.value >= T) { stop(); return }
  const all = detFrames.value[frame.value]
  const high = all.filter(d => d.score >= THETA_H)
  const low = all.filter(d => d.score < THETA_H)

  for (const tr of tracks.value) {
    const pr = kfPredict(tr.x, tr.P)
    tr.x = pr.x; tr.P = pr.P
  }

  const matchedT = new Set<Track>(), matchedD = new Set<Det>()
  // Cascade (DeepSORT) : les confirmés d'abord — un track tentatif incertain
  // ne peut pas voler la détection d'un track établi.
  runPass(high, tracks.value.filter(t => t.confirmed), matchedT, matchedD)
  runPass(high.filter(d => !matchedD.has(d)), tracks.value.filter(t => !t.confirmed), matchedT, matchedD)
  if (byteTrack.value)
    runPass(low, tracks.value.filter(t => !matchedT.has(t)), matchedT, matchedD) // passe 2

  for (const tr of tracks.value) if (!matchedT.has(tr)) tr.misses++
  // Tentatif = mort au premier raté ; confirmé = survit T_lost frames
  tracks.value = tracks.value.filter(tr => tr.confirmed ? tr.misses <= tLost.value : tr.misses < 1)

  // Nouveaux tracks : uniquement depuis les détections haute confiance libres
  for (const d of high) {
    if (matchedD.has(d)) continue
    tracks.value.push({
      id: nextId.value++, x: [d.x, d.y, 0, 0],
      P: [[sigma.value ** 2, 0, 0, 0], [0, sigma.value ** 2, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5]],
      hits: 1, misses: 0, confirmed: false, gt: d.gt, trail: [],
    })
  }

  // IDSW : une même vérité terrain change de track confirmé
  for (const tr of tracks.value) {
    if (!tr.confirmed || !matchedT.has(tr)) continue
    const prev = lastTrackOfGt[tr.gt]
    if (prev !== undefined && prev !== tr.id) idsw.value++
    lastTrackOfGt[tr.gt] = tr.id
    tr.trail.push({ x: tr.x[0], y: tr.x[1] })
    if (tr.trail.length > 22) tr.trail.shift()
  }
  frame.value++
}

// ── Lecture ───────────────────────────────────────────────────
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function play() {
  if (playing.value) return
  if (frame.value >= T) reset()
  playing.value = true
  timer = setInterval(stepOnce, 90)
}
function stop() {
  playing.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function reset() {
  stop(); tracks.value = []; frame.value = 0; idsw.value = 0; nextId.value = 1
  lastTrackOfGt = {}
}
watch([sigma, tLost, byteTrack], reset)
onUnmounted(stop)

// ── Tracé ─────────────────────────────────────────────────────
const PX0 = 14, PX1 = 376, PY0 = 198, PY1 = 16
function sx(x: number): number { return PX0 + x / 36 * (PX1 - PX0) }
function sy(y: number): number { return PY0 - y / 19 * (PY0 - PY1) }

const COLORS = ['#00BDF2', '#F15A22', '#25B34B', '#CF1C24', '#8B5CF6', '#0891b2', '#ca8a04', '#ec4899']
function trackColor(id: number): string { return COLORS[(id - 1) % COLORS.length] }

const curDets = computed(() => frame.value > 0 ? detFrames.value[Math.min(frame.value - 1, T - 1)] : [])
const gtNow = computed(() => [0, 1, 2].map(id => gtPos(id, Math.max(0, Math.min(frame.value - 1, T - 1)))))

// Ellipse 2σ depuis le bloc position 2×2 de P
function ellipse(tr: Track): { rx: number; ry: number; ang: number } {
  const a = tr.P[0][0], b = tr.P[0][1], c = tr.P[1][1]
  const m = (a + c) / 2, d = Math.sqrt(Math.max(((a - c) / 2) ** 2 + b * b, 0))
  const l1 = Math.max(m + d, 1e-6), l2 = Math.max(m - d, 1e-6)
  const ang = 0.5 * Math.atan2(2 * b, a - c) * 180 / Math.PI
  const px = (PX1 - PX0) / 36
  return { rx: 2 * Math.sqrt(l1) * px, ry: 2 * Math.sqrt(l2) * px, ang: -ang }
}
const confirmedTracks = computed(() => tracks.value.filter(t => t.confirmed))
</script>

<template>
  <div class="mot-wrap">
    <svg viewBox="0 0 558 215" class="mot-svg">
      <!-- Panneau monde BEV -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Zone d'occlusion -->
      <rect :x="sx(OCC.x0)" :y="sy(OCC.y1)" :width="sx(OCC.x1) - sx(OCC.x0)" :height="sy(OCC.y0) - sy(OCC.y1)"
        fill="#94a3b8" style="opacity:0.25" rx="4"/>
      <text :x="(sx(OCC.x0)+sx(OCC.x1))/2" :y="sy(OCC.y1) + 12" text-anchor="middle"
        style="font-size:7px;fill:#475569;font-family:sans-serif">occlusion (score faible)</text>

      <!-- Vérité terrain -->
      <g v-if="frame > 0">
        <circle v-for="(p, i) in gtNow" :key="`g${i}`" :cx="sx(p.x)" :cy="sy(p.y)" r="5"
          fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2,2"/>
      </g>

      <!-- Trails -->
      <g>
        <polyline v-for="tr in confirmedTracks" :key="`tl${tr.id}`"
          :points="tr.trail.map(p => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')"
          fill="none" :stroke="trackColor(tr.id)" stroke-width="1" style="opacity:0.5"/>
      </g>

      <!-- Détections de la frame courante -->
      <g v-if="frame > 0">
        <g v-for="(d, i) in curDets" :key="`d${i}`">
          <line :x1="sx(d.x)-3" :y1="sy(d.y)-3" :x2="sx(d.x)+3" :y2="sy(d.y)+3"
            :stroke="d.score >= THETA_H ? '#334155' : '#F15A22'" stroke-width="1.4"/>
          <line :x1="sx(d.x)-3" :y1="sy(d.y)+3" :x2="sx(d.x)+3" :y2="sy(d.y)-3"
            :stroke="d.score >= THETA_H ? '#334155' : '#F15A22'" stroke-width="1.4"/>
        </g>
      </g>

      <!-- Tracks confirmés -->
      <g>
        <g v-for="tr in confirmedTracks" :key="`t${tr.id}`">
          <ellipse :cx="sx(tr.x[0])" :cy="sy(tr.x[1])" :rx="ellipse(tr).rx" :ry="ellipse(tr).ry"
            :transform="`rotate(${ellipse(tr).ang} ${sx(tr.x[0])} ${sy(tr.x[1])})`"
            :fill="trackColor(tr.id)" style="opacity:0.15" :stroke="trackColor(tr.id)" stroke-width="0.8"/>
          <circle :cx="sx(tr.x[0])" :cy="sy(tr.x[1])" r="4" :fill="trackColor(tr.id)" stroke="white" stroke-width="1"/>
          <line :x1="sx(tr.x[0])" :y1="sy(tr.x[1])"
            :x2="sx(tr.x[0] + 6 * tr.x[2])" :y2="sy(tr.x[1] + 6 * tr.x[3])"
            :stroke="trackColor(tr.id)" stroke-width="1.3"/>
          <text :x="sx(tr.x[0])" :y="sy(tr.x[1]) - 8" text-anchor="middle"
            :style="`font-size:8px;fill:${trackColor(tr.id)};font-weight:700;font-family:monospace`">#{{ tr.id }}</text>
        </g>
      </g>

      <!-- Légende -->
      <g style="font-size:6.8px;font-family:sans-serif">
        <circle cx="24" cy="18" r="4" fill="none" stroke="#94a3b8" stroke-dasharray="2,2"/>
        <text x="31" y="21" fill="#64748b">vérité</text>
        <text x="66" y="21" fill="#334155">✕ détection</text>
        <text x="122" y="21" fill="#F15A22">✕ score faible</text>
        <circle cx="188" cy="18" r="4" fill="#00BDF2"/>
        <text x="195" y="21" fill="#0284c7">piste + ellipse 2σ</text>
      </g>

      <!-- Panneau info -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Suivi par détection</text>

      <g style="font-size:7.4px;font-family:monospace">
        <text x="398" y="42" fill="#334155">instant {{ frame }} / {{ T }}</text>
        <text x="398" y="56" fill="#334155">pistes actives : {{ confirmedTracks.length }}</text>
        <text x="398" y="70" :fill="byteTrack ? '#25B34B' : '#94a3b8'" font-weight="700">
          {{ byteTrack ? '2 passes (ByteTrack) ✓' : 'passe unique (θ = 0.5)' }}</text>
      </g>

      <text x="470" y="106" text-anchor="middle"
        style="font-size:26px;font-weight:700;font-family:monospace"
        :fill="idsw === 0 ? '#25B34B' : '#CF1C24'">{{ idsw }}</text>
      <text x="470" y="120" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">changements d’identité</text>

      <rect x="398" y="132" width="144" height="52" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="470" y="144" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">En occultation, les scores diminuent.</text>
      <text x="470" y="154" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">Sans réassociation, les pistes</text>
      <text x="470" y="164" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">expirent après T_lost, puis peuvent</text>
      <text x="470" y="174" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">être recréées avec une autre identité.</text>

      <text x="470" y="198" text-anchor="middle"
        style="font-size:6.3px;fill:#94a3b8;font-family:sans-serif">Kalman, seuil χ² et association optimale</text>
    </svg>

    <div class="mot-controls">
      <button class="mot-btn" @click="playing ? stop() : play()">{{ playing ? '⏸' : '▶' }}</button>
      <button class="mot-btn" @click="stepOnce" :disabled="playing">Pas</button>
      <button class="mot-btn" @click="reset">Réinitialiser</button>
      <button class="mot-btn" :class="{ 'mot-on': byteTrack }" @click="byteTrack = !byteTrack">2 passes (ByteTrack)</button>
      <label class="mot-sl">
        σ détection
        <strong>{{ sigma.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma" min="0.15" max="0.7" step="0.05"/>
      </label>
      <label class="mot-sl">
        T_lost
        <strong>{{ tLost }}</strong>
        <input type="range" v-model.number="tLost" min="2" max="15" step="1"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.mot-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.mot-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.mot-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mot-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.mot-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.mot-sl input[type=range] { width: 95px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.mot-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.mot-btn:hover:not(:disabled) { background: #e2e8f0; }
.mot-btn:disabled { opacity: 0.5; cursor: default; }
.mot-on { background: #25B34B; color: white; border-color: #25B34B; }
</style>
