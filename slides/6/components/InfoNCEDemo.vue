<script setup lang="ts">
import {computed,ref} from 'vue'
const tau=ref(.2);const sims=[.8,.7,.2,-.1];const labels=['Positif','Négatif difficile','Négatif','Négatif']
const p=computed(()=>{const e=sims.map(s=>Math.exp((s-.8)/tau.value));return e.map(x=>x/e.reduce((a,b)=>a+b,0))});const loss=computed(()=>-Math.log(p.value[0]))
</script>
<template><div class="demo"><label>Température τ = {{tau.toFixed(2)}} <input aria-label="Température InfoNCE" type="range" min=".05" max="2" step=".05" v-model.number="tau"></label><button @click="tau=.2">Réinitialiser</button><div v-for="(s,i) in sims" :key="i" class="row"><span>{{labels[i]}}<br>similarité {{s}}</span><div class="track"><div :style="{width:p[i]*100+'%',background:i===0?'#25B34B':'#00BDF2'}"></div></div><strong>{{p[i].toFixed(3)}}</strong></div><p class="result">InfoNCE = −log p(positif) = {{loss.toFixed(3)}}</p><p>Les scores de similarité ne changent pas. Des similarités égales conservent des poids égaux, quelle que soit la température.</p></div></template>
<style scoped>.demo{font:17px sans-serif}.row{display:grid;grid-template-columns:180px 1fr 70px;gap:20px;align-items:center;margin:18px 0}.track{background:#eef2f6;height:26px}.track>div{height:100%}.result{color:#CF1C24;font-size:23px}input{width:250px;accent-color:#CF1C24}button{margin-left:20px;padding:6px;background:#eee}</style>
