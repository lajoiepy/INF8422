<script setup lang="ts">
import { useId } from 'vue'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const id=useId()
</script>
<template>
  <svg class="encoder-representation representation-svg" viewBox="0 0 860 265" role="img" aria-label="Mug observation passes through the encoder to a reusable illustrative feature vector">
    <defs><marker :id="`${id}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
    <text x="136" y="28" text-anchor="middle">Observation x</text>
    <foreignObject x="17" y="46" width="238" height="167"><MugScene/></foreignObject>
    <path d="M267 129H316" stroke="#334155" stroke-width="1.7" :marker-end="`url(#${id}-arrow)`"/>
    <rect x="326" y="94" width="171" height="70" rx="5" fill="#edf7fa" stroke="#00BDF2" stroke-width="2"/>
    <text x="411" y="123" text-anchor="middle">Encoder fθ</text><text x="411" y="147" text-anchor="middle" class="small">learned parameters θ</text>
    <g v-if="stage>=1"><path d="M505 129H554" stroke="#334155" stroke-width="1.7" :marker-end="`url(#${id}-arrow)`"/>
      <text x="696" y="72" text-anchor="middle">Representation ψ</text><foreignObject x="566" y="105" width="265" height="48"><FeatureVector/></foreignObject>
    </g>
    <text x="411" y="247" text-anchor="middle" class="small">An internal description that a task can reuse</text>
  </svg>
</template>
<style scoped>.encoder-representation{height:265px}</style>
