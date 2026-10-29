<script setup lang="ts">
import { ref, computed } from 'vue'

// ── PRNG seedé + Box-Muller ───────────────────────────────────
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

// ── Non-linéarité stéréo : Z = f·b/d (mêmes f, b que le cours) ─
const FOCAL = 500      // px
const BASELINE = 0.08  // m
const FB = FOCAL * BASELINE // 40 px·m

const muD = ref(10)     // disparité moyenne (px)
const sigmaD = ref(2.0) // bruit d'appariement (px)

// Linéarisation type EKF : Z ≈ Z(μ_d) + J·(d−μ_d), J = −fb/μ_d²
// → Z_lin ~ N(fb/μ_d, (fb/μ_d²)²·σ_d²)
const lin = computed(() => {
  const mu = FB / muD.value
  const sigma = FB / (muD.value ** 2) * sigmaD.value
  return { mu, sigma }
})

// Monte Carlo : 2000 tirages réels d ~ N(μ_d, σ_d²), Z = fb/d.
// Les rares d ≤ 0.5 px (non physiques) sont rejetés et comptés.
const NMC = 2000
const mc = computed(() => {
  const rng = mulberry32(77)
  const zs: number[] = []
  let rejected = 0
  while (zs.length < NMC) {
    const d = muD.value + sigmaD.value * gauss(rng)
    if (d <= 0.5) { rejected++; continue }
    zs.push(FB / d)
  }
  const mu = zs.reduce((a, b) => a + b, 0) / NMC
  const varE = zs.reduce((a, b) => a + (b - mu) ** 2, 0) / NMC
  return { zs, mu, sigma: Math.sqrt(varE), rejected }
})

// ── Géométrie du panneau principal : d en x, Z en y ───────────
const DMIN = 3, DMAX = 32, ZMIN = 0, ZMAX = 9
const PX0 = 88, PX1 = 372, PY0 = 168, PY1 = 22

function sx(d: number): number { return PX0 + (d - DMIN) / (DMAX - DMIN) * (PX1 - PX0) }
function sy(z: number): number { return PY0 - (Math.max(ZMIN, Math.min(z, ZMAX)) - ZMIN) / (ZMAX - ZMIN) * (PY0 - PY1) }

// Courbe Z(d) = fb/d (démarrée à d = fb/ZMAX pour ne pas plafonner)
const curvePath = (() => {
  const dStart = Math.max(DMIN, FB / ZMAX)
  const pts: string[] = []
  for (let g = 0; g <= 140; g++) {
    const d = dStart + (DMAX - dStart) * g / 140
    pts.push(`${sx(d).toFixed(1)},${sy(FB / d).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
})()

// Tangente (linéarisation) au point de fonctionnement μ_d
const tangentPath = computed(() => {
  const z0 = FB / muD.value
  const J = -FB / (muD.value ** 2)
  const span = 3.2 * sigmaD.value
  const d1 = Math.max(DMIN, muD.value - span), d2 = Math.min(DMAX, muD.value + span)
  return `M${sx(d1).toFixed(1)},${sy(z0 + J * (d1 - muD.value)).toFixed(1)} L${sx(d2).toFixed(1)},${sy(z0 + J * (d2 - muD.value)).toFixed(1)}`
})

// pdf gaussienne de l'entrée, dessinée le long de l'axe d (en bas)
function gaussPdf(x: number, mu: number, s: number): number {
  const z = (x - mu) / s
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI))
}
const inputPdfPath = computed(() => {
  const peak = gaussPdf(muD.value, muD.value, sigmaD.value)
  const H = 30 // hauteur max en px
  const pts: string[] = []
  for (let g = 0; g <= 100; g++) {
    const d = DMIN + (DMAX - DMIN) * g / 100
    pts.push(`${sx(d).toFixed(1)},${(PY0 - gaussPdf(d, muD.value, sigmaD.value) / peak * H).toFixed(1)}`)
  }
  return 'M' + `${sx(DMIN).toFixed(1)},${PY0}` + ' L' + pts.join(' L') + ` L${sx(DMAX).toFixed(1)},${PY0} Z`
})

// Sorties sur l'axe Z (à gauche) : histogramme MC + pdf linéarisée,
// dessinés comme des profils horizontaux partant du bord gauche.
const NBINS = 36
const PROF_W = 62
const mcProfile = computed(() => {
  const bins = new Array(NBINS).fill(0)
  for (const z of mc.value.zs) {
    if (z < ZMIN || z > ZMAX) continue
    bins[Math.min(NBINS - 1, Math.floor((z - ZMIN) / (ZMAX - ZMIN) * NBINS))]++
  }
  const mx = Math.max(...bins, 1)
  return bins.map((c, i) => ({
    y: sy(ZMIN + (i + 1) * (ZMAX - ZMIN) / NBINS),
    h: (PY0 - PY1) / NBINS - 0.6,
    w: c / mx * PROF_W,
  }))
})
const linProfile = computed(() => {
  const peak = gaussPdf(lin.value.mu, lin.value.mu, lin.value.sigma)
  const pts: string[] = []
  for (let g = 0; g <= 120; g++) {
    const z = ZMIN + (ZMAX - ZMIN) * g / 120
    pts.push(`${(18 + gaussPdf(z, lin.value.mu, lin.value.sigma) / peak * PROF_W).toFixed(1)},${sy(z).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
})

const biasPct = computed(() => (mc.value.mu - lin.value.mu) / lin.value.mu * 100)
</script>

<template>
  <div class="up-wrap">
    <svg viewBox="0 0 558 215" class="up-svg">
      <!-- Main panel -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Axes -->
      <line :x1="PX0" :y1="PY0" :x2="PX1" :y2="PY0" stroke="#94a3b8" stroke-width="1"/>
      <line x1="18" :y1="PY0" x2="18" :y2="PY1" stroke="#94a3b8" stroke-width="1"/>
      <text :x="(PX0+PX1)/2" y="200" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">disparity d (px) — input d ~ N(μ_d, σ_d²)</text>
      <text x="14" :y="(PY0+PY1)/2" text-anchor="middle" :transform="`rotate(-90 14 ${(PY0+PY1)/2})`"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">depth Z (m)</text>

      <!-- Input: gaussian pdf along d -->
      <path :d="inputPdfPath" fill="#25B34B" style="opacity:0.25"/>
      <line :x1="sx(muD)" :y1="PY0" :x2="sx(muD)" :y2="sy(FB/muD)" stroke="#25B34B" stroke-width="0.8" stroke-dasharray="3,2"/>

      <!-- Nonlinearity Z = fb/d + EKF tangent -->
      <path :d="curvePath" fill="none" stroke="#475569" stroke-width="1.8"/>
      <path :d="tangentPath" fill="none" stroke="#F15A22" stroke-width="1.4" stroke-dasharray="5,3"/>
      <circle :cx="sx(muD)" :cy="sy(FB/muD)" r="3" fill="#475569" stroke="white" stroke-width="0.8"/>

      <!-- Outputs on the Z axis: MC histogram (cyan) + linearized pdf (orange) -->
      <g>
        <rect v-for="(b, i) in mcProfile" :key="i" x="18" :y="b.y" :width="b.w" :height="b.h"
          fill="#00BDF2" style="opacity:0.55"/>
      </g>
      <path :d="linProfile" fill="none" stroke="#F15A22" stroke-width="1.8"/>

      <!-- Means of both outputs -->
      <line x1="18" :y1="sy(mc.mu)" :x2="18 + PROF_W + 6" :y2="sy(mc.mu)" stroke="#0284c7" stroke-width="1.3"/>
      <line x1="18" :y1="sy(lin.mu)" :x2="18 + PROF_W + 6" :y2="sy(lin.mu)" stroke="#F15A22" stroke-width="1.3" stroke-dasharray="4,2"/>

      <!-- Legend -->
      <g style="font-size:6.8px;font-family:sans-serif">
        <line x1="150" y1="18" x2="163" y2="18" stroke="#475569" stroke-width="1.8"/>
        <text x="166" y="21" fill="#475569">Z = fb/d</text>
        <line x1="212" y1="18" x2="225" y2="18" stroke="#F15A22" stroke-width="1.4" stroke-dasharray="5,3"/>
        <text x="228" y="21" fill="#c2410c">linearization (EKF)</text>
        <rect x="300" y="14" width="11" height="7" fill="#00BDF2" style="opacity:0.55"/>
        <text x="314" y="21" fill="#0369a1">Monte Carlo</text>
      </g>

      <!-- Right panel -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Propagation of N(μ_d, σ_d²)</text>

      <rect x="398" y="32" width="144" height="34" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="45" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:monospace">Z_lin ~ N(fb/μ_d, (fb/μ_d²)²σ_d²)</text>
      <text x="470" y="59" text-anchor="middle"
        style="font-size:6.6px;fill:#c2410c;font-family:monospace">tangent at point μ_d</text>

      <g style="font-size:7.6px;font-family:monospace">
        <text x="404" y="84" fill="#c2410c">linearized: {{ lin.mu.toFixed(2) }} ± {{ lin.sigma.toFixed(2) }} m</text>
        <text x="404" y="100" fill="#0369a1">MC ({{ NMC }}): {{ mc.mu.toFixed(2) }} ± {{ mc.sigma.toFixed(2) }} m</text>
        <text x="404" y="120" fill="#CF1C24" font-weight="700">mean bias: {{ biasPct >= 0 ? '+' : '' }}{{ biasPct.toFixed(1) }}%</text>
      </g>

      <rect x="398" y="132" width="144" height="52" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="470" y="144" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">E[fb/d] &gt; fb/E[d] (Jensen): the true</text>
      <text x="470" y="154" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">distribution is skewed, shifted.</text>
      <text x="470" y="167" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-weight:700;font-family:sans-serif">large σ_d or small μ_d →</text>
      <text x="470" y="178" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-weight:700;font-family:sans-serif">linearization lies</text>

      <text x="470" y="198" text-anchor="middle"
        style="font-size:6.3px;fill:#94a3b8;font-family:sans-serif">same dilemma as in Course 3: EKF vs sampling</text>
    </svg>

    <div class="up-controls">
      <label class="up-sl">
        μ_d (px)
        <strong>{{ muD.toFixed(0) }}</strong>
        <input type="range" v-model.number="muD" min="6" max="28" step="1"/>
      </label>
      <label class="up-sl">
        σ_d (px)
        <strong>{{ sigmaD.toFixed(1) }}</strong>
        <input type="range" v-model.number="sigmaD" min="0.5" max="3.5" step="0.1"/>
      </label>
      <span class="up-note">object {{ muD <= 10 ? 'far (large Z, strong nonlinearity)' : 'near (near-linear zone)' }}</span>
    </div>
  </div>
</template>

<style scoped>
.up-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.up-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.up-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.up-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.up-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.up-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.up-note { font-family: monospace; font-size: 0.68rem; color: #64748b; }
</style>
