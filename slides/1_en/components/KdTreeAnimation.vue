<script setup lang="ts">
import { ref, computed } from 'vue'

interface Point { id: string; x: number; y: number }
interface Bounds { xMin: number; xMax: number; yMin: number; yMax: number }
interface KDNode {
  point: Point
  axis: 'x' | 'y'
  splitValue: number
  depth: number
  bounds: Bounds
}

// ── SVG layout ─────────────────────────────────────────────
const VW = 500, VH = 278
const OX = 55, OY = 15, PW = 400, PH = 240  // plot area
const DX = 40, DY = 24                        // scale factors (data → SVG)

function sx(dx: number) { return OX + dx * DX }
function sy(dy: number) { return OY + (10 - dy) * DY }

// ── 15 labeled points ──────────────────────────────────────
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

// ── KD-tree BFS build ──────────────────────────────────────
function buildKDTree(initialPoints: Point[]): KDNode[] {
  const result: KDNode[] = []
  const queue: Array<{ pts: Point[]; depth: number; bounds: Bounds }> = [
    { pts: initialPoints, depth: 0, bounds: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 } },
  ]
  while (queue.length > 0) {
    const { pts, depth, bounds } = queue.shift()!
    if (pts.length === 0) continue
    const axis = depth % 2 === 0 ? 'x' : 'y'
    const sorted = [...pts].sort((a, b) => a[axis] - b[axis])
    const mi = Math.floor(sorted.length / 2)
    const median = sorted[mi]
    const left = sorted.slice(0, mi)
    const right = sorted.slice(mi + 1)
    // Only create a split entry if this node has children
    if (left.length > 0 || right.length > 0) {
      result.push({ point: median, axis, splitValue: median[axis], depth, bounds })
      const lb: Bounds = axis === 'x'
        ? { ...bounds, xMax: median.x }
        : { ...bounds, yMax: median.y }
      const rb: Bounds = axis === 'x'
        ? { ...bounds, xMin: median.x }
        : { ...bounds, yMin: median.y }
      if (left.length > 0)  queue.push({ pts: left,  depth: depth + 1, bounds: lb })
      if (right.length > 0) queue.push({ pts: right, depth: depth + 1, bounds: rb })
    }
  }
  return result
}

const SPLITS = buildKDTree(POINTS)
const TOTAL  = SPLITS.length

// ── Depth colors ───────────────────────────────────────────
const COLORS = ['#CF1C24', '#F15A22', '#25B34B', '#9b59b6', '#e67e22']
function depthColor(d: number) { return COLORS[Math.min(d, COLORS.length - 1)] }

// ── State ──────────────────────────────────────────────────
const currentStep = ref(0)   // 0 = none shown; k = first k splits visible

// ── Auto-play ──────────────────────────────────────────────
const playing   = ref(false)
let   autoTimer: ReturnType<typeof setTimeout> | null = null

function clearAuto() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
}

function togglePlay() {
  if (playing.value) { clearAuto(); playing.value = false; return }
  if (currentStep.value >= TOTAL) return
  playing.value = true
  function tick() {
    if (currentStep.value >= TOTAL) { playing.value = false; return }
    currentStep.value++
    autoTimer = setTimeout(tick, 1200)
  }
  tick()
}

function next()  { clearAuto(); playing.value = false; if (currentStep.value < TOTAL) currentStep.value++ }
function prev()  { clearAuto(); playing.value = false; if (currentStep.value > 0) currentStep.value-- }
function reset() { clearAuto(); playing.value = false; currentStep.value = 0 }

// ── Current split info label ───────────────────────────────
const infoLabel = computed(() => {
  if (currentStep.value === 0) return 'Appuyez sur « Suivant » pour démarrer'
  if (currentStep.value > TOTAL) return ''
  const s = SPLITS[currentStep.value - 1]
  return `Étape ${currentStep.value}/${TOTAL} — Axe ${s.axis.toUpperCase()}, Profondeur ${s.depth} (nœud : ${s.point.id})`
})

const highlightedPointId = computed(() =>
  currentStep.value > 0 ? SPLITS[currentStep.value - 1].point.id : null
)
</script>

<template>
  <div class="kd-wrap">
    <svg :viewBox="`0 0 ${VW} ${VH}`" class="kd-svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#f8fafc" rx="6" />

      <!-- Grid (faint) -->
      <g stroke="#e2e8f0" stroke-width="0.5">
        <line v-for="i in 9" :key="`gx${i}`"
          :x1="sx(i)" :y1="sy(0)" :x2="sx(i)" :y2="sy(10)" />
        <line v-for="i in 9" :key="`gy${i}`"
          :x1="sx(0)" :y1="sy(i)" :x2="sx(10)" :y2="sy(i)" />
      </g>

      <!-- Plot border -->
      <rect :x="sx(0)" :y="sy(10)" :width="PW" :height="PH"
        fill="none" stroke="#cbd5e1" stroke-width="1" />

      <!-- Axes -->
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(10)" :y2="sy(0)" stroke="#64748b" stroke-width="1.5" />
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(0)"  :y2="sy(10)" stroke="#64748b" stroke-width="1.5" />

      <!-- Tick labels X -->
      <g font-size="3" fill="#94a3b8" text-anchor="middle">
        <text v-for="i in [2,4,6,8]" :key="`tx${i}`"
          :x="sx(i)" :y="sy(0) + 11">{{ i }}</text>
        <text :x="sx(10) + 8" :y="sy(0) + 3" font-size="4" font-weight="bold" fill="#64748b">x</text>
      </g>

      <!-- Tick labels Y -->
      <g font-size="3" fill="#94a3b8" text-anchor="end">
        <text v-for="i in [2,4,6,8]" :key="`ty${i}`"
          :x="sx(0) - 4" :y="sy(i) + 3">{{ i }}</text>
        <text :x="sx(0) - 2" :y="sy(10) - 6" font-size="4" font-weight="bold" fill="#64748b">y</text>
      </g>

      <!-- Past split lines (dimmed) -->
      <g v-for="(s, i) in SPLITS" :key="`s${i}`">
        <template v-if="i < currentStep - 1">
          <line v-if="s.axis === 'x'"
            :x1="sx(s.splitValue)" :y1="sy(s.bounds.yMax)"
            :x2="sx(s.splitValue)" :y2="sy(s.bounds.yMin)"
            :stroke="depthColor(s.depth)" stroke-width="1.5" opacity="0.3" />
          <line v-else
            :x1="sx(s.bounds.xMin)" :y1="sy(s.splitValue)"
            :x2="sx(s.bounds.xMax)" :y2="sy(s.splitValue)"
            :stroke="depthColor(s.depth)" stroke-width="1.5" opacity="0.3" />
        </template>
      </g>

      <!-- Current split line (highlighted) -->
      <template v-if="currentStep > 0 && currentStep <= TOTAL">
        <g :key="`cur${currentStep}`">
          <line v-if="SPLITS[currentStep-1].axis === 'x'"
            :x1="sx(SPLITS[currentStep-1].splitValue)" :y1="sy(SPLITS[currentStep-1].bounds.yMax)"
            :x2="sx(SPLITS[currentStep-1].splitValue)" :y2="sy(SPLITS[currentStep-1].bounds.yMin)"
            :stroke="depthColor(SPLITS[currentStep-1].depth)"
            stroke-width="2.5" stroke-dasharray="6,3" />
          <line v-else
            :x1="sx(SPLITS[currentStep-1].bounds.xMin)" :y1="sy(SPLITS[currentStep-1].splitValue)"
            :x2="sx(SPLITS[currentStep-1].bounds.xMax)" :y2="sy(SPLITS[currentStep-1].splitValue)"
            :stroke="depthColor(SPLITS[currentStep-1].depth)"
            stroke-width="2.5" stroke-dasharray="6,3" />
        </g>
      </template>

      <!-- Points -->
      <g v-for="p in POINTS" :key="p.id">
        <!-- Highlight ring for current median -->
        <circle v-if="p.id === highlightedPointId"
          :cx="sx(p.x)" :cy="sy(p.y)" r="10"
          :fill="depthColor(SPLITS[currentStep-1]?.depth ?? 0)"
          opacity="0.25" />
        <circle :cx="sx(p.x)" :cy="sy(p.y)" r="5.5"
          :fill="p.id === highlightedPointId ? depthColor(SPLITS[currentStep-1]?.depth ?? 0) : '#00BDF2'"
          stroke="white" stroke-width="1.5" />
        <!-- Label offset to avoid overlap with point -->
        <text
          :x="sx(p.x) + 7" :y="sy(p.y) - 5"
          font-size="4.5" font-weight="700"
          :fill="p.id === highlightedPointId ? depthColor(SPLITS[currentStep-1]?.depth ?? 0) : '#1e293b'">
          {{ p.id }}
        </text>
      </g>

      <!-- Info label -->
      <text x="250" :y="VH - 3" text-anchor="middle" font-size="3" font-weight="600" fill="#475569">
        {{ infoLabel }}
      </text>
    </svg>

    <!-- Controls -->
    <div class="ctrl">
      <div class="legend">
        <template v-for="(col, i) in COLORS" :key="i">
          <span class="dot" :style="{ background: col }" />
          <span>Prof. {{ i }}</span>
        </template>
      </div>
      <div class="btns">
        <button class="b-grey" @click="prev" :disabled="currentStep === 0 || playing">◀ Précédent</button>
        <button class="b-red"  @click="next" :disabled="currentStep >= TOTAL || playing">Suivant ▶</button>
        <button class="b-blue" @click="togglePlay" :disabled="currentStep >= TOTAL && !playing">
          {{ playing ? '⏸ Pause' : '⏩ Auto' }}
        </button>
        <button class="b-grey" @click="reset">↺ Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kd-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
}
.kd-svg {
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
  width: 9px;
  height: 9px;
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
.b-red  { background: #CF1C24; color: #fff; }
.b-blue { background: #00BDF2; color: #fff; }
.b-grey { background: #e2e8f0; color: #333; }
</style>
