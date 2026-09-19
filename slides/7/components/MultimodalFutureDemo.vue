<script setup lang="ts">
import {ref,computed} from 'vue'
const k=ref(2),goal=ref(-1)
const make=(mode:number)=>Array.from({length:8},(_,i)=>({x:(i+1)*.5,y:mode*Math.sin((i+1)/8*Math.PI)*1.5}))
const modes=[1,-1,0,.5,-.5];const truth=computed(()=>make(goal.value));const paths=computed(()=>modes.slice(0,k.value).map(make))
const metrics=computed(()=>paths.value.map(p=>({ade:p.reduce((s,v,i)=>s+Math.hypot(v.x-truth.value[i].x,v.y-truth.value[i].y),0)/p.length,fde:Math.hypot(p[7].x-truth.value[7].x,p[7].y-truth.value[7].y)})))
const poly=(p:any[])=>'70,150 '+p.map(v=>`${70+v.x*130},${150-v.y*60}`).join(' ')
const colors=['#00BDF2','#25B34B','#F15A22','#8b5cf6','#64748b']
</script>
<template><div class="demo"><div class="controls"><label>Hypothèses : {{k}} <input aria-label="Nombre de futurs" type="range" min="1" max="5" v-model.number="k"></label><label>Futur observé <select aria-label="Futur observé" v-model.number="goal"><option :value="-1">Passage en bas</option><option :value="1">Passage en haut</option></select></label><button @click="k=2;goal=-1">Réinitialiser</button></div><svg viewBox="0 0 800 285"><rect x="275" y="95" width="100" height="110" rx="5" fill="#cbd5e1"/><text x="325" y="150" text-anchor="middle" style="font-size:17px">Obstacle</text><polyline :points="poly(truth)" fill="none" stroke="#222" stroke-width="7" stroke-dasharray="10 7"/><polyline v-for="(p,i) in paths" :key="i" :points="poly(p)" fill="none" :stroke="colors[i]" stroke-width="3"/><text x="70" y="255" style="font-size:18px">Noir pointillé : cible · Orange : moyenne directe, qui traverse l’obstacle</text></svg><p>minADE = {{Math.min(...metrics.map(m=>m.ade)).toFixed(3)}} m · minFDE = {{Math.min(...metrics.map(m=>m.fde)).toFixed(3)}} m · ADE moyenne = {{(metrics.reduce((s,m)=>s+m.ade,0)/k).toFixed(3)}} m</p><p>Les futurs rejoignent le même point final : FDE seule ne distingue pas leurs chemins.</p></div></template>
<style scoped>.demo{font:17px sans-serif}.controls{display:flex;align-items:center;gap:25px}svg{height:265px;width:100%}input{accent-color:#CF1C24}button,select{padding:6px;background:#eee;border-radius:5px}</style>
