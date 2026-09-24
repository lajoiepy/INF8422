<script setup lang="ts">
import { computed, ref } from 'vue'

// Illustrative annotated frames; no image model is run in this demonstration.
const scenes = [
  { label: 'Virage à gauche', bend: -80, target: -0.6 },
  { label: 'Route droite', bend: 0, target: 0 },
  { label: 'Virage à droite', bend: 80, target: 0.6 },
]
const selected = ref(2)
const prediction = ref(0.2)
const scene = computed(() => scenes[selected.value])
const error = computed(() => prediction.value - scene.value.target)
const format = (value: number, digits = 2) => value.toFixed(digits).replace('.', ',')
const road = (bottom: number, top: number) =>
  `M ${bottom} 212 C ${bottom} 155, ${top + scene.value.bend} 104, ${top + scene.value.bend} 76`
</script>

<template>
  <div class="steering-example">
    <div class="steering-panels">
      <div>
        <h3>Entrée x · image de la caméra avant</h3>
        <svg class="road-view" viewBox="0 0 440 230" role="img" :aria-label="`Image schématique : ${scene.label}`">
          <rect width="440" height="230" rx="8" fill="#e8f4fa" />
          <path d="M0 76H440V230H0Z" fill="#dce9cf" />
          <path :d="`${road(42, 208)} L ${232 + scene.bend} 76 C ${232 + scene.bend} 104, 398 155, 398 212 Z`" fill="#586574" />
          <path :d="road(62, 210)" class="road-mark edge-mark" />
          <path :d="road(378, 230)" class="road-mark edge-mark" />
          <path :d="road(220, 220)" class="road-mark center-mark" />
          <path d="M0 220Q220 196 440 220V230H0Z" fill="#263445" />
          <rect x="12" y="12" width="225" height="27" rx="4" fill="white" />
          <text x="23" y="31">Route, marquages et courbe à venir</text>
        </svg>
        <div class="scene-buttons" role="group" aria-label="Exemple de route">
          <button v-for="(item, index) in scenes" :key="item.label" :aria-pressed="selected === index" :class="{ primary: selected === index }" @click="selected = index">{{ item.label }}</button>
        </div>
      </div>
      <div class="steering-output">
        <h3>Sortie ŷ · un seul nombre continu</h3>
        <div class="steering-value">ŷ = {{ format(prediction) }}</div>
        <svg class="angle-scale" viewBox="0 0 330 90" role="img" aria-label="Angle normalisé, de moins un à gauche à plus un à droite">
          <line x1="24" y1="38" x2="306" y2="38" stroke="#94a3b8" stroke-width="4" />
          <line x1="165" y1="32" x2="165" y2="44" stroke="#475569" stroke-width="2" />
          <path :d="`M${165 + scene.target * 141} 17l-7 -11h14Z`" fill="#218638" />
          <circle :cx="165 + prediction * 141" cy="38" r="8" fill="#CF1C24" />
          <text x="24" y="64" text-anchor="middle">−1</text>
          <text x="165" y="64" text-anchor="middle">0</text>
          <text x="306" y="64" text-anchor="middle">+1</text>
          <text x="24" y="83">À fond à gauche</text>
          <text x="306" y="83" text-anchor="end">À fond à droite</text>
        </svg>
        <label class="prediction-control">Prédiction ŷ
          <input v-model.number="prediction" aria-label="Angle prédit" type="range" min="-1" max="1" step="0.01" />
        </label>
        <p class="target-value">▲ Cible enregistrée avec l’image : y = {{ format(scene.target) }}</p>
        <p class="error-value">Erreur ŷ − y = <b>{{ format(error) }}</b><br />Perte ½(ŷ − y)² = <b>{{ format(error * error / 2, 3) }}</b></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.steering-panels { display: grid; grid-template-columns: 1.3fr 1fr; gap: 24px; }
.steering-example h3 { font-size: 16px; margin: 0 0 8px; }
.road-view { width: 100%; height: 230px; display: block; }
svg text { font: 13px 'Avenir Next', 'Nunito Sans', sans-serif; fill: #334155; }
.road-mark { fill: none; stroke: #fff; stroke-width: 4; transition: d 350ms ease; }
.center-mark { stroke: #ffe190; stroke-dasharray: 15 12; }
.scene-buttons { display: flex; gap: 6px; margin-top: 8px; }
.scene-buttons button { flex: 1; padding: 6px 3px; font-size: 12px; }
.steering-value { font-size: 31px; font-weight: 700; color: #a8161d; }
.angle-scale { display: block; width: 100%; height: 90px; }
.angle-scale circle { transition: cx 100ms ease; }
.prediction-control { display: flex; align-items: center; gap: 12px; font-size: 15px; margin-top: 8px; }
.prediction-control input { flex: 1; min-width: 0; accent-color: #CF1C24; }
.steering-example .target-value { font-size: 14px; color: #216934; margin: 10px 0 6px; }
.steering-example .error-value { font-size: 15px; line-height: 1.5; margin: 0; }
@media (prefers-reduced-motion: reduce) { .road-mark, .angle-scale circle { transition: none; } }
</style>
