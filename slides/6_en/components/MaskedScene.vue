<script setup lang="ts">
import {useId} from 'vue'
import photo from '../images/camera-observation.png'
import {columns,rows,blocks} from '../utils/prediction.mjs'
withDefaults(defineProps<{hidden?:number[];grid?:boolean;prediction?:number[][];highlight?:number[];targetBlocks?:boolean;selected?:number;context?:boolean}>(),{hidden:()=>[],grid:true,highlight:()=>[],targetBlocks:false,selected:0,context:false})
const id=useId()
</script>
<template>
 <svg class="masked-scene" viewBox="0 0 288 96" role="img" aria-label="Driving-camera observation on a twelve by four patch grid">
  <defs><clipPath :id="id"><rect width="288" height="96"/></clipPath></defs>
  <g :clip-path="`url(#${id})`">
   <image :href="photo" width="288" height="96"/>
   <template v-for="k in columns*rows" :key="k">
    <rect v-if="hidden.includes(k-1)" :data-hidden="k-1" :x="((k-1)%columns)*24" :y="Math.floor((k-1)/columns)*24" width="24" height="24" fill="#dde2e5"/>
    <rect v-if="prediction" :x="((k-1)%columns)*24" :y="Math.floor((k-1)/columns)*24" width="24" height="24" :fill="`rgb(${prediction[k-1].map(v=>Math.round(v*255)).join(',')})`"/>
    <rect v-if="grid" :x="((k-1)%columns)*24" :y="Math.floor((k-1)/columns)*24" width="24" height="24" fill="none" stroke="white" stroke-width=".5"/>
    <rect v-if="highlight.includes(k-1)" :x="((k-1)%columns)*24+1" :y="Math.floor((k-1)/columns)*24+1" width="22" height="22" fill="none" stroke="#CF1C24" stroke-width="2"/>
   </template>
   <g v-if="targetBlocks">
    <g v-for="(block,b) in blocks" :key="b">
     <rect :x="block.indices[0]%columns*24+1" :y="Math.floor(block.indices[0]/columns)*24+1" width="46" height="46" fill="none" :stroke="block.color" :stroke-width="selected===b?3:1.5" :stroke-dasharray="selected===b?'':'3 2'"/>
     <rect :x="block.indices[0]%columns*24+2" :y="Math.floor(block.indices[0]/columns)*24+2" width="15" height="17" :fill="block.color"/><text :x="block.indices[0]%columns*24+9.5" :y="Math.floor(block.indices[0]/columns)*24+15" fill="white" text-anchor="middle" font-size="12" font-weight="bold">{{block.name}}</text>
    </g>
   </g>
  </g>
  <rect x=".5" y=".5" width="287" height="95" fill="none" stroke="#94a3b8"/>
 </svg>
</template>
<style scoped>.masked-scene{display:block;width:100%;height:auto}.masked-scene text{font-family:'Avenir Next','Nunito Sans',sans-serif;font-size:12px!important;fill:white!important}</style>
