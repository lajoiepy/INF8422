<script setup lang="ts">
import { computed } from 'vue'

// Fil d'Ariane du cours : comprendre → mesurer → quantifier → calibrer → agir.
const props = defineProps<{ current?: string }>()

const steps = [
  { id: 'comprendre', label: 'Comprendre' },
  { id: 'mesurer', label: 'Mesurer' },
  { id: 'quantifier', label: 'Quantifier' },
  { id: 'calibrer', label: 'Calibrer' },
  { id: 'agir', label: 'Agir' },
]

const idx = computed(() => steps.findIndex(s => s.id === props.current))
</script>

<template>
  <div class="spl-wrap">
    <template v-for="(s, i) in steps" :key="s.id">
      <span
        class="spl-step"
        :class="{ 'spl-active': i === idx, 'spl-done': idx >= 0 && i < idx }"
      >{{ s.label }}</span>
      <span v-if="i < steps.length - 1" class="spl-arrow">→</span>
    </template>
  </div>
</template>

<style scoped>
.spl-wrap {
  display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;
  margin-top: 26px;
  font-family: sans-serif; font-size: 0.76rem;
}
.spl-step {
  padding: 3px 13px; border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.55);
  color: #94a3b8; opacity: 0.8;
}
.spl-active {
  background: #CF1C24; border-color: #CF1C24;
  color: white; font-weight: 700; opacity: 1;
}
.spl-done { border-color: #25B34B; color: #25B34B; opacity: 0.9; }
.spl-arrow { color: #94a3b8; opacity: 0.65; }
</style>
