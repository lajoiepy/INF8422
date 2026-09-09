<script setup lang="ts">
import { ref, computed } from 'vue'

const nPoses     = ref(4)
const nLandmarks = ref(2)

// ── Factor graph structure ─────────────────────────────────────
// Variables: [p0, p1, ..., p_{nP-1}, l0, l1, ..., l_{nL-1}]
// Factors:
//   - 1 prior on p0
//   - (nP-1) odometry factors (pi-1 → pi)
//   - nP measurement factors (pi → l[i%nL]) + (pi → l[(i+1)%nL])
//     (only if nL > 1, else pi → l0 only)

const nVars    = computed(() => nPoses.value + nLandmarks.value)
const priorFac = computed(() => 1)
const odomFac  = computed(() => Math.max(0, nPoses.value - 1))
const measFac  = computed(() => {
  // each pose observes 1 or 2 landmarks
  return nPoses.value * (nLandmarks.value >= 2 ? 2 : 1)
})
const nFactors = computed(() => priorFac.value + odomFac.value + measFac.value)

// Jacobian: nFactors × nVars
// Returns list of (row, col) pairs that are nonzero
const nonZeroBlocks = computed(() => {
  const blocks: [number, number][] = []
  const nP = nPoses.value, nL = nLandmarks.value

  let row = 0
  // Prior on p0 (col 0)
  blocks.push([row, 0]); row++

  // Odometry (pi-1 → pi)
  for (let i = 1; i < nP; i++) {
    blocks.push([row, i - 1])
    blocks.push([row, i])
    row++
  }

  // Measurements (pi → l[i%nL] and pi → l[(i+1)%nL])
  for (let i = 0; i < nP; i++) {
    blocks.push([row, i])                           // pose col
    blocks.push([row, nP + (i % nL)])               // landmark col
    if (nL >= 2) {
      row++
      blocks.push([row, i])
      blocks.push([row, nP + ((i + 1) % nL)])
    }
    row++
  }
  return blocks
})

const fillPct = computed(() => {
  const total = nFactors.value * nVars.value
  return total === 0 ? 0 : (nonZeroBlocks.value.length / total * 100)
})

// ── SVG coordinates ───────────────────────────────────────────
// LEFT PANEL: graph [5..268], RIGHT PANEL: jacobian [275..552]
// Left panel: poses on top row, landmarks on bottom row
const PL_X1 = 5, PL_X2 = 268
const PR_X1 = 275, PR_X2 = 554

function posePos(i: number, nP: number): [number, number] {
  // Distribute poses horizontally in left panel
  const margin = 30
  const w = PL_X2 - PL_X1 - 2 * margin
  const x = PL_X1 + margin + (nP <= 1 ? w / 2 : i / (nP - 1) * w)
  return [x, 60]
}

function landmarkPos(j: number, nL: number): [number, number] {
  const margin = 40
  const w = PL_X2 - PL_X1 - 2 * margin
  const x = PL_X1 + margin + (nL <= 1 ? w / 2 : j / (nL - 1) * w)
  return [x, 155]
}

// Pose circles (dark slate — same as ImuFactorAnimation Course 2)
const poseCircles = computed(() => {
  const nP = nPoses.value, nL = nLandmarks.value
  return Array.from({ length: nP }, (_, i) => {
    const [x, y] = posePos(i, nP)
    return { x, y, label: `x${i}` }
  })
})

// Landmark circles (cyan — same as ImuFactorAnimation Course 2)
const landmarkSquares = computed(() => {
  const nL = nLandmarks.value
  return Array.from({ length: nL }, (_, j) => {
    const [x, y] = landmarkPos(j, nL)
    return { x, y, label: `L${j + 1}` }
  })
})

// Factor square midpoints (odometry between adjacent poses)
const odomFactors = computed(() => {
  const nP = nPoses.value
  return Array.from({ length: nP - 1 }, (_, i) => {
    const [x0, y0] = posePos(i, nP)
    const [x1, y1] = posePos(i + 1, nP)
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, cx0: x0, cy0: y0, cx1: x1, cy1: y1 }
  })
})

// Measurement factors (pose → landmark)
type MeasFactor = { x: number; y: number; px: number; py: number; lx: number; ly: number }
const measFactors = computed(() => {
  const nP = nPoses.value, nL = nLandmarks.value
  const result: MeasFactor[] = []
  for (let i = 0; i < nP; i++) {
    const [px, py] = posePos(i, nP)
    const obs = nL >= 2 ? [i % nL, (i + 1) % nL] : [i % nL]
    for (const j of obs) {
      const [lx, ly] = landmarkPos(j, nL)
      result.push({ x: (px + lx) / 2, y: (py + ly) / 2, px, py, lx, ly })
    }
  }
  return result
})

// ── Right panel: Jacobian cells ───────────────────────────────
const cellW = computed(() => {
  const avail = PR_X2 - PR_X1 - 10
  return Math.min(22, Math.floor(avail / nVars.value))
})
const cellH = computed(() => {
  const avail = 175
  return Math.min(20, Math.floor(avail / nFactors.value))
})
const jacX0 = computed(() => PR_X1 + 5)
const jacY0 = 22

// Header labels
const varLabels = computed(() => {
  const nP = nPoses.value, nL = nLandmarks.value
  return [
    ...Array.from({ length: nP }, (_, i) => `x${i}`),
    ...Array.from({ length: nL }, (_, j) => `L${j + 1}`),
  ]
})
</script>

<template>
  <div class="fgs-wrap">
    <svg viewBox="0 0 558 215" class="fgs-svg">

      <!-- ══════ LEFT: Factor Graph ══════ -->
      <rect x="2" y="2" width="268" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="135" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Graphe de facteurs
      </text>
      <text x="135" y="22" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        ● cercle = variable · ■ carré = facteur
      </text>

      <!-- Odom factor connections + squares -->
      <g v-for="(f, i) in odomFactors" :key="`odom${i}`">
        <line :x1="f.cx0" :y1="f.cy0" :x2="f.x" :y2="f.y" stroke="#475569" stroke-width="1.2"/>
        <line :x1="f.x" :y1="f.y" :x2="f.cx1" :y2="f.cy1" stroke="#475569" stroke-width="1.2"/>
        <rect :x="f.x-5" :y="f.y-5" width="10" height="10" fill="#1e293b" rx="1"/>
      </g>

      <!-- Measurement factor connections + squares -->
      <g v-for="(f, i) in measFactors" :key="`meas${i}`">
        <line :x1="f.px" :y1="f.py" :x2="f.x" :y2="f.y" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>
        <line :x1="f.x" :y1="f.y" :x2="f.lx" :y2="f.ly" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>
        <rect :x="f.x-5" :y="f.y-5" width="10" height="10" fill="#475569" rx="1"/>
      </g>

      <!-- Prior factor (square before x0) -->
      <g v-if="poseCircles.length > 0">
        <line :x1="poseCircles[0].x-20" :y1="poseCircles[0].y"
              :x2="poseCircles[0].x-8" :y2="poseCircles[0].y" stroke="#CF1C24" stroke-width="1.5"/>
        <rect :x="poseCircles[0].x-30" :y="poseCircles[0].y-5" width="10" height="10"
          fill="#CF1C24" rx="1"/>
        <text :x="poseCircles[0].x-25" :y="poseCircles[0].y-8"
          style="font-size:7px;fill:#CF1C24;font-family:sans-serif">prior</text>
      </g>

      <!-- Pose circles (dark slate — same as ImuFactorAnimation) -->
      <g v-for="(p, i) in poseCircles" :key="`p${i}`">
        <circle :cx="p.x" :cy="p.y" r="12" fill="#475569" stroke="white" stroke-width="2"/>
        <text :x="p.x" :y="p.y+4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">{{ p.label }}</text>
      </g>

      <!-- Landmark circles (cyan — same as ImuFactorAnimation) -->
      <g v-for="(l, j) in landmarkSquares" :key="`l${j}`">
        <circle :cx="l.x" :cy="l.y" r="10" fill="#00BDF2" stroke="white" stroke-width="2"/>
        <text :x="l.x" :y="l.y+4" text-anchor="middle"
          style="font-size:7.5px;fill:white;font-weight:700;font-family:sans-serif">{{ l.label }}</text>
      </g>

      <!-- Legend -->
      <circle cx="18" cy="197" r="6" fill="#475569"/>
      <text x="28" y="201" style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">Pose</text>
      <circle cx="68" cy="197" r="5" fill="#00BDF2"/>
      <text x="78" y="201" style="font-size:7px;fill:#00BDF2;font-weight:700;font-family:sans-serif">Landmark</text>
      <rect x="115" y="192" width="10" height="10" fill="#1e293b" rx="1"/>
      <text x="129" y="201" style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">Odom</text>
      <rect x="160" y="192" width="10" height="10" fill="#475569" rx="1"/>
      <text x="174" y="201" style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">Mesure</text>
      <rect x="210" y="192" width="10" height="10" fill="#CF1C24" rx="1"/>
      <text x="224" y="201" style="font-size:7px;fill:#CF1C24;font-weight:700;font-family:sans-serif">Prior</text>

      <!-- ══════ RIGHT: Jacobian ══════ -->
      <rect x="272" y="2" width="284" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="414" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Jacobien creux — rouge = dérivée non nulle
      </text>

      <!-- Column labels -->
      <g v-for="(lbl, c) in varLabels" :key="`vl${c}`">
        <text :x="jacX0 + c * cellW + cellW/2" :y="jacY0 - 2" text-anchor="middle"
          :fill="c < nPoses ? '#475569' : '#00BDF2'"
          style="font-size:6.5px;font-weight:700;font-family:sans-serif">{{ lbl }}</text>
      </g>

      <!-- Jacobian cells (all empty = light bg) -->
      <g v-for="r in nFactors" :key="`row${r}`">
        <g v-for="c in nVars" :key="`cell${r}_${c}`">
          <rect
            :x="jacX0 + (c-1)*cellW" :y="jacY0 + (r-1)*cellH"
            :width="cellW-1" :height="cellH-1"
            fill="#e2e8f0" rx="0.5"/>
        </g>
      </g>

      <!-- Non-zero blocks (red) -->
      <g v-for="([row, col], k) in nonZeroBlocks" :key="`nz${k}`">
        <rect
          :x="jacX0 + col*cellW" :y="jacY0 + row*cellH"
          :width="cellW-1" :height="cellH-1"
          fill="#CF1C24" rx="0.5" opacity="0.9"/>
      </g>

      <!-- Stats -->
      <text x="414" y="203" text-anchor="middle"
        style="font-size:8.5px;fill:#475569;font-weight:700;font-family:monospace">
        {{ nFactors }}×{{ nVars }} — Remplissage : {{ fillPct.toFixed(1) }}%
      </text>
    </svg>

    <!-- Controls -->
    <div class="fgs-controls">
      <label class="fgs-sl">
        <span class="fgs-lbl">Poses</span>
        <strong>{{ nPoses }}</strong>
        <input type="range" v-model.number="nPoses" min="2" max="8" step="1"/>
      </label>
      <label class="fgs-sl">
        <span class="fgs-lbl">Landmarks</span>
        <strong>{{ nLandmarks }}</strong>
        <input type="range" v-model.number="nLandmarks" min="1" max="5" step="1"/>
      </label>
      <div class="fgs-info">
        {{ nFactors }} facteurs × {{ nVars }} variables
        — Le graphe grandit mais la Jacobienne reste creuse !
      </div>
    </div>
  </div>
</template>

<style scoped>
.fgs-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.fgs-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.fgs-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.fgs-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.fgs-lbl { min-width: 55px; }
.fgs-sl strong { color: #CF1C24; min-width: 18px; display: inline-block; }
.fgs-sl input[type=range] { width: 80px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.fgs-info {
  font-size: 0.68rem; color: #64748b; font-style: italic;
  padding: 2px 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px;
}
</style>
