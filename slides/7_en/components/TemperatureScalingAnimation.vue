<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

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
const sigmoid = (t: number) => 1 / (1 + Math.exp(-t))

// ── Panneau gauche : softmax sur 5 logits fixes ───────────────
const LOGITS = [2.0, 0.8, 0.3, -0.5, -1.0]
const T = ref(1.0)

const softmaxQ = computed(() => {
  const ez = LOGITS.map(z => Math.exp(z / T.value))
  const s = ez.reduce((a, b) => a + b, 0)
  return ez.map(e => e / s)
})

// ── Jeu de validation synthétique : modèle SUR-CONFIANT ───────
// Vraie log-odds sᵢ ~ N(0, 1.5) ; label yᵢ ~ Bernoulli(σ(sᵢ)).
// Le modèle sort le logit A·sᵢ avec A = 2.5 (échelle exagérée,).
// Avec température : p̂ᵢ(T) = σ(A·sᵢ/T) → T* = A rétablit la calibration.
const NV = 800, A_OVER = 2.5
const rng = mulberry32(21)
const lat: number[] = [], labels: boolean[] = []
for (let i = 0; i < NV; i++) {
  const s = 1.5 * gauss(rng)
  lat.push(s)
  labels.push(rng() < sigmoid(s))
}

const M = 10
// ECE + diagramme de fiabilité pour une température donnée
function calibAt(t: number) {
  const bins = Array.from({ length: M }, () => ({ n: 0, acc: 0, conf: 0 }))
  for (let i = 0; i < NV; i++) {
    const p = sigmoid(A_OVER * lat[i] / t)
    const conf = Math.max(p, 1 - p)
    const corr = (p > 0.5) === labels[i]
    const b = Math.min(M - 1, Math.floor(conf * M))
    bins[b].n++
    bins[b].acc += corr ? 1 : 0
    bins[b].conf += conf
  }
  let ece = 0
  const pts = bins.map(b => {
    const acc = b.n > 0 ? b.acc / b.n : 0
    const cf = b.n > 0 ? b.conf / b.n : 0
    if (b.n > 0) ece += (b.n / NV) * Math.abs(acc - cf)
    return { n: b.n, acc, conf: cf }
  })
  return { pts, ece }
}

// Courbe ECE(T) précalculée sur une grille (recherche 1D)
const TGRID: number[] = []
for (let t = 0.5; t <= 4.001; t += 0.05) TGRID.push(Math.round(t * 100) / 100)
const ECE_GRID = TGRID.map(t => calibAt(t).ece)
const T_STAR = TGRID[ECE_GRID.indexOf(Math.min(...ECE_GRID))]

const calib = computed(() => calibAt(T.value))

// ── Animation « grid search » ─────────────────────────────────
const searching = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function findTStar() {
  if (searching.value) return
  searching.value = true
  let i = 0
  timer = setInterval(() => {
    T.value = TGRID[i]
    i += 2
    if (i >= TGRID.length) {
      if (timer) clearInterval(timer)
      T.value = T_STAR
      searching.value = false
    }
  }, 35)
}
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Layout SVG ────────────────────────────────────────────────
// Softmax (gauche)
const SB_X = 24, SB_W = 24, SB_GAP = 4, SB_Y0 = 168, SB_Y1 = 40
// Fiabilité (milieu)
const RX0 = 208, RX1 = 356, RY0 = 168, RY1 = 34
const rx = (c: number) => RX0 + c * (RX1 - RX0)
const ry = (a: number) => RY0 - a * (RY0 - RY1)
// Courbe ECE(T) (droite)
const EX0 = 396, EX1 = 540, EY0 = 130, EY1 = 60
const eceMax = Math.max(...ECE_GRID)
const ex = (t: number) => EX0 + (t - 0.5) / 3.5 * (EX1 - EX0)
const ey = (e: number) => EY0 - e / eceMax * (EY0 - EY1)
const ecePath = 'M' + TGRID.map((t, i) => `${ex(t).toFixed(1)},${ey(ECE_GRID[i]).toFixed(1)}`).join(' L')

const reliaPath = computed(() =>
  'M' + calib.value.pts.filter(p => p.n > 0)
    .map(p => `${rx(p.conf).toFixed(1)},${ry(p.acc).toFixed(1)}`).join(' L'))
</script>

<template>
  <div class="ts-wrap">
    <svg viewBox="0 0 558 215" class="ts-svg">
      <!-- Panneau softmax -->
      <rect x="8" y="8" width="192" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="104" y="22" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">softmax(z/T), 5 classes</text>

      <g>
        <template v-for="(q, k) in softmaxQ" :key="k">
          <rect :x="SB_X + k * (SB_W + SB_GAP)" :y="SB_Y0 - q * (SB_Y0 - SB_Y1)"
            :width="SB_W" :height="q * (SB_Y0 - SB_Y1)"
            :fill="k === 0 ? '#00BDF2' : '#94a3b8'" style="opacity:0.8" rx="1"/>
          <text :x="SB_X + k * (SB_W + SB_GAP) + SB_W/2" :y="SB_Y0 - q * (SB_Y0 - SB_Y1) - 4"
            text-anchor="middle" style="font-size:6.5px;fill:#334155;font-family:monospace">{{ q.toFixed(2) }}</text>
          <text :x="SB_X + k * (SB_W + SB_GAP) + SB_W/2" :y="SB_Y0 + 10"
            text-anchor="middle" style="font-size:6.5px;fill:#64748b;font-family:monospace">z={{ LOGITS[k] }}</text>
        </template>
      </g>
      <line :x1="SB_X - 4" :y1="SB_Y0" :x2="SB_X + 5*(SB_W+SB_GAP)" :y2="SB_Y0" stroke="#94a3b8" stroke-width="1"/>

      <text x="104" y="196" text-anchor="middle" style="font-size:7px;fill:#64748b;font-family:sans-serif">
        {{ T < 0.9 ? 'T < 1: peakier (more confident)' : T > 1.2 ? 'T > 1: flatter (less confident)' : 'T ≈ 1: original distribution' }}
      </text>

      <!-- Reliability panel -->
      <rect x="204" y="8" width="164" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="286" y="22" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Reliability diagram</text>

      <line :x1="rx(0)" :y1="ry(0)" :x2="rx(1)" :y2="ry(1)" stroke="#00BDF2" stroke-width="1.3" stroke-dasharray="4,2"/>
      <path :d="reliaPath" fill="none" stroke="#CF1C24" stroke-width="1.8"/>
      <g>
        <template v-for="(p, m) in calib.pts" :key="m">
          <circle v-if="p.n > 0" :cx="rx(p.conf)" :cy="ry(p.acc)" r="2.5" fill="#CF1C24"/>
        </template>
      </g>
      <line :x1="RX0" :y1="RY0" :x2="RX1" :y2="RY0" stroke="#94a3b8" stroke-width="1"/>
      <line :x1="RX0" :y1="RY0" :x2="RX0" :y2="RY1" stroke="#94a3b8" stroke-width="1"/>
      <text x="286" y="182" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">confidence → accuracy</text>
      <text x="286" y="196" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">(validation, N = 800)</text>

      <!-- ECE(T) panel -->
      <rect x="376" y="8" width="174" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="463" y="22" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">1D search for T*</text>

      <text x="463" y="47" text-anchor="middle"
        style="font-size:16px;font-weight:700;font-family:monospace"
        :fill="calib.ece < 0.03 ? '#25B34B' : '#CF1C24'">ECE = {{ (calib.ece * 100).toFixed(1) }}%</text>

      <path :d="ecePath" fill="none" stroke="#475569" stroke-width="1.3"/>
      <line :x1="ex(T)" :y1="EY0" :x2="ex(T)" :y2="EY1" stroke="#CF1C24" stroke-width="1.4"/>
      <circle :cx="ex(T_STAR)" :cy="ey(Math.min(...ECE_GRID))" r="3" fill="#25B34B" stroke="white" stroke-width="0.8"/>
      <line :x1="EX0" :y1="EY0" :x2="EX1" :y2="EY0" stroke="#94a3b8" stroke-width="1"/>
      <g style="font-size:6.5px;fill:#94a3b8;font-family:monospace">
        <text :x="EX0" :y="EY0+9" text-anchor="middle">0.5</text>
        <text :x="ex(2)" :y="EY0+9" text-anchor="middle">2</text>
        <text :x="EX1" :y="EY0+9" text-anchor="middle">4</text>
      </g>
      <text x="463" y="152" text-anchor="middle" style="font-size:7px;fill:#475569;font-family:monospace">
        ECE(T) curve — T* = {{ T_STAR.toFixed(2) }}
      </text>

      <rect x="384" y="160" width="158" height="38" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="463" y="172" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">The model exaggerates its logits ×2.5:</text>
      <text x="463" y="182" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">T* recovers ≈ that factor and restores</text>
      <text x="463" y="192" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">calibration without changing decisions.</text>
    </svg>

    <div class="ts-controls">
      <label class="ts-sl">
        Temperature T
        <strong>{{ T.toFixed(2) }}</strong>
        <input type="range" v-model.number="T" min="0.5" max="4" step="0.05" :disabled="searching"/>
      </label>
      <button class="ts-btn" @click="findTStar" :disabled="searching">
        {{ searching ? 'searching…' : 'Find optimal T' }}
      </button>
      <button class="ts-btn" @click="T = 1" :disabled="searching">T = 1</button>
    </div>
  </div>
</template>

<style scoped>
.ts-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ts-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ts-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ts-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ts-sl strong { color: #CF1C24; min-width: 36px; display: inline-block; }
.ts-sl input[type=range] { width: 140px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ts-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.ts-btn:hover:not(:disabled) { background: #e2e8f0; }
.ts-btn:disabled { opacity: 0.5; cursor: default; }
</style>
