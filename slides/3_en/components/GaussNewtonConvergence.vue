<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ── Function J(x) = (sin(x) - 0.5)² + 0.1x² ─────────────────
function J(x: number) { return (Math.sin(x) - 0.5) ** 2 + 0.1 * x * x }
// Residual vector: r = [sin(x)-0.5, sqrt(0.1)*x]
// J_jac (row Jacobian): [cos(x), sqrt(0.1)]
// GN step: Δ = -(J_jac · r) / (J_jac · J_jac)
function gnStep(x: number): number {
  const r0 = Math.sin(x) - 0.5
  const r1 = Math.sqrt(0.1) * x
  const j0 = Math.cos(x)
  const j1 = Math.sqrt(0.1)
  const denom = j0 * j0 + j1 * j1
  if (Math.abs(denom) < 1e-10) return 0
  return -(j0 * r0 + j1 * r1) / denom
}

// ── State ─────────────────────────────────────────────────────
const x0Init = ref(-2.5)
const xk     = ref(-2.5)
const history = ref<number[]>([-2.5])
const maxIter = 12

watch(x0Init, (v) => { xk.value = v; history.value = [v] })

function iterate() {
  if (history.value.length >= maxIter + 1) return
  const delta = gnStep(xk.value)
  xk.value = xk.value + delta
  history.value = [...history.value, xk.value]
}
function reset() { xk.value = x0Init.value; history.value = [x0Init.value] }

function runAll() {
  reset()
  const step = () => {
    if (J(xk.value) > 0.0001 && history.value.length <= maxIter) {
      iterate()
      setTimeout(step, 120)
    }
  }
  setTimeout(step, 50)
}

// ── SVG layout ────────────────────────────────────────────────
// X world: [-4, 4] → SVG: [25, 265]; Y cost: [0, ~2] → SVG: [200, 20]
const XL = 25, XR = 265, YB = 200, YT = 22
const NX = 120

function svgX(x: number) { return XL + (x + 4) / 8 * (XR - XL) }
function svgY(cost: number) {
  const maxC = 2.5
  return YB - Math.min(cost / maxC, 1.1) * (YB - YT)
}

// Main curve points
const curvePts = computed(() => {
  return Array.from({ length: NX + 1 }, (_, i) => {
    const x = -4 + i / NX * 8
    return `${svgX(x).toFixed(1)},${svgY(J(x)).toFixed(1)}`
  }).join(' ')
})

// Local quadratic approximation at xk
// L(Δ) = J(xk) + grad_J*Δ + 0.5*H_approx*Δ²
// grad_J = 2*(sin-0.5)*cos + 0.2*x = 2*(r0*j0 + r1*j1)
// H_approx = 2*(j0² + j1²) (GN approx)
function localParabola(xk_: number, delta: number): number {
  const r0 = Math.sin(xk_) - 0.5, r1 = Math.sqrt(0.1) * xk_
  const j0 = Math.cos(xk_), j1 = Math.sqrt(0.1)
  const grad = 2 * (r0 * j0 + r1 * j1)
  const H = 2 * (j0 * j0 + j1 * j1)
  return J(xk_) + grad * delta + 0.5 * H * delta * delta
}

const parabolaPts = computed(() => {
  const xk_ = xk.value
  const hw = 1.8
  return Array.from({ length: 61 }, (_, i) => {
    const delta = -hw + i / 60 * 2 * hw
    const x = xk_ + delta
    if (x < -4 || x > 4) return null
    return `${svgX(x).toFixed(1)},${svgY(localParabola(xk_, delta)).toFixed(1)}`
  }).filter(Boolean).join(' ')
})

// Step arrow
const delta_  = computed(() => gnStep(xk.value))
const xNext   = computed(() => xk.value + delta_.value)
const arrowX1 = computed(() => svgX(xk.value))
const arrowX2 = computed(() => svgX(Math.max(-4, Math.min(4, xNext.value))))
const arrowY  = computed(() => svgY(J(xk.value)) - 2)

// Axis ticks
const axisTicks = [-3, -2, -1, 0, 1, 2, 3]
</script>

<template>
  <div class="gn-wrap">
    <svg viewBox="0 0 558 215" class="gn-svg">
      <defs>
        <marker id="gnArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#CF1C24"/>
        </marker>
      </defs>

      <!-- ══════ LEFT: J(x) curve ══════ -->
      <rect x="2" y="2" width="278" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="140" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        J(x) = ‖h(x)−z‖² + ‖x−x₀‖²  [h(x)=sin x]
      </text>

      <!-- Axes -->
      <line :x1="XL" :y1="YB" :x2="XR+4" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="XL" :y1="YT-4" :x2="XL" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <g v-for="t in axisTicks" :key="t">
        <line :x1="svgX(t)" :y1="YB" :x2="svgX(t)" :y2="YB+4" stroke="#475569" stroke-width="1"/>
        <text :x="svgX(t)" :y="YB+12" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ t }}</text>
      </g>
      <text x="150" y="213" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-style:italic;font-family:sans-serif">x</text>

      <!-- Main curve -->
      <polyline :points="curvePts" fill="none" stroke="#1e40af" stroke-width="2.2"
        stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Local parabola (orange) -->
      <polyline :points="parabolaPts" fill="none" stroke="#F15A22" stroke-width="1.8"
        stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="5,2" opacity="0.9"/>

      <!-- History of past points (grey crosses) -->
      <g v-for="(xh, i) in history.slice(0, -1)" :key="`h${i}`">
        <line :x1="svgX(xh)-5" :y1="svgY(J(xh))-5" :x2="svgX(xh)+5" :y2="svgY(J(xh))+5"
          stroke="#94a3b8" stroke-width="1.5"/>
        <line :x1="svgX(xh)+5" :y1="svgY(J(xh))-5" :x2="svgX(xh)-5" :y2="svgY(J(xh))+5"
          stroke="#94a3b8" stroke-width="1.5"/>
      </g>

      <!-- Step arrow -->
      <line v-if="Math.abs(delta_) > 0.01 && history.length <= maxIter"
        :x1="arrowX1" :y1="arrowY"
        :x2="arrowX2 + (arrowX2 > arrowX1 ? -6 : 6)" :y2="arrowY"
        stroke="#CF1C24" stroke-width="2" marker-end="url(#gnArr)"/>
      <text v-if="Math.abs(delta_) > 0.01" :x="(arrowX1+arrowX2)/2" :y="arrowY-5"
        text-anchor="middle"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:monospace">
        Δ={{ delta_.toFixed(3) }}
      </text>

      <!-- Current point (red circle on curve) -->
      <circle :cx="svgX(xk)" :cy="svgY(J(xk))" r="6"
        fill="#CF1C24" stroke="white" stroke-width="2"/>
      <!-- Vertical guide -->
      <line :x1="svgX(xk)" :y1="svgY(J(xk))+6" :x2="svgX(xk)" :y2="YB"
        stroke="#CF1C24" stroke-width="1" stroke-dasharray="3,2" opacity="0.5"/>

      <!-- Legend -->
      <line x1="14" y1="195" x2="28" y2="195" stroke="#1e40af" stroke-width="2"/>
      <text x="32" y="198" style="font-size:7px;fill:#1e40af;font-weight:700;font-family:sans-serif">J(x)</text>
      <line x1="54" y1="195" x2="68" y2="195" stroke="#F15A22" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="72" y="198" style="font-size:7px;fill:#F15A22;font-weight:700;font-family:sans-serif">Approx. locale</text>

      <!-- ══════ RIGHT: Info panel ══════ -->
      <rect x="287" y="2" width="269" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="421" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        État de l'optimisation
      </text>

      <!-- Iteration counter -->
      <rect x="297" y="20" width="249" height="35" fill="#fef2f2" rx="4" stroke="#fca5a5" stroke-width="1"/>
      <text x="421" y="34" text-anchor="middle"
        style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        Itération k = {{ history.length - 1 }}
      </text>
      <text x="421" y="49" text-anchor="middle"
        style="font-size:9px;fill:#CF1C24;font-family:monospace">
        x_k = {{ xk.toFixed(4) }}   J = {{ J(xk).toFixed(4) }}
      </text>

      <!-- Step info -->
      <rect x="297" y="62" width="249" height="60" fill="#fff7ed" rx="4" stroke="#fed7aa" stroke-width="1"/>
      <text x="421" y="76" text-anchor="middle"
        style="font-size:8px;fill:#c2410c;font-weight:700;font-family:sans-serif">Pas Gauss-Newton</text>
      <text x="305" y="90" style="font-size:8px;fill:#475569;font-family:monospace">
        r = [h(x)−z, prior] = [{{ (Math.sin(xk)-0.5).toFixed(3) }}, {{ (Math.sqrt(0.1)*xk).toFixed(3) }}]
      </text>
      <text x="305" y="103" style="font-size:8px;fill:#475569;font-family:monospace">
        J = [∂h/∂x, ...] = [{{ Math.cos(xk).toFixed(3) }}, {{ Math.sqrt(0.1).toFixed(3) }}]
      </text>
      <text x="305" y="116" style="font-size:8px;fill:#c2410c;font-family:monospace">
        Δ* = −(JᵀJ)⁻¹Jᵀr = {{ delta_.toFixed(4) }}
      </text>

      <!-- Convergence note -->
      <rect x="297" y="130" width="249" height="35" fill="#f0fdf4" rx="4" stroke="#86efac" stroke-width="1"/>
      <text x="421" y="143" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">
        {{ J(xk) < 0.001 ? '✓ Convergé !' : (history.length > maxIter ? '⚠ Limite d\'itérations' : 'En cours…') }}
      </text>
      <text x="305" y="157" style="font-size:8px;fill:#15803d;font-family:sans-serif">
        |Δ| = {{ Math.abs(delta_).toFixed(4) }}
        {{ Math.abs(delta_) < 0.001 ? '← ε atteint' : '' }}
      </text>

      <!-- History list -->
      <text x="305" y="180" style="font-size:7.5px;fill:#94a3b8;font-family:monospace">
        Historique x_k :
      </text>
      <text x="305" y="194" style="font-size:7.5px;fill:#475569;font-family:monospace">
        {{ history.slice(-4).map(v => v.toFixed(3)).join(' → ') }}
      </text>
    </svg>

    <!-- Controls -->
    <div class="gn-controls">
      <label class="gn-sl">
        <span class="gn-lbl">x₀</span>
        <strong>{{ x0Init.toFixed(1) }}</strong>
        <input type="range" v-model.number="x0Init" min="-3.5" max="3.5" step="0.1"/>
      </label>
      <span class="gn-iter">k = {{ history.length - 1 }} / {{ maxIter }}</span>
      <button class="gn-btn" @click="iterate"
        :disabled="history.length > maxIter || J(xk) < 0.0001">
        ▶ 1 pas
      </button>
      <button class="gn-btn gn-run" @click="runAll">
        ▶▶ Tout exécuter
      </button>
      <button class="gn-btn gn-reset" @click="reset">↺ Reset</button>
      <div class="gn-info">
        Convergence quadratique près du min, peut diverger loin
      </div>
    </div>
  </div>
</template>

<style scoped>
.gn-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.gn-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.gn-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.gn-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.gn-lbl { min-width: 16px; }
.gn-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.gn-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.gn-iter { font-size: 0.72rem; color: #64748b; font-family: monospace; }
.gn-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.gn-btn:hover:not(:disabled) { background: #CF1C24; color: white; }
.gn-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.gn-btn.gn-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.gn-btn.gn-run  { border-color: #25B34B; color: #15803d; background: #f0fdf4; }
.gn-btn.gn-run:hover { background: #25B34B; color: white; }
.gn-info { font-size: 0.68rem; color: #64748b; font-style: italic; }
</style>
