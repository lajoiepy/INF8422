<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Sliders ───────────────────────────────────────────────
const f  = ref(500)    // focal length in px
const b  = ref(0.20)   // baseline in metres
const d  = ref(5)      // disparity in px
const dd = ref(0.5)    // erreur d'appariement ±Δd (px)

// ── Core formula ──────────────────────────────────────────
const Z    = computed(() => f.value * b.value / d.value)

// ── Propagation de l'erreur de disparité ──────────────────
// d sous-estimée → le point paraît PLUS LOIN, et inversement.
// dZ/dd = −f·b/d² = −Z²/(f·b) : c'est la pente de la courbe, donc le même Δd
// coûte d'autant plus cher que la courbe est raide (petite disparité).
const dLo    = computed(() => Math.max(d.value - dd.value, 0.25))
const dHi    = computed(() => d.value + dd.value)
const Zfar   = computed(() => f.value * b.value / dLo.value)
const Znear  = computed(() => f.value * b.value / dHi.value)
const dZ     = computed(() => (Zfar.value - Znear.value) / 2)
const slope  = computed(() => f.value * b.value / (d.value * d.value))  // |dZ/dd| en m/px
const relErr = computed(() => dZ.value / Z.value * 100)
// ── Échelle de profondeur, PARTAGÉE par les deux panneaux ─
// Une seule graduation en mètres : une même hauteur = un même Z à gauche
// comme à droite. (Avant, la vue du dessus était normalisée par f·b, si bien
// que Z/Zmax valait 1/d : changer f ou b changeait la valeur de Z sans
// déplacer le point — exactement ce qu'il ne faut pas.)
const ZMAX  = 100       // m — plafond de l'échelle
const Y_Z0  = 186       // y de Z = 0 (ligne des caméras / axe des abscisses)
const Y_ZM  = 20        // y de Z = ZMAX
function zToY(Zv: number): number {
  return Y_Z0 - Math.min(Math.max(Zv, 0), ZMAX) / ZMAX * (Y_Z0 - Y_ZM)
}
const outOfScale = computed(() => Z.value > ZMAX)

// ── Left panel: geometry (top-down view) ──────────────────
const BL_CTR    = 140   // horizontal centre of left panel
const CAM_Y     = Y_Z0  // y of camera baseline
const MAX_B_SVG = 150   // px when b=0.5m

const bSvg  = computed(() => b.value / 0.5 * MAX_B_SVG)
const camLx = computed(() => BL_CTR - bSvg.value / 2)
const camRx = computed(() => BL_CTR + bSvg.value / 2)
const pY     = computed(() => zToY(Z.value))
const pYnear = computed(() => zToY(Znear.value))
const pYfar  = computed(() => zToY(Zfar.value))
const pX   = BL_CTR   // point always at horizontal centre

// ── Right panel: Z(d) graph ───────────────────────────────
const GL = 308, GR = 568, GT = Y_ZM, GB = Y_Z0

function dToX(dv: number): number {
  return GL + (dv - 1) / 49 * (GR - GL)
}
const ZToY = zToY          // même échelle des deux côtés
const ZMAX_FIXED = ZMAX    // conservé pour les graduations existantes

// Curve as polyline points
const curvePts = computed(() => {
  const pts: string[] = []
  for (let di = 1; di <= 50; di += 0.5) {
    const Zi = f.value * b.value / di
    pts.push(`${dToX(di).toFixed(1)},${ZToY(Zi).toFixed(1)}`)
  }
  return pts.join(' ')
})

const dotX = computed(() => dToX(d.value))
const dotY = computed(() => ZToY(Z.value))
const bandX0   = computed(() => dToX(Math.max(d.value - dd.value, 1)))
const bandX1   = computed(() => dToX(Math.min(d.value + dd.value, 50)))
const barYfar  = computed(() => ZToY(Zfar.value))
const barYnear = computed(() => ZToY(Znear.value))

// Y-axis ticks fixed — curve moves, labels stay constant
const yTicks = [0.25, 0.5, 0.75, 1.0].map(fr => ({
  y: ZToY(ZMAX_FIXED * fr),
  label: String(Math.round(ZMAX_FIXED * fr)),
}))

// X-axis ticks
const xTicks = [10, 20, 30, 40, 50].map(dv => ({ dv, x: dToX(dv) }))
</script>

<template>
  <div class="st-wrap">
    <svg viewBox="0 0 580 220" class="st-svg">
      <defs>
        <!-- Grey double-arrow for b -->
        <marker id="stAb"  markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#00BDF2"/></marker>
        <marker id="stAbR" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#00BDF2"/></marker>
        <!-- Red double-arrow for Z -->
        <marker id="stAz"  markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#CF1C24"/></marker>
        <marker id="stAzR" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
          <path d="M7,0 L0,3.5 L7,7 Z" fill="#CF1C24"/></marker>
      </defs>

      <!-- ═══ LEFT PANEL — Geometry ═══ -->
      <rect x="2" y="2" width="268" height="216" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Axe de profondeur, gradué en mètres : c'est LUI qui donne son sens
           à la hauteur de P, et il est identique à l'axe Z du graphe de droite -->
      <line :x1="38" :y1="Y_ZM - 4" :x2="38" :y2="Y_Z0" stroke="#475569" stroke-width="1.2"/>
      <g v-for="tk in yTicks" :key="`gy${tk.y}`">
        <line :x1="38" :y1="tk.y" :x2="264" :y2="tk.y"
          stroke="#E2E8F0" stroke-width="0.8" stroke-dasharray="3,2"/>
        <line :x1="34" :y1="tk.y" :x2="38" :y2="tk.y" stroke="#475569" stroke-width="1"/>
        <text :x="32" :y="tk.y + 3" text-anchor="end"
          style="font-size:8px;fill:#475569;font-family:sans-serif">{{ tk.label }}</text>
      </g>
      <line :x1="38" :y1="Y_Z0" :x2="264" :y2="Y_Z0" stroke="#475569" stroke-width="1.2"/>
      <text x="13" :y="(Y_ZM + Y_Z0) / 2" text-anchor="middle"
        :transform="`rotate(-90, 13, ${(Y_ZM + Y_Z0) / 2})`"
        style="font-size:9px;fill:#475569;font-family:sans-serif;font-style:italic">Z (m)</text>

      <!-- Rays CamL → P and CamR → P -->
      <line class="st-ray" :x1="camLx" :y1="CAM_Y - 7" :x2="pX" :y2="pY"
        stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5,3"/>
      <line class="st-ray" :x1="camRx" :y1="CAM_Y - 7" :x2="pX" :y2="pY"
        stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="5,3"/>

      <!-- Z double-arrow (only when P is high enough) -->
      <line v-if="pY < CAM_Y - 20"
        :x1="pX + 20" :y1="pY + 10"
        :x2="pX + 20" :y2="CAM_Y - 9"
        class="st-zarrow"
        stroke="#CF1C24" stroke-width="1.5"
        marker-end="url(#stAz)" marker-start="url(#stAzR)"/>
      <text v-if="pY < CAM_Y - 30"
        :x="pX + 26" :y="(pY + CAM_Y) / 2 + 4"
        style="font-size:10px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        Z = {{ Z.toFixed(1) }} m
      </text>

      <!-- b double-arrow -->
      <line v-if="bSvg > 22"
        :x1="camLx" :y1="CAM_Y + 14"
        :x2="camRx" :y2="CAM_Y + 14"
        class="st-barrow"
        stroke="#00BDF2" stroke-width="1.5"
        marker-end="url(#stAb)" marker-start="url(#stAbR)"/>
      <text v-if="bSvg > 30"
        :x="BL_CTR" :y="CAM_Y + 26"
        text-anchor="middle"
        style="font-size:9px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        b = {{ b.toFixed(2) }} m
      </text>

      <!-- Camera Left -->
      <rect class="st-camL" :x="camLx - 10" :y="CAM_Y - 7" width="20" height="14"
        rx="2" fill="#00BDF2" stroke="white" stroke-width="1.5"/>
      <text :x="camLx - 14" :y="CAM_Y + 12"
        text-anchor="end" style="font-size:8px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        CamG
      </text>

      <!-- Camera Right -->
      <rect class="st-camR" :x="camRx - 10" :y="CAM_Y - 7" width="20" height="14"
        rx="2" fill="#00BDF2" stroke="white" stroke-width="1.5"/>
      <text :x="camRx + 14" :y="CAM_Y + 12"
        style="font-size:8px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        CamD
      </text>

      <!-- Incertitude en profondeur : segment [Z⁻, Z⁺] le long du rayon -->
      <line v-if="dd > 0" :x1="pX" :y1="pYnear" :x2="pX" :y2="pYfar"
        stroke="#CF1C24" stroke-width="11" stroke-linecap="round"
        style="opacity:0.22"/>
      <text v-if="dd > 0" :x="pX - 14" :y="(pYnear + pYfar) / 2 + 3"
        text-anchor="end"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        ±{{ dZ.toFixed(dZ < 10 ? 1 : 0) }} m
      </text>

      <!-- Point 3D P -->
      <circle class="st-pt" :cx="pX" :cy="pY" r="9"
        fill="#CF1C24" stroke="white" stroke-width="2.5"/>
      <text :x="pX + 13" :y="pY + 4"
        style="font-size:11px;fill:#CF1C24;font-weight:700;font-family:sans-serif">P</text>
      <!-- Au-delà du plafond de l'échelle, on le dit plutôt que de coller le point en haut -->
      <text v-if="outOfScale" :x="pX" :y="Y_ZM - 8" text-anchor="middle"
        style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        ▲ Z &gt; {{ ZMAX }} m — hors échelle
      </text>

      <!-- Axis label -->
      <text x="133" y="13"
        text-anchor="middle"
        style="font-size:9px;fill:#94a3b8;font-family:sans-serif;font-style:italic">
        vue du dessus — profondeur à l'échelle, baseline exagérée
      </text>

      <!-- Niveau de profondeur courant : même hauteur des deux côtés -->
      <line :x1="38" :y1="pY" :x2="dotX" :y2="pY"
        class="st-level" stroke="#CF1C24" stroke-width="0.9"
        stroke-dasharray="2,3" style="opacity:0.45"/>

      <!-- ═══ RIGHT PANEL — Graph Z(d) ═══ -->
      <rect x="278" y="2" width="300" height="216" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Grid (horizontal) -->
      <line v-for="tk in yTicks" :key="tk.y"
        :x1="GL" :y1="tk.y" :x2="GR" :y2="tk.y"
        stroke="#E2E8F0" stroke-width="0.8" stroke-dasharray="3,2"/>

      <!-- Axes -->
      <line :x1="GL" :y1="GB" :x2="GR + 5" :y2="GB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="GL" :y1="GT - 4" :x2="GL" :y2="GB" stroke="#475569" stroke-width="1.2"/>

      <!-- X ticks -->
      <g v-for="tk in xTicks" :key="tk.dv">
        <line :x1="tk.x" :y1="GB" :x2="tk.x" :y2="GB + 4" stroke="#475569" stroke-width="1"/>
        <text :x="tk.x" :y="GB + 13" text-anchor="middle"
          style="font-size:8.5px;fill:#475569;font-family:sans-serif">{{ tk.dv }}</text>
      </g>
      <text :x="(GL + GR) / 2" :y="GB + 24" text-anchor="middle"
        style="font-size:9.5px;fill:#475569;font-family:sans-serif;font-style:italic">d (px)</text>

      <!-- Y ticks -->
      <g v-for="tk in yTicks" :key="`y${tk.y}`">
        <line :x1="GL - 4" :y1="tk.y" :x2="GL" :y2="tk.y" stroke="#475569" stroke-width="1"/>
        <text :x="GL - 6" :y="tk.y + 3" text-anchor="end"
          style="font-size:8px;fill:#475569;font-family:sans-serif">{{ tk.label }}</text>
      </g>
      <!-- Y label -->
      <text :x="288" :y="(GT + GB) / 2"
        text-anchor="middle"
        transform="rotate(-90, 288, 109)"
        style="font-size:9.5px;fill:#475569;font-family:sans-serif;font-style:italic">Z (m)</text>

      <!-- Bande d'erreur sur la disparité : ±Δd autour de d -->
      <rect v-if="dd > 0" :x="bandX0" :y="GT" :width="Math.max(bandX1 - bandX0, 1.2)"
        :height="GB - GT" style="fill:#CF1C24;fill-opacity:0.10"/>

      <!-- Curve Z = f·b/d -->
      <polyline :points="curvePts"
        fill="none" stroke="#F15A22" stroke-width="2.5" stroke-linejoin="round"
        stroke-linecap="round"/>

      <!-- Curve annotation -->
      <text :x="dToX(6)" :y="Math.max(ZToY(ZMAX_FIXED * 0.6) - 5, GT + 12)"
        style="font-size:9px;fill:#F15A22;font-weight:700;font-style:italic;font-family:sans-serif">
        Z = f·b/d
      </text>

      <!-- Ce que la bande devient une fois passée par la courbe -->
      <line v-if="dd > 0" :x1="dotX" :y1="barYnear" :x2="dotX" :y2="barYfar"
        stroke="#CF1C24" stroke-width="9" stroke-linecap="round" style="opacity:0.35"/>
      <line v-if="dd > 0" :x1="GL" :y1="barYfar" :x2="dotX" :y2="barYfar"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="2,2" style="opacity:0.5"/>
      <line v-if="dd > 0" :x1="GL" :y1="barYnear" :x2="dotX" :y2="barYnear"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="2,2" style="opacity:0.5"/>
      <text v-if="dd > 0" :x="dotX + 12"
        :y="barYnear - barYfar > 22 ? (barYnear + barYfar) / 2 + 3 : barYfar - 6"
        style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        ΔZ = ±{{ dZ.toFixed(dZ < 10 ? 1 : 0) }} m
      </text>

      <!-- Guide lines to current point -->
      <line :x1="GL" :y1="dotY" :x2="dotX" :y2="dotY"
        class="st-guide"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.45"/>
      <line :x1="dotX" :y1="GB" :x2="dotX" :y2="dotY"
        class="st-guide"
        stroke="#CF1C24" stroke-width="0.9" stroke-dasharray="3,2" style="opacity:0.45"/>

      <!-- Current (d, Z) point on graph -->
      <circle class="st-dot" :cx="dotX" :cy="dotY" r="7"
        fill="#CF1C24" stroke="white" stroke-width="2.5"/>
    </svg>

    <!-- Controls -->
    <div class="st-controls">
      <label class="st-sl">
        <span class="st-name">f =</span>
        <strong>{{ f }}</strong>
        <span class="st-unit">px</span>
        <input type="range" v-model.number="f" min="300" max="1000" step="25"/>
      </label>
      <label class="st-sl">
        <span class="st-name">b =</span>
        <strong>{{ b.toFixed(2) }}</strong>
        <span class="st-unit">m</span>
        <input type="range" v-model.number="b" min="0.05" max="0.50" step="0.01"/>
      </label>
      <label class="st-sl">
        <span class="st-name">d =</span>
        <strong>{{ d }}</strong>
        <span class="st-unit">px</span>
        <input type="range" v-model.number="d" min="1" max="50" step="1"/>
      </label>
      <label class="st-sl st-sl-err">
        <span class="st-name">incertitude sur d =</span>
        <strong>{{ dd.toFixed(1) }}</strong>
        <span class="st-unit">px</span>
        <input type="range" v-model.number="dd" min="0" max="2" step="0.1"/>
      </label>
      <div class="st-result">
        Z = f·b/d = <strong>{{ Z.toFixed(1) }} m</strong>
        <span class="st-sep">·</span>
        ΔZ = <strong>±{{ dZ.toFixed(dZ < 10 ? 2 : 1) }} m</strong>
        <span class="st-pct">({{ relErr.toFixed(0) }} %)</span>
      </div>
      <div class="st-slope">
        pente |dZ/dd| = Z²/(f·b) = <strong>{{ slope.toFixed(slope < 10 ? 2 : 1) }} m/px</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }

.st-svg { height: 255px; width: auto; max-width: 100%; display: block; }

/* SVG transitions for smooth slider interaction */
.st-pt      { transition: cy 0.1s ease; }
.st-ray     { transition: x1 0.1s ease, x2 0.1s ease, y2 0.1s ease; }
.st-zarrow  { transition: y1 0.1s ease; }
.st-barrow  { transition: x1 0.1s ease, x2 0.1s ease; }
.st-camL    { transition: x 0.1s ease; }
.st-camR    { transition: x 0.1s ease; }
.st-dot     { transition: cx 0.08s ease, cy 0.08s ease; }
.st-level   { transition: y1 0.1s ease, y2 0.1s ease, x2 0.08s ease; }
.st-guide   { transition: x1 0.08s ease, x2 0.08s ease, y1 0.08s ease, y2 0.08s ease; }

/* Controls */
.st-controls {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.st-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.st-name { color: #334155; }
.st-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.st-unit { color: #94a3b8; font-size: 0.65rem; }
.st-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.st-result {
  font-family: monospace; font-size: 0.78rem; color: #334155;
  padding: 3px 10px; background: #fef2f2; border: 1.5px solid #fca5a5;
  border-radius: 5px;
}
.st-result strong { color: #CF1C24; font-size: 1.0rem; font-weight: 700; }
.st-sep { color: #cbd5e1; margin: 0 3px; }
.st-pct { color: #94a3b8; font-size: 0.7rem; }
.st-slope {
  font-family: monospace; font-size: 0.72rem; color: #475569;
  padding: 3px 10px; background: #f8fafc; border: 1.5px solid #CBD5E1; border-radius: 5px;
}
.st-slope strong { color: #F15A22; font-weight: 700; }
</style>
