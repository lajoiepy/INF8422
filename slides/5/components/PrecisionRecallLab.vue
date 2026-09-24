<script setup lang="ts">
import {computed, ref} from 'vue'
import sceneImage from '../images/precision-recall-street.png'
import {prSceneAnnotations, prScenePredictions, evaluateDetections, detectionPrecisionRecallCurve} from '../utils/detectionPrecisionRecall'
import {usePlayback} from '../utils/usePlayback'

const threshold = ref(.80), annotationsVisible = ref(true)
const result = computed(() => evaluateDetections(prScenePredictions, prSceneAnnotations, threshold.value))
const curve = detectionPrecisionRecallCurve(prScenePredictions, prSceneAnnotations)
const score = (v: number) => v.toFixed(2).replace('.', ',')
const percent = (v: number | null) => v === null ? '—' : (v * 100).toFixed(v === 1 || v === 0 ? 0 : 1).replace('.', ',') + ' %'
const x = (recall: number) => 47 + recall * 310
const y = (precision: number) => 175 - precision * 146
const pointString = (points: typeof curve) => points.map(p => `${x(p.recall ?? 0)},${y(p.precision ?? 0)}`).join(' ')
const activeIndex = computed(() => result.value.detections.length - 1)
const last = computed(() => result.value.detections.at(-1)?.id)
const currentPoint = computed(() => result.value.precision === null ? null : {x: x(result.value.recall ?? 0), y: y(result.value.precision)})
const missedIds = computed(() => new Set(result.value.missed.map(p => p.id)))
const levels = [1, ...curve.map(p => p.threshold)]
const explanations: Record<string, string> = {
  A: 'A retrouve le premier piéton : précision 100 %, rappel 33,3 %.',
  B: 'B prend le poteau pour un piéton : la précision baisse, le rappel reste à 33,3 %.',
  C: 'C retrouve un autre piéton : le rappel et la précision augmentent.',
  D: 'D est un doublon de A : un faux positif de plus, aucun nouveau piéton retrouvé.',
  E: 'E retrouve le dernier piéton : rappel 100 %, mais deux faux positifs restent présents.',
}
const explanation = computed(() => last.value ? explanations[last.value] : 'Aucune détection : rappel 0 %, précision non définie (0/0).')
const labelY = (id: string, box: number[]) => id === 'D' ? box[1] + box[3] + 12 : box[1] - 100
const color = (kind: string) => kind === 'tp' ? '#16803b' : '#bd4100'
function advance() {
  const next = levels.find(v => v < threshold.value - .00001)
  if (next === undefined) return false
  threshold.value = next
  return next > .4
}
const {playing} = usePlayback(advance, 1300)
function selectThreshold(value: number) {playing.value = false; threshold.value = value}
function togglePlayback() {
  if (playing.value) playing.value = false
  else {threshold.value = 1; playing.value = true}
}
</script>

<template>
  <div class="pr-lab">
    <div class="pr-controls">
      <label class="threshold-control">Seuil de score τ
        <input v-model.number="threshold" aria-label="Seuil de détection" type="range" min="0" max="1" step=".01" @input="playing = false" />
        <output data-testid="pr-threshold">{{ score(threshold) }}</output>
      </label>
      <button @click="togglePlayback">{{ playing ? 'Pause' : 'Balayer le seuil' }}</button>
      <label><input v-model="annotationsVisible" aria-label="Afficher les annotations" type="checkbox" /> Annotations</label>
      <span>IoU d’évaluation ≥ 0,50</span>
    </div>

    <div class="pr-panels">
      <div class="pr-image-panel">
        <div class="pr-panel-title">Image : {{ result.detections.length }} détection(s) retenue(s)</div>
        <svg class="lab-svg pr-scene" viewBox="0 0 1536 1024" role="img" aria-label="Image de trois piétons avec annotations et détections retenues au seuil courant.">
          <image :href="sceneImage" x="0" y="0" width="1536" height="1024" />
          <g v-if="annotationsVisible" class="pr-annotations">
            <g v-for="annotation in prSceneAnnotations" :key="annotation.id">
              <rect :x="annotation.box[0]" :y="annotation.box[1]" :width="annotation.box[2]" :height="annotation.box[3]" fill="none" stroke="#e9f4ff" stroke-width="16" />
              <rect :x="annotation.box[0]" :y="annotation.box[1]" :width="annotation.box[2]" :height="annotation.box[3]" fill="none" stroke="#334dba" stroke-width="10" stroke-dasharray="22 15" />
              <g v-if="missedIds.has(annotation.id)">
                <rect :x="annotation.box[0] - 10" :y="annotation.box[1] + annotation.box[3] + 14" width="280" height="86" rx="9" fill="#334dba" />
                <text :x="annotation.box[0] + 4" :y="annotation.box[1] + annotation.box[3] + 76" class="box-label">{{ annotation.id }} : FN</text>
              </g>
            </g>
          </g>
          <g v-for="detection in result.detections" :key="detection.id" :data-prediction="detection.id" :data-kind="detection.kind">
            <rect :x="detection.box[0]" :y="detection.box[1]" :width="detection.box[2]" :height="detection.box[3]" fill="none" :stroke="color(detection.kind)" stroke-width="12" :stroke-dasharray="detection.kind === 'duplicate' ? '30 13' : undefined" />
            <rect :x="detection.box[0]" :y="labelY(detection.id, detection.box)" width="285" height="90" rx="8" :fill="color(detection.kind)" />
            <text :x="detection.box[0] + 13" :y="labelY(detection.id, detection.box) + 66" class="box-label">{{ detection.id }} {{ score(detection.score) }}</text>
          </g>
        </svg>
      </div>

      <div class="pr-curve-panel">
        <div class="pr-panel-title">Courbe précision–rappel : point au seuil courant</div>
        <svg class="lab-svg pr-plot" viewBox="0 0 395 225" role="group" aria-label="Courbe précision-rappel empirique. Changer le seuil sélectionne un des cinq points. Aucun point si aucune détection.">
          <g v-for="v in [0, .5, 1]" :key="'p' + v">
            <line x1="47" :y1="y(v)" x2="357" :y2="y(v)" stroke="#dce3eb" />
            <text x="39" :y="y(v) + 4" text-anchor="end" class="tick">{{ v * 100 }}</text>
          </g>
          <g v-for="v in [0, 1/3, 2/3, 1]" :key="'r' + v">
            <line :x1="x(v)" y1="29" :x2="x(v)" y2="175" stroke="#e8edf2" />
            <text :x="x(v)" y="192" text-anchor="middle" class="tick">{{ Math.round(v * 100) }}</text>
          </g>
          <path d="M47 23V175H362" fill="none" stroke="#64748b" stroke-width="1.3" />
          <text x="47" y="16" class="axis-title">Précision (%)</text>
          <text x="210" y="217" text-anchor="middle" class="axis-title">Rappel (%)</text>
          <polyline :points="pointString(curve)" fill="none" stroke="#aebbc9" stroke-width="2.5" />
          <polyline v-if="activeIndex >= 0" :points="pointString(curve.slice(0, activeIndex + 1))" fill="none" stroke="#cf1c24" stroke-width="2.8" />
          <path v-if="currentPoint" :d="`M47 ${currentPoint.y}H${currentPoint.x}V175`" stroke="#cf1c24" stroke-dasharray="4 4" fill="none" />
          <g v-for="(point, index) in curve" :key="point.threshold" class="curve-target" role="button" tabindex="0" :aria-label="`Choisir le seuil ${score(point.threshold)}`" @click="selectThreshold(point.threshold)" @keydown.enter.prevent="selectThreshold(point.threshold)" @keydown.space.prevent="selectThreshold(point.threshold)">
            <circle :cx="x(point.recall ?? 0)" :cy="y(point.precision ?? 0)" r="12" fill="transparent" />
            <circle :cx="x(point.recall ?? 0)" :cy="y(point.precision ?? 0)" r="4.5" fill="white" stroke="#64748b" stroke-width="1.5" />
            <text :x="x(point.recall ?? 0) + (index === 4 ? -13 : 9)" :y="y(point.precision ?? 0) - 8" :text-anchor="index === 4 ? 'end' : 'start'" class="point-label">{{ point.detections.at(-1)?.id }}</text>
          </g>
          <g v-if="currentPoint" data-testid="pr-current-point" :data-precision="result.precision" :data-recall="result.recall">
            <circle :cx="currentPoint.x" :cy="currentPoint.y" r="8" fill="#cf1c24" stroke="white" stroke-width="2.5" />
          </g>
          <g v-else>
            <rect x="63" y="146" width="277" height="24" rx="4" fill="white" />
            <text x="201" y="162" text-anchor="middle" class="tick">Aucune détection : précision non définie</text>
          </g>
        </svg>
      </div>
    </div>

    <div class="pr-legend">
      <span><i class="key tp" /> VP : piéton retrouvé</span>
      <span><i class="key fp" /> FP : erreur ou doublon</span>
      <span><i class="key gt" /> Pointillés bleus : annotations</span>
      <span>Courbe brute · lettres = dernières boîtes ajoutées</span>
    </div>
    <div class="pr-metrics" aria-live="polite" data-testid="pr-metrics">
      <span>VP <b>{{ result.tp }}</b> · FP <b>{{ result.fp }}</b> · FN <b>{{ result.fn }}</b></span>
      <span>Précision : <b>{{ result.tp }}/{{ result.detections.length }} = {{ percent(result.precision) }}</b></span>
      <span>Rappel : <b>{{ result.tp }}/3 = {{ percent(result.recall) }}</b></span>
    </div>
    <div class="pr-explanation" data-testid="pr-explanation">{{ explanation }}</div>
  </div>
</template>

<style scoped>
.pr-lab { font-size: 14px; color: #334155; }
.pr-controls { display: flex; gap: 14px; align-items: center; height: 29px; white-space: nowrap; }
.pr-controls label { display: flex; gap: 6px; align-items: center; }
.threshold-control { font-weight: 600; }
.pr-controls input[type=range] { width: 125px; accent-color: #cf1c24; }
.pr-controls input[type=checkbox] { accent-color: #334dba; }
.pr-controls output { font-variant-numeric: tabular-nums; min-width: 32px; color: #a8161d; }
.pr-controls > span { margin-left: auto; font-size: 12px; }
.pr-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 5px; }
.pr-panel-title { font-size: 13px; font-weight: 650; line-height: 18px; }
.pr-lab .pr-scene, .pr-lab .pr-plot { height: 192px; width: 100%; margin: 0; }
.pr-scene .box-label { font-size: 76px; font-weight: 650; fill: white; }
.pr-lab .pr-plot .tick { font-size: 12px; }
.pr-lab .pr-plot .axis-title { font-size: 13px; font-weight: 600; }
.pr-lab .pr-plot .point-label { font-size: 13px; font-weight: 650; paint-order: stroke; stroke: #f8fafc; stroke-width: 4px; stroke-linejoin: round; }
.curve-target { cursor: pointer; }
.curve-target:focus-visible circle { stroke: #cf1c24; stroke-width: 3px; }
.pr-legend { display: flex; gap: 12px; align-items: center; font-size: 11px; line-height: 17px; margin-top: 1px; }
.pr-legend span { display: inline-flex; align-items: center; gap: 4px; }
.key { width: 14px; height: 8px; border: 2px solid; display: inline-block; }
.key.tp { border-color: #16803b; }
.key.fp { border-color: #bd4100; }
.key.gt { border-color: #334dba; border-style: dashed; }
.pr-metrics { display: grid; grid-template-columns: .75fr 1fr 1fr; background: white; border-radius: 4px; padding: 5px 9px; margin-top: 3px; gap: 8px; font-size: 14px; }
.pr-metrics b { color: #a8161d; }
.pr-explanation { border-left: 3px solid #00bdf2; margin-top: 4px; padding: 4px 8px; background: #edf7fb; font-size: 13px; line-height: 1.25; }
</style>
