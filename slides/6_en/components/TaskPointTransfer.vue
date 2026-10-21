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
  <div class="grasp-transfer-paper"><img src="../images/don-grasp-tail.png" alt="Original Dense Object Nets Figure 6 i with user-selected tail reference and three grasps in different configurations"/><svg v-if="stage>=1" viewBox="0 0 828 267" aria-hidden="true"></svg></div>
  <div class="citation"><a href="https://arxiv.org/pdf/1806.08756v2">Florence et al., Dense Object Nets, CoRL 2018 · Fig. 6(i), tail, standard-so · arXiv v2</a></div>
 </div>
</template>
<style scoped>.grasp-transfer-paper{position:relative;margin:12px 0;width:100%}.grasp-transfer-paper img{width:100%;height:auto;display:block}.grasp-transfer-paper svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.grasp-transfer-flow{display:flex;align-items:center;gap:12px;padding:9px 12px;background:#eff8f1;border-left:3px solid #25B34B;font-size:15px}.grasp-transfer .ssl-caption{font-size:16px;margin:9px 0}</style>
