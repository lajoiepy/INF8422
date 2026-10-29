<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Prior et bruit capteur ────────────────────────────────────
const mu0 = 5.0                 // moyenne du prior (fixe)
const sigma0 = ref(2.0)         // écart-type du prior
const sigmaNoise = ref(0.6)     // écart-type du bruit d'observation

// Observations (positions sur l'axe x), 2 pré-définies
const DEFAULT_OBS = [6.4, 6.9]
const obs = ref<number[]>([...DEFAULT_OBS])

// ── Posterior conjugué gaussien (moyenne inconnue, bruit connu) ─
// 1/σₙ² = 1/σ₀² + n/σ_bruit²   ;   μₙ = σₙ² (μ₀/σ₀² + Σzᵢ/σ_bruit²)
const posterior = computed(() => {
  const n = obs.value.length
  const p0 = 1 / (sigma0.value ** 2)
  const pn = 1 / (sigmaNoise.value ** 2)
  const prec = p0 + n * pn
  const sum = obs.value.reduce((a, b) => a + b, 0)
  const varP = 1 / prec
  const muP = varP * (mu0 * p0 + sum * pn)
  return { mu: muP, sigma: Math.sqrt(varP), n }
})

// ── Tracé ─────────────────────────────────────────────────────
const PX0 = 18, PX1 = 372, PY0 = 178, PY1 = 28
const XMIN = 0, XMAX = 10
const YSCALE = 1.6

function sx(x: number): number { return PX0 + (x - XMIN) / (XMAX - XMIN) * (PX1 - PX0) }
function invSx(px: number): number { return XMIN + (px - PX0) / (PX1 - PX0) * (XMAX - XMIN) }
function sy(p: number): number { return PY0 - Math.min(p, YSCALE) / YSCALE * (PY0 - PY1) }

function gaussPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

function curvePath(mu: number, sigma: number): string {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const x = XMIN + (XMAX - XMIN) * i / 120
    pts.push(`${sx(x).toFixed(1)},${sy(gaussPdf(x, mu, sigma)).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}

const priorPath = computed(() => curvePath(mu0, sigma0.value))
const postPath = computed(() => curvePath(posterior.value.mu, posterior.value.sigma))

// ── Interaction : clic = nouvelle observation ─────────────────
const svgEl = ref<SVGSVGElement | null>(null)

function onSvgClick(e: MouseEvent) {
  if (!svgEl.value) return
  const rect = svgEl.value.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width * 558
  const py = (e.clientY - rect.top) / rect.height * 215
  if (px < PX0 || px > PX1 || py < 12 || py > 205) return
  const x = invSx(px)
  obs.value = [...obs.value, Math.round(x * 20) / 20]
}

function reset() { obs.value = [...DEFAULT_OBS] }
</script>

<template>
  <div class="bp-wrap">
    <svg ref="svgEl" viewBox="0 0 558 215" class="bp-svg" @click="onSvgClick">
      <!-- Panneau principal -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1" style="cursor:crosshair"/>
      <line :x1="PX0" :y1="PY0" :x2="PX1" :y2="PY0" stroke="#94a3b8" stroke-width="1"/>
      <text :x="(PX0+PX1)/2" y="203" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">click to add an observation zᵢ</text>

      <!-- Prior (blue, dashed) and posterior (green) -->
      <path :d="priorPath" fill="none" stroke="#00BDF2" stroke-width="2" stroke-dasharray="5,3"/>
      <path :d="postPath" fill="none" stroke="#25B34B" stroke-width="2.5"/>

      <!-- Observations -->
      <g>
        <circle v-for="(z, i) in obs" :key="i" :cx="sx(z)" :cy="PY0" r="4"
          fill="#CF1C24" stroke="white" stroke-width="1"/>
      </g>

      <!-- Legend -->
      <g style="font-size:7.5px;font-family:sans-serif">
        <line x1="24" y1="20" x2="38" y2="20" stroke="#00BDF2" stroke-width="2" stroke-dasharray="5,3"/>
        <text x="42" y="23" fill="#0284c7">Prior N(μ₀, σ₀²)</text>
        <circle cx="146" cy="20" r="3.5" fill="#CF1C24"/>
        <text x="153" y="23" fill="#CF1C24">Observations ({{ posterior.n }})</text>
        <line x1="242" y1="20" x2="256" y2="20" stroke="#25B34B" stroke-width="2.5"/>
        <text x="260" y="23" fill="#15803d" font-weight="700">Posterior N(μₙ, σₙ²)</text>
      </g>

      <!-- Right panel: formula + values -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Bayesian update</text>

      <rect x="398" y="32" width="144" height="34" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="45" text-anchor="middle"
        style="font-size:7.2px;fill:#c2410c;font-family:monospace">1/σₙ² = 1/σ₀² + n/σ_b²</text>
      <text x="470" y="59" text-anchor="middle"
        style="font-size:7.2px;fill:#c2410c;font-family:monospace">μₙ = σₙ²(μ₀/σ₀²+Σzᵢ/σ_b²)</text>

      <g style="font-size:8px;font-family:monospace">
        <text x="404" y="84" fill="#0284c7">σ₀ = {{ sigma0.toFixed(2) }}  μ₀ = {{ mu0.toFixed(1) }}</text>
        <text x="404" y="100" fill="#CF1C24">n = {{ posterior.n }}  σ_b = {{ sigmaNoise.toFixed(2) }}</text>
        <text x="404" y="122" fill="#15803d" font-weight="700">μₙ = {{ posterior.mu.toFixed(2) }}</text>
        <text x="404" y="138" fill="#15803d" font-weight="700">σₙ = {{ posterior.sigma.toFixed(3) }}</text>
      </g>

      <rect x="398" y="150" width="144" height="34" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="470" y="163" text-anchor="middle"
        style="font-size:6.8px;fill:#1d4ed8;font-family:sans-serif">Each observation adds 1/σ_b²</text>
      <text x="470" y="174" text-anchor="middle"
        style="font-size:6.8px;fill:#1d4ed8;font-family:sans-serif">of precision → σₙ ↓ (epistemic reduced)</text>
    </svg>

    <div class="bp-controls">
      <label class="bp-sl">
        σ₀ prior
        <strong>{{ sigma0.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma0" min="0.5" max="3" step="0.05"/>
      </label>
      <label class="bp-sl">
        σ_b sensor noise
        <strong>{{ sigmaNoise.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigmaNoise" min="0.2" max="1.5" step="0.05"/>
      </label>
      <button class="bp-btn" @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.bp-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.bp-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.bp-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.bp-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.bp-sl strong { color: #CF1C24; min-width: 36px; display: inline-block; }
.bp-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.bp-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.bp-btn:hover { background: #e2e8f0; }
</style>
