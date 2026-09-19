<script setup lang="ts">
import { computed, ref } from 'vue'
import { transformSE2 } from '../utils/avMath'
const dx=ref(2), yaw=ref(8), compensate=ref(true)
const world = [[3,2],[5,-1],[8,3],[-2,4],[0,-3]] as [number,number][]
const observed = computed(()=>world.map(p=>transformSE2(p,-yaw.value*Math.PI/180,[-dx.value,0])))
const aligned = computed(()=>compensate.value?observed.value.map(p=>transformSE2(p,yaw.value*Math.PI/180,[dx.value,0])):observed.value)
const sx=(x:number)=>279+x*20, sy=(y:number)=>108-y*20
</script>
<template><div>
  <svg viewBox="0 0 558 215" class="anim-svg">
    <rect x="1" y="1" width="556" height="213" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
    <path d="M79 108H479M279 18V198" stroke="#CBD5E1" /><text x="474" y="101" style="font-size:9px;fill:#475569">x avant</text><text x="286" y="27" style="font-size:9px;fill:#475569">y gauche</text>
    <circle v-for="(p,i) in world" :key="`w${i}`" :cx="sx(p[0])" :cy="sy(p[1])" r="7" fill="#25B34B" />
    <circle v-for="(p,i) in aligned" :key="`a${i}`" :cx="sx(p[0])" :cy="sy(p[1])" r="4" fill="#CF1C24" />
    <text x="15" y="28" style="font-size:10px;fill:#25B34B;font-weight:700">t : mémoire</text><text x="15" y="44" style="font-size:10px;fill:#CF1C24;font-weight:700">t+1 : observation</text>
    <text x="279" y="207" text-anchor="middle" style="font-size:10px;fill:#475569">{{ compensate ? 'Tₜ₊₁←ₜ appliquée : scène statique alignée' : 'Sans compensation : décalage des observations' }}</text>
  </svg>
  <div class="grid grid-cols-3 gap-5 text-xs"><label>Translation {{ dx }} m<input v-model.number="dx" type="range" min="0" max="5" step=".2" class="w-full" /></label><label>Lacet {{ yaw }}°<input v-model.number="yaw" type="range" min="-20" max="20" class="w-full" /></label><label class="pt-3"><input v-model="compensate" type="checkbox" /> compenser l’ego-mouvement</label></div>
</div></template>
