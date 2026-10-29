<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Modèles de bruit ──────────────────────────────────────────
// Homoscédastique : σ = cte (bruit thermique d'un capteur ToF)
const SIGMA_HOMO = 0.15 // m

// Hétéroscédastique : erreur stéréo σ_Z = Z²·σ_d / (f·b)
// (dérivée de Z = f·b/d : dZ/dd = −Z²/(f·b))
const FOCAL = 500   // px
const BASELINE = 0.08 // m
const sigmaDisp = ref(1.0) // σ_d : erreur d'appariement en pixels

const dist = ref(3.0) // distance de l'objet (m)

function sigmaHetero(Z: number): number {
  return Z * Z * sigmaDisp.value / (FOCAL * BASELINE)
}

// ── Géométrie des panneaux ────────────────────────────────────
// Deux panneaux : distance vraie (x) vs profondeur estimée (y)
const DMIN = 0.5, DMAX = 5.0
const ZMAX = 5.8
const PANEL = { w: 176, h: 165, y: 30 }
const LX = 14   // origine panneau gauche
const RX = 202  // origine panneau droit

function px(ox: number, d: number): number { return ox + (d - DMIN) / (DMAX - DMIN) * PANEL.w }
function py(z: number): number { return PANEL.y + PANEL.h - Math.max(0, Math.min(z, ZMAX)) / ZMAX * PANEL.h }

// Bande ±σ : polygone (courbe sup puis courbe inf inversée)
function bandPath(ox: number, sigmaFn: (z: number) => number): string {
  const up: string[] = [], lo: string[] = []
  const N = 60
  for (let i = 0; i <= N; i++) {
    const d = DMIN + (DMAX - DMIN) * i / N
    const s = sigmaFn(d)
    up.push(`${px(ox, d).toFixed(1)},${py(d + s).toFixed(1)}`)
    lo.push(`${px(ox, d).toFixed(1)},${py(d - s).toFixed(1)}`)
  }
  return 'M' + up.join(' L') + ' L' + lo.reverse().join(' L') + ' Z'
}

function meanPath(ox: number): string {
  return `M${px(ox, DMIN).toFixed(1)},${py(DMIN).toFixed(1)} L${px(ox, DMAX).toFixed(1)},${py(DMAX).toFixed(1)}`
}

const bandHomo = computed(() => bandPath(LX, () => SIGMA_HOMO))
const bandHetero = computed(() => bandPath(RX, sigmaHetero))

const sigH = computed(() => sigmaHetero(dist.value))
</script>

<template>
  <div class="hh-wrap">
    <svg viewBox="0 0 558 215" class="hh-svg">
      <!-- Left panel: homoscedastic -->
      <rect x="8" y="8" width="188" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="102" y="21" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Homoscedastic: σ = const</text>

      <path :d="bandHomo" fill="#94a3b8" style="opacity:0.3"/>
      <path :d="meanPath(LX)" fill="none" stroke="#334155" stroke-width="1.5"/>

      <!-- Object marker -->
      <line :x1="px(LX, dist)" :y1="py(dist - SIGMA_HOMO) + 0" :x2="px(LX, dist)" :y2="py(dist + SIGMA_HOMO)"
        stroke="#CF1C24" stroke-width="2"/>
      <circle :cx="px(LX, dist)" :cy="py(dist)" r="3.5" fill="#CF1C24" stroke="white" stroke-width="1"/>

      <line :x1="LX" :y1="py(0)" :x2="LX + PANEL.w" :y2="py(0)" stroke="#94a3b8" stroke-width="1"/>
      <text :x="LX + PANEL.w/2" y="205" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">true distance d (m)</text>

      <!-- Right panel: heteroscedastic -->
      <rect x="196" y="8" width="188" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="290" y="21" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Heteroscedastic: σ(d)</text>

      <path :d="bandHetero" fill="#F15A22" style="opacity:0.3"/>
      <path :d="meanPath(RX)" fill="none" stroke="#334155" stroke-width="1.5"/>

      <line :x1="px(RX, dist)" :y1="py(dist - sigH)" :x2="px(RX, dist)" :y2="py(dist + sigH)"
        stroke="#CF1C24" stroke-width="2"/>
      <circle :cx="px(RX, dist)" :cy="py(dist)" r="3.5" fill="#CF1C24" stroke="white" stroke-width="1"/>

      <line :x1="RX" :y1="py(0)" :x2="RX + PANEL.w" :y2="py(0)" stroke="#94a3b8" stroke-width="1"/>
      <text :x="RX + PANEL.w/2" y="205" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">true distance d (m)</text>

      <!-- Info panel -->
      <rect x="392" y="8" width="158" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="471" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Stereo error</text>

      <rect x="400" y="32" width="142" height="30" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="471" y="45" text-anchor="middle"
        style="font-size:7.5px;fill:#c2410c;font-family:monospace">σ_Z = Z²·σ_d / (f·b)</text>
      <text x="471" y="56" text-anchor="middle"
        style="font-size:6.5px;fill:#c2410c;font-family:monospace">f = {{ FOCAL }} px, b = {{ BASELINE }} m</text>

      <g style="font-size:8px;font-family:monospace">
        <text x="404" y="82" fill="#334155">d = {{ dist.toFixed(2) }} m</text>
        <text x="404" y="100" fill="#64748b">σ_homo  = {{ SIGMA_HOMO.toFixed(3) }} m</text>
        <text x="404" y="116" fill="#c2410c" font-weight="700">σ_hetero = {{ sigH.toFixed(3) }} m</text>
        <text x="404" y="134" fill="#CF1C24" font-weight="700">ratio = {{ (sigH / SIGMA_HOMO).toFixed(1) }}×</text>
      </g>

      <rect x="400" y="146" width="142" height="42" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="471" y="158" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-family:sans-serif">A constant σ underestimates error</text>
      <text x="471" y="168" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-family:sans-serif">far away and overestimates it up close:</text>
      <text x="471" y="181" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-weight:700;font-family:sans-serif">the network must predict σ(x)</text>
    </svg>

    <div class="hh-controls">
      <label class="hh-sl">
        Object distance d
        <strong>{{ dist.toFixed(1) }} m</strong>
        <input type="range" v-model.number="dist" min="0.5" max="5" step="0.1"/>
      </label>
      <label class="hh-sl">
        σ_d (px, matching)
        <strong>{{ sigmaDisp.toFixed(1) }}</strong>
        <input type="range" v-model.number="sigmaDisp" min="0.2" max="1.5" step="0.1"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.hh-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.hh-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.hh-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.hh-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.hh-sl strong { color: #CF1C24; min-width: 44px; display: inline-block; }
.hh-sl input[type=range] { width: 130px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
</style>
