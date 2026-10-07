<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {useStageTransition} from '../utils/useStageTransition'
import {sampleColors,initialAngles,directions,contrastiveStats,motionVectors,meanContrastiveLoss} from '../utils/matching.mjs'
import simclrFigure from '../images/simclr-architecture.png'
const props=withDefaults(defineProps<{mode?:'candidates'|'temperature'|'loss'|'motion';stage?:number}>(),{mode:'candidates',stage:0})
const nav=useNav(),anchor=ref(0),tau=ref(.5),positiveAngle=ref(32)
const resetSettings=()=>{anchor.value=0;tau.value=.5;positiveAngle.value=32}
usePlayback(()=>false,resetSettings)
watch(()=>props.stage,resetSettings)
const transition=useStageTransition(()=>props.stage)
const progress=computed(()=>props.stage===0?0:(props.stage-1+transition.fraction.value)/2)
const vectors=computed(()=>{
  if(props.mode==='motion')return motionVectors(progress.value)
  const a=[...initialAngles];if(props.mode==='temperature')a[anchor.value^1]=a[anchor.value]+positiveAngle.value
  return directions(a)
})
const stats=computed(()=>contrastiveStats(vectors.value,anchor.value,tau.value))
const formula=computed(()=>props.mode==='loss'?(props.stage===0?String.raw`w_+=\exp(\operatorname{sim}(\mathbf q_i^{(1)},\mathbf q_i^{(2)})/\tau)`:props.stage===1?String.raw`L =\sum_{(j,v)\ne(i,1)}\exp(\operatorname{sim}(\mathbf q_i^{(1)},\mathbf q_j^{(v)})/\tau)`:String.raw`\ell_i^{(1)}=-\log\frac{\exp(\operatorname{sim}(\mathbf q_i^{(1)},\mathbf q_i^{(2)})/\tau)}{\sum_{(j,v)\ne(i,1)}\exp(\operatorname{sim}(\mathbf q_i^{(1)},\mathbf q_j^{(v)})/\tau)}`):String.raw`\operatorname{sim}(\mathbf q_a,\mathbf q_b)=\frac{\mathbf q_a^{\mathsf T}\mathbf q_b}{\|\mathbf q_a\|_2\|\mathbf q_b\|_2}`)
const label=(k:number)=>`(${Math.floor(k/2)+1}, ${k%2+1})`
const showScores=computed(()=>props.mode!=='candidates')
const labelPositions=computed(()=>{
  const placed:number[][]=[],marks=vectors.value.map(p=>[142+p[0]*77,105-p[1]*77])
  for(const [k,p] of vectors.value.entries()){
    const preferred=[142+p[0]*(k%2?128:122),105-p[1]*116+(k%2?(p[1]>0?-5:8):(p[1]>0?8:-6))]
    let selected:number[]|undefined
    for(const dx of [0,-24,24,-48,48,-72,72,-96,96,-120,120]){
      for(const dy of [0,-22,22,-44,44,-66,66,-88,88]){
        const candidate=[Math.max(26,Math.min(252,preferred[0]+dx)),Math.max(16,Math.min(196,preferred[1]+dy))]
        const overlapsLabel=placed.some(q=>Math.abs(q[0]-candidate[0])<50&&Math.abs(q[1]-candidate[1])<22)
        const overlapsPoint=marks.some(q=>Math.abs(q[0]-candidate[0])<29&&Math.abs(q[1]-(candidate[1]-5))<17)
        const outsideCircle=Math.hypot(candidate[0]-142,candidate[1]-110)>=108
        if(!overlapsLabel&&!overlapsPoint&&outsideCircle){selected=candidate;break}
      }
      if(selected)break
    }
    placed.push(selected||[Math.max(26,Math.min(252,preferred[0])),Math.max(16,Math.min(196,preferred[1]))])
  }
  return placed
})
</script>
<template>
  <div class="contrastive-lab" :class="mode" :data-mode="mode" :data-anchor="anchor" :data-positive="stats.positive" :data-temperature="tau" :data-loss="stats.loss" :data-progress="progress" :data-playing="transition.playing.value" :data-vectors="JSON.stringify(vectors)" :data-candidates="JSON.stringify(stats.candidates)">
    <template v-if="mode==='loss'&&stage>=3">
      <div class="simclr-paper"><img :src="simclrFigure" alt="SimCLR figure 2 originale : deux vues transformées, encodeur f et projection g"/><div><b>Architecture publiée de SimCLR</b><p>Article h → cours ψ</p><p>Article z → cours q</p><p>Après préentraînement : garder fθ.<br>Évaluer les caractéristiques de l’encodeur.</p><div class="citation"><a href="https://arxiv.org/html/2002.05709v3">Chen et al. · ICML 2020 · Fig. 2</a></div></div></div>
    </template>
    <template v-else>
      <div v-if="mode==='motion'" class="ssl-pipeline">Vue transformée → <b>fθ</b> → ψ → <b>gφ</b> → q</div>
      <div v-else-if="mode!=='candidates'" class="ssl-pipeline">Ancre (1, 1) · Positif (1, 2) </div>
      <div v-else class="candidate-strip"><div v-for="k in 6" :key="k" class="candidate-view" :class="{anchor:k-1===anchor}" :style="{'--sample-color':sampleColors[Math.floor((k-1)/2)]}"><div class="candidate-thumb"><SampleImage :sample="Math.floor((k-1)/2)" :brightness="k%2?1:.7" :crop="k%2?4:8"/></div><span>{{label(k-1)}} <b v-if="k-1===anchor">A</b><b v-else-if="mode!=='candidates'||(k-1===stats.positive?stage>=1:stage>=2)">{{k-1===stats.positive?'P':'N'}}</b></span></div></div>
      <svg class="contrastive-plot ssl-svg" viewBox="0 0 860 207" role="img" aria-label="Directions unitaires et cinq probabilités calculées, ancre exclue">
        <g transform="translate(142 105)"><circle r="77" fill="none" stroke="#d7e0e6"/><path d="M-95 0H96M0-87V88" stroke="#cbd5e1"/>
          <g v-for="(p,k) in vectors" :key="k"><line v-if="k===anchor||(mode==='temperature'&&k===stats.positive)" x1="0" y1="0" :x2="p[0]*77" :y2="-p[1]*77" :stroke="k===anchor?'#334155':sampleColors[Math.floor(k/2)]" stroke-width="2"/>
            <circle v-if="k%2===0" :cx="p[0]*77" :cy="-p[1]*77" :r="k===anchor?7:5" :fill="sampleColors[Math.floor(k/2)]" :stroke="k===anchor?'#111':'white'" :stroke-width="k===anchor?3:1.5"/><rect v-else :x="p[0]*77-5" :y="-p[1]*77-5" width="10" height="10" :fill="sampleColors[Math.floor(k/2)]" :stroke="k===anchor?'#111':'white'" :stroke-width="k===anchor?3:1.5"/>
            <line :x1="p[0]*83" :y1="-p[1]*83" :x2="labelPositions[k][0]-142" :y2="labelPositions[k][1]-111" stroke="#cbd5e1" stroke-width=".8"/>
            <text :x="labelPositions[k][0]-142" :y="labelPositions[k][1]-105" text-anchor="middle" class="tiny" :data-feature-label="k">{{label(k)}}</text>
          </g>
        </g>
        <g v-if="showScores"><text x="280" y="18" class="small strong">Candidat (i, v)</text><text x="449" y="18" class="small">cosinus</text><text x="606" y="18" class="small">Probabilité normalisée</text>
          <g v-for="(candidate,row) in stats.candidates" :key="candidate.index" :transform="`translate(0 ${row*32})`"><text x="284" y="48" class="small">{{label(candidate.index)}} · {{candidate.positive?'positif':'négatif'}}</text><text x="457" y="48" class="small">{{candidate.similarity.toFixed(3)}}</text><rect x="532" y="33" width="210" height="19" fill="#f1f5f7"/><rect x="532" y="33" :width="210*candidate.probability" height="19" :fill="sampleColors[Math.floor(candidate.index/2)]"/><text x="755" y="48" class="small">{{(100*candidate.probability).toFixed(1)}}%</text></g>
        </g>
        <g v-else><text x="296" y="66" class="strong">Ancre : {{label(anchor)}}</text><text v-if="stage>=1" x="296" y="107">Positif : {{label(stats.positive)}} · même original, autre vue</text><text v-if="stage>=2" x="296" y="148">Quatre négatifs · vues des deux autres originaux</text><text x="296" y="188" class="small">A : ancre · cercles : v = 1 · carrés : v = 2</text></g>
      </svg>
      <div v-if="showScores" class="contrastive-readout">τ = {{tau.toFixed(2)}} · probabilité positive = {{(100*stats.candidates.find(c=>c.positive).probability).toFixed(1)}}% · ℓ = {{stats.loss.toFixed(3)}}<span v-if="mode==='motion'"> · moyenne des six ancres = {{meanContrastiveLoss(vectors,tau).toFixed(3)}}</span></div>
    </template>
    <MathLine v-if="mode==='temperature'&&stage>=1||mode==='loss'&&stage<3" :formula="formula" :small="mode==='loss'"/>
    <div v-if="!nav.isPrintMode.value&&mode!=='loss'" class="ssl-parameter-controls lab-controls" @click.stop>
      <label v-if="mode==='candidates'">Ancre <select aria-label="Vue d’ancrage" v-model.number="anchor" @change="($event.target as HTMLElement).blur()"><option v-for="k in 6" :value="k-1">{{label(k-1)}}</option></select></label>
      <label v-else>Température τ <input aria-label="Température contrastive" type="range" min=".1" max="1" step=".05" v-model.number="tau"/>{{tau.toFixed(2)}}</label>
      <label v-if="mode==='temperature'">Direction du positif <input aria-label="Direction du positif" type="range" min="10" max="120" step="5" v-model.number="positiveAngle"/>{{positiveAngle}}°</label>
    </div>
    <SSLControls :replay="mode==='motion'" :disabled="stage===0" :playing="transition.playing.value" @play="transition.replay" @step="transition.step" @reset="transition.reset();resetSettings()"/>
    <div class="ssl-disclosure">{{mode==='motion'?'':mode==='loss'&&stage>=3?'Figure originale · symboles conservés':''}}</div>
  </div>
</template>
<style scoped>
.candidate-strip{display:flex;gap:17px;justify-content:center;margin:9px 0 3px}.candidate-view{width:102px;border-bottom:3px solid var(--sample-color);padding:3px;text-align:center;font-size:14px}.candidate-view.anchor{outline:2px solid #333;outline-offset:2px}.candidate-thumb{height:53px}.candidate-view span{display:block;margin-top:5px}.candidate-view b{margin-left:5px}.contrastive-plot{height:207px}.contrastive-readout{font-size:15px;padding:6px 10px;border-left:3px solid #00BDF2;background:#f3f9fb;margin:4px 0 5px;font-variant-numeric:tabular-nums}.simclr-paper{display:grid;grid-template-columns:330px 1fr;gap:55px;align-items:center;margin:20px 30px}.simclr-paper img{height:275px;width:100%;object-fit:contain}.simclr-paper b{font-size:21px}.simclr-paper p{font-size:18px!important;margin:18px 0!important}.contrastive-lab select{border:1px solid #cbd5e1;border-radius:4px;padding:3px 9px;background:white}.ssl-pipeline{font-size:17px;margin:13px 0;color:#475569}
.candidates .contrastive-plot{height:185px;}
</style>
