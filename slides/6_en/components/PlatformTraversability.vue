<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {platformTrials,measuredCost} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),patch=ref('mud')
watch(()=>props.stage,()=>patch.value='mud')
const selected=computed(()=>nav.isPrintMode.value?'mud':patch.value),trial=computed(()=>platformTrials[selected.value])
</script>
<template>
 <div class="platform-traversability" :data-patch="selected" :data-wheel-cost="measuredCost(1,trial.wheels)" :data-track-cost="measuredCost(1,trial.tracks)">
  <div class="platform-patch"><TerrainImage :highlight-band="selected"/><div>Same selected {{selected}} patch · same 1.00 m/s command</div></div>
  <div class="platform-comparison"><div v-for="robot in [{key:'wheels',name:'Narrow wheels / controller A'},{key:'tracks',name:'Broad tracks / controller B'}]" :key="robot.key" class="platform-card"><svg class="ssl-svg platform-robot" viewBox="0 0 180 86" aria-hidden="true"><rect x="39" y="18" width="102" height="35" rx="6" fill="#333"/><g v-if="robot.key==='wheels'" fill="#64748b"><circle cx="49" cy="60" r="14"/><circle cx="131" cy="60" r="14"/></g><g v-else><rect x="28" y="47" width="124" height="29" rx="13" fill="#64748b"/><path d="M42 59H138M42 67H138" stroke="#e2e8f0" stroke-width="3"/></g></svg><b>{{robot.name}}</b><div v-if="stage>=1">Measured {{trial[robot.key].toFixed(2)}} m/s</div><div v-if="stage>=2" class="platform-cost">Automatic cost: {{measuredCost(1,trial[robot.key]).toFixed(2)}}</div></div></div>
  <div class="takeaway">Traversability depends on the platform, controller, action, and outcome rule.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Trial patch <select aria-label="Trial terrain patch" v-model="patch" @change="($event.target as HTMLElement).blur()"><option value="grass">Grass</option><option value="gravel">Gravel</option><option value="mud">Mud</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Illustrative trial records · terrain names do not define universal class-to-cost values</div>
 </div>
</template>
<style scoped>.platform-patch{display:flex;align-items:center;gap:28px;font-size:18px;margin:10px 0 16px}.platform-patch :deep(.terrain-image){width:230px;height:95px}.platform-comparison{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:14px}.platform-card{background:#f8fafc;padding:10px 16px;font-size:17px;line-height:1.5}.platform-robot{height:65px;width:180px;margin-bottom:6px}.platform-cost{color:#b53d03;font-weight:600}.platform-traversability .takeaway{font-size:18px;margin:12px 0}.platform-traversability .ssl-parameter-controls{font-size:14px}</style>
