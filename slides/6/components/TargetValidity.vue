<script setup lang="ts">
import {measurements,binaryTarget} from '../utils/interaction.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="target-validity"><div class="validity-cases"><div><b>Traversée : erreur d’association</b><TerrainImage :samples="measurements.slice(0,3)" :offset="1" :show-true="true"/><div class="validity-chain">Erreur temporelle → mauvaise zone image<br>→ cible de la mauvaise observation</div></div><div><b>Meuble : erreur de mesure</b><CabinetScene/><div class="validity-chain">Ouverture réelle 0° · capteur : 35°<br>→ cible y = {{binaryTarget(35)}} pour une porte non ouverte</div></div></div>
  <div v-if="stage>=1" class="takeaway">Une cible automatique peut être fausse.</div>
  <div v-if="stage>=2" class="validity-selection"><div><b>Historique des actions tentées</b><div class="action-samples"><span class="tried-good">Anse / traction : y = 1</span><span class="tried-bad">Anse / poussée : y = 0</span><span>Autre contact / direction : non tenté</span></div></div><p>L’expérience sélectionnée laisse des lacunes dans les données.</p></div>
  <SSLControls/><div class="ssl-disclosure">Erreurs synthétiques voulues · aucun taux d’échec mesuré ni expérience ActAIM revendiqués</div>
 </div>
</template>
<style scoped>.validity-cases{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin:12px 0}.validity-cases b{font-size:17px}.validity-cases :deep(.terrain-image){margin-top:18px;height:115px}.validity-cases :deep(.cabinet-scene){height:140px}.validity-chain{font-size:15px;line-height:1.5;background:#fff3eb;border-left:3px solid #F15A22;padding:6px 10px;margin-top:10px}.target-validity .takeaway{font-size:17px;margin:12px 0}.validity-selection{font-size:15px}.action-samples{display:flex;gap:12px;margin-top:8px}.action-samples span{background:#edf0f3;padding:7px 9px;font-size:13px}.action-samples .tried-good{background:#eff9f2;color:#168034}.action-samples .tried-bad{background:#fff3eb;color:#b53d03}.validity-selection p{font-size:15px;margin:9px 0}.target-validity .ssl-disclosure{font-size:11px}</style>
