<script setup lang="ts">
import { computed, ref } from 'vue'
const depth = ref(28), spread = ref(4), bins = Array.from({length:16},(_,i)=>6+i*3)
const probs = computed(() => { const w=bins.map(z=>Math.exp(-.5*((z-depth.value)/spread.value)**2)); const s=w.reduce((a,b)=>a+b,0); return w.map(v=>v/s) })
const mean = computed(() => probs.value.reduce((s,p,i)=>s+p*bins[i],0))
const px = (z:number)=>80+(z-6)*8.2
</script>
<template><div>
  <svg viewBox="0 0 558 215" class="anim-svg">
    <rect x="1" y="1" width="556" height="213" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
    <text x="279" y="24" text-anchor="middle" style="font-size:13px;fill:#475569;font-weight:700">Projection des caractéristiques le long du rayon avec les poids p(d | u)</text>
    <line x1="65" y1="155" x2="510" y2="155" stroke="#475569" />
    <g v-for="(z,i) in bins" :key="z"><rect :x="px(z)-5" :y="155-probs[i]*120" width="10" :height="probs[i]*120" rx="2" fill="#00BDF2" /><text v-if="i%3===0" :x="px(z)" y="172" text-anchor="middle" style="font-size:8px;fill:#475569">{{ z }}</text></g>
    <line :x1="px(mean)" y1="38" :x2="px(mean)" y2="160" stroke="#CF1C24" stroke-width="3" />
    <text :x="px(mean)" y="191" text-anchor="middle" style="font-size:11px;fill:#CF1C24;font-weight:700">E[d] = {{ mean.toFixed(1) }} m</text>
  </svg>
  <div class="grid grid-cols-2 gap-8 text-xs"><label>Profondeur dominante {{ depth }} m<input v-model.number="depth" type="range" min="8" max="48" class="w-full" /></label><label>Étalement σ={{ spread }} m<input v-model.number="spread" type="range" min="1" max="10" class="w-full" /></label></div>
</div></template>
