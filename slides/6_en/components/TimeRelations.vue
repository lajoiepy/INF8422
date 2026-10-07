<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {interactionTimes,interactionState} from '../utils/correspondence.mjs'
import {usePlayback} from '../utils/usePlayback'
const props=withDefaults(defineProps<{stage?:number}>(),{stage:0})
const nav=useNav(),time=ref(2),reset=()=>time.value=2
const {playing}=usePlayback(()=>{time.value++;return time.value<4},reset,500)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const selected=computed(()=>nav.isPrintMode.value?2:time.value)
function stream(t:number){const a=interactionState(t).tilt*Math.PI/180,x=48+14*Math.cos(a)+17*Math.sin(a),y=29+14*Math.sin(a)-17*Math.cos(a);return `M${x} ${y}Q90 ${y+8} 90 50`}
function play(){if(time.value>=4)time.value=0;playing.value=!playing.value}
</script>
<template>
 <div class="time-relations" :data-time="selected" :data-stage="stage" :data-fill="interactionState(selected).fill">
  <svg class="ssl-svg time-relations-scene" viewBox="0 0 860 300" role="img" aria-label="Two synchronized schematic camera timelines of one pouring interaction">
   <text x="8" y="30" class="small">Camera A</text><text x="8" y="170" class="small">Camera B</text>
   <g v-for="view in [0,1]" :key="view"><g v-for="t in interactionTimes" :key="t" :transform="`translate(${120+t*143} ${45+view*130})`">
    <rect x="0" y="0" width="126" height="85" rx="3" :fill="view?'#f8f3eb':'#edf8fc'" :stroke="t===selected?(stage>=1?'#25B34B':'#007da8'):stage>=2&&t===(selected===0?1:selected-1)?'#F15A22':'#cbd5e1'" :stroke-width="stage>=1&&t===selected?3:1"/>
    <g :transform="view?'translate(120 0) scale(-1 1)':''"><path d="M12 72H116" stroke="#64748b"/><path d="M72 42L76 70H104L108 42" fill="white" stroke="#475569" stroke-width="1.5"/><path :d="`M76 ${69-24*interactionState(t).fill}H104V69H76Z`" fill="#00BDF2" opacity=".55"/><g :transform="`translate(48 29) rotate(${interactionState(t).tilt})`"><path d="M-14 -17H14L12 14H-12Z" fill="#fff4ee" stroke="#b3470f" stroke-width="1.5"/><path d="M14 -11C27 -11 27 9 13 9" fill="none" stroke="#b3470f" stroke-width="1.5"/></g><path v-if="interactionState(t).stream" :d="stream(t)" fill="none" stroke="#00BDF2" stroke-width="2" stroke-dasharray="3 2"/></g>
    <text x="63" y="103" text-anchor="middle" class="small">t = {{t}}</text>
   </g></g>
   <path v-if="stage>=1" :d="`M${183+selected*143} 25V42M${183+selected*143} 154V171M${183+selected*143} 286V294`" stroke="#25B34B" stroke-dasharray="4 4" stroke-width="1.5"/>
  </svg>
  <div class="time-relations-caption">{{stage===0?'Both streams record the same interaction from different viewpoints.':stage===1?'Same timestamp: a cross-view relationship, despite changed appearance.':'Adjacent timestamps can have different tilt, flow, and recipient fill.'}}</div>
  <div v-if="!nav.isPrintMode.value" class="ssl-parameter-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()"><label>Shared time <input aria-label="Shared time" type="range" min="0" max="4" step="1" v-model.number="time"/>{{time}}</label><button @click="playing=false;time=Math.min(4,time+1)">Step time</button><button class="primary" @click="play">{{playing?'Pause':'Play interaction'}}</button><button @click="playing=false;reset()">Reset time</button></div>
  <SSLControls/><div class="ssl-disclosure">Schematic synchronized interaction · recorded frame relationships, not a trained model or fluid simulation</div>
 </div>
</template>
<style scoped>.time-relations-scene{height:275px}.time-relations-caption{font-size:18px;padding:9px 12px;background:#eff8f1;border-left:3px solid #25B34B}.time-relations input{width:115px}</style>
