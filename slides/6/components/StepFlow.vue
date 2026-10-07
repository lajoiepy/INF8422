<script setup lang="ts">
defineProps<{steps:string[],detail?:string}>()
</script>
<template><div class="step-flow"><template v-for="(step,i) in steps" :key="i"><div class="flow-cell"><span>{{i+1}}</span><strong>{{step}}</strong></div><b v-if="i<steps.length-1" class="flow-arrow">→</b></template></div><p v-if="detail" class="flow-detail">{{detail}}</p></template>
<style scoped>.step-flow{display:flex;align-items:stretch;gap:8px;margin:24px 0}.flow-cell{flex:1;background:#edf7fa;border-top:4px solid #00BDF2;padding:18px 12px;border-radius:5px;display:flex;flex-direction:column;gap:12px;min-width:0;font-size:18px}.flow-cell:nth-of-type(2){border-color:#25B34B;background:#eff8f1}.flow-cell:nth-of-type(3){border-color:#F15A22;background:#fff4ee}.flow-cell:nth-of-type(4){border-color:#CF1C24;background:#fff1f1}.flow-cell span{font-size:13px;color:#64748b}.flow-arrow{align-self:center;color:#64748b}.flow-detail{font-size:18px!important;color:#475569}</style>
