<script setup lang="ts">
import figure from '../images/dino-architecture.png'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
  <div class="dino-architecture"><svg class="dino-paper" viewBox="0 0 688 608" role="img" aria-label="DINO figure 2 principale originale, avec mises en évidence progressives"><image :href="figure" width="688" height="608"/><g fill="none" stroke="#00BDF2" stroke-width="5"><rect x="42" y="308" width="232" height="100" rx="5"/><rect x="411" y="307" width="236" height="101" rx="5"/></g><g v-if="stage>=1" fill="none" stroke="#F15A22" stroke-width="5"><rect x="410" y="232" width="236" height="65" rx="5"/><rect x="410" y="158" width="236" height="66" rx="5"/><rect x="42" y="158" width="232" height="66" rx="5"/></g><g v-if="stage>=2" fill="none" stroke="#a8161d" stroke-width="5"><rect x="480" y="110" width="137" height="51" rx="5"/><rect x="296" y="327" width="99" height="51" rx="5"/></g></svg>
    <div class="dino-translation"><b>Étudiant et enseignant : encodeur + tête</b><MathLine :formula="String.raw`g_{\theta_s}\leftrightarrow g_\phi\circ f_\theta`" small/><MathLine :formula="String.raw`g_{\theta_t}\leftrightarrow g_{\bar\phi}\circ f_{\bar\theta}`" small/><div v-if="stage>=1" class="architecture-callout">Centrer les sorties enseignantes, puis appliquer des températures softmax distinctes.</div><div v-if="stage>=2" class="architecture-callout">Couper le gradient enseignant; modifier ses paramètres par moyenne mobile.</div></div>
  </div>
  <div class="citation"><a href="https://arxiv.org/html/2104.14294v2">Caron et al. · DINO · ICCV 2021 · Fig. 2 principale</a></div>
  <SSLControls/>
</template>
<style scoped>.dino-architecture{display:grid;grid-template-columns:335px 1fr;gap:43px;align-items:center;margin:15px 23px 8px}.dino-paper{display:block;width:335px;height:296px}.dino-translation>b{font-size:19px;line-height:1.4;display:block;margin-bottom:10px}.architecture-callout{font-size:17px;line-height:1.4;border-left:3px solid #F15A22;padding:6px 11px;margin:10px 0}.paper-symbols{font-size:14px;line-height:1.5;color:#475569;margin-top:12px}</style>
