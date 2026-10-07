<script setup lang="ts">
import figure from '../images/ijepa-architecture.png'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="predictive-architecture">
  <div class="jepa-paper"><img :src="figure" alt="I-JEPA figure 3 originale : contexte, prédicteur conditionné par positions et encodeur cible complet"/></div>
  <SSLControls/><div class="citation"><a href="https://arxiv.org/html/2301.08243v3">Assran et al., I-JEPA, CVPR 2023 · Fig. 3 · arXiv v3</a> </div>
 </div>
</template>
<style scoped>.jepa-paper{display:grid;grid-template-columns:365px 1fr;gap:37px;height:355px}.jepa-paper img{height:355px;max-width:100%;object-fit:contain;margin:auto}.jepa-roles{display:flex;flex-direction:column;gap:12px;padding-top:10px}.role{font-size:17px;border-left:4px solid;padding:7px 12px;background:#f8fafc}.role p{font-size:16px;margin:4px 0}.context{border-color:#00BDF2}.predictor{border-color:#F15A22}.target{border-color:#25B34B}</style>
