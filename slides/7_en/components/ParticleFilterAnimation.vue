<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Localisation Monte Carlo 1D : couloir en boucle, 3 portes ─
// Cycle par étape : (1) prédire — chaque particule avance avec bruit ;
// (2) capter — détecteur binaire de porte (bruité) ; (3) pondérer —
// w ∝ p(z | x) ; (4) rééchantillonner (systématique) + injection de
// 1.5 % de particules aléatoires (récupération après kidnapping).
// Paramètres validés par simulation (voir pfsim.mjs) : trimodal après
// la 1re porte, convergence après la 2e, récupération post-kidnap.
const L = 10
const DOORS = [2, 4.5, 8] // gaps 2.5 / 3.5 / 4 : tous distincts → séquence discriminante
const DOOR_W = 0.4
const N = 300, STEP = 0.25, MOTION_SIG = 0.06
const P_HIT = 0.9, P_FALSE = 0.08, INJECT = 0.015

const wrap = (x: number) => ((x % L) + L) % L
const cdist = (a: number, b: number) => {
  const d = Math.abs(wrap(a) - wrap(b))
  return Math.min(d, L - d)
}
const nearDoor = (x: number) => DOORS.some(d => cdist(x, d) < DOOR_W)
const lik = (z: number, x: number) =>
  z ? (nearDoor(x) ? P_HIT : P_FALSE) : (nearDoor(x) ? 1 - P_HIT : 1 - P_FALSE)

function randn(): number {
  let u1 = 0
  while (u1 === 0) u1 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random())
}

const particles = ref<number[]>(Array.from({ length: N }, () => Math.random() * L))
const xTrue = ref(0.5)
const lastZ = ref<number | null>(null)
const nStep = ref(0)

function step() {
  // Vérité + prédiction des particules (même commande, bruit de mouvement)
  xTrue.value = wrap(xTrue.value + STEP)
  let parts = particles.value.map(p => wrap(p + STEP + randn() * MOTION_SIG))
  // Mesure binaire bruitée
  const z = (nearDoor(xTrue.value) ? Math.random() < P_HIT : Math.random() < P_FALSE) ? 1 : 0
  lastZ.value = z
  // Pondération puis rééchantillonnage systématique + injection
  const w = parts.map(p => lik(z, p))
  const sum = w.reduce((a, b) => a + b, 0)
  const cdf: number[] = []
  let acc = 0
  for (const wi of w) { acc += wi / sum; cdf.push(acc) }
  const next: number[] = []
  let u = Math.random() / N, j = 0
  for (let i = 0; i < N; i++) {
    while (cdf[j] < u && j < N - 1) j++
    next.push(Math.random() < INJECT ? Math.random() * L : parts[j])
    u += 1 / N
  }
  particles.value = next
  nStep.value++
}

function kidnap() {
  xTrue.value = wrap(xTrue.value + 5)
}

const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function play() {
  if (running.value) { pause(); return }
  running.value = true
  timer = setInterval(step, 200)
}
function pause() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function reset() {
  pause()
  particles.value = Array.from({ length: N }, () => Math.random() * L)
  xTrue.value = 0.5
  lastZ.value = null
  nStep.value = 0
}
onUnmounted(pause)

// ── Géométrie du dessin ───────────────────────────────────────
const PX0 = 24, PX1 = 534
const px = (x: number) => PX0 + wrap(x) / L * (PX1 - PX0)
const doorRects = DOORS.map(d => ({ x: px(d - DOOR_W), w: px(d + DOOR_W) - px(d - DOOR_W) }))

// Histogramme de croyance (40 bins)
const NBINS = 40
const HY0 = 196, HY1 = 118
const hist = computed(() => {
  const bins = new Array(NBINS).fill(0)
  for (const p of particles.value) bins[Math.min(NBINS - 1, Math.floor(wrap(p) / L * NBINS))]++
  const mx = Math.max(...bins, 1)
  return bins.map(b => b / mx)
})
const binW = (PX1 - PX0) / NBINS

// Nombre de modes (grappes de bins > 25 % du max) — pour le bandeau
const nModes = computed(() => {
  let n = 0, inside = false
  for (const b of hist.value) {
    if (b > 0.25 && !inside) { n++; inside = true }
    if (b <= 0.25) inside = false
  }
  return n
})
</script>

<template>
  <div class="pf-wrap">
    <svg viewBox="0 0 558 215" class="pf-svg">
      <rect x="8" y="8" width="542" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Corridor (loop): wall with door openings -->
      <text x="24" y="22" style="font-size:7.5px;fill:#64748b;font-family:sans-serif">looped corridor (10 m) — the robot advances 0.25 m/step</text>
      <rect :x="PX0" y="30" :width="PX1 - PX0" height="12" fill="#94a3b8"/>
      <rect v-for="(d, i) in doorRects" :key="i" :x="d.x" y="30" :width="d.w" height="12" fill="#F15A22"/>
      <text v-for="(d, i) in DOORS" :key="'t'+i" :x="px(d)" y="27" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:sans-serif">door</text>

      <!-- True robot -->
      <path :d="`M${px(xTrue)},46 l-5,9 l10,0 Z`" fill="#334155"/>
      <text :x="px(xTrue)" y="66" text-anchor="middle"
        style="font-size:7px;fill:#334155;font-family:sans-serif">robot (truth)</text>

      <!-- Sensor -->
      <rect x="440" y="48" width="94" height="16" rx="3"
        :fill="lastZ === 1 ? '#F15A22' : 'white'" :stroke="lastZ === 1 ? '#F15A22' : '#CBD5E1'"/>
      <text x="487" y="59" text-anchor="middle"
        style="font-size:8px;font-family:monospace;font-weight:700"
        :fill="lastZ === null ? '#94a3b8' : (lastZ === 1 ? 'white' : '#64748b')">
        {{ lastZ === null ? 'sensor: —' : (lastZ === 1 ? '🚪 DOOR!' : 'sensor: wall') }}
      </text>

      <!-- Particles -->
      <text x="24" y="82" style="font-size:7px;fill:#0284c7;font-family:sans-serif">{{ N }} particles:</text>
      <line v-for="(p, i) in particles" :key="'p'+i"
        :x1="px(p)" y1="86" :x2="px(p)" y2="97"
        stroke="#00BDF2" stroke-width="1" style="opacity:0.35"/>

      <!-- Belief histogram -->
      <text x="24" y="113" style="font-size:7px;fill:#991b1b;font-family:sans-serif">belief bel(x) (histogram):</text>
      <line :x1="PX0" :y1="HY0" :x2="PX1" :y2="HY0" stroke="#94a3b8" stroke-width="1"/>
      <rect v-for="(h, i) in hist" :key="'h'+i"
        :x="PX0 + i * binW + 0.5" :y="HY0 - h * (HY0 - HY1)"
        :width="binW - 1" :height="h * (HY0 - HY1)"
        fill="#CF1C24" style="opacity:0.75"/>

      <!-- Status banner -->
      <text x="24" y="205" style="font-size:7.5px;font-family:monospace;fill:#334155">
        t = {{ nStep }}
        <tspan dx="10" :fill="nModes >= 2 ? '#CF1C24' : '#15803d'" font-weight="700">
          {{ nModes >= 2 ? nModes + ' surviving hypotheses (multimodal belief)' : 'unimodal belief — localized' }}
        </tspan>
      </text>
    </svg>

    <div class="pf-controls">
      <button class="pf-btn" @click="step" :disabled="running">Step</button>
      <button class="pf-btn" :class="{ 'pf-on': running }" @click="play">{{ running ? '⏸ Pause' : '▶ Play' }}</button>
      <button class="pf-btn" @click="reset">Reset</button>
      <button class="pf-btn pf-kid" @click="kidnap">🎯 Kidnap the robot</button>
      <span class="pf-hint">after kidnapping, injecting 1.5% random particles enables recovery</span>
    </div>
  </div>
</template>

<style scoped>
.pf-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.pf-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.pf-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.pf-btn {
  font-family: monospace; font-size: 0.68rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.pf-btn:hover:not(:disabled) { background: #e2e8f0; }
.pf-btn:disabled { opacity: 0.5; cursor: default; }
.pf-on { background: #CF1C24; color: white; border-color: #CF1C24; }
.pf-kid { border-color: #F15A22; color: #c2410c; }
.pf-hint { font-size: 0.62rem; color: #94a3b8; font-family: sans-serif; }
</style>
