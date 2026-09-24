<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const K = ref(6)          // nombre de centroïdes
const tau = ref(2.0)      // température softmax
const seed = ref(0)       // graine pour nouvelle image

// Couleurs des clusters
const CLUSTER_COLORS = ['#CF1C24','#F15A22','#F59E0B','#25B34B','#00BDF2','#8B5CF6','#EC4899','#10B981']

// ── Génération de descripteurs locaux (N=8 points) ───────────
const N_DESC = 8
const DESC_DIM = 2  // espace 2D pour la visualisation

function lcg(s: number): () => number {
  let state = s
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }
}

const descriptors = computed(() => {
  const rng = lcg(seed.value * 137 + 41)
  return Array.from({ length: N_DESC }, () => ({
    x: rng() * 0.8 + 0.1,
    y: rng() * 0.8 + 0.1,
  }))
})

// ── Centroïdes (fixes par K) ─────────────────────────────────
const centroids = computed(() => {
  const rng = lcg(K.value * 17 + 5)
  return Array.from({ length: K.value }, () => ({
    x: rng() * 0.6 + 0.2,
    y: rng() * 0.6 + 0.2,
  }))
})

// ── Assignation softmax ā_k(x_i) ─────────────────────────────
function softmaxAssign(descIdx: number): number[] {
  const d = descriptors.value[descIdx]
  const scores = centroids.value.map(c =>
    -((d.x - c.x) ** 2 + (d.y - c.y) ** 2) / (2 * (0.2 ** 2))
  )
  const maxS = Math.max(...scores)
  const exps = scores.map(s => Math.exp((s - maxS) / tau.value))
  const sumE = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / sumE)
}

const assignments = computed(() =>
  descriptors.value.map((_, i) => softmaxAssign(i))
)

// ── Vecteur VLAD V[k] (magnitude) ────────────────────────────
const vladMagnitudes = computed(() => {
  const mags = Array(K.value).fill(0)
  const desc = descriptors.value
  const cs = centroids.value
  const asgn = assignments.value
  for (let k = 0; k < K.value; k++) {
    let sum = 0
    for (let i = 0; i < N_DESC; i++) {
      const a = asgn[i][k]
      const rx = desc[i].x - cs[k].x
      const ry = desc[i].y - cs[k].y
      sum += a * Math.sqrt(rx * rx + ry * ry)
    }
    mags[k] = sum
  }
  const maxM = Math.max(...mags, 0.001)
  return mags.map(m => m / maxM)
})

function newImage() { seed.value++ }

// ── SVG layout ────────────────────────────────────────────────
// Panneau gauche : espace descripteur (0,0)-(1,1) → SVG (10,22)-(160,165)
const DX0 = 10, DY0 = 22, DW = 155, DH = 143

function dsvgX(x: number) { return DX0 + x * DW }
function dsvgY(y: number) { return DY0 + y * DH }

// Panneau droit : barres VLAD
const VX0 = 385, VY0 = 18, VW = 155, BARW = computed(() => VW / K.value - 3)
</script>

<template>
  <div class="vlad-wrap">
    <svg viewBox="0 0 560 215" class="vlad-svg">
      <!-- Panneau gauche : espace descripteur -->
      <rect :x="DX0-2" :y="DY0-2" :width="DW+4" :height="DH+4"
        fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text :x="DX0+DW/2" y="16" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Descripteurs locaux x_i
      </text>

      <!-- Lignes d'affectation (épaisseur ∝ ā_k) -->
      <g v-for="(d, i) in descriptors" :key="`assign${i}`">
        <g v-for="(a, k) in assignments[i]" :key="k">
          <line v-if="a > 0.05"
            :x1="dsvgX(d.x)" :y1="dsvgY(d.y)"
            :x2="dsvgX(centroids[k].x)" :y2="dsvgY(centroids[k].y)"
            :stroke="CLUSTER_COLORS[k % CLUSTER_COLORS.length]"
            :stroke-width="a * 4"
            :style="{ opacity: a * 0.6 }"/>
        </g>
      </g>

      <!-- Centroïdes c_k -->
      <g v-for="(c, k) in centroids" :key="`c${k}`">
        <circle :cx="dsvgX(c.x)" :cy="dsvgY(c.y)" r="9"
          :fill="CLUSTER_COLORS[k % CLUSTER_COLORS.length]"
          stroke="white" stroke-width="2" style="opacity:0.9"/>
        <text :cx="dsvgX(c.x)" :cy="dsvgY(c.y)" text-anchor="middle" :x="dsvgX(c.x)" :y="dsvgY(c.y)+3.5"
          style="font-size:7px;fill:white;font-weight:700;font-family:monospace;pointer-events:none">
          c_{{ k }}
        </text>
      </g>

      <!-- Descripteurs locaux x_i -->
      <g v-for="(d, i) in descriptors" :key="i">
        <circle :cx="dsvgX(d.x)" :cy="dsvgY(d.y)" r="5.5"
          fill="#334155" stroke="white" stroke-width="1.5"/>
        <text :x="dsvgX(d.x)+7" :y="dsvgY(d.y)+4"
          style="font-size:6.5px;fill:#334155;font-family:monospace">x_{{ i }}</text>
      </g>

      <!-- Panneau centre : formule -->
      <rect x="172" y="18" width="205" height="178" fill="#fff7ed" rx="5" stroke="#fed7aa" stroke-width="1.2"/>
      <text x="274" y="33" text-anchor="middle"
        style="font-size:8px;fill:#c2410c;font-weight:700;font-family:sans-serif">Formule VLAD</text>
      <text x="180" y="52" style="font-size:7.5px;fill:#475569;font-family:monospace">
        V(j,k) = Σ_i ā_k(x_i) · (x_i(j)−c_k(j))
      </text>
      <text x="180" y="70" style="font-size:7.5px;fill:#475569;font-family:monospace">
        ā_k(x) = softmax( w_k^T x / τ )
      </text>
      <rect x="178" y="78" width="192" height="28" fill="#fef2f2" rx="3" stroke="#fca5a5"/>
      <text x="274" y="92" text-anchor="middle"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:monospace">τ = {{ tau.toFixed(1) }}</text>
      <text x="274" y="104" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">
        {{ tau < 1 ? '← affectation dure' : tau > 5 ? '← affectation uniforme' : '← affectation équilibrée' }}
      </text>

      <rect x="178" y="112" width="192" height="55" fill="#f0fdf4" rx="3" stroke="#86efac"/>
      <text x="274" y="126" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">Propriétés NetVLAD</text>
      <text x="182" y="140" style="font-size:7.5px;fill:#475569;font-family:sans-serif">• Différentiable (softmax)</text>
      <text x="182" y="153" style="font-size:7.5px;fill:#475569;font-family:sans-serif">• Dimension finale : K × dimension locale</text>
      <text x="182" y="166" style="font-size:7.5px;fill:#475569;font-family:sans-serif">• Entraînement de bout en bout (triplet)</text>

      <!-- Panneau droit : vecteur VLAD -->
      <rect :x="VX0-2" y="15" :width="VW+4" height="195" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text :x="VX0+VW/2" y="28" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">Vecteur VLAD V</text>

      <!-- Barres VLAD -->
      <g v-for="(mag, k) in vladMagnitudes" :key="k">
        <!-- Barre -->
        <rect
          :x="VX0 + k * (BARW + 3)"
          :y="180 - mag * 130"
          :width="BARW" :height="mag * 130"
          :fill="CLUSTER_COLORS[k % CLUSTER_COLORS.length]"
          style="opacity:0.85" rx="2"/>
        <!-- Valeur -->
        <text
          :x="VX0 + k * (BARW + 3) + BARW/2"
          :y="176 - mag * 130"
          text-anchor="middle"
          style="font-size:6.5px;font-family:monospace;fill:#334155">
          {{ mag.toFixed(2) }}
        </text>
        <!-- Label cluster -->
        <text
          :x="VX0 + k * (BARW + 3) + BARW/2"
          y="192"
          text-anchor="middle"
          :style="`font-size:7px;font-family:monospace;fill:${CLUSTER_COLORS[k % CLUSTER_COLORS.length]}`">
          c_{{ k }}
        </text>
      </g>
    </svg>

    <div class="vlad-controls">
      <label class="vlad-sl">
        K centroïdes
        <strong>{{ K }}</strong>
        <input type="range" v-model.number="K" min="3" max="8" step="1"/>
      </label>
      <label class="vlad-sl">
        Température τ
        <strong>{{ tau.toFixed(1) }}</strong>
        <input type="range" v-model.number="tau" min="0.3" max="10" step="0.1"/>
      </label>
      <button class="vlad-btn" @click="newImage">Nouvel exemple</button>
    </div>
  </div>
</template>

<style scoped>
.vlad-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.vlad-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.vlad-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vlad-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.vlad-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.vlad-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.vlad-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.vlad-btn:hover { background: #CF1C24; color: white; }
</style>
