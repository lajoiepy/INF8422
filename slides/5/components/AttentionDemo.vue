<script setup lang="ts">
import {computed,ref} from 'vue'
const scores=ref([2,1,0]);const values=[1,4,8];const names=['Roue','Carrosserie','Arrière-plan']
const weights=computed(()=>{const e=scores.value.map(s=>Math.exp(s-Math.max(...scores.value)));return e.map(x=>x/e.reduce((a,b)=>a+b,0))})
const output=computed(()=>weights.value.reduce((a,w,i)=>a+w*values[i],0))
</script>
<template><div class="demo"><p>Une requête d’objet consulte trois valeurs scalaires. Scores divisés par √dₖ.</p><div class="rows"><div v-for="(name,i) in names" :key="name"><strong>{{name}}</strong><input :aria-label="'Score '+name" type="range" min="-3" max="3" step=".1" v-model.number="scores[i]"><span>score {{scores[i].toFixed(1)}}</span><div class="bar" :style="{width:weights[i]*280+'px'}"></div><span>poids {{weights[i].toFixed(3)}} · valeur {{values[i]}}</span></div></div><p class="result">Valeur agrégée = Σ poids × valeur = {{output.toFixed(3)}}</p><button @click="scores=[2,1,0]">Réinitialiser</button><p>La somme des poids vaut 1. Chaque valeur est scalaire dans cet exemple ; elle est généralement vectorielle.</p></div></template>
<style scoped>.demo{font:16px sans-serif}.rows>div{display:grid;grid-template-columns:140px 160px 100px 280px;gap:9px;align-items:center;margin:12px 0}.rows span:last-child{grid-column:2/5}.bar{height:18px;background:#00BDF2}.result{font-size:22px;color:#CF1C24}input{accent-color:#CF1C24}button{padding:7px;background:#e5e7eb;border-radius:5px}</style>
