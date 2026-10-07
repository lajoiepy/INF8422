<script setup lang="ts">
import {useId} from 'vue'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const id=useId()
</script>
<template>
  <svg class="ssl-svg projection-diagram" viewBox="0 0 860 239" role="img" aria-label="Vues partageant encodeur et projection; ψ conservé pour les tâches, q utilisé pour comparer">
    <defs><marker :id="`${id}-arrow`" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#334155"/></marker></defs>
    <text x="227" y="27" text-anchor="middle">Encodeur</text><text x="376" y="27" text-anchor="middle">Caractéristiques ψ</text>
    <g v-if="stage>=1"><text x="563" y="27" text-anchor="middle">Tête de projection</text><text x="748" y="27" text-anchor="middle">Caractéristiques q</text></g>
    <g v-for="v in 2" :key="v" :transform="`translate(0 ${(v-1)*87})`">
      <foreignObject x="14" y="45" width="76" height="53"><SampleImage :brightness="v===1?1:.65" :crop="v===1?4:9"/></foreignObject><text x="109" y="77" class="small">v={{v}}</text><path d="M148 73H172" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><rect x="182" y="49" width="90" height="48" rx="4" class="ssl-encoder"/><text x="227" y="78" text-anchor="middle">fθ</text><path d="M279 73H305" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><foreignObject x="316" y="57" width="132" height="35"><FeatureVector :values="v===1?[.42,-.18,.73]:[.39,-.12,.69]" compact/></foreignObject>
      <g v-if="stage>=1"><path d="M453 73H490" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><rect x="500" y="49" width="125" height="48" rx="4" fill="#fff4ee" stroke="#F15A22" stroke-width="2"/><text x="562" y="78" text-anchor="middle">gφ</text><path d="M632 73H660" class="ssl-forward" :marker-end="`url(#${id}-arrow)`"/><foreignObject x="671" y="57" width="132" height="35"><FeatureVector :values="v===1?[.80,.20,-.10]:[.76,.25,-.08]" compact accent="#F15A22"/></foreignObject></g>
    </g>
    <text x="375" y="229" text-anchor="middle" class="small">Réutiliser la représentation de l’encodeur</text><text v-if="stage>=1" x="744" y="229" text-anchor="middle" class="small">Comparer les projections</text>
  </svg>
</template>
<style scoped>.projection-diagram{height:239px}</style>
