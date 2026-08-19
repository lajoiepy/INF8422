<script setup lang="ts">
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Le point p est localisé dans le repère monde.',
  'On ajoute un second repère, sans déplacer p.',
  'Le point est le même; seules ses coordonnées changent.',
]
const formulas = ['pʷ = [5.4, 2.3]ᵀ', 'p ne bouge pas', 'pʷ ≠ pʳ']
const controls = useGeometrySteps(3)
const step = controls.step
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Même point exprimé dans deux repères">
      <defs>
        <marker id="frame-simple-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />

      <!-- Repère monde -->
      <g>
        <circle cx="175" cy="245" r="6" fill="#333" />
        <line x1="175" y1="245" x2="315" y2="245" stroke="#CF1C24" stroke-width="5" marker-end="url(#frame-simple-arrow)" />
        <line x1="175" y1="245" x2="175" y2="105" stroke="#25B34B" stroke-width="5" marker-end="url(#frame-simple-arrow)" />
        <text x="310" y="232" fill="#CF1C24" font-size="15" font-weight="900">x₍w₎</text>
        <text x="188" y="112" fill="#25B34B" font-size="15" font-weight="900">y₍w₎</text>
        <text x="143" y="272" fill="#333" font-size="13" font-weight="900">O₍w₎</text>
      </g>

      <!-- Point physique, toujours au même endroit -->
      <g>
        <line x1="175" y1="245" x2="520" y2="95" stroke="#94a3b8" stroke-width="3" stroke-dasharray="7 5" />
        <circle cx="520" cy="95" r="13" fill="#F15A22" stroke="white" stroke-width="4" />
        <text x="540" y="101" fill="#F15A22" font-size="18" font-weight="900">p</text>
      </g>

      <!-- Repère robot -->
      <g v-if="step >= 1" class="reveal">
        <circle cx="355" cy="235" r="6" fill="#333" />
        <line x1="355" y1="235" x2="465" y2="172" stroke="#CF1C24" stroke-width="5" marker-end="url(#frame-simple-arrow)" />
        <line x1="355" y1="235" x2="292" y2="125" stroke="#25B34B" stroke-width="5" marker-end="url(#frame-simple-arrow)" />
        <text x="465" y="161" fill="#CF1C24" font-size="15" font-weight="900">xᵣ</text>
        <text x="276" y="122" fill="#25B34B" font-size="15" font-weight="900">yᵣ</text>
        <text x="337" y="263" fill="#333" font-size="13" font-weight="900">Oᵣ</text>
        <line x1="355" y1="235" x2="520" y2="95" stroke="#00BDF2" stroke-width="4" stroke-dasharray="7 5" />
      </g>

      <!-- Une seule conclusion -->
      <g v-if="step === 2" class="reveal">
        <rect x="75" y="20" width="610" height="58" rx="10" fill="white" stroke="#00BDF2" stroke-width="2" />
        <text x="380" y="46" text-anchor="middle" fill="#333" font-size="14" font-weight="900">Même point physique</text>
        <text x="250" y="67" text-anchor="middle" fill="#64748b" font-size="13">pʷ = [5.4, 2.3]ᵀ</text>
        <text x="510" y="67" text-anchor="middle" fill="#008fbd" font-size="13">pʳ = [3.5, 0.5]ᵀ</text>
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
