<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

// ── Constantes ───────────────────────────────────────────────
const MAX_ITER = 18
const DECAY    = 0.72   // facteur de réduction du coût par itération (≈ LM)

// 5 landmarks vrais en espace monde (X ∈ [-4,4], Y ∈ [2,8])
const GT: [number, number][] = [
  [-3.5, 3.2], [-1.8, 6.0], [0.6, 2.8], [2.2, 5.8], [3.7, 4.1]
]

// ── Réfs interactives ─────────────────────────────────────────
const sigma   = ref(1.5)   // bruit de mesure (0–3)
const iter    = ref(0)
const animating = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

// ── Bruit déterministe (LCG) ──────────────────────────────────
function lcg(seed: number, i: number): number {
  let s = (seed * 22695477 + (i + 1) * 1013904223) | 0
  s = Math.imul(s, 1664525) + 1013904223 | 0
  return (s >>> 1) / 0x40000000 - 1
}

const allGT = GT

// Estimations initiales bruitées
const initEst = computed((): [number, number][] =>
  allGT.map((p, i) => [
    p[0] + lcg(13, i * 3)     * sigma.value,
    p[1] + lcg(13, i * 3 + 1) * sigma.value * 0.8,
  ])
)

// Paramètre d'interpolation : α = 1 - DECAY^iter (non-linéaire)
const alpha = computed(() => 1 - Math.pow(DECAY, iter.value))

// Positions estimées courantes
const estPts = computed((): [number, number][] =>
  initEst.value.map((init, i) => {
    const gt = allGT[i]
    return [
      init[0] + alpha.value * (gt[0] - init[0]),
      init[1] + alpha.value * (gt[1] - init[1]),
    ]
  })
)

// Courbe de coût (somme des erreurs² à chaque itération)
const costCurve = computed((): number[] =>
  Array.from({ length: MAX_ITER + 1 }, (_, k) => {
    const a = 1 - Math.pow(DECAY, k)
    return initEst.value.reduce((s, p, i) => {
      const gt = allGT[i]
      const ex = p[0] + a * (gt[0] - p[0]) - gt[0]
      const ey = p[1] + a * (gt[1] - p[1]) - gt[1]
      return s + ex * ex + ey * ey
    }, 0)
  })
)

// ── Contrôle animation ────────────────────────────────────────
function launch() {
  iter.value = 0
  animating.value = true
  timer = setInterval(() => {
    if (iter.value >= MAX_ITER) { clearInterval(timer!); animating.value = false }
    else iter.value++
  }, 160)
}
function reset() {
  if (timer) clearInterval(timer)
  iter.value = 0; animating.value = false
}
watch(sigma, reset)
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Coordonnées SVG (panneau gauche) ─────────────────────────
// Monde : X ∈ [-5,5], Y ∈ [1,9]  →  SVG : x ∈ [18,248], y ∈ [155,18]
function wx(x: number) { return 18  + (x + 5) / 10 * 230 }
function wy(y: number) { return 155 - (y - 1) / 8 * 137 }

// ── Trajectoire caméra (4 keyframes) ─────────────────────────
// Vraie trajectoire — positions SVG fixes
const CAM_TRUE = [
  { x: 45,  y: 183 },
  { x: 98,  y: 179 },
  { x: 155, y: 181 },
  { x: 214, y: 179 },
]
// Drift cumulatif par keyframe (pixels vers le bas, simule accumulation d'erreur VO)
const CAM_DRIFT = [0, 7, 16, 26]

// Matrice de visibilité : VISIBILITY[camIdx][landmarkIdx]
const VISIBILITY: boolean[][] = [
  [true,  true,  false, false, false],
  [true,  true,  true,  true,  false],
  [false, true,  true,  true,  true ],
  [false, false, false, true,  true ],
]

// ── Observations : quel amer est vu depuis quelle pose ───────
// Un amer vu depuis plusieurs poses est ce qui relie ces poses entre elles :
// c'est le « bundle » de rayons que l'ajustement rend cohérent.
const focus = ref(-1)   // -1 = tous les amers
const observations = computed(() => {
  const out: { ci: number; li: number }[] = []
  VISIBILITY.forEach((row, ci) => row.forEach((seen, li) => { if (seen) out.push({ ci, li }) }))
  return out
})
const obsPerLandmark = computed(() =>
  allGT.map((_, li) => VISIBILITY.reduce((n, row) => n + (row[li] ? 1 : 0), 0)))

// Positions estimées (convergent vers vrais avec l'optimisation BA)
const camEst = computed(() =>
  CAM_TRUE.map((cam, i) => ({
    x: cam.x,
    y: cam.y + CAM_DRIFT[i] * (1 - alpha.value),
  }))
)

// ── Panneau droit : graphe coût ───────────────────────────────
const GX0 = 278, GX1 = 545, GT_G = 15, GB_G = 190
function iterX(k: number) { return GX0 + k / MAX_ITER * (GX1 - GX0) }
function costY(c: number) {
  const cm = costCurve.value[0] || 1
  return GB_G - Math.min(c / cm, 1.05) * (GB_G - GT_G)
}

const curvePts = computed(() =>
  costCurve.value.map((c, k) => `${iterX(k).toFixed(1)},${costY(c).toFixed(1)}`).join(' ')
)

// Y-axis ticks (25%, 50%, 75%, 100% of initial cost)
const yTicks = computed(() =>
  [0.25, 0.5, 0.75, 1.0].map(fr => ({
    y: costY(costCurve.value[0] * fr),
    label: (costCurve.value[0] * fr).toFixed(1),
  }))
)
const xTicks = [0, 3, 6, 9, 12, 15, 18].map(k => ({ k, x: iterX(k) }))
</script>

<template>
  <div class="ba-wrap">
    <svg viewBox="0 0 558 210" class="ba-svg">
      <defs>
        <marker id="baArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#CF1C24"/>
        </marker>
      </defs>

      <!-- ═══ LEFT PANEL : Scène 2D ═══ -->
      <rect x="2" y="2" width="265" height="206" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="133" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vue du dessus — poses + landmarks (avant/après BA)
      </text>

      <!-- Observations : un rayon par couple (pose, amer) visible.
           v-if et v-for ne peuvent pas cohabiter sur un même élément en Vue 3
           (v-if est évalué d'abord, sans accès à la variable de boucle) : la
           liste est donc aplatie dans le script. -->
      <line v-for="o in observations" :key="`obs${o.ci}-${o.li}`"
        :x1="camEst[o.ci].x" :y1="camEst[o.ci].y - 5"
        :x2="wx(estPts[o.li][0])" :y2="wy(estPts[o.li][1])"
        :stroke="focus === o.li ? '#00BDF2' : '#94a3b8'"
        :stroke-width="focus === o.li ? 1.6 : 0.8"
        :style="{ opacity: focus === -1 ? 0.42 : (focus === o.li ? 0.95 : 0.12) }"
        class="ba-ray"/>

      <!-- Vraie trajectoire (ligne verte pointillée) -->
      <polyline
        :points="CAM_TRUE.map(c => `${c.x},${c.y}`).join(' ')"
        fill="none" stroke="#25B34B" stroke-width="1.5" stroke-dasharray="4,2" style="opacity:0.6"/>

      <!-- Trajectoire estimée (ligne rouge, drift avant BA) -->
      <polyline
        :points="camEst.map(c => `${c.x},${c.y}`).join(' ')"
        fill="none" stroke="#CF1C24" stroke-width="1.5" stroke-dasharray="4,2" style="opacity:0.8"
        class="ba-traj"/>

      <!-- Vraies positions caméra (vert, fixes) -->
      <rect v-for="(cam, i) in CAM_TRUE" :key="`ctrue${i}`"
        :x="cam.x - 8" :y="cam.y - 5" width="16" height="10" rx="2"
        fill="#25B34B" stroke="white" stroke-width="1.5" style="opacity:0.7"/>

      <!-- Positions estimées caméra (rouge, bougent avec BA) -->
      <rect v-for="(cam, i) in camEst" :key="`cest${i}`"
        :x="cam.x - 8" :y="cam.y - 5" width="16" height="10" rx="2"
        fill="#CF1C24" stroke="white" stroke-width="1.5" class="ba-cam"/>

      <!-- Label drift sur dernière caméra estimée -->
      <text v-if="iter === 0"
        :x="camEst[3].x + 5" :y="camEst[3].y + 16"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">drift ↓</text>

      <!-- Landmarks vrais (verts) -->
      <g v-for="(gt, i) in allGT" :key="`gt${i}`">
        <circle :cx="wx(gt[0])" :cy="wy(gt[1])" r="7"
          fill="#25B34B" stroke="white" stroke-width="2"/>
      </g>

      <!-- Erreurs de reprojection (flèches rouge : estimé→vrai) visible si iter < MAX -->
      <g v-for="(est, i) in estPts" :key="`err${i}`"
        v-show="iter < MAX_ITER - 1">
        <line
          :x1="wx(est[0])" :y1="wy(est[1])"
          :x2="wx(allGT[i][0]) + (wx(est[0]) > wx(allGT[i][0]) ? -8 : 8)"
          :y2="wy(allGT[i][1]) + (wy(est[1]) > wy(allGT[i][1]) ? -8 : 8)"
          stroke="#CF1C24" stroke-width="1.3" stroke-dasharray="2,1"
          marker-end="url(#baArr)"/>
      </g>

      <!-- Combien de poses voient l'amer mis en évidence -->
      <text v-if="focus >= 0"
        :x="wx(estPts[focus][0]) + 15" :y="wy(estPts[focus][1]) - 13"
        style="font-size:8.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        vu depuis {{ obsPerLandmark[focus] }} poses
      </text>

      <!-- Landmarks estimés (rouge) -->
      <circle v-for="(est, i) in estPts" :key="`est${i}`"
        :cx="wx(est[0])" :cy="wy(est[1])" r="6"
        fill="#CF1C24" stroke="white" stroke-width="1.8" class="ba-pt"/>

      <!-- Légende -->
      <circle cx="18" cy="200" r="5" fill="#25B34B" stroke="white" stroke-width="1.5"/>
      <text x="27" y="203"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">vrai</text>
      <circle cx="58" cy="200" r="5" fill="#CF1C24" stroke="white" stroke-width="1.5"/>
      <text x="67" y="203"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">estimé</text>
      <!-- Compteur d'observations : en haut du panneau, la ligne de légende du
           bas est déjà traversée par les rayons -->
      <line x1="176" y1="24" x2="192" y2="24" stroke="#00BDF2" stroke-width="1.6"/>
      <text x="196" y="27"
        style="font-size:8px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        {{ observations.length }} observations
      </text>

      <!-- ═══ RIGHT PANEL : Coût ═══ -->
      <rect x="271" y="2" width="285" height="206" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="413" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Coût χ² = Σ ||z - h(T,P)||²  (par itération)
      </text>

      <!-- Grid -->
      <line v-for="tk in yTicks" :key="tk.y"
        :x1="GX0" :y1="tk.y" :x2="GX1" :y2="tk.y"
        stroke="#E2E8F0" stroke-width="0.8" stroke-dasharray="3,2"/>

      <!-- Axes -->
      <line :x1="GX0" :y1="GB_G" :x2="GX1 + 4" :y2="GB_G" stroke="#475569" stroke-width="1.2"/>
      <line :x1="GX0" :y1="GT_G - 4" :x2="GX0" :y2="GB_G" stroke="#475569" stroke-width="1.2"/>

      <!-- X ticks -->
      <g v-for="tk in xTicks" :key="tk.k">
        <line :x1="tk.x" :y1="GB_G" :x2="tk.x" :y2="GB_G + 4" stroke="#475569" stroke-width="1"/>
        <text :x="tk.x" :y="GB_G + 13" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ tk.k }}</text>
      </g>
      <text :x="(GX0+GX1)/2" :y="GB_G + 24" text-anchor="middle"
        style="font-size:9px;fill:#475569;font-style:italic;font-family:sans-serif">itération</text>

      <!-- Y ticks -->
      <g v-for="tk in yTicks" :key="`y${tk.y}`">
        <line :x1="GX0 - 4" :y1="tk.y" :x2="GX0" :y2="tk.y" stroke="#475569" stroke-width="1"/>
        <text :x="GX0 - 6" :y="tk.y + 3" text-anchor="end"
          style="font-size:7px;fill:#475569;font-family:sans-serif">{{ tk.label }}</text>
      </g>
      <text x="284" :y="(GT_G + GB_G) / 2" text-anchor="middle"
        :transform="`rotate(-90, 284, ${(GT_G + GB_G) / 2})`"
        style="font-size:9px;fill:#475569;font-style:italic;font-family:sans-serif">χ²</text>

      <!-- Courbe de coût -->
      <polyline :points="curvePts"
        fill="none" stroke="#F15A22" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Partie visitée (orange vif) -->
      <polyline
        :points="costCurve.slice(0, iter+1).map((c,k) => `${iterX(k).toFixed(1)},${costY(c).toFixed(1)}`).join(' ')"
        fill="none" stroke="#CF1C24" stroke-width="3"
        stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Guide lignes au point courant -->
      <line :x1="GX0" :y1="costY(costCurve[iter])" :x2="iterX(iter)" :y2="costY(costCurve[iter])"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.4"/>
      <line :x1="iterX(iter)" :y1="GB_G" :x2="iterX(iter)" :y2="costY(costCurve[iter])"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.4"/>

      <!-- Point courant -->
      <circle :cx="iterX(iter)" :cy="costY(costCurve[iter])" r="7"
        fill="#CF1C24" stroke="white" stroke-width="2.5" class="ba-dot"/>

      <!-- Label χ² courant -->
      <text :x="iterX(iter) + 10" :y="costY(costCurve[iter]) - 6"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        χ² = {{ costCurve[iter]?.toFixed(2) }}
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="ba-controls">
      <label class="ba-sl">
        <span>σ =</span>
        <strong>{{ sigma.toFixed(1) }}</strong>
        <span class="ba-unit">px</span>
        <input type="range" v-model.number="sigma" min="0.2" max="3.0" step="0.1"/>
      </label>
      <label class="ba-sl">
        <span>itér. =</span>
        <strong>{{ iter }}</strong>
        <span class="ba-unit">/ {{ MAX_ITER }}</span>
        <input type="range" v-model.number="iter" :min="0" :max="MAX_ITER" step="1"/>
      </label>
      <label class="ba-sl ba-focus">
        <span>amer :</span>
        <select v-model.number="focus">
          <option :value="-1">tous</option>
          <option v-for="(n, i) in obsPerLandmark" :key="i" :value="i">L{{ i + 1 }} — {{ n }} poses</option>
        </select>
      </label>
      <button class="ba-btn" @click="launch" :disabled="animating">
        {{ animating ? '⟳ En cours…' : '▶ Optimiser' }}
      </button>
      <button class="ba-btn ba-reset" @click="reset">↺</button>
      <div class="ba-result">
        χ² : <strong>{{ costCurve[iter]?.toFixed(2) }}</strong>
        (réduit de <span class="ba-pct">{{ (100*(1 - costCurve[iter]/Math.max(costCurve[0],0.01))).toFixed(0) }}%</span>)
      </div>
    </div>
  </div>
</template>

<style scoped>
.ba-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ba-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.ba-pt   { transition: cx 0.12s ease, cy 0.12s ease; }
.ba-ray  { transition: x1 0.12s ease, y1 0.12s ease, x2 0.12s ease, y2 0.12s ease; }
.ba-dot  { transition: cx 0.12s ease, cy 0.12s ease; }
.ba-cam  { transition: y 0.12s ease; }
.ba-traj { transition: d 0.12s ease; }

.ba-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.ba-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ba-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.ba-unit { color: #94a3b8; font-size: 0.65rem; }
.ba-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ba-focus select {
  font-family: monospace; font-size: 0.68rem; color: #334155;
  border: 1.5px solid #CBD5E1; border-radius: 4px; padding: 1px 4px; background: white; cursor: pointer;
}

.ba-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.ba-btn:hover:not(:disabled) { background: #CF1C24; color: white; }
.ba-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ba-btn.ba-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }

.ba-result {
  font-family: monospace; font-size: 0.70rem; color: #334155;
  padding: 3px 10px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 5px;
}
.ba-result strong { color: #CF1C24; font-weight: 700; }
.ba-pct { color: #25B34B; font-weight: 700; }
</style>
