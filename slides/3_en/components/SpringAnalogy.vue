<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { onSlideLeave } from '@slidev/client'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { residual, springEnergy, springEquilibrium, relaxToward, type SpringFactor } from './springMath'

const defaults = () => [
  { id: 'prior', from: null, to: 0, target: 0.5, variance: 0.1, label: 'Prior sur x₀', min: 0, max: 2 },
  { id: '01', from: 0, to: 1, target: 2, variance: 0.25, label: 'x₁ − x₀', min: 0.5, max: 3 },
  { id: '12', from: 1, to: 2, target: 2, variance: 0.25, label: 'x₂ − x₁', min: 0.5, max: 3 },
  { id: '23', from: 2, to: 3, target: 2, variance: 0.25, label: 'x₃ − x₂', min: 0.5, max: 3 },
  { id: 'loop', from: 0, to: 2, target: 3, variance: 0.1, label: 'Boucle x₂ − x₀', min: 1, max: 6 },
]
const parameters = ref(defaults())
const loopEnabled = ref(true)
const positions = ref([0.5, 2.5, 4.5, 6.5])
const factors = computed<SpringFactor[]>(() => parameters.value.filter(p => p.id !== 'loop' || loopEnabled.value))
const optimum = computed(() => springEquilibrium(4, factors.value))
const energy = computed(() => springEnergy(positions.value, factors.value))
const minEnergy = computed(() => springEnergy(optimum.value, factors.value))
const distance = computed(() => Math.max(...positions.value.map((x, i) => Math.abs(x - optimum.value[i]))))
const balanced = computed(() => distance.value < 1e-4)
const chainDistance = computed(() => parameters.value[1].target + parameters.value[2].target)
const loopConflict = computed(() => Math.abs(chainDistance.value - parameters.value[4].target) > 1e-8)
const relaxing = ref(false)
let frame: number | undefined
let lastTime: number | undefined
const svg = ref<SVGSVGElement>()
let dragging: number | undefined
let pointer: number | undefined
const format = (value: number, digits = 2) => (Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value).toFixed(digits).replace('.', ',')
const formula = katex.renderToString(String.raw`J(x)=\frac12\sum_i\frac{r_i^2}{\sigma_i^2},\qquad k_i=\frac{1}{\sigma_i^2}`)

function pause() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  lastTime = undefined
  relaxing.value = false
}

function relax() {
  pause()
  stopDrag()
  if (balanced.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    positions.value = [...optimum.value]
    return
  }
  relaxing.value = true
  function step(time: number) {
    // Time-based damped Newton steps, stable for every slider setting.
    // This is an optimization animation, not a mass/inertia simulation.
    const dt = lastTime === undefined ? 16 : Math.min(50, time - lastTime)
    lastTime = time
    positions.value = relaxToward(positions.value, optimum.value, 1 - Math.exp(-dt / 350))
    if (balanced.value) {
      positions.value = [...optimum.value]
      pause()
    }
    else frame = requestAnimationFrame(step)
  }
  frame = requestAnimationFrame(step)
}

function disturb() {
  pause()
  stopDrag()
  positions.value = optimum.value.map((x, i) => Math.max(-2.5, Math.min(11.5, x + [0.6, -0.7, 0.8, -0.5][i])))
}

function reset() {
  pause()
  stopDrag()
  parameters.value = defaults()
  loopEnabled.value = true
  positions.value = [0.5, 2.5, 4.5, 6.5]
}

// Changing a constraint defines a new cost: pause, then let the teacher relaunch.
watch([parameters, loopEnabled], pause, { deep: true, flush: 'sync' })
onSlideLeave(() => { pause(); stopDrag() })
onScopeDispose(() => { pause(); stopDrag() })

// Include negative intermediate positions caused by strongly conflicting links.
const wx = (x: number) => 28 + (x + 3) / 15 * 452
const nodeY = 151
const nodes = computed(() => positions.value.map((x, i) => ({ x, cx: wx(x), label: ['x₀', 'x₁', 'x₂', 'x₃'][i] })))
function springPath(a: number, b: number, y: number, coils = 10) {
  if (Math.abs(b - a) < 3) return `M ${a} ${y} L ${b} ${y}`
  const points = Array.from({ length: coils }, (_, i) => `${a + (b - a) * (i + 1) / (coils + 1)},${y + (i % 2 ? 6 : -6)}`)
  return `M ${a} ${y} L ${points.join(' L ')} L ${b} ${y}`
}
function color(factor: SpringFactor) {
  const normalized = Math.abs(residual(positions.value, factor)) / Math.sqrt(factor.variance)
  return normalized < 0.15 ? '#15803d' : normalized < 1 ? '#c2410c' : '#CF1C24'
}
// Thickness is a logarithmic visual encoding, not a new numerical spring law.
const thickness = (factor: SpringFactor) => 1.3 + 2.7 * Math.log(2 / factor.variance) / Math.log(50)

function startDrag(event: PointerEvent, index: number) {
  pause()
  dragging = index
  pointer = event.pointerId
  svg.value?.setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  if (dragging === undefined || !svg.value) return
  const matrix = svg.value.getScreenCTM()
  if (!matrix) return
  const point = svg.value.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY
  const local = point.matrixTransform(matrix.inverse())
  positions.value[dragging] = Math.max(-2.5, Math.min(11.5, (local.x - 28) / 452 * 15 - 3))
}
function stopDrag() {
  if (pointer !== undefined && svg.value?.hasPointerCapture(pointer)) svg.value.releasePointerCapture(pointer)
  pointer = undefined
  dragging = undefined
}
function nudge(index: number, delta: number) {
  pause()
  positions.value[index] = Math.max(-2.5, Math.min(11.5, positions.value[index] + delta))
}
</script>

<template>
  <div class="sp-wrap" @click.stop @keydown.stop>
    <div class="sp-toolbar">
      <div class="sp-scenarios" aria-label="Topologie du graphe">
        <button :class="{ selected: !loopEnabled }" :aria-pressed="!loopEnabled" @click="loopEnabled = false">Chaîne</button>
        <button :class="{ selected: loopEnabled }" :aria-pressed="loopEnabled" @click="loopEnabled = true">Boucle partielle : x₀ ↔ x₂</button>
      </div>
      <span>Positions en 1D · glisser les nœuds, puis relaxer</span>
    </div>

    <div class="sp-main">
      <div class="sp-diagram">
        <svg ref="svg" viewBox="0 0 508 254" role="group" aria-label="Graphe de ressorts : chaîne de quatre positions et boucle optionnelle entre x zéro et x deux"
          @pointermove="move" @pointerup="stopDrag" @pointercancel="stopDrag" @lostpointercapture="stopDrag">
          <g v-if="loopEnabled" class="sp-loop">
            <path :d="`M ${nodes[0].cx} ${nodeY - 16} V 65 M ${nodes[2].cx} 65 V ${nodeY - 16}`" fill="none" :stroke="color(parameters[4])" :stroke-width="thickness(parameters[4])" opacity="0.55" />
            <path :d="springPath(nodes[0].cx, nodes[2].cx, 65)" fill="none" :stroke="color(parameters[4])" :stroke-width="thickness(parameters[4])" />
            <text x="20" y="22" class="sp-loop-label">Boucle : x₂ − x₀ ≈ {{ format(parameters[4].target, 1) }} m</text>
            <text x="20" y="40" class="sp-detail" :style="{ fill: color(parameters[4]) }">r₀₂ = {{ format(residual(positions, parameters[4])) }} m</text>
            <text x="489" y="22" text-anchor="end" class="sp-detail">x₃ hors de la boucle</text>
          </g>
          <g v-else>
            <text x="20" y="25" class="sp-loop-label">Chaîne : aucune contrainte redondante</text>
            <text x="20" y="44" class="sp-detail">Chaque ressort peut atteindre sa longueur cible.</text>
          </g>

          <g v-for="(factor, index) in parameters.slice(1, 4)" :key="factor.id">
            <path :d="springPath(nodes[index].cx, nodes[index + 1].cx, nodeY)" fill="none" :stroke="color(factor)" :stroke-width="thickness(factor)" />
            <text :x="(nodes[index].cx + nodes[index + 1].cx) / 2" y="111" text-anchor="middle" class="sp-edge-label">d = {{ format(factor.target, 1) }}</text>
            <text :x="(nodes[index].cx + nodes[index + 1].cx) / 2" y="127" text-anchor="middle" class="sp-detail" :style="{ fill: color(factor) }">r = {{ format(residual(positions, factor)) }}</text>
          </g>

          <path :d="`M ${nodes[0].cx} ${nodeY + 16} V 202`" stroke="#94a3b8" fill="none" />
          <path :d="springPath(wx(parameters[0].target), nodes[0].cx, 202, 6)" fill="none" :stroke="color(parameters[0])" :stroke-width="thickness(parameters[0])" />
          <path :d="`M ${wx(parameters[0].target)} 192 V 212 m -6 -18 l 6 4 m -6 3 l 6 4 m -6 3 l 6 4`" stroke="#475569" stroke-width="2" fill="none" />
          <text :x="wx(parameters[0].target) + 10" y="208" class="sp-detail">Ancre a = {{ format(parameters[0].target, 1) }}</text>

          <g v-for="(node, index) in nodes" :key="index" class="sp-node" role="slider" tabindex="0" :aria-label="`Position x ${index}`" aria-valuemin="-2.5" aria-valuemax="11.5" :aria-valuenow="node.x" aria-orientation="horizontal"
            @pointerdown.prevent="startDrag($event, index)" @keydown.left.prevent="nudge(index, -0.1)" @keydown.right.prevent="nudge(index, 0.1)">
            <circle :cx="node.cx" :cy="nodeY" r="15" :fill="index === 3 ? '#475569' : '#0369a1'" stroke="white" stroke-width="2.5" />
            <text :x="node.cx" :y="nodeY + 4" text-anchor="middle" class="sp-node-label">{{ node.label }}</text>
            <text :x="node.cx" :y="nodeY + 29" text-anchor="middle" class="sp-detail">{{ format(node.x) }}</text>
          </g>

          <line :x1="wx(-3)" :x2="wx(12)" y1="230" y2="230" stroke="#cbd5e1" />
          <g v-for="tick in [-2, 0, 2, 4, 6, 8, 10, 12]" :key="tick">
            <line :x1="wx(tick)" :x2="wx(tick)" y1="230" y2="234" stroke="#94a3b8" />
            <text :x="wx(tick)" y="247" text-anchor="middle" class="sp-detail">{{ tick }}</text>
          </g>
          <text x="496" y="247" text-anchor="end" class="sp-detail">m</text>
        </svg>
        <div class="sp-legend"><span><i class="thin" /> σ² grande : souple</span><span><i class="thick" /> σ² petite : raide</span></div>
        <div class="sp-color-key">Couleur = |r|/σ : <span class="green">faible</span> · <span class="orange">modéré</span> · <span class="red">élevé</span></div>
        <div class="sp-energy"><span>Coût J <b>{{ format(energy, 3) }}</b></span><span>Minimum J* <b>{{ format(minEnergy, 3) }}</b></span><strong :class="{ green: balanced }">{{ relaxing ? 'Relaxation…' : balanced ? 'Équilibre atteint' : 'À relaxer' }}</strong></div>
      </div>

      <div class="sp-parameters">
        <div class="sp-formula" v-html="formula" />
        <div class="sp-table-head"><span>Contrainte</span><span>Cible (m)</span><span>Variance σ² (m²)</span></div>
        <div v-for="factor in parameters" :key="factor.id" class="sp-row" :class="{ inactive: factor.id === 'loop' && !loopEnabled }">
          <div class="sp-factor"><b>{{ factor.label }}</b><small>k = {{ format(1 / factor.variance, 1) }}<span v-if="factor.id === 'loop' && !loopEnabled"> · inactive</span></small></div>
          <label><output>{{ format(factor.target, 1) }}</output><input v-model.number="factor.target" type="range" :min="factor.min" :max="factor.max" step="0.1" :aria-label="`Cible : ${factor.label}`" :disabled="factor.id === 'loop' && !loopEnabled" /></label>
          <label><output>{{ format(factor.variance) }}</output><input v-model.number="factor.variance" type="range" min="0.04" max="2" step="0.01" :aria-label="`Variance : ${factor.label}`" :disabled="factor.id === 'loop' && !loopEnabled" /></label>
        </div>
        <div class="sp-residual">Prior : r₀ = x₀ − a · Lien : rᵢⱼ = xⱼ − xᵢ − dᵢⱼ</div>
      </div>
    </div>

    <div class="sp-insight" aria-live="polite">
      <template v-if="!loopEnabled"><b>Sans boucle :</b> toutes les contraintes peuvent être satisfaites. Les variances ne changent pas la solution MAP.</template>
      <template v-else-if="!loopConflict"><b>Boucle cohérente :</b> le chemin et la fermeture demandent {{ format(chainDistance, 1) }} m. Tous les résidus peuvent être nuls.</template>
      <template v-else><b>Conflit :</b> le chemin 0→1→2 demande {{ format(chainDistance, 1) }} m, la boucle {{ format(parameters[4].target, 1) }} m. Les ressorts les moins précis absorbent davantage l’écart.</template>
      <small>{{ loopEnabled && loopConflict ? 'À l’équilibre, les forces se compensent ; les ressorts peuvent rester tendus. x₃ suit x₂ et conserve sa distance cible.' : 'Le prior fixe la translation globale. Les variances décrivent la confiance, même lorsque les résidus sont nuls.' }}</small>
    </div>
    <div class="sp-actions">
      <button class="primary" :disabled="relaxing || balanced" @click="relax">Relaxer → équilibre</button>
      <button :disabled="!relaxing" @click="pause">Ⅱ Pause</button>
      <button @click="disturb">Perturber les positions</button>
      <button @click="reset">↺ Réinitialiser</button>
      <span>Animation : Newton amorti · modifier σ², puis relaxer</span>
    </div>
  </div>
</template>

<style scoped>
.sp-wrap { width: 100%; color: #334155; font-size: 12px; line-height: 1.35; }
.sp-toolbar, .sp-scenarios, .sp-actions { display: flex; align-items: center; gap: 7px; }
.sp-toolbar { justify-content: space-between; margin-bottom: 9px; }
.sp-toolbar > span { font-size: 11px; color: #64748b; }
.sp-wrap button { border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; padding: 6px 10px; cursor: pointer; font-size: 11px; font-weight: 600; }
.sp-wrap button.selected { color: #b91c1c; border-color: #fca5a5; background: #fff1f2; }
.sp-wrap button.primary { background: #CF1C24; color: white; border-color: #CF1C24; }
.sp-wrap button:disabled { opacity: 0.45; cursor: default; }
.sp-wrap button:hover:not(:disabled) { filter: brightness(0.95); }
.sp-main { display: grid; grid-template-columns: 56% 1fr; gap: 14px; }
.sp-diagram { min-width: 0; padding: 3px 7px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
.sp-diagram svg { display: block; width: 100%; height: 220px; user-select: none; touch-action: none; }
.sp-loop-label { font-size: 12px; fill: #334155; font-weight: 700; }
.sp-detail { font-size: 10px; fill: #64748b; }
.sp-edge-label { font-size: 11px; fill: #334155; font-weight: 600; }
.sp-node { cursor: grab; }
.sp-node:active { cursor: grabbing; }
.sp-node-label { font-size: 12px; fill: white; font-weight: 700; pointer-events: none; }
.sp-node:focus-visible circle { stroke: #CF1C24; stroke-width: 3px; }
.sp-legend { display: flex; justify-content: center; gap: 20px; font-size: 10px; }
.sp-legend span { display: flex; align-items: center; gap: 5px; }
.sp-legend i { display: inline-block; width: 20px; background: #64748b; }
.sp-legend .thin { height: 1px; }
.sp-legend .thick { height: 4px; }
.sp-color-key { text-align: center; font-size: 10px; margin-top: 4px; color: #64748b; }
.green { color: #15803d; }
.orange { color: #c2410c; }
.red { color: #CF1C24; }
.sp-energy { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; margin-top: 7px; padding-top: 7px; font-size: 11px; }
.sp-energy b { font-variant-numeric: tabular-nums; margin-left: 5px; font-size: 14px; }
.sp-parameters { min-width: 0; }
.sp-formula { text-align: center; font-size: 13px; height: 43px; padding-top: 4px; }
.sp-table-head, .sp-row { display: grid; grid-template-columns: 1.1fr 0.85fr 1fr; gap: 9px; align-items: center; }
.sp-table-head { font-size: 10px; color: #64748b; padding: 0 0 6px; }
.sp-row { border-top: 1px solid #e2e8f0; min-height: 42px; }
.sp-factor b { font-size: 11px; }
.sp-factor small { display: block; color: #64748b; font-size: 10px; }
.sp-row label { display: flex; align-items: center; gap: 5px; min-width: 0; }
.sp-row output { font-size: 11px; min-width: 27px; font-variant-numeric: tabular-nums; font-weight: 700; }
.sp-row input { min-width: 0; width: 100%; height: 5px; accent-color: #0369a1; }
.sp-row label:last-child input { accent-color: #CF1C24; }
.sp-row.inactive { opacity: 0.4; }
.sp-residual { font-size: 10px; color: #64748b; margin-top: 7px; }
.sp-insight { background: #f0f9ff; border-left: 3px solid #0369a1; padding: 7px 9px; margin-top: 9px; font-size: 11px; }
.sp-insight small { display: block; font-size: 10px; margin-top: 3px; }
.sp-actions { margin-top: 9px; }
.sp-actions > span { margin-left: auto; font-size: 9px; color: #64748b; }
.sp-wrap button:focus-visible, .sp-row input:focus-visible { outline: 2px solid #0369a1; outline-offset: 3px; }
</style>
