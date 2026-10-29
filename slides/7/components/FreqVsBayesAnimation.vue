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

// ── Le même flux de données pour les deux écoles ──────────────
// Un détecteur de piétons au taux de succès réel (caché) p* = 0.7.
// Chaque essai = tirage Bernoulli(p*). Les tirages sont précomputés :
// « +1 essai » ne fait qu'avancer n dans la même séquence.
const P_STAR = 0.7
const NMAX = 150

function drawSequence(seed: number): boolean[] {
  const rng = mulberry32(seed)
  return Array.from({ length: NMAX }, () => rng() < P_STAR)
}
const mainDraws = drawSequence(5)
// Trajectoires « fantômes » : d'autres jeux de données hypothétiques
// issus du MÊME p* — l'essence de la lecture fréquentiste.
const GHOST_SEEDS = [21, 33, 47, 58]
const ghostDraws = GHOST_SEEDS.map(drawSequence)

const n = ref(0)
const priorStrength = ref(2) // α₀ = β₀ (prior Beta symétrique)

const k = computed(() => mainDraws.slice(0, n.value).filter(Boolean).length)

function addTrials(m: number) { n.value = Math.min(NMAX, n.value + m) }
function reset() { n.value = 0 }

// ── Fréquentiste : p̂ = k/n + intervalle de Wilson à 95 % ──────
const Z95 = 1.959964
function wilson(kk: number, nn: number): { lo: number; hi: number } {
  const ph = kk / nn
  const z2n = Z95 * Z95 / nn
  const center = (ph + z2n / 2) / (1 + z2n)
  const half = (Z95 / (1 + z2n)) * Math.sqrt(ph * (1 - ph) / nn + z2n / (4 * nn))
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) }
}

function trajectory(draws: boolean[], upTo: number): { n: number; ph: number }[] {
  const out: { n: number; ph: number }[] = []
  let kk = 0
  for (let i = 0; i < upTo; i++) {
    if (draws[i]) kk++
    out.push({ n: i + 1, ph: kk / (i + 1) })
  }
  return out
}

const mainTraj = computed(() => trajectory(mainDraws, n.value))
const ghostTrajs = computed(() => ghostDraws.map(d => trajectory(d, n.value)))
const wilsonNow = computed(() => n.value > 0 ? wilson(k.value, n.value) : null)

// ── Bayésien : posterior Beta(α₀+k, β₀+n−k) exacte ────────────
function lgamma(x: number): number {
  const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x)
  x -= 1
  let a = 0.99999999999980993
  const t = x + 7.5
  for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

function betaPdf(x: number, a: number, b: number): number {
  if (x <= 0 || x >= 1) return 0
  const logB = lgamma(a) + lgamma(b) - lgamma(a + b)
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB)
}

const NG = 400
// pdf sur grille + intervalle de crédibilité 95 % (queues égales, CDF numérique)
function betaSummary(a: number, b: number) {
  const xs: number[] = [], ps: number[] = []
  for (let i = 0; i <= NG; i++) {
    const x = i / NG
    xs.push(x); ps.push(betaPdf(x, a, b))
  }
  const dx = 1 / NG
  let total = 0
  for (let i = 1; i <= NG; i++) total += (ps[i - 1] + ps[i]) / 2 * dx
  let c = 0, lo = 0, hi = 1
  let foundLo = false
  for (let i = 1; i <= NG; i++) {
    c += (ps[i - 1] + ps[i]) / 2 * dx / total
    if (!foundLo && c >= 0.025) { lo = xs[i]; foundLo = true }
    if (c >= 0.975) { hi = xs[i]; break }
  }
  return { xs, ps, lo, hi, mean: a / (a + b), max: Math.max(...ps) }
}

const posterior = computed(() =>
  betaSummary(priorStrength.value + k.value, priorStrength.value + (n.value - k.value)))
const prior = computed(() => betaSummary(priorStrength.value, priorStrength.value))

// ── Tracé panneau gauche (fréquentiste) : p̂ vs n ─────────────
const LX0 = 40, LX1 = 262, LY0 = 168, LY1 = 34
function lx(nn: number): number { return LX0 + nn / NMAX * (LX1 - LX0) }
function ly(p: number): number { return LY0 - p * (LY0 - LY1) }

function trajPath(t: { n: number; ph: number }[]): string {
  if (t.length === 0) return ''
  return 'M' + t.map(p => `${lx(p.n).toFixed(1)},${ly(p.ph).toFixed(1)}`).join(' L')
}

// Bande de Wilson le long de la trajectoire principale
const wilsonBand = computed(() => {
  const t = mainTraj.value
  if (t.length < 2) return ''
  const up: string[] = [], lo: string[] = []
  let kk = 0
  for (let i = 0; i < n.value; i++) {
    if (mainDraws[i]) kk++
    const w = wilson(kk, i + 1)
    up.push(`${lx(i + 1).toFixed(1)},${ly(w.hi).toFixed(1)}`)
    lo.push(`${lx(i + 1).toFixed(1)},${ly(w.lo).toFixed(1)}`)
  }
  return 'M' + up.join(' L') + ' L' + lo.reverse().join(' L') + ' Z'
})

// ── Tracé panneau droit (bayésien) : pdf sur p ∈ [0,1] ────────
const RX0 = 316, RX1 = 538, RY0 = 168, RY1 = 34
function rx(p: number): number { return RX0 + p * (RX1 - RX0) }
const yMaxPdf = computed(() => Math.max(posterior.value.max, prior.value.max, 1.5) * 1.08)
function ry(pdf: number): number { return RY0 - Math.min(pdf, yMaxPdf.value) / yMaxPdf.value * (RY0 - RY1) }

function pdfPath(s: { xs: number[]; ps: number[] }): string {
  return 'M' + s.xs.map((x, i) => `${rx(x).toFixed(1)},${ry(s.ps[i]).toFixed(1)}`).join(' L')
}
// Zone ombrée = intervalle de crédibilité 95 %
const credArea = computed(() => {
  const s = posterior.value
  const pts: string[] = [`${rx(s.lo).toFixed(1)},${ry(0).toFixed(1)}`]
  for (let i = 0; i <= NG; i++) {
    if (s.xs[i] >= s.lo && s.xs[i] <= s.hi)
      pts.push(`${rx(s.xs[i]).toFixed(1)},${ry(s.ps[i]).toFixed(1)}`)
  }
  pts.push(`${rx(s.hi).toFixed(1)},${ry(0).toFixed(1)}`)
  return 'M' + pts.join(' L') + ' Z'
})
</script>

<template>
  <div class="fb-wrap">
    <svg viewBox="0 0 558 215" class="fb-svg">
      <!-- Panneau gauche : lecture fréquentiste -->
      <rect x="8" y="8" width="266" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="141" y="22" text-anchor="middle"
        style="font-size:8px;fill:#c2410c;font-weight:700;font-family:sans-serif">Fréquentiste : p fixe, les données varient</text>

      <line :x1="LX0" :y1="LY0" :x2="LX1" :y2="LY0" stroke="#94a3b8" stroke-width="1"/>
      <line :x1="LX0" :y1="LY0" :x2="LX0" :y2="LY1" stroke="#94a3b8" stroke-width="1"/>
      <g style="font-size:6.5px;fill:#94a3b8;font-family:monospace">
        <text :x="LX0 - 4" :y="ly(1) + 3" text-anchor="end">1</text>
        <text :x="LX0 - 4" :y="ly(0.5) + 3" text-anchor="end">.5</text>
        <text :x="LX0 - 4" :y="ly(0) + 3" text-anchor="end">0</text>
        <text :x="lx(NMAX)" :y="LY0 + 9" text-anchor="middle">{{ NMAX }}</text>
      </g>
      <text :x="(LX0+LX1)/2" y="188" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">nombre d'essais n</text>

      <!-- p* : le vrai paramètre, fixe -->
      <line :x1="LX0" :y1="ly(P_STAR)" :x2="LX1" :y2="ly(P_STAR)"
        stroke="#25B34B" stroke-width="1.2" stroke-dasharray="5,3"/>
      <text :x="LX1 - 2" :y="ly(P_STAR) - 4" text-anchor="end"
        style="font-size:6.5px;fill:#15803d;font-family:monospace">p* = {{ P_STAR }} (fixe, caché)</text>

      <template v-if="n > 0">
        <!-- Répétitions hypothétiques (fantômes) -->
        <g>
          <path v-for="(t, g) in ghostTrajs" :key="g" :d="trajPath(t)"
            fill="none" stroke="#94a3b8" stroke-width="0.8" style="opacity:0.45"/>
        </g>
        <!-- Bande de Wilson 95 % + trajectoire observée -->
        <path :d="wilsonBand" fill="#F15A22" style="opacity:0.18"/>
        <path :d="trajPath(mainTraj)" fill="none" stroke="#CF1C24" stroke-width="1.8"/>
        <circle :cx="lx(n)" :cy="ly(k / n)" r="3" fill="#CF1C24" stroke="white" stroke-width="0.8"/>
      </template>
      <text v-else :x="(LX0+LX1)/2" y="105" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-family:sans-serif">lancez des essais ↓</text>

      <text x="141" y="201" text-anchor="middle" style="font-size:6.8px;fill:#9a3412;font-family:monospace">
        {{ n > 0 ? `p̂ = ${k}/${n} = ${(k / n).toFixed(3)} · IC95 [${wilsonNow!.lo.toFixed(2)}, ${wilsonNow!.hi.toFixed(2)}]` : 'p̂ = k/n + intervalle de confiance (Wilson)' }}
      </text>

      <!-- Panneau droit : lecture bayésienne -->
      <rect x="284" y="8" width="266" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="417" y="22" text-anchor="middle"
        style="font-size:8px;fill:#0369a1;font-weight:700;font-family:sans-serif">Bayésien : les données sont fixées, p est incertain</text>

      <line :x1="RX0" :y1="RY0" :x2="RX1" :y2="RY0" stroke="#94a3b8" stroke-width="1"/>
      <g style="font-size:6.5px;fill:#94a3b8;font-family:monospace">
        <text :x="rx(0)" :y="RY0 + 9" text-anchor="middle">0</text>
        <text :x="rx(0.5)" :y="RY0 + 9" text-anchor="middle">0.5</text>
        <text :x="rx(1)" :y="RY0 + 9" text-anchor="middle">1</text>
      </g>
      <text :x="(RX0+RX1)/2" y="188" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">p (variable aléatoire)</text>

      <!-- p* pour comparaison -->
      <line :x1="rx(P_STAR)" :y1="RY0" :x2="rx(P_STAR)" :y2="RY1"
        stroke="#25B34B" stroke-width="1.2" stroke-dasharray="5,3"/>

      <!-- Intervalle de crédibilité + prior + posterior -->
      <path :d="credArea" fill="#00BDF2" style="opacity:0.2"/>
      <path :d="pdfPath(prior)" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,3"/>
      <path :d="pdfPath(posterior)" fill="none" stroke="#00BDF2" stroke-width="2"/>

      <g style="font-size:6.8px;font-family:sans-serif">
        <line x1="296" y1="30" x2="307" y2="30" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="4,3"/>
        <text x="310" y="33" fill="#64748b">prior Beta(α₀, β₀)</text>
        <line x1="388" y1="30" x2="399" y2="30" stroke="#00BDF2" stroke-width="2"/>
        <text x="402" y="33" fill="#0369a1">posterior Beta(α₀+k, β₀+n−k)</text>
      </g>

      <text x="417" y="201" text-anchor="middle" style="font-size:6.8px;fill:#075985;font-family:monospace">
        E[p|D] = {{ posterior.mean.toFixed(3) }} · crédibilité 95% [{{ posterior.lo.toFixed(2) }}, {{ posterior.hi.toFixed(2) }}]
      </text>
    </svg>

    <div class="fb-controls">
      <button class="fb-btn" @click="addTrials(1)" :disabled="n >= NMAX">+1 essai</button>
      <button class="fb-btn" @click="addTrials(10)" :disabled="n >= NMAX">+10 essais</button>
      <button class="fb-btn" @click="reset">Reset</button>
      <label class="fb-sl">
        force du prior α₀=β₀
        <strong>{{ priorStrength }}</strong>
        <input type="range" v-model.number="priorStrength" min="1" max="20" step="1"/>
      </label>
      <span class="fb-note">n = {{ n }}, k = {{ k }} succès</span>
    </div>
  </div>
</template>

<style scoped>
.fb-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.fb-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.fb-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fb-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.fb-sl strong { color: #CF1C24; min-width: 22px; display: inline-block; }
.fb-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.fb-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.fb-btn:hover:not(:disabled) { background: #e2e8f0; }
.fb-btn:disabled { opacity: 0.5; cursor: default; }
.fb-note { font-family: monospace; font-size: 0.7rem; color: #64748b; }
</style>
