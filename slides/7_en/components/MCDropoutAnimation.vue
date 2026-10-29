<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ── PRNG seedé (mulberry32) : poids fixes, reproductibles ─────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Mini-MLP 1 → 8 → 1 (tanh), poids fixes ────────────────────
const H = 8
const rngW = mulberry32(42)
const W1 = Array.from({ length: H }, () => (rngW() * 2 - 1) * 1.5)
const B1 = Array.from({ length: H }, () => (rngW() * 2 - 1) * 0.5)
const W2 = Array.from({ length: H }, () => (rngW() * 2 - 1) * 1.2)
const B2 = (rngW() * 2 - 1) * 0.3

const X_INPUT = 0.8 // entrée fixe

const dropRate = ref(0.3)
const rngMask = ref(mulberry32(7))

// Forward pass avec dropout inversé : h̃ = h·m/(1−p)
function forward(mask: boolean[]): number {
  let y = B2
  for (let i = 0; i < H; i++) {
    if (!mask[i]) continue
    const h = Math.tanh(W1[i] * X_INPUT + B1[i])
    y += W2[i] * (h / (1 - dropRate.value))
  }
  return y
}

function sampleMask(): boolean[] {
  return Array.from({ length: H }, () => rngMask.value() >= dropRate.value)
}

const samples = ref<number[]>([])
const lastMask = ref<boolean[]>(new Array(H).fill(true))

function onePass() {
  const m = sampleMask()
  lastMask.value = m
  samples.value = [...samples.value, forward(m)]
}

function manyPasses() { for (let i = 0; i < 20; i++) onePass() }

function reset() {
  samples.value = []
  lastMask.value = new Array(H).fill(true)
  rngMask.value = mulberry32(7)
}

// La distribution change avec p → on repart de zéro
watch(dropRate, reset)

// ── Statistiques empiriques ───────────────────────────────────
const stats = computed(() => {
  const n = samples.value.length
  if (n === 0) return { n: 0, mu: 0, sigma: 0 }
  const mu = samples.value.reduce((a, b) => a + b, 0) / n
  const varE = samples.value.reduce((a, b) => a + (b - mu) ** 2, 0) / n
  return { n, mu, sigma: Math.sqrt(varE) }
})

// ── Histogramme ───────────────────────────────────────────────
const HB = 15 // nombre de bins
const histo = computed(() => {
  if (samples.value.length === 0) return { bins: new Array(HB).fill(0), lo: -1, hi: 1, max: 1 }
  const lo = Math.min(...samples.value) - 0.15
  const hi = Math.max(...samples.value) + 0.15
  const bins = new Array(HB).fill(0)
  for (const s of samples.value) {
    const b = Math.min(HB - 1, Math.floor((s - lo) / (hi - lo) * HB))
    bins[b]++
  }
  return { bins, lo, hi, max: Math.max(...bins, 1) }
})

// ── Layout réseau ─────────────────────────────────────────────
const NX_IN = 45, NX_HID = 128, NX_OUT = 208
const NY_MID = 108
function hy(i: number): number { return 34 + i * 21 }

// ── Layout histogramme ────────────────────────────────────────
const HX0 = 258, HX1 = 384, HY0 = 175, HY1 = 40
function hxPos(v: number): number {
  return HX0 + (v - histo.value.lo) / (histo.value.hi - histo.value.lo) * (HX1 - HX0)
}
</script>

<template>
  <div class="mcd-wrap">
    <svg viewBox="0 0 558 215" class="mcd-svg">
      <!-- Network panel -->
      <rect x="8" y="8" width="240" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="128" y="22" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Network with active dropout</text>

      <!-- Arêtes -->
      <g>
        <line v-for="i in H" :key="`e1${i}`" :x1="NX_IN" :y1="NY_MID" :x2="NX_HID" :y2="hy(i-1)"
          :stroke="lastMask[i-1] ? '#94a3b8' : '#e2e8f0'" stroke-width="0.8"/>
        <line v-for="i in H" :key="`e2${i}`" :x1="NX_HID" :y1="hy(i-1)" :x2="NX_OUT" :y2="NY_MID"
          :stroke="lastMask[i-1] ? '#94a3b8' : '#e2e8f0'" stroke-width="0.8"/>
      </g>

      <!-- Nœuds -->
      <circle :cx="NX_IN" :cy="NY_MID" r="9" fill="#475569"/>
      <text :x="NX_IN" :y="NY_MID + 3" text-anchor="middle" style="font-size:7px;fill:white;font-family:monospace">x</text>
      <g>
        <circle v-for="i in H" :key="`h${i}`" :cx="NX_HID" :cy="hy(i-1)" r="8"
          :fill="lastMask[i-1] ? '#00BDF2' : '#e2e8f0'"
          :stroke="lastMask[i-1] ? '#0284c7' : '#cbd5e1'" stroke-width="1"/>
      </g>
      <circle :cx="NX_OUT" :cy="NY_MID" r="9" fill="#25B34B"/>
      <text :x="NX_OUT" :y="NY_MID + 3" text-anchor="middle" style="font-size:7px;fill:white;font-family:monospace">y</text>

      <!-- Network legend -->
      <circle cx="30" cy="192" r="5" fill="#00BDF2" stroke="#0284c7"/>
      <text x="39" y="195" style="font-size:6.8px;fill:#475569;font-family:sans-serif">active</text>
      <circle cx="70" cy="192" r="5" fill="#e2e8f0" stroke="#cbd5e1"/>
      <text x="79" y="195" style="font-size:6.8px;fill:#475569;font-family:sans-serif">dropped (mask mᵢ)</text>
      <text x="238" y="195" text-anchor="end" style="font-size:6.8px;fill:#94a3b8;font-family:monospace">h̃ = h·m/(1−p)</text>

      <!-- Histogram panel -->
      <rect x="250" y="8" width="144" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="322" y="22" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Output distribution</text>

      <template v-if="samples.length > 0">
        <g>
          <rect v-for="(b, i) in histo.bins" :key="i"
            :x="HX0 + i * (HX1 - HX0) / 15" :y="HY0 - b / histo.max * (HY0 - HY1)"
            :width="(HX1 - HX0) / 15 - 1" :height="b / histo.max * (HY0 - HY1)"
            fill="#00BDF2" style="opacity:0.75"/>
        </g>
        <!-- μ̂ et ±σ̂ -->
        <line :x1="hxPos(stats.mu)" :y1="HY1 - 4" :x2="hxPos(stats.mu)" :y2="HY0" stroke="#CF1C24" stroke-width="1.5"/>
        <line :x1="hxPos(stats.mu - stats.sigma)" :y1="HY0 + 6" :x2="hxPos(stats.mu + stats.sigma)" :y2="HY0 + 6"
          stroke="#F15A22" stroke-width="2.5"/>
      </template>
      <text v-else x="322" y="110" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-family:sans-serif">run some passes →</text>

      <line :x1="HX0" :y1="HY0" :x2="HX1" :y2="HY0" stroke="#94a3b8" stroke-width="1"/>
      <text x="322" y="196" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">output yₖ (orange bar: μ̂ ± σ̂)</text>

      <!-- Stats panel -->
      <rect x="402" y="8" width="148" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="476" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">MC estimator</text>

      <rect x="410" y="32" width="132" height="36" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="476" y="46" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:monospace">μ̂ = (1/N) Σ f^Ŵₖ(x)</text>
      <text x="476" y="60" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:monospace">σ̂² = (1/N) Σ (yₖ−μ̂)²</text>

      <g style="font-size:8.5px;font-family:monospace">
        <text x="416" y="90" fill="#334155">N = {{ stats.n }} passes</text>
        <text x="416" y="110" fill="#CF1C24" font-weight="700">μ̂  = {{ stats.n ? stats.mu.toFixed(3) : '—' }}</text>
        <text x="416" y="128" fill="#c2410c" font-weight="700">σ̂  = {{ stats.n ? stats.sigma.toFixed(3) : '—' }}</text>
      </g>

      <rect x="410" y="144" width="132" height="42" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="476" y="156" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-family:sans-serif">Each mask = a sub-network</text>
      <text x="476" y="166" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-family:sans-serif">≈ a sample from the posterior.</text>
      <text x="476" y="179" text-anchor="middle"
        style="font-size:6.6px;fill:#1d4ed8;font-weight:700;font-family:sans-serif">σ̂ ≈ epistemic uncertainty</text>
    </svg>

    <div class="mcd-controls">
      <button class="mcd-btn" @click="onePass">1 pass</button>
      <button class="mcd-btn" @click="manyPasses">20 passes</button>
      <button class="mcd-btn" @click="reset">Reset</button>
      <label class="mcd-sl">
        dropout p
        <strong>{{ dropRate.toFixed(2) }}</strong>
        <input type="range" v-model.number="dropRate" min="0.1" max="0.5" step="0.05"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.mcd-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.mcd-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.mcd-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mcd-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.mcd-sl strong { color: #CF1C24; min-width: 32px; display: inline-block; }
.mcd-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.mcd-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 10px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.mcd-btn:hover { background: #e2e8f0; }
</style>
