<script setup lang="ts">
import {dimensionClouds,covariance} from '../utils/matching.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const labels=['Point: complete collapse','Line: one varying direction','Two varying directions']
const spreads=dimensionClouds.map(p=>covariance(p).std)
</script>
<template>
  <div class="feature-dimensions"><div v-for="(points,k) in dimensionClouds" :key="k" :style="{visibility:stage>=k?'visible':'hidden'}"><div class="dimension-label">{{labels[k]}}</div><FeatureCloud :points="points" :collapsed="k===0"/><div class="dimension-spread">Std: ({{spreads[k][0].toFixed(2)}}, {{spreads[k][1].toFixed(2)}})</div></div></div>
  <SSLControls/>
  <div class="ssl-disclosure">Illustrative encoder features · identical axes and scales · spread alone does not establish task usefulness</div>
</template>
<style scoped>.feature-dimensions{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:15px}.dimension-label{font-size:17px;font-weight:600;min-height:26px;text-align:center}.dimension-spread{font-size:15px;text-align:center;margin:6px 0 4px;font-variant-numeric:tabular-nums}</style>
