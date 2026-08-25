<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ── Spinning 2D LiDAR: real ray casting ───────────────────────────
// The beam spins and measures the range to the first obstacle
// (exact ray-segment and ray-circle intersections). Each revolution
// fills a 1×M RANGE IMAGE (bottom strip): this is the ε elevation
// row of a B×M image from a 3D LiDAR.
// If the robot MOVES during the revolution (~100 ms in reality), each ray
// starts from a different origin. Naively rebuilding the cloud
// from the END-of-scan pose → distortion (curved walls).
// Deskewing: reuse the pose p(tᵢ) of EACH ray → an undistorted cloud.
const M = ref(180)          // rays per revolution (azimuth resolution)
const speed = ref(0)        // robot speed (m/s)
const deskew = ref(false)
const running = ref(true)

// ── Scene (10 m × 7 m world) ──────────────────────────────────────
const WORLD_W = 10, WORLD_H = 7
const walls = [
  { x1: 0.4, y1: 0.4, x2: 9.6, y2: 0.4 },
  { x1: 9.6, y1: 0.4, x2: 9.6, y2: 6.6 },
  { x1: 9.6, y1: 6.6, x2: 0.4, y2: 6.6 },
  { x1: 0.4, y1: 6.6, x2: 0.4, y2: 0.4 },
  // caisse rectangulaire
  { x1: 4.2, y1: 4.6, x2: 5.4, y2: 4.6 },
  { x1: 5.4, y1: 4.6, x2: 5.4, y2: 5.8 },
  { x1: 5.4, y1: 5.8, x2: 4.2, y2: 5.8 },
  { x1: 4.2, y1: 5.8, x2: 4.2, y2: 4.6 },
]
const pillar = { x: 6.8, y: 2.2, r: 0.7 }

// Ray (o, d) / segment intersection, returns t or null
function raySeg(ox: number, oy: number, dx: number, dy: number,
  s: { x1: number; y1: number; x2: number; y2: number }): number | null {
  const ex = s.x2 - s.x1, ey = s.y2 - s.y1
  const den = dx * ey - dy * ex
  if (Math.abs(den) < 1e-12) return null
  const t = ((s.x1 - ox) * ey - (s.y1 - oy) * ex) / den
  const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / den
  return (t > 1e-6 && u >= 0 && u <= 1) ? t : null
}
// Ray / circle intersection
function rayCircle(ox: number, oy: number, dx: number, dy: number,
  c: { x: number; y: number; r: number }): number | null {
  const fx = ox - c.x, fy = oy - c.y
  const b = fx * dx + fy * dy
  const disc = b * b - (fx * fx + fy * fy - c.r * c.r)
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t > 1e-6 ? t : null
}
function castRay(ox: number, oy: number, theta: number): number {
  const dx = Math.cos(theta), dy = Math.sin(theta)
  let best = Infinity
  for (const s of walls) { const t = raySeg(ox, oy, dx, dy, s); if (t !== null && t < best) best = t }
  const tc = rayCircle(ox, oy, dx, dy, pillar)
  if (tc !== null && tc < best) best = tc
  return best
}

// ── Scan state ────────────────────────────────────────────────────
const ROBOT_Y = 3.2
const robotX = ref(2.0)
const beamIdx = ref(0)
// One measurement per azimuth: range + origin (robot pose at the ray's timestamp)
const ranges = ref<(number | null)[]>([])
const origins = ref<({ x: number; y: number } | null)[]>([])

function resetScan() {
  ranges.value = Array(M.value).fill(null)
  origins.value = Array(M.value).fill(null)
  beamIdx.value = 0
}
resetScan()

// One revolution ≈ 3 s wall-clock (≈ 100 ms in reality, slowed down).
// What matters for distortion is the distance travelled PER REVOLUTION:
// the robot advances by (speed × T_rev_real=0.1 s) × M rays.
const REV_WALL_MS = 3000
let timer: ReturnType<typeof setInterval> | null = null
let acc = 0
function tick() {
  if (!running.value) return
  const raysPerTick = M.value * 16 / REV_WALL_MS
  acc += raysPerTick
  while (acc >= 1) {
    acc -= 1
    const i = beamIdx.value
    const theta = i / M.value * 2 * Math.PI
    const r = castRay(robotX.value, ROBOT_Y, theta)
    ranges.value[i] = isFinite(r) ? r : null
    origins.value[i] = { x: robotX.value, y: ROBOT_Y }
    beamIdx.value = (i + 1) % M.value
    // the robot advances during the revolution (0.1 s real / M rays)
    robotX.value += speed.value * 0.1 / M.value * 10  // ×10 : distorsion visible
    if (robotX.value > 8.2) { robotX.value = 1.6; resetScan() }
  }
  ranges.value = [...ranges.value]
}
onMounted(() => { timer = setInterval(tick, 16) })
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Panneaux SVG ──────────────────────────────────────────────────
// Left: world scene. Right: reconstructed cloud.
const S = 23  // px per metre
const LX = 14, LY = 6   // left-panel offsets
const RX = 291, RY = 6  // right-panel offsets
const lw = (x: number) => LX + x * S
const lh = (y: number) => LY + (WORLD_H - y) * S
const rw = (x: number) => RX + x * S
const rh = (y: number) => RY + (WORLD_H - y) * S

const beamTheta = computed(() => beamIdx.value / M.value * 2 * Math.PI)
const beamEnd = computed(() => {
  const r = castRay(robotX.value, ROBOT_Y, beamTheta.value)
  const rr = isFinite(r) ? r : 12
  return { x: robotX.value + rr * Math.cos(beamTheta.value), y: ROBOT_Y + rr * Math.sin(beamTheta.value) }
})

// Measured points, drawn in the scene (true positions)
const scenePts = computed(() => {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < M.value; i++) {
    const r = ranges.value[i], o = origins.value[i]
    if (r === null || o === null) continue
    const th = i / M.value * 2 * Math.PI
    pts.push({ x: lw(o.x + r * Math.cos(th)), y: lh(o.y + r * Math.sin(th)) })
  }
  return pts
})

// Reconstructed cloud (right panel):
//  - naive: every measurement from the CURRENT pose (end of scan)
//  - deskew: each measurement from ITS own origin pose p(tᵢ)
const cloudPts = computed(() => {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < M.value; i++) {
    const r = ranges.value[i], o = origins.value[i]
    if (r === null || o === null) continue
    const th = i / M.value * 2 * Math.PI
    const ox = deskew.value ? o.x : robotX.value
    const oy = deskew.value ? o.y : ROBOT_Y
    pts.push({ x: rw(ox + r * Math.cos(th)), y: rh(oy + r * Math.sin(th)) })
  }
  return pts
})

// Range image (1×M strip)
const RMAX = 11
function rangeColor(r: number | null): string {
  if (r === null) return '#1e293b'
  const t = Math.min(r / RMAX, 1)
  // near = warm red → far = cold blue
  const R = Math.round(220 - t * 190), G = Math.round(60 + t * 80), B = Math.round(40 + t * 200)
  return `rgb(${R},${G},${B})`
}
const STRIP_X = 60, STRIP_W = 470, STRIP_Y = 183, STRIP_H = 16
const measuredCount = computed(() => ranges.value.filter(r => r !== null).length)
</script>

<template>
  <div class="ls-wrap">
    <svg viewBox="0 0 560 215" class="ls-svg">
      <!-- ══════ LEFT: scene + beam ══════ -->
      <rect x="0" y="0" width="270" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="135" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Scene: spinning beam (ray casting)
      </text>

      <!-- walls + obstacles -->
      <line v-for="(w, i) in walls" :key="`w${i}`"
        :x1="lw(w.x1)" :y1="lh(w.y1)" :x2="lw(w.x2)" :y2="lh(w.y2)"
        stroke="#475569" stroke-width="2"/>
      <circle :cx="lw(pillar.x)" :cy="lh(pillar.y)" :r="pillar.r * S"
        fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>

      <!-- measured points -->
      <circle v-for="(p, i) in scenePts" :key="`sp${i}`"
        :cx="p.x" :cy="p.y" r="1.6" fill="#CF1C24"/>

      <!-- current beam -->
      <line :x1="lw(robotX)" :y1="lh(ROBOT_Y)" :x2="lw(beamEnd.x)" :y2="lh(beamEnd.y)"
        stroke="#F15A22" stroke-width="1.6" style="opacity:0.9"/>
      <circle :cx="lw(beamEnd.x)" :cy="lh(beamEnd.y)" r="3" fill="#F15A22"/>

      <!-- robot -->
      <circle :cx="lw(robotX)" :cy="lh(ROBOT_Y)" r="5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <line v-if="speed > 0" :x1="lw(robotX) + 7" :y1="lh(ROBOT_Y)" :x2="lw(robotX) + 16" :y2="lh(ROBOT_Y)"
        stroke="#334155" stroke-width="1.5" marker-end="url(#lsArr)"/>
      <defs>
        <marker id="lsArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#334155"/>
        </marker>
      </defs>

      <!-- ══════ RIGHT: reconstructed cloud ══════ -->
      <rect x="277" y="0" width="281" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="417" y="13" text-anchor="middle"
        :style="`font-size:8.5px;font-weight:700;font-family:sans-serif;fill:${deskew ? '#15803d' : speed > 0 ? '#CF1C24' : '#64748b'}`">
        Reconstructed cloud, {{ deskew ? 'deskew: pose p(tᵢ) per ray ✓' : 'naive: everything from the final pose' }}
      </text>

      <!-- ground truth as a watermark -->
      <line v-for="(w, i) in walls" :key="`rw${i}`"
        :x1="rw(w.x1)" :y1="rh(w.y1)" :x2="rw(w.x2)" :y2="rh(w.y2)"
        stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3,3"/>
      <circle :cx="rw(pillar.x)" :cy="rh(pillar.y)" :r="pillar.r * S"
        fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3,3"/>

      <circle v-for="(p, i) in cloudPts" :key="`cp${i}`"
        :cx="p.x" :cy="p.y" r="1.8" :fill="deskew ? '#25B34B' : '#F15A22'"/>

      <text x="417" y="170" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        grey dashes = true geometry · moving robot + naive → curved walls
      </text>

      <!-- ══════ BOTTOM: 1×M range image ══════ -->
      <rect x="0" y="178" width="558" height="37" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="8" y="193" style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">Range</text>
      <text x="8" y="202" style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">range 1×{{ M }}</text>
      <g>
        <rect v-for="i in M" :key="`st${i}`"
          :x="STRIP_X + (i-1) / M * STRIP_W" :y="STRIP_Y"
          :width="STRIP_W / M + 0.5" :height="STRIP_H"
          :fill="rangeColor(ranges[i-1])"/>
      </g>
      <!-- current azimuth cursor -->
      <rect :x="STRIP_X + beamIdx / M * STRIP_W - 1" :y="STRIP_Y - 2" width="2" :height="STRIP_H + 4" fill="#F15A22"/>
      <text :x="STRIP_X" :y="STRIP_Y + STRIP_H + 9" style="font-size:6px;fill:#94a3b8;font-family:monospace">ω=0°</text>
      <text :x="STRIP_X + STRIP_W" :y="STRIP_Y + STRIP_H + 9" text-anchor="end" style="font-size:6px;fill:#94a3b8;font-family:monospace">ω=360°</text>
      <text x="545" y="193" text-anchor="end" style="font-size:6px;fill:#CF1C24;font-family:sans-serif">near</text>
      <text x="545" y="201" text-anchor="end" style="font-size:6px;fill:#2563eb;font-family:sans-serif">far</text>
    </svg>

    <div class="ls-controls">
      <button class="ls-btn-main" @click="running = !running">{{ running ? '⏸' : '▶' }}</button>
      <label class="ls-sl">
        Rays/rev
        <strong>{{ M }}</strong>
        <input type="range" :value="M" @input="M = Number(($event.target as HTMLInputElement).value); resetScan()" min="45" max="360" step="45"/>
      </label>
      <label class="ls-sl">
        Robot speed
        <strong>{{ speed.toFixed(1) }}</strong>
        <input type="range" v-model.number="speed" min="0" max="2" step="0.1"/>
      </label>
      <button class="ls-btn" :class="{ on: deskew }" @click="deskew = !deskew">
        {{ deskew ? '✓ Deskewing' : 'Deskewing off' }}
      </button>
      <span class="ls-info">{{ speed === 0 ? 'Robot standing still: no distortion.' : 'The robot moves during the revolution → compare naive vs deskew.' }}</span>
    </div>
  </div>
</template>

<style scoped>
.ls-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ls-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ls-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ls-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ls-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.ls-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ls-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.ls-btn-main:hover { background: #CF1C24; color: white; }
.ls-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.ls-btn.on { border-color: #25B34B; background: #f0fdf4; color: #15803d; }
.ls-info { font-size: 0.64rem; color: #64748b; font-style: italic; }
</style>
