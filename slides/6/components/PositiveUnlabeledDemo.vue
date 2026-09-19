<script setup lang="ts">
import {computed,ref} from 'vue'
const reveal=ref(false),route=ref(0)
const cells=Array.from({length:120},(_,i)=>({i,x:i%15,y:Math.floor(i/15)}))
const positive=(p:any)=>route.value===0?p.y===4&&p.x<11:(p.y===4&&p.x<7)||(p.x===6&&p.y>1&&p.y<=4)
const bad=(p:any)=>(p.x>10&&p.y>5)||(p.x===12&&p.y<3)
const color=(p:any)=>positive(p)?'#25B34B':reveal.value?(bad(p)?'#CF1C24':'#a2e3f5'):'#d1d5db'
const count=computed(()=>cells.filter(positive).length)
</script>
<template><div class="demo"><div class="controls"><button @click="reveal=!reveal">{{reveal?'Masquer':'Révéler'}} le terrain caché</button><button @click="route=1-route">Changer la trace</button><button @click="reveal=false;route=0">Réinitialiser</button></div><svg viewBox="0 0 800 250"><rect v-for="p in cells" :key="p.i" :x="p.x*47+35" :y="p.y*28+12" width="44" height="25" :fill="color(p)"/></svg><p><b>{{count}} cellules positives</b> : passage réussi. Gris : non étiqueté, aucune conclusion d’échec.</p><p v-if="reveal">Référence du schéma : bleu = praticable non visité ; rouge = impraticable. Ces informations ne sont pas connues du robot à partir de la trace seule.</p><p v-else>Un trajet différent change les exemples connus, sans changer le terrain.</p></div></template>
<style scoped>.demo{font:17px sans-serif}.controls{display:flex;gap:15px}svg{height:250px;width:100%}button{padding:7px;background:#eee;border-radius:5px}</style>
