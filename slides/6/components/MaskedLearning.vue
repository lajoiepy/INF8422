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
   <svg class="ssl-svg" viewBox="0 0 860 236" role="img" aria-label="L’observation originale fournit la cible; le masque change l’entrée">
    <defs><marker :id="id" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
    <foreignObject x="12" y="45" width="230" height="77"><MaskedScene :hidden="masked?sets.hidden:[]" :grid="masked"/></foreignObject><text x="127" y="29" text-anchor="middle">{{masked?'Entrée partiellement observée':'Image observée x'}}</text>
    <path d="M249 85H282" class="ssl-forward" :marker-end="`url(#${id})`"/><rect x="290" y="59" width="115" height="52" rx="4" class="ssl-encoder"/><text x="347" y="90" text-anchor="middle">fθ</text><path d="M411 85H445" class="ssl-forward" :marker-end="`url(#${id})`"/><rect x="453" y="59" width="115" height="52" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="510" y="90" text-anchor="middle">dω</text><path d="M575 85H613" class="ssl-forward" :marker-end="`url(#${id})`"/><text x="689" y="90">Pixels prédits</text>
    <foreignObject x="12" y="148" width="230" height="77"><MaskedScene :grid="false"/></foreignObject><text x="370" y="193">Les pixels originaux observés fournissent la cible.</text>
   </svg>
   <div class="ssl-caption">{{stage===0?'Copier l’entrée peut reconstruire sans apprendre de caractéristiques utiles.':'Retirer l’information de l’entrée de prédiction, en la conservant pour la cible.'}}</div>
  </template>
  <template v-else-if="mode==='mask'">
   <div class="mask-pair"><figure><figcaption>Observation originale x</figcaption><MaskedScene :grid="stage>=0"/></figure><figure><figcaption>{{masked?'Blocs visibles V · masqués M':'Découpage : 48 blocs carrés'}}</figcaption><MaskedScene :hidden="masked?sets.hidden:[]" :grid="true"/></figure></div>
   <svg class="ssl-svg compact-tokens" viewBox="0 0 860 120" role="img" aria-label="Seuls les jetons visibles entrent dans l’encodeur">
    <g v-if="stage>=2"><rect x="12" y="15" width="690" height="69" rx="4" fill="#f8fafc" stroke="#cbd5e1"/><g v-for="(k,j) in tokenIds" :key="k" :transform="`translate(${24+j*(650/Math.max(tokenIds.length,1))} 28)`"><rect :width="Math.min(34,600/tokenIds.length)" height="30" fill="#dcf3fb" stroke="#00BDF2"/><text :x="Math.min(34,600/tokenIds.length)/2" y="21" text-anchor="middle" class="tiny">{{k}}</text></g><text x="355" y="107" text-anchor="middle" class="small">Jetons visibles + positions</text><path d="M710 48H748" class="ssl-forward"/><rect x="756" y="24" width="89" height="49" rx="4" class="ssl-encoder"/><text x="800" y="55" text-anchor="middle">fθ</text></g>
    <text v-else x="430" y="61" text-anchor="middle">{{stage===0?'k identifie une position dans l’image originale.':`${sets.visible.length} blocs visibles; ${sets.hidden.length} valeurs retirées de l’encodeur.`}}</text>
   </svg>
   <div class="ssl-caption">{{stage<2?'La procédure conserve toutes les valeurs originales des blocs.':'L’encodeur MAE reçoit les jetons visibles et leurs positions originales.'}}</div>
  </template>
  <template v-else-if="mode==='architecture'">
   <div v-if="stage<3" class="mae-custom">
    <div class="mask-pair"><figure><figcaption>Observation originale</figcaption><MaskedScene/></figure><figure><figcaption>Entrée encodeur : blocs visibles seuls</figcaption><MaskedScene :hidden="sets.hidden"/></figure></div>
    <svg class="ssl-svg mae-path" viewBox="0 0 860 145" role="img" aria-label="Blocs visibles dans l’encodeur MAE; masques appris et positions ajoutés au décodeur">
     <text x="60" y="29" text-anchor="middle" class="small">Visible</text><rect x="13" y="44" width="90" height="43" fill="#dcf3fb" stroke="#00BDF2"/><text x="58" y="71" text-anchor="middle">{{sets.visible.length}} jetons</text><path d="M110 65H147" class="ssl-forward"/><rect x="155" y="41" width="105" height="48" rx="4" class="ssl-encoder"/><text x="208" y="71" text-anchor="middle">fθ</text><path d="M267 65H305" class="ssl-forward"/><text x="331" y="70">ψ</text>
     <g v-if="stage>=1"><path d="M355 65H393" class="ssl-forward"/><rect x="400" y="28" width="151" height="76" rx="4" fill="#f8fafc" stroke="#94a3b8"/><g v-for="(k,j) in 12" :key="k"><rect :x="410+(j%6)*22" :y="40+Math.floor(j/6)*26" width="17" height="21" :fill="j%4===0?'#bfe7f4':'#ccd3d9'"/></g><text x="475" y="128" text-anchor="middle" class="small">Ajouter masques + positions</text><path d="M558 65H592" class="ssl-forward"/><rect x="600" y="41" width="107" height="48" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="653" y="71" text-anchor="middle">dω</text></g>
     <g v-if="stage>=2"><path d="M714 65H748" class="ssl-forward"/><text x="802" y="58" text-anchor="middle">Bloc</text><text x="802" y="82" text-anchor="middle">pixels x̂ₖ</text></g>
    </svg>
   </div>
   <div v-else class="mae-paper"><img :src="figure" alt="MAE figure 1 originale : encodeur du visible, masques du décodeur et reconstruction de pixels"/><div class="ssl-caption">Les jetons de masque entrent dans le décodeur après encodage du visible.</div><div class="citation"><a href="https://arxiv.org/html/2111.06377v3">He et al., MAE, CVPR 2022 · Fig. 1 · arXiv v3</a></div></div>
   <div v-if="stage<3" class="ssl-caption">{{stage===0?'Encoder les blocs visibles seuls.':stage===1?'Restaurer les positions avec jetons visibles encodés et jetons de masque appris.':'Le décodeur prédit les pixels à toutes les positions de blocs.'}}</div>
  </template>
  <template v-else>
   <div class="pixel-panels"><figure><figcaption>Pixels cibles originaux</figcaption><MaskedScene :highlight="highlighted"/></figure><figure><figcaption>Entrée encodeur visible</figcaption><MaskedScene :hidden="sets.hidden" :highlight="[selected]"/></figure><figure><figcaption>Prédiction de pixels illustrative</figcaption><MaskedScene :prediction="prediction" :highlight="highlighted"/></figure></div>
   <MathLine :formula="stage===0?String.raw`\|\widehat x_k-x_k\|_2^2`:String.raw`\mathcal L_{\mathrm{pixel}}=\frac{1}{|\mathcal M|}\sum_{k\in\mathcal M}\|\widehat x_k-x_k\|_2^2`"/>
   <div class="pixel-readout">{{stage===0?`Bloc masqué choisi k = ${selected}: erreur quadratique = ${patchPixelError(selected,prediction[selected]).toFixed(2)}`:`Moyenner sur ${sets.hidden.length} blocs masqués : Lpixel = ${stats.loss.toFixed(2)}`}}</div>
   <div class="ssl-caption">{{stage<2?'xₖ est le vecteur RVB original du bloc k.':'Erreurs visibles exclues; la perte de base agit sur M.'}}</div>
   <div class="ssl-disclosure">Pixels RVB dans [0, 1] · tuiles prédites par moyenne du bloc visible voisin, sans MAE entraîné ni normalisation cible par bloc</div>
  </template>
  <div v-if="!nav.isPrintMode.value&&(mode==='mask'||mode==='loss')" class="ssl-parameter-controls lab-controls">
   <button @click="pattern=(pattern+1)%6;focus=0;($event.target as HTMLElement).blur()">Changer le masque</button><label>Fraction masquée <input aria-label="Fraction masquée" type="range" min=".5" max=".875" step=".125" v-model.number="ratio"/>{{(ratio*100).toFixed(1)}}%</label>
   <template v-if="mode==='loss'"><label>Luminosité prédite <input aria-label="Luminosité prédite" type="range" min=".5" max="1.5" step=".1" v-model.number="brightness"/>{{brightness.toFixed(1)}}</label><button @click="focus++;($event.target as HTMLElement).blur()">Bloc masqué suivant</button></template>
  </div>
  <SSLControls/>
 </div>
</template>
<style scoped>.mask-pair{display:grid;grid-template-columns:1fr 1fr;gap:30px}.mask-pair figure,.pixel-panels figure{margin:0}.mask-pair figcaption,.pixel-panels figcaption{font-size:16px;margin:7px 0}.mask-pair .masked-scene{max-height:127px}.compact-tokens{height:110px;margin-top:8px}.mae-path{height:140px;margin-top:14px}.mae-paper img{height:270px;max-width:100%;margin:auto;display:block}.pixel-panels{display:grid;grid-template-columns:repeat(3,1fr);gap:17px}.pixel-readout{padding:8px 12px;background:#fff4ee;border-left:3px solid #F15A22;font-size:17px}.pixel-panels figcaption{font-size:15px}.masked-learning .ssl-caption{margin:10px 0}</style>
