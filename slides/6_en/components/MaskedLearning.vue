<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {maskSets,pixelPrediction,pixelStats,patchPixelError,patchCount} from '../utils/prediction.mjs'
import {usePlayback} from '../utils/usePlayback'
import figure from '../images/mae-architecture.png'
const props=withDefaults(defineProps<{mode?:'overview'|'mask'|'architecture'|'loss';stage?:number}>(),{mode:'mask',stage:0})
const nav=useNav(),id=useId(),pattern=ref(0),ratio=ref(.75),brightness=ref(1),focus=ref(0)
const reset=()=>{pattern.value=0;ratio.value=.75;brightness.value=1;focus.value=0}
usePlayback(()=>false,reset)
watch(()=>props.stage,reset)
const sets=computed(()=>maskSets(nav.isPrintMode.value?0:pattern.value,nav.isPrintMode.value?.75:ratio.value))
const prediction=computed(()=>pixelPrediction(sets.value.visible,nav.isPrintMode.value?1:brightness.value))
const stats=computed(()=>pixelStats(sets.value.hidden,prediction.value))
const selected=computed(()=>sets.value.hidden[focus.value%sets.value.hidden.length])
const masked=computed(()=>props.mode==='overview'?props.stage>=1:props.mode==='mask'?props.stage>=1:true)
const highlighted=computed(()=>props.mode==='loss'?(props.stage===0?[selected.value]:sets.value.hidden):[])
const tokenIds=computed(()=>props.mode==='mask'&&props.stage<2?[]:sets.value.visible)
</script>
<template>
 <div class="masked-learning" :data-mode="mode" :data-stage="stage" :data-hidden="JSON.stringify(sets.hidden)" :data-visible="JSON.stringify(sets.visible)" :data-loss="stats.loss" :data-pattern="pattern" :data-brightness="brightness" :data-selected="selected">
  <template v-if="mode==='overview'">
   <svg class="ssl-svg" viewBox="0 0 860 236" role="img" aria-label="Original camera observation supplies the target; masking changes the prediction input">
    <defs><marker :id="id" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
    <foreignObject x="12" y="45" width="230" height="77"><MaskedScene :hidden="masked?sets.hidden:[]" :grid="masked"/></foreignObject><text x="127" y="29" text-anchor="middle">{{masked?'Partially observed input':'Observed image x'}}</text>
    <path d="M249 85H282" class="ssl-forward" :marker-end="`url(#${id})`"/><rect x="290" y="59" width="115" height="52" rx="4" class="ssl-encoder"/><text x="347" y="90" text-anchor="middle">fθ</text><path d="M411 85H445" class="ssl-forward" :marker-end="`url(#${id})`"/><rect x="453" y="59" width="115" height="52" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="510" y="90" text-anchor="middle">dω</text><path d="M575 85H613" class="ssl-forward" :marker-end="`url(#${id})`"/><text x="689" y="90">Predicted pixels</text>
    <foreignObject x="12" y="148" width="230" height="77"><MaskedScene :grid="false"/></foreignObject><text x="370" y="193">Original observed pixels supply the target.</text>
   </svg>
   <div class="ssl-caption">{{stage===0?'A direct copy can solve reconstruction without learning useful features.':'Withhold information from the prediction input; keep it for the target.'}}</div>
  </template>
  <template v-else-if="mode==='mask'">
   <div class="mask-pair"><figure><figcaption>Original observation x</figcaption><MaskedScene :grid="stage>=0"/></figure><figure><figcaption>{{masked?'Visible patches V · hidden patches M':'Patchify: 48 square patches'}}</figcaption><MaskedScene :hidden="masked?sets.hidden:[]" :grid="true"/></figure></div>
   <svg class="ssl-svg compact-tokens" viewBox="0 0 860 120" role="img" aria-label="Only visible patch tokens enter the encoder">
    <g v-if="stage>=2"><rect x="12" y="15" width="690" height="69" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><g v-for="(k,j) in tokenIds" :key="k" :transform="`translate(${24+j*(650/Math.max(tokenIds.length,1))} 28)`"><rect :width="Math.min(34,600/tokenIds.length)" height="30" fill="#dcf3fb" stroke="#00BDF2"/><text :x="Math.min(34,600/tokenIds.length)/2" y="21" text-anchor="middle" class="tiny">{{k}}</text></g><text x="355" y="107" text-anchor="middle" class="small">Visible patch tokens + their positions</text><path d="M710 48H748" class="ssl-forward"/><rect x="756" y="24" width="89" height="49" rx="4" class="ssl-encoder"/><text x="800" y="55" text-anchor="middle">fθ</text></g>
    <text v-else x="430" y="61" text-anchor="middle">{{stage===0?'Patch index k identifies a location in the original image.':`${sets.visible.length} visible patches; ${sets.hidden.length} values withheld from the encoder.`}}</text>
   </svg>
   <div class="ssl-caption">{{stage<2?'The training procedure still has every original patch value.':'The MAE encoder receives visible tokens, with their original positions.'}}</div>
  </template>
  <template v-else-if="mode==='architecture'">
   <div v-if="stage<3" class="mae-custom">
    <div class="mask-pair"><figure><figcaption>Original observation</figcaption><MaskedScene/></figure><figure><figcaption>Encoder input: visible patches only</figcaption><MaskedScene :hidden="sets.hidden"/></figure></div>
    <svg class="ssl-svg mae-path" viewBox="0 0 860 145" role="img" aria-label="Visible patches enter the MAE encoder; learned mask tokens and positions are introduced for the decoder">
     <text x="60" y="29" text-anchor="middle" class="small">Visible</text><rect x="13" y="44" width="90" height="43" fill="#dcf3fb" stroke="#00BDF2"/><text x="58" y="71" text-anchor="middle">{{sets.visible.length}} tokens</text><path d="M110 65H147" class="ssl-forward"/><rect x="155" y="41" width="105" height="48" rx="4" class="ssl-encoder"/><text x="208" y="71" text-anchor="middle">fθ</text><path d="M267 65H305" class="ssl-forward"/><text x="331" y="70">ψ</text>
     <g v-if="stage>=1"><path d="M355 65H393" class="ssl-forward"/><rect x="400" y="28" width="151" height="76" rx="4" fill="#f8fafc" stroke="#94a3b8"/><g v-for="(k,j) in 12" :key="k"><rect :x="410+(j%6)*22" :y="40+Math.floor(j/6)*26" width="17" height="21" :fill="j%4===0?'#bfe7f4':'#ccd3d9'"/></g><text x="475" y="128" text-anchor="middle" class="small">Add mask tokens + positions</text><path d="M558 65H592" class="ssl-forward"/><rect x="600" y="41" width="107" height="48" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="653" y="71" text-anchor="middle">dω</text></g>
     <g v-if="stage>=2"><path d="M714 65H748" class="ssl-forward"/><text x="802" y="58" text-anchor="middle">Patch</text><text x="802" y="82" text-anchor="middle">pixels x̂ₖ</text></g>
    </svg>
   </div>
   <div v-else class="mae-paper"><img :src="figure" alt="Original MAE Figure 1: visible-only encoder, decoder mask tokens, and pixel reconstruction"/><div class="ssl-caption">Mask tokens enter the decoder after visible-patch encoding.</div><div class="citation"><a href="https://arxiv.org/html/2111.06377v3">He et al., MAE, CVPR 2022 · Fig. 1 · arXiv v3</a></div></div>
   <div v-if="stage<3" class="ssl-caption">{{stage===0?'Encode only visible patches.':stage===1?'Reinsert locations using encoded visible tokens and learned mask tokens.':'The decoder predicts pixel vectors at all patch positions.'}}</div>
  </template>
  <template v-else>
   <div class="pixel-panels"><figure><figcaption>Original target pixels</figcaption><MaskedScene :highlight="highlighted"/></figure><figure><figcaption>Visible encoder input</figcaption><MaskedScene :hidden="sets.hidden" :highlight="[selected]"/></figure><figure><figcaption>Illustrative pixel prediction</figcaption><MaskedScene :prediction="prediction" :highlight="highlighted"/></figure></div>
   <MathLine :formula="stage===0?String.raw`\|\widehat x_k-x_k\|_2^2`:String.raw`\mathcal L_{\mathrm{pixel}}=\frac{1}{|\mathcal M|}\sum_{k\in\mathcal M}\|\widehat x_k-x_k\|_2^2`"/>
   <div class="pixel-readout">{{stage===0?`Selected masked patch k = ${selected}: squared error = ${patchPixelError(selected,prediction[selected]).toFixed(2)}`:`Average over ${sets.hidden.length} masked patches: Lpixel = ${stats.loss.toFixed(2)}`}}</div>
   <div class="ssl-caption">{{stage<2?'xₖ is the original RGB pixel vector of patch k.':'Visible patch errors are excluded; the basic loss acts on M.'}}</div>
   <div class="ssl-disclosure">Computed on RGB pixels scaled to [0, 1] · predicted tiles use nearby visible-patch mean colors, not a trained MAE · no per-patch target normalization</div>
  </template>
  <div v-if="!nav.isPrintMode.value&&(mode==='mask'||mode==='loss')" class="ssl-parameter-controls lab-controls">
   <button @click="pattern=(pattern+1)%6;focus=0;($event.target as HTMLElement).blur()">Change mask</button><label>Masked fraction <input aria-label="Masked fraction" type="range" min=".5" max=".875" step=".125" v-model.number="ratio"/>{{(ratio*100).toFixed(1)}}%</label>
   <template v-if="mode==='loss'"><label>Prediction brightness <input aria-label="Prediction brightness" type="range" min=".5" max="1.5" step=".1" v-model.number="brightness"/>{{brightness.toFixed(1)}}</label><button @click="focus++;($event.target as HTMLElement).blur()">Next masked patch</button></template>
  </div>
  <SSLControls/>
 </div>
</template>
<style scoped>.mask-pair{display:grid;grid-template-columns:1fr 1fr;gap:30px}.mask-pair figure,.pixel-panels figure{margin:0}.mask-pair figcaption,.pixel-panels figcaption{font-size:16px;margin:7px 0}.mask-pair .masked-scene{max-height:127px}.compact-tokens{height:110px;margin-top:8px}.mae-path{height:140px;margin-top:14px}.mae-paper img{height:270px;max-width:100%;margin:auto;display:block}.pixel-panels{display:grid;grid-template-columns:repeat(3,1fr);gap:17px}.pixel-readout{padding:8px 12px;background:#fff4ee;border-left:3px solid #F15A22;font-size:17px}.pixel-panels figcaption{font-size:15px}.masked-learning .ssl-caption{margin:10px 0}</style>
