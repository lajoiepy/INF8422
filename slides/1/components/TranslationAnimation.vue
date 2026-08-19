<script setup lang="ts">
import GeometryAnimationControls from './GeometryAnimationControls.vue'
import { useGeometrySteps } from './useGeometrySteps'

const labels = [
  'Deux positions sont exprimées dans le même repère.',
  'La translation est la flèche qui va de p₁ vers p₂.',
  'L’inverse est exactement la même flèche en sens opposé.',
]
const formulas = ['p₁ʷ et p₂ʷ', 'p₁₂ʷ = p₂ʷ − p₁ʷ', 'p₂₁ʷ = −p₁₂ʷ']
const controls = useGeometrySteps(3)
const step = controls.step
</script>

<template>
  <div class="geometry-wrap">
    <svg viewBox="0 0 760 330" class="geometry-svg" role="img" aria-label="Translation entre deux points">
      <defs>
        <marker id="translation-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
        </marker>
      </defs>
      <rect width="760" height="330" rx="10" fill="#f8fafc" />
      <line x1="90" y1="270" x2="680" y2="270" stroke="#cbd5e1" stroke-width="2" />
      <line x1="115" y1="290" x2="115" y2="45" stroke="#cbd5e1" stroke-width="2" />

      <circle cx="235" cy="225" r="13" fill="#00BDF2" stroke="white" stroke-width="4" />
      <circle cx="555" cy="105" r="13" fill="#F15A22" stroke="white" stroke-width="4" />
      <text x="208" y="215" fill="#008fbd" font-size="17" font-weight="900">p₁</text>
      <text x="574" y="102" fill="#F15A22" font-size="17" font-weight="900">p₂</text>

      <g v-if="step >= 1" class="reveal">
        <line x1="250" y1="216" x2="538" y2="108" stroke="#7c3aed" stroke-width="8" marker-end="url(#translation-arrow)" />
        <text x="375" y="143" fill="#7c3aed" font-size="18" font-weight="900">p₁₂ʷ</text>
      </g>

      <g v-if="step === 2" class="reveal">
        <line x1="543" y1="128" x2="255" y2="236" stroke="#F15A22" stroke-width="5" stroke-dasharray="9 6" marker-end="url(#translation-arrow)" />
        <text x="387" y="215" fill="#F15A22" font-size="16" font-weight="900">p₂₁ʷ = −p₁₂ʷ</text>
        <rect x="205" y="26" width="350" height="48" rx="9" fill="white" stroke="#25B34B" stroke-width="2" />
        <text x="380" y="57" text-anchor="middle" fill="#25B34B" font-size="15" font-weight="900">Même déplacement, sens opposé</text>
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
