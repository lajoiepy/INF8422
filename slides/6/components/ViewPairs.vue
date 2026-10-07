<script setup lang="ts">
import {ref,computed,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {augmentedViews,sampleColors} from '../utils/matching.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),seed=ref(1),id=useId()
const reset=()=>{seed.value=1}
usePlayback(()=>false,reset)
watch(()=>props.stage,reset)
const views=computed(()=>augmentedViews(nav.isPrintMode.value?1:seed.value))
</script>
<template>
  <div class="view-pairs" :data-seed="seed">
    <svg class="ssl-svg" viewBox="0 0 860 255" role="img" aria-label="Trois observations originales, chacune avec deux transformations tirées indépendamment">
      <defs><marker :id="`${id}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
      <g v-for="i in 3" :key="i" :transform="`translate(${(i-1)*287} 0)`">
        <text x="140" y="24" text-anchor="middle" class="strong">Original xᵢ · i = {{i}}</text><foreignObject x="91" y="37" width="100" height="70"><SampleImage :sample="i-1"/></foreignObject><path d="M91 108H191" :stroke="sampleColors[i-1]" stroke-width="3"/>
        <g v-if="stage>=1"><path d="M140 115V130H66V148" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><foreignObject x="21" y="157" width="90" height="63"><SampleImage :sample="i-1" :brightness="views[(i-1)*2].brightness" :crop="views[(i-1)*2].crop"/></foreignObject><text x="66" y="243" text-anchor="middle" class="small">i = {{i}}, v = 1</text></g>
        <g v-if="stage>=2"><path d="M140 115V130H215V148" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><foreignObject x="170" y="157" width="90" height="63"><SampleImage :sample="i-1" :brightness="views[(i-1)*2+1].brightness" :crop="views[(i-1)*2+1].crop"/></foreignObject><text x="215" y="243" text-anchor="middle" class="small">i = {{i}}, v = 2</text></g>
      </g>
    </svg>
    <MathLine :formula="String.raw`\widetilde x_i^{(v)}=\mathcal A_{\xi_i^{(v)}}(x_i)`"/>
    <div class="ssl-caption">i identifie l’original; v la vue. L’association vient de la provenance.</div>
    <SSLControls><button v-if="stage>=2" @click="seed++">Rééchantillonner les vues</button></SSLControls>
    <div class="ssl-disclosure">Observations illustratives · tirages pseudoaléatoires indépendants et reproductibles</div>
  </div>
</template>
