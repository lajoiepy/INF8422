<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Consistance d'un filtre : NEES vs test χ² ─────────────────
// Vérité : marche aléatoire 2D, bruit de procédé Q_vrai par axe.
// Filtre : KF (F = I) avec Q_filtre = ratio · Q_vrai et mesures
// z = x + v, v ~ N(0, diag(Rx, Ry)) → P reste diagonale (2 KF 1D).
// NEES_t = eₓ²/Pₓ + e_y²/P_y ~ χ²(2) si le filtre est consistant.
const Q_TRUE = 0.06
const RX = 0.35 ** 2, RY = 0.9 ** 2
const W = 60 // fenêtre glissante du NEES moyen

const logRatio = ref(-0.7) // ratio = 10^logRatio, défaut ≈ 0.2 (sur-confiant)
const ratio = computed(() => 10 ** logRatio.value)

const truth = ref({ x: 5, y: 5 })
const est = ref({ x: 5, y: 5 })
const Pd = ref({ x: 1.0, y: 1.0 })
const trail = ref<{ x: number; y: number }[]>([])
const neesHist = ref<number[]>([])
const nStep = ref(0)

function randn(): number {
  let u1 = 0
  while (u1 === 0) u1 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random())
}

function step() {
  // Vérité : marche aléatoire pure (le modèle du filtre est donc exact)
  truth.value = {
    x: truth.value.x + randn() * Math.sqrt(Q_TRUE),
    y: truth.value.y + randn() * Math.sqrt(Q_TRUE),
  }
  // Recentrage caméra : translation IDENTIQUE de la vérité, de l'estimée et
  // de la trace — l'erreur (donc le NEES) est rigoureusement préservée,
  // contrairement à une réflexion aux bords qui violerait le modèle.
  const shX = (truth.value.x - 5) * 0.04
  const shY = (truth.value.y - 5) * 0.04
  truth.value = { x: truth.value.x - shX, y: truth.value.y - shY }
  est.value = { x: est.value.x - shX, y: est.value.y - shY }
  for (const p of trail.value) { p.x -= shX; p.y -= shY }
  // Prédiction avec le Q que le filtre CROIT correct
  const qf = ratio.value * Q_TRUE
  Pd.value = { x: Pd.value.x + qf, y: Pd.value.y + qf }
  // Correction (deux KF 1D, P diagonale)
  const zx = truth.value.x + randn() * Math.sqrt(RX)
  const zy = truth.value.y + randn() * Math.sqrt(RY)
  const kx = Pd.value.x / (Pd.value.x + RX)
  const ky = Pd.value.y / (Pd.value.y + RY)
  est.value = { x: est.value.x + kx * (zx - est.value.x), y: est.value.y + ky * (zy - est.value.y) }
  Pd.value = { x: (1 - kx) * Pd.value.x, y: (1 - ky) * Pd.value.y }
  // NEES contre la vérité terrain
  const ex = truth.value.x - est.value.x
  const ey = truth.value.y - est.value.y
  const nees = ex * ex / Pd.value.x + ey * ey / Pd.value.y
  neesHist.value.push(nees)
  if (neesHist.value.length > 220) neesHist.value.shift()
  trail.value.push({ ...truth.value })
  if (trail.value.length > 90) trail.value.shift()
  nStep.value++
}

const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function play() {
  if (running.value) { pause(); return }
  running.value = true
  timer = setInterval(step, 70)
}
function pause() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function reset() {
  pause()
  truth.value = { x: 5, y: 5 }; est.value = { x: 5, y: 5 }
  Pd.value = { x: 1.0, y: 1.0 }
  trail.value = []; neesHist.value = []; nStep.value = 0
  seed()
}
function seed() { for (let i = 0; i < 120; i++) step() }
seed()
onUnmounted(pause)

// NEES moyen sur fenêtre glissante. Les NEES consécutifs d'UN run sont
// autocorrélés (l'erreur du filtre persiste ~1/K pas) : les bornes χ² iid
// seraient trop étroites. Bornes 95 % calibrées par Monte-Carlo (400 runs,
// W = 60, ce système exact) : NEES fenêtré ∈ [1.37, 3.01] quand ratio = 1.
const neesAvg = computed(() => {
  const h = neesHist.value.slice(-W)
  return h.length ? h.reduce((a, b) => a + b, 0) / h.length : 2
})
const LO = 1.3
const HI = 3.0
const verdict = computed(() => {
  if (neesAvg.value > HI) return { txt: 'OVER-CONFIDENT — P too small', col: '#CF1C24' }
  if (neesAvg.value < LO) return { txt: 'conservative — P too large', col: '#0284c7' }
  if (ratio.value > 3) return { txt: 'NEES ~ok… but look at the ellipse!', col: '#0284c7' }
  return { txt: 'consistent ✓', col: '#15803d' }
})

// ── Panneau gauche : plan 2D ──────────────────────────────────
const MX0 = 22, MY0 = 22, MSZ = 176
function mx(x: number): number { return MX0 + x / 10 * MSZ }
function my(y: number): number { return MY0 + (10 - y) / 10 * MSZ }
const trailPath = computed(() =>
  trail.value.length ? 'M' + trail.value.map(p => `${mx(p.x).toFixed(1)},${my(p.y).toFixed(1)}`).join(' L') : '')

// ── Panneau droit : chronologie du NEES moyen ─────────────────
const TX0 = 246, TX1 = 542, TY0 = 168, TY1 = 34
const NMAX = 10
function tX(i: number, n: number): number { return TX0 + (n <= 1 ? 0 : i / (n - 1)) * (TX1 - TX0) }
function tY(v: number): number { return TY0 - Math.min(v, NMAX) / NMAX * (TY0 - TY1) }
const neesAvgSeries = computed(() => {
  const out: number[] = []
  const h = neesHist.value
  for (let i = 0; i < h.length; i++) {
    const from = Math.max(0, i - W + 1)
    let s = 0
    for (let j = from; j <= i; j++) s += h[j]
    out.push(s / (i - from + 1))
  }
  return out
})
const neesPath = computed(() => {
  const s = neesAvgSeries.value
  return s.length ? 'M' + s.map((v, i) => `${tX(i, s.length).toFixed(1)},${tY(v).toFixed(1)}`).join(' L') : ''
})
</script>

<template>
  <div class="fc-wrap">
    <svg viewBox="0 0 558 215" class="fc-svg">
      <!-- Left panel: 2D plane -->
      <rect x="8" y="8" width="204" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <rect :x="MX0" :y="MY0" :width="MSZ" :height="MSZ" fill="white" stroke="#e2e8f0"/>

      <!-- True trail -->
      <path :d="trailPath" fill="none" stroke="#94a3b8" stroke-width="1.1" style="opacity:0.8"/>
      <!-- Estimated 2σ ellipse (P diagonal → axes aligned) -->
      <ellipse :cx="mx(est.x)" :cy="my(est.y)"
        :rx="2 * Math.sqrt(Pd.x) / 10 * MSZ" :ry="2 * Math.sqrt(Pd.y) / 10 * MSZ"
        fill="#CF1C24" style="opacity:0.12"/>
      <ellipse :cx="mx(est.x)" :cy="my(est.y)"
        :rx="2 * Math.sqrt(Pd.x) / 10 * MSZ" :ry="2 * Math.sqrt(Pd.y) / 10 * MSZ"
        fill="none" stroke="#CF1C24" stroke-width="1.4" stroke-dasharray="4,2"/>
      <circle :cx="mx(est.x)" :cy="my(est.y)" r="2.6" fill="#CF1C24"/>
      <circle :cx="mx(truth.x)" :cy="my(truth.y)" r="3" fill="#334155"/>

      <g style="font-size:7px;font-family:sans-serif">
        <circle cx="30" cy="200" r="2.4" fill="#334155"/>
        <text x="36" y="203" fill="#334155">truth</text>
        <circle cx="72" cy="200" r="2.4" fill="#CF1C24"/>
        <text x="78" y="203" fill="#CF1C24">estimate + 2σ ellipse</text>
      </g>

      <!-- Right panel: NEES -->
      <rect x="220" y="8" width="330" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="385" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">
        average NEES (window {{ W }}) vs 95% consistency band
      </text>

      <!-- Consistency band -->
      <rect :x="TX0" :y="tY(HI)" :width="TX1 - TX0" :height="tY(LO) - tY(HI)"
        fill="#25B34B" style="opacity:0.14"/>
      <line :x1="TX0" :y1="tY(2)" :x2="TX1" :y2="tY(2)" stroke="#25B34B"
        stroke-width="1" stroke-dasharray="4,3"/>
      <text :x="TX1 - 2" :y="tY(2) - 3" text-anchor="end"
        style="font-size:6.5px;fill:#15803d;font-family:monospace">E[NEES] = 2 (df = 2)</text>

      <line :x1="TX0" :y1="TY0" :x2="TX1" :y2="TY0" stroke="#94a3b8" stroke-width="1"/>
      <path :d="neesPath" fill="none" stroke="#CF1C24" stroke-width="1.8"/>

      <!-- Verdict -->
      <rect x="246" y="178" width="296" height="18" fill="white" rx="3" stroke="#e2e8f0"/>
      <text x="394" y="190" text-anchor="middle"
        style="font-size:8px;font-family:monospace;font-weight:700" :fill="verdict.col">
        NEES = {{ neesAvg.toFixed(2) }} → {{ verdict.txt }}
      </text>
    </svg>

    <div class="fc-controls">
      <button class="fc-btn" :class="{ 'fc-on': running }" @click="play">{{ running ? '⏸ Pause' : '▶ Play' }}</button>
      <button class="fc-btn" @click="reset">Reset</button>
      <label class="fc-sl">
        Q<sub>filter</sub>/Q<sub>true</sub>
        <strong>{{ ratio < 1 ? ratio.toFixed(2) : ratio.toFixed(1) }}</strong>
        <input type="range" v-model.number="logRatio" min="-1.3" max="0.7" step="0.05"/>
      </label>
      <span class="fc-hint">ratio &lt; 1: overconfidence, NEES blows through the ceiling · ratio ≫ 1: NEES drops little — excess caution shows in the ellipse</span>
    </div>
  </div>
</template>

<style scoped>
.fc-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.fc-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.fc-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fc-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.fc-sl strong { color: #CF1C24; min-width: 34px; display: inline-block; }
.fc-sl input[type=range] { width: 130px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.fc-btn {
  font-family: monospace; font-size: 0.68rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.fc-btn:hover { background: #e2e8f0; }
.fc-on { background: #CF1C24; color: white; border-color: #CF1C24; }
.fc-hint { font-size: 0.62rem; color: #94a3b8; font-family: sans-serif; }
</style>
