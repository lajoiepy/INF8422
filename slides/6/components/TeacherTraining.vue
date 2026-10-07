<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {initialTeacherModel,toyStudentUpdate,toyTeacherStep} from '../utils/distillation.mjs'
const props=withDefaults(defineProps<{mode?:'overview'|'updates';stage?:number}>(),{mode:'overview',stage:0})
const nav=useNav(),id=useId(),mu=ref(.8),model=ref({...initialTeacherModel}),cycles=ref(0),phase=ref('student'),lastOperation=ref('État pédagogique')
const stagedModel=()=>{
  let m={...initialTeacherModel}
  if(props.stage>=1)m=toyStudentUpdate(m).next
  if(props.stage>=2)m=toyTeacherStep(m,mu.value)
  return m
}
const reset=()=>{mu.value=.8;model.value=stagedModel();cycles.value=0;phase.value='student';lastOperation.value='État pédagogique'}
reset()
const advance=()=>{
  if(phase.value==='student'){model.value=toyStudentUpdate(model.value).next;phase.value='teacher';lastOperation.value='Mise à jour du gradient étudiant'}
  else{model.value=toyTeacherStep(model.value,mu.value);phase.value='student';lastOperation.value='Mise à jour de moyenne mobile enseignante';cycles.value++}
  return cycles.value<6
}
const {playing}=usePlayback(advance,reset,650)
const togglePlay=()=>{if(!playing.value&&cycles.value>=6)reset();playing.value=!playing.value}
watch(()=>props.stage,()=>{playing.value=false;reset()})
watch(mu,()=>{if(cycles.value===0&&lastOperation.value==='État pédagogique')model.value=stagedModel()})
const visible=computed(()=>nav.isPrintMode.value?stagedModel():model.value)
const formula=computed(()=>props.stage===0?String.raw`\Theta=(\theta,\phi)\qquad\bar\Theta=(\bar\theta,\bar\phi)`:props.stage===1?String.raw`\Theta_{n+1}=\Theta_n-\eta\nabla_\Theta\mathcal L`:String.raw`\bar\theta_{n+1}=\mu\bar\theta_n+(1-\mu)\theta_{n+1}`)
const oneUpdate=toyStudentUpdate(initialTeacherModel)
</script>
<template>
  <div class="teacher-training" :data-mode="mode" :data-stage="stage" :data-theta="visible.theta" :data-phi="visible.phi" :data-teacher-theta="visible.teacherTheta" :data-teacher-phi="visible.teacherPhi" :data-cycles="cycles" :data-phase="phase" :data-mu="mu">
    <svg class="ssl-svg teacher-diagram" viewBox="0 0 860 217" role="img" aria-label="Vues distinctes; gradients vers étudiant seul; EMA pointillée transférant les paramètres à l’enseignant">
      <defs><marker :id="`${id}-solid`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="`${id}-gradient`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a8161d"/></marker><marker :id="`${id}-ema`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7c3d8d"/></marker></defs>
      <g v-for="row in 2" :key="row" :transform="`translate(0 ${(row-1)*91})`">
        <foreignObject x="11" y="30" width="71" height="50"><SampleImage :brightness="row===1?1:.65" :crop="row===1?4:8"/></foreignObject><text x="93" y="61" class="small">vue {{row===1?2:1}}</text><path d="M147 55H173" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/>
        <rect x="182" y="32" width="142" height="46" rx="4" class="ssl-encoder"/><text x="253" y="61" text-anchor="middle">{{row===1?'Étudiant fθ':'Enseignant fθ̄'}}</text><path d="M330 55H360" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><text x="379" y="61">{{row===1?'ψ':'ψ̄'}}</text><path d="M397 55H427" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><rect x="437" y="32" width="105" height="46" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="489" y="61" text-anchor="middle">{{row===1?'gφ':'gφ̄'}}</text><path d="M547 55H577" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><text x="595" y="61">{{row===1?'q':'q̄'}}</text><path d="M619 55H710" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><text x="665" :y="row===1?25:36" text-anchor="middle" class="small">{{row===1?'Prédiction':'Cible apprise'}}</text>
      </g>
      <path d="M723 55H760V87M723 146H760V123" class="ssl-forward"/><rect x="724" y="88" width="91" height="37" rx="4" fill="#fff1f1" stroke="#CF1C24"/><text x="770" y="111" text-anchor="middle" class="small">Comparer</text>
      <g v-if="mode==='overview'?stage>=1:true"><path d="M654 137L661 155M667 137L674 155" stroke="#a8161d" stroke-width="2.5"/><text x="665" y="173" text-anchor="middle" class="tiny">gradient coupé</text></g>
      <g v-if="mode==='overview'?stage>=2:stage>=1"><path d="M724 104H489V82" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-gradient)`"/><path d="M489 104H253V82" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-gradient)`"/><text x="415" y="200" text-anchor="middle" class="small">Tirets : gradients de θ et φ · aucun gradient enseignant</text></g>
      <g v-if="mode==='updates'&&stage>=2"><path d="M182 78H166V125H182" fill="none" stroke="#7c3d8d" stroke-width="2" stroke-dasharray="2 4" :marker-end="`url(#${id}-ema)`"/><path d="M437 78H420V125H437" fill="none" stroke="#7c3d8d" stroke-width="2" stroke-dasharray="2 4" :marker-end="`url(#${id}-ema)`"/><text x="415" y="17" text-anchor="middle" class="tiny">Pointillés : EMA d’encodeur et de tête</text></g>
    </svg>
    <template v-if="mode==='updates'"><MathLine :formula="formula"/><div class="parameter-readout"><span>Encodeur : θ = {{visible.theta.toFixed(3)}} · θ̄ = {{visible.teacherTheta.toFixed(3)}}</span><span>Tête : φ = {{visible.phi.toFixed(3)}} · φ̄ = {{visible.teacherPhi.toFixed(3)}}</span></div><div class="teacher-update-caption">{{stage===0?'Au départ, les paramètres enseignants sont les mêmes que ceux de l’étudiant.':stage===1?`Pas étudiant calculé : entropie croisée à cible fixe ${oneUpdate.lossBefore.toFixed(4)} → ${oneUpdate.lossAfter.toFixed(4)}.`:'Après un lot (batch): mettre à jour la tête enseignante φ̄ avec une moyenne mobile.'}}</div>
      <div v-if="stage>=2&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><button @click="playing=false;advance()">Avancer la mise à jour</button><button class="primary" @click="togglePlay">{{playing?'Pause':'Lancer les paires de mises à jour'}}</button><button @click="playing=false;reset()">Réinitialiser le modèle</button><label>EMA μ <input aria-label="Coefficient EMA enseignant" type="range" min=".5" max=".95" step=".05" v-model.number="mu"/>{{mu.toFixed(2)}}</label></div><div v-if="!nav.isPrintMode.value&&stage>=2" class="ssl-disclosure">{{lastOperation}} · paires de mises à jour supplémentaires : {{cycles}}</div>
    </template>
    <SSLControls/>

  </div>
</template>
<style scoped>.teacher-diagram{height:205px}.parameter-readout{display:flex;gap:25px;font-size:16px;padding:8px 10px;border-left:3px solid #00BDF2;background:#f3f9fb;font-variant-numeric:tabular-nums}.teacher-update-caption{font-size:16px;line-height:1.4;margin:9px 0}</style>
