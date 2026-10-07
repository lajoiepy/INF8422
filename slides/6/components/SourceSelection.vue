<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {sourceSelection,observedTarget} from '../utils/geometry.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),stationary=ref(props.stage>=3)
const reset=()=>stationary.value=props.stage>=3
usePlayback(()=>false,reset);watch(()=>props.stage,reset)
const still=computed(()=>nav.isPrintMode.value?props.stage>=3:stationary.value),result=computed(()=>sourceSelection({stationary:still.value}))
const formula=computed(()=>props.stage<1?String.raw`\tfrac12(e_A+e_B)`:props.stage===1?String.raw`e_{\min}(\mathbf u)=\min_s e_s(\mathbf u)`:String.raw`m(\mathbf u)=\big[\min_s e_s^{\mathrm{warp}}(\mathbf u)<\min_s e_s^{\mathrm{identity}}(\mathbf u)\big]`)
</script>
<template>
 <div class="source-selection" :data-stationary="still" :data-min="result.minimum" :data-identity-min="result.identityMinimum" :data-average="result.average" :data-selected="result.selected" :data-keep="result.keep">
  <div class="source-choice-images"><GeoImage :image="observedTarget" label="Cible enregistrée Iₜ" :point="[31,20]"/><div v-for="(image,j) in result.sources" :key="j" :class="{'selected-source':stage>=1&&result.selected===j}"><GeoImage :image="image" :label="`Source enregistrée ${j===0?'A':'B'}`" :point="result.warps[j].uv"/><div class="source-error">RVB L1 reprojeté : {{result.warps[j].error.toFixed(4)}}</div></div></div>
  <MathLine :formula="formula" small/>
  <div class="source-choice-readout">{{stage===0?`Moyenne = ${result.average.toFixed(4)} inclut la source occultée.`:stage===1?`Minimum = ${result.minimum.toFixed(4)} sélectionne la source ${result.selected===0?'A':'B'} à ce pixel.`:`Minimum reprojeté ${result.minimum.toFixed(4)} · minimum non reprojeté ${result.identityMinimum.toFixed(4)} · m = ${result.keep?1:0}`}}</div>
  <div class="ssl-caption">{{stage<2?'Choisir la source par pixel; le meilleur choix peut varier dans l’image.':still?'Vues identiques : aucun gain de reprojection, donc rejet par l’inégalité stricte.':'Garder les pixels mieux reconstruits par reprojection que par copie source.'}}</div>
  <div v-if="stage>=2&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls"><label><input aria-label="Caméra stationnaire" v-model="stationary" type="checkbox"/>Caméra stationnaire</label></div>
  <SSLControls/><div class="ssl-disclosure">Exemple L1 synthétique · Monodepth2 ajoute SSIM, lissage de contours et multi-échelle pleine résolution</div>
 </div>
</template>
<style scoped>.source-choice-images{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:10px 0}.source-error{font-size:14px;margin:6px 0;color:#334155}.selected-source{outline:2px solid #25B34B;outline-offset:5px}.source-choice-readout{padding:8px 12px;background:#eff8f1;border-left:3px solid #25B34B;font-size:17px}</style>
