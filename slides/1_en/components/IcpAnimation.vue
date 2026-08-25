<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'

interface Pt { x: number; y: number }

const VW = 500, VH = 295

// ── Arc point cloud helper ──────────────────────────────────
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  })
}

function addNoise(pts: Pt[], sigma: number): Pt[] {
  return pts.map(p => ({
    x: p.x + (Math.random() - 0.5) * 2 * sigma,
    y: p.y + (Math.random() - 0.5) * 2 * sigma,
  }))
}

// ── Base arcs (clean) ──────────────────────────────────────
const BASE_ARC = arc(260, 148, 92, -75, 75, 14)

function rotateAbout(pts: Pt[], cx: number, cy: number, deg: number): Pt[] {
  const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180)
  return pts.map(p => ({
    x: c * (p.x - cx) - s * (p.y - cy) + cx,
    y: s * (p.x - cx) + c * (p.y - cy) + cy,
  }))
}
const SRC_CLEAN: Pt[] = rotateAbout(BASE_ARC, 260, 148, 38).map(p => ({ x: p.x - 200, y: p.y + 20 }))

function freshClouds() {
  return {
    target: addNoise(BASE_ARC, 16),
    src:    addNoise(SRC_CLEAN, 16),
  }
}

// ── Reactive state ─────────────────────────────────────────
const { target: initTarget, src: initSrc } = freshClouds()
const target = ref<Pt[]>(initTarget)
const src    = ref<Pt[]>(initSrc)
const iter    = ref(0)
const phase   = ref<'idle' | 'assoc' | 'transform' | 'done'>('idle')
const playing    = ref(false)
const prevErr    = ref(Infinity)
const resetting  = ref(false)

// ── Nearest neighbours (O(n²), n=10 → fine) ───────────────
function nearestNeighbours(pts: Pt[]): Pt[] {
  return pts.map(sp => {
    let best = target.value[0], d = Infinity
    for (const tp of target.value) {
      const dist = Math.hypot(sp.x - tp.x, sp.y - tp.y)
      if (dist < d) { d = dist; best = tp }
    }
    return best
  })
}

// ── Correspondence lines (shown during 'assoc' and 'done') ─
const corrLines = computed<{ x1: number; y1: number; x2: number; y2: number }[]>(() => {
  if (phase.value !== 'assoc' && phase.value !== 'done') return []
  const nns = nearestNeighbours(src.value)
  return src.value.map((p, i) => ({ x1: p.x, y1: p.y, x2: nns[i].x, y2: nns[i].y }))
})

// ── Mean error ─────────────────────────────────────────────
const meanErr = computed(() => {
  const nns = nearestNeighbours(src.value)
  return src.value.reduce((a, p, i) => a + Math.hypot(p.x - nns[i].x, p.y - nns[i].y), 0) / src.value.length
})

// ── One ICP iteration (2-D SVD formula) ───────────────────
function icpStep() {
  const S = src.value
  const Q = nearestNeighbours(S)
  const n  = S.length

  const muSx = S.reduce((a, p) => a + p.x, 0) / n
  const muSy = S.reduce((a, p) => a + p.y, 0) / n
  const muQx = Q.reduce((a, p) => a + p.x, 0) / n
  const muQy = Q.reduce((a, p) => a + p.y, 0) / n

  // Cross-covariance W = Σ q'ᵢ (p'ᵢ)ᵀ
  let w11 = 0, w12 = 0, w21 = 0, w22 = 0
  for (let i = 0; i < n; i++) {
    const px = S[i].x - muSx, py = S[i].y - muSy
    const qx = Q[i].x - muQx, qy = Q[i].y - muQy
    w11 += qx * px; w12 += qx * py
    w21 += qy * px; w22 += qy * py
  }

  // Optimal 2-D rotation: θ = atan2(W₂₁ - W₁₂, W₁₁ + W₂₂)
  const theta = Math.atan2(w21 - w12, w11 + w22)
  const c = Math.cos(theta), s = Math.sin(theta)

  // Translation: t = μ_Q − R μ_P
  const tx = muQx - (c * muSx - s * muSy)
  const ty = muQy - (s * muSx + c * muSy)

  prevErr.value = meanErr.value
  src.value = S.map(p => ({ x: c * p.x - s * p.y + tx, y: s * p.x + c * p.y + ty }))
  iter.value++
}

// ── Half-step: each click advances one sub-step ───────────
let timers: ReturnType<typeof setTimeout>[] = []
function clearTimers() { timers.forEach(clearTimeout); timers = [] }

function step() {
  if (phase.value === 'done') return
  clearTimers()
  if (phase.value === 'idle') {
    // Half 1: show associations
    phase.value = 'assoc'
  } else if (phase.value === 'assoc') {
    // Half 2: apply transform
    icpStep()
    phase.value = 'transform'
    timers.push(setTimeout(() => {
      phase.value = Math.abs(prevErr.value - meanErr.value) < 0.01 ? 'done' : 'idle'
    }, 650))
  }
}

// ── Auto play ──────────────────────────────────────────────
let playTimer: ReturnType<typeof setTimeout> | null = null
function clearPlay() { if (playTimer) { clearTimeout(playTimer); playTimer = null } }

function togglePlay() {
  if (playing.value) {
    clearPlay(); clearTimers(); playing.value = false
    if (phase.value === 'assoc' || phase.value === 'transform') phase.value = 'idle'
    return
  }
  if (phase.value === 'done') return
  playing.value = true
  function tick() {
    if (phase.value === 'done') { playing.value = false; return }
    // Half 1
    phase.value = 'assoc'
    playTimer = setTimeout(() => {
      // Half 2
      icpStep()
      phase.value = 'transform'
      playTimer = setTimeout(() => {
        phase.value = Math.abs(prevErr.value - meanErr.value) < 1.5 ? 'done' : 'idle'
        if (phase.value !== 'done') playTimer = setTimeout(tick, 350)
        else playing.value = false
      }, 650)
    }, 900)
  }
  tick()
}

function reset() {
  clearPlay(); clearTimers()
  playing.value   = false
  phase.value     = 'idle'
  iter.value      = 0
  prevErr.value   = Infinity
  resetting.value = true                      // disable transitions for instant snap
  const { target: t, src: s } = freshClouds()
  target.value = t
  src.value    = s
  nextTick(() => { resetting.value = false }) // re-enable after DOM update
}

// ── Phase label ────────────────────────────────────────────
const phaseLabel = computed(() => ({
  idle:      iter.value > 0 ? `Itération ${iter.value} terminée` : '',
  assoc:     'Étape 1 : Association (plus proches voisins)',
  transform: 'Étape 2 : Calcul et application de (R, t)',
  done:      `✓ Convergé en ${iter.value} itération${iter.value > 1 ? 's' : ''}`,
}[phase.value]))

const labelColor = computed(() => phase.value === 'done' ? '#25B34B' : '#555')
</script>

<template>
  <div class="icp-wrap">
    <svg :viewBox="`0 0 ${VW} ${VH}`" class="icp-svg">
      <rect width="100%" height="100%" fill="#f8fafc" rx="6" />

      <!-- Correspondence lines (shown during assoc / done) -->
      <line
        v-for="(l, i) in corrLines" :key="`c${i}`"
        :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
        stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5,3" opacity="0.8"
      />

      <!-- Target cloud (blue, fixed) -->
      <circle
        v-for="(p, i) in target" :key="`t${i}`"
        :cx="p.x" :cy="p.y" r="8"
        fill="#00BDF2" stroke="white" stroke-width="2"
      />

      <!-- Source cloud (red, animated via CSS transform) -->
      <circle
        v-for="(p, i) in src" :key="`s${i}`"
        cx="0" cy="0" r="8"
        fill="#CF1C24" stroke="white" stroke-width="2"
        :style="{ transform: `translate(${p.x}px, ${p.y}px)`, transition: resetting ? 'none' : 'transform 0.65s cubic-bezier(0.4,0,0.2,1)' }"
      />

      <!-- Phase label -->
      <text
        x="250" y="283"
        text-anchor="middle" font-size="4" font-weight="600"
        :fill="labelColor"
      >{{ phaseLabel }}</text>
    </svg>

    <!-- Controls -->
    <div class="ctrl">
      <div class="legend">
        <span class="dot" style="background:#00BDF2" />
        <span>Cible <em>Q</em> (fixe)</span>
        <span class="dot ml" style="background:#CF1C24" />
        <span>Source <em>P</em> (mobile)</span>
        <span v-if="iter > 0" class="err">
          · Erreur : <strong>{{ meanErr.toFixed(1) }} px</strong>
        </span>
      </div>
      <div class="btns">
        <button class="b-red"  @click="step"       :disabled="phase === 'done' || playing || phase === 'transform'">
          {{ phase === 'assoc' ? '2. Résoudre (R, t)' : (iter === 0 ? '▶ Démarrer' : `1. Associer (it. ${iter + 1})`) }}
        </button>
        <button class="b-blue" @click="togglePlay" :disabled="phase === 'done'">
          {{ playing ? '⏸ Pause' : '⏩ Auto' }}
        </button>
        <button class="b-grey" @click="reset">↺ Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icp-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
}
.icp-svg {
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
  gap: 5px;
  font-size: 0.72rem;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ml { margin-left: 10px; }
.err { color: #64748b; }
.btns { display: flex; gap: 6px; }
button {
  padding: 4px 12px;
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
