<script setup lang="ts">
import { ref, computed } from 'vue'

// ── State ─────────────────────────────────────────────────────
const zMeas  = ref(2.0)   // mesure courante (live)
const x0     = ref(-1.0)  // moyenne du prior
const sigSqP = ref(1.5)   // variance du prior σ²_prior
const sigSqZ = ref(0.5)   // variance de mesure σ²_z (fixe)

// Mesures accumulées + la mesure live courante (jamais vide)
const committed = ref<number[]>([])
const zAll  = computed(() => [...committed.value, zMeas.value])
const nMeas = computed(() => zAll.value.length)
const sumZ  = computed(() => zAll.value.reduce((s, z) => s + z, 0))

function addMeasure() { committed.value = [...committed.value, zMeas.value] }
function resetMeas()  { committed.value = [] }

// ── Estimateurs optimaux ──────────────────────────────────────
// MLE = moyenne des mesures ; MAP = moyenne pondérée par précision,
// prior compris. Plus il y a de mesures, plus le prior s'efface.
const xMLE = computed(() => sumZ.value / nMeas.value)

const xMAP = computed(() => {
  const ip = 1 / sigSqP.value
  const iz = 1 / sigSqZ.value
  return (sumZ.value * iz + x0.value * ip) / (nMeas.value * iz + ip)
})

// ── SVG layout constants ──────────────────────────────────────
// Left panel: x ∈ [0,271], right panel: x ∈ [287,558]
// Y: world x ∈ [-6,6] → svg_x; cost ∈ [0, maxCost] → svg_y ∈ [195,20]
const NX  = 100
const YB  = 200, YT = 22

function panel(side: 'L' | 'R') {
  return { xl: side === 'L' ? 5 : 287, xr: side === 'L' ? 276 : 554 }
}

function wx(x: number, side: 'L' | 'R') {
  const { xl, xr } = panel(side)
  return xl + (x + 6) / 12 * (xr - xl)
}

function wy(cost: number, maxCost: number) {
  return YB - Math.min(cost / maxCost, 1.15) * (YB - YT)
}

// ── Cost functions ────────────────────────────────────────────
function jMLE(x: number) {
  return zAll.value.reduce((s, z) => s + (x - z) ** 2, 0) / (2 * sigSqZ.value)
}
function jPrior(x: number) { return (x - x0.value) ** 2 / (2 * sigSqP.value) }
function jMAP(x: number) { return jMLE(x) + jPrior(x) }

// Échelle FIXE = coût d'UNE mesure au bord du panneau (ne grandit pas avec n).
// Ainsi J_MLE (somme sur n mesures) resserre visiblement la parabole quand on
// ajoute des mesures, au lieu d'être renormalisé à forme constante.
const maxCostL = computed(() => {
  const c = xMLE.value
  const edge = Math.max((c + 6) ** 2, (c - 6) ** 2)
  return Math.max(edge / (2 * sigSqZ.value), 0.01)
})

const maxCostR = computed(() => {
  let m = 0
  for (let i = 0; i <= NX; i++) {
    const x = -6 + i / NX * 12
    m = Math.max(m, jMLE(x), jPrior(x), jMAP(x))
  }
  return Math.max(m, 0.01)
})

function pts(fn: (x: number) => number, maxCost: number, side: 'L' | 'R'): string {
  return Array.from({ length: NX + 1 }, (_, i) => {
    const x = -6 + i / NX * 12
    return `${wx(x, side).toFixed(1)},${wy(fn(x), maxCost).toFixed(1)}`
  }).join(' ')
}

const mlePtsL  = computed(() => pts(jMLE,   maxCostL.value, 'L'))
const mlePtsR  = computed(() => pts(jMLE,   maxCostR.value, 'R'))
const priorPts = computed(() => pts(jPrior, maxCostR.value, 'R'))
const mapPts   = computed(() => pts(jMAP,   maxCostR.value, 'R'))

// Axis ticks
const axisTicks = [-4, -2, 0, 2, 4]
</script>

<template>
  <div class="mle-wrap">
    <svg viewBox="0 0 558 215" class="mle-svg">
      <!-- ══════ LEFT PANEL — MLE ══════ -->
      <rect x="2" y="2" width="274" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="139" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        MLE — Maximum de Vraisemblance
      </text>
      <text x="139" y="23" text-anchor="middle"
        style="font-size:8px;fill:#F15A22;font-family:monospace">
        J_MLE(x) = Σᵢ (x − zᵢ)² / (2σ²_z)
      </text>

      <!-- axes -->
      <line :x1="panel('L').xl" :y1="YB" :x2="panel('L').xr+2" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="panel('L').xl" :y1="YT-2" :x2="panel('L').xl" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <g v-for="t in axisTicks" :key="t">
        <line :x1="wx(t,'L')" :y1="YB" :x2="wx(t,'L')" :y2="YB+4" stroke="#475569" stroke-width="1"/>
        <text :x="wx(t,'L')" :y="YB+12" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ t }}</text>
      </g>
      <text x="145" y="213" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-style:italic;font-family:sans-serif">x</text>

      <!-- MLE cost curve -->
      <polyline :points="mlePtsL" fill="none" stroke="#F15A22" stroke-width="2.5"
        stroke-linejoin="round" stroke-linecap="round"/>

      <!-- tics des mesures accumulées -->
      <line v-for="(z, i) in zAll" :key="`ztL${i}`"
        :x1="wx(z,'L')" :y1="YB-5" :x2="wx(z,'L')" :y2="YB+5"
        stroke="#F15A22" stroke-width="1.6" opacity="0.7"/>

      <!-- x̂_MLE marker -->
      <line :x1="wx(xMLE,'L')" :y1="YT" :x2="wx(xMLE,'L')" :y2="YB"
        stroke="#CF1C24" stroke-width="1.5" stroke-dasharray="5,2"/>
      <text :x="wx(xMLE,'L')+5" :y="YB-8"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        x̂_MLE = {{ xMLE.toFixed(2) }}
      </text>
      <!-- cross at minimum -->
      <line :x1="wx(xMLE,'L')-6" :y1="wy(jMLE(xMLE), maxCostL)+2"
            :x2="wx(xMLE,'L')+6" :y2="wy(jMLE(xMLE), maxCostL)+2" stroke="#CF1C24" stroke-width="2.5"/>
      <line :x1="wx(xMLE,'L')" :y1="wy(jMLE(xMLE), maxCostL)-4"
            :x2="wx(xMLE,'L')" :y2="wy(jMLE(xMLE), maxCostL)+8" stroke="#CF1C24" stroke-width="2.5"/>

      <!-- legend -->
      <rect x="15" y="193" width="10" height="3" fill="#F15A22" rx="1"/>
      <text x="28" y="197" style="font-size:7.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">J_MLE</text>
      <text x="139" y="197" text-anchor="middle"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:monospace">n={{ nMeas }} · σ̂=√(σ²_z/n)={{ Math.sqrt(sigSqZ/nMeas).toFixed(2) }}</text>

      <!-- ══════ RIGHT PANEL — MAP ══════ -->
      <rect x="284" y="2" width="272" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="420" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        MAP — Maximum A Posteriori
      </text>
      <text x="420" y="23" text-anchor="middle"
        style="font-size:8px;fill:#25B34B;font-family:monospace">
        J_MAP = J_MLE + J_prior
      </text>

      <!-- axes -->
      <line :x1="panel('R').xl" :y1="YB" :x2="panel('R').xr+2" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <line :x1="panel('R').xl" :y1="YT-2" :x2="panel('R').xl" :y2="YB" stroke="#475569" stroke-width="1.2"/>
      <g v-for="t in axisTicks" :key="t">
        <line :x1="wx(t,'R')" :y1="YB" :x2="wx(t,'R')" :y2="YB+4" stroke="#475569" stroke-width="1"/>
        <text :x="wx(t,'R')" :y="YB+12" text-anchor="middle"
          style="font-size:7.5px;fill:#475569;font-family:sans-serif">{{ t }}</text>
      </g>
      <text x="422" y="213" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-style:italic;font-family:sans-serif">x</text>

      <!-- Prior curve (blue) -->
      <polyline :points="priorPts" fill="none" stroke="#00BDF2" stroke-width="1.8"
        stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="5,2" opacity="0.9"/>
      <!-- MLE curve (orange, faded) -->
      <polyline :points="mlePtsR" fill="none" stroke="#F15A22" stroke-width="1.8"
        stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>
      <!-- MAP = total cost (green, thick) -->
      <polyline :points="mapPts" fill="none" stroke="#25B34B" stroke-width="3"
        stroke-linejoin="round" stroke-linecap="round"/>

      <!-- x0 marker -->
      <line :x1="wx(x0,'R')" :y1="YT" :x2="wx(x0,'R')" :y2="YB"
        stroke="#00BDF2" stroke-width="1" stroke-dasharray="4,2" opacity="0.7"/>
      <text :x="wx(x0,'R')+3" :y="YT+12"
        style="font-size:7.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">x₀={{ x0.toFixed(1) }}</text>

      <!-- x̂_MLE marker (dashed) -->
      <line :x1="wx(xMLE,'R')" :y1="YT" :x2="wx(xMLE,'R')" :y2="YB"
        stroke="#F15A22" stroke-width="1" stroke-dasharray="3,2" opacity="0.6"/>
      <text :x="wx(xMLE,'R')+3" :y="YT+22"
        style="font-size:7.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">x̂_MLE={{ xMLE.toFixed(2) }}</text>

      <!-- x̂_MAP marker -->
      <line :x1="wx(xMAP,'R')" :y1="YT" :x2="wx(xMAP,'R')" :y2="YB"
        stroke="#25B34B" stroke-width="1.8" stroke-dasharray="5,2"/>
      <text :x="wx(xMAP,'R')+4" :y="YB-10"
        style="font-size:8px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        x̂_MAP = {{ xMAP.toFixed(2) }}
      </text>
      <!-- cross at MAP minimum -->
      <line :x1="wx(xMAP,'R')-6" :y1="wy(jMAP(xMAP), maxCostR)+2"
            :x2="wx(xMAP,'R')+6" :y2="wy(jMAP(xMAP), maxCostR)+2" stroke="#25B34B" stroke-width="2.5"/>
      <line :x1="wx(xMAP,'R')" :y1="wy(jMAP(xMAP), maxCostR)-4"
            :x2="wx(xMAP,'R')" :y2="wy(jMAP(xMAP), maxCostR)+8" stroke="#25B34B" stroke-width="2.5"/>

      <!-- legend -->
      <rect x="293" y="191" width="10" height="3" fill="#F15A22" rx="1" opacity="0.7"/>
      <text x="306" y="196" style="font-size:7.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">J_MLE</text>
      <rect x="343" y="191" width="10" height="3" fill="#00BDF2" rx="1"/>
      <text x="356" y="196" style="font-size:7.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">J_prior</text>
      <rect x="395" y="191" width="10" height="3" fill="#25B34B" rx="1"/>
      <text x="408" y="196" style="font-size:7.5px;fill:#25B34B;font-weight:700;font-family:sans-serif">J_MAP = somme</text>
    </svg>

    <!-- Controls -->
    <div class="mle-controls">
      <label class="mle-sl">
        <span class="mle-lbl" style="color:#F15A22">z (mesure)</span>
        <strong style="color:#F15A22">{{ zMeas.toFixed(1) }}</strong>
        <input type="range" v-model.number="zMeas" min="-4" max="4" step="0.1"/>
      </label>
      <label class="mle-sl">
        <span class="mle-lbl" style="color:#00BDF2">x₀ (prior)</span>
        <strong style="color:#00BDF2">{{ x0.toFixed(1) }}</strong>
        <input type="range" v-model.number="x0" min="-4" max="4" step="0.1"/>
      </label>
      <label class="mle-sl">
        <span class="mle-lbl" style="color:#25B34B">σ²_prior</span>
        <strong style="color:#25B34B">{{ sigSqP.toFixed(1) }}</strong>
        <input type="range" v-model.number="sigSqP" min="0.1" max="5.0" step="0.1"/>
      </label>
      <button class="mle-btn" @click="addMeasure">+ Nouvelle mesure</button>
      <button class="mle-btn mle-reset" @click="resetMeas">↺ Reset</button>
      <div class="mle-info">
        Plus de mesures ⟹ MLE se resserre, x̂_MAP → x̂_MLE (le prior s'efface)
      </div>
    </div>
  </div>
</template>

<style scoped>
.mle-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.mle-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.mle-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mle-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.mle-lbl { min-width: 60px; }
.mle-sl strong { min-width: 28px; display: inline-block; }
.mle-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.mle-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.mle-btn:hover { background: #CF1C24; color: white; }
.mle-btn.mle-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.mle-btn.mle-reset:hover { background: #94a3b8; color: white; }
.mle-info {
  font-size: 0.68rem; color: #64748b; font-style: italic;
  padding: 2px 8px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 4px;
}
</style>
