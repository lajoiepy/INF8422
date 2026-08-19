<script setup lang="ts">
import { ref, computed } from 'vue'

interface Point { id: string; x: number; y: number }
interface Bounds { xMin: number; xMax: number; yMin: number; yMax: number }

// ── SVG layout (same as KdTreeAnimation) ──────────────────
const VW = 500, VH = 278
const OX = 55, OY = 15, PW = 400, PH = 240
const DX = 40, DY = 24

function sx(dx: number) { return OX + dx * DX }
function sy(dy: number) { return OY + (10 - dy) * DY }

// ── 15 points (same as KdTreeAnimation) ───────────────────
const POINTS: Point[] = [
  { id: 'A', x: 1.5, y: 8.3 },
  { id: 'B', x: 3.5, y: 9.0 },
  { id: 'C', x: 6.0, y: 8.0 },
  { id: 'D', x: 2.0, y: 7.0 },
  { id: 'E', x: 4.5, y: 6.5 },
  { id: 'F', x: 7.5, y: 7.5 },
  { id: 'G', x: 1.0, y: 5.5 },
  { id: 'H', x: 5.0, y: 5.0 },
  { id: 'I', x: 8.5, y: 5.5 },
  { id: 'J', x: 2.5, y: 3.0 },
  { id: 'K', x: 5.5, y: 2.5 },
  { id: 'L', x: 8.0, y: 3.5 },
  { id: 'M', x: 0.5, y: 9.5 },
  { id: 'N', x: 4.0, y: 8.7 },
  { id: 'O', x: 7.0, y: 2.0 },
]

// ── KD-tree split lines (BFS — for visualization) ─────────
interface KDSplit {
  point: Point; axis: 'x' | 'y'; splitValue: number
  depth: number; bounds: Bounds
}
function buildSplits(pts: Point[]): KDSplit[] {
  const result: KDSplit[] = []
  const q: Array<{ pts: Point[]; depth: number; bounds: Bounds }> = [
    { pts, depth: 0, bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 } },
  ]
  while (q.length) {
    const { pts: p, depth, bounds } = q.shift()!
    if (!p.length) continue
    const axis = (depth % 2 === 0 ? 'x' : 'y') as 'x' | 'y'
    const sorted = [...p].sort((a, b) => a[axis] - b[axis])
    const mi = Math.floor(sorted.length / 2)
    const med = sorted[mi]
    const left = sorted.slice(0, mi), right = sorted.slice(mi + 1)
    if (left.length || right.length) {
      result.push({ point: med, axis, splitValue: med[axis], depth, bounds })
      const lb: Bounds = axis === 'x' ? { ...bounds, xMax: med.x } : { ...bounds, yMax: med.y }
      const rb: Bounds = axis === 'x' ? { ...bounds, xMin: med.x } : { ...bounds, yMin: med.y }
      if (left.length)  q.push({ pts: left,  depth: depth + 1, bounds: lb })
      if (right.length) q.push({ pts: right, depth: depth + 1, bounds: rb })
    }
  }
  return result
}
const SPLITS = buildSplits(POINTS)

// ── KD-tree DFS structure (for search) ────────────────────
interface TreeNode {
  point: Point; axis: 'x' | 'y'; splitValue: number
  left: TreeNode | null; right: TreeNode | null
}
function buildTree(pts: Point[], depth = 0): TreeNode | null {
  if (!pts.length) return null
  const axis = (depth % 2 === 0 ? 'x' : 'y') as 'x' | 'y'
  const sorted = [...pts].sort((a, b) => a[axis] - b[axis])
  const mi = Math.floor(sorted.length / 2)
  return {
    point: sorted[mi], axis, splitValue: sorted[mi][axis],
    left:  buildTree(sorted.slice(0, mi),      depth + 1),
    right: buildTree(sorted.slice(mi + 1), depth + 1),
  }
}
const ROOT = buildTree(POINTS)!

// ── NN search — returns visited set + nearest ──────────────
function nnSearch(query: { x: number; y: number }) {
  const visited: string[] = []
  let bestDist = Infinity, bestId: string | null = null

  function search(node: TreeNode | null) {
    if (!node) return
    visited.push(node.point.id)
    const d = Math.hypot(node.point.x - query.x, node.point.y - query.y)
    if (d < bestDist) { bestDist = d; bestId = node.point.id }
    const goLeft = query[node.axis] <= node.splitValue
    search(goLeft ? node.left : node.right)
    if (Math.abs(query[node.axis] - node.splitValue) < bestDist)
      search(goLeft ? node.right : node.left)
  }
  search(ROOT)
  return { visited: new Set(visited), nearestId: bestId, nearestDist: bestDist }
}

// ── Depth colors (same as KdTreeAnimation) ─────────────────
const COLORS = ['#CF1C24', '#F15A22', '#25B34B', '#9b59b6', '#e67e22']
function depthColor(d: number) { return COLORS[Math.min(d, COLORS.length - 1)] }

// ── Query point state ──────────────────────────────────────
const queryPoint = ref<{ x: number; y: number } | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)

function svgToData(e: MouseEvent): { x: number; y: number } | null {
  const el = svgRef.value
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const svgX = (e.clientX - rect.left) / rect.width  * VW
  const svgY = (e.clientY - rect.top)  / rect.height * VH
  const dx = (svgX - OX) / DX
  const dy = 10 - (svgY - OY) / DY
  if (dx < 0 || dx > 10 || dy < 0 || dy > 10) return null
  return { x: dx, y: dy }
}

function onMouseMove(e: MouseEvent) {
  queryPoint.value = svgToData(e)
}
function onMouseLeave() {
  // keep last position so it stays visible after moving off
}
function onClick(e: MouseEvent) {
  const pt = svgToData(e)
  if (pt) queryPoint.value = pt
}
function reset() { queryPoint.value = null }

// ── Computed search result ─────────────────────────────────
const searchResult = computed(() => {
  if (!queryPoint.value) return null
  return nnSearch(queryPoint.value)
})

const infoLabel = computed(() => {
  if (!queryPoint.value) return 'Déplacez la souris sur le graphe pour placer un point requête'
  if (!searchResult.value) return ''
  const { nearestId, nearestDist, visited } = searchResult.value
  return `Plus proche voisin : ${nearestId}  |  Distance : ${nearestDist.toFixed(2)}  |  Nœuds visités : ${visited.size}/${POINTS.length}`
})

// ── Search radius in SVG units (for the circle) ───────────
const radiusData = computed(() => searchResult.value?.nearestDist ?? 0)
const radiusSvgX = computed(() => radiusData.value * DX)   // only used for x-axis visual
</script>

<template>
  <div class="ks-wrap">
    <svg
      ref="svgRef"
      :viewBox="`0 0 ${VW} ${VH}`"
      class="ks-svg"
      style="cursor: crosshair"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @click.stop="onClick"
    >
      <!-- Background -->
      <rect width="100%" height="100%" fill="#f8fafc" rx="6" />

      <!-- Grid -->
      <g stroke="#e2e8f0" stroke-width="0.5">
        <line v-for="i in 9" :key="`gx${i}`" :x1="sx(i)" :y1="sy(0)" :x2="sx(i)" :y2="sy(10)" />
        <line v-for="i in 9" :key="`gy${i}`" :x1="sx(0)" :y1="sy(i)" :x2="sx(10)" :y2="sy(i)" />
      </g>

      <!-- Plot border -->
      <rect :x="sx(0)" :y="sy(10)" :width="PW" :height="PH" fill="none" stroke="#cbd5e1" stroke-width="1" />

      <!-- Axes -->
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(10)" :y2="sy(0)" stroke="#64748b" stroke-width="1.5" />
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(0)"  :y2="sy(10)" stroke="#64748b" stroke-width="1.5" />

      <!-- Tick labels X -->
      <g font-size="3" fill="#94a3b8" text-anchor="middle">
        <text v-for="i in [2,4,6,8]" :key="`tx${i}`" :x="sx(i)" :y="sy(0) + 11">{{ i }}</text>
        <text :x="sx(10) + 8" :y="sy(0) + 3" font-size="4" font-weight="bold" fill="#64748b">x</text>
      </g>

      <!-- Tick labels Y -->
      <g font-size="3" fill="#94a3b8" text-anchor="end">
        <text v-for="i in [2,4,6,8]" :key="`ty${i}`" :x="sx(0) - 4" :y="sy(i) + 3">{{ i }}</text>
        <text :x="sx(0) - 2" :y="sy(10) - 6" font-size="4" font-weight="bold" fill="#64748b">y</text>
      </g>

      <!-- KD-tree split lines (all dimmed) -->
      <g v-for="(s, i) in SPLITS" :key="`sp${i}`" opacity="0.25">
        <line v-if="s.axis === 'x'"
          :x1="sx(s.splitValue)" :y1="sy(s.bounds.yMax)"
          :x2="sx(s.splitValue)" :y2="sy(s.bounds.yMin)"
          :stroke="depthColor(s.depth)" stroke-width="1.5" />
        <line v-else
          :x1="sx(s.bounds.xMin)" :y1="sy(s.splitValue)"
          :x2="sx(s.bounds.xMax)" :y2="sy(s.splitValue)"
          :stroke="depthColor(s.depth)" stroke-width="1.5" />
      </g>

      <!-- Search radius circle -->
      <circle
        v-if="queryPoint && searchResult"
        :cx="sx(queryPoint.x)" :cy="sy(queryPoint.y)"
        :r="radiusSvgX"
        fill="none" stroke="#CF1C24" stroke-width="1" stroke-dasharray="5,3" opacity="0.5"
      />

      <!-- Visited node rings (amber) -->
      <g v-if="searchResult">
        <circle
          v-for="p in POINTS"
          v-show="searchResult.visited.has(p.id) && p.id !== searchResult.nearestId"
          :key="`v${p.id}`"
          :cx="sx(p.x)" :cy="sy(p.y)" r="10"
          fill="none" stroke="#F59E0B" stroke-width="2" opacity="0.85"
        />
      </g>

      <!-- Nearest neighbor ring (green) -->
      <circle
        v-if="searchResult?.nearestId"
        :cx="sx(POINTS.find(p => p.id === searchResult.nearestId)!.x)"
        :cy="sy(POINTS.find(p => p.id === searchResult.nearestId)!.y)"
        r="11"
        fill="none" stroke="#25B34B" stroke-width="2.5"
      />

      <!-- Line from query to nearest -->
      <line
        v-if="queryPoint && searchResult?.nearestId"
        :x1="sx(queryPoint.x)" :y1="sy(queryPoint.y)"
        :x2="sx(POINTS.find(p => p.id === searchResult.nearestId)!.x)"
        :y2="sy(POINTS.find(p => p.id === searchResult.nearestId)!.y)"
        stroke="#25B34B" stroke-width="1" stroke-dasharray="4,3" opacity="0.6"
      />

      <!-- Data points -->
      <g v-for="p in POINTS" :key="p.id">
        <circle :cx="sx(p.x)" :cy="sy(p.y)" r="5.5"
          fill="#00BDF2" stroke="white" stroke-width="1.5" />
        <text :x="sx(p.x) + 7" :y="sy(p.y) - 5"
          font-size="4.5" font-weight="700" fill="#1e293b">{{ p.id }}</text>
      </g>

      <!-- Query point (red) -->
      <circle
        v-if="queryPoint"
        :cx="sx(queryPoint.x)" :cy="sy(queryPoint.y)" r="6"
        fill="#CF1C24" stroke="white" stroke-width="2"
      />

      <!-- Info label -->
      <text x="250" :y="VH - 3" text-anchor="middle" font-size="3" font-weight="600" fill="#475569">
        {{ infoLabel }}
      </text>
    </svg>

    <!-- Controls -->
    <div class="ctrl">
      <div class="legend">
        <span class="dot" style="background:#00BDF2" />
        <span>Points</span>
        <span class="dot ml" style="background:#F59E0B" /><span>Nœuds visités</span>
        <span class="dot ml" style="background:#25B34B" /><span>Plus proche voisin</span>
        <span class="dot ml" style="background:#CF1C24" /><span>Point requête</span>
      </div>
      <div class="btns">
        <button class="b-grey" @click="reset" :disabled="!queryPoint">↺ Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ks-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
}
.ks-svg {
  width: 100%;
  flex: 1;
  min-height: 0;
}
.ctrl {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}
.legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  color: #64748b;
}
.dot {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: 6px;
}
.dot:first-child { margin-left: 0; }
.btns { display: flex; gap: 6px; }
button {
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  transition: opacity 0.15s;
}
button:disabled { opacity: 0.35; cursor: default; }
.b-grey { background: #e2e8f0; color: #333; }
</style>
