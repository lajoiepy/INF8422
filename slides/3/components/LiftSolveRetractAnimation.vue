<script setup lang="ts">
import { computed, onScopeDispose, ref, useId } from 'vue'
import { onSlideLeave } from '@slidev/client'
import katex from 'katex'
import { addScaled, cost, helix, project, retract, solveStep, target, type Vec3 } from './liftSolveRetractMath'

const stage = ref(0)
const initial = ref(-0.65)
const base = ref(initial.value)
const iteration = ref(0)
const progress = ref(1)
const playing = ref(false)
const history = ref<number[]>([])
const yaw = ref(1.1)
const elevation = ref(0.5)
const steps = ['Le problème', '① Lift · linéariser', '② Solve · calculer', '③ Retract · revenir']
const id = 'lsr-' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
const model = computed(() => solveStep(base.value))
const currentCost = computed(() => cost(base.value))
const nextCost = computed(() => cost(model.value.nextT))
const converged = computed(() => Math.abs(model.value.delta) < 1e-6)
const format = (v: number, digits = 3) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits)
const math = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: true })
const formulas = {
  curve: math('q(t)=\\begin{bmatrix}\\cos t\\\\\\sin t\\\\0.35t\\end{bmatrix},\\quad x_k=q(t_k)'),
  objective: math('\\min_t F(t)=\\tfrac12\\|q(t)-z\\|^2'),
  lift: math('q(t_k+\\delta)\\approx x_k+J_k\\delta'),
  jacobian: math('J_k=q\\prime(t_k)=\\begin{bmatrix}-\\sin t_k\\\\\\cos t_k\\\\0.35\\end{bmatrix}\\in\\mathbb R^{3\\times1}'),
  local: math('\\min_\\delta\\;\\tfrac12\\|r_k+J_k\\delta\\|^2'),
  solve: math('\\underbrace{(J_k^\\top J_k)}_{\\text{scalaire}}\\delta^*=-J_k^\\top r_k'),
  retract: math('x_{k+1}=\\mathcal R_{x_k}(J_k\\delta^*)=q(t_k+\\delta^*)'),
}
const numericSolve = computed(() => math('\\delta^*\\approx-\\frac{' + format(model.value.gradient) + '}{' + format(model.value.hessian, 4) + '}\\approx' + format(model.value.delta)))
let frame: number | undefined
let start: number | undefined
function pause() {
  if (frame !== undefined) cancelAnimationFrame(frame)
  frame = undefined
  start = undefined
  playing.value = false
}
function selectStage(index: number) {
  pause()
  stage.value = index
  progress.value = 1
}
function applyStep() {
  if (stage.value !== 3 || playing.value || progress.value < 1 || converged.value) return
  history.value.push(base.value)
  base.value = model.value.nextT
  iteration.value++
  selectStage(1)
}
function next() {
  if (stage.value < 3) selectStage(stage.value + 1)
  else if (progress.value < 1) selectStage(3)
  else applyStep()
}
function reset() {
  pause()
  base.value = initial.value
  iteration.value = 0
  history.value = []
  stage.value = 0
  progress.value = 1
}
function play() {
  if (playing.value) { pause(); return }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { selectStage(3); return }
  pause()
  playing.value = true
  stage.value = 1
  progress.value = 0
  function tick(time: number) {
    if (start === undefined) start = time
    const elapsed = time - start
    stage.value = Math.min(3, Math.floor(elapsed / 2600) + 1)
    progress.value = Math.min(1, (elapsed % 2600) / 1500)
    if (elapsed >= 7800) { stage.value = 3; progress.value = 1; pause() }
    else frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}
// Do not leave a queued update running after navigation or reset.
onSlideLeave(pause)
onScopeDispose(pause)

const camera = (p: Vec3) => project(p, yaw.value, elevation.value)
const point = computed(() => camera(model.value.x))
const goal = computed(() => camera(target))
const solveProgress = computed(() => stage.value === 2 ? progress.value : 1)
const trial = computed(() => camera(addScaled(model.value.x, model.value.J, model.value.delta * solveProgress.value)))
const retracted = computed(() => camera(retract(base.value, model.value.delta * (stage.value === 3 ? progress.value : 1))))
const curveSegments = computed(() => Array.from({ length: 180 }, (_, i) => {
  const a = camera(helix(-2.2 + 5.6 * i / 180)), b = camera(helix(-2.2 + 5.6 * (i + 1) / 180))
  return { a, b, depth: (a.depth + b.depth) / 2 }
}).sort((a, b) => a.depth - b.depth))
const tangentEnds = computed(() => {
  const extent = stage.value === 1 ? progress.value : 1
  return [-1.45, 1.45].map(d => camera(addScaled(model.value.x, model.value.J, d * extent)))
})
const tangentLabel = computed(() => {
  const marks = [point.value, goal.value, trial.value, retracted.value]
  const distance = (p: { x: number; y: number }) => Math.min(...marks.map(m => Math.hypot(p.x - m.x, p.y - m.y)))
  const p = [...tangentEnds.value].sort((a, b) => distance(b) - distance(a))[0]
  return { x: Math.max(12, Math.min(360, p.x + 5)), y: Math.max(20, Math.min(310, p.y - 10)) }
})
const arc = computed(() => Array.from({ length: 61 }, (_, i) => {
  const p = camera(retract(base.value, model.value.delta * progress.value * i / 60))
  return p.x + ',' + p.y
}).join(' '))
const floor = computed(() => Array.from({ length: 7 }, (_, i) => {
  const s = -1.5 + i * 0.5
  return [
    [camera([s, -1.5, -1.05]), camera([s, 1.5, -1.05])],
    [camera([-1.5, s, -1.05]), camera([1.5, s, -1.05])],
  ]
}).flat())
const axes = computed(() => {
  // Fixed-position orientation triad: same camera, away from the teaching markers.
  const directions: Vec3[] = [[.5, 0, 0], [0, .5, 0], [0, 0, .5]]
  const origin = camera([0, 0, 0])
  return directions.map((v, i) => {
    const p = camera(v)
    return { name: ['x₁', 'x₂', 'x₃'][i], from: { x: 60, y: 280 }, to: { x: 60 + p.x - origin.x, y: 280 + p.y - origin.y } }
  })
})
const footprints = computed(() => [model.value.x, target].map(p => [camera(p), camera([p[0], p[1], -1.05])]))
let drag: { x: number; y: number; yaw: number; elevation: number } | undefined
function pointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  drag = { x: event.clientX, y: event.clientY, yaw: yaw.value, elevation: elevation.value }
  ;(event.currentTarget as SVGElement).setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (!drag) return
  yaw.value = drag.yaw + (event.clientX - drag.x) * 0.008
  elevation.value = Math.max(0.2, Math.min(1.1, drag.elevation + (event.clientY - drag.y) * 0.006))
}
function pointerUp() { drag = undefined }
function resetView() { yaw.value = 1.1; elevation.value = 0.5 }
function rotateKey(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') yaw.value -= 0.12
  else if (event.key === 'ArrowRight') yaw.value += 0.12
  else if (event.key === 'ArrowUp') elevation.value = Math.min(1.1, elevation.value + 0.08)
  else if (event.key === 'ArrowDown') elevation.value = Math.max(0.2, elevation.value - 0.08)
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="lsr-wrap" @click.stop @keydown.stop>
    <div class="lsr-steps" aria-label="Étapes de l’optimisation">
      <button v-for="(label, index) in steps" :key="label" :class="{ active: stage === index }"
        :aria-current="stage === index ? 'step' : undefined" @click="selectStage(index)">{{ label }}</button>
    </div>
    <div class="lsr-main">
      <div class="lsr-scene">
        <div class="lsr-scene-title">Une courbe 1D dans ℝ³ <span>Glisser pour tourner · touches fléchées</span></div>
        <svg viewBox="0 0 490 330" tabindex="0" role="img" aria-label="Hélice 3D : point courant, tangente, pas linéaire et rétraction. Glisser ou utiliser les flèches pour tourner la vue."
          @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @lostpointercapture="pointerUp" @keydown="rotateKey">
          <defs>
            <marker :id="id + '-arrow'" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#ea580c" /></marker>
          </defs>
          <g aria-hidden="true">
            <line v-for="(line, i) in floor" :key="'f' + i" :x1="line[0].x" :y1="line[0].y" :x2="line[1].x" :y2="line[1].y" stroke="#e2e8f0" stroke-width="0.8" />
            <g v-for="axis in axes" :key="axis.name">
              <line :x1="axis.from.x" :y1="axis.from.y" :x2="axis.to.x" :y2="axis.to.y" stroke="#94a3b8" stroke-width="1.6" />
              <text :x="axis.to.x + 4" :y="axis.to.y - 4" class="lsr-axis">{{ axis.name }}</text>
            </g>
            <line v-for="(line, i) in footprints" :key="'foot' + i" :x1="line[0].x" :y1="line[0].y" :x2="line[1].x" :y2="line[1].y" stroke="#cbd5e1" stroke-dasharray="3 4" />
          </g>
          <line v-for="(s, i) in curveSegments" :key="'c' + i" :x1="s.a.x" :y1="s.a.y" :x2="s.b.x" :y2="s.b.y"
            stroke="#475569" :stroke-opacity="0.65 + 0.18 * s.depth" stroke-width="3.3" stroke-linecap="round" />
          <circle v-for="(t, i) in history" :key="'h' + i" :cx="camera(helix(t)).x" :cy="camera(helix(t)).y" r="3" fill="#94a3b8" stroke="white" />
          <g v-if="stage >= 1" data-mark="tangent">
            <line :x1="tangentEnds[0].x" :y1="tangentEnds[0].y" :x2="tangentEnds[1].x" :y2="tangentEnds[1].y" stroke="#0284c7" stroke-width="2" stroke-dasharray="6 4" />
            <text :x="tangentLabel.x" :y="tangentLabel.y" class="lsr-label" fill="#0369a1">droite tangente</text>
          </g>
          <g v-if="stage >= 2 && !converged" data-mark="trial">
            <line :x1="point.x" :y1="point.y" :x2="trial.x" :y2="trial.y" stroke="#ea580c" stroke-width="3" :marker-end="'url(#' + id + '-arrow)'" />
            <circle :cx="trial.x" :cy="trial.y" r="5" fill="white" stroke="#ea580c" stroke-width="2.5" />
            <text :x="trial.x + 8" :y="trial.y + 19" class="lsr-label" fill="#c2410c">xₖ + Jₖδ*</text>
          </g>
          <g v-if="stage === 3 && !converged" data-mark="retracted">
            <polyline :points="arc" fill="none" stroke="#16a34a" stroke-width="4" stroke-linecap="round" />
            <line :x1="trial.x" :y1="trial.y" :x2="retracted.x" :y2="retracted.y" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="3 4" />
            <circle :cx="retracted.x" :cy="retracted.y" r="6" fill="#16a34a" stroke="white" stroke-width="2" />
            <text :x="retracted.x - 8" :y="retracted.y - 13" text-anchor="end" class="lsr-label" fill="#15803d">{{ progress < 1 ? 'rétraction…' : 'xₖ₊₁' }}</text>
          </g>
          <g data-mark="target">
            <path :d="'M' + (goal.x - 6) + ',' + (goal.y - 6) + 'L' + (goal.x + 6) + ',' + (goal.y + 6) + 'M' + (goal.x - 6) + ',' + (goal.y + 6) + 'L' + (goal.x + 6) + ',' + (goal.y - 6)" stroke="#9333ea" stroke-width="3" />
            <text v-if="!converged" :x="goal.x - 9" :y="goal.y + 19" text-anchor="end" class="lsr-label" fill="#7e22ce">cible z</text>
          </g>
          <circle data-mark="current" :cx="point.x" :cy="point.y" r="6" fill="#0284c7" stroke="white" stroke-width="2" />
          <text :x="point.x + 9" :y="point.y - 11" class="lsr-label" fill="#0369a1">{{ converged ? 'xₖ ≈ z' : 'xₖ' }}</text>
        </svg>
        <div class="lsr-legend"><span>━ Hélice</span><span class="blue">● État courant</span><span class="orange">○ Hors courbe</span><span class="green">● Rétraction</span></div>
        <div class="lsr-stats"><span>Itération <b>{{ iteration }}</b></span><span>F(xₖ) = <b>{{ format(currentCost, 4) }}</b></span><span v-if="stage === 3">{{ progress < 1 ? 'F(point vert)' : 'F(xₖ₊₁)' }} = <b class="green">{{ format(cost(base + model.delta * progress), 4) }}</b></span></div>
      </div>
      <div class="lsr-explanation" aria-live="polite">
        <template v-if="stage === 0">
          <h3>Un état contraint à rester sur l’hélice</h3>
          <div class="lsr-equation" v-html="formulas.curve" />
          <p>La position x a <b>3 coordonnées</b>, mais un seul degré de liberté : le paramètre <b>t</b>.</p>
          <div class="lsr-equation" v-html="formulas.objective" />
          <p>On cherche à rejoindre la cible violette <b>z = q(1,35)</b>, située sur la courbe.</p>
          <div class="lsr-note">Une droite tangente suffit : la dimension de l’espace tangent est <b>1, pas 3</b>.</div>
        </template>
        <template v-else-if="stage === 1">
          <h3>① Lift : écrire un problème local en δ</h3>
          <div class="lsr-equation" v-html="formulas.lift" />
          <div class="lsr-equation" v-html="formulas.jacobian" />
          <p><b>xₖ reste fixé.</b> Le scalaire δ déplace le point le long de la droite bleue ; <b>Jₖδ</b> est le vecteur tangent en 3D.</p>
          <div class="lsr-note blue">On linéarise le résidu : rₖ = xₖ − z,<br>puis r(tₖ + δ) ≈ rₖ + Jₖδ.</div>
        </template>
        <template v-else-if="stage === 2">
          <h3>② Solve : résoudre sur la droite tangente</h3>
          <div class="lsr-equation" v-html="formulas.local" />
          <div class="lsr-equation" v-html="formulas.solve" />
          <div class="lsr-equation orange" v-html="numericSolve" />
          <p>On calcule <b>δ*, un scalaire</b>, puis le déplacement 3D <b>Jₖδ*</b> (flèche orange).</p>
          <div v-if="!converged" class="lsr-note orange">Le point orange xₖ + Jₖδ* est généralement hors de l’hélice : <b>ce n’est pas encore un état valide.</b></div>
          <div v-else class="lsr-note green">Le pas est devenu négligeable : la cible est atteinte.</div>
        </template>
        <template v-else>
          <h3>③ Retract : construire un nouvel état valide</h3>
          <div class="lsr-equation lsr-retract-formula" v-html="formulas.retract" />
          <div class="lsr-numbers">tₖ₊₁ = {{ format(base) }} {{ model.delta < 0 ? '−' : '+' }} {{ format(Math.abs(model.delta)) }} = <b>{{ format(model.nextT) }}</b></div>
          <p>On applique le même δ* à la <b>paramétrisation exacte</b> : le point vert appartient à l’hélice.</p>
          <p>La liaison pointillée compare les deux résultats ; <b>ce n’est pas une projection orthogonale</b>.</p>
          <div class="lsr-note green">{{ converged ? 'Le pas est devenu négligeable : cible atteinte.' : 'Il reste à adopter xₖ₊₁, puis à recalculer la tangente avant le prochain pas.' }}</div>
        </template>
      </div>
    </div>
    <div class="lsr-controls">
      <button class="primary" @click="next" :disabled="playing || (stage === 3 && converged)">{{ stage < 3 ? 'Étape suivante →' : converged ? 'Convergé' : progress < 1 ? 'Terminer la rétraction →' : 'Appliquer → nouvelle tangente' }}</button>
      <button @click="play" :aria-pressed="playing">{{ playing ? 'Ⅱ Pause' : '▶ Lire les 3 étapes' }}</button>
      <button @click="reset">↺ Réinitialiser</button>
      <button @click="resetView">Vue initiale</button>
      <label>Départ t₀ <b>{{ format(initial, 2) }}</b><input v-model.number="initial" @input="reset" type="range" min="-1.2" max="2.5" step="0.05" aria-label="Point initial sur l’hélice" :disabled="playing" /></label>
    </div>
    <div class="lsr-takeaway">L’état reste sur la courbe. <b>On résout dans le tangent ; on met à jour sur la variété.</b></div>
  </div>
</template>

<style scoped>
.lsr-wrap { color:#334155; font-size:13px; line-height:1.4; }
.lsr-steps { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:10px; }
.lsr-wrap button { border:1px solid #cbd5e1; border-radius:6px; padding:6px 9px; font:inherit; cursor:pointer; background:white; }
.lsr-steps button { font-size:13px; font-weight:650; text-align:left; }
.lsr-steps button.active { background:#e0f2fe; border-color:#0284c7; color:#075985; }
.lsr-main { display:grid; grid-template-columns:54% minmax(0,1fr); gap:15px; }
.lsr-scene { border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; overflow:hidden; }
.lsr-scene-title { display:flex; justify-content:space-between; font-size:12px; padding:8px 10px 0; font-weight:650; }
.lsr-scene-title span { font-size:10px; color:#64748b; font-weight:400; }
.lsr-scene svg { display:block; width:100%; height:302px; touch-action:none; cursor:grab; }
.lsr-scene svg:active { cursor:grabbing; }
.lsr-axis { fill:#64748b; font:10px sans-serif; }
.lsr-label { font:11px sans-serif; font-weight:650; paint-order:stroke; stroke:#f8fafc; stroke-width:3px; stroke-linejoin:round; }
.lsr-legend { display:flex; justify-content:center; gap:14px; font-size:11px; margin:0 6px 8px; }
.blue { color:#0369a1; }
.orange { color:#c2410c; }
.green { color:#15803d; }
.lsr-stats { display:flex; justify-content:space-around; border-top:1px solid #e2e8f0; padding:6px; font-size:12px; background:white; }
.lsr-explanation { padding:5px 9px 0 0; min-width:0; }
.lsr-explanation h3 { font-size:16px; font-weight:700; margin:0 0 8px; color:#0f172a; }
.lsr-explanation p { font-size:14px; line-height:1.5; margin:10px 0 !important; }
.lsr-equation { font-size:15px; }
.lsr-equation :deep(.katex-display) { margin:10px 0; }
.lsr-retract-formula { font-size:13px; }
.lsr-note { border-left:3px solid #94a3b8; border-radius:3px; padding:9px 10px; background:#f1f5f9; font-size:13px; line-height:1.5; }
.lsr-note.blue { background:#eff6ff; border-color:#0284c7; }
.lsr-note.orange { background:#fff7ed; border-color:#ea580c; }
.lsr-note.green { background:#f0fdf4; border-color:#16a34a; }
.lsr-numbers { background:#f0fdf4; padding:10px; border-radius:5px; color:#15803d; font-size:14px; }
.lsr-controls { display:flex; align-items:center; gap:7px; margin-top:9px; font-size:12px; flex-wrap:wrap; }
.lsr-controls .primary { background:#CF1C24; border-color:#CF1C24; color:white; font-weight:650; }
.lsr-controls label { display:flex; gap:6px; align-items:center; margin-left:auto; }
.lsr-controls input { width:100px; accent-color:#0284c7; }
.lsr-wrap button:disabled { opacity:.45; cursor:default; }
.lsr-wrap button:focus-visible, .lsr-scene svg:focus-visible { outline:3px solid #0284c7; outline-offset:2px; }
.lsr-takeaway { text-align:center; font-size:12px; margin-top:9px; color:#475569; }
</style>
