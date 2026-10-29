<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Paramètres de concentration Dirichlet ─────────────────────
const a1 = ref(1)
const a2 = ref(1)
const a3 = ref(1)

const presets = [
  { name: 'Ignorance', a: [1, 1, 1] },
  { name: 'Confidence', a: [30, 2, 2] },
  { name: 'Conflict', a: [15, 15, 2] },
]
function setPreset(a: number[]) { a1.value = a[0]; a2.value = a[1]; a3.value = a[2] }

// ── Logique subjective : S, u, croyances b_k, moyenne ─────────
const S = computed(() => a1.value + a2.value + a3.value)
const u = computed(() => 3 / S.value)
const mean = computed(() => [a1.value / S.value, a2.value / S.value, a3.value / S.value])

// ── Simplex Δ² : coordonnées barycentriques → écran ──────────
// classe 1 en bas à gauche, classe 2 en bas à droite, classe 3 au sommet
const V = [[36, 196], [344, 196], [190, 18]]
function bary(p: number[]): [number, number] {
  return [
    p[0] * V[0][0] + p[1] * V[1][0] + p[2] * V[2][0],
    p[0] * V[0][1] + p[1] * V[1][1] + p[2] * V[2][1],
  ]
}

// ── Grille barycentrique + densité Dir(π; α) non normalisée ──
const N = 24
const dots = computed(() => {
  const alpha = [a1.value, a2.value, a3.value]
  const raw: { x: number; y: number; lp: number }[] = []
  let maxLp = -Infinity
  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= N - i; j++) {
      const k = N - i - j
      // léger retrait vers l'intérieur pour éviter log(0) au bord
      const p = [(i + 0.35) / (N + 1.05), (j + 0.35) / (N + 1.05), (k + 0.35) / (N + 1.05)]
      let lp = 0
      for (let c = 0; c < 3; c++) lp += (alpha[c] - 1) * Math.log(p[c])
      const [x, y] = bary([i / N, j / N, k / N])
      raw.push({ x, y, lp })
      if (lp > maxLp) maxLp = lp
    }
  }
  return raw.map(d => ({ x: d.x, y: d.y, w: Math.exp(d.lp - maxLp) }))
})

const meanXY = computed(() => bary(mean.value))

const regime = computed(() => {
  if (u.value > 0.6)
    return { label: 'Ignorance: u high — "I don\'t know" (epistemic)', color: '#CF1C24' }
  if (Math.max(...mean.value) > 0.65)
    return { label: 'Confidence: evidence concentrated on one class', color: '#25B34B' }
  return { label: 'Conflict: strong but split evidence (aleatoric)', color: '#F15A22' }
})
</script>

<template>
  <div class="dir-wrap">
    <svg viewBox="0 0 558 218" class="dir-svg">
      <!-- Left panel: simplex -->
      <rect x="8" y="4" width="374" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <polygon :points="`${V[0][0]},${V[0][1]} ${V[1][0]},${V[1][1]} ${V[2][0]},${V[2][1]}`"
        fill="none" stroke="#94a3b8" stroke-width="1.2"/>

      <!-- Density: one point per barycentric cell -->
      <circle v-for="(d, i) in dots" :key="i"
        :cx="d.x" :cy="d.y" r="3.1" fill="#00BDF2"
        :style="{ opacity: 0.04 + 0.82 * d.w }"/>

      <!-- Mean E[π] = α/S -->
      <g :style="{ opacity: u > 0.9 ? 0.35 : 1 }">
        <line :x1="meanXY[0]-5" :y1="meanXY[1]" :x2="meanXY[0]+5" :y2="meanXY[1]" stroke="#CF1C24" stroke-width="1.6"/>
        <line :x1="meanXY[0]" :y1="meanXY[1]-5" :x2="meanXY[0]" :y2="meanXY[1]+5" stroke="#CF1C24" stroke-width="1.6"/>
      </g>

      <!-- Vertices -->
      <text :x="V[0][0]-4" :y="V[0][1]+13" text-anchor="start"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">class 1</text>
      <text :x="V[1][0]+4" :y="V[1][1]+13" text-anchor="end"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">class 2</text>
      <text :x="V[2][0]" :y="V[2][1]-6" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">class 3</text>
      <text x="195" y="209" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-family:sans-serif">simplex Δ²: each point is a distribution π over the 3 classes</text>

      <!-- Right panel: subjective logic -->
      <rect x="390" y="4" width="160" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="20" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Subjective logic</text>

      <rect x="398" y="28" width="144" height="30" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="40" text-anchor="middle"
        style="font-size:7.5px;fill:#c2410c;font-family:monospace">αₖ = eₖ + 1,  S = Σαₖ</text>
      <text x="470" y="52" text-anchor="middle"
        style="font-size:7.5px;fill:#c2410c;font-family:monospace">u = K/S,  bₖ = eₖ/S</text>

      <g style="font-size:8px;font-family:monospace">
        <text x="404" y="76" fill="#334155">α = ({{ a1.toFixed(0) }}, {{ a2.toFixed(0) }}, {{ a3.toFixed(0) }})</text>
        <text x="404" y="92" fill="#334155">S = {{ S.toFixed(0) }}</text>
        <text x="404" y="112" fill="#CF1C24" font-weight="700">u = 3/S = {{ u.toFixed(2) }}</text>
        <text x="404" y="130" fill="#0284c7">E[π] = ({{ mean[0].toFixed(2) }}, {{ mean[1].toFixed(2) }}, {{ mean[2].toFixed(2) }})</text>
      </g>

      <rect x="398" y="144" width="144" height="40" :stroke="regime.color" fill="none" rx="3" stroke-width="1.2"/>
      <foreignObject x="402" y="147" width="136" height="36">
        <div :style="{ fontSize: '6.8px', color: regime.color, fontFamily: 'sans-serif', fontWeight: 700, lineHeight: 1.25 }">
          {{ regime.label }}
        </div>
      </foreignObject>

      <text x="470" y="200" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">spread density = epistemic; off-vertex peak = aleatoric</text>
    </svg>

    <div class="dir-controls">
      <button v-for="p in presets" :key="p.name" class="dir-btn" @click="setPreset(p.a)">{{ p.name }}</button>
      <label class="dir-sl">α₁ <strong>{{ a1.toFixed(0) }}</strong>
        <input type="range" v-model.number="a1" min="1" max="30" step="1"/></label>
      <label class="dir-sl">α₂ <strong>{{ a2.toFixed(0) }}</strong>
        <input type="range" v-model.number="a2" min="1" max="30" step="1"/></label>
      <label class="dir-sl">α₃ <strong>{{ a3.toFixed(0) }}</strong>
        <input type="range" v-model.number="a3" min="1" max="30" step="1"/></label>
    </div>
  </div>
</template>

<style scoped>
.dir-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.dir-svg  { height: 250px; width: auto; max-width: 100%; display: block; }
.dir-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dir-btn {
  padding: 2px 10px; border-radius: 9999px; border: 1px solid #CF1C24;
  background: white; color: #CF1C24; cursor: pointer;
  font-family: monospace; font-size: 0.68rem;
}
.dir-btn:hover { background: #CF1C24; color: white; }
.dir-sl {
  display: flex; align-items: center; gap: 4px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.dir-sl strong { color: #CF1C24; min-width: 20px; display: inline-block; }
.dir-sl input[type=range] { width: 88px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
</style>
