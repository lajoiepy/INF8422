<script setup lang="ts">
import { ref, computed } from 'vue'

// Angles interactifs
const yaw   = ref(0)    // rotation autour de l'axe Z (vertical / gravité) — degrés
const roll  = ref(0)    // inclinaison latérale — degrés

// En radians
const yawR  = computed(() => yaw.value  * Math.PI / 180)
const rollR = computed(() => roll.value * Math.PI / 180)

// ── Vecteur gravité dans le repère corps ──────────────────────
// Gravité monde : g_W = [0, -1, 0] (pointant vers le bas en SVG)
// Rotation yaw autour de Z (axe vertical) → g_body = R_yaw^T * g_W = g_W (INCHANGÉ)
// Rotation roll autour de X → g_body = R_roll^T * g_W = [0, -cos(roll), sin(roll)]
// (dans notre repère simplifié 2D)

// Pour le PANNEAU YAW (vue de dessus) :
// L'axe Z est hors du plan. Le vecteur gravité pointe toujours dans Z (hors du plan).
// Le robot tourne mais la gravité reste la même dans le repère corps.

// Pour le PANNEAU ROLL (vue de face) :
// g_body_y = -cos(roll), g_body_z = sin(roll)
const gBodyY = computed(() => -Math.cos(rollR.value))
const gBodyZ = computed(() =>  Math.sin(rollR.value))

// ── SVG positions ─────────────────────────────────────────────
// Panneau gauche : vue de dessus — rotation yaw
const CY_X = 133, CY_Y = 120   // centre robot dans panneau gauche
const R_ROB = 28                 // rayon du corps du robot

// Axes du robot en vue de dessus (X et Y du corps)
function bodyAxisYaw(angle: number, scale: number): [number, number] {
  return [
    CY_X + Math.cos(angle + yawR.value) * scale,
    CY_Y - Math.sin(angle + yawR.value) * scale,
  ]
}

// Panneau droit : vue de face — rotation roll
const CR_X = 413, CR_Y = 110   // centre robot dans panneau droit
const R_ROB2 = 28

function bodyAxisRoll(dx: number, dy: number): [number, number] {
  // Rotation de roll dans le plan YZ (vue de face = plan XY en SVG)
  const cos_r = Math.cos(rollR.value)
  const sin_r = Math.sin(rollR.value)
  return [
    CR_X + dx * cos_r - dy * sin_r,
    CR_Y + dx * sin_r + dy * cos_r,
  ]
}

// Vecteur gravité en vue de face (dans le repère corps après roll)
// g_body ≈ [0, gBodyY, gBodyZ] → projeté sur vue de face : (gBodyZ, -gBodyY)
const gVecX = computed(() => CR_X + gBodyZ.value * 55)
const gVecY = computed(() => CR_Y + (-gBodyY.value) * 55)

// Mesure IMU : ||g_body - g_ref||² — change quand roll ≠ 0
const imuMeasChange = computed(() =>
  (gBodyY.value + 1) ** 2 + gBodyZ.value ** 2  // distance à [0,-1,0]
)
const imuChanged = computed(() => Math.abs(roll.value) > 3)

// Est-ce que le yaw change la mesure IMU ? Non ! Car g_body = [0,-1,0] toujours pour yaw
const yawChangesIMU = false
</script>

<template>
  <div class="vio-wrap">
    <svg viewBox="0 0 558 215" class="vio-svg">
      <defs>
        <marker id="vioG" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#25B34B"/>
        </marker>
        <marker id="vioR" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#CF1C24"/>
        </marker>
        <marker id="vioB" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#00BDF2"/>
        </marker>
        <marker id="vioO" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="#F15A22"/>
        </marker>
      </defs>

      <!-- ═══ LEFT PANEL : Yaw (NON-OBSERVABLE) ═══ -->
      <rect x="2" y="2" width="265" height="211" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="133" y="13" text-anchor="middle"
        style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        ❌ Yaw — NON-observable
      </text>
      <text x="133" y="26" text-anchor="middle"
        style="font-size:7.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vue de dessus (gravité ⊙ perpendiculaire à ce plan)
      </text>

      <!-- Gravité (axe Z, hors du plan) — symbole ⊙ -->
      <circle :cx="CY_X" :cy="40" r="10" fill="none" stroke="#25B34B" stroke-width="2"/>
      <circle :cx="CY_X" :cy="40" r="3" fill="#25B34B"/>
      <text :x="CY_X + 16" :y="44"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">g (vers nous)</text>

      <!-- Corps du robot (cercle) -->
      <circle :cx="CY_X" :cy="CY_Y" :r="R_ROB"
        fill="#E2E8F0" stroke="#475569" stroke-width="2.5"/>
      <!-- "Caméra" sur le robot -->
      <rect :x="bodyAxisYaw(0, R_ROB + 6)[0] - 7"
            :y="bodyAxisYaw(0, R_ROB + 6)[1] - 5"
            width="14" height="10" rx="2" fill="#475569" class="vio-cam"/>

      <!-- Axe X du robot -->
      <line :x1="CY_X" :y1="CY_Y"
            :x2="bodyAxisYaw(0, 48)[0]" :y2="bodyAxisYaw(0, 48)[1]"
            stroke="#CF1C24" stroke-width="2" marker-end="url(#vioR)" class="vio-axis"/>
      <text :x="bodyAxisYaw(0, 58)[0]" :y="bodyAxisYaw(0, 58)[1] + 4"
        text-anchor="middle" style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">X</text>

      <!-- Axe Y du robot -->
      <line :x1="CY_X" :y1="CY_Y"
            :x2="bodyAxisYaw(Math.PI/2, 48)[0]" :y2="bodyAxisYaw(Math.PI/2, 48)[1]"
            stroke="#00BDF2" stroke-width="2" marker-end="url(#vioB)" class="vio-axis"/>
      <text :x="bodyAxisYaw(Math.PI/2, 58)[0]" :y="bodyAxisYaw(Math.PI/2, 58)[1] + 4"
        text-anchor="middle" style="font-size:9px;fill:#00BDF2;font-weight:700;font-family:sans-serif">Y</text>

      <!-- IMU mesure g — inchangé -->
      <text x="50" y="190" style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        IMU mesure g = (0, 0, -g) ✓
      </text>
      <text x="50" y="203" style="font-size:8px;fill:#CF1C24;font-style:italic;font-family:sans-serif">
        → inchangé quel que soit le yaw !
      </text>

      <!-- ═══ RIGHT PANEL : Roll (OBSERVABLE) ═══ -->
      <rect x="271" y="2" width="285" height="211" fill="#f8fafc" rx="5"
        stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="413" y="13" text-anchor="middle"
        style="font-size:9px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        ✓ Roll &amp; Pitch — OBSERVABLES
      </text>
      <text x="413" y="26" text-anchor="middle"
        style="font-size:7.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        vue de face — l'IMU mesure g dans le repère corps
      </text>

      <!-- Vecteur gravité monde (référence, flèche grise) -->
      <line :x1="CR_X" :y1="CR_Y - 60" :x2="CR_X" :y2="CR_Y + 58"
        stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text :x="CR_X + 6" :y="CR_Y - 55"
        style="font-size:8px;fill:#94a3b8;font-style:italic;font-family:sans-serif">monde</text>

      <!-- Corps du robot (rectangle incliné) -->
      <rect :x="CR_X - R_ROB2" :y="CR_Y - R_ROB2 * 0.7"
            :width="R_ROB2 * 2" :height="R_ROB2 * 1.4"
            rx="5" fill="#E2E8F0" stroke="#475569" stroke-width="2.5"
            :transform="`rotate(${roll}, ${CR_X}, ${CR_Y})`"
            class="vio-body"/>

      <!-- IMU sur le robot -->
      <rect x="-8" y="-6" width="16" height="12" rx="2" fill="#F15A22"
        :transform="`translate(${CR_X}, ${CR_Y}) rotate(${roll})`"/>
      <text :x="CR_X" :y="CR_Y + 4"
            text-anchor="middle"
            :transform="`rotate(${roll}, ${CR_X}, ${CR_Y})`"
            style="font-size:7px;fill:white;font-weight:700;font-family:sans-serif">IMU</text>

      <!-- Vecteur gravité dans le repère corps (mesure IMU) -->
      <line :x1="CR_X" :y1="CR_Y"
            :x2="gVecX" :y2="gVecY"
            stroke="#25B34B" stroke-width="2.5" marker-end="url(#vioG)" class="vio-gvec"/>
      <text :x="gVecX + 8" :y="gVecY + 4"
        style="font-size:9px;fill:#25B34B;font-weight:700;font-family:sans-serif">g_body</text>

      <!-- Angle de la gravité dans le corps (arc) -->
      <text :x="CR_X + 8" :y="CR_Y + 22"
        :style="`font-size:8px;fill:${imuChanged ? '#CF1C24' : '#25B34B'};font-weight:700;font-family:sans-serif`">
        {{ imuChanged ? '⚠ g_body a changé !' : 'g_body vertical ✓' }}
      </text>

      <!-- Valeur numérique de la mesure IMU -->
      <text x="290" y="175"
        style="font-size:8px;fill:#F15A22;font-weight:700;font-family:sans-serif">
        IMU mesure g_body = [
      </text>
      <text x="290" y="187"
        style="font-size:8px;fill:#F15A22;font-family:monospace">
        0, {{ (gBodyY * 9.81).toFixed(2) }}, {{ (gBodyZ * 9.81).toFixed(2) }} ] m/s²
      </text>
      <text x="290" y="200"
        :style="`font-size:8px;font-weight:700;fill:${imuChanged ? '#CF1C24' : '#25B34B'};font-family:sans-serif`">
        → {{ imuChanged ? '❌ Différent de [0,-9.81,0] → Observable !' : '✓ = [0,-9.81,0] (nominal)' }}
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="vio-controls">
      <label class="vio-sl">
        <span>Yaw =</span>
        <strong>{{ yaw.toFixed(0) }}°</strong>
        <span class="vio-tag vio-no">non-obs.</span>
        <input type="range" v-model.number="yaw" min="-180" max="180" step="5"/>
      </label>
      <label class="vio-sl">
        <span>Roll =</span>
        <strong>{{ roll.toFixed(0) }}°</strong>
        <span class="vio-tag vio-yes">observable</span>
        <input type="range" v-model.number="roll" min="-60" max="60" step="2"/>
      </label>
      <div class="vio-legend">
        <span class="vio-tag vio-no">❌ non-observable : Tx, Ty, Tz, Yaw (4 DOF)</span>
        <span class="vio-tag vio-yes">✓ observable : Roll, Pitch, Échelle (IMU)</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vio-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.vio-svg  { height: 250px; width: auto; max-width: 100%; display: block; }

.vio-cam   { transition: x 0.08s ease, y 0.08s ease; }
.vio-axis  { transition: x2 0.08s ease, y2 0.08s ease; }
.vio-gvec  { transition: x2 0.08s ease, y2 0.08s ease; }
.vio-body  { transition: transform 0.08s ease; }

.vio-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.vio-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.vio-sl strong { color: #CF1C24; min-width: 40px; }
.vio-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.vio-tag {
  font-size: 0.65rem; padding: 1px 8px; border-radius: 10px; font-weight: 700;
}
.vio-no  { background: #fef2f2; color: #CF1C24; border: 1px solid #fca5a5; }
.vio-yes { background: #f0fdf4; color: #25B34B; border: 1px solid #86efac; }

.vio-legend { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
