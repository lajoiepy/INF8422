<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { signedEDT2D } from '../lib/distance-transform.mjs'

// ── Optimisation de trajectoire sur ESDF (style CHOMP/TrajOpt) ────
// Coût minimisé par VRAIE descente de gradient sur les waypoints :
//   J = λ_s Σᵢ ‖qᵢ₊₁ − qᵢ‖²  +  λ_c Σᵢ c(d(qᵢ))
//   c(d) = (ε − d)²  si d < ε, 0 sinon   (pénalité hinge²)
//   ∇c = −2(ε − d)·∇d  →  pousse le waypoint le long de +∇d,
//   c.-à-d. dans la direction qui S'ÉLOIGNE de l'obstacle.
// d(·) : transformée euclidienne exacte aux centres de la grille,
// signée par deux transformées, puis interpolée bilinéairement.
// La discrétisation et l'interpolation restent des approximations de la surface.
const WORLD_W = 10, WORLD_H = 7
const CELL = 0.2                       // résolution du champ de distance (m)
const NX = Math.round(WORLD_W / CELL), NY = Math.round(WORLD_H / CELL)

const obstacles = ref([
  { x: 5.0, y: 3.1, r: 1.15 },
  { x: 7.2, y: 5.0, r: 0.75 },
])

const lambdaC = ref(4)        // poids collision
const eps = ref(0.8)          // marge de sécurité ε (m)
const ETA = 0.015             // pas de gradient
const LAMBDA_S = 1.0

// Même transformée que la démonstration ESDF par passes avant/arrière.
const distField = computed(() => {
  const occupied = Array.from({ length: NY }, (_, j) => Array.from({ length: NX }, (_, i) =>
    obstacles.value.some(o => Math.hypot((i + 0.5) * CELL - o.x, (j + 0.5) * CELL - o.y) <= o.r)))
  return signedEDT2D(occupied, undefined, CELL) as number[][]
})

// Interpolation bilinéaire de d en un point continu
function distAt(x: number, y: number): number {
  const d = distField.value
  const gx = Math.min(Math.max(x / CELL - 0.5, 0), NX - 1.001)
  const gy = Math.min(Math.max(y / CELL - 0.5, 0), NY - 1.001)
  const i0 = Math.floor(gx), j0 = Math.floor(gy)
  const fx = gx - i0, fy = gy - j0
  const i1 = Math.min(i0 + 1, NX - 1), j1 = Math.min(j0 + 1, NY - 1)
  return d[j0][i0] * (1-fx) * (1-fy) + d[j0][i1] * fx * (1-fy)
       + d[j1][i0] * (1-fx) * fy + d[j1][i1] * fx * fy
}
// ∇d par différences centrées sur le champ interpolé
function gradAt(x: number, y: number): { gx: number; gy: number } {
  const h = 0.5 * CELL
  return {
    gx: (distAt(x + h, y) - distAt(x - h, y)) / (2 * h),
    gy: (distAt(x, y + h) - distAt(x, y - h)) / (2 * h),
  }
}

// ── Trajectoire : waypoints, extrémités fixes ─────────────────────
const NW = 25
const START = { x: 0.8, y: 3.3 }
const GOAL = { x: 9.2, y: 3.3 }
function initTraj() {
  // léger zigzag déterministe pour briser la symétrie (évite le point-selle
  // quand la ligne droite passe exactement par le centre d'un obstacle)
  return Array.from({ length: NW }, (_, i) => ({
    x: START.x + (GOAL.x - START.x) * i / (NW - 1),
    y: START.y + (GOAL.y - START.y) * i / (NW - 1) + 0.02 * Math.sin(i * 1.7),
  }))
}
const traj = ref(initTraj())
const iter = ref(0)

// Coûts courants
const costs = computed(() => {
  let smooth = 0, coll = 0
  for (let i = 0; i < NW - 1; i++) {
    smooth += (traj.value[i+1].x - traj.value[i].x) ** 2 + (traj.value[i+1].y - traj.value[i].y) ** 2
  }
  for (let i = 1; i < NW - 1; i++) {
    const d = distAt(traj.value[i].x, traj.value[i].y)
    if (d < eps.value) coll += (eps.value - d) ** 2
  }
  return { smooth: LAMBDA_S * smooth, coll: lambdaC.value * coll }
})
// Une itération de descente de gradient
function step(): number {
  const t = traj.value
  const nt = t.map(q => ({ ...q }))
  let maxMove = 0
  for (let i = 1; i < NW - 1; i++) {
    // ∇ lissage (1er ordre) : 2(2qᵢ − qᵢ₋₁ − qᵢ₊₁)
    let gx = LAMBDA_S * 2 * (2 * t[i].x - t[i-1].x - t[i+1].x)
    let gy = LAMBDA_S * 2 * (2 * t[i].y - t[i-1].y - t[i+1].y)
    // ∇ collision : −2 λ_c (ε − d) ∇d  (si d < ε)
    const d = distAt(t[i].x, t[i].y)
    if (d < eps.value) {
      const g = gradAt(t[i].x, t[i].y)
      gx += -2 * lambdaC.value * (eps.value - d) * g.gx
      gy += -2 * lambdaC.value * (eps.value - d) * g.gy
    }
    // pas de gradient, borné pour la stabilité
    let dx = -ETA * gx, dy = -ETA * gy
    const m = Math.hypot(dx, dy)
    if (m > 0.06) { dx *= 0.06 / m; dy *= 0.06 / m }
    nt[i].x = Math.min(Math.max(t[i].x + dx, 0.2), WORLD_W - 0.2)
    nt[i].y = Math.min(Math.max(t[i].y + dy, 0.2), WORLD_H - 0.2)
    maxMove = Math.max(maxMove, Math.hypot(dx, dy))
  }
  traj.value = nt
  iter.value++
  return maxMove
}

let timer: ReturnType<typeof setInterval> | null = null
const playing = ref(false)
function play() {
  if (playing.value) { stop(); return }
  playing.value = true
  timer = setInterval(() => {
    let maxMove = 0
    for (let k = 0; k < 3; k++) maxMove = step()
    if (maxMove < 2e-4 || iter.value > 600) stop()
  }, 30)
}
function stop() {
  if (timer) { clearInterval(timer); timer = null }
  playing.value = false
}
function reset() {
  stop()
  traj.value = initTraj()
  iter.value = 0
}
onUnmounted(stop)

// Clic : déplacer l'obstacle principal (glisser la géométrie du problème)
const svgRef = ref<SVGSVGElement | null>(null)
function handleClick(e: MouseEvent) {
  if (!svgRef.value) return
  const r = svgRef.value.getBoundingClientRect()
  const sx = (e.clientX - r.left) * (560 / r.width)
  const sy = (e.clientY - r.top) * (215 / r.height)
  const x = (sx - PXO) / S, y = WORLD_H - (sy - PYO) / S
  if (x < 0.5 || x > WORLD_W - 0.5 || y < 0.5 || y > WORLD_H - 0.5) return
  obstacles.value = [{ ...obstacles.value[0], x, y }, obstacles.value[1]]
  reset()
}

// ── Rendu ─────────────────────────────────────────────────────────
const S = 25.5, PXO = 14, PYO = 8
const px = (x: number) => PXO + x * S
const py = (y: number) => PYO + (WORLD_H - y) * S

// Heatmap du champ de distance (sous-échantillonné ×2 pour le DOM)
const heatCells = computed(() => {
  const cells: { x: number; y: number; fill: string }[] = []
  const d = distField.value
  for (let j = 0; j < NY; j += 2) for (let i = 0; i < NX; i += 2) {
    const v = Math.max(0, Math.min(d[j][i] / 2.5, 1))
    // proche de l'obstacle = rougeâtre, loin = blanc
    const R = 255, G = Math.round(235 + v * 20), B = Math.round(230 + v * 25)
    cells.push({
      x: px(i * CELL), y: py((j + 2) * CELL),
      fill: v >= 1 ? '#ffffff' : `rgb(${R},${Math.min(G,255)},${Math.min(B,255)})`,
    })
  }
  return cells
})
const heatW = 2 * CELL * S + 0.5

const trajPts = computed(() => traj.value.map(q => `${px(q.x).toFixed(1)},${py(q.y).toFixed(1)}`).join(' '))
const initPts = computed(() => `${px(START.x)},${py(START.y)} ${px(GOAL.x)},${py(GOAL.y)}`)
const collisionFree = computed(() => traj.value.every(q => distAt(q.x, q.y) > 0.02))
</script>

<template>
  <div class="to-wrap">
    <svg ref="svgRef" viewBox="0 0 560 215" class="to-svg" @click="handleClick" style="cursor:crosshair">
      <!-- Panneau scène -->
      <rect x="0" y="0" width="286" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- heatmap ESDF -->
      <rect v-for="(c, i) in heatCells" :key="i" :x="c.x" :y="c.y" :width="heatW" :height="heatW" :fill="c.fill"/>

      <!-- Marge géométrique sur les cercles ; le champ discret en est une approximation. -->
      <circle v-for="(o, i) in obstacles" :key="`e${i}`"
        :cx="px(o.x)" :cy="py(o.y)" :r="(o.r + eps) * S"
        fill="none" stroke="#F15A22" stroke-width="1" stroke-dasharray="4,3" style="opacity:0.7"/>

      <!-- obstacles -->
      <circle v-for="(o, i) in obstacles" :key="`o${i}`"
        :cx="px(o.x)" :cy="py(o.y)" :r="o.r * S"
        fill="#CF1C24" stroke="#991b1b" stroke-width="1.5" style="opacity:0.85"/>

      <!-- trajectoire initiale -->
      <polyline :points="initPts" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="5,4"/>

      <!-- trajectoire courante -->
      <polyline :points="trajPts" fill="none"
        :stroke="collisionFree ? '#25B34B' : '#F15A22'" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>
      <circle v-for="(q, i) in traj" :key="`q${i}`"
        :cx="px(q.x)" :cy="py(q.y)" r="2"
        :fill="distAt(q.x, q.y) < eps ? '#CF1C24' : (collisionFree ? '#15803d' : '#c2410c')"/>

      <!-- extrémités -->
      <circle :cx="px(START.x)" :cy="py(START.y)" r="5.5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <circle :cx="px(GOAL.x)" :cy="py(GOAL.y)" r="5.5" fill="#25B34B" stroke="white" stroke-width="1.5"/>

      <text x="143" y="12" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Descente de gradient sur l'ESDF — itération {{ iter }}
      </text>
      <text x="143" y="206" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">
        ← clic : déplacer l'obstacle · pointillé : marge géométrique ε
      </text>

      <!-- Panneau droit -->
      <rect x="293" y="0" width="265" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="425" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        J(q) = lissage + collision
      </text>

      <rect x="300" y="20" width="251" height="56" fill="#fff7ed" rx="4" stroke="#fed7aa"/>
      <text x="425" y="33" text-anchor="middle" style="font-size:7.5px;fill:#c2410c;font-weight:700;font-family:monospace">
        J = λ_s Σ‖qᵢ₊₁−qᵢ‖² + λ_c Σ c(d(qᵢ))
      </text>
      <text x="425" y="46" text-anchor="middle" style="font-size:7.5px;fill:#475569;font-family:monospace">
        c(d) = (ε−d)² si d&lt;ε, 0 sinon
      </text>
      <text x="425" y="59" text-anchor="middle" style="font-size:7.5px;fill:#475569;font-family:monospace">
        ∇c = −2(ε−d)·∇d
      </text>
      <text x="425" y="71" text-anchor="middle" style="font-size:6.8px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        ∇d (chain rule) : c'est LUI qui exige un ESDF, pas une carte binaire
      </text>

      <!-- Coûts courants -->
      <rect x="300" y="84" width="251" height="58" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="308" y="98" style="font-size:7.5px;fill:#1e40af;font-weight:700;font-family:sans-serif">Coûts (itération {{ iter }})</text>
      <text x="308" y="112" style="font-size:7.5px;fill:#334155;font-family:monospace">
        lissage   : {{ costs.smooth.toFixed(3) }}
      </text>
      <text x="308" y="124" style="font-size:7.5px;fill:#334155;font-family:monospace">
        collision : {{ costs.coll.toFixed(3) }}
      </text>
      <text data-total-cost x="308" y="136" style="font-size:7.5px;font-weight:700;font-family:monospace"
        :fill="collisionFree ? '#15803d' : '#CF1C24'">
        total     : {{ (costs.smooth + costs.coll).toFixed(3) }} {{ collisionFree && costs.coll < 1e-6 ? '✓ sans collision' : '' }}
      </text>

      <rect x="300" y="150" width="251" height="54" fill="#f0fdf4" rx="4" stroke="#86efac"/>
      <text x="425" y="164" text-anchor="middle" style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">
        ESDF → optimisation de trajectoire
      </text>
      <text x="308" y="177" style="font-size:7px;fill:#475569;font-family:sans-serif">EDT exacte sur grille, puis interpolation bilinéaire.</text>
      <text x="308" y="188" style="font-size:7px;fill:#475569;font-family:sans-serif">Chaque waypoint dans la marge ε est poussé le long de</text>
      <text x="308" y="199" style="font-size:7px;fill:#475569;font-family:sans-serif">+∇d ; le terme de lissage retend la corde. Équilibre = chemin.</text>
    </svg>

    <div class="to-controls">
      <button class="to-btn-main" @click="play">{{ playing ? '⏸ Pause' : '▶ Optimiser' }}</button>
      <button class="to-btn" @click="step()" :disabled="playing">+1 itér.</button>
      <label class="to-sl">
        λ_c
        <strong>{{ lambdaC }}</strong>
        <input type="range" v-model.number="lambdaC" min="1" max="12" step="1"/>
      </label>
      <label class="to-sl">
        ε marge
        <strong>{{ eps.toFixed(1) }}</strong>
        <input type="range" v-model.number="eps" min="0.2" max="1.4" step="0.1"/>
      </label>
      <button class="to-btn" @click="reset">↺</button>
    </div>
  </div>
</template>

<style scoped>
.to-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.to-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.to-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.to-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.to-sl strong { color: #CF1C24; min-width: 24px; display: inline-block; }
.to-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.to-btn-main {
  padding: 3px 14px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.to-btn-main:hover { background: #CF1C24; color: white; }
.to-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.to-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
