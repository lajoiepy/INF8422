<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Système : robot 1D, commande connue u, filtre de Kalman ───
// Vérité   : x⁺ = x + u + w,  w ~ N(0, Q)
// Prédire  : μ ← μ + u ;  P ← P + Q        (l'incertitude gonfle)
// Corriger : K = P/(P+R) ; μ ← μ + K(z−μ) ; P ← (1−K)P  (elle rétrécit)
const XMIN = 0, XMAX = 10, U = 0.45

const Q = ref(0.15)
const R = ref(0.50)
const sensorOn = ref(true)

const xTrue = ref(5.5)
const mu = ref(4.0)
const P = ref(2.25)
const dir = ref(1)
const phase = ref<'predict' | 'update'>('predict') // prochaine demi-étape
const lastZ = ref<number | null>(null)
const lastK = ref<number | null>(null)
const nStep = ref(0)

// Historique de σ pour la « respiration » (dernières demi-étapes)
const HIST_N = 64
const hist = ref<{ s: number; ph: 'predict' | 'update' | 'skip' }[]>([{ s: Math.sqrt(2.25), ph: 'update' }])

function randn(): number {
  let u1 = 0
  while (u1 === 0) u1 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random())
}

function halfStep() {
  if (phase.value === 'predict') {
    // La vérité bouge (commande + bruit de procédé)…
    if (xTrue.value > XMAX - 0.7) dir.value = -1
    if (xTrue.value < XMIN + 0.7) dir.value = 1
    xTrue.value += dir.value * U + randn() * Math.sqrt(Q.value)
    // …et le filtre prédit avec la commande connue : P gonfle de Q.
    mu.value += dir.value * U
    P.value += Q.value
    lastZ.value = null
    phase.value = 'update'
    pushHist('predict')
  } else {
    if (sensorOn.value) {
      const z = xTrue.value + randn() * Math.sqrt(R.value)
      const K = P.value / (P.value + R.value)
      mu.value += K * (z - mu.value)
      P.value *= (1 - K)
      lastZ.value = z
      lastK.value = K
      pushHist('update')
    } else {
      lastZ.value = null
      pushHist('skip') // correction sautée : σ reste au niveau prédit
    }
    phase.value = 'predict'
    nStep.value++
  }
}

function pushHist(ph: 'predict' | 'update' | 'skip') {
  hist.value.push({ s: Math.sqrt(P.value), ph })
  if (hist.value.length > HIST_N) hist.value.shift()
}

const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function play() {
  if (running.value) { pause(); return }
  running.value = true
  timer = setInterval(halfStep, 450)
}
function pause() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function reset() {
  pause()
  xTrue.value = 5.5; mu.value = 4.0; P.value = 2.25; dir.value = 1
  phase.value = 'predict'; lastZ.value = null; lastK.value = null; nStep.value = 0
  hist.value = [{ s: 1.5, ph: 'update' }]
}
onUnmounted(pause)

// ── Panneau gauche : croyance N(μ, P) sur l'axe ───────────────
const GX0 = 20, GX1 = 366, GY0 = 168, GY1 = 26
const YSCALE = 1.5
function gx(x: number): number { return GX0 + (x - XMIN) / (XMAX - XMIN) * (GX1 - GX0) }
function gy(p: number): number { return GY0 - Math.min(p, YSCALE) / YSCALE * (GY0 - GY1) }
function gaussPdf(x: number, m: number, s: number): number {
  const z = (x - m) / s
  return Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * Math.PI))
}
const beliefPath = computed(() => {
  const s = Math.sqrt(P.value)
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const x = XMIN + (XMAX - XMIN) * i / 120
    pts.push(`${gx(x).toFixed(1)},${gy(gaussPdf(x, mu.value, s)).toFixed(1)}`)
  }
  return 'M' + pts.join(' L')
})
const sigmaNow = computed(() => Math.sqrt(P.value))

// ── Panneau droit : chronologie de σ ──────────────────────────
const TX0 = 396, TX1 = 542, TY0 = 168, TY1 = 34
const SMAX = 2.2
function tx(i: number): number { return TX0 + i / (HIST_N - 1) * (TX1 - TX0) }
function ty(s: number): number { return TY0 - Math.min(s, SMAX) / SMAX * (TY0 - TY1) }
const histPath = computed(() =>
  'M' + hist.value.map((h, i) => `${tx(i).toFixed(1)},${ty(h.s).toFixed(1)}`).join(' L'))
</script>

<template>
  <div class="kc-wrap">
    <svg viewBox="0 0 558 215" class="kc-svg">
      <!-- Panneau gauche : la croyance sur l'axe -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <line :x1="GX0" :y1="GY0" :x2="GX1" :y2="GY0" stroke="#94a3b8" stroke-width="1"/>
      <text :x="(GX0+GX1)/2" y="182" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">position x (m)</text>

      <!-- Croyance N(μ, P) -->
      <path :d="beliefPath" fill="none" stroke="#00BDF2" stroke-width="2.2"/>
      <line :x1="gx(mu)" :y1="GY0" :x2="gx(mu)" :y2="gy(gaussPdf(mu, mu, sigmaNow))"
        stroke="#00BDF2" stroke-width="1" stroke-dasharray="3,2" style="opacity:0.6"/>

      <!-- Vérité (cachée du filtre) -->
      <path :d="`M${gx(xTrue)},${GY0-9} l-5,9 l10,0 Z`" fill="#334155"/>
      <!-- Dernière mesure -->
      <g v-if="lastZ !== null">
        <line :x1="gx(lastZ)" :y1="GY0" :x2="gx(lastZ)" :y2="GY0-26"
          stroke="#F15A22" stroke-width="2"/>
        <text :x="gx(lastZ)" :y="GY0-30" text-anchor="middle"
          style="font-size:7px;fill:#c2410c;font-family:monospace">z</text>
      </g>

      <!-- Légende -->
      <g style="font-size:7.5px;font-family:sans-serif">
        <line x1="24" y1="19" x2="38" y2="19" stroke="#00BDF2" stroke-width="2.2"/>
        <text x="42" y="22" fill="#0284c7">croyance N(μ, P)</text>
        <path d="M132,15 l-4,7 l8,0 Z" fill="#334155"/>
        <text x="142" y="22" fill="#334155">vérité x (cachée)</text>
        <line x1="228" y1="15" x2="228" y2="22" stroke="#F15A22" stroke-width="2"/>
        <text x="233" y="22" fill="#c2410c">mesure z</text>
      </g>

      <!-- Bandeau d'état -->
      <rect x="16" y="188" width="358" height="14" fill="white" rx="3" stroke="#e2e8f0"/>
      <text x="24" y="198" style="font-size:7.5px;font-family:monospace;fill:#334155">
        σ = {{ sigmaNow.toFixed(2) }} m
        <tspan dx="8" :fill="phase === 'predict' ? '#c2410c' : '#0284c7'" font-weight="700">
          prochaine étape : {{ phase === 'predict' ? 'PRÉDIRE (P ← P + Q)' : (sensorOn ? 'CORRIGER (P ← (1−K)P)' : 'CORRIGER — capteur coupé !') }}
        </tspan>
        <tspan v-if="lastK !== null" dx="8" fill="#15803d">K = {{ lastK.toFixed(2) }}</tspan>
      </text>

      <!-- Panneau droit : respiration de σ -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">σ au fil des étapes</text>
      <line :x1="TX0" :y1="TY0" :x2="TX1" :y2="TY0" stroke="#94a3b8" stroke-width="1"/>
      <path :d="histPath" fill="none" stroke="#64748b" stroke-width="1.4"/>
      <template v-for="(h, i) in hist" :key="i">
        <circle :cx="tx(i)" :cy="ty(h.s)" r="1.8"
          :fill="h.ph === 'predict' ? '#F15A22' : (h.ph === 'skip' ? '#CF1C24' : '#00BDF2')"/>
      </template>
      <g style="font-size:6.8px;font-family:sans-serif">
        <circle cx="402" cy="184" r="2.2" fill="#F15A22"/>
        <text x="407" y="187" fill="#c2410c">prédire ↑</text>
        <circle cx="452" cy="184" r="2.2" fill="#00BDF2"/>
        <text x="457" y="187" fill="#0284c7">corriger ↓</text>
        <circle cx="504" cy="184" r="2.2" fill="#CF1C24"/>
        <text x="509" y="187" fill="#CF1C24">coupé</text>
      </g>
      <text x="470" y="199" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">l'incertitude « respire »</text>
    </svg>

    <div class="kc-controls">
      <button class="kc-btn" @click="halfStep" :disabled="running">Étape</button>
      <button class="kc-btn" :class="{ 'kc-on': running }" @click="play">{{ running ? '⏸ Pause' : '▶ Lecture' }}</button>
      <button class="kc-btn" @click="reset">Reset</button>
      <button class="kc-btn" :class="{ 'kc-cut': !sensorOn }" @click="sensorOn = !sensorOn">
        {{ sensorOn ? '📡 capteur ON' : '📡 capteur COUPÉ' }}
      </button>
      <label class="kc-sl">
        Q <strong>{{ Q.toFixed(2) }}</strong>
        <input type="range" v-model.number="Q" min="0.02" max="0.6" step="0.01"/>
      </label>
      <label class="kc-sl">
        R <strong>{{ R.toFixed(2) }}</strong>
        <input type="range" v-model.number="R" min="0.05" max="3" step="0.05"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.kc-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.kc-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.kc-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.kc-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.7rem; color: #334155;
}
.kc-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.kc-sl input[type=range] { width: 100px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.kc-btn {
  font-family: monospace; font-size: 0.68rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.kc-btn:hover:not(:disabled) { background: #e2e8f0; }
.kc-btn:disabled { opacity: 0.5; cursor: default; }
.kc-on { background: #CF1C24; color: white; border-color: #CF1C24; }
.kc-cut { background: #F15A22; color: white; border-color: #F15A22; }
</style>
