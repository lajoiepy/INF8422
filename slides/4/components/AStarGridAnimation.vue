<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { squaredEDT2D } from '../lib/distance-transform.mjs'

// ── Recherche de chemin sur grille d'occupation ───────────────────
// Dijkstra = A* avec h=0 : explore en cercles concentriques.
// A* : h(n) = distance euclidienne au but (admissible car les coûts
// d'arête 8-connexes {1, √2} ≥ distance euclidienne) → explore un
// "couloir" dirigé vers le but ; même coût optimal, souvent moins de
// nœuds fermés.
// Inflation : EDT euclidienne exacte aux centres des voxels occupés.
// Les cellules à distance <= r_robot sont interdites →
// planifier pour un robot PONCTUEL dans la carte gonflée ≡ planifier
// pour un robot de rayon r dans la carte réelle.
const GR = 10, GC = 13
const SQRT2 = Math.SQRT2

const START = { r: 8, c: 1 }
const GOAL = { r: 1, c: 11 }

const obs = ref<boolean[][]>((() => {
  const g = Array.from({ length: GR }, () => Array(GC).fill(false))
  for (let r = 2; r <= 7; r++) g[r][5] = true            // mur vertical
  for (let c = 5; c <= 9; c++) g[2][c] = true            // mur horizontal
  for (let r = 5; r <= 7; r++) g[r][9] = true
  return g
})())

const algo = ref<'dijkstra' | 'astar'>('astar')
const inflR = ref(0)

// ── Grille et inflation euclidienne ──
const inb = (r: number, c: number) => r >= 0 && r < GR && c >= 0 && c < GC
function neighbors(r: number, c: number) {
  const out: { r: number; c: number; cost: number }[] = []
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue
    const nr = r + dr, nc = c + dc
    if (inb(nr, nc)) out.push({ r: nr, c: nc, cost: (dr !== 0 && dc !== 0) ? SQRT2 : 1 })
  }
  return out
}
const distField = computed(() => squaredEDT2D(obs.value).map(row => row.map(Math.sqrt)))
const blocked = computed(() => {
  const b = Array.from({ length: GR }, () => Array(GC).fill(false))
  for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++)
    b[r][c] = obs.value[r][c] || distField.value[r][c] <= inflR.value + 1e-9
  return b
})

// ── Recherche (Dijkstra / A*) : enregistre l'ordre de fermeture ────
interface SearchResult { closedOrder: [number, number][]; path: [number, number][]; cost: number | null }
function search(useAstar: boolean): SearchResult {
  if (blocked.value[START.r][START.c] || blocked.value[GOAL.r][GOAL.c])
    return { closedOrder: [], path: [], cost: null }
  const key = (r: number, c: number) => r * GC + c
  const g = new Map<number, number>()
  const parent = new Map<number, number>()
  const closed = new Set<number>()
  const closedOrder: [number, number][] = []
  const h = (r: number, c: number) => useAstar ? Math.hypot(r - GOAL.r, c - GOAL.c) : 0
  const open: { r: number; c: number; f: number }[] = [{ r: START.r, c: START.c, f: h(START.r, START.c) }]
  g.set(key(START.r, START.c), 0)
  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const v = open.shift()!
    const vk = key(v.r, v.c)
    if (closed.has(vk)) continue
    closed.add(vk)
    closedOrder.push([v.r, v.c])
    if (v.r === GOAL.r && v.c === GOAL.c) {
      const path: [number, number][] = []
      let k: number | undefined = vk
      while (k !== undefined) { path.unshift([Math.floor(k / GC), k % GC]); k = parent.get(k) }
      return { closedOrder, path, cost: g.get(vk)! }
    }
    for (const n of neighbors(v.r, v.c)) {
      if (blocked.value[n.r][n.c]) continue
      const nk = key(n.r, n.c)
      if (closed.has(nk)) continue
      const ng = g.get(vk)! + n.cost
      if (ng < (g.get(nk) ?? Infinity) - 1e-9) {
        g.set(nk, ng)
        parent.set(nk, vk)
        open.push({ r: n.r, c: n.c, f: ng + h(n.r, n.c) })
      }
    }
  }
  return { closedOrder, path: [], cost: null }
}

// ── Animation ─────────────────────────────────────────────────────
const closedShown = ref<Set<string>>(new Set())
const pathShown = ref<[number, number][]>([])
const lastResult = ref<SearchResult | null>(null)
const stats = ref<{ dijkstra: number | null; astar: number | null }>({ dijkstra: null, astar: null })
let timer: ReturnType<typeof setInterval> | null = null

function run() {
  if (timer) { clearInterval(timer); timer = null }
  closedShown.value = new Set()
  pathShown.value = []
  const res = search(algo.value === 'astar')
  lastResult.value = res
  stats.value = { ...stats.value, [algo.value]: res.closedOrder.length }
  let i = 0
  timer = setInterval(() => {
    const batch = 2
    const s = new Set(closedShown.value)
    for (let b = 0; b < batch && i < res.closedOrder.length; b++, i++)
      s.add(`${res.closedOrder[i][0]}_${res.closedOrder[i][1]}`)
    closedShown.value = s
    if (i >= res.closedOrder.length) {
      clearInterval(timer!); timer = null
      pathShown.value = res.path
    }
  }, 25)
}
function clearRun() {
  if (timer) { clearInterval(timer); timer = null }
  closedShown.value = new Set()
  pathShown.value = []
  lastResult.value = null
}
function toggleCell(r: number, c: number) {
  if ((r === START.r && c === START.c) || (r === GOAL.r && c === GOAL.c)) return
  obs.value[r][c] = !obs.value[r][c]
  obs.value = obs.value.map(row => [...row])
  clearRun()
  stats.value = { dijkstra: null, astar: null }
}
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Rendu ─────────────────────────────────────────────────────────
const CW = 18, CH = 18, OX = 6, OY = 22
function cellFill(r: number, c: number): string {
  if (obs.value[r][c]) return '#CF1C24'
  if (blocked.value[r][c]) return '#fca5a5'          // zone gonflée
  if (closedShown.value.has(`${r}_${c}`)) return '#bfdbfe'
  return '#f1f5f9'
}
const pathPts = computed(() =>
  pathShown.value.map(([r, c]) => `${OX + c * CW + CW / 2},${OY + r * CH + CH / 2}`).join(' '))
</script>

<template>
  <div class="as-wrap">
    <svg viewBox="0 0 560 215" class="as-svg">
      <!-- Panneau grille -->
      <rect x="0" y="0" width="248" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="124" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Grille d'occupation {{ inflR > 0 ? `+ inflation r=${inflR.toFixed(1)}` : '' }}
      </text>

      <g v-for="r in GR" :key="r">
        <rect v-for="c in GC" :key="c"
          :x="OX + (c-1)*CW" :y="OY + (r-1)*CH" :width="CW-1" :height="CH-1"
          :fill="cellFill(r-1, c-1)" stroke="white" stroke-width="0.5" rx="1"
          @click="toggleCell(r-1, c-1)" style="cursor:pointer"/>
      </g>

      <!-- Chemin -->
      <polyline v-if="pathShown.length" :points="pathPts"
        fill="none" stroke="#25B34B" stroke-width="3" stroke-linejoin="round"
        stroke-linecap="round" style="pointer-events:none"/>

      <!-- Départ / But -->
      <circle :cx="OX + START.c*CW + CW/2" :cy="OY + START.r*CH + CH/2" r="6"
        fill="#334155" stroke="white" stroke-width="1.5" style="pointer-events:none"/>
      <text :x="OX + START.c*CW + CW/2" :y="OY + START.r*CH + CH/2 + 2.5" text-anchor="middle"
        style="font-size:6.5px;fill:white;font-weight:700;font-family:sans-serif;pointer-events:none">D</text>
      <circle :cx="OX + GOAL.c*CW + CW/2" :cy="OY + GOAL.r*CH + CH/2" r="6"
        fill="#25B34B" stroke="white" stroke-width="1.5" style="pointer-events:none"/>
      <text :x="OX + GOAL.c*CW + CW/2" :y="OY + GOAL.r*CH + CH/2 + 2.5" text-anchor="middle"
        style="font-size:6.5px;fill:white;font-weight:700;font-family:sans-serif;pointer-events:none">B</text>

      <text x="124" y="208" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">
        ← clic : ajouter / retirer un obstacle
      </text>

      <!-- Panneau droit -->
      <rect x="255" y="0" width="303" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="406" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Dijkstra vs A*
      </text>

      <!-- Légende -->
      <rect x="263" y="20" width="287" height="52" fill="#f1f5f9" rx="4" stroke="#e2e8f0"/>
      <rect x="271" y="27" width="14" height="10" fill="#CF1C24" rx="2"/>
      <text x="290" y="35" style="font-size:7.5px;fill:#CF1C24;font-family:sans-serif">Obstacle</text>
      <rect x="271" y="42" width="14" height="10" fill="#fca5a5" rx="2"/>
      <text x="290" y="50" style="font-size:7.5px;fill:#b91c1c;font-family:sans-serif">Zone gonflée (dist &lt; r_robot)</text>
      <rect x="271" y="57" width="14" height="10" fill="#bfdbfe" rx="2"/>
      <text x="290" y="65" style="font-size:7.5px;fill:#1e40af;font-family:sans-serif">Nœuds fermés (explorés)</text>
      <line x1="410" y1="32" x2="428" y2="32" stroke="#25B34B" stroke-width="3"/>
      <text x="433" y="35" style="font-size:7.5px;fill:#15803d;font-family:sans-serif">Chemin optimal</text>

      <!-- Heuristique -->
      <rect x="263" y="80" width="287" height="42" fill="#fff7ed" rx="4" stroke="#fed7aa"/>
      <text x="406" y="93" text-anchor="middle" style="font-size:8px;fill:#c2410c;font-weight:700;font-family:monospace">
        f(n) = g(n) + h(n)
      </text>
      <text x="406" y="105" text-anchor="middle" style="font-size:7.5px;fill:#475569;font-family:sans-serif">
        Dijkstra : h = 0 · A* : h = ‖n − but‖ (euclidienne, admissible)
      </text>
      <text x="406" y="116" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        h admissible (jamais surestimée) → même chemin optimal
      </text>

      <!-- Stats comparatives -->
      <rect x="263" y="130" width="287" height="46" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="406" y="143" text-anchor="middle" style="font-size:8px;fill:#1e40af;font-weight:700;font-family:sans-serif">
        Nœuds explorés (lancez les deux !)
      </text>
      <text x="330" y="158" text-anchor="middle" style="font-size:8px;fill:#334155;font-family:monospace">
        Dijkstra : {{ stats.dijkstra ?? '—' }}
      </text>
      <text x="480" y="158" text-anchor="middle" style="font-size:8px;fill:#334155;font-family:monospace">
        A* : {{ stats.astar ?? '—' }}
      </text>
      <text v-if="stats.dijkstra !== null && stats.astar !== null" x="406" y="170" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">
        A* explore {{ ((1 - stats.astar / stats.dijkstra) * 100).toFixed(0) }}% de nœuds en moins, même coût de chemin
      </text>

      <rect x="263" y="182" width="287" height="22" fill="#f0fdf4" rx="3" stroke="#86efac"/>
      <text x="406" y="196" text-anchor="middle" style="font-size:7.5px;fill:#15803d;font-family:sans-serif">
        {{ lastResult === null ? 'Cliquez ▶ pour lancer la recherche'
          : lastResult.cost === null ? 'Aucun chemin ! (but isolé par les obstacles/l\'inflation)'
          : `Chemin trouvé : coût = ${lastResult.cost.toFixed(2)} · ${lastResult.closedOrder.length} nœuds fermés` }}
      </text>
    </svg>

    <div class="as-controls">
      <span class="as-mode">
        <button class="as-btn" :class="{ on: algo === 'dijkstra' }" @click="algo = 'dijkstra'; clearRun()">Dijkstra</button>
        <button class="as-btn" :class="{ on: algo === 'astar' }" @click="algo = 'astar'; clearRun()">A*</button>
      </span>
      <label class="as-sl">
        r_robot
        <strong>{{ inflR.toFixed(1) }}</strong>
        <input type="range" v-model.number="inflR" min="0" max="2.5" step="0.5" @change="clearRun()"/>
      </label>
      <button class="as-btn-main" @click="run">▶ Chercher</button>
      <button class="as-btn" @click="clearRun">↺</button>
    </div>
  </div>
</template>

<style scoped>
.as-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.as-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.as-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.as-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.as-sl strong { color: #CF1C24; min-width: 24px; display: inline-block; }
.as-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.as-mode { display: flex; }
.as-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 600;
}
.as-btn:hover { background: #f1f5f9; }
.as-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.as-mode .as-btn:first-child { border-radius: 5px 0 0 5px; }
.as-mode .as-btn:last-child { border-radius: 0 5px 5px 0; border-left: none; }
.as-btn-main {
  padding: 3px 14px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.as-btn-main:hover { background: #CF1C24; color: white; }
</style>
