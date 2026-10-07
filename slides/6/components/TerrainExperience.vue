<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {terrainState,terrainBands,poseAt,measurements,availableMeasurements,footprintAt,projectedFootprint,polygonText,observedColor,updateLocalEstimates,localLoss} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{mode?:string;stage?:number}>(),{mode:'measure',stage:0})
const nav=useNav(),time=ref(0),offset=ref(0),estimates=ref(Array(5).fill(.5)),updates=ref(0)
const formulas={cost:'y=\\Gamma(o)=\\operatorname{clip}_{[0,1]}(1-v_{\\mathrm{meas}}/v_{\\mathrm{cmd}})',projection:'\\mathbf u_0=\\pi\\!\\left(K_0(R_r^{c_0}p^r+t_r^{c_0})\\right)'}
function reset(){const s=terrainState(props.mode,props.stage);time.value=s.time;offset.value=s.offset;estimates.value=s.estimates;updates.value=0}
reset()
const {playing}=usePlayback(()=>{time.value=Math.min(5,Math.round((time.value+.25)*100)/100);return time.value<5},reset,150)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const state=computed(()=>terrainState(props.mode,props.stage)),clock=computed(()=>nav.isPrintMode.value?state.value.time:time.value),shift=computed(()=>nav.isPrintMode.value?state.value.offset:offset.value)
const samples=computed(()=>availableMeasurements(clock.value)),last=computed(()=>samples.value.at(-1)),robot=computed(()=>poseAt(clock.value))
const projected=computed(()=>last.value?projectedFootprint(last.value,shift.value):null)
const labels=computed(()=>props.mode==='coverage'||props.mode==='project'&&props.stage>=1?samples.value:[])
const showEstimate=computed(()=>props.mode==='project'&&props.stage>=3)
const loss=computed(()=>localLoss(estimates.value,clock.value))
const map=(p:number[])=>[160+p[0]*65,230-p[1]*45]
const mapPolygon=(points:number[][])=>polygonText(points.map(map))
function play(){if(time.value>=5)time.value=0;playing.value=!playing.value}
function update(){estimates.value=updateLocalEstimates(estimates.value,clock.value);updates.value++}
const caption=computed(()=>props.mode==='measure'?'Le parcours mesure le mouvement; l’indicateur choisi le transforme en coût.':props.mode==='delay'?'L’image antérieure est fixe. La cible n’arrive qu’après traversée réelle.':props.mode==='project'?shift.value!==0?'Mauvais horodatage : mesure identique, région visuelle différente.':props.stage>=3?'Restaurer la synchronisation avant d’utiliser ces cibles mesurées.':'Reprojeter chaque empreinte avec la pose à l’instant de mesure.':props.stage>=2?'Le chemin sélectionne les données; les régions non visitées restent non mesurées.':'Vert et orange : résultats observés; hachures : aucune mesure.')
</script>
<template>
 <div class="terrain-experience" :data-mode="mode" :data-time="clock" :data-offset="shift" :data-label-count="labels.length" :data-measured-count="samples.length" :data-robot-position="JSON.stringify(robot)" :data-projection="JSON.stringify(projected?.center||null)" :data-cost="last?.cost??null" :data-loss="loss" :data-updates="updates" :data-estimates="JSON.stringify(estimates)">
  <div class="terrain-pair">
   <div><div class="terrain-heading">Sol parcouru · vue du dessus</div>
    <svg class="ssl-svg terrain-world" viewBox="0 0 320 260" role="img" aria-label="Robot suivant une trajectoire mesurée sur terrain synthétique">
     <rect v-for="band in terrainBands" :key="band.name" x="39" :y="map([0,band.far])[1]" width="242" :height="(band.far-band.near)*45" :fill="band.color"/><text v-for="band in terrainBands" :key="band.name+'name'" x="46" :y="map([0,(band.near+band.far)/2])[1]+4" class="small">{{({Grass:'Herbe',Gravel:'Gravier',Mud:'Boue'})[band.name]||band.name}}</text>
     <path d="M160 241V36" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"/>
     <polygon v-for="m in samples" :key="m.time" :points="mapPolygon(footprintAt(m.poseTime))" :fill="observedColor(m.cost)" stroke="white" stroke-width="1"/>
     <g :transform="'translate('+map(robot).join(' ')+')'"><rect x="-16" y="-15" width="32" height="30" rx="5" fill="#333"/><rect x="-22" y="-14" width="7" height="27" rx="2" fill="#64748b"/><rect x="15" y="-14" width="7" height="27" rx="2" fill="#64748b"/><path d="M0 -4V-27m-5 6l5 -7 5 7" stroke="white" fill="none" stroke-width="2"/></g>
     <path d="M145 247l15 -10 15 10Z" fill="#00BDF2"/><text x="193" y="250" class="tiny">Caméra à t = 0</text>
     <text x="204" :y="Math.max(25,map(robot)[1]-22)" class="small">t = {{clock.toFixed(2)}} s</text>
    </svg>
   </div>
   <div><div class="terrain-heading">Image antérieure I₀ · t = 0</div><TerrainImage :samples="labels" :offset="shift" :show-true="shift!==0" :selected="labels.length-1"/>
    <div v-if="mode==='project'||mode==='coverage'" class="terrain-legend"><span class="good">■ Coût faible observé</span><span class="bad">■ Coût élevé observé</span><span>▧ Non visité</span></div>
    <div v-else class="terrain-delay"><span>Image enregistrée</span><span class="delay-arrow">→</span><span>{{samples.length?'Résultat disponible':'Pas encore de résultat'}}</span></div>
    <div v-if="shift!==0" class="terrain-offset-note">Contour en tirets : empreinte correcte</div>
   </div>
  </div>
  <MathLine v-if="mode==='measure'" :formula="formulas.cost" small/>
  <MathLine v-if="mode==='project'&&stage>=1" :formula="formulas.projection" small/>
  <div class="terrain-readout">{{last?'Commande 1.00 m/s · mesure '+last.measured.toFixed(2)+' m/s · coût automatique y = '+last.cost.toFixed(2):'Commande 1.00 m/s · mouvement futur non mesuré'}}<span v-if="mode==='project'"> · {{labels.length}} cibles projetées · décalage temporel de pose {{shift.toFixed(1)}} s</span></div>
  <div v-if="showEstimate" class="terrain-estimate"><template v-if="last">Estimation locale jouet : {{estimates[samples.length-1].toFixed(3)}} → cible mesurée {{last.cost.toFixed(2)}} · erreur quadratique moyenne {{loss?.toFixed(4)}}<button v-if="!nav.isPrintMode.value" @click.stop="update();($event.target as HTMLElement).blur()">Mettre à jour les estimations jouets</button></template><template v-else>Aucune cible mesurée disponible.</template></div>
  <div class="ssl-caption">{{caption}}</div>
  <div v-if="mode==='coverage'&&stage>=1" class="terrain-paper-choice">Le score WVN nul des segments non visités est un choix conservateur, sans échec observé.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><label>Temps <input aria-label="Temps du robot" type="range" min="0" max="5" step=".25" v-model.number="time" @input="playing=false"/>{{time.toFixed(2)}} s</label><button aria-label="Avancer le robot" @click="playing=false;time=Math.min(5,time+.25)">Avancer</button><button class="primary" :aria-label="playing?'Pause':'Lancer la traversée'" @click="play">{{playing?'Pause':'Lecture'}}</button><button aria-label="Réinitialiser la traversée" @click="playing=false;reset()">Réinitialiser</button><template v-if="mode==='project'"><label>Décalage <input aria-label="Décalage d’horodatage" type="range" min="-1" max="1" step=".5" v-model.number="offset"/>{{offset.toFixed(1)}} s</label><button aria-label="Restaurer l’alignement" @click="offset=0">Aligner</button></template></div>
  <SSLControls/><div class="ssl-disclosure">Parcours synthétique et projection étalonnée · coûts et mises à jour pédagogiques, sans implémentation WVN</div>
  <div v-if="mode==='coverage'&&stage>=1" class="citation"><a href="https://link.springer.com/article/10.1007/s10514-025-10202-x">Mattamala et al., WVN, 2025 · Sections 3.4.3 et 3.5.2</a></div>
 </div>
</template>
<style scoped>
.terrain-pair{display:grid;grid-template-columns:320px 1fr;gap:32px;align-items:start}.terrain-heading{font-size:16px;margin:6px 0 9px}.terrain-world{height:145px}.terrain-pair :deep(.terrain-image){height:135px}.terrain-legend{display:flex;gap:14px;font-size:12px;margin-top:9px}.good{color:#168034}.bad{color:#b53d03}.terrain-delay{display:flex;align-items:center;gap:15px;margin-top:14px;font-size:16px}.delay-arrow{color:#F15A22;font-size:24px}.terrain-readout{background:#edf8fc;border-left:3px solid #00BDF2;padding:7px 9px;font-size:14px}.terrain-experience .ssl-caption{font-size:16px;margin:9px 0}.terrain-offset-note{font-size:12px;margin-top:5px}.terrain-paper-choice{font-size:14px;background:#fff3eb;border-left:3px solid #F15A22;padding:7px 9px;margin:8px 0}.terrain-estimate{font-size:13px;background:#eff9f2;padding:6px 9px;margin-top:5px}.terrain-estimate button{margin-left:10px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:3px;font-size:12px}.terrain-experience .ssl-parameter-controls{font-size:13px;margin:8px 0;gap:9px}.terrain-experience .ssl-parameter-controls input{width:100px}.terrain-experience .ssl-parameter-controls button{font-size:13px;padding:4px 7px}.terrain-experience .ssl-disclosure{font-size:11px}
</style>
