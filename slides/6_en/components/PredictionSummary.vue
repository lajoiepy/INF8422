<script setup lang="ts">
import {targetUnion,maskSets} from '../utils/prediction.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="prediction-summary">
  <svg class="ssl-svg summary-paths" viewBox="0 0 860 285" role="img" aria-label="Aligned MAE and I-JEPA diagrams show pixel targets versus target-encoder features from the same original image">
   <text x="13" y="26" class="strong">MAE · pixel target</text><foreignObject x="13" y="39" width="183" height="61"><MaskedScene :hidden="maskSets().hidden"/></foreignObject><path d="M204 69H230" class="ssl-forward"/><rect x="239" y="45" width="105" height="47" rx="4" class="ssl-encoder"/><text x="291" y="75" text-anchor="middle">fθ</text><path d="M351 69H393" class="ssl-forward"/><rect x="401" y="45" width="110" height="47" rx="4" fill="#fff4ee" stroke="#F15A22"/><text x="456" y="75" text-anchor="middle">dω</text><text x="456" y="111" text-anchor="middle" class="small">Mask + position tokens</text><path d="M519 69H549" class="ssl-forward"/><text x="598" y="75" text-anchor="middle">x̂ₖ</text><text x="665" y="75" text-anchor="middle">↔</text><foreignObject x="707" y="39" width="140" height="47"><MaskedScene/></foreignObject><text x="777" y="111" text-anchor="middle" class="small">Observed pixels xₖ</text>
   <g v-if="stage>=1"><text x="13" y="155" class="strong">I-JEPA · feature target</text><foreignObject x="13" y="168" width="183" height="61"><MaskedScene :hidden="targetUnion"/></foreignObject><path d="M204 198H230" class="ssl-forward"/><rect x="239" y="174" width="105" height="47" rx="4" class="ssl-encoder"/><text x="291" y="204" text-anchor="middle">fθ</text><path d="M351 198H393" class="ssl-forward"/><rect x="401" y="174" width="110" height="47" rx="4" fill="#fff4ee" stroke="#F15A22"/><text x="456" y="204" text-anchor="middle">hβ</text><text x="456" y="240" text-anchor="middle" class="small">Target-position tokens</text><path d="M519 198H549" class="ssl-forward"/><text x="598" y="204" text-anchor="middle">ψ̂ₖ</text><text x="665" y="204" text-anchor="middle">↔</text><rect x="707" y="174" width="140" height="47" rx="4" fill="#eff8f1" stroke="#25B34B"/><text x="777" y="204" text-anchor="middle">sg(fθ̄(x)ₖ)</text><text x="727" y="240" text-anchor="middle" class="small">Targets across all image features</text></g>
  </svg><SSLControls/>
 </div>
</template>
<style scoped>.summary-paths{height:295px}</style>
