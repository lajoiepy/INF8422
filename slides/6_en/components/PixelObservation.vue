<script setup lang="ts">
import { imageValues, maskedIndices } from '../utils/trainingStep.mjs'
withDefaults(defineProps<{mode?: 'original'|'masked'|'target'|'prediction'; predictions?: number[]; size?: number}>(),{mode:'original',size:100})
const gray = (v:number) => `rgb(${Math.round(255*v)},${Math.round(255*v)},${Math.round(255*v)})`
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" role="img" :aria-label="`${mode} view of the illustrative grayscale observation`" class="pixel-observation">
    <template v-for="(v,k) in imageValues" :key="k">
      <rect :x="k%4*25" :y="Math.floor(k/4)*25" width="25" height="25" :fill="mode==='masked'&&maskedIndices.includes(k)?'#e8f4f8':mode==='target'&&!maskedIndices.includes(k)?'#fff':mode==='prediction'? (maskedIndices.includes(k)?gray(predictions?.[maskedIndices.indexOf(k)]??0):'#fff'):gray(v)" stroke="#cbd5e1" stroke-width=".7" />
      <path v-if="mode==='masked'&&maskedIndices.includes(k)" :d="`M${k%4*25+5} ${Math.floor(k/4)*25+5}l15 15m-15 0l15-15`" stroke="#457387" stroke-width="1.2" />
      <rect v-if="mode==='target'&&maskedIndices.includes(k)" :x="k%4*25+1" :y="Math.floor(k/4)*25+1" width="23" height="23" fill="none" stroke="#1b7b37" stroke-width="2" />
    </template>
  </svg>
</template>
