<script setup lang="ts">
withDefaults(defineProps<{points:number[][];symbol?:'ψ'|'q';paired?:boolean;collapsed?:boolean}>(),{symbol:'ψ',paired:false,collapsed:false})
const colors=['#b75b1e','#8a3b92','#177e9c']
</script>
<template>
  <svg class="feature-cloud ssl-svg" viewBox="0 0 240 220" role="img" :aria-label="`Illustrative two-dimensional ${symbol} feature cloud`">
    <path d="M21 114H218M120 211V18" stroke="#94a3b8" stroke-width="1.1"/><text x="220" y="119" class="tiny">{{symbol}}₁</text><text x="126" y="18" class="tiny">{{symbol}}₂</text>
    <path d="M65 110V118M175 110V118M116 59H124M116 169H124" stroke="#94a3b8"/><text x="59" y="131" class="tiny">−1</text><text x="171" y="131" class="tiny">1</text><text x="90" y="62" class="tiny">1</text><text x="85" y="173" class="tiny">−1</text>
    <g v-if="paired"><path v-for="i in 3" :key="i" :d="`M${120+points[i-1][0]*55} ${114-points[i-1][1]*55}L${120+points[i+2][0]*55} ${114-points[i+2][1]*55}`" stroke="#94a3b8" stroke-dasharray="3 3"/></g>
    <template v-if="!collapsed"><g v-for="(p,k) in points" :key="k"><circle v-if="paired?k<3:k%2===0" :cx="120+p[0]*55" :cy="114-p[1]*55" r="6" :fill="colors[paired?k%3:Math.floor(k/2)%3]" stroke="white" stroke-width="1.5"/><rect v-else :x="114+p[0]*55" :y="108-p[1]*55" width="12" height="12" :fill="colors[paired?k%3:Math.floor(k/2)%3]" stroke="white" stroke-width="1.5" fill-opacity=".7"/></g></template>
    <g v-else><circle :cx="120+points[0][0]*55" :cy="114-points[0][1]*55" r="7" fill="#334155"/><rect :x="67+points[0][0]*55" :y="79-points[0][1]*55" width="106" height="21" rx="2" fill="white"/><text :x="120+points[0][0]*55" :y="95-points[0][1]*55" text-anchor="middle" class="small">All six views</text></g>
  </svg>
</template>
<style scoped>.feature-cloud{width:100%;height:220px}</style>
