<script setup lang="ts">
import {computed,useId} from 'vue'
import {terrainBands,groundBandPolygon,projectGround,projectedFootprint,polygonText,observedColor} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{samples?:any[];offset?:number;showTrue?:boolean;selected?:number;highlightBand?:string}>(),{samples:()=>[],offset:0,showTrue:false,selected:-1,highlightBand:''})
const id=useId()
const bands=computed(()=>terrainBands.map(b=>({...b,uv:groundBandPolygon(b).map(p=>projectGround(p).uv)})))
</script>
<template>
 <svg class="terrain-image" viewBox="0 0 360 180" role="img" aria-label="Vue caméra antérieure synthétique fixe, avec cibles sur les seules empreintes mesurées">
  <defs><pattern :id="id+'-unknown'" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 9L9 0" stroke="#64748b" stroke-opacity=".17" stroke-width=".7"/></pattern></defs>
  <rect width="360" height="180" fill="#eaf5fc"/><rect y="35" width="360" height="145" fill="#e6e9df"/>
  <polygon v-for="band in bands" :key="band.name" :points="polygonText(band.uv)" :fill="band.color" stroke="#fff" stroke-width="1"/>
  <path v-for="k in 18" :key="k" :d="'M'+(k*20)+' 173l4 -9'" stroke="#738561" stroke-opacity=".3" stroke-width="1"/>
  <rect y="35" width="360" height="145" :fill="'url(#'+id+'-unknown)'"/>
  <polygon v-for="band in bands.filter(b=>b.name.toLowerCase()===highlightBand)" :key="band.name+'selected'" :points="polygonText(band.uv)" fill="none" stroke="#00BDF2" stroke-width="3"/>
  <template v-for="(m,i) in samples" :key="m.time">
   <polygon v-if="showTrue&&offset!==0" :points="polygonText(projectedFootprint(m,0).uv)" fill="none" stroke="#333" stroke-dasharray="3 2" stroke-width="1.2"/>
   <polygon :points="polygonText(projectedFootprint(m,offset).uv)" :fill="observedColor(m.cost)" fill-opacity=".8" :stroke="i===selected?'#CF1C24':'#fff'" :stroke-width="i===selected?2.3:1"/>
  </template>
 </svg>
</template>
<style scoped>.terrain-image{width:100%;display:block;border:1px solid #cbd5e1;background:#f8fafc;overflow:hidden}</style>
