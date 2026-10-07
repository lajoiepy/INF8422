<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {observedTarget,observedSource,targetDescriptorImage,sourceDescriptorImage,trainingDistances} from '../utils/correspondence.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),id=useId(),kind=ref('panel'),reset=()=>kind.value='panel'
usePlayback(()=>false,reset);watch(()=>props.stage,reset)
const pixel=computed(()=>!nav.isPrintMode.value&&kind.value==='background'?[60,20]:[48,20]),values=computed(()=>trainingDistances(...pixel.value))
const fmt=(v:number[])=>`[${v.map(x=>x.toFixed(3)).join(', ')}]`
</script>
<template>
 <div class="descriptor-training" :data-positive-distance="values.positiveDistance" :data-negative-distance="values.negativeDistance" :data-query="JSON.stringify(pixel)" :data-positive="JSON.stringify(values.pair.rounded)" :data-stage="stage">
  <svg class="ssl-svg descriptor-training-diagram" viewBox="0 0 860 222" role="img" aria-label="L’encodeur partagé produit des champs denses de deux images RVB; les paires géométriques sélectionnent les vecteurs">
   <defs><marker :id="`${id}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
   <foreignObject x="8" y="8" width="137" height="111"><GeoImage :image="observedTarget" label="Observation Iₜ" :point="pixel" point-color="#25B34B"/></foreignObject><foreignObject x="8" y="116" width="137" height="108"><GeoImage :image="observedSource" label="Observation Iₛ" :point="stage>=1?values.pair.rounded:null" point-color="#25B34B" :alternative="stage>=2?values.pair.negative:null" alternative-color="#F15A22"/></foreignObject>
   <path d="M154 63H192" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><path d="M154 170H178V133H192" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><rect x="200" y="49" width="118" height="92" rx="4" class="ssl-encoder"/><text x="259" y="84" text-anchor="middle">Encodeur fθ</text><text x="259" y="114" text-anchor="middle" class="small">θ partagé</text>
   <path d="M326 63H370" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><path d="M326 130H345V170H370" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/>
   <foreignObject x="378" y="8" width="137" height="111"><GeoImage :image="targetDescriptorImage" label="Champ dense ψₜ" :point="pixel" point-color="#25B34B"/></foreignObject><foreignObject x="378" y="116" width="137" height="108"><GeoImage :image="sourceDescriptorImage" label="Champ dense ψₛ" :point="stage>=1?values.pair.rounded:null" point-color="#25B34B" :alternative="stage>=2?values.pair.negative:null" alternative-color="#F15A22"/></foreignObject>
   <path d="M525 63H552" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><text x="567" y="49" class="small">Requête ψₜ(uₜ)</text><text x="567" y="79" class="small">{{fmt(values.query)}}</text>
   <g v-if="stage>=1"><text x="567" y="120" class="small" style="fill:#168034">Apparié ψₛ(uₛ⁺)</text><text x="567" y="146" class="small">{{fmt(values.positive)}}</text></g><g v-if="stage>=2"><text x="567" y="184" class="small" style="fill:#b3470f">Non apparié ψₛ(uₛ⁻)</text><text x="567" y="210" class="small">{{fmt(values.negative)}}</text></g>
  </svg>
  <MathLine :formula="stage===0?String.raw`\boldsymbol{\psi}_t=f_\theta(I_t),\qquad\boldsymbol{\psi}_s=f_\theta(I_s)`:String.raw`d_+=\|\boldsymbol{\psi}_t(\mathbf u_t)-\boldsymbol{\psi}_s(\mathbf u_s^+)\|_2,\quad d_-=\|\boldsymbol{\psi}_t(\mathbf u_t)-\boldsymbol{\psi}_s(\mathbf u_s^-)\|_2`" :small="stage>=1"/>
  <div class="descriptor-distance-readout"><span>{{stage>=1?`Distance correspondante d₊ = ${values.positiveDistance.toFixed(4)}`:'Chaque position image possède un vecteur.'}}</span><span v-if="stage>=2">Distance non correspondante d₋ = {{values.negativeDistance.toFixed(4)}}</span></div>
  <div class="ssl-caption">{{stage===0?'Les paires de pixels sélectionnent les vecteurs denses locaux.':stage===1?'Les paires correspondantes rapprochent leurs vecteurs.':'Les non-correspondances imposent une séparation; la géométrie fournit les rôles.'}}</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls"><label>Paire d’apprentissage <select aria-label="Paire d’apprentissage de descripteurs" v-model="kind" @change="($event.target as HTMLElement).blur()"><option value="panel">Point d’avant-plan</option><option value="background">Point de fond</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Champs illustratifs fixes et distances calculées · couleurs vectorielles; aucun encodeur entraîné ici</div>
 </div>
</template>
<style scoped>.descriptor-training-diagram{height:220px}.descriptor-distance-readout{display:flex;justify-content:space-between;gap:16px;padding:8px 10px;background:#eff8f1;border-left:3px solid #25B34B;font-size:16px}.descriptor-training .ssl-caption{font-size:16px;margin:9px 0}</style>
