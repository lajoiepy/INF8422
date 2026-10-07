<script setup lang="ts">
withDefaults(defineProps<{mode?:'definition'|'settings'|'examples';stage?:number}>(),{mode:'definition',stage:0})
</script>
<template>
  <div v-if="mode==='definition'" class="origin-pipelines">
    <div class="origin-observation"><PixelObservation :size="110"/><span>Même observation</span></div>
    <div class="origin-branches">
      <div class="origin-row"><span class="origin-arrow">→</span><span>Prédire une étiquette d’objet</span><span class="origin-arrow">←</span><div class="target-label manual"><strong>« objet »</strong><small>Annotation humaine</small></div></div>
      <div class="origin-row" :class="{subdued:stage<1}"><span class="origin-arrow">→</span><span>Prédire les pixels masqués</span><span class="origin-arrow">←</span><div class="target-label automatic"><PixelObservation mode="target" :size="69"/><small>Copiée de l’observation</small></div></div>
    </div>
  </div>
  <div v-else-if="mode==='settings'" class="settings-diagram">
    <div class="setting-row"><strong>Supervisé</strong><PixelObservation :size="57"/><span>Exemples annotés manuellement</span><span class="origin-arrow">→</span><span>Perte sur annotations</span></div>
    <div class="setting-row" :class="{subdued:stage<1}"><strong>Auto-supervisé</strong><PixelObservation :size="57"/><span>Cibles construites automatiquement</span><span class="origin-arrow">→</span><span>Perte issue des données</span></div>
    <div class="setting-row" :class="{subdued:stage<2}"><strong>Semi-supervisé</strong><PixelObservation :size="57"/><span>Exemples étiquetés + non étiquetés</span><span class="origin-arrow">→</span><span>Termes supervisés + non étiquetés</span></div>
  </div>
  <div v-else class="target-examples">
    <div class="example-row"><div><PixelObservation mode="masked" :size="68"/></div><div><strong>Prédiction de pixels masqués</strong><small>Entrée : information visible</small></div><span class="origin-arrow">→</span><div><strong>Pixels observés retirés</strong><small>Cible : sélection de l’image originale</small></div></div>
    <div class="example-row" :class="{subdued:stage<1}"><div class="paired-views"><PixelObservation :size="43"/><PixelObservation :size="43" style="filter:brightness(.7)"/></div><div><strong>Appariement de vues liées</strong><small>Entrée : deux images donc on connaît la relation</small></div><span class="origin-arrow">→</span><div><strong>Une association connue</strong><small>Cible : relation connue (ex: rotation, translation, chevauchement)</small></div></div>
    <div class="example-row" :class="{subdued:stage<2}"><div><PixelObservation :size="68"/></div><div><strong>Prédiction directe du résultat</strong><small>Entrée : observation avant l’action</small></div><span class="origin-arrow">→</span><div><strong>Coût de traversée mesuré : 0.4</strong><small>Cible : mesures après l'action</small></div></div>
  </div>
</template>
<style scoped>
.origin-pipelines{display:flex;gap:22px;align-items:center;margin:24px 0 18px;min-height:195px}.origin-observation{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:16px;min-width:155px}.origin-branches{flex:1}.origin-row{display:grid;grid-template-columns:24px 220px 24px 1fr;gap:12px;align-items:center;margin:15px 0;font-size:18px;min-height:79px}.origin-arrow{font-size:25px;color:#475569}.target-label{border-left:3px solid #F15A22;padding-left:14px;display:flex;align-items:center;gap:13px}.target-label small{font-size:14px;line-height:1.35}.automatic{border-color:#1b7b37}.settings-diagram{margin:22px 0}.setting-row{display:grid;grid-template-columns:157px 67px 285px 26px 1fr;align-items:center;gap:12px;min-height:88px;border-bottom:1px solid #e2e8f0;font-size:16px}.setting-row strong{color:#333;font-size:18px}.target-examples{margin:17px 0}.example-row{display:grid;grid-template-columns:100px 310px 28px 1fr;gap:14px;align-items:center;min-height:94px;border-bottom:1px solid #e2e8f0}.example-row strong{font-size:18px}.example-row small{display:block;font-size:15px;color:#475569;margin-top:4px;line-height:1.35}.paired-views{display:flex;gap:8px}.outcome-symbol{font-size:32px;color:#1b7b37;font-weight:600;text-align:center}.subdued{opacity:.13}
</style>
