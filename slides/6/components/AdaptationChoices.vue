<script setup lang="ts">
import {computed,ref,watch,useId} from 'vue'
import {useNav} from '@slidev/client'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),id=useId()
const mode=ref('frozen'),defaultMode=()=>props.stage>=1?'tune':'frozen'
mode.value=defaultMode();watch(()=>props.stage,()=>mode.value=defaultMode())
const selected=computed(()=>nav.isPrintMode.value?defaultMode():mode.value),tune=computed(()=>selected.value==='tune')
const formula=computed(()=>tune.value?'\\Theta=(\\theta,\\beta),\\quad\\text{modifier encodeur et tête}':'\\theta=\\text{fixe},\\quad\\Theta=(\\beta)')
</script>
<template>
 <div class="adaptation-choices" :data-mode="selected" :data-updated="tune?'theta,psi':'psi'">
  <div class="adaptation-label">{{tune?'Ajuster l’encodeur et la tête':'Geler l’encodeur · entraîner la tête'}}</div>
  <svg class="ssl-svg adaptation-diagram" viewBox="0 0 860 220" role="img" aria-label="L’encodeur conservé alimente une nouvelle tête; les gradients modifient la tête seule ou aussi l’encodeur">
   <defs><marker :id="id+'-forward'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="id+'-grad'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#CF1C24"/></marker></defs>
   <foreignObject x="5" y="58" width="82" height="65"><SampleImage/></foreignObject><text x="46" y="146" text-anchor="middle" class="small">Nouvelle entrée x</text>
   <path d="M96 90H127" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="137" y="63" width="142" height="55" rx="4" :class="tune?'updated-encoder':'frozen-encoder'"/><text x="208" y="96" text-anchor="middle">Encodeur fθ</text><text x="208" y="49" text-anchor="middle" class="small">{{tune?'Mettre à jour θ':'Garder θ fixe'}}</text>
   <path d="M286 90H322" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/><text x="338" y="96">ψ</text>
   <path d="M365 90H405" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="415" y="63" width="130" height="55" rx="4" class="updated-head"/><text x="480" y="96" text-anchor="middle">Tête hβ</text><text x="480" y="49" text-anchor="middle" class="small">Mettre à jour β</text>
   <path d="M552 90H589" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/><text x="605" y="96">ŷ</text><path d="M634 90H673" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="683" y="63" width="92" height="55" rx="4" class="task-loss"/><text x="729" y="96" text-anchor="middle">Perte</text>
   <text x="729" y="25" text-anchor="middle" class="small">Étiquettes de tâche y</text><path d="M729 33V56m-4 -6l4 6 4 -6" stroke="#25B34B" fill="none" stroke-width="2"/>
   <path d="M729 123V173H480V121" class="adaptation-gradient" :marker-end="'url(#'+id+'-grad)'"/>
   <path v-if="tune" d="M480 173H208V121" class="adaptation-gradient" :marker-end="'url(#'+id+'-grad)'"/>
   <text x="430" y="209" text-anchor="middle" class="small">Sombre : prédiction · vert : cibles · tirets rouges : gradients</text>
  </svg>
  <MathLine :formula="formula" small/>
  <div v-if="stage>=2" class="adaptation-context"><div><b>Caractéristiques gelées</b><span>Évaluer l’information accessible à la tête choisie.</span></div><div><b>Ajustement fin</b><span>Adapter les caractéristiques et la tête à la tâche cible.</span></div></div>
  <div class="ssl-caption">Une sonde linéaire exige hβ linéaire. Un encodeur gelé peut aussi alimenter une tête non linéaire.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Adaptation <select aria-label="Choix d’adaptation" v-model="mode" @change="($event.target as HTMLElement).blur()"><option value="frozen">Encodeur gelé</option><option value="tune">Ajustement fin</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Schéma de mise à jour · aucun optimiseur ni modèle préentraîné exécuté</div>
  <div class="citation"><a href="https://arxiv.org/html/2002.05709v3#A2.SS8">Chen et al., SimCLR, ICML 2020 · Annexe B.8</a></div>
 </div>
</template>
<style scoped>
.adaptation-label{font-size:19px;font-weight:600;margin:8px 0 6px}.adaptation-diagram{height:160px}.frozen-encoder{fill:#f1f5f9;stroke:#64748b;stroke-width:2}.updated-encoder{fill:#edf8fc;stroke:#00BDF2;stroke-width:3}.updated-head{fill:#fff3eb;stroke:#F15A22;stroke-width:3}.task-loss{fill:#fff1f1;stroke:#CF1C24;stroke-width:1.5}.adaptation-gradient{fill:none;stroke:#CF1C24;stroke-width:1.8;stroke-dasharray:5 3}.adaptation-context{display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:15px;margin:6px 0}.adaptation-context div{border-left:3px solid #00BDF2;background:#edf8fc;padding:4px 10px}.adaptation-context span{display:block;margin-top:3px}.adaptation-choices .ssl-caption{font-size:15px;margin:9px 0}.adaptation-choices .ssl-parameter-controls{font-size:14px}.adaptation-choices .ssl-disclosure{font-size:11px}
</style>
