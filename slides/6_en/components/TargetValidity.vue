<script setup lang="ts">
import {measurements,binaryTarget} from '../utils/interaction.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
 <div class="target-validity"><div class="validity-cases"><div><b>Traversal: association error</b><TerrainImage :samples="measurements.slice(0,3)" :offset="1" :show-true="true"/><div class="validity-chain">Timestamp error → wrong image patch<br>→ a target for the wrong observation</div></div><div><b>Cabinet: measurement error</b><CabinetScene/><div class="validity-chain">Actual opening 0° · sensor reports 35°<br>→ target y = {{binaryTarget(35)}} for an unopened door</div></div></div>
  <div v-if="stage>=1" class="takeaway">A target can be generated automatically and still be wrong.</div>
  <div v-if="stage>=2" class="validity-selection"><div><b>Attempted action records</b><div class="action-samples"><span class="tried-good">Handle / pull: y = 1</span><span class="tried-bad">Handle / push: y = 0</span><span>Other contact / direction: unattempted</span></div></div><p>The robot's selected experience leaves gaps in the training data.</p></div>
  <SSLControls/><div class="ssl-disclosure">Deliberate synthetic failures · no claim that these are measured failure rates or a documented ActAIM experiment</div>
 </div>
</template>
<style scoped>.validity-cases{display:grid;grid-template-columns:1fr 1fr;gap:35px;margin:12px 0}.validity-cases b{font-size:17px}.validity-cases :deep(.terrain-image){margin-top:18px;height:115px}.validity-cases :deep(.cabinet-scene){height:140px}.validity-chain{font-size:15px;line-height:1.5;background:#fff3eb;border-left:3px solid #F15A22;padding:6px 10px;margin-top:10px}.target-validity .takeaway{font-size:17px;margin:12px 0}.validity-selection{font-size:15px}.action-samples{display:flex;gap:12px;margin-top:8px}.action-samples span{background:#edf0f3;padding:7px 9px;font-size:13px}.action-samples .tried-good{background:#eff9f2;color:#168034}.action-samples .tried-bad{background:#fff3eb;color:#b53d03}.validity-selection p{font-size:15px;margin:9px 0}.target-validity .ssl-disclosure{font-size:11px}</style>
