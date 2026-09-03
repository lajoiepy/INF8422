<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{ showSparsity?: boolean }>(), { showSparsity: true })

// ── Configuration ─────────────────────────────────────────────
const N = ref(4)   // nombre de keyframes (2–6)
const M = 3        // landmarks fixes

// Pour chaque landmark l, les keyframes qui le voient (pattern fixe adapté à N)
// L1 (milieu) voit 3 poses quand N≥3
function visibleKF(l: number, nKF: number): number[] {
  if (l === 0) return [0, 1].filter(k => k < nKF)
  if (l === 1) {
    const mid = Math.floor((nKF - 1) / 2)
    return [mid - 1, mid, mid + 1].filter(k => k >= 0 && k < nKF)
  }
  if (l === 2) return [nKF - 2, nKF - 1].filter(k => k >= 0 && k < nKF)
  return []
}

// ── Panneau gauche : graphe de facteurs ───────────────────────
// Zone SVG : 0-266, hauteur 215
const KF_Y = 50     // y des nœuds poses (rang 1)
const BIAS_Y = 108  // y des nœuds biais (rang 2)
const LM_Y = 165    // y des nœuds landmarks (rang 3)

const PW = computed(() => props.showSparsity ? 265 : 416)

function kfX(i: number): number {
  return 20 + i * ((PW.value - 40) / Math.max(N.value - 1, 1))
}
function lmX(j: number): number {
  const step = (PW.value - 60) / Math.max(M - 1, 1)
  return 30 + j * step
}

// Facteur IMU entre deux KF consécutifs
const imuFactors = computed(() =>
  Array.from({ length: N.value - 1 }, (_, i) => ({
    x: (kfX(i) + kfX(i + 1)) / 2, y: KF_Y,
  }))
)

// ── Panneau droit : structure de la Hessienne ─────────────────
// Variables : K_1..K_N, L_1..L_M
// Taille totale T = N + M blocs
const T = computed(() => N.value + M)

const HSOX = 278, HSOY = 15  // coin supérieur gauche de la Hessienne dans le SVG
const BSIZE = computed(() => Math.min(Math.floor(195 / T.value), 25))  // taille d'un bloc

// Remplissage de chaque bloc (i,j) — vrai si non nul
function isNonZero(i: number, j: number): number {
  // 0 = vide, 1 = IMU, 2 = vision, 3 = diagonal
  if (i === j) return 3                  // diagonale toujours non nulle
  // IMU : entre keyframes consécutives
  if (i < N.value && j < N.value && Math.abs(i - j) === 1) return 1
  // Vision : entre KF k et landmark l
  if (i < N.value && j >= N.value) {
    const l = j - N.value
    if (visibleKF(l, N.value).includes(i)) return 2
  }
  if (j < N.value && i >= N.value) {
    const l = i - N.value
    if (visibleKF(l, N.value).includes(j)) return 2
  }
  return 0
}

const blockColors = ['none', '#F15A22', '#00BDF2', '#CF1C24']
const blockLabels = ['', 'IMU', 'Vision', 'diag.']

// Grille de la Hessienne
const cells = computed(() => {
  const res = []
  const T_val = T.value
  const bs = BSIZE.value
  for (let i = 0; i < T_val; i++) {
    for (let j = 0; j < T_val; j++) {
      const nz = isNonZero(i, j)
      if (nz > 0) {
        res.push({
          x: HSOX + j * bs, y: HSOY + i * bs,
          s: bs - 1, color: blockColors[nz],
        })
      }
    }
  }
  return res
})

// Labels de la Hessienne
const hessLabels = computed(() => {
  const T_val = T.value
  const bs = BSIZE.value
  return Array.from({ length: T_val }, (_, i) => ({
    label: i < N.value ? `K${i+1}` : `L${i-N.value+1}`,
    x: HSOX + i * bs + bs / 2,
    y: HSOY - 4,
    ry: HSOY + i * bs + bs / 2 + 3.5,
  }))
})

const HESS_SIZE = computed(() => T.value * BSIZE.value)
</script>

<template>
  <div class="ifa-wrap">
    <svg :viewBox="props.showSparsity ? '0 0 558 215' : '0 0 420 215'" class="ifa-svg">
      <!-- ═══ LEFT PANEL : Graphe de facteurs ═══ -->
      <rect x="2" y="2" :width="props.showSparsity ? 265 : 416" height="211" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text :x="PW / 2" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Graphe de facteurs VIO
      </text>

      <!-- ① Arêtes visuelles (Pose ↔ Landmark) — dessinées en premier (sous tout) -->
      <g v-for="l in M" :key="`va${l}`">
        <line v-for="k in visibleKF(l - 1, N)" :key="`va${l}${k}`"
          :x1="kfX(k)" :y1="KF_Y + 16"
          :x2="lmX(l - 1)" :y2="LM_Y - 10"
          stroke="#00BDF2" stroke-width="1.3" stroke-dasharray="3,2" style="opacity:0.6"/>
      </g>

      <!-- ② Ligne verticale IMU rect → biais (dessinée avant les rects) -->
      <g v-for="(f, i) in imuFactors" :key="`ibias${i}`">
        <line :x1="f.x" :y1="KF_Y + 8" :x2="f.x" :y2="BIAS_Y - 9"
          stroke="#F15A22" stroke-width="1.5" stroke-dasharray="3,2"/>
      </g>

      <!-- ③ Facteur IMU (rectangle + lignes horizontales vers poses) -->
      <g v-for="(f, i) in imuFactors" :key="`imu${i}`">
        <line :x1="kfX(i) + 16" :y1="KF_Y" :x2="f.x - 12" :y2="KF_Y"
          stroke="#F15A22" stroke-width="2.5"/>
        <line :x1="f.x + 12" :y1="KF_Y" :x2="kfX(i + 1) - 16" :y2="KF_Y"
          stroke="#F15A22" stroke-width="2.5"/>
        <rect :x="f.x - 12" :y="KF_Y - 8" width="24" height="16" rx="3"
          fill="#F15A22" stroke="white" stroke-width="1.2"/>
        <text :x="f.x" :y="KF_Y + 4" text-anchor="middle"
          style="font-size:7px;fill:white;font-weight:700;font-family:sans-serif">IMU</text>
      </g>

      <!-- ④ Nœuds biais (un par facteur IMU) -->
      <g v-for="(f, i) in imuFactors" :key="`bias${i}`">
        <circle :cx="f.x" :cy="BIAS_Y" r="9"
          fill="#64748b" stroke="white" stroke-width="1.8"/>
        <text :x="f.x" :y="BIAS_Y + 4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">b</text>
      </g>

      <!-- ⑤ Nœuds poses (cercles) -->
      <g v-for="i in N" :key="`kf${i}`">
        <circle :cx="kfX(i - 1)" :cy="KF_Y" r="16"
          fill="#475569" stroke="white" stroke-width="2"/>
        <text :x="kfX(i - 1)" :y="KF_Y + 4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">T{{ i }}</text>
      </g>

      <!-- ⑥ Nœuds landmarks (cercles — variables estimées) -->
      <g v-for="j in M" :key="`lm${j}`">
        <circle :cx="lmX(j - 1)" :cy="LM_Y" r="10"
          fill="#00BDF2" stroke="white" stroke-width="1.8"/>
        <text :x="lmX(j - 1)" :y="LM_Y + 4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">L{{ j }}</text>
      </g>

      <!-- Légende — variables (row 1) -->
      <circle cx="16" cy="190" r="6" fill="#475569" stroke="white" stroke-width="1.2"/>
      <text x="26" y="194" style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">Pose odométrie</text>
      <circle cx="105" cy="190" r="5" fill="#64748b" stroke="white" stroke-width="1.2"/>
      <text x="114" y="194" style="font-size:7px;fill:#64748b;font-weight:700;font-family:sans-serif">Biais</text>
      <circle cx="148" cy="190" r="5" fill="#00BDF2" stroke="white" stroke-width="1.2"/>
      <text x="157" y="194" style="font-size:7px;fill:#00BDF2;font-weight:700;font-family:sans-serif">Landmark</text>
      <!-- Légende — contraintes (row 2) -->
      <text :x="PW / 2" y="208" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        ● cercles = variables estimées  ·  ■ rectangles = contraintes / facteurs
      </text>

      <!-- ═══ RIGHT PANEL : Hessienne ═══ -->
      <g v-if="props.showSparsity">
        <rect x="271" y="2" width="285" height="211" fill="#f8fafc" rx="5"
          stroke="#CBD5E1" stroke-width="1.2"/>
        <text x="413" y="13" text-anchor="middle"
          style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
          Structure creuse de la Hessienne H = J ᵀJ
        </text>

        <!-- Arrière-plan grille Hessienne -->
        <rect :x="HSOX" :y="HSOY" :width="HESS_SIZE" :height="HESS_SIZE"
          fill="#E2E8F0" rx="2"/>

        <!-- Blocs non-nuls -->
        <rect v-for="(c, idx) in cells" :key="idx"
          :x="c.x + 0.5" :y="c.y + 0.5" :width="c.s" :height="c.s"
          :fill="c.color" rx="1" style="opacity:0.9"/>

        <!-- Labels colonnes (K1..KN, L1..LM) -->
        <text v-for="lbl in hessLabels" :key="`lx${lbl.label}`"
          :x="lbl.x" :y="lbl.y" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-weight:700;font-family:sans-serif">
          {{ lbl.label }}
        </text>
        <!-- Labels lignes -->
        <text v-for="lbl in hessLabels" :key="`ly${lbl.label}`"
          :x="HSOX - 4" :y="lbl.ry" text-anchor="end"
          style="font-size:7.5px;fill:#475569;font-weight:700;font-family:sans-serif">
          {{ lbl.label }}
        </text>

        <!-- Légende Hessienne -->
        <rect :x="HSOX" y="186" width="10" height="10" rx="1" fill="#CF1C24" style="opacity:0.9"/>
        <text :x="HSOX + 14" y="195" style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">diag.</text>
        <rect :x="HSOX + 45" y="186" width="10" height="10" rx="1" fill="#F15A22" style="opacity:0.9"/>
        <text :x="HSOX + 59" y="195" style="font-size:7.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">IMU</text>
        <rect :x="HSOX + 85" y="186" width="10" height="10" rx="1" fill="#00BDF2" style="opacity:0.9"/>
        <text :x="HSOX + 99" y="195" style="font-size:7.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">Vision</text>
        <text :x="HSOX + 140" y="195" style="font-size:7.5px;fill:#64748b;font-style:italic;font-family:sans-serif">
          → creuse en "pointe de flèche" !
        </text>
      </g>
    </svg>

    <!-- Contrôles -->
    <div class="ifa-controls">
      <label class="ifa-sl">
        <span>N keyframes =</span>
        <strong>{{ N }}</strong>
        <input type="range" v-model.number="N" min="2" max="6" step="1"/>
      </label>
      <div v-if="props.showSparsity" class="ifa-result">
        <span>Taille Hessienne : </span>
        <strong>{{ T }}×{{ T }}</strong>
        <span> blocs (</span>
        <strong>{{ cells.length }}</strong>
        <span> non-nuls / </span>
        <strong>{{ T * T }}</strong>
        <span>) — creusité : </span>
        <strong class="ifa-sparsity">{{ (100*(1 - cells.length/(T*T))).toFixed(0) }}%</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ifa-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ifa-svg  { height: 250px; width: auto; max-width: 100%; display: block; }

.ifa-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

.ifa-sl {
  display: flex; align-items: center; gap: 6px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ifa-sl strong { color: #CF1C24; min-width: 18px; }
.ifa-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.ifa-result {
  font-family: monospace; font-size: 0.70rem; color: #334155;
  padding: 3px 10px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 5px;
}
.ifa-result strong { color: #CF1C24; font-weight: 700; }
.ifa-sparsity { color: #25B34B !important; }
</style>
