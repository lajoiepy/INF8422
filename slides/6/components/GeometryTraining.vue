<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {initialGeometryModel,geometryGradientStep,geometryLossGradient,observedTarget,observedSource} from '../utils/geometry.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),id=useId(),model=ref({...initialGeometryModel}),eta=ref(.03),updates=ref(0)
const staged=()=>props.stage>=3?geometryGradientStep(initialGeometryModel,eta.value).next:{...initialGeometryModel}
const reset=()=>{eta.value=.03;model.value=staged();updates.value=0}
reset()
const advance=()=>{model.value=geometryGradientStep(model.value,eta.value).next;updates.value++;return updates.value<5}
const {playing}=usePlayback(advance,reset,500)
watch(()=>props.stage,()=>{playing.value=false;reset()})
watch(eta,()=>{if(updates.value===0)model.value=staged()})
const visible=computed(()=>nav.isPrintMode.value?staged():model.value),stats=computed(()=>geometryLossGradient(visible.value))
const formula=computed(()=>props.stage<2?String.raw`\widehat D_t=D_\theta(I_t),\qquad\widehat T_{c_t}^{c_s}=P_\beta(I_t,I_s)`:String.raw`\Theta_{n+1}=\Theta_n-\eta\nabla_\Theta\mathcal L_{\mathrm{photo}},\qquad\Theta=(\theta,\beta)`)
function toggle(){if(!playing.value&&updates.value>=5)reset();playing.value=!playing.value}
</script>
<template>
 <div class="geometry-training" :data-depth="visible.depth" :data-baseline="visible.baseline" :data-loss="stats.loss" :data-updates="updates" :data-eta="eta">
  <svg class="ssl-svg geometry-training-path" viewBox="0 0 860 242" role="img" aria-label="Profondeur et pose alimentent une reprojection différentiable; les gradients modifient les deux réseaux, sans changer les images">
   <defs><marker :id="`${id}-solid`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="`${id}-grad`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a8161d"/></marker></defs>
   <foreignObject x="8" y="15" width="145" height="120"><GeoImage :image="observedTarget" label="Observation Iₜ"/></foreignObject><foreignObject x="8" y="135" width="145" height="110"><GeoImage :image="observedSource" label="Observation Iₛ"/></foreignObject>
   <path d="M172 56H197" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><path d="M177 56H186V165H197" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><path d="M172 165H197" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><rect x="205" y="31" width="128" height="48" rx="4" class="ssl-encoder"/><text x="269" y="61" text-anchor="middle">Profondeur Dθ</text><rect x="205" y="142" width="128" height="48" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="269" y="172" text-anchor="middle">Pose Pβ</text>
   <path d="M340 56H358" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><path d="M340 166H358" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><text x="380" y="61">D̂ₜ</text><text x="380" y="172">R̂, t̂</text>
   <g v-if="stage>=1"><path d="M409 56H550V84" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><path d="M454 166H470V130H478" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><path d="M172 227H500V148" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><rect x="486" y="91" width="144" height="50" rx="4" fill="#f3f5f7" stroke="#64748b"/><text x="558" y="110" text-anchor="middle" class="small"><tspan x="558">Reprojection</tspan><tspan x="558" dy="19">géométrique</tspan></text><path d="M638 116H674" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><text x="690" y="122">Îₜ</text><path d="M725 116H743" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/><rect x="751" y="93" width="93" height="48" rx="4" fill="#fff1f1" stroke="#CF1C24"/><text x="797" y="123" text-anchor="middle">Perte</text><text x="797" y="34" text-anchor="middle" class="small">Observé Iₜ</text><path d="M797 44V86" class="ssl-forward" :marker-end="`url(#${id}-solid)`"/></g>
   <g v-if="stage>=2"><path d="M844 100H855V17H269V28" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-grad)`"/><path d="M844 133H855V205H269V192" fill="none" stroke="#a8161d" stroke-width="2" stroke-dasharray="6 4" :marker-end="`url(#${id}-grad)`"/><text x="666" y="188" class="small" text-anchor="middle">Gradients par projection et échantillonnage</text></g>
  </svg>
  <MathLine :formula="formula" small/>
  <div class="geometry-training-readout"><span>θ = D̂ = {{visible.depth.toFixed(3)}} · β = base estimée = {{visible.baseline.toFixed(3)}}</span><span>RVB L1 d’un pixel = {{stats.loss.toFixed(4)}}</span></div>
  <div class="geometry-caption">{{stage<2?'Profondeur et pose relative sont les grandeurs prédites.':stage===2?'Modifier les réseaux, sans changer les images ni les poses physiques.':'Mise à jour scalaire calculée : moins d’erreur ne fixe pas l’échelle métrique.'}}</div>
  <div v-if="stage>=3&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><button @click="playing=false;advance()">Appliquer une mise à jour</button><button class="primary" @click="toggle">{{playing?'Pause':'Lancer les mises à jour'}}</button><button @click="playing=false;reset()">Réinitialiser le modèle</button><label>Taux d’apprentissage <input aria-label="Taux d’apprentissage géométrique" v-model.number="eta" type="range" min=".01" max=".04" step=".01"/>{{eta.toFixed(2)}}</label></div>
  <SSLControls/><div class="ssl-disclosure">Modèle à deux sorties et dérivées bilinéaires/L1 · cinq mises à jour supplémentaires; aucun réseau appris</div>
 </div>
</template>
<style scoped>.geometry-training-path{height:228px}.geometry-training-readout{display:flex;justify-content:space-between;gap:15px;padding:8px 12px;background:#f3f9fb;border-left:3px solid #00BDF2;font-size:15px}.geometry-caption{font-size:16px;margin:9px 0;line-height:1.35}</style>
