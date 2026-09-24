<script setup lang="ts">
import { ref } from 'vue'
const change=ref(50), mapAge=ref(20)
</script>
<template><div>
  <svg viewBox="0 0 558 215" class="anim-svg">
    <rect x="1" y="1" width="556" height="213" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
    <rect x="92" y="28" width="150" height="155" rx="5" fill="#e2e8f0" stroke="#CBD5E1" /><rect x="316" y="28" width="150" height="155" rx="5" fill="#e2e8f0" stroke="#CBD5E1" />
    <line x1="167" y1="35" x2="167" y2="178" stroke="white" stroke-width="5" stroke-dasharray="16 10" /><line x1="391" y1="35" x2="391" y2="178" stroke="white" stroke-width="5" stroke-dasharray="16 10" />
    <path d="M328 115H454" stroke="#F15A22" stroke-width="9" :style="`opacity:${change/100}`" /><path d="M331 112L331 73L364 73" fill="none" stroke="#F15A22" stroke-width="6" :style="`opacity:${change/100}`" />
    <text x="167" y="202" text-anchor="middle" style="font-size:11px;fill:#475569;font-weight:700">carte HD a priori</text><text x="391" y="202" text-anchor="middle" style="font-size:11px;fill:#475569;font-weight:700">observation actuelle</text>
    <text x="279" y="21" text-anchor="middle" style="font-size:11px;fill:#CF1C24;font-weight:700">innovation = observation − projection de la carte</text>
    <circle cx="391" cy="133" :r="4+mapAge/8" fill="none" stroke="#CF1C24" stroke-width="3" />
  </svg>
  <div class="grid grid-cols-2 gap-8 text-xs"><label>Changement {{ change }} %<input v-model.number="change" type="range" class="w-full" /></label><label>Ancienneté de la carte {{ mapAge }}<input v-model.number="mapAge" type="range" class="w-full" /></label></div>
</div></template>
