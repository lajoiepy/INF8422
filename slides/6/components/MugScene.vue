<script setup lang="ts">
import { computed, useId } from 'vue'
import { initialScene, sceneReadout } from '../utils/representationScene.mjs'
const props=withDefaults(defineProps<{scene?:typeof initialScene;features?:boolean;grasp?:boolean;axes?:boolean;crop?:boolean}>(),{features:false,grasp:false,axes:false,crop:false})
const state=computed(()=>props.scene||initialScene)
const readout=computed(()=>sceneReadout(state.value))
const id=useId()
const ceramic='hsl(190 36% 68%)'
</script>

<template>
  <svg class="mug-scene" viewBox="0 0 300 210" role="img" aria-label="Tasse illustrative vue du dessus; u vers la droite, v vers le bas">
    <defs>
      <linearGradient :id="`${id}-light`"><stop offset="0" :stop-color="ceramic"/><stop offset="1" stop-color="#297187" stop-opacity=".65"/></linearGradient>
      <pattern :id="`${id}-pattern`" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M0 0H30V30" fill="none" stroke="#d9cfb9" stroke-width="2"/></pattern>
      <clipPath :id="`${id}-frame`"><rect x="1" y="1" width="298" height="208" rx="5"/></clipPath>
      <clipPath :id="`${id}-crop`"><rect x="48" y="42" width="118" height="126"/></clipPath>
    </defs>
    <g :clip-path="`url(#${id}-frame)`">
      <g :style="{filter:`brightness(${state.lighting})`}">
      <rect width="300" height="210" :fill="state.background==='pattern'?'#f0e9dc':'#edf2f3'"/>
      <rect v-if="state.background==='pattern'" width="300" height="210" :fill="`url(#${id}-pattern)`"/>
      <g :clip-path="crop?`url(#${id}-crop)`:undefined">
        <g :transform="`translate(${state.u} ${state.v}) rotate(${state.alpha})`">
          <ellipse cx="8" cy="9" rx="49" ry="45" fill="#102d38" opacity=".16"/>
          <path d="M34-22C94-35 94 35 34 22L39 12C73 21 73-21 39-12Z" :fill="`url(#${id}-light)`" stroke="#346e7c" stroke-width="2"/>
          <circle r="43" :fill="`url(#${id}-light)`" stroke="#346e7c" stroke-width="2"/>
          <circle r="33" fill="#dfedf0" stroke="#518291" stroke-width="2"/>
          <circle r="27" fill="hsl(23 38% 30%)"/>
          <path d="M-21-8C-16-22 2-25 15-19" fill="none" stroke="#eed7b0" stroke-width="3" opacity=".57"/>
          <path d="M-34 9A35 35 0 0 0-24 26" fill="none" stroke="#fff" stroke-width="3" opacity=".6"/>
        </g>
      </g>
      </g>
      <g v-if="features&&!crop">
        <g v-for="p in readout.features" :key="p.id" :transform="`translate(${p.image[0]} ${p.image[1]})`">
          <circle r="6" :fill="p.color" stroke="white" stroke-width="2"/>
          <text x="-12" y="-10" :fill="p.color" class="point-label">{{p.id}}</text>
        </g>
      </g>
      <g v-if="grasp&&!crop" :transform="`translate(${readout.grasp.point[0]} ${readout.grasp.point[1]}) rotate(${state.alpha})`" class="grasp-overlay">
        <path d="M0 0H31m-7-5 7 5-7 5M0 0V28m-5-7 5 7 5-7" fill="none" stroke="#c45314" stroke-width="2.5"/>
        <path d="M-10-15H10M-10 15H10" stroke="#c45314" stroke-width="3"/>
        <circle r="3" fill="#c45314"/>
      </g>
      <g v-if="axes" class="image-axes"><path d="M15 20H49m-5-4 5 4-5 4M15 20V54m-4-5 4 5 4-5" fill="none" stroke="#64748b" stroke-width="1.3"/><text x="54" y="24">u</text><text x="9" y="69">v</text></g>
      <g v-if="crop"><rect x="48" y="42" width="118" height="126" fill="none" stroke="#c45314" stroke-width="2" stroke-dasharray="5 4"/><text x="182" y="96" fill="#9d4312">Anse</text><text x="182" y="117" fill="#9d4312">retirée</text></g>
    </g>
    <rect x="1" y="1" width="298" height="208" rx="5" fill="none" stroke="#cbd5e1"/>
  </svg>
</template>

<style scoped>
.mug-scene{display:block;width:100%;height:auto}.mug-scene text{font-family:'Avenir Next','Nunito Sans',sans-serif;font-size:15px}.point-label{font-weight:700;paint-order:stroke;stroke:white;stroke-width:3px;stroke-linejoin:round}.image-axes text{fill:#475569}
</style>
