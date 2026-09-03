<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Paramètres ────────────────────────────────────────────────
const N        = 40                  // pas de temps
const RMAX     = 10.0                // portée (m)
// Résolution angulaire FIXE (~2,8°/rayon) : rétrécir l'ouverture réduit le
// nombre de points, comme sur un vrai télémètre — ce n'est pas le même capteur
// qui se contenterait de regarder moins large.
const ANG_RES  = (270 / 96) * Math.PI / 180
const ICP_ITER = 16                  // itérations d'alignement
const ICP_GATE = 0.28                // rejet d'appariement (m) → bassin d'attraction
const OUT_FRAC = 0.10                // retours aberrants à σ_scan max (modèle mixte)
const SEED     = 20250902

const sigmaOdom = ref(0.03)  // bruit d'odométrie (m par pas)
const sigmaScan = ref(0.01)  // bruit du télémètre (m)
const fovDeg    = ref(270)   // ouverture du lidar (°)
const k         = ref(N)     // pas affiché

const fov   = computed(() => fovDeg.value * Math.PI / 180)
const nrays = computed(() => Math.max(8, Math.round(fov.value / ANG_RES)))

type Pose = [number, number, number]   // x, y, θ
type Pt   = [number, number]
type Seg  = [number, number, number, number]

// ── Environnement : pièce + obstacle central ──────────────────
// L'obstacle donne des coins aux scans : un couloir nu serait
// dégénéré pour l'alignement le long de son axe.
const WALLS: Seg[] = [
  [0, 0, 10, 0], [10, 0, 10, 7], [10, 7, 0, 7], [0, 7, 0, 0],
  [3.9, 2.8, 6.1, 2.8], [6.1, 2.8, 6.1, 4.2], [6.1, 4.2, 3.9, 4.2], [3.9, 4.2, 3.9, 2.8],
]

// ── Trajectoire vraie : boucle autour de l'obstacle ───────────
function truePose(i: number): Pose {
  const t = (i / N) * 2 * Math.PI
  return [5 + 3.3 * Math.cos(t), 3.5 + 2.2 * Math.sin(t),
          Math.atan2(2.2 * Math.cos(t), -3.3 * Math.sin(t))]
}

// ── Aléatoire reproductible ───────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function makeGauss(rnd: () => number) {
  return () => {
    const u = Math.max(rnd(), 1e-9), v = rnd()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}

// ── Lidar : intersection rayon / segments ─────────────────────
function raycast(ox: number, oy: number, dx: number, dy: number): number {
  let best = RMAX
  for (const [x1, y1, x2, y2] of WALLS) {
    const ex = x2 - x1, ey = y2 - y1
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-12) continue
    const t = ((x1 - ox) * ey - (y1 - oy) * ex) / den
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t
  }
  return best
}

// Scan mesuré, exprimé dans le repère du robot.
// Modèle de capteur mixte : bruit gaussien sur la portée + une fraction de
// retours aberrants (bords, surfaces réfléchissantes) qui croît avec σ_scan.
function measureScan(p: Pose, sigma: number, gauss: () => number, uni: () => number,
                     ouverture: number, rays: number): Pt[] {
  const pts: Pt[] = []
  for (let j = 0; j < rays; j++) {
    const a = -ouverture / 2 + (j / (rays - 1)) * ouverture
    const wa = p[2] + a
    let r = raycast(p[0], p[1], Math.cos(wa), Math.sin(wa)) + sigma * gauss()
    if (uni() < OUT_FRAC * (sigma / 0.20)) r = 0.5 + uni() * (RMAX - 1.0)
    if (r > 0.1 && r < RMAX - 0.05) pts.push([r * Math.cos(a), r * Math.sin(a)])
  }
  return pts
}

// ── Alignement scan-à-scan (ICP 2D, solution en forme fermée) ─
// Même critère qu'au cours 1 : min Σ‖q_i − (R p_i + t)‖².
// En 2D l'angle optimal s'obtient sans SVD, par atan2 des sommes croisées.
function icp2d(src: Pt[], dst: Pt[], init: Pose): Pose {
  let [tx, ty, th] = init
  const gate2 = ICP_GATE * ICP_GATE
  for (let it = 0; it < ICP_ITER; it++) {
    const c = Math.cos(th), s = Math.sin(th)
    const A: Pt[] = [], B: Pt[] = []
    for (const p of src) {
      const ax = c * p[0] - s * p[1] + tx
      const ay = s * p[0] + c * p[1] + ty
      let bd = gate2, bx = 0, by = 0, found = false
      for (const q of dst) {
        const d = (q[0] - ax) * (q[0] - ax) + (q[1] - ay) * (q[1] - ay)
        if (d < bd) { bd = d; bx = q[0]; by = q[1]; found = true }
      }
      if (found) { A.push([ax, ay]); B.push([bx, by]) }
    }
    if (A.length < 6) break                      // trop peu d'appariements : on s'arrête
    let cax = 0, cay = 0, cbx = 0, cby = 0
    for (let i = 0; i < A.length; i++) { cax += A[i][0]; cay += A[i][1]; cbx += B[i][0]; cby += B[i][1] }
    cax /= A.length; cay /= A.length; cbx /= A.length; cby /= A.length
    let sxy = 0, sxx = 0
    for (let i = 0; i < A.length; i++) {
      const ax = A[i][0] - cax, ay = A[i][1] - cay
      const bx = B[i][0] - cbx, by = B[i][1] - cby
      sxy += ax * by - ay * bx
      sxx += ax * bx + ay * by
    }
    const dth = Math.atan2(sxy, sxx)
    const cd = Math.cos(dth), sd = Math.sin(dth)
    // L'incrément s'applique aux points déjà transformés : on le compose à gauche.
    const ntx = cbx - (cd * cax - sd * cay)
    const nty = cby - (sd * cax + cd * cay)
    const rx = cd * tx - sd * ty, ry = sd * tx + cd * ty
    tx = rx + ntx; ty = ry + nty; th += dth
  }
  return [tx, ty, th]
}

// ── Distance point → mur le plus proche (dispersion de la carte)
function distToWalls(x: number, y: number): number {
  let best = Infinity
  for (const [x1, y1, x2, y2] of WALLS) {
    const ex = x2 - x1, ey = y2 - y1
    const L2 = ex * ex + ey * ey
    let t = L2 > 0 ? ((x - x1) * ex + (y - y1) * ey) / L2 : 0
    t = Math.max(0, Math.min(1, t))
    const dx = x - (x1 + t * ex), dy = y - (y1 + t * ey)
    const d = Math.hypot(dx, dy)
    if (d < best) best = d
  }
  return best
}

// ── Parcours complet, recalculé à chaque changement de curseur ─
// Ne dépend PAS de k : se déplacer dans le temps ne recalcule rien.
const run = computed(() => {
  const uni = mulberry32(SEED ^ 0x9e37)
  const gauss = makeGauss(mulberry32(SEED))
  const truePoses: Pose[] = [], scans: Pt[][] = []
  for (let i = 0; i <= N; i++) {
    truePoses.push(truePose(i))
    scans.push(measureScan(truePoses[i], sigmaScan.value, gauss, uni, fov.value, nrays.value))
  }

  const estPoses: Pose[] = [[...truePoses[0]] as Pose]
  for (let i = 1; i <= N; i++) {
    const a = truePoses[i - 1], b = truePoses[i]
    const ca = Math.cos(a[2]), sa = Math.sin(a[2])
    const dx = b[0] - a[0], dy = b[1] - a[1]
    // ce que donnerait l'odométrie seule : mouvement vrai + bruit
    const init: Pose = [
      ca * dx + sa * dy + sigmaOdom.value * gauss(),
      -sa * dx + ca * dy + sigmaOdom.value * gauss(),
      b[2] - a[2] + sigmaOdom.value * 0.3 * gauss(),
    ]
    const rel = icp2d(scans[i], scans[i - 1], init)   // l'alignement corrige l'odométrie
    const e = estPoses[i - 1]
    const ce = Math.cos(e[2]), se = Math.sin(e[2])
    estPoses.push([e[0] + ce * rel[0] - se * rel[1],
                   e[1] + se * rel[0] + ce * rel[1],
                   e[2] + rel[2]])
  }

  // Carte : chaque scan posé à la pose ESTIMÉE ; métriques cumulées.
  // L'épaisseur est la MÉDIANE de la distance au mur : les quelques retours
  // aberrants sont visibles à l'œil comme des points isolés, ils ne doivent pas
  // gonfler un chiffre censé décrire l'étalement du mur.
  const mapped: Pt[][] = [], errPos: number[] = [], spread: number[] = []
  const dists: number[] = []
  for (let i = 0; i <= N; i++) {
    const e = estPoses[i], c = Math.cos(e[2]), s = Math.sin(e[2])
    const pts: Pt[] = scans[i].map(p => [e[0] + c * p[0] - s * p[1], e[1] + s * p[0] + c * p[1]] as Pt)
    mapped.push(pts)
    for (const q of pts) dists.push(distToWalls(q[0], q[1]))
    errPos.push(Math.hypot(e[0] - truePoses[i][0], e[1] - truePoses[i][1]))
    const sorted = dists.slice().sort((a, b) => a - b)
    spread.push(sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0)
  }
  return { truePoses, estPoses, scans, mapped, errPos, spread }
})

// ── Monde → écran (deux panneaux, même échelle) ───────────────
const S = 22.5, PANEL_DX = 280
function px(x: number) { return 17.5 + (x + 0.4) * S }
function py(y: number) { return 202 - (y + 0.4) * S }
function pxR(x: number) { return px(x) + PANEL_DX }

function poly(pts: Pt[] | Pose[], right = false): string {
  const fx = right ? pxR : px
  return pts.map(p => `${fx(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')
}
// Nuage de points en UN seul élément : chaque point est un segment nul à bout rond.
function dots(pts: Pt[], right = false): string {
  const fx = right ? pxR : px
  return pts.map(p => `M${fx(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}h0.01`).join('')
}
function robot(p: Pose, right = false): string {
  const fx = right ? pxR : px
  const c = Math.cos(p[2]), s = Math.sin(p[2])
  const tri: Pt[] = [[0.5, 0], [-0.3, 0.3], [-0.3, -0.3]]
  return tri.map(([a, b]) => `${fx(p[0] + c * a - s * b).toFixed(1)},${py(p[1] + s * a + c * b).toFixed(1)}`).join(' ')
}

const wallSegs = computed(() => WALLS.map(([x1, y1, x2, y2]) => ({
  x1: px(x1), y1: py(y1), x2: px(x2), y2: py(y2),
  rx1: pxR(x1), rx2: pxR(x2),
})))

const truePath  = computed(() => poly(run.value.truePoses.slice(0, k.value + 1)))
const estPath   = computed(() => poly(run.value.estPoses.slice(0, k.value + 1), true))
const trueRobot = computed(() => robot(run.value.truePoses[k.value]))
const estRobot  = computed(() => robot(run.value.estPoses[k.value], true))

// Scan courant, posé à la pose vraie (panneau gauche)
const scanNow = computed(() => {
  const p = run.value.truePoses[k.value], c = Math.cos(p[2]), s = Math.sin(p[2])
  return run.value.scans[k.value].map(q => [p[0] + c * q[0] - s * q[1], p[1] + s * q[0] + c * q[1]] as Pt)
})
const scanDots = computed(() => dots(scanNow.value))
const fanPath  = computed(() => {
  const p = run.value.truePoses[k.value]
  return scanNow.value.map(q => `M${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}L${px(q[0]).toFixed(1)},${py(q[1]).toFixed(1)}`).join('')
})
// Carte accumulée jusqu'à k (panneau droit)
const mapDots = computed(() => {
  const all: Pt[] = []
  for (let i = 0; i <= k.value; i++) all.push(...run.value.mapped[i])
  return dots(all, true)
})

const errNow    = computed(() => run.value.errPos[k.value])
const spreadNow = computed(() => run.value.spread[k.value])

// ── Contrôles ─────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | null = null
const playing = ref(false)
function clearTimer() { if (timer) { clearTimeout(timer); timer = null } }
function go(dir: 1 | -1) {
  clearTimer(); playing.value = false
  k.value = Math.max(0, Math.min(N, k.value + dir))
}
function togglePlay() {
  if (playing.value) { clearTimer(); playing.value = false; return }
  if (k.value >= N) k.value = 0
  playing.value = true
  const tick = () => {
    if (k.value >= N) { playing.value = false; return }
    k.value++
    timer = setTimeout(tick, 160)
  }
  tick()
}
function reset() { clearTimer(); playing.value = false; k.value = 0 }
onUnmounted(clearTimer)
</script>

<template>
  <div class="sd-wrap">
    <svg viewBox="0 0 558 215" class="sd-svg">

      <!-- ═══ PANNEAU GAUCHE : vérité terrain ═══ -->
      <rect x="2" y="2" width="274" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="139" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vérité terrain — le robot et son scan courant
      </text>

      <path :d="fanPath" fill="none" stroke="#00BDF2" stroke-width="0.5" style="opacity:0.35"/>
      <line v-for="(w, i) in wallSegs" :key="`wl${i}`"
        :x1="w.x1" :y1="w.y1" :x2="w.x2" :y2="w.y2" stroke="#475569" stroke-width="2.6" stroke-linecap="round"/>
      <polyline :points="truePath" fill="none" stroke="#25B34B" stroke-width="1.8"
        stroke-dasharray="5,3" style="opacity:0.75"/>
      <path :d="scanDots" fill="none" stroke="#25B34B" stroke-width="2.6" stroke-linecap="round"/>
      <polygon :points="trueRobot" fill="#25B34B" stroke="white" stroke-width="1"/>

      <line x1="14" y1="207" x2="30" y2="207" stroke="#25B34B" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="34" y="210" style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">trajectoire vraie</text>
      <text x="120" y="210" style="font-size:8px;fill:#00BDF2;font-weight:700;font-family:sans-serif">faisceau lidar</text>
      <text x="196" y="210" style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">murs réels</text>

      <!-- ═══ PANNEAU DROIT : ce que le robot construit ═══ -->
      <rect x="282" y="2" width="274" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="419" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        carte estimée — scans posés aux poses estimées
      </text>

      <line v-for="(w, i) in wallSegs" :key="`wr${i}`"
        :x1="w.rx1" :y1="w.y1" :x2="w.rx2" :y2="w.y2" stroke="#CBD5E1" stroke-width="2.2" stroke-linecap="round"/>
      <path :d="mapDots" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" style="opacity:0.55"/>
      <polyline :points="estPath" fill="none" stroke="#CF1C24" stroke-width="2.2"
        stroke-linejoin="round" stroke-linecap="round"/>
      <polygon :points="estRobot" fill="#CF1C24" stroke="white" stroke-width="1"/>

      <line x1="294" y1="207" x2="310" y2="207" stroke="#CF1C24" stroke-width="2.2"/>
      <text x="314" y="210" style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">trajectoire estimée</text>
      <text x="410" y="210" style="font-size:8px;fill:#334155;font-weight:700;font-family:sans-serif">carte accumulée</text>
      <text x="492" y="210" style="font-size:8px;fill:#94a3b8;font-weight:700;font-family:sans-serif">murs réels</text>
    </svg>

    <!-- Contrôles -->
    <div class="sd-controls">
      <label class="sd-sl sd-sl-scan">
        <span>σ_scan =</span><strong>{{ sigmaScan.toFixed(2) }}</strong><span class="sd-unit">m</span>
        <input type="range" v-model.number="sigmaScan" min="0" max="0.20" step="0.01"/>
      </label>
      <label class="sd-sl sd-sl-fov">
        <span>FOV =</span><strong>{{ fovDeg }}°</strong><span class="sd-unit">{{ nrays }} rayons</span>
        <input type="range" v-model.number="fovDeg" min="45" max="360" step="15"/>
      </label>
      <label class="sd-sl">
        <span>σ_odom =</span><strong>{{ sigmaOdom.toFixed(2) }}</strong><span class="sd-unit">m/pas</span>
        <input type="range" v-model.number="sigmaOdom" min="0" max="0.30" step="0.01"/>
      </label>
      <button class="sd-btn" @click="go(-1)" :disabled="k === 0">◀</button>
      <button class="sd-btn sd-play" @click="togglePlay">{{ playing ? '⏸' : '▶ Auto' }}</button>
      <button class="sd-btn" @click="go(1)" :disabled="k >= N">▶</button>
      <button class="sd-btn sd-reset" @click="reset">↺</button>
      <span class="sd-step">k = {{ k }} / {{ N }}</span>
      <div class="sd-result">
        erreur de pose <strong>{{ errNow.toFixed(2) }} m</strong>
        · épaisseur des murs <strong>{{ spreadNow.toFixed(2) }} m</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sd-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.sd-svg  { height: 330px; width: auto; max-width: 100%; display: block; margin: 0 auto; }

.sd-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.sd-sl {
  display: flex; align-items: center; gap: 4px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.sd-sl strong { color: #CF1C24; min-width: 30px; }
.sd-sl-scan strong { color: #00BDF2; }
.sd-sl-fov strong { color: #25B34B; }
.sd-unit { color: #94a3b8; font-size: 0.62rem; }
.sd-sl input[type=range] { width: 88px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.sd-sl-scan input[type=range] { accent-color: #00BDF2; }
.sd-sl-fov input[type=range] { accent-color: #25B34B; }

.sd-btn {
  padding: 2px 9px; border-radius: 5px; cursor: pointer; font-size: 0.7rem;
  border: 1.5px solid #7C3AED; background: #f5f3ff; color: #7C3AED;
  font-weight: 700; transition: background 0.15s;
}
.sd-btn:hover:not(:disabled) { background: #7C3AED; color: white; }
.sd-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sd-btn.sd-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.sd-step { font-family: monospace; font-size: 0.68rem; color: #64748b; }

.sd-result {
  font-family: monospace; font-size: 0.68rem; color: #334155;
  padding: 2px 9px; background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 5px;
}
.sd-result strong { color: #7C3AED; font-weight: 700; }
</style>
