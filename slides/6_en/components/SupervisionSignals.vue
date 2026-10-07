<script setup lang="ts">
withDefaults(defineProps<{stage?:number}>(),{stage:0})
</script>
<template>
  <svg class="signals-diagram intro-svg" viewBox="0 0 860 295" role="img" aria-label="One robot records images, motion, another sensor and an interaction outcome over time">
    <defs><marker id="signal-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#475569"/></marker></defs>
    <text x="66" y="28" text-anchor="middle" class="strong">One robot</text>
    <rect x="18" y="101" width="95" height="64" rx="8" fill="#edf7fa" stroke="#333" stroke-width="2"/><circle cx="37" cy="172" r="12" fill="#333"/><circle cx="94" cy="172" r="12" fill="#333"/><path d="M74 101V70H101" stroke="#333" stroke-width="3" fill="none"/><rect x="95" y="60" width="26" height="21" fill="#fff" stroke="#333"/><circle cx="115" cy="70" r="4" fill="#00BDF2"/>
    <path d="M125 137H163" class="signal-line"/><text x="286" y="29" text-anchor="middle" class="strong">Recorded data stream</text><text x="601" y="29" text-anchor="middle" class="strong">Possible automatic target</text>
    <g><text x="176" y="65">Images over time</text><foreignObject x="178" y="79" width="41" height="41"><PixelObservation :size="41"/></foreignObject><foreignObject x="228" y="79" width="41" height="41"><PixelObservation mode="masked" :size="41"/></foreignObject><foreignObject x="278" y="79" width="41" height="41"><PixelObservation :size="41"/></foreignObject><path d="M355 99H454" class="signal-line"/><text x="475" y="96">Hidden pixels or related views</text></g>
    <g :opacity="stage>=1?1:.14"><text x="176" y="152">Motion and poses</text><path d="M180 183Q220 156 250 175T321 168" fill="none" stroke="#00BDF2" stroke-width="3"/><circle cx="180" cy="183" r="4" fill="#333"/><circle cx="250" cy="175" r="4" fill="#333"/><circle cx="321" cy="168" r="4" fill="#333"/><path d="M355 177H454" class="signal-line"/><text x="475" y="180">Corresponding locations across views</text></g>
    <g :opacity="stage>=2?1:.14"><text x="176" y="229">Depth or another sensor</text><path d="M180 249H201V241H223V256H245V236H271V247H321" fill="none" stroke="#1b7b37" stroke-width="3"/><path d="M355 247H454" class="signal-line"/><text x="475" y="250">Aligned measurements in an image</text></g>
    <g :opacity="stage>=3?1:.14"><path d="M18 215H113" stroke="#F15A22" stroke-width="2"/><text x="66" y="240" text-anchor="middle" class="small">Contact / motion</text><text x="66" y="260" text-anchor="middle" class="small">after an action</text><path d="M121 273H455" class="signal-line"/><text x="475" y="280">Measured interaction outcome</text></g>
  </svg>
</template>
<style scoped>.signal-line{stroke:#475569;stroke-width:1.6;fill:none;marker-end:url(#signal-arrow)}</style>
