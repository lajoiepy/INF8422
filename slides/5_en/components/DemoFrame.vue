<script setup lang="ts">
import {ref,onMounted,onUnmounted,nextTick} from 'vue'
const revision=ref(0),scale=ref(1),content=ref<HTMLElement>(),viewport=ref<HTMLElement>()
let observer:ResizeObserver|undefined
const fit=()=>{if(content.value&&viewport.value)scale.value=Math.min(1,viewport.value.clientWidth/880,330/content.value.scrollHeight)}
const reset=async()=>{revision.value++;await nextTick();fit()}
onMounted(()=>{observer=new ResizeObserver(fit);if(content.value)observer.observe(content.value);if(viewport.value)observer.observe(viewport.value);fit()})
onUnmounted(()=>observer?.disconnect())
</script>
<template><div class="demo-frame"><div class="demo-toolbar"><span>Schéma pédagogique · données synthétiques</span><button @click="reset">Réinitialiser la démonstration</button></div><div ref="viewport" class="demo-viewport"><div ref="content" :style="{width:'880px',transform:`scale(${scale})`,transformOrigin:'top left'}"><div :key="revision"><slot/></div></div></div></div></template>
<style scoped>.demo-toolbar{height:30px;display:flex;justify-content:space-between;align-items:center;font:11px sans-serif;color:#64748b}.demo-toolbar button{font:12px sans-serif;background:#eef2f6;padding:3px 9px;height:24px;border-radius:4px;color:#333}.demo-viewport{height:330px;overflow:hidden}.demo-frame{height:365px}</style>
