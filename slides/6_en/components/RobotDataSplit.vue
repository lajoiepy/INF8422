<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {runs,assignedFrames,splitDiagnostics} from '../utils/evaluation.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),mode=ref('frame')
const fixed=()=>['frame','trajectory','environment'][Math.min(2,props.stage)]
mode.value=fixed();watch(()=>props.stage,()=>mode.value=fixed())
const selected=computed(()=>nav.isPrintMode.value?fixed():mode.value),frames=computed(()=>assignedFrames(selected.value)),audit=computed(()=>splitDiagnostics(frames.value))
const colors={train:'#d4eafa',validation:'#ffe0cc',test:'#d4efdc'},letters={train:'T',validation:'V',test:'E'}
const role=(row:number,t:number)=>frames.value[row*8+t].role
const caption=computed(()=>selected.value==='frame'?'Adjacent frames from the same recording appear on both sides of the test boundary.':selected.value==='trajectory'?'Whole runs are separated, but Hall and Lab still occur in both train and test.':'Whole environments are separated in these metadata; verify the actual recordings too.')
</script>
<template>
 <div class="robot-data-split" :data-mode="selected" :data-adjacent="audit.adjacent" :data-trajectory-overlap="audit.trajectories.length" :data-environment-overlap="audit.environments.length" :data-assignment="JSON.stringify(frames.map(f=>f.role))">
  <div class="split-legend"><span>T · Train</span><span>V · Validation</span><span>E · Test / evaluation</span><em>Time advances →</em></div>
  <svg class="ssl-svg split-recordings" viewBox="0 0 860 276" role="img" aria-label="Six eight-frame robot recordings are assigned by individual frames, complete trajectories, or complete environments">
   <text v-for="t in 8" :key="t" :x="204+(t-1)*82" y="15" text-anchor="middle" class="small">t{{t}}</text>
   <g v-for="(run,k) in runs" :key="run.id" :transform="'translate(0 '+(23+k*40)+')'"><text x="2" y="24" class="small">Run {{run.id}} · {{run.environment}}</text><path d="M164 20H824" stroke="#cbd5e1"/>
    <g v-for="t in 8" :key="t" :transform="'translate('+(170+(t-1)*82)+' 0)'"><rect x="0" y="2" width="68" height="33" rx="3" :fill="colors[role(k,t-1)]" stroke="#94a3b8"/><text x="11" y="24" class="small">{{letters[role(k,t-1)]}}</text><path d="M31 27H59" stroke="#64748b"/><rect :x="33+(t-1)*2" y="12" width="10" height="10" rx="2" fill="#475569"/><path :d="'M'+(45+(t-1)*2)+' 14l8 -3v8Z'" fill="#00BDF2"/></g>
   </g>
  </svg>
  <div class="split-audit">Train/test audit · adjacent pairs: <b>{{audit.adjacent}}</b> · shared trajectories: <b>{{audit.trajectories.length}}</b> · shared environments: <b>{{audit.environments.length}}</b></div>
  <div class="ssl-caption">{{caption}}</div>
  <div v-if="stage>=2" class="split-protocol">Choose the split for the claim: new run, recording session, object, or environment.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Split unit <select aria-label="Robot data split unit" v-model="mode" @change="($event.target as HTMLElement).blur()"><option value="frame">Individual frames</option><option value="trajectory">Whole trajectories</option><option value="environment">Whole environments</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Synthetic recording metadata · zero displayed overlap is not proof that all information leakage is absent</div>
  <div class="citation"><a href="https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data">scikit-learn · grouped-data evaluation; robot grouping shown here is illustrative</a></div>
 </div>
</template>
<style scoped>.split-legend{display:flex;gap:22px;font-size:14px;margin:12px 0 5px}.split-legend span{padding:3px 8px;border-radius:3px}.split-legend span:nth-child(1){background:#d4eafa}.split-legend span:nth-child(2){background:#ffe0cc}.split-legend span:nth-child(3){background:#d4efdc}.split-legend em{margin-left:auto;font-style:normal;color:#64748b}.split-recordings{height:195px}.split-recordings .small{font-size:16px}.split-audit{font-size:15px;background:#edf8fc;padding:7px 10px;border-left:3px solid #00BDF2}.robot-data-split .ssl-caption{font-size:15px;margin:9px 0}.split-protocol{font-size:14px;line-height:1.5;margin:8px 0}.robot-data-split .ssl-parameter-controls{font-size:14px}.robot-data-split .ssl-disclosure{font-size:11px}</style>
