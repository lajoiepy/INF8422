<script setup lang="ts">
import {computed,useId} from 'vue'
import {cabinetPrediction,binaryLoss,measurements} from '../utils/interaction.mjs'
import {observedTarget} from '../utils/correspondence.mjs'
const props=withDefaults(defineProps<{stage?:number;mode?:string}>(),{stage:0,mode:'loop'}),id=useId()
const prediction=cabinetPrediction(.85,0),loss=binaryLoss(prediction.logit,1)
const formula=computed(()=>props.mode==='loop'?'y_t=\\Gamma(x_t,a_t,o_{t:t+\\Delta})':'\\widehat y_t=h_\\beta(f_\\theta(x_t),a_t),\\qquad y_t=\\Gamma(x_t,a_t,o_{t:t+\\Delta})')
</script>
<template>
 <div class="interaction-learning">
  <div v-if="mode==='loop'" class="interaction-streams">
   <div><b>Observation antérieure xₜ</b><CabinetScene/><div class="interaction-time">t = 0 · avant l’action</div></div>
   <div class="interaction-action"><b>Action commandée aₜ</b><svg class="ssl-svg" viewBox="0 0 180 100" aria-hidden="true"><path d="M25 45H145m-18 -9l18 9-18 9" fill="none" stroke="#F15A22" stroke-width="4"/><text x="24" y="86" class="small">Saisir l’anse, tirer vers l’extérieur</text></svg><div>Ouverture désirée : ≥ 30°</div></div>
   <div :class="{'stream-pending':stage<1}"><b>Mesures capteurs ultérieures o</b><CabinetScene :angle="55" :show-gripper="true"/><div class="interaction-time">Contact détecté · ouverture 55°</div></div>
  </div>
  <div v-else class="interaction-sources"><div><b>Association géométrique</b><GeoImage :image="observedTarget" label="Vue caméra enregistrée"/><span>Profondeur + poses + visibilité<br>→ pixels correspondants</span></div><div :class="{'stream-pending':stage<1}"><b>Expérience de traversée</b><TerrainImage :samples="measurements"/><span>Commande + mouvement mesuré<br>→ cibles de coût local</span></div><div :class="{'stream-pending':stage<1}"><b>Interaction avec le meuble</b><CabinetScene :angle="55"/><span>Résultat de tâche mesuré<br>→ cible de succès</span></div></div>
  <MathLine :formula="formula" small/>
  <svg v-if="stage>=2" class="ssl-svg interaction-training" viewBox="0 0 860 105" role="img" aria-label="Observation et action alimentent encodeur et tête; prédiction et cible automatique se rejoignent à la perte">
   <defs><marker :id="id+'-head'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="id+'-target-arrow'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#25B34B"/></marker><marker :id="id+'-gradient-arrow'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#CF1C24"/></marker></defs>
   <text x="12" y="32">xₜ, aₜ</text><path d="M85 26H128" class="ssl-forward" :marker-end="'url(#'+id+'-head)'"/>
   <rect x="137" y="8" width="182" height="39" rx="4" class="ssl-encoder"/><text x="228" y="33" text-anchor="middle">Encodeur + tête</text>
   <path d="M324 26H367" class="ssl-forward" :marker-end="'url(#'+id+'-head)'"/><text x="380" y="33">Prédiction ŷₜ</text>
   <path d="M505 26H556" class="ssl-forward" :marker-end="'url(#'+id+'-head)'"/><rect x="566" y="8" width="88" height="39" rx="4" class="ssl-loss"/><text x="610" y="33" text-anchor="middle">Perte</text>
   <text x="679" y="33" fill="#168034">Cible yₜ par Γ</text><path d="M674 26H660" class="ssl-target" :marker-end="'url(#'+id+'-target-arrow)'"/>
   <path d="M610 52V74H228V50" class="ssl-gradient" :marker-end="'url(#'+id+'-gradient-arrow)'"/><text x="430" y="98" text-anchor="middle" class="small" fill="#CF1C24">Les gradients modifient θ et β; la cible mesurée reste fixe.</text>
  </svg>
  <div class="takeaway">{{mode==='loop'?stage<1?'Le résultat désiré spécifie la tâche, sans fournir une étiquette mesurée.':stage<2?'Les mesures après action fournissent une cible automatique.':'Prédiction illustrative '+prediction.probability.toFixed(3)+' · cible mesurée 1 · perte binaire '+loss.toFixed(4):'Identifier la source et le domaine de la cible, et ce que le modèle doit prédire.'}}</div>
  <SSLControls/><div class="ssl-disclosure">Géométrie pédagogique calculée et prédiction illustrative · chaque règle cible a ses hypothèses</div>
 </div>
</template>
<style scoped>.interaction-streams,.interaction-sources{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin-top:10px}.interaction-streams b,.interaction-sources b{font-size:16px}.interaction-streams :deep(.cabinet-scene){height:135px}.interaction-time{font-size:14px;margin-top:3px}.interaction-action{padding-top:15px;display:flex;flex-direction:column;justify-content:center;font-size:16px}.interaction-action svg{height:85px;margin:8px 0}.stream-pending{opacity:.16}.interaction-training{height:85px;margin-top:4px}.interaction-learning .takeaway{font-size:17px;margin:8px 0}.interaction-sources :deep(.geo-image){margin-top:10px}.interaction-sources :deep(.geo-image canvas){max-height:90px}.interaction-sources :deep(.terrain-image){margin-top:30px;height:90px}.interaction-sources :deep(.cabinet-scene){height:120px}.interaction-sources span{font-size:15px;display:block;margin:5px 0}.ssl-loss{fill:#fff1f1;stroke:#CF1C24;stroke-width:1.5}.ssl-target{fill:none;stroke:#25B34B;stroke-width:2}.ssl-gradient{fill:none;stroke:#CF1C24;stroke-width:1.5;stroke-dasharray:5 3}.interaction-learning .ssl-disclosure{font-size:11px}</style>
