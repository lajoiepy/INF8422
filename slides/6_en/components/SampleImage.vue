<script setup lang="ts">
withDefaults(defineProps<{sample?:number;brightness?:number;crop?:number;falseNegative?:boolean;invalid?:boolean}>(),{sample:0,brightness:1,crop:0,falseNegative:false,invalid:false})
</script>
<template>
  <div class="sample-image" :style="{filter:`brightness(${brightness})`,clipPath:crop?`inset(${crop}% ${crop/2}% ${crop/2}% ${crop}%)`:undefined}">
    <MugScene v-if="sample===0||falseNegative" :scene="{u:125,v:105,alpha:falseNegative?-30:0,lighting:1,background:falseNegative?'pattern':'plain'}" :crop="invalid"/>
    <PlaceObservation v-else-if="sample===1"/>
    <PixelObservation v-else :size="84"/>
  </div>
</template>
<style scoped>.sample-image{display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:hidden;background:#f5f7f8}.sample-image :deep(svg){max-width:100%;max-height:100%;width:100%;height:100%}</style>
