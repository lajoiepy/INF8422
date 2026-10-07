<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {cabinetState,cabinetOutcome,cabinetPrediction,actionDirection,binaryTarget} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{mode?:string;stage?:number}>(),{mode:'affordance',stage:0})
const nav=useNav(),direction=ref(0),contact=ref(.85),progress=ref(0)
function reset(){const s=cabinetState(props.mode,props.stage);direction.value=s.direction;contact.value=s.contact;progress.value=s.progress}
reset()
const {playing}=usePlayback(()=>{progress.value=Math.min(1,Math.round((progress.value+.08)*100)/100);return progress.value<1},reset,100)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const fixed=computed(()=>cabinetState(props.mode,props.stage))
const d=computed(()=>nav.isPrintMode.value?fixed.value.direction:Number(direction.value)),r=computed(()=>nav.isPrintMode.value?fixed.value.contact:Number(contact.value)),p=computed(()=>nav.isPrintMode.value?fixed.value.progress:progress.value)
const prediction=computed(()=>cabinetPrediction(r.value,d.value)),outcome=computed(()=>cabinetOutcome({contact:r.value,direction:d.value})),angle=computed(()=>p.value*outcome.value.angle)
const target=computed(()=>p.value===1?binaryTarget(angle.value):null)
function changed(){playing.value=false;progress.value=0}
function execute(){if(!playing.value)progress.value=0;playing.value=!playing.value}
const formulas={predict:'\\widehat y_t=h_\\beta(f_\\theta(x_t),a_t)',target:'y_t=\\Gamma(o)=\\mathbf 1[\\text{ouverture mesurée}\\geq30^\\circ]'}
const fmt=(a:number[])=>'['+a.map(x=>Math.abs(x)<1e-10?'0.00':x.toFixed(2)).join(', ')+']'
</script>
<template>
 <div class="cabinet-interaction" :data-mode="mode" :data-direction="d" :data-contact="r" :data-progress="p" :data-angle="angle" :data-target="target" :data-probability="prediction.probability" :data-logit="prediction.logit">
  <div class="cabinet-pair"><div><div class="cabinet-heading">Observation initiale fixe xₜ</div><CabinetScene :contact="r" :direction="d" :show-action="true"/></div><div v-if="mode==='execute'"><div class="cabinet-heading">Observation après action · {{p===0?'action non exécutée':p<1?'action en cours':'action terminée'}}</div><CabinetScene :angle="angle" :contact="r" :show-gripper="p>0"/></div><div v-else class="cabinet-action-cards"><div class="cabinet-action-card" :class="{chosen:d===0}"><b>Tirer vers l’extérieur</b><span>Direction initiale d’ouverture</span></div><div class="cabinet-action-card" :class="{chosen:d===90}"><b>Le long de la porte fermée</b><span>Faible moment d’ouverture</span></div><div class="cabinet-action-card" :class="{chosen:d===180}"><b>Pousser vers l’intérieur</b><span>La butée bloque le mouvement</span></div></div></div>
  <div class="cabinet-action-readout">Rayon de contact {{r.toFixed(2)}} m · direction F = {{fmt(actionDirection(d))}} · orientation de prise fixe</div>
  <MathLine v-if="mode==='predict'" :formula="formulas.predict"/>
  <MathLine v-if="mode==='execute'&&stage>=2" :formula="formulas.target" small/>
  <div v-if="mode!=='affordance'&&stage>=1" class="cabinet-prediction">Succès d’ouverture prédit : {{prediction.probability.toFixed(3)}}<span v-if="mode==='execute'"> · {{p===1?'Ouverture mesurée '+angle.toFixed(1)+'° → cible automatique y = '+target:'Cible en attente de fin d’exécution'}}</span></div>
  <div class="ssl-caption">{{mode==='affordance'?'La même anse produit des résultats différents selon la direction d’action.':mode==='predict'?'Prédire à partir de l’observation et de l’action proposée, avant de voir le résultat.':'Objectif : ouvrir d’au moins 30°; un petit mouvement ne suffit pas.'}}</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><label>Action <select aria-label="Action sur le meuble" v-model.number="direction" @change="changed();($event.target as HTMLElement).blur()"><option :value="0">Tirer vers l’extérieur</option><option :value="60">Traction oblique</option><option :value="90">Le long de la porte</option><option :value="180">Pousser vers l’intérieur</option></select></label><label>Contact <select aria-label="Contact sur le meuble" v-model.number="contact" @change="changed();($event.target as HTMLElement).blur()"><option :value=".85">Anse</option><option :value=".4">Surface de porte</option><option :value="0">Charnière</option></select></label><template v-if="mode==='execute'"><button class="primary" @click="execute">{{playing?'Pause':'Exécuter l’action'}}</button><button v-if="p>0&&p<1&&!playing" @click="playing=true">Reprendre l’action</button></template><button @click="playing=false;reset()">Réinitialiser l’interaction</button></div>
  <SSLControls/><div class="ssl-disclosure">Charnière scénarisée et prédicteur illustratif · sans expérience robotique, forces simulées ni inférence ActAIM</div>
 </div>
</template>
<style scoped>.cabinet-pair{display:grid;grid-template-columns:1fr 1fr;gap:28px}.cabinet-pair :deep(.cabinet-scene){height:165px}.cabinet-heading{font-size:16px;margin:5px 0}.cabinet-action-cards{display:flex;flex-direction:column;gap:8px;justify-content:center}.cabinet-action-card{border-left:3px solid #cbd5e1;padding:6px 12px;background:#f8fafc;font-size:16px}.cabinet-action-card span{display:block;font-size:14px;margin-top:4px}.cabinet-action-card.chosen{border-color:#F15A22;background:#fff3eb}.cabinet-action-readout{padding:7px 9px;background:#edf8fc;border-left:3px solid #00BDF2;font-size:14px}.cabinet-prediction{font-size:15px;padding:8px 10px;background:#eff9f2;border-left:3px solid #25B34B}.cabinet-interaction .ssl-caption{font-size:16px;margin:9px 0}.cabinet-interaction .ssl-parameter-controls{display:flex;align-items:center;flex-wrap:wrap;font-size:13px;margin:8px 0;gap:12px}.cabinet-interaction .ssl-parameter-controls button{font-size:13px;padding:5px 8px}.cabinet-interaction .ssl-disclosure{font-size:11px}</style>
