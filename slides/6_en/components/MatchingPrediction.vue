<script setup lang="ts">
import { useId } from 'vue'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const id=useId()
</script>
<template>
  <svg class="matching-prediction representation-svg" viewBox="0 0 860 300" role="img" aria-label="Related views share an encoder and are compared; a masked input is encoded and decoded to predict observed hidden values">
    <defs><marker :id="`${id}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
    <text x="16" y="24" class="strong">Match related observations</text>
    <foreignObject x="16" y="41" width="87" height="62"><MugScene/></foreignObject><foreignObject x="16" y="112" width="87" height="62"><MugScene :scene="{u:125,v:105,alpha:0,lighting:.55,background:'pattern'}"/></foreignObject>
    <text x="113" y="76" class="small">view 1</text><text x="113" y="147" class="small">view 2</text>
    <path d="M170 72H199" class="arrow" :marker-end="`url(#${id}-arrow)`"/><path d="M170 143H199" class="arrow" :marker-end="`url(#${id}-arrow)`"/><rect x="209" y="51" width="91" height="43" rx="4" class="encoder"/><rect x="209" y="122" width="91" height="43" rx="4" class="encoder"/><text x="254" y="78" text-anchor="middle">fθ</text><text x="254" y="149" text-anchor="middle">fθ</text><text x="254" y="194" text-anchor="middle" class="small">shared θ</text>
    <path d="M305 72H341" class="arrow" :marker-end="`url(#${id}-arrow)`"/><path d="M305 143H341" class="arrow" :marker-end="`url(#${id}-arrow)`"/><text x="369" y="79">ψ₁</text><text x="369" y="150">ψ₂</text>
    <path d="M395 72H456V105H499" class="arrow" :marker-end="`url(#${id}-arrow)`"/><path d="M395 143H456V116H499" class="arrow" :marker-end="`url(#${id}-arrow)`"/><rect x="509" y="87" width="173" height="49" rx="4" fill="#f0f8f2" stroke="#25B34B" stroke-width="2"/><text x="595" y="117" text-anchor="middle">Compare features</text>
    <text x="720" y="109" class="small">Known relation:</text><text x="720" y="131" class="small">same observation</text>
    <text x="16" y="221" class="strong" v-if="stage>=1">Predict hidden information</text>
    <g v-if="stage>=1">
      <text x="820" y="224" text-anchor="middle" class="small">Target y</text>
      <foreignObject x="16" y="233" width="55" height="55"><PixelObservation mode="masked" :size="55"/></foreignObject><text x="85" y="267" class="small">input x̃</text><path d="M165 258H199" class="arrow" :marker-end="`url(#${id}-arrow)`"/>
      <rect x="209" y="236" width="91" height="43" rx="4" class="encoder"/><text x="254" y="263" text-anchor="middle">fθ</text><path d="M305 258H341" class="arrow" :marker-end="`url(#${id}-arrow)`"/><text x="369" y="265">ψ</text><path d="M395 258H429" class="arrow" :marker-end="`url(#${id}-arrow)`"/>
      <rect x="439" y="236" width="95" height="43" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="486" y="263" text-anchor="middle">dω</text><path d="M540 258H574" class="arrow" :marker-end="`url(#${id}-arrow)`"/><text x="601" y="265">ŷ</text><path d="M629 258H656" class="arrow" :marker-end="`url(#${id}-arrow)`"/>
      <rect x="666" y="236" width="59" height="43" rx="4" fill="#fff1f1" stroke="#CF1C24"/><text x="695" y="263" text-anchor="middle" class="small">Loss</text><path d="M785 258H733" class="arrow" :marker-end="`url(#${id}-arrow)`"/><foreignObject x="793" y="233" width="55" height="55"><PixelObservation mode="target" :size="55"/></foreignObject>
    </g>
  </svg>
</template>
<style scoped>
.matching-prediction{height:300px}.arrow{fill:none;stroke:#334155;stroke-width:1.7}.encoder{fill:#edf7fa;stroke:#00BDF2;stroke-width:2}
</style>
