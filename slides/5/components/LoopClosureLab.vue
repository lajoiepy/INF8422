<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {loopTruth, loopBefore, loopConstraint, loopMetrics, optimizeLoop, interpolateLoop, type LoopAssociation} from '../utils/loopClosure'
import {usePlayback} from '../utils/usePlayback'
import type {Pose} from '../utils/learningMath'

const association = ref<LoopAssociation>('correct')
const runs = {correct: optimizeLoop('correct'), wrong: optimizeLoop('wrong')}
const run = computed(() => runs[association.value])
const progress = ref(0)
const lastStep = computed(() => run.value.snapshots.length - 1)
const complete = computed(() => progress.value >= lastStep.value)
const poses = computed(() => {
  const i = Math.min(Math.floor(progress.value), lastStep.value)
  return interpolateLoop(run.value.snapshots[i], run.value.snapshots[Math.min(i + 1, lastStep.value)], progress.value - i)
})
const constraint = computed(() => loopConstraint(association.value))
const metrics = computed(() => loopMetrics(poses.value, association.value))
const initialMetrics = computed(() => loopMetrics(loopBefore, association.value))
const good = computed(() => association.value === 'correct')
const closureColor = computed(() => good.value ? '#218638' : '#cf1c24')
const {playing} = usePlayback(() => {
  progress.value = Math.min(lastStep.value, progress.value + .05)
  return !complete.value
}, 35)
watch(association, () => {playing.value = false; progress.value = 0})
function optimize() {
  if (playing.value) {playing.value = false; return}
  if (complete.value) progress.value = 0
  playing.value = true
}
const status = computed(() => complete.value ? 'Optimisation terminée' : progress.value > 0 ? `Itération ${Math.min(Math.ceil(progress.value), lastStep.value)} / ${lastStep.value}` : 'Graphe non optimisé')
const button = computed(() => playing.value ? 'Pause' : complete.value ? 'Rejouer' : progress.value > 0 ? 'Reprendre' : 'Optimiser')
const format = (value: number, digits = 2) => value.toFixed(digits).replace('.', ',')
const subscripts = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉','₁₀']
const label = (index: number) => 'T' + subscripts[index]

// One metric scale and fixed bounds across both cases and all animation frames.
const boundsPoses = [...loopTruth, ...loopBefore, ...runs.correct.snapshots.flat(), ...runs.wrong.snapshots.flat()]
const minX = Math.min(...boundsPoses.map(p => p[0])), maxX = Math.max(...boundsPoses.map(p => p[0]))
const minY = Math.min(...boundsPoses.map(p => p[1])), maxY = Math.max(...boundsPoses.map(p => p[1]))
const scale = Math.min(455 / (maxX - minX), 181 / (maxY - minY))
const offsetX = (550 - (maxX - minX) * scale) / 2
const x = (v: number) => offsetX + (v - minX) * scale
const y = (v: number) => 24 + (maxY - v) * scale
const path = (ps: Pose[]) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(p[0])},${y(p[1])}`).join(' ')
const closure = computed(() => {
  const a = poses.value[constraint.value.from], b = poses.value[constraint.value.to]
  const ax = x(a[0]), ay = y(a[1]), bx = x(b[0]), by = y(b[1])
  const cx = (ax + bx) / 2 - 30, cy = (ay + by) / 2 - 37
  return {d: `M${ax},${ay} Q${cx},${cy} ${bx},${by}`, fx: .25 * ax + .5 * cx + .25 * bx, fy: .25 * ay + .5 * cy + .25 * by}
})
const labelOffset = (index: number) => index === 10 ? (good.value ? [12, 25] : [18, 6]) : index <= 2 ? [-10, 22] : [10, -11]
const message = computed(() => {
  if (!progress.value) return good.value ? 'Même entrée A : la bonne fermeture est prête. Cliquer sur Optimiser.' : 'Entrées A et B confondues : la fausse fermeture est prête. Cliquer sur Optimiser.'
  if (!complete.value) return 'Les poses se déplacent pour satisfaire l’odométrie et la fermeture de boucle.'
  return good.value ? 'La bonne fermeture corrige la dérive : l’estimation se rapproche du trajet réel.' : 'Le coût baisse, mais le graphe se replie : optimiser ne valide pas l’association !'
})
</script>

<template>
  <div class="loop-lab" data-testid="loop-closure-state" :data-progress="progress" :data-playing="playing" :data-complete="complete" :data-target="constraint.from" :data-rmse="metrics.positionRmse" :data-cost="metrics.cost">
    <div class="loop-controls">
      <label>Reconnaissance de lieux
        <select v-model="association" aria-label="Association de fermeture">
          <option value="correct">Bonne association · T₁₀ ↔ T₂</option>
          <option value="wrong">Erreur de reconnaissance · T₁₀ ↔ T₆</option>
        </select>
      </label>
      <button class="primary" @click="optimize">{{ button }}</button>
      <span class="loop-status">{{ status }}</span>
    </div>

    <div class="loop-main">
      <svg class="lab-svg loop-plot" viewBox="0 0 550 245" role="img" aria-label="Trajet réel, odométrie avec dérive et poses du graphe ; la fermeture relie la dernière pose à la troisième pose ou à un lieu incorrect.">
        <path :d="path(loopTruth)" stroke="#b9c5d1" stroke-width="6" fill="none" />
        <path :d="path(loopBefore)" stroke="#d96b21" stroke-width="2.5" stroke-dasharray="6 4" fill="none" />
        <path :d="path(poses)" stroke="#087fa1" stroke-width="2.7" fill="none" data-testid="loop-estimated-path" />
        <path :d="closure.d" :stroke="closureColor" stroke-width="2.5" fill="none" data-testid="loop-edge" :data-from="constraint.from" :data-to="constraint.to" />
        <rect :x="closure.fx - 5" :y="closure.fy - 5" width="10" height="10" :fill="closureColor" />
        <g v-for="(pose, index) in poses" :key="index" :data-loop-pose="index">
          <circle v-if="index === constraint.from || index === constraint.to" :cx="x(pose[0])" :cy="y(pose[1])" r="11" fill="white" :stroke="closureColor" stroke-width="2.5" />
          <line :x1="x(pose[0])" :y1="y(pose[1])" :x2="x(pose[0]) + 16 * Math.cos(pose[2])" :y2="y(pose[1]) - 16 * Math.sin(pose[2])" :stroke="index ? '#087fa1' : '#333'" stroke-width="2" />
          <circle :cx="x(pose[0])" :cy="y(pose[1])" r="5.5" :fill="index ? '#087fa1' : '#333'" />
          <text :x="x(pose[0]) + labelOffset(index)[0]" :y="y(pose[1]) + labelOffset(index)[1]" :text-anchor="index <= 2 ? 'end' : 'start'" class="pose-label">{{label(index)}}</text>
        </g>
        <text x="12" y="238" class="graph-note">T₀ fixé · orientations indiquées par les traits · même échelle dans les deux cas</text>
      </svg>

      <div class="loop-readout">
        <div class="loop-pair-title">{{label(10)}} retrouve {{label(constraint.from)}} ?</div>
        <div class="loop-views">
          <figure v-for="view in ['query', 'reference']" :key="view">
            <svg viewBox="0 0 140 72" role="img" :aria-label="view === 'query' ? 'Vue courante schématique de l’entrée A' : good ? 'Vue ancienne de la même entrée A' : 'Vue ancienne d’une autre entrée B ressemblante'">
              <rect width="140" height="72" fill="#e5edf4" />
              <path d="M0 56L70 48L140 56V72H0Z" fill="#c2cbd4" />
              <rect x="15" y="7" width="110" height="51" rx="2" fill="#d1c1a9" />
              <rect x="57" y="28" width="27" height="30" fill="#296187" />
              <path d="M52 28H89L86 22H55Z" fill="#a74f3c" />
              <rect v-for="wx in [25, 95]" :key="wx" :x="wx" y="17" width="19" height="20" fill="#567e97" stroke="#f8fafc" stroke-width="2" />
              <circle cx="79" cy="45" r="1.5" fill="white" />
              <text x="70" y="18" text-anchor="middle" style="fill:#334155;font-size:8px">{{view === 'reference' && !good ? '48' : '12'}}</text>
            </svg>
            <figcaption>{{view === 'query' ? 'Requête : entrée A' : good ? 'Référence : entrée A' : 'Référence : entrée B'}}</figcaption>
          </figure>
        </div>
        <p class="association-explanation" :class="{wrong: !good}">{{good ? 'Même lieu, deux passages.' : 'Deux lieux distincts, façades semblables.'}}</p>
        <div class="loop-numbers">
          <p>Écart au trajet réel <b>{{format(initialMetrics.positionRmse)}} → {{format(metrics.positionRmse)}} m</b></p>
          <p>Coût du graphe <b>{{format(initialMetrics.cost, 1)}} → {{format(metrics.cost, 1)}}</b></p>
        </div>
        <p class="loop-assumptions">RMSE des positions · simulation SE(2)<br>Fermeture fortement pondérée · perte quadratique</p>
      </div>
    </div>

    <div class="loop-legend"><span><i class="truth" /> Trajet réel</span><span><i class="odometry" /> Odométrie initiale</span><span><i class="estimate" /> Poses estimées</span><span><i :style="{borderColor: closureColor}" /> Fermeture {{label(constraint.from)}} ↔ T₁₀</span></div>
    <p class="loop-message" :class="{wrong: !good}" data-testid="loop-message">{{message}}</p>
  </div>
</template>

<style scoped>
.loop-lab {font-size:14px;color:#334155;}
.loop-controls {display:flex;align-items:center;gap:12px;min-height:30px;}
.loop-controls label {display:flex;gap:8px;align-items:center;}
.loop-controls select {max-width:310px;}
.loop-controls button {min-width:84px;}
.loop-status {margin-left:auto;font-size:12px;font-variant-numeric:tabular-nums;}
.loop-main {display:grid;grid-template-columns:1.7fr 1fr;gap:12px;margin-top:5px;}
.loop-lab .loop-plot {height:235px;width:100%;}
.loop-lab .pose-label {font-size:14px;font-weight:650;paint-order:stroke;stroke:#f8fafc;stroke-width:3px;}
.loop-lab .graph-note {font-size:11px;fill:#64748b;}
.loop-readout {background:white;border:1px solid #d8e0e8;border-radius:5px;padding:7px 9px;height:235px;box-sizing:border-box;}
.loop-pair-title {font-size:15px;font-weight:700;line-height:20px;}
.loop-views {display:flex;gap:7px;margin-top:5px;}
.loop-views figure {flex:1;margin:0;min-width:0;}
.loop-views svg {display:block;width:100%;height:57px;}
.loop-views figcaption {font-size:11px;text-align:center;line-height:16px;white-space:nowrap;}
.loop-lab p.association-explanation {font-size:12px;line-height:1.25;color:#218638;margin:4px 0 7px;}
.loop-lab p.association-explanation.wrong {color:#b31b22;}
.loop-numbers p {display:flex;justify-content:space-between;gap:4px;font-size:12px;margin:4px 0;line-height:1.4;}
.loop-numbers b {color:#087fa1;font-variant-numeric:tabular-nums;white-space:nowrap;}
.loop-lab p.loop-assumptions {font-size:10.5px;color:#64748b;line-height:1.4;margin:8px 0 0;}
.loop-legend {display:flex;gap:17px;align-items:center;font-size:12px;height:22px;}
.loop-legend span {display:flex;gap:6px;align-items:center;}
.loop-legend i {display:inline-block;width:17px;border-top:3px solid;}
.loop-legend .truth {border-color:#b9c5d1;}
.loop-legend .odometry {border-color:#d96b21;border-top-style:dashed;}
.loop-legend .estimate {border-color:#087fa1;}
.loop-lab p.loop-message {font-size:13px;line-height:1.3;border-left:3px solid #218638;background:#eff8f1;padding:5px 9px;margin:3px 0 0;}
.loop-lab p.loop-message.wrong {border-left-color:#cf1c24;background:#fff1f1;}
</style>
