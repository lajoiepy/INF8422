<script setup lang="ts">
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Axe-angle choisit un axe fixe u et un angle θ.',
  'Le point tourne autour de u jusqu’à l’orientation finale.',
  'Le quaternion encode exactement cette même rotation.',
]
const formulas = ['(u, θ)', 'R(u,θ)', 'q = [u sin(θ/2), cos(θ/2)]']
const controls = useGeometrySteps(3)
const step = controls.step
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Équivalence entre axe-angle et quaternion">
      <defs>
        <marker id="axisquat-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />

      <!-- Axe fixe et plan de rotation -->
      <ellipse cx="325" cy="180" rx="185" ry="72" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="8 7" />
      <line x1="245" y1="295" x2="405" y2="52" stroke="#7c3aed" stroke-width="9" marker-end="url(#axisquat-arrow)" />
      <text x="420" y="62" fill="#7c3aed" font-size="18" font-weight="900">axe u</text>
      <circle cx="325" cy="180" r="7" fill="#333" />

      <!-- Point initial -->
      <g v-if="step < 2">
        <line x1="325" y1="180" x2="510" y2="180" stroke="#94a3b8" stroke-width="4" />
        <circle cx="510" cy="180" r="12" fill="#94a3b8" />
        <text x="528" y="186" fill="#64748b" font-size="15" font-weight="900">p₀</text>
      </g>

      <!-- Même rotation, décrite d'abord par axe-angle -->
      <g v-if="step >= 1" class="reveal">
        <path d="M510 180 A185 72 0 0 0 325 108" fill="none" stroke="#F15A22" stroke-width="7" marker-end="url(#axisquat-arrow)" />
        <line x1="325" y1="180" x2="325" y2="108" stroke="#F15A22" stroke-width="5" />
        <circle cx="325" cy="108" r="14" fill="#F15A22" stroke="white" stroke-width="4" />
        <text x="344" y="107" fill="#F15A22" font-size="16" font-weight="900">Rp₀</text>
        <text x="435" y="120" fill="#F15A22" font-size="18" font-weight="900">θ = 90°</text>
      </g>

      <!-- Le quaternion ne crée pas une autre rotation -->
      <g v-if="step === 2" class="reveal">
        <rect x="500" y="52" width="225" height="210" rx="12" fill="white" stroke="#00BDF2" stroke-width="2" />
        <text x="612" y="85" text-anchor="middle" fill="#333" font-size="16" font-weight="900">Même rotation</text>
        <text x="612" y="122" text-anchor="middle" fill="#7c3aed" font-size="15" font-weight="900">Axe-angle</text>
        <text x="612" y="148" text-anchor="middle" fill="#333" font-size="14">(u, 90°)</text>
        <text x="612" y="181" text-anchor="middle" fill="#64748b" font-size="22" font-weight="900">⇕</text>
        <text x="612" y="211" text-anchor="middle" fill="#008fbd" font-size="15" font-weight="900">Quaternion</text>
        <text x="612" y="238" text-anchor="middle" fill="#333" font-size="13">[u sin45°, cos45°]</text>
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
.reveal { animation: reveal .35s ease both; }
@keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
</style>
