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
const caption=computed(()=>props.mode==='measure'?'This run measures motion; the chosen proxy converts it into a cost.':props.mode==='delay'?'The earlier image is fixed. A target becomes available only after physical traversal.':props.mode==='project'?shift.value!==0?'Wrong timestamp: the same measurement lands on a different visual region.':props.stage>=3?'Restore time alignment before using these measured targets.':'Use the measurement-time pose to reproject each visited footprint.':props.stage>=2?'The driven path selects the training data; unvisited regions still have no measurement.':'Green and orange are observed outcomes; hatched areas have no measurement.')
</script>
<template>
 <div class="terrain-experience" :data-mode="mode" :data-time="clock" :data-offset="shift" :data-label-count="labels.length" :data-measured-count="samples.length" :data-robot-position="JSON.stringify(robot)" :data-projection="JSON.stringify(projected?.center||null)" :data-cost="last?.cost??null" :data-loss="loss" :data-updates="updates" :data-estimates="JSON.stringify(estimates)">
  <div class="terrain-pair">
   <div><div class="terrain-heading">Visited ground · top view</div>
    <svg class="ssl-svg terrain-world" viewBox="0 0 320 260" role="img" aria-label="Robot advances along a measured trajectory through synthetic terrain">
     <rect v-for="band in terrainBands" :key="band.name" x="39" :y="map([0,band.far])[1]" width="242" :height="(band.far-band.near)*45" :fill="band.color"/><text v-for="band in terrainBands" :key="band.name+'name'" x="46" :y="map([0,(band.near+band.far)/2])[1]+4" class="small">{{band.name}}</text>
     <path d="M160 241V36" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 4"/>
     <polygon v-for="m in samples" :key="m.time" :points="mapPolygon(footprintAt(m.poseTime))" :fill="observedColor(m.cost)" stroke="white" stroke-width="1"/>
     <g :transform="'translate('+map(robot).join(' ')+')'"><rect x="-16" y="-15" width="32" height="30" rx="5" fill="#333"/><rect x="-22" y="-14" width="7" height="27" rx="2" fill="#64748b"/><rect x="15" y="-14" width="7" height="27" rx="2" fill="#64748b"/><path d="M0 -4V-27m-5 6l5 -7 5 7" stroke="white" fill="none" stroke-width="2"/></g>
     <path d="M145 247l15 -10 15 10Z" fill="#00BDF2"/><text x="193" y="250" class="tiny">Camera at t = 0</text>
     <text x="204" :y="Math.max(25,map(robot)[1]-22)" class="small">t = {{clock.toFixed(2)}} s</text>
    </svg>
   </div>
   <div><div class="terrain-heading">Earlier camera image I₀ · t = 0</div><TerrainImage :samples="labels" :offset="shift" :show-true="shift!==0" :selected="labels.length-1"/>
    <div v-if="mode==='project'||mode==='coverage'" class="terrain-legend"><span class="good">■ Observed lower cost</span><span class="bad">■ Observed higher cost</span><span>▧ Unvisited</span></div>
    <div v-else class="terrain-delay"><span>Image recorded</span><span class="delay-arrow">→</span><span>{{samples.length?'Outcome now available':'No outcome yet'}}</span></div>
    <div v-if="shift!==0" class="terrain-offset-note">Dashed outline: correctly associated footprint</div>
   </div>
  </div>
  <MathLine v-if="mode==='measure'" :formula="formulas.cost" small/>
  <MathLine v-if="mode==='project'&&stage>=1" :formula="formulas.projection" small/>
  <div class="terrain-readout">{{last?'Commanded 1.00 m/s · measured '+last.measured.toFixed(2)+' m/s · automatic cost y = '+last.cost.toFixed(2):'Commanded 1.00 m/s · no later motion measurement yet'}}<span v-if="mode==='project'"> · {{labels.length}} projected targets · pose time offset {{shift.toFixed(1)}} s</span></div>
  <div v-if="showEstimate" class="terrain-estimate"><template v-if="last">Toy local estimate: {{estimates[samples.length-1].toFixed(3)}} → measured target {{last.cost.toFixed(2)}} · mean squared error {{loss?.toFixed(4)}}<button v-if="!nav.isPrintMode.value" @click.stop="update();($event.target as HTMLElement).blur()">Update toy estimates</button></template><template v-else>No measured targets available yet.</template></div>
  <div class="ssl-caption">{{caption}}</div>
  <div v-if="mode==='coverage'&&stage>=1" class="terrain-paper-choice">WVN's zero score for unvisited segments is a conservative modeling choice, not an observed failure.</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><label>Robot time <input aria-label="Robot time" type="range" min="0" max="5" step=".25" v-model.number="time" @input="playing=false"/>{{time.toFixed(2)}} s</label><button @click="playing=false;time=Math.min(5,time+.25)">Advance robot</button><button class="primary" @click="play">{{playing?'Pause':'Play traversal'}}</button><button @click="playing=false;reset()">Reset traversal</button><template v-if="mode==='project'"><label>Time offset <input aria-label="Timestamp offset" type="range" min="-1" max="1" step=".5" v-model.number="offset"/>{{offset.toFixed(1)}} s</label><button @click="offset=0">Restore alignment</button></template></div>
  <SSLControls/><div class="ssl-disclosure">Synthetic run and calibrated projection · cost proxy and local updates are teaching choices, not WVN's implementation</div>
  <div v-if="mode==='coverage'&&stage>=1" class="citation"><a href="https://link.springer.com/article/10.1007/s10514-025-10202-x">Mattamala et al., WVN, 2025 · Sections 3.4.3 and 3.5.2</a></div>
 </div>
</template>
<style scoped>
.terrain-pair{display:grid;grid-template-columns:320px 1fr;gap:32px;align-items:start}.terrain-heading{font-size:16px;margin:6px 0 9px}.terrain-world{height:145px}.terrain-pair :deep(.terrain-image){height:135px}.terrain-legend{display:flex;gap:14px;font-size:12px;margin-top:9px}.good{color:#168034}.bad{color:#b53d03}.terrain-delay{display:flex;align-items:center;gap:15px;margin-top:14px;font-size:16px}.delay-arrow{color:#F15A22;font-size:24px}.terrain-readout{background:#edf8fc;border-left:3px solid #00BDF2;padding:7px 9px;font-size:14px}.terrain-experience .ssl-caption{font-size:16px;margin:9px 0}.terrain-offset-note{font-size:12px;margin-top:5px}.terrain-paper-choice{font-size:14px;background:#fff3eb;border-left:3px solid #F15A22;padding:7px 9px;margin:8px 0}.terrain-estimate{font-size:13px;background:#eff9f2;padding:6px 9px;margin-top:5px}.terrain-estimate button{margin-left:10px;padding:2px 6px;border:1px solid #cbd5e1;border-radius:3px;font-size:12px}.terrain-experience .ssl-parameter-controls{font-size:13px;margin:8px 0;gap:9px}.terrain-experience .ssl-parameter-controls input{width:100px}.terrain-experience .ssl-parameter-controls button{font-size:13px;padding:4px 7px}.terrain-experience .ssl-disclosure{font-size:11px}
</style>
