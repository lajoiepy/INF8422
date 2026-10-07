<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {labelCounts,baselineStyles,labelScores,labelX,scoreY,scorePath} from '../utils/evaluation.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0}),nav=useNav(),index=ref(2),scenario=ref('self-ahead')
watch(()=>props.stage,()=>{index.value=2;scenario.value='self-ahead'})
const i=computed(()=>nav.isPrintMode.value?2:index.value),which=computed(()=>nav.isPrintMode.value?'self-ahead':scenario.value),series=computed(()=>labelScores[which.value])
</script>
<template>
 <div class="label-efficiency" :data-budget="labelCounts[i]" :data-scenario="which" :data-scores="JSON.stringify(baselineStyles.map(b=>series[b.key][i]))">
  <div class="illustrative-label">Courbes illustratives · aucun résultat mesuré ni classement universel</div>
  <svg class="ssl-svg efficiency-chart" viewBox="0 0 860 292" role="img" aria-label="Score aval illustratif selon les étiquettes, comparant initialisation aléatoire et préentraînements supervisé/auto-supervisé">
   <path d="M80 35V235H748" class="ssl-forward"/>
   <g v-for="s in [0,.5,1]" :key="s"><path :d="'M80 '+scoreY(s)+'H748'" stroke="#e2e8f0"/><text x="66" :y="scoreY(s)+5" text-anchor="end" class="small">{{s.toFixed(1)}}</text></g>
   <text x="84" y="22" class="small">Score aval ↑</text>
   <g v-for="n in labelCounts" :key="n"><path :d="'M'+labelX(n)+' 235v5'" stroke="#475569"/><text :x="labelX(n)" y="258" text-anchor="middle" class="small">{{n}}</text></g>
   <text x="430" y="285" text-anchor="middle" class="small">Exemples étiquetés aval · axe logarithmique</text>
   <path :d="'M'+labelX(labelCounts[i])+' 35V235'" stroke="#94a3b8" stroke-dasharray="4 4"/>
   <g v-for="(b,k) in baselineStyles" :key="b.key" v-show="stage>=1||k===0"><polyline :points="scorePath(series[b.key])" fill="none" :stroke="b.color" :stroke-dasharray="k===1?'9 4':k===2?'3 3':undefined" stroke-width="3"/><circle :cx="labelX(labelCounts[i])" :cy="scoreY(series[b.key][i])" r="5" :fill="b.color" stroke="white" stroke-width="1.5"/></g>
  </svg>
  <div class="efficiency-legend"><div v-for="(b,k) in baselineStyles" :key="b.key" :class="{pending:stage<1&&k>0}"><span :style="{background:b.color}"/>{{b.name}}<b v-if="stage>=1||k===0">{{series[b.key][i].toFixed(2)}}</b></div></div>
  <div v-if="stage>=2" class="efficiency-conditions">Même partition aval et tête · règles de réglage cohérentes<br>Rapporter séparément données, annotations et calcul du préentraînement.</div>
  <div class="ssl-caption">Comparer le besoin d’étiquettes à un score et un protocole spécifiés.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls"><label>Étiquettes de tâche <select aria-label="Budget d’étiquettes de tâche" v-model.number="index" @change="($event.target as HTMLElement).blur()"><option v-for="(n,j) in labelCounts" :key="n" :value="j">{{n}}</option></select></label><label v-if="stage>=1">Scénario illustratif <select aria-label="Scénario de comparaison illustratif" v-model="scenario" @change="($event.target as HTMLElement).blur()"><option value="self-ahead">Avantage auto-supervisé</option><option value="supervised-ahead">Avantage supervisé</option></select></label></div>
  <SSLControls/><div class="ssl-disclosure">Valeurs pédagogiques fixes · x compte les annotations aval, sans celles avant adaptation</div>
 </div>
</template>
<style scoped>.illustrative-label{color:#b53d03;font-size:14px;font-weight:600;margin:10px 0}.efficiency-chart{height:200px}.efficiency-chart .small{font-size:16px}.efficiency-legend{display:flex;justify-content:space-between;font-size:13px;gap:12px;margin:7px 0}.efficiency-legend div{display:flex;gap:7px;align-items:center}.efficiency-legend span{width:13px;height:4px;display:inline-block}.efficiency-legend b{margin-left:2px}.pending{opacity:.18}.efficiency-conditions{background:#edf8fc;border-left:3px solid #00BDF2;padding:6px 10px;font-size:14px;margin:10px 0}.label-efficiency .ssl-caption{font-size:15px;margin:9px 0}.label-efficiency .ssl-parameter-controls{display:flex;gap:25px;font-size:14px}.label-efficiency .ssl-disclosure{font-size:11px}</style>
