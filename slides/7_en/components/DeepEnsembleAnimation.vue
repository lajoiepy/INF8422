<script setup lang="ts">
import { ref, computed } from 'vue'

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
  // Box-Muller
  const u = Math.max(rng(), 1e-12), v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── Données d'entraînement : y = sin(2.5x) + ε, x ∈ [−1, 1] ───
const NOISE = 0.15
const NDATA = 30
const rngData = mulberry32(11)
const dataX: number[] = [], dataY: number[] = []
for (let i = 0; i < NDATA; i++) {
  const x = rngData() * 2 - 1
  dataX.push(x)
  dataY.push(Math.sin(2.5 * x) + NOISE * gauss(rngData))
}

// ── Cholesky + solve (ΦᵀΦ + λI est SPD) ───────────────────────
function cholesky(A: number[][]): number[][] {
  const n = A.length
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = A[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]
    }
  return L
}
function cholSolve(L: number[][], b: number[]): number[] {
  const n = L.length
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k]
    y[i] = s / L[i][i]
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]
    x[i] = s / L[i][i]
  }
  return x
}

// ── Un membre = régression ridge sur features de Fourier aléatoires
// φ_j(x) = cos(ω_j·x + b_j), ω_j ~ N(0, 1/ℓ²) — entraîné en closed-form
// sur un rééchantillonnage bootstrap : vraie diversité init + données.
const KMAX = 8, DFEAT = 14, LAMBDA = 0.05, ELL = 0.5

interface Member { omega: number[]; phase: number[]; w: number[]; sigma2: number }

function featVec(m: { omega: number[]; phase: number[] }, x: number): number[] {
  const f = m.omega.map((o, j) => Math.cos(o * x + m.phase[j]))
  f.push(1) // biais
  return f
}

function trainMember(seed: number): Member {
  const rng = mulberry32(seed)
  const omega = Array.from({ length: DFEAT }, () => gauss(rng) / ELL)
  const phase = Array.from({ length: DFEAT }, () => rng() * 2 * Math.PI)
  // Bootstrap : n tirages avec remise
  const bx: number[] = [], by: number[] = []
  for (let i = 0; i < NDATA; i++) {
    const idx = Math.floor(rng() * NDATA)
    bx.push(dataX[idx]); by.push(dataY[idx])
  }
  const D = DFEAT + 1
  const Phi = bx.map(x => featVec({ omega, phase }, x))
  const A = Array.from({ length: D }, (_, i) =>
    Array.from({ length: D }, (_, j) => {
      let s = i === j ? LAMBDA : 0
      for (let r = 0; r < NDATA; r++) s += Phi[r][i] * Phi[r][j]
      return s
    }))
  const b = Array.from({ length: D }, (_, i) => {
    let s = 0
    for (let r = 0; r < NDATA; r++) s += Phi[r][i] * by[r]
    return s
  })
  const w = cholSolve(cholesky(A), b)
  // σₖ² = variance résiduelle sur son échantillon (estimation aléatoire)
  let sse = 0
  for (let r = 0; r < NDATA; r++) {
    let pred = 0
    for (let j = 0; j < D; j++) pred += w[j] * Phi[r][j]
    sse += (by[r] - pred) ** 2
  }
  return { omega, phase, w, sigma2: sse / NDATA }
}

const members: Member[] = Array.from({ length: KMAX }, (_, k) => trainMember(100 + 17 * k))

function predict(m: Member, x: number): number {
  const f = featVec(m, x)
  let s = 0
  for (let j = 0; j < f.length; j++) s += m.w[j] * f[j]
  return s
}

// ── État interactif ───────────────────────────────────────────
const K = ref(5)
const xStar = ref(2.0)

// Décomposition au point test : σ*² = (1/K)Σσₖ² + (1/K)Σ(μₖ−μ̄)²
const decomp = computed(() => {
  const mus = members.slice(0, K.value).map(m => predict(m, xStar.value))
  const muBar = mus.reduce((a, b) => a + b, 0) / K.value
  const epi = mus.reduce((a, b) => a + (b - muBar) ** 2, 0) / K.value
  const alea = members.slice(0, K.value).reduce((a, m) => a + m.sigma2, 0) / K.value
  return { mus, muBar, epi, alea, total: epi + alea }
})

// ── Tracé ─────────────────────────────────────────────────────
const XMIN = -3, XMAX = 3, YMIN = -2.4, YMAX = 2.4
const PX0 = 16, PX1 = 374, PY0 = 190, PY1 = 26

function sx(x: number): number { return PX0 + (x - XMIN) / (XMAX - XMIN) * (PX1 - PX0) }
function sy(y: number): number { return PY0 - (Math.max(YMIN, Math.min(y, YMAX)) - YMIN) / (YMAX - YMIN) * (PY0 - PY1) }

const COLORS = ['#00BDF2', '#F15A22', '#25B34B', '#CF1C24', '#8B5CF6', '#0891b2', '#ca8a04', '#ec4899']

const curves = computed(() =>
  members.slice(0, K.value).map(m => {
    const pts: string[] = []
    for (let g = 0; g <= 110; g++) {
      const x = XMIN + (XMAX - XMIN) * g / 110
      pts.push(`${sx(x).toFixed(1)},${sy(predict(m, x)).toFixed(1)}`)
    }
    return 'M' + pts.join(' L')
  }))

// Barre de décomposition (proportions aléatoire/épistémique)
const BAR_W = 128
const barAlea = computed(() => decomp.value.total > 0 ? decomp.value.alea / decomp.value.total * BAR_W : 0)
</script>

<template>
  <div class="de-wrap">
    <svg viewBox="0 0 558 215" class="de-svg">
      <!-- Panneau principal -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Training region -->
      <rect :x="sx(-1)" :y="PY1" :width="sx(1) - sx(-1)" :height="PY0 - PY1" fill="#e2e8f0" style="opacity:0.55"/>
      <text :x="sx(0)" :y="PY1 + 10" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">training data</text>
      <text :x="sx(-2.6)" :y="PY1 + 10" text-anchor="middle"
        style="font-size:7px;fill:#CF1C24;font-weight:700;font-family:sans-serif">OOD</text>
      <text :x="sx(2.6)" :y="PY1 + 10" text-anchor="middle"
        style="font-size:7px;fill:#CF1C24;font-weight:700;font-family:sans-serif">OOD</text>

      <!-- Curves of the K members -->
      <g>
        <path v-for="(c, k) in curves" :key="k" :d="c" fill="none"
          :stroke="COLORS[k]" stroke-width="1.4" style="opacity:0.85"/>
      </g>

      <!-- Data -->
      <g>
        <circle v-for="(x, i) in dataX" :key="i" :cx="sx(x)" :cy="sy(dataY[i])" r="2"
          fill="#475569" style="opacity:0.7"/>
      </g>

      <!-- Test point -->
      <line :x1="sx(xStar)" :y1="PY1" :x2="sx(xStar)" :y2="PY0" stroke="#CF1C24" stroke-width="1.2" stroke-dasharray="4,2"/>
      <g>
        <circle v-for="(mu, k) in decomp.mus" :key="`m${k}`" :cx="sx(xStar)" :cy="sy(mu)" r="3"
          :fill="COLORS[k]" stroke="white" stroke-width="0.8"/>
      </g>

      <line :x1="PX0" :y1="sy(0)" :x2="PX1" :y2="sy(0)" stroke="#94a3b8" stroke-width="0.7" stroke-dasharray="2,3"/>
      <text :x="(PX0+PX1)/2" y="203" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">x — members agree on data, diverge OOD</text>

      <!-- Right panel: decomposition -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">At test point x*</text>

      <rect x="398" y="32" width="144" height="36" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="46" text-anchor="middle"
        style="font-size:6.8px;fill:#c2410c;font-family:monospace">σ*² = (1/K)Σσₖ²</text>
      <text x="470" y="60" text-anchor="middle"
        style="font-size:6.8px;fill:#c2410c;font-family:monospace">+ (1/K)Σ(μₖ − μ̄)²</text>

      <g style="font-size:7.8px;font-family:monospace">
        <text x="404" y="88" fill="#334155">x* = {{ xStar.toFixed(2) }}   μ̄ = {{ decomp.muBar.toFixed(2) }}</text>
        <!-- <text x="404" y="106" fill="#c2410c">σ²_aléa  = {{ decomp.alea.toFixed(3) }}</text> -->
        <text x="404" y="122" fill="#0369a1">σ²_epist = {{ decomp.epi.toFixed(3) }}</text>
        <!-- <text x="404" y="140" fill="#334155" font-weight="700">σ²_total = {{ decomp.total.toFixed(3) }}</text> -->
      </g>

      <!-- Barre de décomposition -->
      <!-- <rect x="404" y="150" :width="barAlea" height="13" fill="#F15A22" style="opacity:0.85"/>
      <rect :x="404 + barAlea" y="150" :width="BAR_W - barAlea" height="13" fill="#00BDF2" style="opacity:0.85"/>
      <rect x="404" y="150" :width="BAR_W" height="13" fill="none" stroke="#94a3b8" stroke-width="0.7"/>
      <text x="404" y="174" style="font-size:6.5px;fill:#c2410c;font-family:sans-serif">■ aléatoire</text>
      <text x="455" y="174" style="font-size:6.5px;fill:#0369a1;font-family:sans-serif">■ épistémique</text>

      <text x="470" y="192" text-anchor="middle"
        style="font-size:6.5px;fill:#64748b;font-family:sans-serif">En OOD, l'épistémique domine →</text>
      <text x="470" y="201" text-anchor="middle"
        style="font-size:6.5px;fill:#64748b;font-family:sans-serif">signal « je ne sais pas »</text> -->
    </svg>

    <div class="de-controls">
      <label class="de-sl">
        K members
        <strong>{{ K }}</strong>
        <input type="range" v-model.number="K" min="2" max="8" step="1"/>
      </label>
      <label class="de-sl">
        Test point x*
        <strong>{{ xStar.toFixed(1) }}</strong>
        <input type="range" v-model.number="xStar" min="-3" max="3" step="0.1"/>
      </label>
      <button class="de-btn" @click="xStar = 0">ID point</button>
      <button class="de-btn" @click="xStar = 2.4">OOD point</button>
    </div>
  </div>
</template>

<style scoped>
.de-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.de-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.de-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.de-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.de-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.de-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.de-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.de-btn:hover { background: #e2e8f0; }
</style>
