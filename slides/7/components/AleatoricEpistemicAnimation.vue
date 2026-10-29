<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Régression par processus gaussien (GP), noyau RBF ─────────
// k(x,x') = σf² exp(−(x−x')²/2ℓ²) ; bruit d'observation σₙ²
const SIGMA_F = 1.0
const ell = ref(0.8)        // longueur de corrélation ℓ
const sigmaNoise = ref(0.15) // σ_aléatoire (bruit capteur)

interface Obs { x: number; y: number }
const DEFAULT_OBS: Obs[] = [{ x: 2.0, y: 0.8 }, { x: 3.0, y: 0.35 }, { x: 6.5, y: -0.9 }]
const obs = ref<Obs[]>([...DEFAULT_OBS])
const MAX_OBS = 14

function kernel(a: number, b: number): number {
  const d = (a - b) / ell.value
  return SIGMA_F * SIGMA_F * Math.exp(-0.5 * d * d)
}

// Cholesky A = L·Lᵀ (A symétrique définie positive, n ≤ 14)
function cholesky(A: number[][]): number[][] {
  const n = A.length
  const L = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i][j]
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j]
    }
  }
  return L
}

// Résout (L·Lᵀ)·x = b par substitution avant puis arrière
function cholSolve(L: number[][], b: number[]): number[] {
  const n = L.length
  const y = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    let s = b[i]
    for (let k = 0; k < i; k++) s -= L[i][k] * y[k]
    y[i] = s / L[i][i]
  }
  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i]
    for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]
    x[i] = s / L[i][i]
  }
  return x
}

// Posterior GP sur une grille de test :
// μ(x*) = k*ᵀ(K+σₙ²I)⁻¹y ; var_f(x*) = k(x*,x*) − k*ᵀ(K+σₙ²I)⁻¹k*
const XMIN = 0, XMAX = 10, NGRID = 90
const gp = computed(() => {
  const pts = obs.value
  const n = pts.length
  const grid: { x: number; mu: number; sEpi: number }[] = []
  if (n === 0) {
    for (let g = 0; g <= NGRID; g++) {
      const x = XMIN + (XMAX - XMIN) * g / NGRID
      grid.push({ x, mu: 0, sEpi: SIGMA_F })
    }
    return grid
  }
  const K: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      kernel(pts[i].x, pts[j].x) + (i === j ? sigmaNoise.value ** 2 : 0)))
  const L = cholesky(K)
  const alpha = cholSolve(L, pts.map(p => p.y))
  for (let g = 0; g <= NGRID; g++) {
    const x = XMIN + (XMAX - XMIN) * g / NGRID
    const ks = pts.map(p => kernel(x, p.x))
    let mu = 0
    for (let i = 0; i < n; i++) mu += ks[i] * alpha[i]
    const v = cholSolve(L, ks)
    let varF = kernel(x, x)
    for (let i = 0; i < n; i++) varF -= ks[i] * v[i]
    grid.push({ x, mu, sEpi: Math.sqrt(Math.max(varF, 0)) })
  }
  return grid
})

// ── Tracé ─────────────────────────────────────────────────────
const PX0 = 16, PX1 = 374, PY0 = 190, PY1 = 26
const YMIN = -2.2, YMAX = 2.2

function sx(x: number): number { return PX0 + (x - XMIN) / (XMAX - XMIN) * (PX1 - PX0) }
function sy(y: number): number { return PY0 - (Math.max(YMIN, Math.min(y, YMAX)) - YMIN) / (YMAX - YMIN) * (PY0 - PY1) }
function invSx(px: number): number { return XMIN + (px - PX0) / (PX1 - PX0) * (XMAX - XMIN) }
function invSy(py: number): number { return YMIN + (PY0 - py) / (PY0 - PY1) * (YMAX - YMIN) }

const meanPath = computed(() =>
  'M' + gp.value.map(p => `${sx(p.x).toFixed(1)},${sy(p.mu).toFixed(1)}`).join(' L'))

// Bande épistémique : μ ± 2σ_épi (bleu, large loin des données)
const epiBand = computed(() => {
  const up = gp.value.map(p => `${sx(p.x).toFixed(1)},${sy(p.mu + 2 * p.sEpi).toFixed(1)}`)
  const lo = gp.value.map(p => `${sx(p.x).toFixed(1)},${sy(p.mu - 2 * p.sEpi).toFixed(1)}`).reverse()
  return 'M' + up.join(' L') + ' L' + lo.join(' L') + ' Z'
})

// Bande aléatoire : μ ± 2σₙ (orange, épaisseur constante)
const aleaBand = computed(() => {
  const s = 2 * sigmaNoise.value
  const up = gp.value.map(p => `${sx(p.x).toFixed(1)},${sy(p.mu + s).toFixed(1)}`)
  const lo = gp.value.map(p => `${sx(p.x).toFixed(1)},${sy(p.mu - s).toFixed(1)}`).reverse()
  return 'M' + up.join(' L') + ' L' + lo.join(' L') + ' Z'
})

// ── Interaction ───────────────────────────────────────────────
const svgEl = ref<SVGSVGElement | null>(null)

function onSvgClick(e: MouseEvent) {
  if (!svgEl.value || obs.value.length >= MAX_OBS) return
  const rect = svgEl.value.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width * 558
  const py = (e.clientY - rect.top) / rect.height * 215
  if (px < PX0 || px > PX1 || py < PY1 || py > PY0) return
  obs.value = [...obs.value, { x: invSx(px), y: invSy(py) }]
}

function reset() { obs.value = [...DEFAULT_OBS] }
</script>

<template>
  <div class="ae-wrap">
    <svg ref="svgEl" viewBox="0 0 558 215" class="ae-svg" @click="onSvgClick">
      <!-- Panneau principal -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1" style="cursor:crosshair"/>

      <path :d="epiBand" fill="#00BDF2" style="opacity:0.22"/>
      <path :d="aleaBand" fill="#F15A22" style="opacity:0.35"/>
      <path :d="meanPath" fill="none" stroke="#1d4ed8" stroke-width="2"/>

      <g>
        <circle v-for="(p, i) in obs" :key="i" :cx="sx(p.x)" :cy="sy(p.y)" r="3.5"
          fill="#CF1C24" stroke="white" stroke-width="1"/>
      </g>

      <line :x1="PX0" :y1="sy(0)" :x2="PX1" :y2="sy(0)" stroke="#94a3b8" stroke-width="0.7" stroke-dasharray="2,3"/>
      <text :x="(PX0+PX1)/2" y="203" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">cliquer pour ajouter une observation (x, y)</text>

      <!-- Légende -->
      <g style="font-size:7.5px;font-family:sans-serif">
        <rect x="22" y="15" width="13" height="8" fill="#00BDF2" style="opacity:0.3"/>
        <text x="38" y="22" fill="#0369a1">±2σ épistémique (GP)</text>
        <rect x="146" y="15" width="13" height="8" fill="#F15A22" style="opacity:0.45"/>
        <text x="162" y="22" fill="#c2410c">±2σ aléatoire (bruit)</text>
        <line x1="266" y1="19" x2="279" y2="19" stroke="#1d4ed8" stroke-width="2"/>
        <text x="283" y="22" fill="#1d4ed8">moyenne μ(x)</text>
      </g>

      <!-- Panneau droit -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Deux incertitudes</text>

      <rect x="398" y="32" width="144" height="52" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="405" y="44" style="font-size:7px;fill:#c2410c;font-weight:700;font-family:sans-serif">Aléatoire — irréductible</text>
      <text x="405" y="55" style="font-size:6.6px;fill:#9a3412;font-family:sans-serif">Bande orange constante :</text>
      <text x="405" y="65" style="font-size:6.6px;fill:#9a3412;font-family:sans-serif">ajouter des points ne la</text>
      <text x="405" y="75" style="font-size:6.6px;fill:#9a3412;font-family:sans-serif">réduit pas (σₙ = bruit capteur).</text>

      <rect x="398" y="90" width="144" height="52" fill="#f0f9ff" rx="3" stroke="#bae6fd"/>
      <text x="405" y="102" style="font-size:7px;fill:#0369a1;font-weight:700;font-family:sans-serif">Épistémique — réductible</text>
      <text x="405" y="113" style="font-size:6.6px;fill:#075985;font-family:sans-serif">Bande bleue : large loin des</text>
      <text x="405" y="123" style="font-size:6.6px;fill:#075985;font-family:sans-serif">observations, s'effondre là où</text>
      <text x="405" y="133" style="font-size:6.6px;fill:#075985;font-family:sans-serif">on a des données.</text>

      <g style="font-size:7.5px;font-family:monospace">
        <text x="404" y="160" fill="#334155">n = {{ obs.length }} observations</text>
        <text x="404" y="174" fill="#c2410c">σ_aléa = {{ sigmaNoise.toFixed(2) }}</text>
        <text x="404" y="188" fill="#0369a1">ℓ = {{ ell.toFixed(2) }} (portée)</text>
      </g>
    </svg>

    <div class="ae-controls">
      <label class="ae-sl">
        σ_aléatoire
        <strong>{{ sigmaNoise.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigmaNoise" min="0.05" max="0.3" step="0.01"/>
      </label>
      <label class="ae-sl">
        ℓ corrélation
        <strong>{{ ell.toFixed(2) }}</strong>
        <input type="range" v-model.number="ell" min="0.3" max="2" step="0.05"/>
      </label>
      <button class="ae-btn" @click="reset">Reset</button>
    </div>
  </div>
</template>

<style scoped>
.ae-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ae-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ae-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ae-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ae-sl strong { color: #CF1C24; min-width: 36px; display: inline-block; }
.ae-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ae-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.ae-btn:hover { background: #e2e8f0; }
</style>
