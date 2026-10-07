<script setup lang="ts">
import {useNav} from '@slidev/client'
const nav=useNav()
withDefaults(defineProps<{playing?:boolean;replay?:boolean;disabled?:boolean}>(),{playing:false,replay:false,disabled:false})
defineEmits(['play','step','reset'])
</script>
<template>
  <div v-if="!nav.isPrintMode.value" class="ssl-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()">
    <button :disabled="nav.clicks.value===0" @click="nav.prev()">Previous stage</button><button :disabled="nav.clicks.value===nav.clicksTotal.value" @click="nav.next()">Next stage</button>
    <template v-if="replay"><button :disabled="disabled" @click="$emit('step')">Step transition</button><button class="primary" :disabled="disabled" @click="$emit('play')">{{playing?'Pause':'Replay transition'}}</button><button @click="$emit('reset')">Reset illustration</button></template>
    <slot/>
  </div>
</template>
<style scoped>.ssl-controls{margin-top:9px;gap:10px}.ssl-controls button{border:1px solid #cbd5e1;background:white;border-radius:5px;padding:4px 10px;color:#334155;font:inherit;font-size:14px}.ssl-controls button.primary{background:#CF1C24;color:white;border-color:#CF1C24}.ssl-controls button:disabled{opacity:.5;cursor:default}</style>
