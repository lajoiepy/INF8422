<script setup lang="ts">
import {computed} from 'vue'
import {useStageTransition} from '../utils/useStageTransition'
import {vicregCloud,vicregTerms} from '../utils/matching.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const transition=useStageTransition(()=>props.stage)
const branches=computed(()=>vicregCloud(props.stage,transition.fraction.value))
const terms=computed(()=>vicregTerms(branches.value[0],branches.value[1]))
const captions=['Partir de vues décalées, presque effondrées.','L’invariance rapproche les vues correspondantes.','La variance impose une dispersion minimale par dimension.','La covariance décourage les directions redondantes.']
const formula=String.raw`\mathcal L_{\mathrm{VICReg}}=\lambda_{\mathrm{inv}}\mathcal L_{\mathrm{inv}}+\lambda_{\mathrm{var}}\mathcal L_{\mathrm{var}}+\lambda_{\mathrm{cov}}\mathcal L_{\mathrm{cov}}`
</script>
<template>
  <div class="vicreg-lab" :data-stage="stage" :data-invariance="terms.invariance" :data-variance="terms.variance" :data-covariance="terms.covariance" :data-blend="transition.fraction.value">
    <div class="ssl-pipeline">Vue → fθ → ψ → <b>gφ (expanseur)</b> → q · régulariser q des deux branches</div>
    <div class="vicreg-composition"><FeatureCloud :points="[...branches[0],...branches[1]]" symbol="q" paired/><div class="vicreg-terms"><div :class="{active:stage===1}"><b>Invariance</b> · {{terms.invariance.toFixed(4)}}<span>Distance entre vues correspondantes</span></div><div :class="{active:stage===2}"><b>Variance</b> · {{terms.variance.toFixed(4)}}<span>Plancher d’écart-type par dimension</span></div><div :class="{active:stage===3}"><b>Covariance</b> · {{terms.covariance.toFixed(4)}}<span>Covariance hors diagonale au carré</span></div></div></div>
    <MathLine :formula="formula" small/>
    <div class="ssl-caption">{{captions[stage]}}</div>
    <SSLControls replay :disabled="stage===0" :playing="transition.playing.value" @play="transition.replay" @step="transition.step" @reset="transition.reset"/>
    <div class="ssl-disclosure">Nuages schématiques, termes calculés · trois exemples par branche · cercle : vue 1, carré : vue 2</div>
    <div class="citation"><a href="https://arxiv.org/abs/2105.04906">Bardes et al. · VICReg · ICLR 2022</a></div>
  </div>
</template>
<style scoped>.vicreg-composition{display:grid;grid-template-columns:295px 1fr;gap:42px;align-items:center;margin:3px 13px}.vicreg-terms>div{font-size:18px;padding:8px 10px;margin:5px 0;border-left:3px solid #cbd5e1}.vicreg-terms span{display:block;font-size:15px;margin-top:5px}.vicreg-terms .active{border-left-color:#CF1C24;background:#fff4f3}.ssl-pipeline{font-size:16px;margin:13px 0;color:#475569}</style>
