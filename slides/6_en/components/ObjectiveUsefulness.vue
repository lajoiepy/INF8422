<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {shortcutLoss,shortcutScore} from '../utils/evaluation.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),checkpoint=ref(4)
watch(()=>props.stage,()=>checkpoint.value=4)
const n=computed(()=>nav.isPrintMode.value?4:checkpoint.value)
const plot=(a:number[],max:number)=>a.map((v,i)=>[55+i*73,155-115*v/max].join(',')).join(' ')
</script>
<template>
 <div class="objective-usefulness" :data-checkpoint="n" :data-loss="shortcutLoss[n]" :data-task-score="shortcutScore[n]">
  <div class="illustrative-label">Constructed example · these curves are not an experimental result</div>
  <div class="objective-plots">
   <div><b>Training pretext loss ↓</b><svg class="ssl-svg objective-plot" viewBox="0 0 395 193" aria-label="Illustrative pretext training loss falls across five checkpoints"><path d="M55 30V155H358" class="ssl-forward"/><text x="44" y="160" text-anchor="end" class="small">0</text><text x="44" y="45" text-anchor="end" class="small">1.2</text><polyline :points="plot(shortcutLoss,1.2)" stroke="#CF1C24" stroke-width="3" fill="none"/><circle :cx="55+n*73" :cy="155-115*shortcutLoss[n]/1.2" r="5" fill="#CF1C24"/><text v-for="i in 5" :key="i" :x="55+(i-1)*73" y="177" text-anchor="middle" class="small">{{i-1}}</text></svg></div>
   <div :class="{pending:stage<1}"><b>Held-out downstream score ↑</b><svg class="ssl-svg objective-plot" viewBox="0 0 395 193" aria-label="Illustrative downstream score stays close to 0.6 while the pretext loss falls"><path d="M55 30V155H358" class="ssl-forward"/><text x="44" y="160" text-anchor="end" class="small">0</text><text x="44" y="45" text-anchor="end" class="small">1.0</text><polyline :points="plot(shortcutScore,1)" stroke="#00BDF2" stroke-width="3" fill="none"/><circle :cx="55+n*73" :cy="155-115*shortcutScore[n]" r="5" fill="#00BDF2"/><text v-for="i in 5" :key="i" :x="55+(i-1)*73" y="177" text-anchor="middle" class="small">{{i-1}}</text></svg></div>
  </div>
  <div class="objective-axis-label">Horizontal axes: optimization checkpoint n</div><div class="objective-readout">Optimization checkpoint n = {{n}} · pretext loss {{shortcutLoss[n].toFixed(2)}}<span v-if="stage>=1"> · downstream score {{shortcutScore[n].toFixed(2)}}</span></div>
  <div v-if="stage>=2" class="shortcut-strip"><div class="shortcut-views"><SampleImage/><SampleImage :brightness=".85"/></div><span>→</span><div class="background-feature" aria-label="Background-only feature swatch"/><div><b>Background-only features</b><span>Views agree, but handle position is lost.</span></div></div>
  <div class="takeaway">A lower pretext loss does not establish improvement on the intended robot task.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Checkpoint <input aria-label="Objective checkpoint" type="range" min="0" max="4" step="1" v-model.number="checkpoint"/>{{checkpoint}}</label></div>
  <SSLControls/><div class="ssl-disclosure">Illustrative values and the earlier background shortcut · not a universal relationship between loss and task performance</div>
 </div>
</template>
<style scoped>.illustrative-label{color:#b53d03;font-size:14px;font-weight:600;margin:11px 0}.objective-plots{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:8px 0 2px}.objective-plots b{font-size:16px}.objective-plot{height:115px}.objective-plot .small{font-size:20px}.pending{opacity:.15}.objective-axis-label{font-size:12px;text-align:center;color:#475569;margin:3px 0}.objective-readout{font-size:15px;background:#edf8fc;border-left:3px solid #00BDF2;padding:7px 10px;margin:7px 0}.shortcut-strip{display:flex;align-items:center;gap:25px;margin:10px 0;font-size:16px}.shortcut-strip span{display:block;font-size:14px;margin-top:3px}.background-feature{width:40px;height:40px;background:#e8c19f;border:2px solid #c2946c;border-radius:4px;flex-shrink:0}.shortcut-views{display:flex;gap:15px;padding:10px;background:#e8c19f;width:200px;height:65px}.shortcut-views :deep(.sample-image){height:45px;width:80px}.objective-usefulness .takeaway{font-size:16px;margin:9px 0}.objective-usefulness .ssl-parameter-controls{font-size:14px}.objective-usefulness .ssl-disclosure{font-size:11px}</style>
