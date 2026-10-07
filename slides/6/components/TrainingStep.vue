<script setup lang="ts">
import { computed, ref, watch, useId } from 'vue'
import { useNav } from '@slidev/client'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { forward, update, initialParameters } from '../utils/trainingStep.mjs'
import { usePlayback } from '../utils/usePlayback'

const props = withDefaults(defineProps<{stage?:number; numerical?:boolean; retained?:boolean}>(),{stage:0,numerical:false,retained:false})
const nav = useNav()
const markerId = useId()
const parameters = ref({...initialParameters}), updates = ref(0), eta = ref(.2)
const values = computed(() => forward(parameters.value))
const reset = () => { parameters.value={...initialParameters}; updates.value=0; eta.value=.2 }
const oneUpdate = () => { parameters.value=update(parameters.value,eta.value); updates.value++; return updates.value<12 }
const {playing} = usePlayback(oneUpdate,reset)
watch(() => props.stage, () => { playing.value=false; reset() })
const stages = ['Observation','Masquer une partie de l’entrée','Prédiction directe','Construire la cible','Comparer prédiction et cible','Agréger un lot','Rétropropager dans le modèle','Mettre à jour les paramètres','Conserver les composants utiles']
const equations = [
  String.raw`x_i\;\text{est une image observée}`,
  String.raw`\widetilde x_i=\operatorname{mask}(x_i)`,
  String.raw`\widehat y_i=P_\Theta(\widetilde x_i)`,
  String.raw`y_i=(x_{i,k})_{k\in\mathcal M}`,
  String.raw`\ell(\widehat y_i,y_i)=\frac{1}{|\mathcal M|}\sum_{k\in\mathcal M}(\widehat y_{i,k}-y_{i,k})^2`,
  String.raw`\mathcal L=\frac{1}{B}\sum_{i=1}^{B}\ell(\widehat y_i,y_i)`,
  String.raw`\nabla_\Theta\mathcal L\qquad\Theta=(\theta,\omega)`,
  String.raw`\Theta_{n+1}=\Theta_n-\eta\nabla_\Theta\mathcal L`,
  String.raw`\boldsymbol{\psi}=f_\theta(x)\qquad\widehat y^{\mathrm{task}}=h_\beta(\boldsymbol{\psi})`,
]
const equation = computed(() => katex.renderToString(equations[props.stage],{displayMode:true,throwOnError:true}))
const caption = computed(() => [
  'L’observation complète reste accessible à la procédure d’apprentissage.',
  'Le modèle reçoit seulement le visible. L’original reste séparé.',
  'Encodeur et décodeur prédisent les valeurs retirées.',
  'Copier les valeurs observées masquées dans la branche cible.',
  'Évaluer l’erreur aux seules positions masquées choisies.',
  'B compte les observations. La moyenne spatiale se fait dans chaque perte.',
  'Rétropropagation vers encodeur et décodeur.',
  'n compte les pas d’optimisation. η règle l’amplitude de chaque mise à jour.',
  'Encoder une nouvelle observation. La tâche détermine la tête de sortie.',
][props.stage])
</script>

<template>
  <div class="training-step" :data-stage="stage" :data-updates="updates" :data-loss="values.loss">
    <svg class="training-diagram" :style="{'--forward-marker':`url(#${markerId}-forward)`,'--gradient-marker':`url(#${markerId}-gradient)`}" viewBox="0 0 860 206" role="img" aria-label="Image, entrée masquée, encodeur, décodeur, prédiction, cible fixe et gradients">
      <defs><marker :id="`${markerId}-forward`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#334155" /></marker><marker :id="`${markerId}-gradient`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#a8161d" /></marker></defs>
      <g :opacity="retained?.14:1"><text x="51" y="21" text-anchor="middle">Observé xᵢ</text><foreignObject x="9" y="35" width="84" height="84"><PixelObservation :size="84" /></foreignObject></g>
      <g v-if="stage>=1" :opacity="retained?.14:1"><path d="M98 77H128" class="forward"/><text x="179" y="21" text-anchor="middle">Entrée x̃ᵢ</text><foreignObject x="137" y="35" width="84" height="84"><PixelObservation mode="masked" :size="84" /></foreignObject></g>
      <g v-if="stage>=2"><path d="M228 77H266" class="forward" :opacity="retained?.14:1"/><rect x="276" y="45" width="130" height="66" rx="5" fill="#edf7fa" stroke="#00BDF2" stroke-width="2"/><text x="341" y="70" text-anchor="middle">Encodeur fθ</text><text x="341" y="94" text-anchor="middle" class="sub">représentation ψ</text><path d="M408 77H445" class="forward"/><g :opacity="retained?.14:1"><rect x="455" y="45" width="132" height="66" rx="5" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="521" y="71" text-anchor="middle">Décodeur dω</text><text x="521" y="94" text-anchor="middle" class="sub">reconstruction</text><path d="M590 77H622" class="forward"/><text x="674" y="21" text-anchor="middle">Prédiction ŷᵢ</text><foreignObject x="633" y="35" width="82" height="84"><PixelObservation mode="prediction" :predictions="values.predictions" :size="82" /></foreignObject></g></g>
      <g v-if="stage>=3" :opacity="retained?.14:1"><path d="M50 123V180H764V123" class="forward target-path"/><text x="365" y="172" text-anchor="middle" class="sub">Construction cible : valeurs masquées sélectionnées dans l’original</text><text x="795" y="21" text-anchor="middle">Cible yᵢ</text><foreignObject x="752" y="35" width="84" height="84"><PixelObservation mode="target" :size="84" /></foreignObject></g>
      <g v-if="stage>=4" :opacity="retained?.14:1"><path d="M675 121V141H704" class="forward"/><path d="M791 121V141H766" class="forward"/><rect x="710" y="127" width="50" height="29" rx="3" fill="#fff1f1" stroke="#CF1C24"/><text x="735" y="147" text-anchor="middle" class="sub">Perte</text></g>
      <g v-if="stage>=6&&!retained"><path d="M711 145H521V115" class="gradient"/><path d="M521 145H341V115" class="gradient"/><text x="527" y="201" text-anchor="middle" class="gradient-label">Gradients de θ et ω  </text></g>
      <g v-if="retained"><text x="522" y="196" text-anchor="middle" class="retained-label">Garder fθ · remplacer dω par une tête de tâche si adapté</text></g>
    </svg>
    <div class="training-equation" v-html="equation" />
    <p class="training-caption">{{ caption }}</p>
    <div v-if="numerical" class="numerical-readout">

    </div>
    <div v-if="numerical&&stage>=7&&!nav.isPrintMode.value" class="training-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()">
      <button @click="playing=false;oneUpdate()">Appliquer une mise à jour</button>
      <button class="primary" @click="playing=!playing">{{playing?'Pause':'Lancer les mises à jour'}}</button>
      <button @click="playing=false;reset()">Réinitialiser le modèle</button>
      <label>Taux d’apprentissage η <input aria-label="Taux d’apprentissage" type="range" min=".05" max=".3" step=".05" v-model.number="eta" />{{eta.toFixed(2)}}</label>
      <span>n = {{updates}}</span>
    </div>
    <div v-if="!retained&&!nav.isPrintMode.value" class="stage-controls lab-controls" @click.stop>
      <button :disabled="nav.clicks.value===0" @click="nav.prev();($event.target as HTMLElement).blur()">Étape précédente</button>
      <button :disabled="nav.clicks.value===nav.clicksTotal.value" @click="nav.next();($event.target as HTMLElement).blur()">Étape suivante</button>
      <span>{{stages[stage]}}</span>
    </div>
  </div>
</template>

<style scoped>
.training-diagram{display:block;width:100%;height:206px}.training-diagram text{font-family:'Avenir Next','Nunito Sans',sans-serif;font-size:16px;fill:#333}.training-diagram .sub{font-size:13px}.forward{fill:none;stroke:#334155;stroke-width:1.7;marker-end:var(--forward-marker)}.target-path{stroke:#1b7b37}.gradient{fill:none;stroke:#a8161d;stroke-width:2;stroke-dasharray:6 4;marker-end:var(--gradient-marker)}.training-diagram .gradient-label{fill:#a8161d;font-size:13px}.training-diagram .retained-label{fill:#1b7b37;font-weight:600}.training-equation{min-height:48px;display:flex;align-items:center;justify-content:center;font-size:21px}.training-equation :deep(.katex-display){margin:8px 0}.training-caption{font-size:17px!important;margin:6px 0!important;line-height:1.35!important}.numerical-readout{font-size:14px;line-height:1.6;display:flex;flex-wrap:wrap;column-gap:18px;border-left:3px solid #00BDF2;padding-left:10px;margin:5px 0}.stage-controls{margin-top:9px}.training-controls{margin:8px 0}.stage-controls span{font-size:13px;color:#475569}
</style>
