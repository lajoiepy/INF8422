<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

// ── Paramètres ────────────────────────────────────────────────
// Trajectoire "lollipop" : tige droite puis boucle rectangulaire.
// La loop closure se produit à la JONCTION tige-boucle (LC_IDX),
// pas au point de départ (k=0).
const N           = 40
const LC_IDX      = 8   // jonction tige-boucle
const LOOP_PER_SIDE = 8  // 4 côtés × 8 = 32 pts boucle; total: 8+32+1=41=N+1

const sigma    = ref(1.5)
const progress = ref(0.0)
const animating = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

// ── Géométrie ─────────────────────────────────────────────────
const STEM_START: [number,number] = [0.5, 1.5]
const JUNCTION:   [number,number] = [2.5, 1.5]
const LOOP_CORNERS: [number,number][] = [
  [2.5, 1.5],
  [5.5, 1.5],
  [5.5, 5.0],
  [2.5, 5.0],
]
// Dérive vers la droite-haut, ~40° (bien visible sur ce tracé)
const DRIFT_DIR: [number,number] = [Math.cos(0.7), Math.sin(0.7)]

// ── Trajectoire vraie ─────────────────────────────────────────
const trueWaypoints = computed((): [number,number][] => {
  const pts: [number,number][] = []
  // Tige (k=0..LC_IDX-1)
  for (let k = 0; k < LC_IDX; k++) {
    const t = k / (LC_IDX - 1)
    pts.push([STEM_START[0] + t*(JUNCTION[0]-STEM_START[0]), STEM_START[1]])
  }
  // Boucle rectangulaire (k=LC_IDX..N-1 : 4×8=32 pts)
  for (let side = 0; side < 4; side++) {
    const from = LOOP_CORNERS[side], to = LOOP_CORNERS[(side+1)%4]
    for (let j = 0; j < LOOP_PER_SIDE; j++) {
      const t = j / LOOP_PER_SIDE
      pts.push([from[0]+t*(to[0]-from[0]), from[1]+t*(to[1]-from[1])])
    }
  }
  pts.push([...JUNCTION])  // k=N : fermeture à la jonction
  return pts
})

// ── Trajectoire dérivée ────────────────────────────────────────
const driftedWaypoints = computed((): [number,number][] =>
  trueWaypoints.value.map((p, k) => {
    const frac = k / N
    return [p[0]+frac*sigma.value*DRIFT_DIR[0], p[1]+frac*sigma.value*DRIFT_DIR[1]]
  })
)

// ── Trajectoire corrigée ───────────────────────────────────────
// Seuls les waypoints k >= LC_IDX (la boucle) sont corrigés.
// La tige reste inchangée — sa dérive n'est pas observable par la LC.
const correctedWaypoints = computed((): [number,number][] => {
  const drifted = driftedWaypoints.value
  const errX = drifted[N][0] - drifted[LC_IDX][0]
  const errY = drifted[N][1] - drifted[LC_IDX][1]
  return drifted.map((p, k): [number,number] => {
    if (k < LC_IDX) return [p[0], p[1]]
    const frac = (k - LC_IDX) / (N - LC_IDX)
    return [p[0]-frac*errX*progress.value, p[1]-frac*errY*progress.value]
  })
})

// ── Animation ─────────────────────────────────────────────────
function detect() {
  if (animating.value) return
  progress.value = 0
  animating.value = true
  const STEPS = 40; let step = 0
  timer = setInterval(() => {
    step++
    progress.value = Math.min(step/STEPS, 1)
    if (step >= STEPS) { clearInterval(timer!); animating.value = false }
  }, 40)
}
function reset() {
  if (timer) clearInterval(timer)
  progress.value = 0; animating.value = false
}
watch(sigma, reset)
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Erreur de fermeture (entre fin de boucle et jonction) ─────
const closingError = computed(() => {
  const d = driftedWaypoints.value
  return Math.hypot(d[N][0]-d[LC_IDX][0], d[N][1]-d[LC_IDX][1])
})
const remainingError = computed(() => closingError.value * (1 - progress.value))

// ── Coordonnées SVG panneau gauche ────────────────────────────
const WX0=-0.5, WX1=6.5, WY0=-1.0, WY1=7.5
const SX0=15, SX1=255, SY0=200, SY1=15
function wx(x: number) { return SX0+(x-WX0)/(WX1-WX0)*(SX1-SX0) }
function wy(y: number) { return SY0+(y-WY0)/(WY1-WY0)*(SY1-SY0) }
function polyPts(pts: [number,number][]): string {
  return pts.map(p=>`${wx(p[0]).toFixed(1)},${wy(p[1]).toFixed(1)}`).join(' ')
}

// Flèche LC : fin de boucle → jonction
const lcArrow = computed(() => {
  const d = correctedWaypoints.value
  return {
    x1: wx(d[N][0]),      y1: wy(d[N][1]),
    x2: wx(d[LC_IDX][0]), y2: wy(d[LC_IDX][1]),
  }
})

// ── Panneau droit : graphe d'erreur ──────────────────────────
const GX0=278, GX1=545, GT_G=15, GB_G=200
function posToX(pos: number) { return GX0+pos*(GX1-GX0) }
function errToY(err: number) {
  return GB_G - Math.min(err/Math.max(sigma.value*1.2,0.01),1)*(GB_G-GT_G)
}
const errCurveBefore = computed(() => {
  const tw=trueWaypoints.value, dw=driftedWaypoints.value
  return dw.map((p,k) => {
    const err = Math.hypot(p[0]-tw[k][0], p[1]-tw[k][1])
    return `${posToX(k/N).toFixed(1)},${errToY(err).toFixed(1)}`
  }).join(' ')
})
const errCurveAfter = computed(() => {
  const tw=trueWaypoints.value, cw=correctedWaypoints.value
  return cw.map((p,k) => {
    const err = Math.hypot(p[0]-tw[k][0], p[1]-tw[k][1])
    return `${posToX(k/N).toFixed(1)},${errToY(err).toFixed(1)}`
  }).join(' ')
})
const yMaxVal = computed(()=>sigma.value*1.2)
const yTicks = computed(()=>
  [0.25,0.5,0.75,1.0].map(fr=>({y:errToY(yMaxVal.value*fr),label:(yMaxVal.value*fr).toFixed(1)}))
)
const xTicks = [0,0.25,0.5,0.75,1.0].map(v=>({v,x:posToX(v)}))
const xLC = computed(()=>posToX(LC_IDX/N))  // ligne verticale jonction
</script>

<template>
  <div class="lc-wrap">
    <svg viewBox="0 0 558 215" class="lc-svg">
      <defs>
        <marker id="lcArr"  markerWidth="7" markerHeight="7" refX="6" refY="1.5" orient="auto">
          <path d="M0,0 L7,1.5 L0,7 Z" fill="#7C3AED"/>
        </marker>
      </defs>

      <!-- ═══ PANNEAU GAUCHE : Trajectoire 2D ═══ -->
      <rect x="2" y="2" width="265" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="133" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vue du dessus — trajectoire lollipop
      </text>

      <!-- Trajectoire vraie (verte) -->
      <polyline :points="polyPts(trueWaypoints)"
        fill="none" stroke="#25B34B" stroke-width="1.8" stroke-dasharray="5,3" style="opacity:0.6"/>

      <!-- Trajectoire estimée / corrigée (rouge) -->
      <polyline :points="polyPts(correctedWaypoints)"
        fill="none" stroke="#CF1C24" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round" class="lc-traj"/>

      <!-- Flèche de loop closure : fin de boucle → jonction -->
      <line v-if="closingError > 0.08"
        :x1="lcArrow.x1" :y1="lcArrow.y1"
        :x2="lcArrow.x2 + (lcArrow.x2 < lcArrow.x1 ? 6 : -6)"
        :y2="lcArrow.y2 + (lcArrow.y2 < lcArrow.y1 ? 6 : -6)"
        stroke="#7C3AED" stroke-width="2" stroke-dasharray="4,3"
        marker-end="url(#lcArr)" class="lc-lcarrow"/>
      <text v-if="closingError > 0.3"
        :x="(lcArrow.x1+lcArrow.x2)/2 + 6"
        :y="(lcArrow.y1+lcArrow.y2)/2"
        style="font-size:7.5px;fill:#7C3AED;font-weight:700;font-family:sans-serif">
        loop closure
      </text>

      <!-- Départ (k=0) -->
      <circle :cx="wx(0.5)" :cy="wy(1.5)" r="6" fill="#25B34B" stroke="white" stroke-width="2"/>
      <text :x="wx(0.5)-2" :y="wy(1.5)-10"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">Départ</text>

      <!-- Jonction LC (k=LC_IDX) — point de référence de la loop closure -->
      <circle :cx="wx(correctedWaypoints[LC_IDX][0])" :cy="wy(correctedWaypoints[LC_IDX][1])"
        r="6" fill="#7C3AED" stroke="white" stroke-width="2"/>
      <text :x="wx(correctedWaypoints[LC_IDX][0])-2" :y="wy(correctedWaypoints[LC_IDX][1])-10"
        style="font-size:7.5px;fill:#7C3AED;font-weight:700;font-family:sans-serif">Jonction</text>

      <!-- Point courant (fin de trajectoire) -->
      <circle :cx="wx(correctedWaypoints[N][0])" :cy="wy(correctedWaypoints[N][1])"
        r="6" fill="#CF1C24" stroke="white" stroke-width="2" class="lc-endpt"/>
      <text :x="wx(correctedWaypoints[N][0])+8" :y="wy(correctedWaypoints[N][1])"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        {{ progress >= 0.99 ? 'Corrigé ✓' : 'Estimé' }}
      </text>

      <!-- Légende -->
      <line x1="15" y1="201" x2="35" y2="201" stroke="#25B34B" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="39" y="204" style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">vraie</text>
      <line x1="65" y1="201" x2="85" y2="201" stroke="#CF1C24" stroke-width="2.5"/>
      <text x="89" y="204" style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">estimée</text>
      <line x1="120" y1="201" x2="140" y2="201" stroke="#7C3AED" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="144" y="204" style="font-size:8px;fill:#7C3AED;font-weight:700;font-family:sans-serif">loop closure</text>

    </svg>

    <!-- Contrôles -->
    <div class="lc-controls">
      <label class="lc-sl">
        <span>σ_drift =</span>
        <strong>{{ sigma.toFixed(1) }}</strong>
        <span class="lc-unit">m</span>
        <input type="range" v-model.number="sigma" min="0.3" max="3.0" step="0.1"/>
      </label>
      <button class="lc-btn" @click="detect" :disabled="animating">
        {{ animating ? '⟳ Correction…' : '🔍 Détecter Loop Closure' }}
      </button>
      <button class="lc-btn lc-reset" @click="reset">↺</button>
      <div class="lc-result">
        Erreur de fermeture :
        <strong>{{ closingError.toFixed(2) }} m</strong>
        →
        <strong :class="{ 'lc-ok': remainingError < 0.05 }">
          {{ remainingError.toFixed(2) }} m
          {{ remainingError < 0.05 ? '✓' : '' }}
        </strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lc-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.lc-svg  { height: 250px; width: auto; max-width: 100%; display: block; }

.lc-traj     { transition: points 0.04s linear; }
.lc-lcarrow  { transition: x1 0.04s linear, y1 0.04s linear; }
.lc-endpt    { transition: cx 0.04s linear, cy 0.04s linear; }
.lc-errcurve { transition: points 0.04s linear, opacity 0.2s ease; }

.lc-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lc-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.lc-sl strong { color: #CF1C24; min-width: 28px; }
.lc-unit { color: #94a3b8; font-size: 0.65rem; }
.lc-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.lc-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #7C3AED; background: #f5f3ff; color: #7C3AED;
  font-weight: 700; transition: background 0.15s;
}
.lc-btn:hover:not(:disabled) { background: #7C3AED; color: white; }
.lc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.lc-btn.lc-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }

.lc-result {
  font-family: monospace; font-size: 0.70rem; color: #334155;
  padding: 3px 10px; background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 5px;
}
.lc-result strong { color: #7C3AED; font-weight: 700; }
.lc-ok { color: #25B34B !important; }
</style>
