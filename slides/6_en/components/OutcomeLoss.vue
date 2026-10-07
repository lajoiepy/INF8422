<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {binaryLoss} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),estimate=ref(.4),logit=ref(Math.log(4)),success=ref(1),id=useId()
watch(()=>props.stage,()=>{estimate.value=.4;logit.value=Math.log(4);success.value=1})
const classification=computed(()=>props.stage>=2),prediction=computed(()=>classification.value?1/(1+Math.exp(-(nav.isPrintMode.value?Math.log(4):logit.value))):nav.isPrintMode.value?.4:estimate.value)
const target=computed(()=>classification.value?nav.isPrintMode.value?1:success.value:.75),loss=computed(()=>classification.value?binaryLoss(nav.isPrintMode.value?Math.log(4):logit.value,target.value):(prediction.value-target.value)**2)
const formula=computed(()=>classification.value?'\\widehat y=\\operatorname{sigmoid}(b),\\quad\\ell=-y\\log\\widehat y-\\left(1-y\\right)\\log\\left(1-\\widehat y\\right)':'\\ell_{\\mathrm{reg}}=(\\widehat y-y)^2')
</script>
<template>
 <div class="outcome-loss" :data-classification="classification" :data-prediction="prediction" :data-target="target" :data-loss="loss">
  <div class="loss-source"><div v-if="classification"><CabinetScene :angle="success?55:0"/></div><div v-else><TerrainImage/><div>Commanded 1.00 m/s · measured 0.25 m/s</div></div><div><b>{{classification?'Binary task outcome':'Continuous measured cost'}}</b><p>{{classification?'Rule Γ: measured opening ≥ 30°':'Rule Γ: clip(1 − measured / commanded)'}}</p><div class="loss-target">Automatic target y = {{target}}</div></div></div>
  <svg class="ssl-svg loss-pair" viewBox="0 0 860 80" role="img" aria-label="Task head prediction and automatically measured target meet at the same comparison loss">
   <defs><marker :id="id+'-arrow'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="id+'-target-arrow'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#25B34B"/></marker></defs>
   <rect x="15" y="12" width="158" height="46" rx="4" class="ssl-head"/><text x="94" y="41" text-anchor="middle">Task head hβ</text>
   <path d="M178 35H222" class="ssl-forward" :marker-end="'url(#'+id+'-arrow)'"/><text x="235" y="41">{{classification?'Probability':'Predicted cost'}} ŷ = {{prediction.toFixed(3)}}</text>
   <path d="M515 35H561" class="ssl-forward" :marker-end="'url(#'+id+'-arrow)'"/><rect x="569" y="12" width="95" height="46" rx="4" class="ssl-loss"/><text x="616" y="41" text-anchor="middle">Loss</text>
   <text x="720" y="41" fill="#168034">Target y</text><path d="M703 35H670" class="ssl-target" :marker-end="'url(#'+id+'-target-arrow)'"/>
  </svg>
  <MathLine v-if="stage>=1" :formula="formula" small/>
  <div class="loss-value">Computed {{classification?'binary cross-entropy':'squared error'}}: {{loss.toFixed(4)}}</div>
  <div class="ssl-caption">Choose a loss for the target type; self-supervision comes from how y was obtained.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label v-if="!classification">Predicted cost <input aria-label="Predicted cost" type="range" min="0" max="1" step=".05" v-model.number="estimate"/>{{estimate.toFixed(2)}}</label><template v-else><label>Head logit b <input aria-label="Outcome logit" type="range" min="-3" max="3" step=".25" v-model.number="logit"/>{{logit.toFixed(2)}}</label><label>Measured outcome <select aria-label="Measured binary outcome" v-model.number="success" @change="($event.target as HTMLElement).blur()"><option :value="1">Opened ≥ 30°</option><option :value="0">Did not open</option></select></label></template></div>
  <SSLControls/><div class="ssl-disclosure">Generic scalar objectives and computed examples · these are not the full WVN or ActAIM objectives</div>
 </div>
</template>
<style scoped>.loss-source{display:grid;grid-template-columns:290px 1fr;gap:35px;align-items:center;margin:10px 0}.loss-source :deep(.cabinet-scene){height:135px}.loss-source :deep(.terrain-image){height:110px}.loss-source div{font-size:16px}.loss-source p{font-size:16px;margin:12px 0}.loss-target{color:#168034}.loss-pair{height:75px}.loss-value{padding:8px 11px;background:#fff3eb;border-left:3px solid #F15A22;font-size:17px}.outcome-loss .ssl-caption{font-size:16px;margin:10px 0}.ssl-head{fill:#fff3eb;stroke:#F15A22;stroke-width:1.5}.ssl-loss{fill:#fff1f1;stroke:#CF1C24;stroke-width:1.5}.ssl-target{fill:none;stroke:#25B34B;stroke-width:2}.outcome-loss .ssl-parameter-controls{display:flex;align-items:center;gap:24px}.outcome-loss .ssl-parameter-controls label{display:flex;align-items:center;gap:8px}.outcome-loss .ssl-disclosure{font-size:11px}</style>
