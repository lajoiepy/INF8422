<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {observedTarget,observedSource,denseWarp,errorImage} from '../utils/geometry.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),factor=ref(1.3)
const reset=()=>factor.value=props.stage>=1?1:1.3
reset();usePlayback(()=>false,reset);watch(()=>props.stage,reset)
const fieldFactor=computed(()=>nav.isPrintMode.value?(props.stage>=1?1:1.3):factor.value),warp=computed(()=>denseWarp(observedTarget,observedSource,{depthFactor:fieldFactor.value})),errors=computed(()=>errorImage(warp.value))
</script>
<template>
 <div class="dense-reconstruction" :data-factor="fieldFactor" :data-loss="warp.loss" :data-valid="warp.count" :data-occluded="warp.occluded.filter(Boolean).length">
  <div class="dense-images"><GeoImage :image="observedTarget" label="Cible enregistrée Iₜ"/><GeoImage :image="warp" label="Cible reconstruite Îₜ"/><GeoImage v-if="stage>=1" :image="errors" label="Erreur RVB L1 · clair = élevé"/><div v-else class="error-placeholder">Prédire où échantillonner Iₛ<br>pour chaque pixel cible.</div></div>
  <MathLine :formula="String.raw`\mathcal L_{\mathrm{photo}}=\frac{1}{|\Omega|}\sum_{\mathbf u\in\Omega}\|I_t(\mathbf u)-\widehat I_t(\mathbf u)\|_1`" small/>
  <div class="dense-readout">Moyenne RVB L1 = {{warp.loss.toFixed(4)}} · {{warp.count}} / 3840 pixels dans Ω</div>
  <div class="ssl-caption">{{stage>=2?'Ω exclut projections derrière caméra et hors image; les occultations restent incluses.':'Profondeur et pose estimées définissent l’échantillon source de chaque pixel cible.'}}</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls"><label>Multiplicateur du champ de profondeur <input aria-label="Multiplicateur du champ de profondeur" type="range" min=".7" max="1.5" step=".05" v-model.number="factor"/>{{factor.toFixed(2)}}</label><button @click="reset();($event.target as HTMLElement).blur()">Réinitialiser le champ</button></div>
  <SSLControls/><div class="ssl-disclosure">Profondeur synthétique, sans modèle appris · L1 des pixels valides, sans objectif Monodepth2 complet</div>
 </div>
</template>
<style scoped>.dense-images{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:12px 0 16px}.error-placeholder{display:flex;align-items:center;justify-content:center;text-align:center;font-size:16px;background:#f8fafc;border:1px dashed #cbd5e1;margin-top:25px;line-height:1.5}.dense-readout{padding:8px 12px;background:#fff4ee;border-left:3px solid #F15A22;font-size:17px}</style>
