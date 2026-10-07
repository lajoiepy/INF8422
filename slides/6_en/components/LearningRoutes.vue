<script setup lang="ts">
withDefaults(defineProps<{mode?:'pretraining'|'direct'|'deployment';stage?:number}>(),{mode:'pretraining',stage:0})
</script>
<template>
  <div v-if="mode==='pretraining'" class="learning-routes">
    <div class="route-line"><PixelObservation mode="masked" :size="70"/><span class="route-arrow">→</span><div class="route-network"><strong>Encoder fθ</strong><small>Learn a representation</small></div><span class="route-arrow">→</span><div><strong>Pretext prediction</strong><small>Target from the data</small></div></div>
    <div class="transfer-link">Reuse the learned encoder</div>
    <div class="route-line" :class="{subdued:stage<1}"><PixelObservation :size="70"/><span class="route-arrow">→</span><div class="route-network"><strong>Encoder fθ</strong><small>Frozen or adapted</small></div><span class="route-arrow">→</span><div class="route-network task"><strong>Task head hβ</strong><small>Object category, for example</small></div></div>
    <div class="annotation-entry" :class="{subdued:stage<1}">Manual task labels can enter here for adaptation or evaluation.</div>
  </div>
  <div v-else-if="mode==='direct'" class="direct-learning">
    <div class="direct-timeline"><span>See the terrain</span><span>Execute a known fixed motion</span><span>Measure the outcome</span></div>
    <svg class="terrain-sketch intro-svg" viewBox="0 0 840 100" role="img" aria-label="Robot sees a terrain patch, moves over it and measures motion tracking">
      <path d="M10 69H825" stroke="#94a3b8" stroke-width="2"/><path d="M190 69H438" stroke="#b4cf9b" stroke-width="18"/><path d="M46 32L296 69L46 69Z" fill="#edf7fa" stroke="#00BDF2"/><rect x="28" y="31" width="44" height="25" rx="3" fill="#333"/><circle cx="38" cy="61" r="8" fill="#333"/><circle cx="61" cy="61" r="8" fill="#333"/>
      <g :opacity="stage>=1?1:.14"><rect x="320" y="31" width="44" height="25" rx="3" fill="#333"/><circle cx="330" cy="61" r="8" fill="#333"/><circle cx="353" cy="61" r="8" fill="#333"/><path d="M376 38H458L448 32M458 38L448 44" stroke="#F15A22" stroke-width="2" fill="none"/><text x="590" y="25">Commanded speed: 1.0 m/s</text><text x="590" y="50">Measured speed: 0.6 m/s</text></g>
    </svg>
    <div class="direct-target" :class="{subdued:stage<2}"><strong>Automatic target</strong><span>Illustrative cost = 1 − measured / commanded = <b>0.4</b></span></div>
    <div class="route-line direct-prediction" :class="{subdued:stage<2}"><span>Earlier camera image</span><span class="route-arrow">→</span><div class="route-network"><strong>Encoder + task head</strong></div><span class="route-arrow">→</span><span>Predicted traversal cost</span></div>
  </div>
  <div v-else class="deployment-route"><PixelObservation :size="70"/><span class="route-arrow">→</span><div class="route-network"><strong>Encoder fθ</strong></div><span class="route-arrow">→</span><div class="route-network task"><strong>Task head hβ</strong></div><span class="route-arrow">→</span><span>Task output</span></div>
</template>
<style scoped>
.learning-routes{margin:22px 0}.route-line,.deployment-route{display:flex;align-items:center;justify-content:space-between;gap:14px;font-size:19px;min-height:78px}.route-line small{display:block;font-size:16px;color:#475569;margin-top:5px}.route-network{padding:12px 18px;border-top:3px solid #00BDF2;background:#edf7fa;border-radius:4px}.route-network.task{border-color:#F15A22;background:#fff4ee}.route-arrow{font-size:28px;color:#475569}.transfer-link{margin:14px 0 14px 265px;border-left:2px dashed #00BDF2;padding:10px 14px;font-size:16px;color:#475569}.annotation-entry{border-left:3px solid #F15A22;margin:12px 0 0 488px;padding-left:12px;font-size:15px;max-width:325px}.subdued{opacity:.13}.direct-timeline{display:flex;justify-content:space-between;font-size:18px;font-weight:600;margin:20px 15px 5px}.terrain-sketch{width:100%;height:125px}.direct-target{display:flex;gap:20px;align-items:center;border-left:3px solid #1b7b37;padding:10px 14px;margin:12px 0;font-size:18px;background:#eff8f1}.direct-prediction{margin:18px 0;font-size:18px}.deployment-route{margin-top:10px;font-size:17px}
</style>
