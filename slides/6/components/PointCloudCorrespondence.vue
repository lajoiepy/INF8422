<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {cloudA,cloudB,cloudMatch,cloudToA} from '../utils/correspondence.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),query=ref(14),reset=()=>query.value=14
usePlayback(()=>false,reset);watch(()=>props.stage,reset)
const id=computed(()=>nav.isPrintMode.value?14:query.value),result=computed(()=>cloudMatch(id.value))
const screen=(p:number[],offset=0)=>[220+offset+p[0]*78+p[2]*25,145-p[1]*65-p[2]*35]
const color=(z:number[])=>`rgb(${z.map(x=>Math.round(x*255)).join(',')})`
const fmt=(p:number[])=>`[${p.map(v=>v.toFixed(2)).join(', ')}]`
const sourcePoints=computed(()=>cloudB.map(point=>({...point,p:props.stage>=2?cloudToA(point.p):point.p})))
</script>
<template>
 <div class="point-cloud-correspondence" :data-query="id" :data-match="result.match.id" :data-distance="result.distance" :data-stage="stage">
  <svg class="ssl-svg point-cloud-scene" viewBox="0 0 860 275" role="img" aria-label="Nuages synthétiques superposés, descripteurs correspondants et source exprimée dans le repère cible">
   <text x="10" y="23">Nuage A · repère a</text><text x="450" y="23">{{stage>=2?'Nuage B exprimé dans a':'Nuage B · repère b'}}</text>
   <g v-for="point in cloudA" :key="point.id"><circle :cx="screen(point.p)[0]" :cy="screen(point.p)[1]" r="5" :fill="color(point.z)"/><circle v-if="point.id===id" :cx="screen(point.p)[0]" :cy="screen(point.p)[1]" r="10" fill="none" stroke="#168034" stroke-width="2"/></g>
   <g v-for="point in sourcePoints" :key="point.id"><circle :cx="screen(point.p,430)[0]" :cy="screen(point.p,430)[1]" r="5" :fill="color(point.z)"/><circle v-if="stage>=1&&point.id===result.match.id" :cx="screen(point.p,430)[0]" :cy="screen(point.p,430)[1]" r="10" fill="none" stroke="#168034" stroke-width="2"/></g>
   <g v-for="offset in [0,430]" :key="offset" :transform="`translate(${100+offset} 230)`"><path d="M0 0H40M0 0V-40M0 0L22 -18" fill="none" stroke="#64748b" stroke-width="1.5"/><text x="47" y="5" class="tiny">X</text><text x="-5" y="-48" class="tiny">Y</text><text x="25" y="-21" class="tiny">Z</text></g>
   <text x="220" y="258" text-anchor="middle" class="small">28 points</text><text x="650" y="258" text-anchor="middle" class="small">28 points · 20 points communs</text>
   <path v-if="stage>=1" :d="`M${screen(result.query.p).join(' ')}L${screen(stage>=2?cloudToA(result.match.p):result.match.p,430).join(' ')}`" stroke="#168034" stroke-width="1.5" stroke-dasharray="5 4"/>
  </svg>
  <MathLine v-if="stage>=2" :formula="String.raw`p^a=R_b^a p^b+t_b^a`"/>
  <div class="cloud-readout">Requête pᵃ = {{fmt(result.query.p)}}<span v-if="stage>=1"> · apparié pᵇ = {{fmt(result.match.p)}}</span></div>
  <div class="ssl-caption">{{stage===0?'Les nuages superposés décrivent certaines surfaces physiques communes.':stage===1?'L’appariement de descripteurs propose des correspondances de points.':'Des correspondances fiables et bien réparties peuvent contraindre un recalage rigide.'}}</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls"><label>Point requête <select aria-label="Requête du nuage" v-model.number="query" @change="($event.target as HTMLElement).blur()"><option :value="14">Point 14</option><option :value="20">Point 20</option><option :value="24">Point 24</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Géométrie rigide calculée · descripteurs construits, sans réseau 3D ni solveur de recalage</div>
 </div>
</template>
<style scoped>.point-cloud-scene{height:230px}.cloud-readout{padding:8px 10px;background:#edf8fc;border-left:3px solid #00BDF2;font-size:15px}.point-cloud-correspondence .ssl-caption{font-size:16px;margin:9px 0}</style>
