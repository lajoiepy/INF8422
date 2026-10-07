<script setup lang="ts">
withDefaults(defineProps<{alternate?:boolean}>(),{alternate:false})
</script>
<template>
  <svg class="place-observation" viewBox="0 0 180 118" role="img" aria-label="Coin de rue illustratif sous deux éclairages">
    <rect width="180" height="118" :fill="alternate?'#d9dde4':'#e3f3fb'"/><rect y="91" width="180" height="27" fill="#aab2b7"/>
    <path d="M0 107L180 98M60 118L82 91" stroke="#eef2f3" stroke-width="3"/>
    <path d="M10 32L52 20L93 31V91H10Z" :fill="alternate?'#af7371':'#cb8b82'" stroke="#825e5d"/>
    <path d="M10 32H93M52 20V91" fill="none" stroke="#825e5d"/>
    <g fill="#315769"><rect x="20" y="43" width="16" height="18"/><rect x="63" y="43" width="16" height="18"/><rect x="20" y="70" width="16" height="15"/><path d="M61 91V75a10 10 0 0 1 20 0V91Z"/></g>
    <rect x="102" y="48" width="58" height="43" fill="#d4c9b2" stroke="#a3957d"/><g fill="#4f6770"><rect x="110" y="56" width="13" height="17"/><rect x="138" y="56" width="13" height="17"/></g>
    <path d="M165 92V52" stroke="#74604a" stroke-width="4"/><circle cx="165" cy="43" r="19" :fill="alternate?'#578c66':'#6ba278'"/>
    <rect x="1" y="1" width="178" height="116" fill="none" stroke="#cbd5e1"/>
  </svg>
</template>
<style scoped>.place-observation{display:block;width:100%;height:auto}</style>
