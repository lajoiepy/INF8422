<script setup lang="ts">
import { ref, computed } from 'vue'

// Rayon t ∈ [0,4] traversant deux objets : profil de densité σ(ρ) à deux bosses.
const N = ref(24)          // nombre d'échantillons
const dens1 = ref(4.0)     // amplitude de densité de l'objet 1

const TN = 0, TF = 4

function sigma(t: number, a1: number): number {
  return a1 * Math.exp(-((t - 1.2) ** 2) / (2 * 0.12 ** 2)) +
         6.0 * Math.exp(-((t - 2.8) ** 2) / (2 * 0.18 ** 2))
}
// Couleur locale : cyan (objet 1) / orange (objet 2)
function colorAt(t: number): [number, number, number] {
  const w1 = Math.exp(-((t - 1.2) ** 2) / (2 * 0.25 ** 2))
  const w2 = Math.exp(-((t - 2.8) ** 2) / (2 * 0.3 ** 2))
  const s = w1 + w2 + 1e-9
  return [(w2 * 241) / s, (w1 * 189 + w2 * 90) / s, (w1 * 242 + w2 * 34) / s]
}

// Alpha compositing discret : α_i = 1 − exp(−σ_i δ), T_i = Π(1−α_j), w_i = T_i α_i
function renderRay(n: number, a1: number) {
  const dt = (TF - TN) / n
  let T = 1
  const C = [0, 0, 0]
  const samples: { t: number; T: number; w: number; c: [number, number, number]; sig: number }[] = []
  for (let i = 0; i < n; i++) {
    const t = TN + (i + 0.5) * dt
    const sig = sigma(t, a1)
    const alpha = 1 - Math.exp(-sig * dt)
    const w = T * alpha
    const c = colorAt(t)
    for (let k = 0; k < 3; k++) C[k] += w * c[k]
    samples.push({ t, T, w, c, sig })
    T *= 1 - alpha
  }
  return { C, Tfinal: T, samples }
}

const result = computed(() => renderRay(N.value, dens1.value))
const reference = computed(() => renderRay(2000, dens1.value))
const quadError = computed(() => {
  const a = result.value.C, b = reference.value.C
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 255
})
const pixelColor = computed(() => {
  const [r, g, b] = result.value.C
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`
})

// --- géométrie SVG ---
// Panneau gauche (scène) : x ∈ [10, 268] ; panneau droit (courbes) : x ∈ [288, 548]
const tToXL = (t: number) => 34 + (t / TF) * 226
const tToXR = (t: number) => 296 + (t / TF) * 244
const maxSigma = computed(() => Math.max(dens1.value, 6.0) * 1.02)

const sigmaPath = computed(() => {
  let d = ''
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * TF
    const y = 92 - (sigma(t, dens1.value) / maxSigma.value) * 58
    d += (i ? 'L' : 'M') + tToXR(t).toFixed(1) + ',' + y.toFixed(1)
  }
  return d
})
const transPath = computed(() => {
  // T(ρ) continue (référence fine) pour une courbe lisse
  const s = reference.value.samples
  let d = `M${tToXR(0).toFixed(1)},34`
  for (let i = 0; i < s.length; i += 10) {
    d += `L${tToXR(s[i].t).toFixed(1)},${(92 - s[i].T * 58).toFixed(1)}`
  }
  return d
})
const wMax = computed(() => Math.max(...result.value.samples.map(s => s.w), 1e-9))
</script>

<template>
  <div class="vr-wrap">
    <svg viewBox="0 0 558 215" class="vr-svg">
      <!-- Panneau gauche : la scène -->
      <rect x="4" y="4" width="270" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" />
      <text x="139" y="18" text-anchor="middle" style="font: bold 9px sans-serif; fill:#475569">Rayon X(ρ) = o + ρ·r, direction r unitaire</text>

      <!-- caméra -->
      <path d="M14,86 L30,78 L30,94 Z" fill="#475569" />
      <rect x="8" y="80" width="8" height="12" fill="#475569" rx="1" />
      <!-- rayon -->
      <line :x1="tToXL(0)" y1="86" :x2="tToXL(4)" y2="86" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
      <path :d="`M${tToXL(4)},86 l-6,-3 l0,6 Z`" fill="#94a3b8" />

      <!-- objets (opacité visuelle liée à la densité) -->
      <circle :cx="tToXL(1.2)" cy="86" r="17" fill="#00BDF2" :style="{ opacity: 0.15 + 0.75 * Math.min(dens1 / 12, 1) }" />
      <circle :cx="tToXL(1.2)" cy="86" r="9" fill="#00BDF2" :style="{ opacity: 0.25 + 0.75 * Math.min(dens1 / 12, 1) }" />
      <circle :cx="tToXL(2.8)" cy="86" r="22" fill="#F15A22" style="opacity:0.5" />
      <circle :cx="tToXL(2.8)" cy="86" r="12" fill="#F15A22" style="opacity:0.65" />
      <text :x="tToXL(1.2)" y="56" text-anchor="middle" style="font: 8px sans-serif; fill:#0284c7">objet 1 (σ ajustable)</text>
      <text :x="tToXL(2.8)" y="52" text-anchor="middle" style="font: 8px sans-serif; fill:#F15A22">objet 2</text>

      <!-- échantillons : rayon du point ∝ poids w_i -->
      <circle v-for="(s, i) in result.samples" :key="'s' + i"
        :cx="tToXL(s.t)" cy="86"
        :r="1 + 9 * Math.sqrt(s.w / wMax)"
        :fill="`rgb(${Math.round(s.c[0])},${Math.round(s.c[1])},${Math.round(s.c[2])})`"
        :style="{ opacity: 0.35 + 0.65 * (s.w / wMax) }" stroke="#475569" stroke-width="0.3" />
      <text x="139" y="118" text-anchor="middle" style="font: italic 8px sans-serif; fill:#64748b">taille du point ∝ poids w_i = T_i·α_i</text>

      <!-- pixel résultant -->
      <text x="60" y="146" style="font: bold 9px sans-serif; fill:#475569">Couleur du pixel Ĉ :</text>
      <rect x="160" y="134" width="30" height="18" :fill="pixelColor" stroke="#475569" stroke-width="1" rx="2" />
      <text x="200" y="146" style="font: 8px monospace; fill:#64748b">1−T(ρ_max) = {{ (1 - result.Tfinal).toFixed(3) }}</text>
      <text x="14" y="170" style="font: 8px monospace; fill:#CF1C24">erreur de quadrature par rapport à N=2000 : {{ quadError.toExponential(2) }}</text>

      <!-- Panneau droit : les courbes -->
      <rect x="284" y="4" width="270" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" />
      <text x="419" y="18" text-anchor="middle" style="font: bold 9px sans-serif; fill:#475569">σ(ρ), T(ρ) et poids w_i</text>

      <!-- axes -->
      <line x1="296" y1="92" x2="540" y2="92" stroke="#CBD5E1" stroke-width="1" />
      <line x1="296" y1="92" x2="296" y2="30" stroke="#CBD5E1" stroke-width="1" />
      <text x="542" y="100" style="font: 7px sans-serif; fill:#94a3b8">ρ</text>

      <!-- σ(ρ) -->
      <path :d="sigmaPath" fill="none" stroke="#F15A22" stroke-width="1.6" />
      <!-- T(ρ) -->
      <path :d="transPath" fill="none" stroke="#25B34B" stroke-width="1.6" />
      <text x="300" y="32" style="font: 7px sans-serif; fill:#25B34B">T(ρ)=1</text>

      <!-- poids discrets w_i (bas du panneau) -->
      <line x1="296" y1="168" x2="540" y2="168" stroke="#CBD5E1" stroke-width="1" />
      <rect v-for="(s, i) in result.samples" :key="'w' + i"
        :x="tToXR(s.t) - 110 / N" y="0" :width="220 / N" rx="1"
        :height="Math.max(0.5, (s.w / wMax) * 52)"
        :transform="`translate(0, ${168 - Math.max(0.5, (s.w / wMax) * 52)})`"
        fill="#CF1C24" style="opacity:0.75" />
      <text x="300" y="118" style="font: 7px sans-serif; fill:#CF1C24">w_i = T_i·α_i (contribution de chaque échantillon)</text>

      <!-- légende -->
      <line x1="360" y1="192" x2="374" y2="192" stroke="#F15A22" stroke-width="2" />
      <text x="377" y="195" style="font: 8px sans-serif; fill:#475569">σ(ρ) densité</text>
      <line x1="444" y1="192" x2="458" y2="192" stroke="#25B34B" stroke-width="2" />
      <text x="461" y="195" style="font: 8px sans-serif; fill:#475569">T(ρ) transmittance</text>
      <rect x="298" y="188" width="8" height="8" fill="#CF1C24" style="opacity:0.75" />
      <text x="309" y="195" style="font: 8px sans-serif; fill:#475569">w_i</text>
    </svg>
    <div class="vr-controls">
      <label class="vr-sl">N échantillons <strong>{{ N }}</strong>
        <input type="range" v-model.number="N" min="8" max="96" step="4" /></label>
      <label class="vr-sl">Densité objet 1 <strong>{{ dens1.toFixed(1) }}</strong>
        <input type="range" v-model.number="dens1" min="0" max="14" step="0.5" /></label>
      <span class="vr-hint">Densité accrue : la transmittance et la contribution de l’objet lointain diminuent.</span>
    </div>
  </div>
</template>

<style scoped>
.vr-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.vr-svg { height: 248px; width: auto; max-width: 100%; display: block; }
.vr-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vr-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.vr-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.vr-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.vr-hint { font-size: 0.65rem; color: #64748b; font-style: italic; }
</style>
