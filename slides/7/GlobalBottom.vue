<script setup lang="ts">
import {computed} from 'vue'
import {useNav} from '@slidev/client'
const {currentSlideNo,currentLayout,slides}=useNav()
const section=computed(()=>{for(let i=currentSlideNo.value-1;i>=0;i--){const s=slides.value[i];if(s?.meta?.layout==='section')return s.meta.slide?.title||'INF8422'}return 'INF8422'})
</script>
<template><div v-if="currentLayout!=='cover'&&currentLayout!=='section'" class="poly-footer"><span class="footer-section">{{section}}</span><span>INF8422 — Apprentissage pour la perception robotique</span></div></template>
