<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Paramètres ────────────────────────────────────────────
const ba  = ref(0.10)   // biais accéléromètre m/s²
const T   = ref(15)     // durée intégration (s)
const noiseKey = ref(0)
const noiseOn  = ref(false)

// ── Formule ───────────────────────────────────────────────
const errFinal = computed(() => 0.5 * ba.value * T.value ** 2)

// ── LCG déterministe ──────────────────────────────────────
function lcg(seed: number, i: number): number {
  let s = (seed * 22695477 + (i + 1) * 1013904223) | 0
  s = Math.imul(s, 1664525) + 1013904223 | 0
  s = Math.imul(s, 1664525) + 1013904223 | 0
  return (s >>> 1) / 0x40000000 - 1   // ∈ [-1, 1]
}

// ── Chemin bruité (random walk en position) ───────────────
const SIGMA_ACC = 0.12   // m/s² bruit blanc accéléromètre
const N = 150

const noiseSamples = computed((): number[] => {
  if (!noiseOn.value) return []
  const dt = T.value / N
  const pos = [0]
  let v = 0
  for (let i = 1; i <= N; i++) {
    // Approximation gaussienne (CLT 3 uniforms)
    const g = (lcg(noiseKey.value, i * 3)
             + lcg(noiseKey.value, i * 3 + 1)
             + lcg(noiseKey.value, i * 3 + 2)) / 3 * 1.73
    v += g * SIGMA_ACC * dt
    pos.push(pos[i - 1] + v * dt)
  }
  return pos
})

// ── SVG — panneau gauche (trajectoire) ────────────────────
const T_MAX = 30
const LX0 = 18, LX1 = 252     // x range left panel
const LY_BASE = 78             // y de la vraie trajectoire
const DRIFT_SCALE = 2.2        // SVG px / m (cap 50m)
const DRIFT_CAP   = 50

function tToXL(t: number): number {
  return LX0 + (t / T_MAX) * (LX1 - LX0)
}
function driftToY(d: number): number {
  return LY_BASE + Math.min(Math.abs(d), DRIFT_CAP) * DRIFT_SCALE * (d >= 0 ? 1 : -1)
}

const biasPath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N * T.value
    const y = driftToY(0.5 * ba.value * t * t)
    pts.push(`${tToXL(t).toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})

const noisePath = computed(() => {
  const ns = noiseSamples.value
  if (ns.length === 0) return ''
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N * T.value
    const y = driftToY(0.5 * ba.value * t * t + (ns[i] ?? 0))
    pts.push(`${tToXL(t).toFixed(1)},${y.toFixed(1)}`)
  }
  return pts.join(' ')
})

// Position actuelle (cercles)
const curTrueX  = computed(() => tToXL(T.value))
const curBiasY  = computed(() => driftToY(errFinal.value))
const curNoiseY = computed(() => {
  const ns = noiseSamples.value
  if (ns.length === 0) return curBiasY.value
  return driftToY(errFinal.value + (ns[N] ?? 0))
})

// ── SVG — panneau droit (erreur vs t) ─────────────────────
const GX0 = 297, GX1 = 540
const GT = 14, GB = 200

const errMax = computed(() => Math.max(0.5 * ba.value * T_MAX ** 2, 1))

function tToXG(t: number): number {
  return GX0 + (t / T_MAX) * (GX1 - GX0)
}
function errToY(e: number): number {
  return GB - Math.min(Math.abs(e), errMax.value) / errMax.value * (GB - GT)
}

const biasCurveG = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 80; i++) {
    const t = i / 80 * T_MAX
    pts.push(`${tToXG(t).toFixed(1)},${errToY(0.5 * ba.value * t * t).toFixed(1)}`)
  }
  return pts.join(' ')
})

const noiseCurveG = computed(() => {
  const ns = noiseSamples.value
  if (ns.length === 0) return ''
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N * T.value
    const e = 0.5 * ba.value * t * t + (ns[i] ?? 0)
    pts.push(`${tToXG(t).toFixed(1)},${errToY(e).toFixed(1)}`)
  }
  return pts.join(' ')
})

const dotGx = computed(() => tToXG(T.value))
const dotGy = computed(() => errToY(errFinal.value))

// Y-axis ticks (25%, 50%, 75%, 100% of errMax)
const yTicks = computed(() =>
  [0.25, 0.5, 0.75, 1.0].map(fr => ({
    y: errToY(errMax.value * fr),
    label: (errMax.value * fr).toFixed(fr === 1 ? 0 : 1),
  }))
)
// X-axis ticks every 5s
const xTicks = [5, 10, 15, 20, 25, 30].map(t => ({ t, x: tToXG(t) }))

// ── Contrôles ─────────────────────────────────────────────
function toggleNoise() {
  if (!noiseOn.value) {
    noiseOn.value = true
  } else {
    noiseKey.value++   // régénère un nouveau tracé
  }
}

function reset() {
  ba.value = 0.10; T.value = 15
  noiseOn.value = false; noiseKey.value = 0
}
</script>

<template>
  <div class="id-wrap">
    <svg viewBox="0 0 550 215" class="id-svg">
      <defs>
        <clipPath id="clipL"><rect x="2"   y="2" width="258" height="211"/></clipPath>
        <clipPath id="clipG"><rect x="277" y="2" width="271" height="211"/></clipPath>
        <marker id="idArrR" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#CF1C24"/></marker>
        <marker id="idArrRr" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#CF1C24"/></marker>
      </defs>

      <!-- ═══ LEFT PANEL — Trajectoire ═══ -->
      <rect x="2" y="2" width="258" height="211" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Label -->
      <text x="131" y="13"
        text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vue du dessus (t = {{ T }} s)
      </text>

      <!-- Vraie trajectoire (tiretée verte) -->
      <line :x1="LX0" :y1="LY_BASE" :x2="curTrueX" :y2="LY_BASE"
        stroke="#25B34B" stroke-width="2" stroke-dasharray="6,3"
        clip-path="url(#clipL)"/>

      <!-- Trajet estimé avec biais seul -->
      <polyline :points="biasPath"
        fill="none" stroke="#CF1C24" stroke-width="2"
        stroke-linejoin="round" clip-path="url(#clipL)"/>

      <!-- Trajet bruité (si activé) -->
      <polyline v-if="noiseOn && noisePath" :points="noisePath"
        fill="none" stroke="#F15A22" stroke-width="1.5" style="opacity:0.8"
        stroke-linejoin="round" clip-path="url(#clipL)"/>

      <!-- Flèche d'erreur verticale -->
      <line v-if="errFinal > 0.3"
        :x1="curTrueX + 14" :y1="LY_BASE"
        :x2="curTrueX + 14" :y2="curBiasY"
        stroke="#CF1C24" stroke-width="1.4"
        marker-end="url(#idArrR)" marker-start="url(#idArrRr)"
        clip-path="url(#clipL)"/>

      <!-- Point vrai courant -->
      <circle :cx="curTrueX" :cy="LY_BASE" r="7"
        fill="#25B34B" stroke="white" stroke-width="2" class="id-dot"/>
      <!-- Point estimé courant -->
      <circle :cx="curTrueX" :cy="curBiasY" r="7"
        fill="#CF1C24" stroke="white" stroke-width="2" class="id-dot"/>

      <!-- Label erreur -->
      <text v-if="errFinal > 0.5"
        :x="curTrueX + 20" :y="(LY_BASE + curBiasY) / 2 + 4"
        style="font-size:9.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        {{ errFinal.toFixed(1) }} m
      </text>

      <!-- Légende -->
      <text x="18" y="200"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        ── Vraie trajectoire
      </text>
      <text x="18" y="210"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        ── IMU (biais ba)
      </text>

      <!-- ═══ RIGHT PANEL — Erreur vs t ═══ -->
      <rect x="275" y="2" width="273" height="211" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Grid -->
      <line v-for="tk in yTicks" :key="tk.y"
        :x1="GX0" :y1="tk.y" :x2="GX1" :y2="tk.y"
        stroke="#E2E8F0" stroke-width="0.8" stroke-dasharray="3,2"/>

      <!-- Axes -->
      <line :x1="GX0" :y1="GB" :x2="GX1 + 5" :y2="GB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="GX0" :y1="GT - 4" :x2="GX0" :y2="GB" stroke="#475569" stroke-width="1.2"/>

      <!-- X ticks -->
      <g v-for="tk in xTicks" :key="tk.t">
        <line :x1="tk.x" :y1="GB" :x2="tk.x" :y2="GB + 4" stroke="#475569" stroke-width="1"/>
        <text :x="tk.x" :y="GB + 13" text-anchor="middle"
          style="font-size:8px;fill:#475569;font-family:sans-serif">{{ tk.t }}</text>
      </g>
      <text :x="(GX0+GX1)/2" :y="GB + 24" text-anchor="middle"
        style="font-size:9px;fill:#475569;font-family:sans-serif;font-style:italic">t (s)</text>

      <!-- Y ticks -->
      <g v-for="tk in yTicks" :key="`y${tk.y}`">
        <line :x1="GX0 - 4" :y1="tk.y" :x2="GX0" :y2="tk.y" stroke="#475569" stroke-width="1"/>
        <text :x="GX0 - 6" :y="tk.y + 3" text-anchor="end"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ tk.label }}</text>
      </g>
      <text :x="282" :y="(GT + GB) / 2" text-anchor="middle"
        transform="rotate(-90, 282, 107)"
        style="font-size:9px;fill:#475569;font-family:sans-serif;font-style:italic">Δy (m)</text>

      <!-- Courbe biais ½ba·t² -->
      <polyline :points="biasCurveG"
        fill="none" stroke="#F15A22" stroke-width="2.5"
        stroke-linejoin="round" clip-path="url(#clipG)"/>

      <!-- Annotation formule -->
      <text :x="tToXG(14)" :y="errToY(errMax * 0.55)"
        style="font-size:9px;fill:#F15A22;font-weight:700;font-style:italic;font-family:sans-serif">
        Δy = ½·ba·t²
      </text>

      <!-- Courbe bruitée -->
      <polyline v-if="noiseOn && noiseCurveG" :points="noiseCurveG"
        fill="none" stroke="#CF1C24" stroke-width="1.5" style="opacity:0.75"
        stroke-linejoin="round" clip-path="url(#clipG)"/>

      <!-- Marqueur temps courant (barre verticale) -->
      <line :x1="dotGx" :y1="GT" :x2="dotGx" :y2="GB"
        stroke="#475569" stroke-width="0.8" stroke-dasharray="4,3" style="opacity:0.4"/>

      <!-- Guide horizontal -->
      <line :x1="GX0" :y1="dotGy" :x2="dotGx" :y2="dotGy"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.4"/>

      <!-- Point courant sur la courbe -->
      <circle :cx="dotGx" :cy="dotGy" r="7"
        fill="#CF1C24" stroke="white" stroke-width="2" class="id-dot"/>
    </svg>

    <!-- Contrôles -->
    <div class="id-controls">
      <label class="id-sl">
        <span>ba =</span>
        <strong>{{ ba.toFixed(2) }}</strong>
        <span class="id-unit">m/s²</span>
        <input type="range" v-model.number="ba" min="0.00" max="0.50" step="0.01"/>
      </label>
      <label class="id-sl">
        <span>T =</span>
        <strong>{{ T }}</strong>
        <span class="id-unit">s</span>
        <input type="range" v-model.number="T" min="1" max="30" step="1"/>
      </label>
      <button class="btn-noise" :class="{ active: noiseOn }" @click="toggleNoise">
        ⟳ Bruit
      </button>
      <button class="btn-reset" @click="reset">↺</button>
      <div class="id-result">
        Δy = ½·ba·t² = <strong>{{ errFinal.toFixed(2) }} m</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.id-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.id-svg  { height: 250px; width: auto; max-width: 100%; display: block; }

/* Smooth transitions */
.id-dot { transition: cx 0.08s ease, cy 0.08s ease; }

/* Controls */
.id-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.id-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.id-sl strong { color: #CF1C24; min-width: 32px; display: inline-block; }
.id-unit { color: #94a3b8; font-size: 0.65rem; }
.id-sl input[type=range] { width: 130px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.btn-noise {
  padding: 4px 10px; border: 1.5px solid #F15A22; border-radius: 5px;
  background: white; font-size: 0.72rem; cursor: pointer; color: #F15A22; font-weight: 600;
}
.btn-noise.active { background: #fff7ed; }
.btn-noise:hover  { background: #fff7ed; }

.btn-reset {
  padding: 4px 10px; border: 1.5px solid #CBD5E1; border-radius: 5px;
  background: white; font-size: 0.72rem; cursor: pointer; color: #64748b; font-weight: 600;
}
.btn-reset:hover { background: #f1f5f9; }

.id-result {
  font-family: monospace; font-size: 0.75rem; color: #334155;
  padding: 3px 10px; background: #fef2f2; border: 1.5px solid #fca5a5;
  border-radius: 5px;
}
.id-result strong { color: #CF1C24; font-size: 0.95rem; font-weight: 700; }
</style>
