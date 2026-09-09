<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

// ── Vrai problème de moindres carrés 2D (Rosenbrock) ──────────
// r(x,y) = [ 2·(y − x²) , (1 − x) ]   →   J(x,y) = ½‖r‖²
// Minimum (résidu nul) en (1, 1). Fonction-test classique de
// l'optimisation : vallée courbe étroite.
function r1(x: number, y: number) { return 2 * (y - x * x) }
function r2(x: number, y: number) { return 1 - x }
function J(x: number, y: number) { return 0.5 * (r1(x, y) ** 2 + r2(x, y) ** 2) }

// Jacobien du résidu : ∂r1/∂x=−4x, ∂r1/∂y=2, ∂r2/∂x=−1, ∂r2/∂y=0
function jacobian(x: number, y: number) {
  return { j11: -4 * x, j12: 2, j21: -1, j22: 0 }
}
// Gradient ∇J = Jᵀr  et  Hessien approché JᵀJ
function gradAndHessian(x: number, y: number) {
  const { j11, j12, j21, j22 } = jacobian(x, y)
  const a = r1(x, y), b = r2(x, y)
  const gx = j11 * a + j21 * b
  const gy = j12 * a + j22 * b
  const h11 = j11 * j11 + j21 * j21
  const h12 = j11 * j12 + j21 * j22
  const h22 = j12 * j12 + j22 * j22
  return { gx, gy, h11, h12, h22 }
}
// Résout [[a,b],[b,d]]·Δ = [e,f]
function solve2(a: number, b: number, d: number, e: number, f: number) {
  const det = a * d - b * b
  if (Math.abs(det) < 1e-12) return { dx: 0, dy: 0 }
  return { dx: (e * d - b * f) / det, dy: (a * f - e * b) / det }
}

const clamp = (v: number) => Math.max(-2.5, Math.min(2.5, v))

// ── State ─────────────────────────────────────────────────────
const x0 = ref(-1.5)
const y0 = ref(2.0)
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

type Traj = { x: number; y: number }[]
const gdTraj = ref<Traj>([])
const gnTraj = ref<Traj>([])
const lmTraj = ref<Traj>([])
let gdState = { x: -1.5, y: 2.0 }
let gnState = { x: -1.5, y: 2.0 }
let lmState = { x: -1.5, y: 2.0, lam: 1.0 }

function initTrajectories() {
  gdState = { x: x0.value, y: y0.value }
  gnState = { x: x0.value, y: y0.value }
  lmState = { x: x0.value, y: y0.value, lam: 1.0 }
  gdTraj.value = [{ x: x0.value, y: y0.value }]
  gnTraj.value = [{ x: x0.value, y: y0.value }]
  lmTraj.value = [{ x: x0.value, y: y0.value }]
}
initTrajectories()
watch([x0, y0], initTrajectories)

// Gradient Descent — pas fixe (lent, stable)
function stepGD() {
  const lr = 0.02
  const { gx, gy } = gradAndHessian(gdState.x, gdState.y)
  gdState.x = clamp(gdState.x - lr * gx)
  gdState.y = clamp(gdState.y - lr * gy)
  gdTraj.value = [...gdTraj.value, { x: gdState.x, y: gdState.y }]
}

// Gauss-Newton — pas complet (JᵀJ)⁻¹Jᵀr, sans amortissement.
// Rapide près du min, mais grands pas erratiques loin de celui-ci.
function stepGN() {
  const { gx, gy, h11, h12, h22 } = gradAndHessian(gnState.x, gnState.y)
  const { dx, dy } = solve2(h11, h12, h22, -gx, -gy)
  gnState.x = clamp(gnState.x + dx)
  gnState.y = clamp(gnState.y + dy)
  gnTraj.value = [...gnTraj.value, { x: gnState.x, y: gnState.y }]
}

// Levenberg-Marquardt — (JᵀJ + λI)⁻¹, λ adaptatif via ratio de gain
function stepLM() {
  const { gx, gy, h11, h12, h22 } = gradAndHessian(lmState.x, lmState.y)
  const { dx, dy } = solve2(h11 + lmState.lam, h12, h22 + lmState.lam, -gx, -gy)
  const nx = clamp(lmState.x + dx), ny = clamp(lmState.y + dy)
  if (J(nx, ny) < J(lmState.x, lmState.y)) {
    lmState.x = nx; lmState.y = ny
    lmState.lam = Math.max(1e-3, lmState.lam / 3)   // succès → vers GN
  } else {
    lmState.lam = Math.min(1e3, lmState.lam * 3)     // échec → vers GD
  }
  lmTraj.value = [...lmTraj.value, { x: lmState.x, y: lmState.y }]
}

const MAX_STEPS = 40
function step() {
  if (gdTraj.value.length > MAX_STEPS) { stop(); return }
  stepGD(); stepGN(); stepLM()
}
function play() {
  if (playing.value) { stop(); return }
  initTrajectories()
  playing.value = true
  timer = setInterval(step, 150)
}
function stop() {
  if (timer) clearInterval(timer)
  playing.value = false
}
function reset() { stop(); initTrajectories() }
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Heatmap (échelle log pour révéler la vallée) ──────────────
const HW = 80, HH = 60
const WORLD_X = [-2.5, 2.5], WORLD_Y = [-2.5, 2.5]

const heatmap = computed(() => {
  const cells: { x: number; y: number; fill: string }[] = []
  let maxL = -Infinity, minL = Infinity
  const vals: number[][] = []
  for (let r = 0; r < HH; r++) {
    vals[r] = []
    for (let c = 0; c < HW; c++) {
      const wx = WORLD_X[0] + (c + 0.5) / HW * (WORLD_X[1] - WORLD_X[0])
      const wy = WORLD_Y[0] + (r + 0.5) / HH * (WORLD_Y[1] - WORLD_Y[0])
      const v = Math.log(1 + J(wx, wy))
      vals[r][c] = v
      if (v > maxL) maxL = v
      if (v < minL) minL = v
    }
  }
  for (let r = 0; r < HH; r++) {
    for (let c = 0; c < HW; c++) {
      const t = (vals[r][c] - minL) / Math.max(maxL - minL, 0.01)
      const red = Math.round(180 + t * 75)
      const green = Math.round(240 - t * 200)
      const blue = Math.round(240 - t * 200)
      cells.push({ x: c, y: r, fill: `rgb(${red},${green},${blue})` })
    }
  }
  return cells
})

// ── SVG layout ────────────────────────────────────────────────
const PX1 = 5, PX2 = 278, PY1 = 5, PY2 = 205
const CW = (PX2 - PX1) / HW
const CH = (PY2 - PY1) / HH

function svgPx(wx: number) { return PX1 + (wx - WORLD_X[0]) / (WORLD_X[1] - WORLD_X[0]) * (PX2 - PX1) }
function svgPy(wy: number) { return PY2 - (wy - WORLD_Y[0]) / (WORLD_Y[1] - WORLD_Y[0]) * (PY2 - PY1) }
function trajPts(traj: Traj): string {
  return traj.map(p => `${svgPx(p.x).toFixed(1)},${svgPy(p.y).toFixed(1)}`).join(' ')
}
const minPt = { x: 1, y: 1 }
</script>

<template>
  <div class="lm-wrap">
    <svg viewBox="0 0 558 215" class="lm-svg">

      <!-- ══════ LEFT: Heatmap + trajectoires ══════ -->
      <rect v-for="(c, i) in heatmap" :key="i"
        :x="PX1 + c.x * CW" :y="PY1 + c.y * CH"
        :width="CW + 0.5" :height="CH + 0.5"
        :fill="c.fill"/>

      <rect :x="PX1" :y="PY1" :width="PX2-PX1" :height="PY2-PY1"
        fill="none" stroke="#475569" stroke-width="1.2"/>

      <text x="141" y="14" text-anchor="middle"
        style="font-size:8px;fill:#1e293b;font-style:italic;font-family:sans-serif;font-weight:700">
        J = ½‖r‖², r = [2(y−x²), 1−x] — min en (1,1)
      </text>

      <text x="141" y="212" text-anchor="middle"
        style="font-size:7.5px;fill:#475569;font-family:sans-serif">x</text>
      <text x="3" y="108" text-anchor="middle" :transform="`rotate(-90,3,108)`"
        style="font-size:7.5px;fill:#475569;font-family:sans-serif">y</text>

      <!-- Minimum ★ -->
      <text :x="svgPx(minPt.x)" :y="svgPy(minPt.y)+4" text-anchor="middle"
        style="font-size:14px;fill:#15803d;font-weight:700">★</text>

      <!-- GD trajectory (blue) -->
      <polyline v-if="gdTraj.length > 1" :points="trajPts(gdTraj)"
        fill="none" stroke="#00BDF2" stroke-width="2" opacity="0.9"
        stroke-linejoin="round" stroke-linecap="round"/>
      <circle v-if="gdTraj.length > 0"
        :cx="svgPx(gdTraj[gdTraj.length-1].x)" :cy="svgPy(gdTraj[gdTraj.length-1].y)"
        r="4" fill="#00BDF2" stroke="white" stroke-width="1.5"/>

      <!-- GN trajectory (red) -->
      <polyline v-if="gnTraj.length > 1" :points="trajPts(gnTraj)"
        fill="none" stroke="#CF1C24" stroke-width="2" opacity="0.9"
        stroke-linejoin="round" stroke-linecap="round"/>
      <circle v-if="gnTraj.length > 0"
        :cx="svgPx(gnTraj[gnTraj.length-1].x)" :cy="svgPy(gnTraj[gnTraj.length-1].y)"
        r="4" fill="#CF1C24" stroke="white" stroke-width="1.5"/>

      <!-- LM trajectory (green) -->
      <polyline v-if="lmTraj.length > 1" :points="trajPts(lmTraj)"
        fill="none" stroke="#25B34B" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>
      <circle v-if="lmTraj.length > 0"
        :cx="svgPx(lmTraj[lmTraj.length-1].x)" :cy="svgPy(lmTraj[lmTraj.length-1].y)"
        r="5" fill="#25B34B" stroke="white" stroke-width="1.5"/>

      <!-- Start point -->
      <rect :x="svgPx(x0)-5" :y="svgPy(y0)-5" width="10" height="10"
        fill="#1e293b" stroke="white" stroke-width="1.5" rx="1"/>

      <!-- ══════ RIGHT: Info panel ══════ -->
      <rect x="283" y="2" width="273" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="419" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Comparaison des algorithmes
      </text>

      <!-- GD -->
      <rect x="293" y="20" width="253" height="42" fill="#e0f7ff" rx="4" stroke="#00BDF2" stroke-width="1"/>
      <text x="296" y="32" style="font-size:8px;fill:#0284c7;font-weight:700;font-family:sans-serif">
        Gradient Descent (bleu) — Δ = −lr·∇J
      </text>
      <text x="296" y="44" style="font-size:8px;fill:#0284c7;font-family:monospace">
        J = {{ J(gdState.x, gdState.y).toFixed(4) }} &nbsp; steps = {{ gdTraj.length - 1 }}
      </text>
      <text x="296" y="57" style="font-size:7.5px;fill:#0284c7;font-family:monospace">
        x={{ gdState.x.toFixed(3) }}  y={{ gdState.y.toFixed(3) }}
      </text>

      <!-- GN -->
      <rect x="293" y="68" width="253" height="42" fill="#fef2f2" rx="4" stroke="#CF1C24" stroke-width="1"/>
      <text x="296" y="80" style="font-size:8px;fill:#991b1b;font-weight:700;font-family:sans-serif">
        Gauss-Newton (rouge) — Δ = −(JᵀJ)⁻¹Jᵀr
      </text>
      <text x="296" y="92" style="font-size:8px;fill:#991b1b;font-family:monospace">
        J = {{ J(gnState.x, gnState.y).toFixed(4) }} &nbsp; steps = {{ gnTraj.length - 1 }}
      </text>
      <text x="296" y="105" style="font-size:7.5px;fill:#991b1b;font-family:monospace">
        x={{ gnState.x.toFixed(3) }}  y={{ gnState.y.toFixed(3) }}
      </text>

      <!-- LM -->
      <rect x="293" y="116" width="253" height="52" fill="#f0fdf4" rx="4" stroke="#25B34B" stroke-width="1.5"/>
      <text x="296" y="128" style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">
        Levenberg-Marquardt (vert) — +λI
      </text>
      <text x="296" y="140" style="font-size:8px;fill:#15803d;font-family:monospace">
        J = {{ J(lmState.x, lmState.y).toFixed(4) }} &nbsp; steps = {{ lmTraj.length - 1 }}
      </text>
      <text x="296" y="153" style="font-size:7.5px;fill:#15803d;font-family:monospace">
        x={{ lmState.x.toFixed(3) }}  y={{ lmState.y.toFixed(3) }}
      </text>
      <text x="296" y="163" style="font-size:7.5px;fill:#15803d;font-family:monospace">
        λ = {{ lmState.lam.toFixed(4) }}  (λ↑ → GD, λ↓ → GN)
      </text>

      <!-- Insight -->
      <rect x="293" y="174" width="253" height="30" fill="#fef9f9" rx="3" stroke="#fca5a5" stroke-width="1"/>
      <text x="419" y="186" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-style:italic;font-family:sans-serif">
        GN : grands pas erratiques loin du min.
      </text>
      <text x="419" y="198" text-anchor="middle"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        LM reste robuste grâce à l'amortissement λ.
      </text>
    </svg>

    <!-- Controls -->
    <div class="lm-controls">
      <label class="lm-sl">
        <span class="lm-lbl">x₀</span>
        <strong>{{ x0.toFixed(1) }}</strong>
        <input type="range" v-model.number="x0" min="-2" max="2" step="0.1"/>
      </label>
      <label class="lm-sl">
        <span class="lm-lbl">y₀</span>
        <strong>{{ y0.toFixed(1) }}</strong>
        <input type="range" v-model.number="y0" min="-2" max="2" step="0.1"/>
      </label>
      <button class="lm-btn" @click="play">{{ playing ? '⏸ Pause' : '▶ Play' }}</button>
      <button class="lm-btn lm-reset" @click="reset">↺ Reset</button>
      <span class="lm-step">étape {{ gdTraj.length - 1 }} / {{ MAX_STEPS }}</span>
    </div>
  </div>
</template>

<style scoped>
.lm-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.lm-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.lm-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lm-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.lm-lbl { min-width: 16px; }
.lm-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.lm-sl input[type=range] { width: 80px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.lm-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.lm-btn:hover { background: #CF1C24; color: white; }
.lm-btn.lm-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.lm-step { font-size: 0.68rem; color: #64748b; font-family: monospace; }
</style>
