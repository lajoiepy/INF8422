<script setup lang="ts">
import { computed, ref } from 'vue'
const layers=ref(2), stride=ref(1)
const rf=computed(()=>{let r=1,j=1;for(let i=0;i<layers.value;i++){r+=2*j;j*=stride.value}return {r,j}})
const cells=Array.from({length:225},(_,i)=>({x:i%15,y:Math.floor(i/15)}))
const reset=()=>{layers.value=2;stride.value=1}
</script>
<template><div class="demo"><div class="controls"><label>Couches 3×3 : {{layers}} <input aria-label="Nombre de couches" type="range" min="1" max="4" v-model.number="layers"></label><label>Pas : <select aria-label="Pas de convolution" v-model.number="stride"><option :value="1">1</option><option :value="2">2</option></select></label><button @click="reset">Réinitialiser</button></div><div class="body"><svg viewBox="0 0 340 310"><rect v-for="c in cells" :key="c.x+15*c.y" :x="c.x*19+20" :y="c.y*19+10" width="17" height="17" :fill="Math.abs(c.x-7)<rf.r/2 && Math.abs(c.y-7)<rf.r/2 ? '#00BDF2':'#e5e7eb'"/><rect x="153" y="143" width="17" height="17" fill="#CF1C24"/></svg><div><h3>Champ théorique : {{rf.r}} × {{rf.r}}</h3><p>Écart entre centres de sortie : {{rf.j}} pixels.</p><p>Bleu : entrées influençant la cellule rouge.</p><p v-if="rf.r>15">Le champ dépasse la fenêtre dessinée (15 × 15).</p><p>Récurrence : r ← r + 2j ; j ← j × pas.</p><p>Schéma pédagogique ; noyaux sans dilatation.</p></div></div></div></template>
<style scoped>.demo{font:16px sans-serif}.controls{display:flex;gap:22px;align-items:center}.body{display:grid;grid-template-columns:340px 1fr;gap:30px}.body svg{height:310px}input{accent-color:#CF1C24}button,select{background:#eef2f6;padding:6px 10px;border-radius:5px}h3{color:#CF1C24}</style>
