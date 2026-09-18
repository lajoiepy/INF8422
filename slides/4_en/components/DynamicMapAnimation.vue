<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { onSlideEnter, onSlideLeave } from '@slidev/client'
// Adapté du composant MRSS : diapos/summer-school/components/DynamicMapAnimation.vue

// ── World: 13 × 8 m room, 0.5 m grid (26 × 16 cells) ──────────
// Walls: right (x=12), top (y=8), bottom (y=0). Pedestrian: disk r=0.35
// crossing vertically at x=7. Robot fixed at (1, 4).
const NX = 26, NY = 16, CELL = 0.5
const ROBOT = { x: 1, y: 4 }
const PED_X = 7, PED_R = 0.35
const N_RAYS = 41, FOV = 130 * Math.PI / 180

// L_FREE ≪ L_OCC: "free" evidence is weak (a ray can graze
// a cell), standard OctoMap-style setting. It is this imbalance that
// makes ghosts heal slowly in naive mode.
const L_OCC = 0.9, L_FREE = 0.1, L_MAX = 4
// Violation-based purge: 3 confirmations required, and we ignore the 2
// cells just before the hit (grazing rays near walls,
// the discretization issue that makes ERASOR conservative).
const N_VIOL = 3, ENDPOINT_GUARD = 2
const mode = ref<'naif' | 'masque' | 'violation'>('naif')
const pedSpeed = ref(0.15) // m / step

const grid = ref<Float32Array>(new Float32Array(NX * NY))
const dynFlag = ref<Float32Array>(new Float32Array(NX * NY)) // decays, for display
let violCnt = new Float32Array(NX * NY)
const pedY = ref(0.8)
const step = ref(0)

function cellIdx(cx: number, cy: number): number { return cy * NX + cx }

// ── Ray casting: walls (segments) + pedestrian (circle) ───────
function castRay(ang: number, py: number): { dist: number; hitPed: boolean } {
  const c = Math.cos(ang), s = Math.sin(ang)
  let best = Infinity, hitPed = false
  // right wall x = 12
  if (c > 1e-9) {
    const t = (12 - ROBOT.x) / c
    const y = ROBOT.y + t * s
    if (y >= 0 && y <= 8 && t < best) best = t
  }
  // top / bottom walls
  if (s > 1e-9) {
    const t = (8 - ROBOT.y) / s
    const x = ROBOT.x + t * c
    if (x >= 0 && x <= 12 && t < best) best = t
  }
  if (s < -1e-9) {
    const t = (0 - ROBOT.y) / s
    const x = ROBOT.x + t * c
    if (x >= 0 && x <= 12 && t < best) best = t
  }
  // pedestrian: circle (PED_X, py)
  const ox = ROBOT.x - PED_X, oy = ROBOT.y - py
  const b = ox * c + oy * s
  const disc = b * b - (ox * ox + oy * oy - PED_R * PED_R)
  if (disc >= 0) {
    const t = -b - Math.sqrt(disc)
    if (t > 0 && t < best) { best = t; hitPed = true }
  }
  return { dist: best, hitPed }
}

// ── Amanatides-Woo DDA: cells traversed up to distance d
function traverse(ang: number, dist: number): number[] {
  const c = Math.cos(ang), s = Math.sin(ang)
  const cells: number[] = []
  let cx = Math.floor(ROBOT.x / CELL), cy = Math.floor(ROBOT.y / CELL)
  const stepX = c > 0 ? 1 : -1, stepY = s > 0 ? 1 : -1
  const tDx = Math.abs(CELL / (c || 1e-12)), tDy = Math.abs(CELL / (s || 1e-12))
  let tMx = c > 0 ? ((cx + 1) * CELL - ROBOT.x) / c : (cx * CELL - ROBOT.x) / c
  let tMy = s > 0 ? ((cy + 1) * CELL - ROBOT.y) / s : (cy * CELL - ROBOT.y) / s
  if (!isFinite(tMx)) tMx = Infinity
  if (!isFinite(tMy)) tMy = Infinity
  let t = 0
  while (t < dist) {
    if (cx >= 0 && cx < NX && cy >= 0 && cy < NY) cells.push(cellIdx(cx, cy))
    if (tMx < tMy) { t = tMx; tMx += tDx; cx += stepX } else { t = tMy; tMy += tDy; cy += stepY }
    if (cx < -1 || cx > NX || cy < -1 || cy > NY) break
  }
  return cells
}

// ── One simulation step: full scan + integration ──────────────
function stepOnce() {
  const g = grid.value, df = dynFlag.value
  for (let i = 0; i < df.length; i++) df[i] = Math.max(0, df[i] - 0.06)
  for (let r = 0; r < N_RAYS; r++) {
    const ang = -FOV / 2 + FOV * r / (N_RAYS - 1)
    const { dist, hitPed } = castRay(ang, pedY.value)
    const cells = traverse(ang, dist)
    if (cells.length === 0) continue
    const hitCell = cells[cells.length - 1]
    // free cells traversed
    for (let k = 0; k < cells.length - 1; k++) {
      const i = cells[k]
      // Free-space violation: an "occupied" cell traversed by the ray,
      // far from the hit (guard against grazing rays) → counter; purge after
      // N_VIOL confirmations (ERASOR-style, conservative).
      if (mode.value === 'violation' && g[i] > 1.2 && k < cells.length - 1 - ENDPOINT_GUARD) {
        violCnt[i]++
        if (violCnt[i] >= N_VIOL) {
          g[i] = -0.5
          df[i] = 1
          violCnt[i] = 0
        }
      } else {
        g[i] = Math.max(-L_MAX, g[i] - L_FREE)
      }
    }
    // hit cell
    if (hitPed && mode.value === 'masque') {
      // perfect mask: we know the hit is dynamic → no
      // occupancy update
    } else {
      g[hitCell] = Math.min(L_MAX, g[hitCell] + L_OCC)
      violCnt[hitCell] = 0 // a real hit cancels the suspicion
    }
  }
  // pedestrian steps (back and forth)
  pedY.value += pedSpeed.value * pedDir
  if (pedY.value > 7.2) { pedY.value = 7.2; pedDir = -1 }
  if (pedY.value < 0.8) { pedY.value = 0.8; pedDir = 1 }
  step.value++
  grid.value = g.slice() as Float32Array
  dynFlag.value = df.slice() as Float32Array
}
let pedDir = 1

// ── Lecture ───────────────────────────────────────────────────
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function play() { if (!playing.value) { playing.value = true; timer = setInterval(stepOnce, 110) } }
function stop() { playing.value = false; if (timer) { clearInterval(timer); timer = null } }
function reset() {
  stop(); grid.value = new Float32Array(NX * NY); dynFlag.value = new Float32Array(NX * NY)
  violCnt = new Float32Array(NX * NY)
  pedY.value = 0.8; pedDir = 1; step.value = 0
}
function example() { reset(); for (let i = 0; i < 30; i++) stepOnce() }
watch(mode, example)
onSlideEnter(example)
onSlideLeave(stop)
example()
onUnmounted(stop)

// ── Drawing ───────────────────────────────────────────────────
const PX0 = 55, PY1 = 12
const SCALE = 23 // px per metre, the 12×8 m room fills the panel
function sx(x: number): number { return PX0 + x * SCALE }
function sy(y: number): number { return PY1 + (8 - y) * SCALE }

const cellsRender = computed(() => {
  const out: { x: number; y: number; p: number; flag: number; ghost: boolean }[] = []
  const g = grid.value, df = dynFlag.value
  for (let cy = 0; cy < NY; cy++) for (let cx = 0; cx < NX; cx++) {
    const i = cellIdx(cx, cy)
    if (Math.abs(g[i]) < 0.01 && df[i] <= 0) continue
    out.push({ x: sx(cx * CELL), y: sy((cy + 1) * CELL), p: 1 / (1 + Math.exp(-g[i])), flag: df[i], ghost: isGhost(cx, cy) })
  }
  return out
})
function cellFill(p: number): string {
  // p=0.5 → transparent; p→1 black; p→0 bluish white
  if (p >= 0.5) { const v = Math.round(235 - (p - 0.5) * 2 * 200); return `rgb(${v},${v},${v})` }
  const v = Math.round(235 + (0.5 - p) * 2 * 20)
  return `rgb(${Math.min(v, 255)},${Math.min(v, 255)},255)`
}

// Ghost = occupied estimate away from walls and current pedestrian.
function isGhost(cx: number, cy: number): boolean {
  if (cy < 1 || cy >= NY - 1 || cx >= 23) return false
  return grid.value[cellIdx(cx, cy)] > 1.2 && Math.hypot((cx + .5) * CELL - PED_X, (cy + .5) * CELL - pedY.value) > PED_R + .8
}
const ghostCells = computed(() => {
  let n = 0
  for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (isGhost(x, y)) n++
  return n
})
</script>

<template>
  <div class="dm-wrap" @click.stop>
    <svg viewBox="0 0 558 215" class="dm-svg" aria-label="Un piéton mobile laisse des fantômes dans une carte d'occupation">
      <rect x="8" y="8" width="374" height="199" fill="#f1f5f9" rx="5" stroke="#CBD5E1"/>
      <rect v-for="(c, i) in cellsRender" :key="i" :x="c.x" :y="c.y"
        :width="CELL * SCALE - 0.4" :height="CELL * SCALE - 0.4"
        :fill="cellFill(c.p)" :stroke="c.flag > 0 ? '#F15A22' : c.ghost ? '#CF1C24' : 'none'"
        :stroke-width="c.flag > 0 || c.ghost ? 1.2 : 0" />
      <rect :x="sx(0)" :y="sy(8)" :width="12 * SCALE" :height="8 * SCALE" fill="none" stroke="#94a3b8" stroke-width="0.8"/>
      <circle :cx="sx(ROBOT.x)" :cy="sy(ROBOT.y)" r="6" fill="#00BDF2" stroke="#0284c7"/>
      <text :x="sx(ROBOT.x)" :y="sy(ROBOT.y)-10" text-anchor="middle" class="label">robot</text>
      <circle :cx="sx(PED_X)" :cy="sy(pedY)" r="5" fill="#25B34B" stroke="white"/>
      <text :x="sx(PED_X)+9" :y="sy(pedY)+3" class="label">piéton actuel</text>
      <g class="legend">
        <rect x="18" y="196" width="8" height="7" fill="#333"/><text x="30" y="202">occupé</text>
        <rect x="75" y="196" width="8" height="7" fill="#f5f5ff" stroke="#cbd5e1"/><text x="87" y="202">libre</text>
        <rect x="119" y="196" width="8" height="7" fill="#f1f5f9" stroke="#cbd5e1"/><text x="131" y="202">inconnu</text>
        <rect x="183" y="196" width="8" height="7" fill="none" stroke="#CF1C24"/><text x="195" y="202">fantôme</text>
        <rect x="254" y="196" width="8" height="7" fill="none" stroke="#F15A22"/><text x="266" y="202">trace corrigée</text>
      </g>
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="30" text-anchor="middle" class="panel-title">{{ mode === 'naif' ? 'Intégration naïve' : mode === 'masque' ? 'Masque parfait' : 'Correction' }}</text>
      <text x="470" y="57" text-anchor="middle" class="label">Observations : {{ step }}</text>
      <text x="470" y="90" text-anchor="middle" class="count" :fill="ghostCells > 0 ? '#CF1C24' : '#15803d'" data-ghost-count>{{ ghostCells }}</text>
      <text x="470" y="105" text-anchor="middle" class="label">cellules fantômes</text>
      <text x="470" y="135" text-anchor="middle" class="panel-text">{{ mode === 'naif' ? 'Les anciennes positions' : mode === 'masque' ? 'Les mesures du piéton' : 'Des observations libres' }}</text>
      <text x="470" y="149" text-anchor="middle" class="panel-text">{{ mode === 'naif' ? 'restent dans la carte.' : mode === 'masque' ? 'sont exclues de la fusion.' : 'contredisent la carte.' }}</text>
      <text x="470" y="180" text-anchor="middle" class="panel-text">{{ mode === 'naif' ? 'Faux obstacles pour le robot.' : mode === 'masque' ? 'Ici, le masque est idéal.' : 'Les traces sont effacées.' }}</text>
    </svg>
    <div class="dm-controls">
      <button class="dm-btn" @click="playing ? stop() : play()">{{ playing ? '⏸ Pause' : '▶ Lecture' }}</button>
      <button class="dm-btn" @click="stepOnce" :disabled="playing">1 pas</button>
      <button class="dm-btn" @click="reset">↺</button>
      <button class="dm-btn" @click="example">Exemple</button>
      <button class="dm-btn" :class="{ 'dm-on': mode === 'naif' }" @click="mode = 'naif'">Naïve</button>
      <button class="dm-btn" :class="{ 'dm-on': mode === 'masque' }" @click="mode = 'masque'">Masquage</button>
      <button class="dm-btn" :class="{ 'dm-on': mode === 'violation' }" @click="mode = 'violation'">Correction</button>
    </div>
  </div>
</template>

<style scoped>
.dm-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.dm-svg { height: 258px; width: 100%; display: block; }
.label { font: 8px sans-serif; fill: #334155; }
.legend { font: 7px sans-serif; fill: #475569; }
.panel-title { font: 10px sans-serif; font-weight: 700; fill: #334155; }
.panel-text { font: 8px sans-serif; fill: #475569; }
.count { font: bold 22px sans-serif; }
.dm-controls { display: flex; justify-content: center; align-items: center; gap: 9px; flex-wrap: wrap; }
.dm-btn { font-size: 0.72rem; padding: 3px 10px; border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc; color: #334155; cursor: pointer; }
.dm-btn:hover:not(:disabled) { background: #e2e8f0; }
.dm-btn:disabled { opacity: .5; cursor: default; }
.dm-on { background: #CF1C24; color: white; border-color: #CF1C24; }
</style>
