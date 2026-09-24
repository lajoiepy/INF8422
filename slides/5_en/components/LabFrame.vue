<script setup lang="ts">
import {ref} from 'vue'
withDefaults(defineProps<{label?:string}>(),{label:'Expérience pédagogique · données synthétiques'})
const revision=ref(0)
</script>
<template><div class="lab-frame"><div class="lab-toolbar"><span>{{label}}</span><button @click="revision++">Réinitialiser la démonstration</button></div><div :key="revision" class="lab-body"><slot/></div></div></template>
<style scoped>.lab-toolbar{display:flex;justify-content:space-between;align-items:center;height:28px;color:#64748b;font-size:12px}.lab-frame{height:377px}.lab-body{height:345px;border:1px solid #d8e0e8;border-radius:8px;background:#f8fafc;padding:10px 14px;box-sizing:border-box;overflow:hidden}</style>
