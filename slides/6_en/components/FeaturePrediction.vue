<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {blocks,targetUnion,contextIndices,initialFeatureModel,featureStats,featureGradientStep,featureEMA} from '../utils/prediction.mjs'
const props=withDefaults(defineProps<{mode?:'features'|'positions'|'updates';stage?:number}>(),{mode:'features',stage:0})
const nav=useNav(),id=useId(),selected=ref(0),model=ref({...initialFeatureModel}),cycles=ref(0),phase=ref('gradient'),mu=ref(.8),operation=ref('Teaching state')
const staged=()=>{let m={...initialFeatureModel};if(props.mode==='updates'&&props.stage>=2)m=featureGradientStep(m,blocks[selected.value].indices).next;if(props.mode==='updates'&&props.stage>=3)m=featureEMA(m,mu.value);return m}
const reset=()=>{selected.value=0;mu.value=.8;model.value=staged();cycles.value=0;phase.value='gradient';operation.value='Teaching state'}
reset()
const advance=()=>{if(phase.value==='gradient'){model.value=featureGradientStep(model.value,blocks[selected.value].indices).next;phase.value='ema';operation.value='Gradient update: θ and β'}else{model.value=featureEMA(model.value,mu.value);phase.value='gradient';cycles.value++;operation.value='EMA update: θ̄ only'}return cycles.value<6}
const {playing}=usePlayback(advance,reset,650)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const changeTarget=()=>{playing.value=false;cycles.value=0;phase.value='gradient';model.value=staged();operation.value='Teaching state'}
watch(mu,()=>{if(cycles.value===0&&operation.value==='Teaching state')model.value=staged()})
const visible=computed(()=>nav.isPrintMode.value?staged():model.value)
const block=computed(()=>blocks[selected.value]),stats=computed(()=>featureStats(visible.value,block.value.indices))
const fmt=(v:number[])=>`[${v.map(x=>x.toFixed(2)).join(', ')}]`
const formula=computed(()=>props.mode==='positions'?String.raw`\widehat{\boldsymbol{\psi}}_k=h_\beta(f_\theta(x_{\mathcal V}),k)`:props.stage===0?String.raw`\mathcal L_{\mathrm{feature}}=\frac{1}{|\mathcal M|}\sum_{k\in\mathcal M}\|\widehat{\boldsymbol{\psi}}_k-\boldsymbol{\psi}_k^{\mathrm{target}}\|_2^2`:props.stage===1?String.raw`\boldsymbol{\psi}_k^{\mathrm{target}}=\operatorname{sg}(f_{\bar\theta}(x)_k)`:props.stage===2?String.raw`(\theta,\beta)_{n+1}=(\theta,\beta)_n-\eta\nabla_{(\theta,\beta)}\mathcal L_{\mathrm{feature}}`:String.raw`\bar\theta_{n+1}=\mu\bar\theta_n+(1-\mu)\theta_{n+1}`)
const toggle=()=>{if(!playing.value&&cycles.value>=6)reset();playing.value=!playing.value}
</script>
<template>
 <div class="feature-prediction" :data-mode="mode" :data-stage="stage" :data-block="selected" :data-context="JSON.stringify(contextIndices)" :data-targets="JSON.stringify(block.indices)" :data-prediction="JSON.stringify(stats.predictions)" :data-target="JSON.stringify(stats.targets)" :data-loss="stats.loss" :data-theta="visible.theta" :data-psi="visible.psi" :data-target-theta="visible.targetTheta" :data-phase="phase" :data-cycles="cycles" :data-mu="mu">
  <template v-if="mode==='positions'">
   <div class="feature-images"><figure><figcaption>Original · spatial target blocks A, B, C</figcaption><MaskedScene target-blocks :selected="selected"/></figure><figure><figcaption>Context V · every target region removed</figcaption><MaskedScene :hidden="targetUnion" target-blocks :selected="selected"/></figure></div>
   <svg class="ssl-svg position-path" viewBox="0 0 860 135" role="img" aria-label="Target position tokens select a block to predict from a fixed context">
    <rect x="15" y="40" width="125" height="46" rx="4" class="ssl-encoder"/><text x="78" y="69" text-anchor="middle">Context fθ</text><path d="M148 63H180" class="ssl-forward"/><text x="195" y="69">ψV</text>
    <g v-for="(b,j) in blocks" :key="j" :opacity="stage===0? .25 : selected===j?1:.45"><rect :x="288+j*53" y="7" width="39" height="29" rx="3" :fill="b.color"/><text :x="307+j*53" y="28" text-anchor="middle" style="fill:white">{{b.name}}</text></g>
    <text x="470" y="27" class="small">Position tokens</text><path v-if="stage>=1" d="M366 37V44" class="ssl-forward"/>
    <path d="M230 63H280" class="ssl-forward"/><rect x="290" y="44" width="155" height="46" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="367" y="74" text-anchor="middle">Predictor hβ</text><g v-if="stage>=2"><path d="M453 64H504" class="ssl-forward"/><text x="520" y="71">Block {{block.name}}: {{fmt(stats.predictions[0])}}</text></g>
    <text x="430" y="119" text-anchor="middle" class="small">A position token identifies where to predict; it contains no hidden pixels.</text>
   </svg>
   <MathLine :formula="formula" small/>
  </template>
  <template v-else>
   <svg class="ssl-svg feature-diagram" viewBox="0 0 860 229" role="img" aria-label="Context encoder and predictor generate features; full-image target encoder generates selected target features">
    <defs><marker :id="`${id}-forward`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="`${id}-grad`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a8161d"/></marker><marker :id="`${id}-ema`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7c3d8d"/></marker></defs>
    <foreignObject x="8" y="36" width="202" height="68"><MaskedScene :hidden="targetUnion" target-blocks :selected="selected"/></foreignObject><text x="108" y="24" text-anchor="middle" class="small">Context xV</text><path d="M218 70H249" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><rect x="259" y="46" width="129" height="47" rx="4" class="ssl-encoder"/><text x="323" y="75" text-anchor="middle">Context fθ</text><path d="M395 70H437" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><rect x="448" y="46" width="130" height="47" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="513" y="75" text-anchor="middle">{{mode==='features'&&stage===0?'Decoder dω':'Predictor hβ'}}</text>
    <g v-if="mode==='features'?stage>=1:true"><path d="M513 35V43" class="ssl-forward"/><text x="513" y="25" text-anchor="middle" class="small">Target positions k</text></g>
    <path d="M585 70H626" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><text x="652" y="59" class="small">{{mode==='features'&&stage===0?'Pixel prediction':'Feature prediction'}}</text><text x="652" y="82">{{mode==='features'&&stage===0?'x̂ₖ':fmt(stats.predictions[0])}}</text>
    <foreignObject x="8" y="141" width="202" height="68"><MaskedScene target-blocks :selected="selected"/></foreignObject><text x="108" y="130" text-anchor="middle" class="small">Full original image x</text>
    <g v-if="mode==='features'?stage>=2:true"><path d="M218 175H249" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><rect x="259" y="151" width="129" height="47" rx="4" fill="#eff8f1" stroke="#25B34B" stroke-width="2"/><text x="323" y="180" text-anchor="middle">Target fθ̄</text><path d="M395 175H448" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><text x="513" y="166" text-anchor="middle" class="small">Select target block</text><text x="513" y="190" text-anchor="middle">{{block.name}}</text><path d="M578 175H626" class="ssl-forward" :marker-end="`url(#${id}-forward)`"/><text x="652" y="164" class="small">Target features</text><text x="652" y="187">{{fmt(stats.targets[0])}}</text></g>
    <text v-else x="323" y="180">{{stage===0?'Target: original pixel values xₖ':'Compute a target in feature space next.'}}</text>
    <g v-if="mode==='updates'&&stage>=1"><path d="M606 166L613 184M616 166L623 184" stroke="#a8161d" stroke-width="2.5"/><text x="722" y="220" class="tiny" text-anchor="middle">stop-gradient at target features</text></g>
    <g v-if="mode==='updates'"><path d="M786 70H827V108M786 175H827V145" class="ssl-forward"/><rect x="802" y="109" width="50" height="35" rx="4" fill="#fff1f1" stroke="#CF1C24"/><text x="827" y="132" text-anchor="middle" class="small">Loss</text></g>
    <g v-if="mode==='updates'&&stage>=2"><path d="M802 126H513V95" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-grad)`"/><path d="M513 126H323V95" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-grad)`"/><text x="775" y="143" text-anchor="end" class="tiny">Dashed: loss gradients</text></g>
    <g v-if="mode==='updates'&&stage>=3"><path d="M259 94H237V174H257" fill="none" stroke="#7c3d8d" stroke-width="2" stroke-dasharray="2 4" :marker-end="`url(#${id}-ema)`"/><text x="357" y="222" text-anchor="middle" class="tiny">Dotted: separate encoder EMA</text></g>
   </svg>
   <template v-if="mode==='features'"><MathLine v-if="stage>=2" :formula="String.raw`\boldsymbol{\psi}_k^{\mathrm{target}}=f_{\bar\theta}(x)_k`" small/><div v-else class="ssl-caption">{{stage===0?'Pixel reconstruction compares output with the observed image.':'The predictor produces features for specified hidden locations.'}}</div></template>
   <template v-else><MathLine :formula="formula" :small="stage===0||stage===2"/><div class="feature-readout"><span>Lfeature = {{stats.loss.toFixed(4)}}</span><span>θ = {{visible.theta.toFixed(3)}} · β = {{visible.psi.toFixed(3)}} · θ̄ = {{visible.targetTheta.toFixed(3)}}</span></div><div class="ssl-caption">{{stage===0?'Schematic squared distance, averaged over one target block.':stage===1?'Treat target features as fixed when differentiating the loss.':stage===2?'Gradients update the context encoder and predictor.':'EMA transfers context-encoder parameters; the predictor has no EMA counterpart.'}}</div></template>
  </template>
  <div v-if="mode==='positions'&&stage>=1&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls"><label>Predict target block <select aria-label="Predict target block" v-model.number="selected" @change="changeTarget();($event.target as HTMLElement).blur()"><option v-for="(b,j) in blocks" :value="j">{{b.name}}</option></select></label></div>
  <div v-if="mode==='updates'&&stage>=3&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><button @click="playing=false;advance()">Step update</button><button class="primary" @click="toggle">{{playing?'Pause':'Play update pairs'}}</button><button @click="playing=false;reset()">Reset model</button><label>EMA μ <input aria-label="Target EMA coefficient" v-model.number="mu" type="range" min=".5" max=".95" step=".05"/>{{mu.toFixed(2)}}</label></div>
  <SSLControls/>
  <div class="ssl-disclosure">{{mode==='updates'?`${operation} · extra update pairs: ${cycles} · η = 0.1 · illustrative μ.`:'Illustrative two-dimensional features from a small numerical model; no trained I-JEPA runs here.'}} {{mode==='updates'?'Toy features and computed gradients/EMA; not I-JEPA’s full multi-block objective.':''}}</div>
 </div>
</template>
<style scoped>.feature-images{display:grid;grid-template-columns:1fr 1fr;gap:30px}.feature-images figure{margin:0}.feature-images figcaption{font-size:15px;margin:6px 0}.feature-images .masked-scene{max-height:118px}.feature-diagram{height:218px}.position-path{height:128px;margin-top:9px}.feature-readout{display:flex;justify-content:space-between;padding:7px 12px;background:#f3f9fb;border-left:3px solid #00BDF2;font-size:16px;font-variant-numeric:tabular-nums}</style>
