<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { onSlideLeave } from '@slidev/client'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { gaussianDensity, posteriorFrom, type Gaussian, type Measurement } from './bayesUpdateMath'

const muInitial = ref(0)
const sigmaInitial = ref(1.5)
const z = ref(2)
const sigmaZ = ref(0.8)
const measurements = ref<Measurement[]>([])
type Phase = 'observe' | 'fuse' | 'retain'
const phase = ref<Phase>('observe')
const maxMeasurements = 6
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const initial = computed<Gaussian>(() => ({ mean: muInitial.value, variance: sigmaInitial.value ** 2 }))
// Keep the completed update visible during "retain". Only the next "observe"
// step promotes that posterior to the prior for the following update.
const beforeCount = computed(() => measurements.value.length - (phase.value === 'retain' ? 1 : 0))
const before = computed(() => posteriorFrom(initial.value, measurements.value.slice(0, beforeCount.value)))
const currentMeasurement = computed<Measurement>(() => phase.value === 'retain'
  ? measurements.value[measurements.value.length - 1]
  : { value: z.value, sigma: sigmaZ.value })
const likelihood = computed<Gaussian>(() => ({ mean: currentMeasurement.value.value, variance: currentMeasurement.value.sigma ** 2 }))
const after = computed(() => posteriorFrom(before.value, [currentMeasurement.value]))
const k = computed(() => beforeCount.value + 1)
const gain = computed(() => before.value.variance / (before.value.variance + likelihood.value.variance))
const showPosterior = computed(() => phase.value !== 'observe')
const finished = computed(() => measurements.value.length === maxMeasurements && phase.value === 'retain')
const initialLocked = computed(() => measurements.value.length > 0 || phase.value !== 'observe' || playing.value)
const measurementLocked = computed(() => phase.value !== 'observe' || playing.value)

function pause() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
  playing.value = false
}

function advance() {
  if (finished.value) return pause()
  if (phase.value === 'observe') phase.value = 'fuse'
  else if (phase.value === 'fuse') {
    measurements.value = [...measurements.value, { ...currentMeasurement.value }]
    phase.value = 'retain'
    if (finished.value) pause()
  }
  else phase.value = 'observe'
}

function togglePlay() {
  if (playing.value) return pause()
  if (finished.value) return
  playing.value = true
  timer = setInterval(advance, 2400)
}

function reset() {
  pause()
  measurements.value = []
  phase.value = 'observe'
  muInitial.value = 0
  sigmaInitial.value = 1.5
  z.value = 2
  sigmaZ.value = 0.8
}

onSlideLeave(pause)
onScopeDispose(pause)

const nextLabel = computed(() => ({ observe: 'Calculer le posterior', fuse: 'Retenir cette mesure', retain: 'Préparer la suivante' })[phase.value])
const steps = ['Observer', 'Fusionner', 'Retenir']
const stepIndex = computed(() => ['observe', 'fuse', 'retain'].indexOf(phase.value))
const format = (value: number) => value.toFixed(2).replace('.', ',')
const math = (value: string) => katex.renderToString(value, { throwOnError: true })
const bayesFormula = math(String.raw`p_k(x)=\frac{p(z_k\mid x)\,p_{k-1}(x)}{\int p(z_k\mid u)\,p_{k-1}(u)\,du}`)
const meanFormula = math(String.raw`\mu_k=\mu_{k-1}+K_k(z_k-\mu_{k-1})`)
const gainFormula = math(String.raw`K_k=\frac{\sigma_{k-1}^2}{\sigma_{k-1}^2+\sigma_z^2}`)
const varianceFormula = math(String.raw`\frac{1}{\sigma_k^2}=\frac{1}{\sigma_{k-1}^2}+\frac{1}{\sigma_z^2}`)

// Fixed physical density scale. Six measurements at most; every sigma >= .5:
// maximum peak = sqrt(7 / .5^2) / sqrt(2*pi) < 2.2. No peak normalization.
const plot = { left: 38, right: 490, top: 22, bottom: 213, xMin: -12, xMax: 12, yMax: 2.2 }
const wx = (value: number) => plot.left + (value - plot.xMin) / (plot.xMax - plot.xMin) * (plot.right - plot.left)
const wy = (value: number) => plot.bottom - value / plot.yMax * (plot.bottom - plot.top)
function curve(distribution: Gaussian): string {
  return Array.from({ length: 801 }, (_, index) => {
    const x = plot.xMin + index / 800 * (plot.xMax - plot.xMin)
    return `${wx(x).toFixed(3)},${wy(gaussianDensity(x, distribution)).toFixed(3)}`
  }).join(' ')
}
const initialPoints = computed(() => curve(initial.value))
const beforePoints = computed(() => curve(before.value))
const likelihoodPoints = computed(() => curve(likelihood.value))
const afterPoints = computed(() => curve(after.value))
const history = computed(() => Array.from({ length: measurements.value.length + 1 }, (_, index) => ({
  index,
  sigma: Math.sqrt(posteriorFrom(initial.value, measurements.value.slice(0, index)).variance),
})))
</script>

<template>
  <div class="bua-wrap" @click.stop @keydown.stop>
    <div class="bua-model">Position <b>x fixe</b> · z<sub>k</sub> = x + ε<sub>k</sub> · bruits gaussiens indépendants · σ = écart-type</div>
    <div class="bua-steps" aria-label="Étapes de la mise à jour">
      <div v-for="(step, index) in steps" :key="step" :class="{ active: stepIndex === index, done: stepIndex > index }" :aria-current="stepIndex === index ? 'step' : undefined">
        <span>{{ index + 1 }}</span> {{ step }}
        <small>{{ ['prior + mesure', 'produit normalisé', 'posterior mémorisé'][index] }}</small>
      </div>
    </div>

    <div class="bua-main">
      <div class="bua-chart">
        <div class="bua-legend">
          <span class="initial">┄ Prior initial p₀ <b>fixe</b></span>
          <span class="before">━ Avant : p<sub>{{ k - 1 }}</sub></span>
          <span class="likelihood">━ Vraisemblance</span>
          <span class="after" :class="{ muted: !showPosterior }">━ Après : p<sub>{{ k }}</sub></span>
        </div>
        <svg viewBox="0 0 508 245" role="img" :aria-label="`Mise à jour ${k} : prior initial fixe, croyance avant la mesure, vraisemblance et posterior à l’étape Fusionner.`">
          <text x="38" y="12" class="axis-label">Densité · échelles fixes</text>
          <g v-for="tick in [0, 0.5, 1, 1.5, 2]" :key="`y${tick}`">
            <line :x1="plot.left" :x2="plot.right" :y1="wy(tick)" :y2="wy(tick)" stroke="#e2e8f0" />
            <text :x="plot.left - 7" :y="wy(tick) + 3" text-anchor="end" class="tick">{{ String(tick).replace('.', ',') }}</text>
          </g>
          <line :x1="plot.left" :x2="plot.left" :y1="plot.top" :y2="plot.bottom" stroke="#94a3b8" />
          <line :x1="plot.left" :x2="plot.right" :y1="plot.bottom" :y2="plot.bottom" stroke="#94a3b8" />
          <g v-for="tick in [-12, -8, -4, 0, 4, 8, 12]" :key="`x${tick}`">
            <line :x1="wx(tick)" :x2="wx(tick)" :y1="plot.bottom" :y2="plot.bottom + 4" stroke="#94a3b8" />
            <text :x="wx(tick)" :y="plot.bottom + 16" text-anchor="middle" class="tick">{{ tick }}</text>
          </g>
          <text x="265" y="243" text-anchor="middle" class="axis-label">Position x (m)</text>
          <polyline data-curve="before" :points="beforePoints" fill="none" stroke="#0369a1" stroke-width="2.5" />
          <polyline data-curve="initial" :points="initialPoints" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5 4" />
          <g :key="`measurement-${k}`" class="bua-reveal">
            <line :x1="wx(currentMeasurement.value)" :x2="wx(currentMeasurement.value)" :y1="plot.top + 12" :y2="plot.bottom" stroke="#ea580c" stroke-dasharray="3 4" opacity="0.5" />
            <text :x="wx(currentMeasurement.value)" :y="plot.top + 7" text-anchor="middle" style="fill: #c2410c; font-size: 11px">z<tspan baseline-shift="sub" style="font-size: 8px">{{ k }}</tspan> = {{ format(currentMeasurement.value) }}</text>
            <polyline data-curve="likelihood" :points="likelihoodPoints" fill="none" stroke="#ea580c" stroke-width="2.5" />
          </g>
          <g v-if="showPosterior" class="bua-reveal">
            <polygon :points="`${plot.left},${plot.bottom} ${afterPoints} ${plot.right},${plot.bottom}`" fill="#CF1C24" opacity="0.09" />
            <polyline data-curve="after" :points="afterPoints" fill="none" stroke="#CF1C24" stroke-width="3" />
          </g>
        </svg>
        <div class="bua-history" aria-live="polite">
          <b>{{ measurements.length }} mesure{{ measurements.length > 1 ? 's' : '' }} intégrée{{ measurements.length > 1 ? 's' : '' }}</b>
          <span v-for="entry in history" :key="entry.index">{{ entry.index ? '→' : 'σ₀ =' }} {{ format(entry.sigma) }}</span>
        </div>
      </div>

      <div class="bua-explanation">
        <div class="bua-equation" v-html="bayesFormula" />
        <div class="bua-values">
          <div class="before">Avant z<sub>{{ k }}</sub><strong>μ = {{ format(before.mean) }} · σ = {{ format(Math.sqrt(before.variance)) }}</strong></div>
          <div class="likelihood">Mesure z<sub>{{ k }}</sub><strong>z = {{ format(currentMeasurement.value) }} · σ<sub>z</sub> = {{ format(currentMeasurement.sigma) }}</strong></div>
        </div>
        <div class="bua-stage-copy" aria-live="polite">
          <template v-if="phase === 'observe'">
            <b>1. Une mesure à examiner</b>
            <p>L’orange montre quels x rendent z<sub>{{ k }}</sub> plausible. La mesure n’est pas encore intégrée.</p>
            <p v-if="k === 1">Au départ, p₀ est aussi le prior de cette mise à jour : les deux courbes bleues se superposent.</p>
            <p v-else>Le prior de cette mise à jour est p<sub>{{ k - 1 }}</sub>, le posterior précédent. Le prior initial p₀ reste fixe.</p>
          </template>
          <template v-else>
            <b>{{ phase === 'fuse' ? '2. Multiplier, puis normaliser' : '3. Une seule mesure intégrée' }}</b>
            <div class="bua-update-math" v-html="meanFormula" />
            <div class="bua-gain"><span v-html="gainFormula" /> = {{ format(gain) }}</div>
            <div class="bua-result">μ<sub>{{ k }}</sub> = {{ format(after.mean) }} <span>σ<sub>{{ k }}</sub> = {{ format(Math.sqrt(after.variance)) }}</span></div>
            <p v-if="phase === 'fuse'">Le poids de la mesure est {{ Math.round(gain * 100) }} %. Plus elle est précise, plus elle attire la moyenne.</p>
            <p v-else>p<sub>{{ k }}</sub> deviendra le prior de la prochaine mise à jour. p₀ reste la référence initiale.</p>
          </template>
        </div>
        <div class="bua-precision"><span v-html="varianceFormula" /><small>Les précisions s’additionnent.</small></div>
      </div>
    </div>

    <div class="bua-controls">
      <label :class="{ locked: initialLocked }">μ₀ <b>{{ format(muInitial) }}</b><input v-model.number="muInitial" aria-label="Moyenne du prior initial" type="range" min="-4" max="4" step="0.1" :disabled="initialLocked" /></label>
      <label :class="{ locked: initialLocked }">σ₀ <b>{{ format(sigmaInitial) }}</b><input v-model.number="sigmaInitial" aria-label="Écart-type du prior initial" type="range" min="0.5" max="3" step="0.1" :disabled="initialLocked" /></label>
      <label class="likelihood" :class="{ locked: measurementLocked }"><span>z<sub>{{ k }}</sub></span> <b>{{ format(z) }}</b><input v-model.number="z" aria-label="Valeur de la nouvelle mesure" type="range" min="-4" max="4" step="0.1" :disabled="measurementLocked" /></label>
      <label class="likelihood" :class="{ locked: measurementLocked }"><span>σ<sub>z</sub></span> <b>{{ format(sigmaZ) }}</b><input v-model.number="sigmaZ" aria-label="Écart-type de la nouvelle mesure" type="range" min="0.5" max="2" step="0.1" :disabled="measurementLocked" /></label>
    </div>
    <div class="bua-actions">
      <button class="primary" :disabled="playing || finished" @click="advance">{{ finished ? 'Série terminée (6 mesures)' : nextLabel }} <span v-if="!finished">→</span></button>
      <button :disabled="finished" :aria-pressed="playing" @click="togglePlay">{{ playing ? 'Ⅱ Pause' : '▶ Lecture' }}</button>
      <button @click="reset">↺ Réinitialiser</button>
      <span>{{ phase === 'observe' ? 'Régler la mesure, puis avancer.' : 'Valeurs figées pour cette mise à jour.' }}</span>
    </div>
    <div class="bua-note">Chaque cycle suppose une nouvelle observation indépendante, même si z est identique. Réutiliser la même observation compterait deux fois l’information.</div>
  </div>
</template>

<style scoped>
.bua-wrap { width: 100%; color: #334155; font-size: 12px; line-height: 1.3; }
.bua-model { color: #475569; margin-bottom: 7px; font-size: 12px; }
.bua-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 8px; }
.bua-steps > div { display: flex; align-items: center; gap: 7px; padding: 6px 9px; border-radius: 5px; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; font-weight: 700; }
.bua-steps > div.active { background: #fff1f2; color: #b91c1c; border-color: #fca5a5; }
.bua-steps > div.done { color: #0369a1; }
.bua-steps span { display: grid; place-items: center; border: 1px solid currentColor; width: 19px; height: 19px; border-radius: 50%; }
.bua-steps small { font-size: 10px; font-weight: 400; margin-left: auto; }
.bua-main { display: grid; grid-template-columns: 58% 1fr; gap: 12px; }
.bua-chart, .bua-explanation { min-width: 0; }
.bua-chart { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 5px; }
.bua-legend { display: flex; flex-wrap: wrap; gap: 3px 12px; padding: 0 5px; font-size: 10px; }
.initial { color: #0284c7; }
.before { color: #0369a1; }
.likelihood { color: #c2410c; }
.after { color: #CF1C24; }
.muted { opacity: 0.35; }
.bua-chart svg { display: block; width: 100%; height: 231px; overflow: visible; }
.tick, .axis-label { fill: #64748b; font-size: 10px; }
.bua-history { display: flex; align-items: center; gap: 5px; padding: 5px 6px 0; font-size: 10px; white-space: nowrap; }
.bua-history b { margin-right: 4px; }
.bua-equation { text-align: center; padding: 3px 0 9px; font-size: 12px; }
.bua-values { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; }
.bua-values > div { padding: 6px; border-radius: 4px; background: #f0f9ff; }
.bua-values > div.likelihood { background: #fff7ed; }
.bua-values strong { display: block; margin-top: 3px; font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.bua-stage-copy { height: 166px; padding: 9px 0 0; }
.bua-stage-copy > b { color: #334155; }
.bua-stage-copy p { font-size: 12px; line-height: 1.4; margin: 7px 0 0; }
.bua-update-math { margin: 6px 0; font-size: 12px; }
.bua-gain { font-size: 11px; }
.bua-result { color: #b91c1c; background: #fff1f2; border-radius: 4px; padding: 5px 8px; margin-top: 7px; font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }
.bua-result span { margin-left: 22px; }
.bua-precision { display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 11px; }
.bua-precision small { font-size: 10px; max-width: 105px; }
.bua-controls { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 8px; }
.bua-controls label { display: flex; align-items: center; gap: 5px; color: #0369a1; font-size: 11px; white-space: nowrap; }
.bua-controls label.likelihood { color: #c2410c; }
.bua-controls b { min-width: 29px; font-variant-numeric: tabular-nums; }
.bua-controls input { flex: 1; min-width: 0; width: 80px; height: 5px; accent-color: #0369a1; }
.bua-controls .likelihood input { accent-color: #ea580c; }
.bua-controls .locked { opacity: 0.5; }
.bua-actions { display: flex; align-items: center; gap: 7px; margin-top: 9px; }
.bua-actions button { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 5px; padding: 6px 10px; font-size: 11px; cursor: pointer; font-weight: 600; }
.bua-actions button.primary { background: #CF1C24; color: white; border-color: #CF1C24; min-width: 188px; }
.bua-actions button:hover:not(:disabled) { filter: brightness(0.94); }
.bua-actions button:disabled { opacity: 0.5; cursor: default; }
.bua-actions button:focus-visible, .bua-controls input:focus-visible { outline: 2px solid #0369a1; outline-offset: 3px; }
.bua-actions > span { margin-left: auto; color: #64748b; font-size: 10px; }
.bua-note { color: #64748b; font-size: 10px; margin-top: 6px; }
.bua-reveal { animation: bua-appear 650ms ease-out both; }
@keyframes bua-appear { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .bua-reveal { animation: none; } }
</style>
