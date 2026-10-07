<script setup lang="ts">
import {useId} from 'vue'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const id=useId()
const sources=[
 {title:'Vues liées',detail:'Transformation / temps',symbol:'x̃₁ ↔ x̃₂',color:'#00BDF2'},
 {title:'Observations masquées',detail:'Pixels retirés',symbol:'xₖ → cible xₖ',color:'#F15A22'},
 {title:'Sorties enseignantes',detail:'Caractéristiques cibles',symbol:'sg(fθ̄(x))',formula:'\\operatorname{sg}(f_{\\bar\\theta}(x))',color:'#25B34B'},
 {title:'Géométrie',detail:'Profondeur / paires visibles',symbol:'Profondeur + poses',color:'#00BDF2'},
 {title:'Mesures ultérieures',detail:'Traversée / interaction',symbol:'o → Γ → y',color:'#F15A22'}
]
</script>
<template>
 <div class="course-synthesis">
  <div class="synthesis-sources"><div v-for="(s,k) in sources" :key="s.title" :class="{pending:stage<1&&k>=3}" :style="{borderColor:s.color}"><b>{{s.title}}</b><div class="source-symbol"><MathLine v-if="k===2" :formula="s.formula" small/><template v-else>{{s.symbol}}</template></div><span>{{s.detail}}</span></div></div>
  <div class="synthesis-source-note">Sources de cibles alternatives, chacune avec sa règle et ses observations valides.</div>
  <svg class="ssl-svg synthesis-computation" viewBox="0 0 860 151" role="img" aria-label="L’observation passe par encodeur et tête; la perte compare prédiction et cible automatique, puis les gradients modifient les paramètres">
   <defs><marker :id="id+'-forward'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker><marker :id="id+'-gradient'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#CF1C24"/></marker><marker :id="id+'-target'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#25B34B"/></marker></defs>
   <text x="8" y="67" class="small">Entrée disponible</text><text x="38" y="93" class="small">x, a si nécessaire</text><path d="M126 66H166" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="176" y="42" width="115" height="47" rx="4" class="ssl-encoder"/><text x="233" y="72" text-anchor="middle">Encodeur fθ</text><path d="M298 66H333" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/><text x="348" y="72">ψ</text><path d="M375 66H410" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="420" y="42" width="104" height="47" rx="4" fill="#fff3eb" stroke="#F15A22"/><text x="472" y="72" text-anchor="middle">Tête</text><path d="M531 66H565" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/><text x="580" y="72">ŷ</text><path d="M610 66H650" class="ssl-forward" :marker-end="'url(#'+id+'-forward)'"/>
   <rect x="660" y="42" width="91" height="47" rx="4" fill="#fff1f1" stroke="#CF1C24"/><text x="705" y="72" text-anchor="middle">Perte</text><text x="755" y="27" text-anchor="middle" class="small">Cible construite y</text><path d="M805 33V66H758" stroke="#25B34B" stroke-width="2" fill="none" :marker-end="'url(#'+id+'-target)'"/>
   <g v-if="stage>=2"><path d="M705 96V113H233V93" fill="none" stroke="#CF1C24" stroke-width="1.5" stroke-dasharray="5 3" :marker-end="'url(#'+id+'-gradient)'"/><path d="M472 113V93" fill="none" stroke="#CF1C24" stroke-width="1.5" stroke-dasharray="5 3" :marker-end="'url(#'+id+'-gradient)'"/><text x="432" y="142" text-anchor="middle" class="small">Comparer → différencier → mettre à jour</text></g>
  </svg>
  <div class="synthesis-assumptions"><b>Hypothèses du signal</b><span>Relations entre vues · représentation · visibilité · synchronisation · support de mesure</span></div>
  <div v-if="stage>=2" class="takeaway">Réutiliser la représentation ou le prédicteur de tâche direct.<br>Évaluer la sortie sur la tâche robotique réservée.</div>
  <div v-else class="ssl-caption">La cible automatique supervise; l’objectif façonne l’information conservée.</div>
  <SSLControls/><div class="ssl-disclosure">Schéma commun du cours · architectures, cibles, hypothèses et protocoles diffèrent selon les méthodes</div>
 </div>
</template>
<style scoped>.synthesis-sources{display:grid;grid-template-columns:repeat(5,1fr);gap:13px;margin-top:10px}.synthesis-sources>div{border-top:3px solid;background:#f8fafc;padding:8px;font-size:14px;min-height:100px}.synthesis-sources b{font-size:14px;display:block;min-height:40px}.source-symbol{font-size:18px;margin:5px 0;color:#334155}.synthesis-sources span{display:block;font-size:12px}.pending{opacity:.15}.synthesis-source-note{font-size:14px;margin:7px 0;color:#475569}.synthesis-computation{height:107px}.source-symbol :deep(.math-line){min-height:27px;font-size:17px}.source-symbol :deep(.katex-display){margin:0}.synthesis-assumptions{display:flex;gap:15px;align-items:center;font-size:14px;background:#edf8fc;border-left:3px solid #00BDF2;padding:7px 10px;margin:8px 0}.synthesis-assumptions span{display:block;margin-top:0}.course-synthesis .takeaway{font-size:16px;margin:6px 0;padding:6px 12px}.course-synthesis .ssl-caption{font-size:16px}.course-synthesis .ssl-disclosure{font-size:11px}</style>
