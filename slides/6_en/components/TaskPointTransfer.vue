<script setup lang="ts">
import {computed,useId} from 'vue'
import {useNav} from '@slidev/client'
import {useStageTransition} from '../utils/useStageTransition'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const id=useId(),nav=useNav(),transition=useStageTransition(()=>props.stage)
const progress=computed(()=>nav.isPrintMode.value?1:transition.fraction.value)
</script>
<template>
 <div class="grasp-transfer" :data-stage="stage" :data-progress="progress">
  <div class="grasp-transfer-paper"><img src="../images/don-grasp-tail.png" alt="Original Dense Object Nets Figure 6 i with user-selected tail reference and three grasps in different configurations"/><svg v-if="stage>=1" viewBox="0 0 828 267" aria-hidden="true"><defs><marker :id="`${id}-match`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#168034"/></marker></defs><path d="M206 60H441V86" fill="none" stroke="#168034" stroke-width="3" pathLength="1" stroke-dasharray="1" :stroke-dashoffset="1-progress" :marker-end="`url(#${id}-match)`"/></svg></div>
  <div class="grasp-transfer-flow"><span>User specifies a task pixel</span><span v-if="stage>=1">→ Descriptor match in a new image</span><span v-if="stage>=2">→ Depth + grasp geometry</span></div>
  <div class="ssl-caption">{{stage>=2?'The matched image point is a perception input to grasp planning.':'Task-point selection is distinct from labeling the training correspondences.'}}</div>
  <SSLControls :replay="stage>=1" :playing="transition.playing.value" @play="transition.replay" @step="transition.step" @reset="transition.reset"/><div class="citation"><a href="https://arxiv.org/pdf/1806.08756v2">Florence et al., Dense Object Nets, CoRL 2018 · Fig. 6(i), tail, standard-so · arXiv v2</a></div>
 </div>
</template>
<style scoped>.grasp-transfer-paper{position:relative;margin:12px 0;width:100%}.grasp-transfer-paper img{width:100%;height:auto;display:block}.grasp-transfer-paper svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.grasp-transfer-flow{display:flex;align-items:center;gap:12px;padding:9px 12px;background:#eff8f1;border-left:3px solid #25B34B;font-size:15px}.grasp-transfer .ssl-caption{font-size:16px;margin:9px 0}</style>
