<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Fusion TSDF 1D le long d'un rayon ─────────────────────────────
// Chaque mesure est BRUITÉE : la position de surface mesurée est
// s_meas = surface_vraie + N(0, σ). La moyenne pondérée KinectFusion
// F ← (W·F + w·d)/(W + w) lisse ce bruit → l'estimation du passage
// par zéro se stabilise. Avec W borné par W_max, la fusion conserve
// une capacité d’adaptation ; elle n’a plus une variance qui tend vers zéro.
const N_VOXELS = 14
const surfacePos = ref(8)   // position VRAIE de la surface (peut être déplacée sans reset !)
const delta = ref(3)        // bande de troncature (en voxels)
const sigma = ref(0.6)      // écart-type du bruit de mesure (en voxels)
const W_MAX = 10

const tsdfF = ref<number[]>(Array(N_VOXELS).fill(0))
const tsdfW = ref<number[]>(Array(N_VOXELS).fill(0))
const nMeasures = ref(0)
const lastMeas = ref<number | null>(null)  // dernière surface mesurée (bruitée)

// ── Géométrie SVG ─────────────────────────────────────────────
const OX = 25, OY = 78
const VW = 30, VH = 56

// TSDF idéal pour une surface donnée s (distance signée le long du rayon, tronquée)
function idealTSDF(i: number, s: number): number {
  return Math.max(-delta.value, Math.min(delta.value, s - i))
}

// Bruit gaussien (Box-Muller)
function gauss(): number {
  const u = Math.random() || 1e-9, v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function tsdfColor(val: number): string {
  const t = Math.max(-1, Math.min(1, val / delta.value))
  return t >= 0
    ? `rgb(${Math.round(224 - 224*t)},${Math.round(242 - 53*t)},${Math.round(254 - 12*t)})`
    : `rgb(${Math.round(254 + 47*t)},${Math.round(226 + 198*t)},${Math.round(226 + 190*t)})`

}

// Une mesure bruitée : surface mesurée ≠ surface vraie
function addMeasure(times = 1) {
  const newF = [...tsdfF.value]
  const newW = [...tsdfW.value]
  for (let m = 0; m < times; m++) {
    const sMeas = surfacePos.value + gauss() * sigma.value
    lastMeas.value = sMeas
    const w = 1.0
    for (let i = 0; i < N_VOXELS; i++) {
      // Espace visible devant la mesure et bande de largeur delta derrière.
      if (i <= sMeas + delta.value) {
        const d = idealTSDF(i, sMeas)
        newF[i] = (newW[i] * newF[i] + w * d) / (newW[i] + w)
        newW[i] = Math.min(newW[i] + w, W_MAX)
      }
    }
    nMeasures.value++
  }
  tsdfF.value = newF
  tsdfW.value = newW
}

function reset() {
  tsdfF.value = Array(N_VOXELS).fill(0)
  tsdfW.value = Array(N_VOXELS).fill(0)
  nMeasures.value = 0
  lastMeas.value = null
}

// Déplacer la surface vraie SANS reset → démontre le rôle de W_max :
// les voxels déjà très observés se corrigent lentement (au rythme w/W_max).
function moveSurface() {
  surfacePos.value = surfacePos.value <= Math.floor(N_VOXELS / 2) ? surfacePos.value + 3 : surfacePos.value - 3
}

function displayVal(i: number): number {
  return tsdfW.value[i] > 0 ? tsdfF.value[i] : idealTSDF(i, surfacePos.value)
}
function displayOpacity(i: number): number {
  return 1
}

// Estimation du passage par zéro (interpolation linéaire entre voxels mesurés)
const zeroCrossing = computed<number | null>(() => {
  for (let i = 0; i < N_VOXELS - 1; i++) {
    if (tsdfW.value[i] > 0 && tsdfW.value[i + 1] > 0
      && tsdfF.value[i] > 0 && tsdfF.value[i + 1] <= 0) {
      return i + tsdfF.value[i] / (tsdfF.value[i] - tsdfF.value[i + 1])
    }
  }
  return null
})
const estError = computed(() =>
  zeroCrossing.value === null ? null : Math.abs(zeroCrossing.value - surfacePos.value))

function vx(i: number) { return OX + i * VW }
const vy = OY
</script>

<template>
  <div class="tsdf-wrap">
    <svg viewBox="0 0 560 215" class="tsdf-svg">
      <defs>
        <marker id="tArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#F15A22"/>
        </marker>
      </defs>

      <!-- Panneau voxels -->
      <rect x="0" y="0" width="435" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="217" y="12" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        TSDF le long du rayon — chaque mesure est bruitée (σ={{ sigma.toFixed(1) }} voxel)
      </text>

      <!-- Rayon entrant -->
      <line x1="8" :y1="vy + VH/2" :x2="vx(0) - 2" :y2="vy + VH/2"
        stroke="#F15A22" stroke-width="2" marker-end="url(#tArrow)"/>

      <!-- Voxels -->
      <g v-for="i in N_VOXELS" :key="i">
        <rect :x="vx(i-1)+1" :y="vy" :width="VW-2" :height="VH"
          :fill="tsdfW[i-1] > 0 ? tsdfColor(displayVal(i-1)) : '#e2e8f0'"
          :style="{ opacity: displayOpacity(i-1) }"
          stroke="#e2e8f0" stroke-width="0.8" rx="1"/>
        <text :x="vx(i-1) + VW/2" :y="vy + VH/2 + 3"
          text-anchor="middle"
          :style="`font-size:7px;fill:${tsdfW[i-1] > 0 && Math.abs(displayVal(i-1)) > delta*0.6 ? 'white' : '#334155'};font-family:monospace;opacity:${displayOpacity(i-1)}`">
          {{ tsdfW[i-1] > 0 ? displayVal(i-1).toFixed(1) : '?' }}
        </text>
        <!-- Barre de poids W (jauge sous le voxel) -->
        <rect :x="vx(i-1)+3" :y="vy + VH + 3" :width="VW-6" height="5"
          fill="#e2e8f0" rx="1"/>
        <rect v-if="tsdfW[i-1] > 0"
          :x="vx(i-1)+3" :y="vy + VH + 3"
          :width="(VW-6) * tsdfW[i-1] / W_MAX" height="5"
          fill="#475569" rx="1"/>
        <text :x="vx(i-1) + VW/2" :y="vy + VH + 18"
          text-anchor="middle"
          style="font-size:6px;fill:#94a3b8;font-family:monospace">{{ i-1 }}</text>
      </g>
      <text :x="vx(0)-4" :y="vy + VH + 9" text-anchor="end"
        style="font-size:6px;fill:#475569;font-family:sans-serif">W</text>

      <!-- Surface VRAIE -->
      <line :x1="vx(surfacePos) + VW/2" y1="52" :x2="vx(surfacePos) + VW/2" :y2="vy + VH + 2"
        stroke="#CF1C24" stroke-width="2.5" stroke-linecap="round"/>
      <text :x="vx(surfacePos) + VW/2" y="49" text-anchor="middle"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">surface vraie</text>

      <!-- Dernière mesure bruitée -->
      <g v-if="lastMeas !== null">
        <line :x1="vx(0) + lastMeas * VW + VW/2" :y1="vy - 12"
          :x2="vx(0) + lastMeas * VW + VW/2" :y2="vy + 2"
          stroke="#F15A22" stroke-width="1.6" stroke-dasharray="3,2"/>
        <text :x="vx(0) + lastMeas * VW + VW/2" :y="vy - 16" text-anchor="middle"
          style="font-size:6.5px;fill:#F15A22;font-family:sans-serif">mesure</text>
      </g>

      <!-- Estimation du zéro (fusion) -->
      <g v-if="zeroCrossing !== null">
        <path :d="`M ${vx(0) + zeroCrossing * VW + VW/2 - 4} ${vy + VH + 30}
                 L ${vx(0) + zeroCrossing * VW + VW/2 + 4} ${vy + VH + 30}
                 L ${vx(0) + zeroCrossing * VW + VW/2} ${vy + VH + 23} Z`"
          fill="#25B34B"/>
        <text :x="vx(0) + zeroCrossing * VW + VW/2" :y="vy + VH + 39" text-anchor="middle"
          style="font-size:6.5px;fill:#25B34B;font-weight:700;font-family:sans-serif">estimé</text>
      </g>

      <!-- Panneau droit : convergence -->
      <rect x="441" y="0" width="117" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="499" y="12" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-weight:700;font-family:sans-serif">Convergence</text>
      <text x="448" y="30" style="font-size:7.5px;fill:#334155;font-family:monospace">
        N = {{ nMeasures }}
      </text>
      <text x="448" y="44" style="font-size:7.5px;fill:#334155;font-family:monospace">
        σ = {{ sigma.toFixed(1) }} voxel
      </text>
      <template v-if="estError !== null">
        <rect x="446" y="52" width="107" height="30" :fill="estError < Math.max(sigma, 0.1) / 2 ? '#f0fdf4' : '#fff7ed'" rx="3"
          :stroke="estError < Math.max(sigma, 0.1) / 2 ? '#86efac' : '#fed7aa'"/>
        <text x="499" y="64" text-anchor="middle"
          style="font-size:7px;fill:#475569;font-family:sans-serif">erreur surface estimée</text>
        <text x="499" y="76" text-anchor="middle"
          :style="`font-size:8.5px;font-weight:700;font-family:monospace;fill:${estError < Math.max(sigma, 0.1) / 2 ? '#15803d' : '#c2410c'}`">
          {{ estError.toFixed(2) }} voxel
        </text>
      </template>
      <text v-else x="499" y="66" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">aucune mesure</text>
      <text x="448" y="100" style="font-size:6.8px;fill:#475569;font-family:sans-serif">Bruit sans biais :</text>
      <text x="448" y="111" style="font-size:6.8px;fill:#475569;font-family:sans-serif">la fusion stabilise le zéro.</text>
      <text x="448" y="128" style="font-size:6.8px;fill:#475569;font-family:sans-serif">W borné à {{ W_MAX }} :</text>
      <text x="448" y="139" style="font-size:6.8px;fill:#475569;font-family:sans-serif">déplacez la surface</text>
      <text x="448" y="150" style="font-size:6.8px;fill:#475569;font-family:sans-serif">→ correction en</text>
      <text x="448" y="161" style="font-size:6.8px;fill:#475569;font-family:sans-serif">plusieurs observations.</text>

      <!-- Barre formule -->
      <rect x="0" y="182" width="558" height="33" fill="#f0fdf4" rx="4" stroke="#86efac" stroke-width="1"/>
      <text x="279" y="195" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:monospace">
        F ← (W·F + w·d) / (W + w) , W ← min(W + w, W_max)
      </text>
      <text x="279" y="208" text-anchor="middle"
        style="font-size:7px;fill:#15803d;font-family:sans-serif">
        bleu : positif · rouge : négatif · gris / ? : inconnu (W = 0)
      </text>
    </svg>

    <div class="tsdf-controls">
      <label class="tsdf-sl">
        σ bruit
        <strong>{{ sigma.toFixed(1) }}</strong>
        <input type="range" v-model.number="sigma" min="0" max="1.5" step="0.1"/>
      </label>
      <label class="tsdf-sl">
        Surface
        <strong>{{ surfacePos }}</strong>
        <input type="range" v-model.number="surfacePos" :min="delta+1" :max="N_VOXELS-delta-2" step="1"/>
      </label>
      <label class="tsdf-sl">
        δ
        <strong>{{ delta }}</strong>
        <input type="range" v-model.number="delta" min="1" max="5" step="1" @change="reset"/>
      </label>
      <button class="tsdf-btn-main" @click="addMeasure(1)">+1 Mesure</button>
      <button class="tsdf-btn-main" @click="addMeasure(10)">+10</button>
      <button class="tsdf-btn" @click="moveSurface" :disabled="nMeasures === 0"
        title="Déplace la surface vraie sans réinitialiser — observez la correction lente bornée par W_max">
        ⇄ Déplacer la surface
      </button>
      <button class="tsdf-btn" @click="reset">↺</button>
    </div>
  </div>
</template>

<style scoped>
.tsdf-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.tsdf-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.tsdf-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tsdf-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.tsdf-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.tsdf-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.tsdf-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.tsdf-btn-main:hover { background: #CF1C24; color: white; }
.tsdf-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.tsdf-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
