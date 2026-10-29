<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Paramètres des deux capteurs ──────────────────────────────
const mu1 = 3.8   // GPS (fixe)
const mu2 = 6.2   // Vision (fixe)
const sigma1 = ref(1.2)  // σ GPS
const sigma2 = ref(0.6)  // σ Vision

// ── Fusion bayésienne : produit de deux gaussiennes ───────────
// 1/σ*² = 1/σ₁² + 1/σ₂²  ;  μ* = σ*² (μ₁/σ₁² + μ₂/σ₂²)
const fused = computed(() => {
  const p1 = 1 / (sigma1.value ** 2)
  const p2 = 1 / (sigma2.value ** 2)
  const varF = 1 / (p1 + p2)
  const muF = varF * (mu1 * p1 + mu2 * p2)
  return { mu: muF, sigma: Math.sqrt(varF) }
})

// ── Tracé : axe x ∈ [0,10] dans le panneau ────────────────────
const PX0 = 18, PX1 = 372, PY0 = 188, PY1 = 30
const XMIN = 0, XMAX = 10
const YSCALE = 2.1 // valeur pdf correspondant au haut du panneau

function sx(x: number): number { return PX0 + (x - XMIN) / (XMAX - XMIN) * (PX1 - PX0) }
function sy(p: number): number { return PY0 - Math.min(p, YSCALE) / YSCALE * (PY0 - PY1) }

function gaussPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

function curvePath(mu: number, sigma: number): string {
  const pts: string[] = []
  const N = 120
  for (let i = 0; i <= N; i++) {
    const x = XMIN + (XMAX - XMIN) * i / N
    pts.push(`${sx(x).toFixed(1)},${sy(gaussPdf(x, mu, sigma)).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}

const path1 = computed(() => curvePath(mu1, sigma1.value))
const path2 = computed(() => curvePath(mu2, sigma2.value))
const pathF = computed(() => curvePath(fused.value.mu, fused.value.sigma))

const sigmaMin = computed(() => Math.min(sigma1.value, sigma2.value))
</script>

<template>
  <div class="sf-wrap">
    <svg viewBox="0 0 558 215" class="sf-svg">
      <!-- Left panel: distributions -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <line :x1="PX0" :y1="PY0" :x2="PX1" :y2="PY0" stroke="#94a3b8" stroke-width="1"/>
      <text :x="(PX0+PX1)/2" y="203" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">estimated position x</text>

      <!-- Courbes pdf -->
      <path :d="path1" fill="none" stroke="#00BDF2" stroke-width="2"/>
      <path :d="path2" fill="none" stroke="#F15A22" stroke-width="2"/>
      <path :d="pathF" fill="none" stroke="#25B34B" stroke-width="2.5"/>

      <!-- Moyennes -->
      <line :x1="sx(mu1)" :y1="PY0" :x2="sx(mu1)" :y2="sy(gaussPdf(mu1, mu1, sigma1))"
        stroke="#00BDF2" stroke-width="1" stroke-dasharray="3,2" style="opacity:0.6"/>
      <line :x1="sx(mu2)" :y1="PY0" :x2="sx(mu2)" :y2="sy(gaussPdf(mu2, mu2, sigma2))"
        stroke="#F15A22" stroke-width="1" stroke-dasharray="3,2" style="opacity:0.6"/>
      <line :x1="sx(fused.mu)" :y1="PY0" :x2="sx(fused.mu)" :y2="sy(gaussPdf(fused.mu, fused.mu, fused.sigma))"
        stroke="#25B34B" stroke-width="1" stroke-dasharray="3,2" style="opacity:0.8"/>

      <!-- Legend -->
      <g style="font-size:7.5px;font-family:sans-serif">
        <line x1="24" y1="20" x2="38" y2="20" stroke="#00BDF2" stroke-width="2"/>
        <text x="42" y="23" fill="#0284c7">GPS N(μ₁, σ₁²)</text>
        <line x1="118" y1="20" x2="132" y2="20" stroke="#F15A22" stroke-width="2"/>
        <text x="136" y="23" fill="#c2410c">Vision N(μ₂, σ₂²)</text>
        <line x1="222" y1="20" x2="236" y2="20" stroke="#25B34B" stroke-width="2.5"/>
        <text x="240" y="23" fill="#15803d" font-weight="700">Fusion N(μ*, σ*²)</text>
      </g>

      <!-- Right panel: formulas and values -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Bayesian fusion</text>

      <rect x="398" y="32" width="144" height="34" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="45" text-anchor="middle"
        style="font-size:7.5px;fill:#c2410c;font-family:monospace">1/σ*² = 1/σ₁² + 1/σ₂²</text>
      <text x="470" y="59" text-anchor="middle"
        style="font-size:7.5px;fill:#c2410c;font-family:monospace">μ* = σ*²(μ₁/σ₁²+μ₂/σ₂²)</text>

      <g style="font-size:8px;font-family:monospace">
        <text x="404" y="84" fill="#0284c7">σ₁ = {{ sigma1.toFixed(2) }}  (μ₁ = {{ mu1.toFixed(1) }})</text>
        <text x="404" y="100" fill="#c2410c">σ₂ = {{ sigma2.toFixed(2) }}  (μ₂ = {{ mu2.toFixed(1) }})</text>
        <text x="404" y="122" fill="#15803d" font-weight="700">σ* = {{ fused.sigma.toFixed(3) }}</text>
        <text x="404" y="138" fill="#15803d" font-weight="700">μ* = {{ fused.mu.toFixed(2) }}</text>
      </g>

      <rect x="398" y="150" width="144" height="26" fill="#f0fdf4" rx="3" stroke="#86efac"/>
      <text x="470" y="161" text-anchor="middle"
        style="font-size:7px;fill:#15803d;font-family:sans-serif">
        σ* &lt; min(σ₁,σ₂) = {{ sigmaMin.toFixed(2) }} ✓
      </text>
      <text x="470" y="171" text-anchor="middle"
        style="font-size:7px;fill:#15803d;font-family:sans-serif">Fusion always improves precision</text>

      <text x="470" y="196" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">
        μ* leans toward the more precise sensor
      </text>
    </svg>

    <div class="sf-controls">
      <label class="sf-sl">
        σ₁ — GPS
        <strong>{{ sigma1.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma1" min="0.3" max="2" step="0.05"/>
      </label>
      <label class="sf-sl">
        σ₂ — Vision
        <strong>{{ sigma2.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma2" min="0.3" max="2" step="0.05"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.sf-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.sf-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.sf-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sf-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.sf-sl strong { color: #CF1C24; min-width: 36px; display: inline-block; }
.sf-sl input[type=range] { width: 140px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
</style>
