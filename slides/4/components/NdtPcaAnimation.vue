<script setup lang="ts">
import { ref, computed } from 'vue'

// ── NDT + normales par ACP ────────────────────────────────────────
// Un scan 2D (murs en L + pilier courbe + amas diffus) est découpé en
// cellules ; chaque cellule ajuste une gaussienne N(μ, Σ) sur ses points.
// La décomposition propre de Σ (2×2, formule fermée) classifie la
// géométrie locale : λ₁ ≪ λ₂ → structure LINÉAIRE (mur) et v₁ (plus
// petite valeur propre) = NORMALE ; λ₁ ≈ λ₂ → coin / amas (pas de
// normale fiable). C'est exactement la recette ACP de la slide
// « Normales », appliquée par cellule au lieu de par point.
const WX = 11, WY = 7.5
const cellSize = ref(1.2)
const showNormals = ref(true)
const seed = ref(5)
const selected = ref<string | null>(null)
const SENSOR = { x: 5.6, y: 3.2 }   // pour orienter les normales (n·(c−μ) > 0)

function makeLcg(s0: number) {
  let s = s0
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
}
// ── Scan : murs en L + arc (pilier) + amas diffus ─────────────────
const points = computed<{ x: number; y: number }[]>(() => {
  const lcg = makeLcg(seed.value * 69621 + 11)
  const pts: { x: number; y: number }[] = []
  const n1 = (v: number) => v + (lcg() - 0.5) * 0.14   // bruit capteur
  for (let k = 0; k < 48; k++) pts.push({ x: n1(1.15), y: n1(0.6 + lcg() * 5.9) })     // mur vertical
  for (let k = 0; k < 58; k++) pts.push({ x: n1(1.15 + lcg() * 8.6), y: n1(0.65) })    // mur horizontal
  for (let k = 0; k < 46; k++) {                                                       // pilier courbe
    const a = -0.4 + lcg() * 3.6
    pts.push({ x: n1(8.6 + 1.55 * Math.cos(a)), y: n1(4.6 + 1.55 * Math.sin(a)) })
  }
  for (let k = 0; k < 26; k++) {                                                       // amas diffus (buisson)
    const a = lcg() * 6.283, r = Math.sqrt(lcg()) * 0.55
    pts.push({ x: 3.9 + r * Math.cos(a), y: 4.8 + r * Math.sin(a) })
  }
  return pts.filter(p => p.x > 0.1 && p.x < WX - 0.1 && p.y > 0.1 && p.y < WY - 0.1)
})

// ── Gaussienne par cellule + décomposition propre 2×2 ─────────────
interface Cell {
  key: string; i: number; j: number; n: number
  mu: { x: number; y: number }
  l1: number; l2: number          // λ₁ ≤ λ₂
  theta: number                   // angle du vecteur propre MAJEUR v₂ (monde, ccw)
  normal: { x: number; y: number }// v₁ orienté vers le capteur
  linear: boolean
}
const cells = computed<Cell[]>(() => {
  const h = cellSize.value
  const buckets = new Map<string, { x: number; y: number }[]>()
  for (const p of points.value) {
    const key = `${Math.floor(p.x / h)}_${Math.floor(p.y / h)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(p)
  }
  const out: Cell[] = []
  for (const [key, ps] of buckets) {
    if (ps.length < 5) continue
    const n = ps.length
    const mu = { x: ps.reduce((s, p) => s + p.x, 0) / n, y: ps.reduce((s, p) => s + p.y, 0) / n }
    let a = 0, b = 0, c = 0
    for (const p of ps) {
      const dx = p.x - mu.x, dy = p.y - mu.y
      a += dx * dx; b += dx * dy; c += dy * dy
    }
    a /= n; b /= n; c /= n
    const tr = a + c, disc = Math.sqrt((a - c) ** 2 + 4 * b * b)
    const l2 = (tr + disc) / 2, l1 = Math.max(1e-9, (tr - disc) / 2)
    const theta = 0.5 * Math.atan2(2 * b, a - c)             // direction de v₂ (majeur)
    let nx = -Math.sin(theta), ny = Math.cos(theta)          // v₁ ⊥ v₂
    const toSensor = { x: SENSOR.x - mu.x, y: SENSOR.y - mu.y }
    if (nx * toSensor.x + ny * toSensor.y < 0) { nx = -nx; ny = -ny }
    const [i, j] = key.split('_').map(Number)
    out.push({ key, i, j, n, mu, l1, l2, theta, normal: { x: nx, y: ny }, linear: l1 / l2 < 0.15 })
  }
  return out
})
const selCell = computed(() => cells.value.find(c => c.key === selected.value) ?? null)
const stats = computed(() => ({
  total: cells.value.length,
  linear: cells.value.filter(c => c.linear).length,
}))

// ── Layout SVG ────────────────────────────────────────────────────
const S = 26, OX = 12, OY = 205
const sx = (x: number) => OX + x * S
const sy = (y: number) => OY - y * S
const gridCols = computed(() => Math.ceil(WX / cellSize.value))
const gridRows = computed(() => Math.ceil(WY / cellSize.value))
const deg = (rad: number) => (-rad * 180) / Math.PI  // SVG y vers le bas → angle inversé
</script>

<template>
  <div class="ndt-wrap">
    <svg viewBox="0 0 560 215" class="ndt-svg">
      <!-- ══════ Scan + gaussiennes ══════ -->
      <rect x="0" y="0" width="330" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- grille NDT -->
      <g stroke="#e2e8f0" stroke-width="0.7">
        <line v-for="c in gridCols + 1" :key="`v${c}`"
          :x1="sx((c - 1) * cellSize)" :y1="sy(0)" :x2="sx((c - 1) * cellSize)" :y2="sy(WY)"/>
        <line v-for="r in gridRows + 1" :key="`h${r}`"
          :x1="sx(0)" :y1="sy((r - 1) * cellSize)" :x2="sx(WX)" :y2="sy((r - 1) * cellSize)"/>
      </g>

      <!-- points du scan -->
      <circle v-for="(p, k) in points" :key="`p${k}`"
        :cx="sx(p.x)" :cy="sy(p.y)" r="1.5" fill="#64748b" style="opacity:0.65"/>

      <!-- gaussiennes par cellule : ellipses 2σ -->
      <g v-for="c in cells" :key="c.key" style="cursor:pointer" @click="selected = c.key">
        <rect :x="sx(c.i * cellSize)" :y="sy((c.j + 1) * cellSize)"
          :width="cellSize * S" :height="cellSize * S"
          :fill="c.key === selected ? '#F59E0B' : 'transparent'"
          :style="`opacity:${c.key === selected ? 0.18 : 1}`"
          :stroke="c.key === selected ? '#F15A22' : 'none'" stroke-width="1.5"/>
        <ellipse :cx="sx(c.mu.x)" :cy="sy(c.mu.y)"
          :rx="2 * Math.sqrt(c.l2) * S" :ry="2 * Math.sqrt(c.l1) * S"
          :transform="`rotate(${deg(c.theta)}, ${sx(c.mu.x)}, ${sy(c.mu.y)})`"
          :fill="c.linear ? '#25B34B' : '#F15A22'" :stroke="c.linear ? '#25B34B' : '#F15A22'"
          stroke-width="1.2" style="fill-opacity:0.18"/>
        <!-- normale (cellules linéaires) -->
        <line v-if="showNormals && c.linear"
          :x1="sx(c.mu.x)" :y1="sy(c.mu.y)"
          :x2="sx(c.mu.x + c.normal.x * 0.55)" :y2="sy(c.mu.y + c.normal.y * 0.55)"
          stroke="#CF1C24" stroke-width="1.6"/>
      </g>

      <!-- capteur (orientation des normales) -->
      <circle :cx="sx(SENSOR.x)" :cy="sy(SENSOR.y)" r="4.5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <text :x="sx(SENSOR.x) + 7" :y="sy(SENSOR.y) + 3"
        style="font-size:6.5px;fill:#334155;font-family:sans-serif">capteur</text>

      <text x="165" y="207" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        cliquez une cellule · <tspan fill="#25B34B">vert</tspan> = linéaire (λ₁ ≪ λ₂) · <tspan fill="#F15A22">orange</tspan> = coin / amas · <tspan fill="#CF1C24">trait rouge</tspan> = normale v₁
      </text>

      <!-- ══════ Détail de la cellule ══════ -->
      <rect x="336" y="0" width="222" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="447" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ selCell ? `Cellule (${selCell.i}, ${selCell.j}) — N(μ, Σ)` : 'Décomposition propre de Σ' }}
      </text>

      <template v-if="selCell">
        <!-- ellipse agrandie + vecteurs propres -->
        <g :transform="`translate(447, 78)`">
          <ellipse :rx="Math.min(88, 2 * Math.sqrt(selCell.l2) * 150)"
            :ry="Math.max(3, Math.min(50, 2 * Math.sqrt(selCell.l1) * 150))"
            :transform="`rotate(${deg(selCell.theta)})`"
            :fill="selCell.linear ? '#25B34B' : '#F15A22'"
            :stroke="selCell.linear ? '#25B34B' : '#F15A22'" stroke-width="1.5" style="fill-opacity:0.15"/>
          <line :x2="Math.cos(-selCell.theta) * Math.min(88, 2 * Math.sqrt(selCell.l2) * 150)"
            :y2="Math.sin(-selCell.theta) * Math.min(88, 2 * Math.sqrt(selCell.l2) * 150)"
            stroke="#0284c7" stroke-width="2"/>
          <line :x2="selCell.normal.x * 42" :y2="-selCell.normal.y * 42"
            stroke="#CF1C24" stroke-width="2"/>
          <text :x="selCell.normal.x * 42 + 5" :y="-selCell.normal.y * 42"
            style="font-size:7px;fill:#CF1C24;font-weight:700;font-family:monospace">v₁ {{ selCell.linear ? '= n' : '' }}</text>
          <text :x="Math.cos(-selCell.theta) * 60" :y="Math.sin(-selCell.theta) * 60 - 6"
            style="font-size:7px;fill:#0284c7;font-weight:700;font-family:monospace">v₂</text>
        </g>

        <text x="352" y="140" style="font-size:7.5px;fill:#475569;font-family:monospace">
          {{ selCell.n }} points · λ₁ = {{ selCell.l1.toFixed(4) }} · λ₂ = {{ selCell.l2.toFixed(4) }}
        </text>
        <!-- barre de ratio -->
        <rect x="352" y="148" width="190" height="7" fill="#e2e8f0" rx="3"/>
        <rect x="352" y="148" :width="Math.max(3, 190 * Math.min(1, selCell.l1 / selCell.l2))" height="7"
          :fill="selCell.linear ? '#25B34B' : '#F15A22'" rx="3"/>
        <text x="352" y="167" style="font-size:7px;fill:#64748b;font-family:monospace">
          λ₁/λ₂ = {{ (selCell.l1 / selCell.l2).toFixed(3) }} {{ selCell.linear ? '< 0.15' : '≥ 0.15' }}
        </text>

        <rect x="344" y="175" width="206" height="28"
          :fill="selCell.linear ? '#f0fdf4' : '#fff7ed'" rx="4"
          :stroke="selCell.linear ? '#86efac' : '#fed7aa'"/>
        <text x="447" y="188" text-anchor="middle" style="font-size:7.5px;font-weight:700;font-family:sans-serif"
          :fill="selCell.linear ? '#15803d' : '#c2410c'">
          {{ selCell.linear ? 'LINÉAIRE → v₁ est la normale de surface' : 'COIN / AMAS → pas de normale fiable' }}
        </text>
        <text x="447" y="198" text-anchor="middle" style="font-size:6.5px;fill:#78716c;font-family:sans-serif">
          {{ selCell.linear ? 'signe choisi vers le capteur : n·(c−μ) > 0' : 'λ₁ ≈ λ₂ : la distribution n\'est pas aplatie' }}
        </text>
      </template>
      <template v-else>
        <text x="352" y="40" style="font-size:7.5px;fill:#475569;font-family:monospace">Σ = 1/n Σᵢ (pᵢ−μ)(pᵢ−μ)ᵀ</text>
        <text x="352" y="60" style="font-size:7.5px;fill:#475569;font-family:sans-serif">λ₁ ≤ λ₂ (valeurs propres) :</text>
        <text x="360" y="76" style="font-size:7.5px;fill:#15803d;font-family:sans-serif">• λ₁ ≪ λ₂ → mur/plan, v₁ = normale</text>
        <text x="360" y="90" style="font-size:7.5px;fill:#c2410c;font-family:sans-serif">• λ₁ ≈ λ₂ → coin, amas, bruit</text>
        <text x="352" y="112" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
          cliquez une cellule pour voir μ, Σ, λ, v₁, v₂
        </text>
        <text x="352" y="136" style="font-size:7.5px;fill:#475569;font-family:sans-serif">
          Cellules ajustées : {{ stats.total }} · linéaires : {{ stats.linear }}
        </text>
        <text x="352" y="152" style="font-size:7px;fill:#64748b;font-family:sans-serif">
          Agrandissez les cellules : les coins mélangent
        </text>
        <text x="352" y="162" style="font-size:7px;fill:#64748b;font-family:sans-serif">
          deux murs → gaussiennes « rondes » (λ₁/λ₂ ↑).
        </text>
        <text x="352" y="180" style="font-size:7px;fill:#64748b;font-family:sans-serif">
          NDT-Matching : maximiser Π p(pᵢ) sous ces
        </text>
        <text x="352" y="190" style="font-size:7px;fill:#64748b;font-family:sans-serif">
          gaussiennes (Autoware, ndt_matching).
        </text>
      </template>
    </svg>

    <div class="ndt-controls">
      <label class="ndt-sl">cellule <strong>{{ cellSize.toFixed(1) }} m</strong>
        <input type="range" v-model.number="cellSize" min="0.7" max="2.4" step="0.1"/></label>
      <button class="ndt-btn" :class="{ on: showNormals }" @click="showNormals = !showNormals">
        {{ showNormals ? '✓ normales' : 'normales' }}
      </button>
      <button class="ndt-btn" @click="seed++; selected = null">🎲 nouveau scan</button>
      <span class="ndt-info">{{ stats.linear }}/{{ stats.total }} cellules linéaires — variez la taille : trop grand → coins « ronds », trop petit → cellules sous-peuplées</span>
    </div>
  </div>
</template>

<style scoped>
.ndt-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ndt-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ndt-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ndt-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.ndt-sl strong { color: #CF1C24; min-width: 42px; display: inline-block; }
.ndt-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ndt-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem; font-weight: 700;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b;
}
.ndt-btn:hover { background: #f1f5f9; }
.ndt-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.ndt-info { font-size: 0.62rem; color: #64748b; font-style: italic; }
</style>
