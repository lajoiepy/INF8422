<script setup lang="ts">
import {computed} from 'vue'
import {useStageTransition} from '../utils/useStageTransition'
import {agreementCloud,agreementLoss,covariance} from '../utils/matching.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const transition=useStageTransition(()=>props.stage)
const progress=computed(()=>props.stage===0?0:(props.stage-1+transition.fraction.value)/2)
const points=computed(()=>agreementCloud(progress.value)),loss=computed(()=>agreementLoss(points.value)),spread=computed(()=>covariance(points.value))
const formula=computed(()=>props.stage<2?String.raw`\ell_{\mathrm{agree},i}=\|\boldsymbol{\psi}_i^{(1)}-\boldsymbol{\psi}_i^{(2)}\|_2^2`:String.raw`f_\theta(x)=\mathbf c\ \text{for every }x\quad\Longrightarrow\quad\ell_{\mathrm{agree},i}=0`)
</script>
<template>
  <div class="collapse-lab" :data-progress="progress" :data-loss="loss" :data-playing="transition.playing.value">
    <div class="collapse-composition"><FeatureCloud :points="points" :collapsed="progress>=.999"/><div><div class="cloud-label">Three original observations · two views each</div><div class="collapse-value">Mean pair-agreement loss: <b>{{loss.toFixed(4)}}</b></div><div class="collapse-value">Feature spread: ({{spread.std[0].toFixed(3)}}, {{spread.std[1].toFixed(3)}})</div><div class="collapse-explanation">{{stage===2?'One constant vector erases distinctions between observations.':'Reducing paired-view distance does not require preserving differences between originals.'}}</div><div v-if="stage===2" class="constant-coordinate">c = (0.20, 0.15)</div></div></div>
    <MathLine :formula="formula" :small="stage===2"/>
    <SSLControls replay :disabled="stage===0" :playing="transition.playing.value" @play="transition.replay" @step="transition.step" @reset="transition.reset"/>
    <div class="ssl-disclosure">Schematic collapse by interpolation · distances and feature spread computed from the plotted points</div>
  </div>
</template>
<style scoped>.collapse-composition{display:grid;grid-template-columns:300px 1fr;gap:44px;align-items:center;margin:15px 15px 8px}.cloud-label{font-size:18px;font-weight:600;margin-bottom:18px}.collapse-value{font-size:17px;margin:12px 0;font-variant-numeric:tabular-nums}.collapse-explanation{font-size:18px;line-height:1.45;margin-top:19px}.constant-coordinate{font-size:16px;margin-top:12px;color:#475569}</style>
