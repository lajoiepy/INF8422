<script setup lang="ts">
withDefaults(defineProps<{values?:number[];compact?:boolean;accent?:string}>(),{values:()=>[.42,-.18,.73,.09],compact:false,accent:'#00BDF2'})
</script>
<template>
  <div class="feature-vector" :class="{compact}" :style="{'--accent':accent}" aria-label="Vecteur de caractéristiques illustratif">
    <span v-for="(value,i) in values" :key="i">{{value.toFixed(2)}}</span><span v-if="!compact" class="ellipsis">…</span>
  </div>
</template>
<style scoped>
.feature-vector{display:flex;gap:2px;border-left:3px solid var(--accent);padding-left:5px;justify-content:center;width:max-content}.feature-vector span{display:flex;align-items:center;justify-content:center;background:#edf6f9;min-width:46px;height:37px;font-family:'Fira Code',monospace;font-size:15px;color:#334155}.feature-vector .ellipsis{min-width:26px;background:white}.feature-vector.compact{padding-left:3px}.compact span{min-width:37px;height:29px;font-size:12px}
</style>
