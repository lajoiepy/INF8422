<script setup lang="ts">
import { computed } from 'vue'
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Le point est d’abord décrit dans le repère robot.',
  'Première opération : tourner le repère et le point ensemble.',
  'Deuxième opération : translater l’ensemble dans le monde.',
]
const formulas = ['pʳ', 'Rpʳ', 'pʷ = Rpʳ + t']
const controls = useGeometrySteps(3)
const step = controls.step

const angle = computed(() => step.value === 0 ? 0 : -38 * Math.PI / 180)
const origin = computed(() => step.value === 2 ? {x:450,y:190} : {x:220,y:230})
function pose(vx: number, vy: number) {
  const c = Math.cos(angle.value), s = Math.sin(angle.value)
  return {
    x: origin.value.x + c*vx - s*vy,
    y: origin.value.y + s*vx + c*vy,
  }
}
const xEnd = computed(() => pose(115, 0))
const yEnd = computed(() => pose(0, -115))
const point = computed(() => pose(95, -55))
const rotatedPoint = { x: 220 + Math.cos(-38*Math.PI/180)*95 - Math.sin(-38*Math.PI/180)*(-55), y: 230 + Math.sin(-38*Math.PI/180)*95 + Math.cos(-38*Math.PI/180)*(-55) }
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Une transformation rigide est une rotation suivie d'une translation">
      <defs>
        <marker id="rigid-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />
      <line x1="70" y1="280" x2="700" y2="280" stroke="#cbd5e1" stroke-width="2" />

      <!-- Pose initiale fantôme après la rotation -->
      <g v-if="step >= 1" opacity=".22" class="reveal">
        <line x1="220" y1="230" x2="335" y2="230" stroke="#CF1C24" stroke-width="6" />
        <line x1="220" y1="230" x2="220" y2="115" stroke="#25B34B" stroke-width="6" />
        <circle cx="315" cy="175" r="12" fill="#F15A22" />
      </g>

      <!-- Repère et point transformés comme un seul objet -->
      <g class="pose">
        <circle :cx="origin.x" :cy="origin.y" r="7" fill="#333" />
        <line :x1="origin.x" :y1="origin.y" :x2="xEnd.x" :y2="xEnd.y" stroke="#CF1C24" stroke-width="7" marker-end="url(#rigid-arrow)" />
        <line :x1="origin.x" :y1="origin.y" :x2="yEnd.x" :y2="yEnd.y" stroke="#25B34B" stroke-width="7" marker-end="url(#rigid-arrow)" />
        <circle :cx="point.x" :cy="point.y" r="14" fill="#F15A22" stroke="white" stroke-width="4" />
        <text :x="point.x+19" :y="point.y+5" fill="#F15A22" font-size="17" font-weight="900">p</text>
        <text :x="origin.x-20" :y="origin.y+28" fill="#333" font-size="13" font-weight="900">Oᵣ</text>
      </g>

      <g v-if="step === 1" class="reveal">
        <path d="M330 232 A110 110 0 0 0 300 145" fill="none" stroke="#CF1C24" stroke-width="6" marker-end="url(#rigid-arrow)" />
        <text x="340" y="115" fill="#CF1C24" font-size="18" font-weight="900">1. Rotation R</text>
      </g>

      <g v-if="step === 2" class="reveal">
        <line x1="220" y1="230" x2="435" y2="193" stroke="#7c3aed" stroke-width="8" stroke-dasharray="10 7" marker-end="url(#rigid-arrow)" />
        <line :x1="rotatedPoint.x" :y1="rotatedPoint.y" :x2="point.x" :y2="point.y" stroke="#7c3aed" stroke-width="5" stroke-dasharray="9 6" />
        <text x="335" y="247" fill="#7c3aed" font-size="18" font-weight="900">2. Translation t</text>
        <rect x="445" y="30" width="270" height="54" rx="10" fill="white" stroke="#25B34B" stroke-width="2" />
        <text x="580" y="63" text-anchor="middle" fill="#25B34B" font-size="17" font-weight="900">Rotation puis translation</text>
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
.pose line, .pose circle, .pose text { transition: all .75s cubic-bezier(.4,0,.2,1); }
.reveal { animation: reveal .35s ease both; }
@keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .pose line, .pose circle, .pose text { transition: none; } .reveal { animation: none; } }
</style>
