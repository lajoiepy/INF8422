<script setup lang="ts">
import { ref, computed } from 'vue'

const thetaA = ref(0.5)   // radians
const omega  = ref(1.2)   // tangent vector (angle increment)

const thetaB = computed(() => thetaA.value + omega.value)

// ── Left panel: SO(2) circle ──────────────────────────────────
const CX = 115, CY = 108, R = 78

function circPt(theta: number) {
  return { x: CX + R * Math.cos(theta), y: CY - R * Math.sin(theta) }
}

const ptA = computed(() => circPt(thetaA.value))
const ptB = computed(() => circPt(thetaB.value))

// Tangent at A: direction = (-sin(θ_A), cos(θ_A)) in SVG coords
const TX = computed(() => -Math.sin(thetaA.value))
const TY = computed(() =>  Math.cos(thetaA.value))  // SVG y is flipped

// Omega arrow endpoint on tangent = point "naïf" A+ω (hors variété).
// Distance = vraie longueur d'arc (R·ω) → position linéarisée exacte, donc
// l'écart de courbure vers B est quantitativement honnête (borné au panneau).
const ghostDist = computed(() => Math.max(-105, Math.min(105, omega.value * R)))
const omegaEnd = computed(() => ({
  x: ptA.value.x + TX.value * ghostDist.value,
  y: ptA.value.y - TY.value * ghostDist.value,
}))

// Tangent line endpoints
const tangLen = 70
const tangP1 = computed(() => ({ x: ptA.value.x - TX.value * tangLen, y: ptA.value.y + TY.value * tangLen }))
const tangP2 = computed(() => ({ x: ptA.value.x + TX.value * tangLen, y: ptA.value.y - TY.value * tangLen }))

// Arc from A to B
function arcPath(tA: number, tB: number): string {
  const ax = CX + R * Math.cos(tA), ay = CY - R * Math.sin(tA)
  const bx = CX + R * Math.cos(tB), by = CY - R * Math.sin(tB)
  const dTheta = tB - tA
  const large = Math.abs(dTheta) > Math.PI ? 1 : 0
  const sweep = dTheta > 0 ? 0 : 1  // SVG y inverted
  return `M ${ax.toFixed(2)} ${ay.toFixed(2)} A ${R} ${R} 0 ${large} ${sweep} ${bx.toFixed(2)} ${by.toFixed(2)}`
}
const arcPath_ = computed(() => arcPath(thetaA.value, thetaB.value))

// ── Right panel: rotation matrix ─────────────────────────────
const PR_X = 280
function rotMat(theta: number) {
  return [
    [Math.cos(theta), -Math.sin(theta)],
    [Math.sin(theta),  Math.cos(theta)],
  ]
}
const RA = computed(() => rotMat(thetaA.value))
const RB = computed(() => rotMat(thetaB.value))
</script>

<template>
  <div class="so2-wrap">
    <svg viewBox="0 0 558 215" class="so2-svg">
      <defs>
        <marker id="so2Arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#F15A22"/>
        </marker>
        <marker id="so2ArcArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#CF1C24"/>
        </marker>
        <marker id="so2ExpArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#7C3AED"/>
        </marker>
      </defs>

      <!-- ══════ LEFT: SO(2) circle ══════ -->
      <rect x="2" y="2" width="272" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="136" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Variété SO(2) — cercle unité
      </text>

      <!-- Axes -->
      <line :x1="CX-R-12" :y1="CY" :x2="CX+R+12" :y2="CY" stroke="#e2e8f0" stroke-width="1"/>
      <line :x1="CX" :y1="CY-R-12" :x2="CX" :y2="CY+R+12" stroke="#e2e8f0" stroke-width="1"/>

      <!-- Circle SO(2) -->
      <circle :cx="CX" :cy="CY" :r="R" fill="none" stroke="#CBD5E1" stroke-width="1.5"/>
      <text :x="CX+R+8" :y="CY+4" style="font-size:7.5px;fill:#94a3b8;font-family:sans-serif">1</text>

      <!-- Arc A→B -->
      <path :d="arcPath_" fill="none" stroke="#CF1C24" stroke-width="2.5"
        stroke-linecap="round" marker-end="url(#so2ArcArr)"/>

      <!-- Tangent line at A -->
      <line :x1="tangP1.x" :y1="tangP1.y" :x2="tangP2.x" :y2="tangP2.y"
        stroke="#25B34B" stroke-width="1.2" stroke-dasharray="5,3" opacity="0.8"/>
      <text :x="tangP2.x+4" :y="tangP2.y"
        style="font-size:7.5px;fill:#25B34B;font-weight:700;font-family:sans-serif">T_A SO(2)</text>

      <!-- Étape naïve : avancer le long de la tangente (addition linéaire) -->
      <line
        :x1="ptA.x" :y1="ptA.y"
        :x2="omegaEnd.x - TX * 7" :y2="omegaEnd.y + TY * 7"
        stroke="#F15A22" stroke-width="2.5" marker-end="url(#so2Arr)"
        stroke-linecap="round"/>
      <text :x="(ptA.x+omegaEnd.x)/2 + 4" :y="(ptA.y+omegaEnd.y)/2 - 4"
        style="font-size:8.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">
        ω={{ omega.toFixed(2) }}
      </text>

      <!-- Point fantôme : résultat de l'addition naïve (hors variété) -->
      <circle :cx="omegaEnd.x" :cy="omegaEnd.y" r="6"
        fill="white" stroke="#F15A22" stroke-width="2" stroke-dasharray="2,1.5"/>
      <text :x="omegaEnd.x + 8" :y="omegaEnd.y + 3"
        style="font-size:7.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">A+ω</text>
      <text :x="omegaEnd.x + 8" :y="omegaEnd.y + 12"
        style="font-size:7px;fill:#CF1C24;font-style:italic;font-family:sans-serif">∉ SO(2) !</text>

      <!-- Rétraction Exp : ramène le point fantôme sur la variété (→ B) -->
      <line
        :x1="omegaEnd.x" :y1="omegaEnd.y"
        :x2="ptB.x + (omegaEnd.x > ptB.x ? 7 : -7)" :y2="ptB.y - 7"
        stroke="#7C3AED" stroke-width="1.6" stroke-dasharray="4,2.5"
        marker-end="url(#so2ExpArr)" stroke-linecap="round"/>
      <text :x="(omegaEnd.x+ptB.x)/2 + 4" :y="(omegaEnd.y+ptB.y)/2 - 3"
        style="font-size:7.5px;fill:#7C3AED;font-weight:700;font-family:sans-serif">Exp</text>

      <text :x="CX-30" :y="CY+R+16"
        style="font-size:7.5px;fill:#F15A22;font-style:italic;font-family:sans-serif">
        ω ∈ so(2) ≅ ℝ
      </text>

      <!-- Point A (blue) -->
      <circle :cx="ptA.x" :cy="ptA.y" r="8" fill="#00BDF2" stroke="white" stroke-width="2"/>
      <text :x="ptA.x+11" :y="ptA.y+4"
        style="font-size:8.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">
        A(θ_A)
      </text>

      <!-- Point B (red) -->
      <circle :cx="ptB.x" :cy="ptB.y" r="8" fill="#CF1C24" stroke="white" stroke-width="2"/>
      <text :x="ptB.x+11" :y="ptB.y+4"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        B=Exp_A(ω)
      </text>

      <!-- Radius lines -->
      <line :x1="CX" :y1="CY" :x2="ptA.x" :y2="ptA.y" stroke="#00BDF2" stroke-width="1" stroke-dasharray="3,2"/>
      <line :x1="CX" :y1="CY" :x2="ptB.x" :y2="ptB.y" stroke="#CF1C24" stroke-width="1" stroke-dasharray="3,2"/>

      <!-- ══════ RIGHT: Info panel ══════ -->
      <rect :x="PR_X" y="2" :width="558-PR_X-4" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="419" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Cartes Exp / Log
      </text>

      <!-- Angles -->
      <rect :x="PR_X+8" y="20" width="258" height="38" fill="#e0f7ff" rx="4" stroke="#00BDF2" stroke-width="1"/>
      <text :x="PR_X+14" y="33"
        style="font-size:8.5px;fill:#0284c7;font-weight:700;font-family:monospace">
        θ_A = {{ thetaA.toFixed(3) }} rad  ({{ (thetaA*180/Math.PI).toFixed(1) }}°)
      </text>
      <text :x="PR_X+14" y="48"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:monospace">
        θ_B = {{ thetaB.toFixed(3) }} rad  ({{ (thetaB*180/Math.PI).toFixed(1) }}°)
      </text>

      <!-- Exp map formula -->
      <rect :x="PR_X+8" y="65" width="258" height="26" fill="#fff7ed" rx="4" stroke="#fed7aa" stroke-width="1"/>
      <text x="419" y="78" text-anchor="middle"
        style="font-size:8px;fill:#c2410c;font-weight:700;font-family:sans-serif">
        Exp_A(ω) : so(2) → SO(2)
      </text>
      <text x="419" y="88" text-anchor="middle"
        style="font-size:8px;fill:#c2410c;font-family:monospace">
        θ_B = θ_A + ω
      </text>

      <!-- R(θ_A) matrix -->
      <text :x="PR_X+8" y="105"
        style="font-size:8.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">R(θ_A) =</text>
      <rect :x="PR_X+60" y="95" width="110" height="40" fill="white" rx="3"
        stroke="#00BDF2" stroke-width="1.5"/>
      <text :x="PR_X+115" y="111" text-anchor="middle"
        style="font-size:8px;fill:#0284c7;font-family:monospace">
        [{{ RA[0][0].toFixed(3) }}  {{ RA[0][1].toFixed(3) }}]
      </text>
      <text :x="PR_X+115" y="126" text-anchor="middle"
        style="font-size:8px;fill:#0284c7;font-family:monospace">
        [{{ RA[1][0].toFixed(3) }}  {{ RA[1][1].toFixed(3) }}]
      </text>

      <!-- R(θ_B) matrix -->
      <text :x="PR_X+8" y="152"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">R(θ_B) =</text>
      <rect :x="PR_X+60" y="142" width="110" height="40" fill="white" rx="3"
        stroke="#CF1C24" stroke-width="1.5"/>
      <text :x="PR_X+115" y="158" text-anchor="middle"
        style="font-size:8px;fill:#CF1C24;font-family:monospace">
        [{{ RB[0][0].toFixed(3) }}  {{ RB[0][1].toFixed(3) }}]
      </text>
      <text :x="PR_X+115" y="173" text-anchor="middle"
        style="font-size:8px;fill:#CF1C24;font-family:monospace">
        [{{ RB[1][0].toFixed(3) }}  {{ RB[1][1].toFixed(3) }}]
      </text>

      <!-- Log map -->
      <text x="419" y="195" text-anchor="middle"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        Log_A(B) = ω = θ_B − θ_A = {{ omega.toFixed(3) }} ∈ ℝ
      </text>
    </svg>

    <!-- Controls -->
    <div class="so2-controls">
      <label class="so2-sl">
        <span class="so2-lbl">θ_A</span>
        <strong>{{ thetaA.toFixed(2) }}</strong>
        <input type="range" v-model.number="thetaA" :min="0" :max="(2*Math.PI).toFixed(3)" step="0.05"/>
      </label>
      <label class="so2-sl">
        <span class="so2-lbl">ω</span>
        <strong>{{ omega.toFixed(2) }}</strong>
        <input type="range" v-model.number="omega" :min="(-Math.PI).toFixed(3)" :max="Math.PI.toFixed(3)" step="0.05"/>
      </label>
      <div class="so2-info">
        L'addition naïve (le long de la tangente) quitte SO(2) ·
        <b>Exp</b> rétracte sur la variété → B
      </div>
    </div>
  </div>
</template>

<style scoped>
.so2-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.so2-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.so2-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.so2-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.so2-lbl { min-width: 22px; }
.so2-sl strong { color: #CF1C24; min-width: 32px; display: inline-block; }
.so2-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.so2-info {
  font-size: 0.68rem; color: #64748b; font-style: italic;
  padding: 2px 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px;
}
</style>
