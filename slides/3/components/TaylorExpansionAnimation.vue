<script setup lang="ts">
import { computed, onScopeDispose, ref, useId } from 'vue'
import { onSlideLeave } from '@slidev/client'
import katex from 'katex'
import 'katex/dist/katex.min.css'

const stage = ref(0)
const base = ref(3)
const offset = ref(0.75)
const iteration = ref(0)
const target = 10
const playing = ref(false)
let frame: number | undefined
let startTime: number | undefined
const clipId = `taylor-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const steps = ['Choisir un point', 'Tracer la tangente', 'Voir l’erreur', 'Calculer un pas']
const h = (x: number) => x ** 2
const slope = computed(() => 2 * base.value)
const step = computed(() => (target - h(base.value)) / slope.value)
const delta = computed(() => stage.value === 3 ? step.value : offset.value)
const probe = computed(() => base.value + delta.value)
const approximation = computed(() => h(base.value) + slope.value * delta.value)
const exact = computed(() => h(probe.value))
const error = computed(() => exact.value - approximation.value)
const converged = computed(() => Math.abs(h(base.value) - target) < 1e-8)
const format = (x: number, digits = 2) => (Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x).toFixed(digits).replace('.', ',')
const math = (source: string) => katex.renderToString(source, { throwOnError: true })
const taylorFormula = math(String.raw`h(x_k+\Delta x)\approx h(x_k)+h'(x_k)\,\Delta x`)
const polynomialFormula = math(String.raw`(x_k+\Delta x)^2=x_k^2+2x_k\Delta x+(\Delta x)^2`)
const correctionFormula = math(String.raw`\Delta x=\frac{z-h(x_k)}{h'(x_k)}`)
const jacobianFormula = math(String.raw`h(\mathbf{x}+\Delta\mathbf{x})\approx h(\mathbf{x})+J(\mathbf{x})\,\Delta\mathbf{x}`)

function pause() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  startTime = undefined
  playing.value = false
}
function selectStage(index: number) {
  pause()
  stage.value = index
}
function changeBase() {
  pause()
  iteration.value = 0
}
function applyStep() {
  pause()
  if (stage.value !== 3 || converged.value) return
  base.value = probe.value
  iteration.value++
  stage.value = 1
}
function reset() {
  pause()
  stage.value = 0
  base.value = 3
  offset.value = 0.75
  iteration.value = 0
}
function play() {
  if (playing.value) return pause()
  pause()
  stage.value = 0
  playing.value = true
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  function tick(time: number) {
    if (startTime === undefined) startTime = time
    const elapsed = time - startTime
    stage.value = elapsed < 1800 ? 0 : elapsed < 3600 ? 1 : elapsed < 7600 ? 2 : 3
    // Keep the expansion point fixed while exploring the neglected term.
    if (stage.value === 2) offset.value = reducedMotion ? 0.75 : Math.sin((elapsed - 3600) / 4000 * Math.PI)
    if (elapsed >= 10000) {
      offset.value = 0.75
      pause()
    }
    else frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}
onSlideLeave(pause)
onScopeDispose(pause)

// Fixed axes and true function values, including negative values of the tangent.
const plot = { left: 35, right: 480, top: 15, bottom: 221, xMax: 5.2, yMin: -5, yMax: 27 }
const wx = (x: number) => plot.left + x / plot.xMax * (plot.right - plot.left)
const wy = (y: number) => plot.bottom - (y - plot.yMin) / (plot.yMax - plot.yMin) * (plot.bottom - plot.top)
const curvePoints = Array.from({ length: 261 }, (_, i) => {
  const x = i / 260 * plot.xMax
  return `${wx(x)},${wy(h(x))}`
}).join(' ')
const tangent = (x: number) => h(base.value) + slope.value * (x - base.value)
const tangentPoints = computed(() => `${wx(0)},${wy(tangent(0))} ${wx(plot.xMax)},${wy(tangent(plot.xMax))}`)
const triangleDelta = delta
// Offset the error bracket so the two point markers cannot hide small errors.
const bracketDirection = computed(() => probe.value > 4.3 ? -1 : 1)
const bracketX = computed(() => wx(probe.value) + 14 * bracketDirection.value)
</script>

<template>
  <div class="ta-wrap" @click.stop @keydown.stop>
    <div class="ta-steps" aria-label="Étapes du rappel de Taylor">
      <button v-for="(label, index) in steps" :key="label" :class="{ active: stage === index }" :aria-current="stage === index ? 'step' : undefined" @click="selectStage(index)"><span>{{ index + 1 }}</span>{{ label }}</button>
    </div>
    <div class="ta-main">
      <div class="ta-chart">
        <div class="ta-legend"><span class="blue">━ Fonction h(x) = x²</span><span class="red" :class="{ muted: stage === 0 }">┄ Tangente en x<sub>k</sub></span><span v-if="stage === 3" class="green">┄ Mesure z = 10</span></div>
        <svg viewBox="0 0 500 248" role="img" :aria-label="`Parabole x carré et approximation autour de x égal à ${format(base)}. Étape ${stage + 1} : ${steps[stage]}.`">
          <defs><clipPath :id="clipId"><rect :x="plot.left" :y="plot.top" :width="plot.right - plot.left" :height="plot.bottom - plot.top" /></clipPath></defs>
          <g v-for="tick in [-5, 0, 5, 10, 15, 20, 25]" :key="`y${tick}`">
            <line :x1="plot.left" :x2="plot.right" :y1="wy(tick)" :y2="wy(tick)" :stroke="tick === 0 ? '#94a3b8' : '#e2e8f0'" />
            <text :x="plot.left - 7" :y="wy(tick) + 3" text-anchor="end" class="ta-tick">{{ tick }}</text>
          </g>
          <line :x1="plot.left" :x2="plot.left" :y1="plot.top" :y2="plot.bottom" stroke="#94a3b8" />
          <g v-for="tick in [0, 1, 2, 3, 4, 5]" :key="`x${tick}`">
            <line :x1="wx(tick)" :x2="wx(tick)" :y1="plot.bottom" :y2="plot.bottom + 4" stroke="#94a3b8" />
            <text :x="wx(tick)" :y="plot.bottom + 17" text-anchor="middle" class="ta-tick">{{ tick }}</text>
          </g>
          <text x="490" y="238" class="ta-tick">x</text>
          <text x="8" y="12" class="ta-tick">h(x)</text>
          <g :clip-path="`url(#${clipId})`">
            <polyline data-curve="function" :points="curvePoints" fill="none" stroke="#0369a1" stroke-width="3" />
            <g v-if="stage >= 1" class="ta-reveal">
              <polyline data-curve="tangent" :points="tangentPoints" fill="none" stroke="#CF1C24" stroke-width="2.4" stroke-dasharray="6 4" />
              <path :d="`M ${wx(base)} ${wy(h(base))} H ${wx(base + triangleDelta)} V ${wy(tangent(base + triangleDelta))}`" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3 3" />
              <text v-if="Math.abs(triangleDelta) > 0.15" :x="wx(base + triangleDelta / 2)" :y="wy(h(base)) + 15" text-anchor="middle" class="ta-delta-label">Δx</text>
            </g>
            <g v-if="stage === 3" class="ta-reveal">
              <line :x1="plot.left" :x2="plot.right" :y1="wy(target)" :y2="wy(target)" stroke="#15803d" stroke-width="1.8" stroke-dasharray="5 4" />
              <text :x="plot.left + 7" :y="wy(target) - 7" class="ta-target-label">z = 10</text>
            </g>
            <line :x1="wx(base)" :x2="wx(base)" :y1="wy(h(base))" :y2="plot.bottom" stroke="#0369a1" stroke-dasharray="3 4" opacity="0.5" />
            <circle :cx="wx(base)" :cy="wy(h(base))" r="5" fill="#0369a1" stroke="white" stroke-width="1.5" />
            <text :x="wx(base) - 10" :y="wy(h(base)) - 10" text-anchor="end" class="ta-base-label">x<tspan baseline-shift="sub" style="font-size: 8px">{{ iteration }}</tspan></text>
            <g v-if="stage >= 2" class="ta-reveal">
              <path data-mark="error" :d="`M ${wx(probe)} ${wy(approximation)} H ${bracketX} V ${wy(exact)} H ${wx(probe)}`" fill="none" stroke="#ea580c" stroke-width="2" />
              <text v-if="stage === 2 && Math.abs(delta) > 0.1" :x="bracketX + 6 * bracketDirection" :y="wy((exact + approximation) / 2) + 3" :text-anchor="bracketDirection > 0 ? 'start' : 'end'" style="fill: #c2410c; font-size: 10px">erreur</text>
              <circle :cx="wx(probe)" :cy="wy(approximation)" r="4" fill="white" stroke="#CF1C24" stroke-width="2" />
              <circle :cx="wx(probe)" :cy="wy(exact)" r="4" fill="#0369a1" stroke="white" stroke-width="1.2" />
            </g>
          </g>
        </svg>
        <div class="ta-current"><span>Point : x<sub>{{ iteration }}</sub> = <b>{{ format(base, 3) }}</b></span><span>Valeur : <b>{{ format(h(base), 3) }}</b></span><span>Pente : <b>{{ format(slope, 3) }}</b></span></div>
      </div>

      <div class="ta-explanation">
        <div class="ta-formula" v-html="taylorFormula" />
        <div class="ta-stage" aria-live="polite">
          <template v-if="stage === 0">
            <h3>1. Partir de ce qu’on connaît</h3>
            <p>On choisit un point x<sub>k</sub> sur la courbe. Ici, <b>h(x) = x²</b> et <b>h′(x) = 2x</b>.</p>
            <div class="ta-callout blue">h(x<sub>k</sub>) = {{ format(h(base)) }}<br />h′(x<sub>k</sub>) = {{ format(slope) }}</div>
            <p>La valeur et la pente à ce point vont définir notre approximation locale.</p>
          </template>
          <template v-else-if="stage === 1">
            <h3>2. Conserver la valeur et la pente</h3>
            <div class="ta-callout red">L<sub>k</sub>(Δx) = {{ format(h(base)) }} + {{ format(slope) }} Δx</div>
            <p>La tangente passe par le point bleu et possède la même pente que la courbe.</p>
            <p><b>{{ format(h(base)) }}</b> et <b>{{ format(slope) }}</b> sont fixés pendant ce calcul. L’approximation est <b>affine en Δx</b>.</p>
          </template>
          <template v-else-if="stage === 2">
            <h3>3. Ce que le premier ordre néglige</h3>
            <div class="ta-polynomial" v-html="polynomialFormula" />
            <div class="ta-readings"><span class="blue">Vraie valeur<b>{{ format(exact, 3) }}</b></span><span class="red">Taylor 1<b>{{ format(approximation, 3) }}</b></span><span class="orange">Écart (Δx)²<b>{{ format(error, 3) }}</b></span></div>
            <p>Le segment orange montre l’écart entre la courbe et la tangente. <b>Doubler |Δx| quadruple l’erreur</b> pour cette parabole.</p>
          </template>
          <template v-else>
            <h3>4. Utiliser la tangente pour viser z = 10</h3>
            <div class="ta-correction"><span v-html="correctionFormula" /> = <b>{{ format(step, 4) }}</b></div>
            <div class="ta-callout">x<sub>{{ iteration + 1 }}</sub> = {{ format(base, 4) }} {{ step < 0 ? '−' : '+' }} {{ format(Math.abs(step), 4) }} = <b>{{ format(probe, 4) }}</b></div>
            <p>La tangente prédit <b>10</b> ; la vraie fonction donne <b>{{ format(exact, 4) }}</b>.</p>
            <p>On applique le pas, puis on <b>recalcule la tangente</b> au nouveau point.</p>
          </template>
        </div>
        <div class="ta-vector"><span>En plusieurs dimensions, la pente devient le Jacobien :</span><div v-html="jacobianFormula" /></div>
      </div>
    </div>

    <div class="ta-controls">
      <label><span>Point x<sub>k</sub></span> <b>{{ format(base, 3) }}</b><input v-model.number="base" type="range" min="2" max="4" step="0.05" aria-label="Point de développement" :disabled="playing" @input="changeBase" /></label>
      <label v-if="stage !== 3" :class="{ muted: stage !== 2 }">Déplacement Δx <b>{{ format(delta, 3) }}</b><input v-model.number="offset" type="range" min="-1" max="1" step="0.01" aria-label="Déplacement autour du point de développement" :disabled="stage !== 2 || playing" /></label>
      <span v-else>Pas calculé Δx = <b>{{ format(step, 4) }}</b></span>
      <span>{{ stage === 3 ? 'Le pas est calculé à partir de la tangente.' : stage === 2 ? 'Faire varier Δx et observer l’écart orange.' : 'Le point de développement reste fixe pendant le pas.' }}</span>
    </div>
    <div class="ta-actions">
      <button v-if="stage < 3" class="primary" :disabled="playing" @click="selectStage(stage + 1)">Étape suivante →</button>
      <button v-else class="primary" :disabled="playing || converged" @click="applyStep">{{ converged ? 'Cible atteinte' : 'Appliquer et relinéariser →' }}</button>
      <button :aria-pressed="playing" @click="play">{{ playing ? 'Ⅱ Pause' : '▶ Démonstration' }}</button>
      <button @click="reset">↺ Réinitialiser</button>
      <span v-if="iteration">{{ iteration }} correction{{ iteration > 1 ? 's' : '' }} appliquée{{ iteration > 1 ? 's' : '' }}</span>
    </div>
    <div class="ta-takeaway"><b>Taylor rend le prochain calcul plus simple.</b> Il fournit une approximation locale ; la fonction d’origine reste non linéaire.</div>
  </div>
</template>

<style scoped>
.ta-wrap { width: 100%; color: #334155; font-size: 12px; line-height: 1.35; }
.ta-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 9px; }
.ta-steps button { display: flex; gap: 7px; align-items: center; text-align: left; }
.ta-steps span { border: 1px solid currentColor; border-radius: 50%; width: 19px; height: 19px; display: grid; place-items: center; }
.ta-wrap button { border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; padding: 6px 9px; font-size: 11px; font-weight: 600; cursor: pointer; }
.ta-steps button.active { color: #b91c1c; background: #fff1f2; border-color: #fca5a5; }
.ta-main { display: grid; grid-template-columns: 57% 1fr; gap: 13px; }
.ta-chart { min-width: 0; padding: 7px 5px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
.ta-legend { display: flex; align-items: center; gap: 12px; font-size: 10px; padding: 0 5px; height: 17px; }
.ta-chart svg { display: block; width: 100%; height: 235px; }
.ta-tick { fill: #64748b; font-size: 10px; }
.ta-base-label { fill: #0369a1; font-size: 12px; font-weight: 700; }
.ta-delta-label { fill: #64748b; font-size: 10px; }
.ta-target-label { fill: #15803d; font-size: 11px; font-weight: 700; }
.blue { color: #0369a1; }
.red { color: #CF1C24; }
.orange { color: #c2410c; }
.green { color: #15803d; }
.muted { opacity: 0.4; }
.ta-current { display: flex; justify-content: space-around; font-size: 10px; margin-top: 3px; }
.ta-current b, .ta-readings b, .ta-controls b { font-variant-numeric: tabular-nums; }
.ta-explanation { min-width: 0; }
.ta-formula { text-align: center; padding: 7px 0 10px; font-size: 12px; }
.ta-stage { height: 197px; padding-top: 4px; }
.ta-stage h3 { font-size: 12px; font-weight: 700; line-height: 1.35; margin: 0 0 8px; }
.ta-stage p { font-size: 12px; line-height: 1.45; margin: 8px 0 0; }
.ta-callout { padding: 8px 10px; background: #f1f5f9; border-radius: 5px; font-size: 14px; line-height: 1.5; margin: 8px 0; }
.ta-callout.red { background: #fff1f2; }
.ta-callout.blue { background: #f0f9ff; }
.ta-polynomial { font-size: 11px; margin: 10px 0; }
.ta-readings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 12px; }
.ta-readings span { padding: 6px; border-radius: 5px; background: #f8fafc; font-size: 10px; }
.ta-readings b { display: block; font-size: 16px; margin-top: 3px; }
.ta-correction { font-size: 12px; padding: 6px 0; }
.ta-vector { padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 10px; }
.ta-vector > div { font-size: 11px; margin-top: 5px; text-align: center; }
.ta-controls { display: flex; align-items: center; gap: 18px; margin-top: 9px; }
.ta-controls label { display: flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 11px; }
.ta-controls b { min-width: 36px; }
.ta-controls input { width: 100px; height: 5px; accent-color: #CF1C24; }
.ta-controls > span { margin-left: auto; font-size: 10px; color: #64748b; text-align: right; }
.ta-actions { display: flex; align-items: center; gap: 7px; margin-top: 10px; }
.ta-actions .primary { background: #CF1C24; color: white; border-color: #CF1C24; min-width: 170px; }
.ta-actions > span { margin-left: auto; font-size: 11px; color: #64748b; }
.ta-wrap button:disabled { opacity: 0.45; cursor: default; }
.ta-wrap button:hover:not(:disabled) { filter: brightness(0.95); }
.ta-wrap button:focus-visible, .ta-controls input:focus-visible { outline: 2px solid #0369a1; outline-offset: 3px; }
.ta-takeaway { font-size: 11px; padding: 7px 9px; margin-top: 9px; background: #f0f9ff; border-left: 3px solid #0369a1; }
.ta-reveal { animation: ta-appear 450ms ease-out both; }
@keyframes ta-appear { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .ta-reveal { animation: none; } }
</style>
