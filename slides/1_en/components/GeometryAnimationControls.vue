<script setup lang="ts">
defineProps<{
  step: number
  total: number
  playing: boolean
  label: string
  formula?: string
}>()

defineEmits<{
  prev: []
  next: []
  auto: []
  reset: []
}>()
</script>

<template>
  <div class="geometry-controls">
    <div class="geometry-caption">
      <span class="step-badge">{{ step + 1 }} / {{ total }}</span>
      <span class="label">{{ label }}</span>
      <code v-if="formula">{{ formula }}</code>
    </div>
    <div class="geometry-buttons">
      <button class="neutral" :disabled="step === 0 || playing" @click.stop="$emit('prev')">◀ Précédent</button>
      <button class="primary" :disabled="step === total - 1 || playing" @click.stop="$emit('next')">Suivant ▶</button>
      <button class="auto" @click.stop="$emit('auto')">{{ playing ? '⏸ Pause' : '⏩ Auto' }}</button>
      <button class="neutral" @click.stop="$emit('reset')">↺ Reset</button>
    </div>
  </div>
</template>

<style scoped>
.geometry-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 42px;
  padding: 5px 7px 0;
}
.geometry-caption {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 0.72rem;
  color: #475569;
}
.step-badge {
  flex: none;
  padding: 2px 7px;
  border-radius: 999px;
  color: white;
  background: #333;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.label { font-weight: 700; }
code {
  color: #CF1C24;
  background: rgba(207, 28, 36, 0.07);
  padding: 2px 5px;
  border-radius: 3px;
  white-space: nowrap;
}
.geometry-buttons { display: flex; gap: 6px; }
button {
  padding: 5px 10px;
  border: 0;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 800;
  transition: opacity 0.15s, transform 0.15s;
}
button:hover:not(:disabled) { transform: translateY(-1px); }
button:disabled { cursor: default; opacity: 0.35; }
.neutral { background: #64748b; }
.primary { background: #CF1C24; }
.auto { background: #008fbd; }
@media (prefers-reduced-motion: reduce) {
  button { transition: none; }
}
</style>
