<script setup lang="ts">
import { ref, computed } from 'vue'

const ell = ref(0.5)   // longueur de corrélation
const sigma_n = ref(0.1) // bruit capteur

const obs = ref<{ x: number; y: number }[]>([])
const svgRef = ref<SVGSVGElement | null>(null)

// ── Layout SVG ────────────────────────────────────────────────
const XL = 28, XR = 420, YB = 190, YT = 25
const X_WORLD_MIN = -3, X_WORLD_MAX = 3
const Y_WORLD_MIN = -2.5, Y_WORLD_MAX = 2.5
const N_TEST = 80

function svgX(xw: number) { return XL + (xw - X_WORLD_MIN) / (X_WORLD_MAX - X_WORLD_MIN) * (XR - XL) }
function svgY(yw: number) { return YB - (yw - Y_WORLD_MIN) / (Y_WORLD_MAX - Y_WORLD_MIN) * (YB - YT) }
function worldX(sx: number) { return X_WORLD_MIN + (sx - XL) / (XR - XL) * (X_WORLD_MAX - X_WORLD_MIN) }
function worldY(sy: number) { return Y_WORLD_MIN + (YB - sy) / (YB - YT) * (Y_WORLD_MAX - Y_WORLD_MIN) }

const testXs = computed(() =>
  Array.from({ length: N_TEST }, (_, i) => X_WORLD_MIN + i / (N_TEST - 1) * (X_WORLD_MAX - X_WORLD_MIN))
)

// ── Kernel RBF ────────────────────────────────────────────────
function k(x1: number, x2: number) {
  return Math.exp(-0.5 * ((x1 - x2) / ell.value) ** 2)
}

// ── Calcul GP posterior ───────────────────────────────────────
const posterior = computed(() => {
  const xs = testXs.value
  const n = obs.value.length
  if (n === 0) {
    return xs.map(x => ({ mean: 0, std: Math.sqrt(k(x, x)) }))
  }

  // Construire K_nn (n×n)
  const K = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => k(obs.value[i].x, obs.value[j].x))
  )
  // K_nn + sigma_n^2 * I
  for (let i = 0; i < n; i++) K[i][i] += sigma_n.value ** 2

  // Cholesky (approx: si n petit, on fait LU naïf)
  // Pour n ≤ 20, inversion directe par Gauss-Jordan
  const aug = K.map((row, i) => {
    const ext = Array(n).fill(0)
    ext[i] = 1
    return [...row, ...ext]
  })
  for (let col = 0; col < n; col++) {
    const pivot = aug[col][col]
    if (Math.abs(pivot) < 1e-12) continue
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot
    for (let row = 0; row < n; row++) {
      if (row === col) continue
      const factor = aug[row][col]
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j]
    }
  }
  const Kinv = aug.map(row => row.slice(n))

  // y vector
  const y = obs.value.map(o => o.y)

  // alpha = K_inv @ y
  const alpha = Array(n).fill(0)
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) alpha[i] += Kinv[i][j] * y[j]

  return xs.map(x => {
    // k_star = [k(x, x_i)]
    const kstar = obs.value.map(o => k(x, o.x))

    // mean = k_star @ alpha
    let mean = 0
    for (let i = 0; i < n; i++) mean += kstar[i] * alpha[i]

    // var = k(x,x) - k_star @ K_inv @ k_star
    let var_ = k(x, x)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) var_ -= kstar[i] * Kinv[i][j] * kstar[j]
    var_ = Math.max(0, var_)

    return { mean, std: Math.sqrt(var_) }
  })
})

// ── Polyline pour la courbe de moyenne ───────────────────────
const meanPts = computed(() =>
  posterior.value.map((p, i) => `${svgX(testXs.value[i]).toFixed(1)},${svgY(p.mean).toFixed(1)}`).join(' ')
)

// ── Région ±2σ ────────────────────────────────────────────────
const bandPath = computed(() => {
  const upper = posterior.value.map((p, i) =>
    `${svgX(testXs.value[i]).toFixed(1)},${svgY(p.mean + 2 * p.std).toFixed(1)}`)
  const lower = posterior.value.map((p, i) =>
    `${svgX(testXs.value[i]).toFixed(1)},${svgY(p.mean - 2 * p.std).toFixed(1)}`).reverse()
  return `M ${upper.join(' L ')} L ${lower.join(' L ')} Z`
})

// ── Clic SVG → ajouter observation ───────────────────────────
function handleClick(e: MouseEvent) {
  if (!svgRef.value) return
  if (obs.value.length >= 12) return  // max 12 points
  const r = svgRef.value.getBoundingClientRect()
  const sx = (e.clientX - r.left) * (480 / r.width)
  const sy = (e.clientY - r.top)  * (215 / r.height)
  if (sx < XL || sx > XR || sy < YT || sy > YB) return
  obs.value = [...obs.value, { x: worldX(sx), y: worldY(sy) }]
}

const axisTicks = [-2, -1, 0, 1, 2]

// ── Encart : forme du noyau k(d) = exp(-d²/2ℓ²) ──────────────────
// C'est ℓ qui fixe la PORTÉE de la corrélation spatiale : petit ℓ →
// le GP oublie vite (carte nerveuse), grand ℓ → lissage large.
const KX = 318, KY = 24, KW = 100, KH = 46
const kernelPath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 40; i++) {
    const d = i / 40 * 3
    const v = Math.exp(-0.5 * (d / ell.value) ** 2)
    pts.push(`${(KX + 6 + d / 3 * (KW - 12)).toFixed(1)},${(KY + KH - 8 - v * (KH - 20)).toFixed(1)}`)
  }
  return pts.join(' ')
})
</script>

<template>
  <div class="gp-wrap">
    <svg ref="svgRef" viewBox="0 0 480 215" class="gp-svg" @click="handleClick" style="cursor:crosshair">
      <defs>
        <clipPath id="gpClip"><rect :x="XL" :y="YT" :width="XR-XL" :height="YB-YT"/></clipPath>
      </defs>

      <!-- Fond panneau -->
      <rect x="0" y="0" width="430" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="215" y="13" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Régression par Processus Gaussien 1D — cliquer pour ajouter des observations
      </text>

      <!-- Axes -->
      <line :x1="XL" :y1="YB" :x2="XR+5" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="XL" :y1="YT-3" :x2="XL" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="XL" :y1="svgY(0)" :x2="XR" :y2="svgY(0)" stroke="#e2e8f0" stroke-width="0.8"/>

      <!-- Ticks X -->
      <g v-for="t in axisTicks" :key="t">
        <line :x1="svgX(t)" :y1="YB" :x2="svgX(t)" :y2="YB+4" stroke="#475569" stroke-width="1"/>
        <text :x="svgX(t)" :y="YB+12" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ t }}</text>
        <line :x1="XL" :y1="svgY(t)" :x2="XL-4" :y2="svgY(t)" stroke="#475569" stroke-width="1"/>
        <text :x="XL-6" :y="svgY(t)+3" text-anchor="end"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ t }}</text>
      </g>

      <!-- Bande ±2σ -->
      <path :d="bandPath" fill="#94a3b8" style="opacity:0.18" clip-path="url(#gpClip)"/>

      <!-- Courbe moyenne -->
      <polyline :points="meanPts" fill="none" stroke="#1e40af" stroke-width="2.2"
        stroke-linejoin="round" stroke-linecap="round" clip-path="url(#gpClip)"/>

      <!-- Observations -->
      <g v-for="(o, i) in obs" :key="i">
        <circle :cx="svgX(o.x)" :cy="svgY(o.y)" r="5.5"
          fill="#CF1C24" stroke="white" stroke-width="2"/>
      </g>

      <!-- Encart noyau k(d) -->
      <g style="pointer-events:none">
        <rect :x="KX" :y="KY" :width="KW" :height="KH" fill="white" rx="4"
          stroke="#CBD5E1" stroke-width="1" style="opacity:0.92"/>
        <text :x="KX + KW/2" :y="KY + 10" text-anchor="middle"
          style="font-size:6.5px;fill:#c2410c;font-weight:700;font-family:monospace">k(d)=exp(-d²/2ℓ²)</text>
        <polyline :points="kernelPath" fill="none" stroke="#F15A22" stroke-width="1.6"/>
        <line :x1="KX + 6" :y1="KY + KH - 8" :x2="KX + KW - 6" :y2="KY + KH - 8" stroke="#94a3b8" stroke-width="0.8"/>
        <text :x="KX + 6" :y="KY + KH - 1" style="font-size:5.5px;fill:#94a3b8;font-family:monospace">0</text>
        <text :x="KX + KW - 16" :y="KY + KH - 1" style="font-size:5.5px;fill:#94a3b8;font-family:monospace">d=3</text>
      </g>

      <!-- Légende -->
      <line x1="14" y1="202" x2="28" y2="202" stroke="#1e40af" stroke-width="2"/>
      <text x="32" y="205" style="font-size:7px;fill:#1e40af;font-weight:700;font-family:sans-serif">Moyenne GP</text>
      <rect x="80" y="196" width="16" height="10" fill="#94a3b8" style="opacity:0.35" rx="2"/>
      <text x="100" y="205" style="font-size:7px;fill:#64748b;font-family:sans-serif">±2σ</text>
      <circle cx="130" cy="201" r="4" fill="#CF1C24"/>
      <text x="138" y="205" style="font-size:7px;fill:#CF1C24;font-family:sans-serif">Observations ({{ obs.length }})</text>

      <!-- Panneau droit : paramètres -->
      <rect x="435" y="0" width="45" height="210" fill="#fff7ed" rx="5" stroke="#fed7aa" stroke-width="1"/>
      <text x="457" y="14" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-weight:700;font-family:sans-serif">GP</text>
      <text x="457" y="28" text-anchor="middle"
        style="font-size:6.5px;fill:#475569;font-family:monospace">ℓ={{ ell.toFixed(2) }}</text>
      <text x="457" y="42" text-anchor="middle"
        style="font-size:6.5px;fill:#475569;font-family:monospace">σₙ={{ sigma_n.toFixed(2) }}</text>
      <text x="457" y="60" text-anchor="middle"
        style="font-size:6px;fill:#94a3b8;font-style:italic;font-family:sans-serif">n={{ obs.length }}</text>
    </svg>

    <div class="gp-controls">
      <label class="gp-sl">
        ℓ (corrélation)
        <strong>{{ ell.toFixed(2) }}</strong>
        <input type="range" v-model.number="ell" min="0.1" max="2.0" step="0.05"/>
      </label>
      <label class="gp-sl">
        σₙ (bruit)
        <strong>{{ sigma_n.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma_n" min="0.01" max="0.5" step="0.01"/>
      </label>
      <button class="gp-btn" @click="obs = []">↺ Reset obs</button>
      <span class="gp-info">{{ obs.length === 0 ? 'Prior GP (aucune obs)' : `Posterior (${obs.length} obs, max 12)` }}</span>
    </div>
  </div>
</template>

<style scoped>
.gp-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.gp-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.gp-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.gp-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.gp-sl strong { color: #CF1C24; min-width: 32px; display: inline-block; }
.gp-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.gp-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 600;
}
.gp-btn:hover { background: #f1f5f9; }
.gp-info { font-size: 0.68rem; color: #64748b; font-style: italic; }
</style>
