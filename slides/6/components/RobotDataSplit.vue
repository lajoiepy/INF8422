<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {runs,assignedFrames,splitDiagnostics} from '../utils/evaluation.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),mode=ref('frame')
const fixed=()=>['frame','trajectory','environment'][Math.min(2,props.stage)]
mode.value=fixed();watch(()=>props.stage,()=>mode.value=fixed())
const selected=computed(()=>nav.isPrintMode.value?fixed():mode.value),frames=computed(()=>assignedFrames(selected.value)),audit=computed(()=>splitDiagnostics(frames.value))
const colors={train:'#d4eafa',validation:'#ffe0cc',test:'#d4efdc'},letters={train:'A',validation:'V',test:'E'}
const role=(row:number,t:number)=>frames.value[row*8+t].role
const caption=computed(()=>selected.value==='frame'?'Des images voisines du même parcours traversent la frontière de test.':selected.value==='trajectory'?'Parcours séparés, mais hall et laboratoire partagés entre apprentissage et test.':'Environnements séparés dans ces métadonnées; vérifier aussi les enregistrements.')
</script>
<template>
 <div class="robot-data-split" :data-mode="selected" :data-adjacent="audit.adjacent" :data-trajectory-overlap="audit.trajectories.length" :data-environment-overlap="audit.environments.length" :data-assignment="JSON.stringify(frames.map(f=>f.role))">
  <div class="split-legend"><span>A · Apprentissage</span><span>V · Validation</span><span>E · Test / évaluation</span><em>Le temps avance →</em></div>
  <svg class="ssl-svg split-recordings" viewBox="0 0 860 276" role="img" aria-label="Six parcours de huit images partitionnés par image, trajectoire complète ou environnement complet">
   <text v-for="t in 8" :key="t" :x="204+(t-1)*82" y="15" text-anchor="middle" class="small">t{{t}}</text>
   <g v-for="(run,k) in runs" :key="run.id" :transform="'translate(0 '+(23+k*40)+')'"><text x="2" y="24" class="small">Parcours {{run.id}} · {{({Hall:'Hall',Lab:'Labo',Warehouse:'Entrepôt'})[run.environment]}}</text><path d="M164 20H824" stroke="#cbd5e1"/>
    <g v-for="t in 8" :key="t" :transform="'translate('+(170+(t-1)*82)+' 0)'"><rect x="0" y="2" width="68" height="33" rx="3" :fill="colors[role(k,t-1)]" stroke="#94a3b8"/><text x="11" y="24" class="small">{{letters[role(k,t-1)]}}</text><path d="M31 27H59" stroke="#64748b"/><rect :x="33+(t-1)*2" y="12" width="10" height="10" rx="2" fill="#475569"/><path :d="'M'+(45+(t-1)*2)+' 14l8 -3v8Z'" fill="#00BDF2"/></g>
   </g>
  </svg>
  <div class="split-audit">Audit apprentissage/test · paires voisines : <b>{{audit.adjacent}}</b> · trajectoires communes : <b>{{audit.trajectories.length}}</b> · environnements communs : <b>{{audit.environments.length}}</b></div>
  <div class="ssl-caption">{{caption}}</div>
  <div v-if="stage>=2" class="split-protocol">Choisir la partition selon la généralisation : parcours, session, objet ou environnement.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Unité de partition <select aria-label="Unité de partition robotique" v-model="mode" @change="($event.target as HTMLElement).blur()"><option value="frame">Images individuelles</option><option value="trajectory">Trajectoires entières</option><option value="environment">Environnements entiers</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Métadonnées synthétiques · chevauchement nul affiché ne prouve pas l’absence de toute fuite</div>
  <div class="citation"><a href="https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-iterators-for-grouped-data">scikit-learn · évaluation groupée; regroupement robotique illustratif</a></div>
 </div>
</template>
<style scoped>.split-legend{display:flex;gap:22px;font-size:14px;margin:12px 0 5px}.split-legend span{padding:3px 8px;border-radius:3px}.split-legend span:nth-child(1){background:#d4eafa}.split-legend span:nth-child(2){background:#ffe0cc}.split-legend span:nth-child(3){background:#d4efdc}.split-legend em{margin-left:auto;font-style:normal;color:#64748b}.split-recordings{height:195px}.split-recordings .small{font-size:16px}.split-audit{font-size:15px;background:#edf8fc;padding:7px 10px;border-left:3px solid #00BDF2}.robot-data-split .ssl-caption{font-size:15px;margin:9px 0}.split-protocol{font-size:14px;line-height:1.5;margin:8px 0}.robot-data-split .ssl-parameter-controls{font-size:14px}.robot-data-split .ssl-disclosure{font-size:11px}</style>
