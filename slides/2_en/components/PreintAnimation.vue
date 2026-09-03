<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Paramètres ────────────────────────────────────────────
// Fenêtre IMU : T=10s, accélération vraie a=2 m/s² (robot accélère)
const T_WIN = 10      // durée fenêtre i→j (s)
const A_TRUE = 2.0    // accélération vraie m/s²

const ba   = ref(0.10)   // biais accéléromètre courant
const dba  = ref(0.00)   // δb : changement de biais
const vi   = ref(18.0)   // décalage position robot 2 (montre indépendance)

// ── Math pré-intégration ──────────────────────────────────
// Δp_ij = ∫∫ (a_true - ba) dt² = ½(A_TRUE - ba) * T²
const dp_preint = computed(() => 0.5 * (A_TRUE - ba.value) * T_WIN ** 2)
const dv_preint = computed(() => (A_TRUE - ba.value) * T_WIN)

// Correction exacte avec nouveau biais ba+dba
const dp_exact  = computed(() => 0.5 * (A_TRUE - ba.value - dba.value) * T_WIN ** 2)
// Correction linéaire via Jacobien J_p = -½T²
const J_p = -0.5 * T_WIN ** 2    // = -50 s²
const dp_linear = computed(() => dp_preint.value + J_p * dba.value)

// Erreur de linéarisation (nulle en 1D position !)
const linError = computed(() => Math.abs(dp_exact.value - dp_linear.value))

// ── SVG gauche : indépendance de l'état global ────────────
// Deux robots à des positions globales différentes
// p_i_1 = 0 (fixe), p_i_2 = 0 + vi (contrôlé par slider vi)
// Les deux ont le même Δp_ij → positons finales décalées de vi aussi

// Échelle : Δp_preint max = ½*(2-0)*100 = 100m → 120px max
const DP_SCALE   = 1.2   // px/m, donc 100m → 120px
const DP_MAX_SVG = 120   // px

const dpSvg = computed(() => Math.min(dp_preint.value * DP_SCALE, DP_MAX_SVG))
const viSvg = computed(() => Math.min(vi.value * 2.5, 70))  // vi slider 0-30m → 0-75px

// Robot 1 : position initiale fixe à y=60 (SVG)
const R1_Y   = 62
// Robot 2 : position initiale à R1_Y + viSvg
const r2Y    = computed(() => R1_Y + viSvg.value)

// ── SVG droit : correction Jacobien ──────────────────────
const GX0 = 285, GX1 = 545
const GT = 15, GB = 185

// Y-axis : Δp from 0 to dp_preint+30 (pour montrer correction)
const dpYmax = computed(() => Math.max(dp_preint.value + 30, 30))
function dpToY(dp: number): number {
  return GB - Math.min(Math.max(dp, 0), dpYmax.value) / dpYmax.value * (GB - GT)
}
const dpToYraw = (dp: number) =>
  GB - Math.min(Math.max(dp, 0), dpYmax.value) / dpYmax.value * (GB - GT)

// X-axis : δb from -0.3 to +0.3
const DBmin = -0.30, DBmax = 0.30
function dbToX(db: number): number {
  return GX0 + (db - DBmin) / (DBmax - DBmin) * (GX1 - GX0)
}

// Courbe Δp(δb) : exact (droite, car 1D position)
const exactCurve = computed(() => {
  const pts: string[] = []
  for (let db = DBmin; db <= DBmax + 0.001; db += 0.01) {
    const dp = dp_preint.value + J_p * db
    pts.push(`${dbToX(db).toFixed(1)},${dpToYraw(dp).toFixed(1)}`)
  }
  return pts.join(' ')
})

// Point courant sur la courbe (à δb actuel)
const dotX = computed(() => dbToX(dba.value))
const dotY = computed(() => dpToYraw(dp_exact.value))

// Ticks δb axis
const dbTicks = [-0.2, -0.1, 0, 0.1, 0.2, 0.3]
  .filter(v => v >= DBmin && v <= DBmax)
  .map(v => ({ v, x: dbToX(v) }))

// Y ticks
const yTicks = computed(() =>
  [0.25, 0.5, 0.75, 1.0].map(fr => ({
    y: dpToYraw(dpYmax.value * fr),
    label: (dpYmax.value * fr).toFixed(0),
  }))
)
</script>

<template>
  <div class="pi-wrap">
    <svg viewBox="0 0 550 220" class="pi-svg">
      <defs>
        <marker id="piArr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#475569"/>
        </marker>
        <marker id="piArrR" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#CF1C24"/>
        </marker>
        <marker id="piArrB" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#00BDF2"/>
        </marker>
      </defs>

      <!-- ═══ LEFT PANEL : Indépendance de l'état global ═══ -->
      <rect x="2" y="2" width="265" height="216" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="133" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Δp_ij indépendant de la pose globale
      </text>

      <!-- X-axis : temps i → j -->
      <text x="18" y="200"
        style="font-size:8px;fill:#94a3b8;font-family:sans-serif">i</text>
      <text x="240" y="200"
        style="font-size:8px;fill:#94a3b8;font-family:sans-serif">j</text>
      <line x1="25" y1="195" x2="245" y2="195"
        stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="2,2"/>

      <!-- IMU ticks -->
      <g v-for="k in 14" :key="k">
        <line :x1="25 + k*15" y1="193" :x2="25 + k*15" y2="197"
          stroke="#94a3b8" stroke-width="1"/>
      </g>
      <text x="110" y="208"
        text-anchor="middle" style="font-size:7.5px;fill:#94a3b8;font-family:sans-serif">
        mesures IMU (T = 10 s)
      </text>

      <!-- Capsule pré-intégrée -->
      <rect x="30" y="178" width="205" height="14" rx="3"
        fill="#e0f2fe" stroke="#00BDF2" stroke-width="1.2"/>
      <text x="133" y="188" text-anchor="middle"
        style="font-size:7.5px;fill:#0369a1;font-weight:700;font-family:sans-serif">
        Δp = {{ dp_preint.toFixed(1) }} m · Δv = {{ dv_preint.toFixed(1) }} m/s
      </text>

      <!-- Robot 1 (position initiale fixe) -->
      <circle cx="30" :cy="R1_Y" r="8" fill="#00BDF2" stroke="white" stroke-width="2"/>
      <text x="30" :y="R1_Y - 12" text-anchor="middle"
        style="font-size:8px;fill:#0369a1;font-weight:700;font-family:sans-serif">p_i</text>
      <!-- Arrow robot 1 -->
      <line x1="40" :y1="R1_Y" :x2="40 + dpSvg - 2" :y2="R1_Y"
        stroke="#00BDF2" stroke-width="2.5" marker-end="url(#piArrB)" class="pi-arrow"/>
      <circle :cx="40 + dpSvg" :cy="R1_Y" r="8"
        fill="#3B82F6" stroke="white" stroke-width="2" class="pi-dot"/>
      <!-- Δp label -->
      <text :x="40 + dpSvg/2" :y="R1_Y - 10" text-anchor="middle"
        style="font-size:8.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        Δp = {{ dp_preint.toFixed(1) }} m
      </text>

      <!-- Robot 2 (position initiale différente) — visible seulement si assez séparé -->
      <g v-if="viSvg > 18">
        <circle cx="30" :cy="r2Y" r="8" fill="#F15A22" stroke="white" stroke-width="2"
          class="pi-dot2"/>
        <text x="30" :y="r2Y - 12" text-anchor="middle"
          style="font-size:8px;fill:#ea580c;font-weight:700;font-family:sans-serif">p_i'</text>
        <!-- Arrow robot 2 -->
        <line x1="40" :y1="r2Y" :x2="40 + dpSvg - 2" :y2="r2Y"
          stroke="#F15A22" stroke-width="2.5" marker-end="url(#piArr)" class="pi-arrow2"/>
        <circle :cx="40 + dpSvg" :cy="r2Y" r="8"
          fill="#ea580c" stroke="white" stroke-width="2" class="pi-dot2"/>
        <!-- Δp label 2 -->
        <text :x="40 + dpSvg/2" :y="r2Y + 17" text-anchor="middle"
          style="font-size:8.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">
          Δp = {{ dp_preint.toFixed(1) }} m ✓
        </text>
        <!-- Accolade verticale montrant que les deux Δp sont égaux -->
        <line :x1="40 + dpSvg + 20" :y1="R1_Y"
          :x2="40 + dpSvg + 20" :y2="r2Y"
          stroke="#64748b" stroke-width="1" stroke-dasharray="2,2"/>
        <text :x="40 + dpSvg + 30" :y="(R1_Y + r2Y) / 2 + 4"
          style="font-size:8px;fill:#64748b;font-style:italic;font-family:sans-serif">
          même Δp
        </text>
      </g>

      <!-- ═══ RIGHT PANEL : Correction Jacobien ═══ -->
      <rect x="273" y="2" width="275" height="216" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="411" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Correction de biais : Δp(ba+δb) = Δp(ba) + J_p·δb
      </text>

      <!-- Grid -->
      <line v-for="tk in yTicks" :key="tk.y"
        :x1="GX0" :y1="tk.y" :x2="GX1" :y2="tk.y"
        stroke="#E2E8F0" stroke-width="0.8" stroke-dasharray="3,2"/>
      <!-- Ligne δb=0 -->
      <line :x1="dbToX(0)" :y1="GT" :x2="dbToX(0)" :y2="GB"
        stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="2,2"/>

      <!-- Axes -->
      <line :x1="GX0" :y1="GB" :x2="GX1 + 5" :y2="GB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="GX0" :y1="GT - 4" :x2="GX0" :y2="GB" stroke="#475569" stroke-width="1.2"/>

      <!-- X ticks δb -->
      <g v-for="tk in dbTicks" :key="tk.v">
        <line :x1="tk.x" :y1="GB" :x2="tk.x" :y2="GB + 4" stroke="#475569" stroke-width="1"/>
        <text :x="tk.x" :y="GB + 13" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ tk.v.toFixed(1) }}</text>
      </g>
      <text :x="(GX0+GX1)/2" :y="GB + 24" text-anchor="middle"
        style="font-size:9px;fill:#475569;font-family:sans-serif;font-style:italic">δb (m/s²)</text>

      <!-- Y ticks Δp -->
      <g v-for="tk in yTicks" :key="`y${tk.y}`">
        <line :x1="GX0 - 4" :y1="tk.y" :x2="GX0" :y2="tk.y" stroke="#475569" stroke-width="1"/>
        <text :x="GX0 - 6" :y="tk.y + 3" text-anchor="end"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ tk.label }}</text>
      </g>
      <text :x="280" :y="(GT+GB)/2" text-anchor="middle"
        :transform="`rotate(-90, 280, ${(GT+GB)/2})`"
        style="font-size:9px;fill:#475569;font-family:sans-serif;font-style:italic">Δp (m)</text>

      <!-- Courbe Δp(δb) — droite (exact = linéaire en 1D) -->
      <polyline :points="exactCurve"
        fill="none" stroke="#F15A22" stroke-width="2.5"
        stroke-linejoin="round"/>

      <!-- Annotation courbe -->
      <text :x="dbToX(0.1)" :y="dpToYraw(dp_preint) - 8"
        style="font-size:8.5px;fill:#F15A22;font-weight:700;font-family:sans-serif;font-style:italic">
        Δp(ba+δb) = Δp(ba) + J_p·δb
      </text>

      <!-- Guide lignes au point courant -->
      <line :x1="GX0" :y1="dotY" :x2="dotX" :y2="dotY"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.45"/>
      <line :x1="dotX" :y1="GB" :x2="dotX" :y2="dotY"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.45"/>

      <!-- Point courant -->
      <circle :cx="dotX" :cy="dotY" r="7"
        fill="#CF1C24" stroke="white" stroke-width="2.5" class="pi-gd"/>

      <!-- Note en bas -->
      <text x="411" y="218" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-style:italic;font-family:sans-serif">
        En 3D (rotation SO(3)) : correction approx. au 1er ordre
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="pi-controls">
      <label class="pi-sl">
        <span>ba =</span>
        <strong>{{ ba.toFixed(2) }}</strong>
        <span class="pi-unit">m/s²</span>
        <input type="range" v-model.number="ba" min="0.00" max="0.50" step="0.01"/>
      </label>
      <label class="pi-sl">
        <span>δb =</span>
        <strong>{{ dba >= 0 ? '+' : '' }}{{ dba.toFixed(2) }}</strong>
        <span class="pi-unit">m/s²</span>
        <input type="range" v-model.number="dba" min="-0.30" max="0.30" step="0.01"/>
      </label>
      <label class="pi-sl">
        <span>p_i' =</span>
        <strong>{{ vi.toFixed(0) }}</strong>
        <span class="pi-unit">m (pose initiale robot 2)</span>
        <input type="range" v-model.number="vi" min="0" max="30" step="1"/>
      </label>
      <div class="pi-result">
        Δp = <strong>{{ dp_exact.toFixed(2) }} m</strong>
        <span class="pi-exact">= Δp_preint + J_p·δb = {{ dp_linear.toFixed(2) }} m ✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pi-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.pi-svg  { height: 250px; width: auto; max-width: 100%; display: block; }

.pi-arrow  { transition: x2 0.1s ease; }
.pi-arrow2 { transition: x2 0.1s ease, y1 0.1s ease, y2 0.1s ease; }
.pi-dot    { transition: cx 0.1s ease; }
.pi-dot2   { transition: cy 0.1s ease, cx 0.1s ease; }
.pi-gd     { transition: cx 0.08s ease, cy 0.08s ease; }

.pi-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.pi-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.pi-sl strong { color: #CF1C24; min-width: 36px; display: inline-block; }
.pi-unit { color: #94a3b8; font-size: 0.65rem; }
.pi-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.pi-result {
  font-family: monospace; font-size: 0.70rem; color: #334155;
  padding: 3px 10px; background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 5px;
}
.pi-result strong { color: #CF1C24; font-weight: 700; }
.pi-exact { color: #25B34B; font-size: 0.65rem; margin-left: 8px; }
</style>
