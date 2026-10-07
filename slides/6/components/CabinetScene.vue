<script setup lang="ts">
import {computed,useId} from 'vue'
import {doorPoint,drawCabinet,polygonText,actionDirection} from '../utils/interaction.mjs'
const props=withDefaults(defineProps<{angle?:number;contact?:number;direction?:number;showAction?:boolean;showLabels?:boolean;showGripper?:boolean;muted?:boolean}>(),{angle:0,contact:.85,direction:0,showAction:false,showLabels:true,showGripper:false,muted:false})
const id=useId()
const poly=(p:number[][])=>polygonText(p.map(drawCabinet))
const panel=computed(()=>poly([doorPoint(0,0,props.angle),doorPoint(1,0,props.angle),doorPoint(1,1.2,props.angle),doorPoint(0,1.2,props.angle)]))
const contactPoint=computed(()=>drawCabinet(doorPoint(props.contact,.65,props.angle)))
const handle=computed(()=>drawCabinet(doorPoint(.85,.65,props.angle)))
const initial=computed(()=>drawCabinet(doorPoint(props.contact,.65,0)))
const arrow=computed(()=>{const f=actionDirection(props.direction),p=doorPoint(props.contact,.65,0);return [initial.value,drawCabinet(p.map((x,i)=>x+.35*f[i]))]})
const edge=computed(()=>drawCabinet(doorPoint(1,0,props.angle)))
</script>
<template>
 <svg class="ssl-svg cabinet-scene" viewBox="0 0 330 275" role="img" aria-label="Porte scénarisée autour d’une charnière verticale fixe, avec anse et contact attachés">
  <defs><marker :id="id+'-arrow'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#F15A22"/></marker></defs>
  <polygon :points="poly([[0,0,0],[0,.5,0],[0,.5,1.2],[0,0,1.2]])" fill="#e1e7eb" stroke="#64748b" stroke-width="1.5"/>
  <polygon :points="poly([[0,0,1.2],[1,0,1.2],[1,.5,1.2],[0,.5,1.2]])" fill="#edf1f3" stroke="#64748b" stroke-width="1.5"/>
  <polygon :points="poly([[0,0,0],[1,0,0],[1,.5,0],[0,.5,0]])" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
  <polygon :points="poly([[1,0,0],[1,.5,0],[1,.5,1.2],[1,0,1.2]])" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
  <polygon v-if="angle>0" :points="poly([[0,0,0],[1,0,0],[1,0,1.2],[0,0,1.2]])" fill="none" stroke="#94a3b8" stroke-dasharray="4 3" stroke-width="1"/>
  <polygon :points="panel" :fill="muted?'#d4d9dc':'#f1ddc4'" stroke="#9b6c36" stroke-width="2"/>
  <path d="M55 225V45" stroke="#333" stroke-width="4"/>
  <path d="M45 35H20" stroke="#64748b" stroke-width="1"/><text v-if="showLabels" x="10" y="26" class="small">Charnière</text>
  <rect :x="handle[0]-3" :y="handle[1]-12" width="6" height="23" rx="2" fill="#333"/>
  <circle :cx="contactPoint[0]" :cy="contactPoint[1]" r="7" fill="#25B34B" stroke="white" stroke-width="2"/>
  <g v-if="showAction"><path :d="'M'+arrow[0].join(' ')+'L'+arrow[1].join(' ')" fill="none" stroke="#F15A22" stroke-width="3" :marker-end="'url(#'+id+'-arrow)'"/><text v-if="showLabels" x="240" y="111" class="small" fill="#b53d03">{{direction===0?'Tirer':direction===180?'Pousser':direction===90?'Le long de la porte':'Traction oblique'}}</text></g>
  <g v-if="showGripper" :transform="'translate('+contactPoint.join(' ')+')'"><path d="M13 -13H25V13H13M13 -13V-6M13 13V6" fill="none" stroke="#00BDF2" stroke-width="4"/></g>
  <path v-if="angle>0" :d="'M215 225Q250 235 '+edge.join(' ')" fill="none" stroke="#00BDF2" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text v-if="showLabels" x="64" y="264" class="small">Ouverture : {{angle.toFixed(1)}}°</text>
 </svg>
</template>
<style scoped>.cabinet-scene{height:230px;width:100%}.cabinet-scene text{font-size:14px}</style>
