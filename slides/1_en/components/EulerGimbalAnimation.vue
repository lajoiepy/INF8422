<script setup lang="ts">
import { computed } from 'vue'
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Roll, pitch et yaw tournent autour de trois axes distincts.',
  'Quand le pitch approche 90°, deux axes se rapprochent.',
  'À pitch = 90°, roll et yaw commandent le même axe.',
]
const formulas = ['3 axes → 3 DDL', 'β → 90°', 'xᵣ ∥ z₍w₎ → seulement 2 DDL']
const controls = useGeometrySteps(3)
const step = controls.step
const pitch = computed(() => [0, 60, 90][step.value])
const a = computed(() => pitch.value * Math.PI / 180)
const dx = computed(() => 120 * Math.cos(a.value))
const dy = computed(() => 120 * Math.sin(a.value))
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Perte d'un degré de liberté au gimbal lock">
      <defs>
        <marker id="gimbal-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />

      <!-- Trois cardans simples -->
      <ellipse cx="365" cy="175" rx="190" ry="82" fill="none" stroke="#00BDF2" stroke-width="7" opacity=".65" />
      <ellipse cx="365" cy="175" rx="155" ry="68" fill="none" stroke="#25B34B" stroke-width="7" opacity=".65" transform="rotate(90 365 175)" />
      <ellipse cx="365" cy="175" rx="120" ry="53" fill="none" stroke="#CF1C24" stroke-width="7" opacity=".65" :transform="`rotate(${pitch} 365 175)`" />

      <!-- Axe yaw fixe -->
      <line x1="365" y1="290" x2="365" y2="55" stroke="#00BDF2" stroke-width="7" marker-end="url(#gimbal-arrow)" />
      <text x="382" y="67" fill="#008fbd" font-size="16" font-weight="900">yaw</text>

      <!-- Axe roll qui s'aligne -->
      <line :x1="365-dx" :y1="175+dy" :x2="365+dx" :y2="175-dy"
        stroke="#CF1C24" stroke-width="7" marker-end="url(#gimbal-arrow)" class="axis-motion" />
      <text :x="365+dx+10" :y="175-dy+4" fill="#CF1C24" font-size="16" font-weight="900">roll</text>

      <circle cx="365" cy="175" r="25" fill="#333" stroke="white" stroke-width="5" />
      <text x="365" y="181" text-anchor="middle" fill="white" font-size="13" font-weight="900">β={{ pitch }}°</text>

      <g v-if="step === 2" class="reveal">
        <line x1="352" y1="286" x2="352" y2="58" stroke="#F15A22" stroke-width="16" opacity=".28" />
        <rect x="170" y="20" width="390" height="52" rx="10" fill="white" stroke="#F15A22" stroke-width="2" />
        <text x="365" y="52" text-anchor="middle" fill="#F15A22" font-size="16" font-weight="900">Deux commandes, mais un seul axe physique</text>
      </g>

      <g v-else class="reveal">
        <rect x="560" y="245" width="160" height="48" rx="9" fill="white" stroke="#cbd5e1" />
        <text x="640" y="275" text-anchor="middle" fill="#64748b" font-size="14" font-weight="900">3 axes distincts</text>
      </g>
    </svg>

    <GeometryAnimationControls
      :step="step" :total="3" :playing="controls.playing.value"
      :label="labels[step]" :formula="formulas[step]"
      @prev="controls.go(-1)" @next="controls.go(1)" @auto="controls.toggleAuto" @reset="controls.reset"
    />
  </div>
</template>

<style scoped>
.geometry-wrap { display: flex; flex-direction: column; height: 100%; width: 100%; }
.geometry-svg { width: 100%; flex: 1; min-height: 0; }
.axis-motion { transition: all .7s cubic-bezier(.4,0,.2,1); }
.reveal { animation: reveal .35s ease both; }
@keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .axis-motion { transition: none; } .reveal { animation: none; } }
</style>
