<script setup lang="ts">
import { computed } from 'vue'
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Le point p est à une distance fixe de l’origine.',
  'La matrice R change uniquement sa direction.',
  'Rᵀ annule la rotation et ramène p au départ.',
]
const formulas = ['‖p‖ = 1', 'p′ = Rp et ‖p′‖ = ‖p‖', 'RᵀRp = p']
const controls = useGeometrySteps(3)
const step = controls.step
const angle = computed(() => step.value === 0 ? 0 : 58)
const rad = computed(() => angle.value * Math.PI / 180)
const px = computed(() => 350 + 145 * Math.cos(rad.value))
const py = computed(() => 190 - 145 * Math.sin(rad.value))
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Une rotation conserve la longueur">
      <defs>
        <marker id="rotation-simple-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />
      <circle cx="350" cy="190" r="145" fill="none" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="8 7" />
      <circle cx="350" cy="190" r="7" fill="#333" />
      <text x="329" y="216" fill="#333" font-size="13" font-weight="900">O</text>

      <line x1="350" y1="190" x2="495" y2="190" stroke="#94a3b8" stroke-width="5" />
      <circle cx="495" cy="190" r="11" fill="#94a3b8" />
      <text x="512" y="196" fill="#64748b" font-size="16" font-weight="900">p</text>

      <path v-if="step >= 1" d="M495 190 A145 145 0 0 0 427 67" fill="none" stroke="#CF1C24" stroke-width="6" marker-end="url(#rotation-simple-arrow)" class="reveal" />
      <line v-if="step >= 1" x1="350" y1="190" :x2="px" :y2="py" stroke="#CF1C24" stroke-width="7" class="reveal" />
      <g v-if="step >= 1" class="moving-point" :style="{ transform: `translate(${px}px, ${py}px)` }">
        <circle cx="0" cy="0" r="13" fill="#F15A22" stroke="white" stroke-width="4" />
        <text x="18" y="6" fill="#F15A22" font-size="16" font-weight="900">Rp</text>
      </g>

      <g v-if="step === 2" class="reveal">
        <path d="M427 67 A145 145 0 0 1 495 190" fill="none" stroke="#25B34B" stroke-width="5" stroke-dasharray="9 6" />
        <text x="487" y="128" fill="#25B34B" font-size="16" font-weight="900">Rᵀ</text>
        <rect x="185" y="260" width="330" height="45" rx="9" fill="white" stroke="#25B34B" stroke-width="2" />
        <text x="350" y="289" text-anchor="middle" fill="#25B34B" font-size="16" font-weight="900">La longueur ne change jamais</text>
      </g>

      <g v-if="step >= 1" class="reveal">
        <line x1="585" y1="95" x2="585" y2="245" stroke="#e2e8f0" stroke-width="2" />
        <text x="610" y="132" fill="#64748b" font-size="13">Avant</text>
        <text x="610" y="157" fill="#333" font-size="16" font-weight="900">‖p‖ = 1</text>
        <text x="610" y="202" fill="#64748b" font-size="13">Après</text>
        <text x="610" y="227" fill="#25B34B" font-size="16" font-weight="900">‖Rp‖ = 1</text>
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
.moving-point { transition: transform .7s cubic-bezier(.4,0,.2,1); }
.reveal { animation: reveal .35s ease both; }
@keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .moving-point { transition: none; } .reveal { animation: none; } }
</style>
