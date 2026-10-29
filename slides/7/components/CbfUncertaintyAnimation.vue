<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Système : robot 1D cinématique ẋ = u, obstacle fixe ───────
// h(x) = x_obs − x − d_min ≥ 0 définit l'ensemble sûr.
// Filtre CBF robuste : u = clamp( α·h(x) − κ·σ(x), 0, v_max ).
// (Pour ẋ = u et h = x_obs − x − d_min, ḣ = −u : la contrainte
//  ḣ + αh ≥ κσ donne exactement u ≤ αh − κσ.)
const X_OBS = 10, D_MIN = 0.5, V_MAX = 2.0, ALPHA = 1.0
const D0 = 5 // distance de référence du modèle stéréo (m)

const kappa = ref(2.0)
const sigma0 = ref(0.5)
const mode = ref<'const' | 'stereo'>('const')

// σ(x) : constante, ou stéréo σ₀·(d/d₀)² avec d = distance à l'obstacle
function sigmaAt(x: number): number {
  if (mode.value === 'const') return sigma0.value
  const d = Math.max(X_OBS - x, 0)
  return sigma0.value * (d / D0) ** 2
}

function hOf(x: number): number { return X_OBS - x - D_MIN }
function uOf(x: number): number {
  return Math.max(0, Math.min(V_MAX, ALPHA * hOf(x) - kappa.value * sigmaAt(x)))
}

// Distance d'arrêt prédite : αh = κσ, atteinte depuis la position courante.
// Si u ≤ 0 déjà (κσ ≥ αh), le robot est gelé sur place — en mode stéréo,
// impossible de réduire σ sans avancer : blocage (deadlock du contrôle robuste).
const frozen = computed(() => uOf(x.value) <= 1e-9 && hOf(x.value) > 0.02)
const hStop = computed(() => {
  if (frozen.value) return hOf(x.value)
  if (kappa.value === 0) return 0
  if (mode.value === 'const') return Math.min(kappa.value * sigma0.value / ALPHA, hOf(x.value))
  // stéréo : αh = κσ₀((h+d_min)/d₀)² → κc·h² + (2κc·d_min − α)h + κc·d_min² = 0
  const c = kappa.value * sigma0.value / (D0 * D0)
  const A = c, B = 2 * c * D_MIN - ALPHA, C = c * D_MIN * D_MIN
  const disc = B * B - 4 * A * C
  if (disc < 0) return 0
  // en venant de h grand avec u > 0, le robot descend jusqu'à la petite racine
  const r1 = (-B - Math.sqrt(disc)) / (2 * A)
  return Math.max(0, r1)
})

// ── Simulation temps réel ─────────────────────────────────────
const x = ref(0)
const running = ref(false)
const DT = 0.04
let timer: ReturnType<typeof setInterval> | null = null

function start() {
  if (running.value) return
  running.value = true
  timer = setInterval(() => {
    const u = uOf(x.value)
    x.value = Math.min(x.value + u * DT, X_OBS - D_MIN)
    if (u < 1e-3) stop()
  }, 20)
}
function stop() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function reset() { stop(); x.value = 0 }
onUnmounted(stop)

const uNow = computed(() => uOf(x.value))
const sigmaNow = computed(() => sigmaAt(x.value))

// ── Corridor (bandeau haut) ───────────────────────────────────
const CX0 = 24, CX1 = 534, CY = 46
function cx(xx: number): number { return CX0 + xx / X_OBS * (CX1 - CX0) }

// ── Panneau bas : profils vs x ────────────────────────────────
const PX0 = 40, PX1 = 366, PY0 = 192, PY1 = 96
const YMAXP = 3.2 // échelle commune (m/s et m)
function px(xx: number): number { return PX0 + xx / X_OBS * (PX1 - PX0) }
function py(v: number): number { return PY0 - Math.min(v, YMAXP) / YMAXP * (PY0 - PY1) }

function profile(fn: (x: number) => number): string {
  const pts: string[] = []
  for (let g = 0; g <= 130; g++) {
    const xx = (X_OBS - D_MIN) * g / 130
    pts.push(`${px(xx).toFixed(1)},${py(fn(xx)).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
}
const uProfile = computed(() => profile(uOf))
const hTermProfile = computed(() => profile(xx => ALPHA * hOf(xx)))
const marginProfile = computed(() => profile(xx => kappa.value * sigmaAt(xx)))

const xStopPred = computed(() => X_OBS - D_MIN - hStop.value)
</script>

<template>
  <div class="cbf-wrap">
    <svg viewBox="0 0 558 215" class="cbf-svg">
      <!-- Bandeau corridor -->
      <rect x="8" y="8" width="542" height="76" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <line :x1="CX0" :y1="CY + 14" :x2="CX1" :y2="CY + 14" stroke="#94a3b8" stroke-width="1"/>

      <!-- Obstacle + zone d_min -->
      <rect :x="cx(10)" y="20" width="10" height="40" fill="#475569"/>
      <rect :x="cx(10 - D_MIN)" y="24" :width="cx(10) - cx(10 - D_MIN)" height="36" fill="#CF1C24" style="opacity:0.15"/>
      <text :x="cx(10 - D_MIN/2)" y="18" text-anchor="middle" style="font-size:6px;fill:#CF1C24;font-family:monospace">d_min</text>

      <!-- Bulle d'incertitude sur l'obstacle perçu : ±2σ(x) -->
      <rect :x="cx(Math.max(10 - 2*sigmaNow, 0))" y="28" :width="Math.max(cx(10 + 2*sigmaNow) - cx(Math.max(10 - 2*sigmaNow, 0)), 2)"
        height="28" fill="#F15A22" style="opacity:0.3" rx="3"/>
      <text :x="cx(10)" y="72" text-anchor="middle"
        style="font-size:6.5px;fill:#c2410c;font-family:monospace">obstacle ± 2σ</text>

      <!-- Arrêt prédit (étiquette décalée à gauche pour ne pas chevaucher « obstacle ± 2σ ») -->
      <line :x1="cx(xStopPred)" y1="24" :x2="cx(xStopPred)" y2="60"
        stroke="#25B34B" stroke-width="1.2" stroke-dasharray="4,2"/>
      <text v-if="xStopPred < 8.2" :x="cx(xStopPred) - 5" y="72" text-anchor="end"
        style="font-size:6.5px;fill:#15803d;font-family:monospace">arrêt : αh = κσ</text>

      <!-- Robot -->
      <rect :x="cx(x) - 9" :y="CY - 8" width="18" height="14" fill="#00BDF2" rx="2" stroke="#0284c7"/>
      <circle :cx="cx(x) - 4" :cy="CY + 8" r="2.6" fill="#334155"/>
      <circle :cx="cx(x) + 4" :cy="CY + 8" r="2.6" fill="#334155"/>
      <text :x="cx(x)" :y="CY - 13" text-anchor="middle"
        style="font-size:6.5px;fill:#0369a1;font-family:monospace">v = {{ uNow.toFixed(2) }} m/s</text>

      <!-- Panneau profils -->
      <rect x="8" y="90" width="374" height="117" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <line :x1="PX0" :y1="PY0" :x2="PX1" :y2="PY0" stroke="#94a3b8" stroke-width="1"/>
      <line :x1="PX0" :y1="PY0" :x2="PX0" :y2="PY1" stroke="#94a3b8" stroke-width="1"/>

      <path :d="hTermProfile" fill="none" stroke="#94a3b8" stroke-width="1.1" stroke-dasharray="4,3"/>
      <path :d="marginProfile" fill="none" stroke="#F15A22" stroke-width="1.4"/>
      <path :d="uProfile" fill="none" stroke="#00BDF2" stroke-width="2"/>
      <circle :cx="px(Math.min(x, 9.5))" :cy="py(uNow)" r="3" fill="#00BDF2" stroke="white" stroke-width="0.8"/>
      <line :x1="px(xStopPred)" :y1="PY0" :x2="px(xStopPred)" :y2="PY1" stroke="#25B34B" stroke-width="1" stroke-dasharray="4,2"/>

      <g style="font-size:6.6px;font-family:sans-serif">
        <line x1="46" y1="102" x2="58" y2="102" stroke="#00BDF2" stroke-width="2"/>
        <text x="61" y="105" fill="#0369a1">u(x) commande filtrée</text>
        <line x1="152" y1="102" x2="164" y2="102" stroke="#F15A22" stroke-width="1.4"/>
        <text x="167" y="105" fill="#c2410c">κ·σ(x) marge</text>
        <line x1="234" y1="102" x2="246" y2="102" stroke="#94a3b8" stroke-width="1.1" stroke-dasharray="4,3"/>
        <text x="249" y="105" fill="#64748b">α·h(x)</text>
      </g>
      <text :x="(PX0+PX1)/2" y="203" text-anchor="middle"
        style="font-size:6.8px;fill:#64748b;font-family:sans-serif">position x (m) — le robot s'arrête là où α·h(x) rejoint κ·σ(x)</text>

      <!-- Panneau info -->
      <rect x="390" y="90" width="160" height="117" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <rect x="398" y="98" width="144" height="24" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="113" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:monospace">u = min(v_max, αh − κσ)</text>

      <g style="font-size:7.4px;font-family:monospace">
        <text x="398" y="138" fill="#334155">x = {{ x.toFixed(2) }} m   h = {{ hOf(x).toFixed(2) }} m</text>
        <text x="398" y="153" fill="#c2410c">σ(x) = {{ sigmaNow.toFixed(3) }} m</text>
        <text x="398" y="168" :fill="frozen ? '#CF1C24' : '#15803d'" font-weight="700">{{ frozen ? '⚠ gelé : κσ ≥ αh partout devant' : `arrêt prédit : h* = ${hStop.toFixed(2)} m` }}</text>
      </g>

      <text x="470" y="186" text-anchor="middle"
        style="font-size:6.4px;fill:#1d4ed8;font-family:sans-serif">{{ frozen ? 'Trop incertain pour avancer — et sans' : mode === 'const' ? 'σ constante : le robot garde une' : 'σ stéréo : s\'approcher réduit σ,' }}</text>
      <text x="470" y="196" text-anchor="middle"
        style="font-size:6.4px;fill:#1d4ed8;font-family:sans-serif">{{ frozen ? 'avancer, σ ne baissera jamais (deadlock)' : mode === 'const' ? 'distance de sécurité h* = κσ/α' : 'le robot peut continuer prudemment' }}</text>
    </svg>

    <div class="cbf-controls">
      <button class="cbf-btn" @click="start" :disabled="running">▶ Simuler</button>
      <button class="cbf-btn" @click="reset">Reset</button>
      <label class="cbf-sl">
        κ (quantile)
        <strong>{{ kappa.toFixed(1) }}</strong>
        <input type="range" v-model.number="kappa" min="0" max="3" step="0.1"/>
      </label>
      <label class="cbf-sl">
        σ₀ (m)
        <strong>{{ sigma0.toFixed(2) }}</strong>
        <input type="range" v-model.number="sigma0" min="0.05" max="1" step="0.05"/>
      </label>
      <button class="cbf-btn" :class="{ 'cbf-on': mode === 'const' }" @click="mode = 'const'">σ constante</button>
      <button class="cbf-btn" :class="{ 'cbf-on': mode === 'stereo' }" @click="mode = 'stereo'">σ(d) = σ₀(d/5)²</button>
    </div>
  </div>
</template>

<style scoped>
.cbf-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.cbf-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.cbf-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.cbf-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.cbf-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.cbf-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.cbf-btn {
  font-family: monospace; font-size: 0.68rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.cbf-btn:hover:not(:disabled) { background: #e2e8f0; }
.cbf-btn:disabled { opacity: 0.5; cursor: default; }
.cbf-on { background: #CF1C24; color: white; border-color: #CF1C24; }
</style>
