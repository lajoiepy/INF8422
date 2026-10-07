<script setup lang="ts">
import { stageScene } from '../utils/representationScene.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const original=stageScene('identity',0),dimmed=stageScene('identity',1)
</script>
<template>
  <div class="augmentation-assumptions">
    <div class="augmentation-view"><div class="view-label">Original observation x</div><MugScene :scene="original" grasp/><div class="augmentation-outcome">Handle visible</div></div>
    <div class="augmentation-view"><div class="view-label">Change illumination</div><MugScene :scene="dimmed" grasp/><div class="augmentation-outcome useful">Grasp location is preserved</div></div>
    <div class="augmentation-view" :class="{pending:stage===0}"><div class="view-label">Crop away the handle</div><MugScene :scene="original" crop/><div class="augmentation-outcome harmful">Required evidence is removed</div></div>
  </div>
  <div class="augmentation-disclosure">Custom mug example · task: locate a grasp on the handle in image coordinates</div>
</template>
<style scoped>
.augmentation-assumptions{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin:20px 0 14px}.view-label{font-size:17px;font-weight:600;margin-bottom:9px}.augmentation-outcome{font-size:16px;margin-top:12px}.useful{color:#1b7b37}.harmful{color:#9d4312}.augmentation-disclosure{font-size:14px;color:#475569;margin:13px 0}.pending{visibility:hidden}
</style>
