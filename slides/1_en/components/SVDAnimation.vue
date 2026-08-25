<script setup lang="ts">
import { ref, computed } from 'vue'

type Phase = 'initial' | 'centroids' | 'centered' | 'rotate' | 'translate' | 'done'
interface Pt { x: number; y: number }

// ── SVG layout ─────────────────────────────────────────────
const VW = 500, VH = 264
const OX  = 250, OY  = 132   // display origin for "centered" phases

// ── Fixed point clouds ─────────────────────────────────────
// Q  — target (blue)
const Q: Pt[] = [
  { x: 340, y:  90 }, { x: 400, y: 120 }, { x: 390, y: 180 },
  { x: 330, y: 200 }, { x: 295, y: 155 }, { x: 360, y: 140 },
]
// P  — source (red) : Q rotated +40° + translated + fixed noise (Σnoise=0 so μ_P unchanged)
const P: Pt[] = [
  { x: 224, y: 120 }, { x: 241, y: 190 }, { x: 203, y: 233 },
  { x: 138, y: 201 }, { x: 149, y: 150 }, { x: 201, y: 171 },
]
const N = P.length

// ── Centroids ─────────────────────────────────────────────
function avg(pts: Pt[]): Pt {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}
const muP = avg(P)   // ≈ (192.7, 177.5)
const muQ = avg(Q)   // ≈ (352.5, 147.5)

// ── Centered clouds ────────────────────────────────────────
const Pc = P.map(p => ({ x: p.x - muP.x, y: p.y - muP.y }))
const Qc = Q.map(q => ({ x: q.x - muQ.x, y: q.y - muQ.y }))

// ── Cross-covariance W = Σ Qcᵢ (Pcᵢ)ᵀ ─────────────────────
let w11 = 0, w12 = 0, w21 = 0, w22 = 0
for (let i = 0; i < N; i++) {
  w11 += Qc[i].x * Pc[i].x;  w12 += Qc[i].x * Pc[i].y
  w21 += Qc[i].y * Pc[i].x;  w22 += Qc[i].y * Pc[i].y
}
// ── 2-D optimal rotation θ = atan2(W₂₁−W₁₂, W₁₁+W₂₂) ────
const theta    = Math.atan2(w21 - w12, w11 + w22)
const thetaDeg = (theta * 180 / Math.PI).toFixed(1)
const C = Math.cos(theta), S = Math.sin(theta)

// ── Rotated centered P' ───────────────────────────────────
const Pr = Pc.map(p => ({ x: C * p.x - S * p.y, y: S * p.x + C * p.y }))

// ── Translation ───────────────────────────────────────────
const tx = (muQ.x - (C * muP.x - S * muP.y)).toFixed(1)
const ty = (muQ.y - (S * muP.x + C * muP.y)).toFixed(1)

// ── Phase machine ─────────────────────────────────────────
const PHASES: Phase[] = ['initial', 'centroids', 'centered', 'rotate', 'translate', 'done']
const phaseIdx = ref(0)
const ph = computed(() => PHASES[phaseIdx.value])

// SVD-aligned positions for P (= R·P + t, approximately Q but with noise residuals)
const Pfinal = Pr.map(p => ({ x: muQ.x + p.x, y: muQ.y + p.y }))

// Mean residual error (RMSE) between Pfinal and Q
const rmse = Math.sqrt(
  Pfinal.reduce((s, p, i) => s + Math.hypot(p.x - Q[i].x, p.y - Q[i].y) ** 2, 0) / N
).toFixed(1)

// Positions for P at each phase
function pPos(i: number): Pt {
  switch (ph.value) {
    case 'initial':
    case 'centroids':  return P[i]
    case 'centered':   return { x: OX + Pc[i].x, y: OY + Pc[i].y }
    case 'rotate':     return { x: OX + Pr[i].x, y: OY + Pr[i].y }
    case 'translate':
    case 'done':       return Pfinal[i]
    default: return P[i]
  }
}

// Positions for Q at each phase (centers during middle phases)
function qPos(i: number): Pt {
  if (ph.value === 'centered' || ph.value === 'rotate')
    return { x: OX + Qc[i].x, y: OY + Qc[i].y }
  return Q[i]
}

// Centroid markers animate to SVG origin during 'centered' phase
const muPdisp = computed((): Pt =>
  ph.value === 'centroids' ? muP : { x: OX, y: OY })
const muQdisp = computed((): Pt =>
  ph.value === 'centroids' ? muQ : { x: OX, y: OY })

// Visibility flags
const showCorr      = computed(() => ph.value === 'initial' || ph.value === 'centroids')
const showRadial    = computed(() => ph.value === 'centroids')
const showCentroids = computed(() => ph.value === 'centroids' || ph.value === 'centered')
const showOrigin    = computed(() => ph.value === 'centered' || ph.value === 'rotate' || ph.value === 'translate')
const showDoneRings = computed(() => ph.value === 'done')

// Phase labels
const LABELS: Record<Phase, string> = {
  initial:   'Source P (rouge), cible Q (bleu) — correspondances 1↔1, 2↔2, …',
  centroids: `Étape 1 — μ_P = (${muP.x.toFixed(0)}, ${muP.y.toFixed(0)})  ·  μ_Q = (${muQ.x.toFixed(0)}, ${muQ.y.toFixed(0)})`,
  centered:  "Étape 2 — Centrage : P'=P−μ_P,  Q'=Q−μ_Q  (centroïdes→origine)",
  rotate:    `Étape 3 — W=Q'P'ᵀ → SVD → R=UVᵀ  (θ=${thetaDeg}°)  —  P' s'aligne sur Q'`,
  translate: `Étape 4 — t = μ_Q − R·μ_P = (${tx}, ${ty})  —  P' glisse vers μ_Q`,
  done:      `✓  R, t optimaux — RMSE ≈ ${rmse} px  (résidu de bruit non annulable)`,
}
const labelColor = computed(() => ph.value === 'done' ? '#25B34B' : '#475569')

// ── Controls ──────────────────────────────────────────────
let playTimer: ReturnType<typeof setTimeout> | null = null
const playing = ref(false)

function clearTimer() { if (playTimer) { clearTimeout(playTimer); playTimer = null } }

function go(dir: 1 | -1) {
  clearTimer(); playing.value = false
  phaseIdx.value = Math.max(0, Math.min(PHASES.length - 1, phaseIdx.value + dir))
}

function togglePlay() {
  if (playing.value) { clearTimer(); playing.value = false; return }
  if (phaseIdx.value >= PHASES.length - 1) return
  playing.value = true
  function tick() {
    if (phaseIdx.value >= PHASES.length - 1) { playing.value = false; return }
    phaseIdx.value++
    playTimer = setTimeout(tick, 1500)
  }
  tick()
}

function reset() { clearTimer(); playing.value = false; phaseIdx.value = 0 }
</script>

<template>
  <div class="svd-wrap">
    <svg :viewBox="`0 0 ${VW} ${VH}`" class="svd-svg">
      <rect width="100%" height="100%" fill="#f8fafc" rx="6" />

      <!-- Radial lines to centroid (during 'centroids') -->
      <g v-if="showRadial" opacity="0.35">
        <line v-for="(p, i) in P" :key="`rp${i}`"
          :x1="p.x" :y1="p.y" :x2="muP.x" :y2="muP.y"
          stroke="#CF1C24" stroke-width="0.8" stroke-dasharray="3,2" />
        <line v-for="(q, i) in Q" :key="`rq${i}`"
          :x1="q.x" :y1="q.y" :x2="muQ.x" :y2="muQ.y"
          stroke="#00BDF2" stroke-width="0.8" stroke-dasharray="3,2" />
      </g>

      <!-- Correspondence lines (initial + centroids) -->
      <g v-if="showCorr">
        <line v-for="(_, i) in P" :key="`cl${i}`"
          :x1="P[i].x" :y1="P[i].y" :x2="Q[i].x" :y2="Q[i].y"
          stroke="#94a3b8" stroke-width="1" stroke-dasharray="5,3" opacity="0.55" />
      </g>

      <!-- Small origin cross (centered + rotate + translate) -->
      <g v-if="showOrigin" :transform="`translate(${OX},${OY})`" opacity="0.3">
        <line x1="-22" y1="0" x2="22" y2="0" stroke="#475569" stroke-width="1" />
        <line x1="0" y1="-22" x2="0" y2="22" stroke="#475569" stroke-width="1" />
        <text x="3" y="-7" font-size="3" fill="#475569" font-weight="600">O</text>
      </g>

      <!-- Done: green success rings -->
      <g v-if="showDoneRings">
        <circle v-for="(q, i) in Q" :key="`dr${i}`"
          :cx="q.x" :cy="q.y" r="14"
          fill="none" stroke="#25B34B" stroke-width="2.5" opacity="0.85" />
      </g>

      <!-- Q circles (blue) -->
      <g v-for="(_, i) in Q" :key="`q${i}`"
        :style="{ transform: `translate(${qPos(i).x}px, ${qPos(i).y}px)`,
                  transition: 'transform 0.85s cubic-bezier(0.4,0,0.2,1)' }">
        <circle cx="0" cy="0" r="9" fill="#00BDF2" stroke="white" stroke-width="2" />
        <text x="0" y="3.5" text-anchor="middle" font-size="3" font-weight="700" fill="white">{{ i+1 }}</text>
      </g>

      <!-- P circles (red) -->
      <g v-for="(_, i) in P" :key="`p${i}`"
        :style="{ transform: `translate(${pPos(i).x}px, ${pPos(i).y}px)`,
                  transition: 'transform 0.85s cubic-bezier(0.4,0,0.2,1)' }">
        <circle cx="0" cy="0" r="9" fill="#CF1C24" stroke="white" stroke-width="2" />
        <text x="0" y="3.5" text-anchor="middle" font-size="3" font-weight="700" fill="white">{{ i+1 }}</text>
      </g>

      <!-- Centroid markers (animate to origin during 'centered') -->
      <g v-if="showCentroids">
        <g :style="{ transform: `translate(${muPdisp.x}px, ${muPdisp.y}px)`,
                     transition: 'transform 0.85s cubic-bezier(0.4,0,0.2,1)' }">
          <circle cx="0" cy="0" r="11" fill="#CF1C24" fill-opacity="0.12" stroke="#CF1C24" stroke-width="1.5" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#CF1C24" stroke-width="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#CF1C24" stroke-width="2.5" />
          <text x="13" y="-6" font-size="4" fill="#CF1C24" font-weight="700">μ_P</text>
        </g>
        <g :style="{ transform: `translate(${muQdisp.x}px, ${muQdisp.y}px)`,
                     transition: 'transform 0.85s cubic-bezier(0.4,0,0.2,1)' }">
          <circle cx="0" cy="0" r="11" fill="#00BDF2" fill-opacity="0.12" stroke="#00BDF2" stroke-width="1.5" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#00BDF2" stroke-width="2.5" />
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#00BDF2" stroke-width="2.5" />
          <text x="13" y="-6" font-size="4" fill="#00BDF2" font-weight="700">μ_Q</text>
        </g>
      </g>

      <!-- Phase label -->
      <text x="250" :y="VH - 4" text-anchor="middle" font-size="4" font-weight="600" :fill="labelColor">
        {{ LABELS[ph] }}
      </text>
    </svg>

    <!-- Controls -->
    <div class="ctrl">
      <div class="legend">
        <span class="dot" style="background:#CF1C24" /><span>Source P</span>
        <span class="dot ml" style="background:#00BDF2" /><span>Cible Q</span>
        <span class="step-badge ml">{{ phaseIdx + 1 }} / {{ PHASES.length }}</span>
      </div>
      <div class="btns">
        <button class="b-grey" @click="go(-1)" :disabled="phaseIdx === 0 || playing">◀ Précédent</button>
        <button class="b-red"  @click="go(1)"  :disabled="phaseIdx >= PHASES.length - 1 || playing">Suivant ▶</button>
        <button class="b-blue" @click="togglePlay" :disabled="phaseIdx >= PHASES.length - 1 && !playing">
          {{ playing ? '⏸ Pause' : '⏩ Auto' }}
        </button>
        <button class="b-grey" @click="reset">↺ Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.svd-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
}
.svd-svg {
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
  color: #64748b;
}
.dot {
  display: inline-block;
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ml { margin-left: 10px; }
.step-badge {
  font-size: 0.68rem;
  color: #94a3b8;
}
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
