<script setup lang="ts">
import photo from '../images/camera-observation.png'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="prediction-demand">
  <svg class="ssl-svg demand-scene" viewBox="0 0 860 262" role="img" aria-label="One driving-camera scene with appearance details and object structure highlighted separately">
   <image :href="photo" x="15" y="19" width="540" height="180"/>
   <g v-if="stage===0"><rect x="378" y="20" width="167" height="52" fill="none" stroke="#F15A22" stroke-width="3"/><path d="M551 47H595" class="ssl-forward"/><text x="607" y="43">Brick texture</text><text x="607" y="68" class="small">Appearance detail</text><rect x="24" y="21" width="45" height="83" fill="none" stroke="#F15A22" stroke-width="3"/><text x="285" y="232" text-anchor="middle">Pixel targets ask for color, illumination, and texture.</text></g>
   <g v-else><path d="M336 69L404 61L419 160L322 164Z" fill="none" stroke="#25B34B" stroke-width="3"/><path d="M417 105H595" class="ssl-forward"/><text x="607" y="102">Vehicle structure</text><text x="607" y="127" class="small">Potential task evidence</text><path d="M174 151L263 109L296 109L307 190" fill="none" stroke="#25B34B" stroke-width="3"/><text x="285" y="232" text-anchor="middle">A robot task may place more value on object and road structure.</text></g>
  </svg>
  <div class="ssl-caption">A target defines what prediction errors the model must reduce.</div><SSLControls/>
  <div class="takeaway">The features worth learning depend on the task.</div>
 </div>
</template>
<style scoped>.demand-scene{height:283px}</style>
