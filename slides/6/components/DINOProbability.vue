<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {initialLogits,distillationStats} from '../utils/distillation.mjs'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),tauStudent=ref(.4),tauTeacher=ref(.2),centered=ref(true)
const reset=()=>{tauStudent.value=.4;tauTeacher.value=.2;centered.value=true}
usePlayback(()=>false,reset);watch(()=>props.stage,reset)
const stats=computed(()=>distillationStats(initialLogits.student,initialLogits.teacher,initialLogits.center,tauStudent.value,tauTeacher.value,centered.value))
const formula=computed(()=>props.stage===0?String.raw`\mathbf q_i^{(2)}=g_\phi(f_\theta(\widetilde x_i^{(2)}))\qquad\bar{\mathbf q}_i^{(1)}=g_{\bar\phi}(f_{\bar\theta}(\widetilde x_i^{(1)}))`:props.stage===1?String.raw`\begin{aligned}\boldsymbol\rho_{\mathrm{stu}}&=\operatorname{softmax}(\mathbf q_i^{(2)}/\tau_{\mathrm{stu}})\\\boldsymbol\rho_{\mathrm{teach}}&=\operatorname{sg}\!\left(\operatorname{softmax}((\bar{\mathbf q}_i^{(1)}-\mathbf m)/\tau_{\mathrm{teach}})\right)\end{aligned}`:String.raw`\ell_{\mathrm{DINO}}=-\sum_e\rho_{\mathrm{teach},e}\log\rho_{\mathrm{stu},e}`)
</script>
<template>
  <div class="dino-probability" :data-loss="stats.loss" :data-student="JSON.stringify(stats.studentProbability)" :data-teacher="JSON.stringify(stats.teacherProbability)" :data-centered="centered">
    <svg class="ssl-svg distribution-svg" viewBox="0 0 860 207" role="img" aria-label="Probabilités étudiant et enseignant à gradient coupé sur trois composantes illustratives">
      <g v-for="row in 2" :key="row" :transform="`translate(${(row-1)*440} 0)`"><text x="180" y="25" text-anchor="middle" class="strong">{{row===1?'Étudiant · vue 2':'Enseignant · vue 1 · gradient coupé'}}</text>
        <g v-if="stage===0"><text x="180" y="74" text-anchor="middle">Sorties de tête (exemple)</text><foreignObject x="112" y="92" width="145" height="35"><FeatureVector :values="row===1?initialLogits.student:initialLogits.teacher" compact :accent="row===1?'#00BDF2':'#F15A22'"/></foreignObject><text v-if="row===2" x="180" y="167" text-anchor="middle" class="small">Centre m = (0.05, 0.02, −0.01)</text></g>
        <g v-else><path d="M39 169H327M39 169V43" stroke="#94a3b8"/><text x="22" y="50" class="tiny">1</text><text x="22" y="172" class="tiny">0</text><g v-for="(p,e) in row===1?stats.studentProbability:stats.teacherProbability" :key="e"><rect :x="69+e*86" :y="169-p*113" width="44" :height="p*113" :fill="row===1?'#1792b3':'#c45314'"/><text :x="91+e*86" :y="160-p*113" text-anchor="middle" class="small">{{p.toFixed(3)}}</text><text :x="91+e*86" y="194" text-anchor="middle" class="small">e = {{e+1}}</text></g></g>
      </g>
    </svg>
    <MathLine :formula="formula" small/>
    <div v-if="stage>=2" class="dino-loss-readout">Entropie croisée calculée pour une paire : <b>{{stats.loss.toFixed(4)}}</b></div>
    <div v-if="stage>=1&&!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls" @click.stop><label>Étudiant τ <input aria-label="Température étudiante" type="range" min=".1" max="1" step=".05" v-model.number="tauStudent"/>{{tauStudent.toFixed(2)}}</label><label>Enseignant τ <input aria-label="Température enseignante" type="range" min=".05" max=".5" step=".05" v-model.number="tauTeacher"/>{{tauTeacher.toFixed(2)}}</label><label><input aria-label="Centrer les sorties enseignantes" type="checkbox" v-model="centered"/>Centrer les sorties enseignantes</label></div>
    <SSLControls/>
  </div>
</template>
<style scoped>.distribution-svg{height:207px;margin-top:10px}.dino-loss-readout{font-size:17px;border-left:3px solid #CF1C24;padding:6px 10px;background:#fff4f3;margin:8px 0}.dino-probability .ssl-parameter-controls{gap:17px}.dino-probability input[type=range]{width:100px}.dino-probability input[type=checkbox]{accent-color:#CF1C24}</style>
