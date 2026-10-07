<script setup lang="ts">
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="actaim-schematic"><div class="actaim-inputs"><div><b>Profondeur initiale D₀</b><CabinetScene :muted="true"/></div><div><b>Exécuter l’action en simulation</b><div class="actaim-action">Point de contact p<br>Orientation de pince R<br>Direction de mouvement F</div></div><div><b>Profondeur ultérieure D₁</b><CabinetScene :angle="55" :muted="true" :show-gripper="true"/></div></div>
  <div v-if="stage>=1" class="actaim-change"><span>Encoder les profondeurs avant / après</span><span>→</span><span>Seuil de changement de plongement</span><span>→</span><b>Étiquette automatique d’interaction</b></div>
  <div v-if="stage>=2" class="actaim-modes"><div><b>Apprendre des modes d’interaction</b><span>Modèle latent + géométrie locale</span></div><span>→</span><div><b>Proposer des actions</b><span>Où et comment interagir</span></div></div>
  <div class="ssl-caption">L’article apprend une distribution d’interactions produisant un changement visuel.</div>
  <div class="small-note">Un changement ne spécifie pas à lui seul « ouvrir cette porte de 30° ».</div>
  <SSLControls/><div class="ssl-disclosure">Schéma de la méthode vérifiée · meubles illustrant la profondeur; aucun modèle ActAIM exécuté</div>
  <div class="citation"><a href="https://arxiv.org/pdf/2305.17565v1">Wang et al., ActAIM, ICRA 2023 · Sections III, IV-A/B, V-A · arXiv v1</a></div>
 </div>
</template>
<style scoped>.actaim-inputs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;align-items:center;margin:12px 0}.actaim-inputs b{font-size:16px}.actaim-inputs :deep(.cabinet-scene){height:140px}.actaim-action{font-size:17px;line-height:1.8;margin-top:16px;border-left:3px solid #F15A22;padding-left:12px}.actaim-change{display:flex;gap:14px;align-items:center;background:#eff9f2;padding:8px 12px;border-left:3px solid #25B34B;font-size:15px}.actaim-modes{display:flex;align-items:center;gap:25px;margin:12px 0;font-size:16px}.actaim-modes div{padding:8px 14px;border:1px solid #cbd5e1;flex:1}.actaim-modes span{display:block;font-size:14px;margin-top:3px}.actaim-schematic .ssl-caption{font-size:16px;margin:10px 0}.actaim-schematic .small-note{font-size:14px;margin:8px 0}.actaim-schematic .ssl-disclosure{font-size:11px}</style>
