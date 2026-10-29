<script setup lang="ts">
import { ref, computed } from 'vue'

// ── PRNG seedé ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Jeu synthétique fixe : N prédictions d'un classifieur ─────
// qᵢ = vraie probabilité de succès ; correctᵢ ~ Bernoulli(qᵢ).
// La confiance AFFICHÉE est qᵢ + biais → le biais dérègle la calibration
// mais ne change pas les succès réels.
const N = 1000
const rng = mulberry32(3)
const trueQ: number[] = [], correct: boolean[] = []
for (let i = 0; i < N; i++) {
  const u = rng()
  const q = 1 - 0.5 * u * u   // concentré vers les hautes confiances
  trueQ.push(q)
  correct.push(rng() < q)
}

const bias = ref(0.15)
const M = 10 // bins

// ── Binning + ECE recalculés à chaque changement de biais ─────
const calib = computed(() => {
  const conf = trueQ.map(q => Math.min(0.995, Math.max(0.005, q + bias.value)))
  const bins = Array.from({ length: M }, () => ({ n: 0, acc: 0, conf: 0 }))
  for (let i = 0; i < N; i++) {
    const b = Math.min(M - 1, Math.floor(conf[i] * M))
    bins[b].n++
    bins[b].acc += correct[i] ? 1 : 0
    bins[b].conf += conf[i]
  }
  let ece = 0
  const out = bins.map(b => {
    const acc = b.n > 0 ? b.acc / b.n : 0
    const cf = b.n > 0 ? b.conf / b.n : 0
    if (b.n > 0) ece += (b.n / N) * Math.abs(acc - cf)
    return { n: b.n, acc, conf: cf }
  })
  return { bins: out, ece }
})

// ── Tracé : diagramme de fiabilité ────────────────────────────
const PX0 = 50, PX1 = 330, PY0 = 178, PY1 = 26

function sx(c: number): number { return PX0 + c * (PX1 - PX0) }
function sy(a: number): number { return PY0 - a * (PY0 - PY1) }

const maxBinN = computed(() => Math.max(...calib.value.bins.map(b => b.n), 1))
</script>

<template>
  <div class="rd-wrap">
    <svg viewBox="0 0 558 215" class="rd-svg">
      <!-- Panneau diagramme -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Axes -->
      <line :x1="PX0" :y1="PY0" :x2="PX1" :y2="PY0" stroke="#94a3b8" stroke-width="1"/>
      <line :x1="PX0" :y1="PY0" :x2="PX0" :y2="PY1" stroke="#94a3b8" stroke-width="1"/>
      <text :x="(PX0+PX1)/2" y="200" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">predicted confidence (10 bins)</text>
      <text :x="20" :y="(PY0+PY1)/2" text-anchor="middle" :transform="`rotate(-90 20 ${(PY0+PY1)/2})`"
        style="font-size:7.5px;fill:#64748b;font-family:sans-serif">actual accuracy</text>
      <g style="font-size:6.5px;fill:#94a3b8;font-family:monospace">
        <text :x="PX0" :y="PY0+10" text-anchor="middle">0</text>
        <text :x="sx(0.5)" :y="PY0+10" text-anchor="middle">0.5</text>
        <text :x="PX1" :y="PY0+10" text-anchor="middle">1</text>
        <text :x="PX0-6" :y="sy(1)+3" text-anchor="end">1</text>
        <text :x="PX0-6" :y="sy(0.5)+3" text-anchor="end">0.5</text>
      </g>

      <!-- Diagonale calibration parfaite -->
      <line :x1="sx(0)" :y1="sy(0)" :x2="sx(1)" :y2="sy(1)" stroke="#00BDF2" stroke-width="1.5" stroke-dasharray="5,3"/>

      <!-- Barres accuracy + gaps + confiance -->
      <g>
        <template v-for="(b, m) in calib.bins" :key="m">
          <g v-if="b.n > 0">
            <!-- Gap acc ↔ diagonale au niveau de conf(B_m) : contribution à l'ECE -->
            <rect :x="sx(m/10) + 2" :y="sy(Math.max(b.acc, b.conf))"
              :width="(PX1-PX0)/10 - 4" :height="Math.abs(sy(b.acc) - sy(b.conf))"
              :fill="b.conf > b.acc ? '#CF1C24' : '#2563eb'" style="opacity:0.25"/>
            <!-- Barre accuracy réelle -->
            <rect :x="sx(m/10) + 2" :y="sy(b.acc)" :width="(PX1-PX0)/10 - 4" :height="sy(0) - sy(b.acc)"
              fill="#94a3b8" style="opacity:0.55"/>
            <!-- Confiance moyenne du bin -->
            <circle :cx="sx(m/10) + (PX1-PX0)/20" :cy="sy(b.conf)" r="3" fill="#CF1C24" stroke="white" stroke-width="0.8"/>
            <!-- Poids du bin (petit trait sous l'axe) -->
            <rect :x="sx(m/10) + 2" :y="PY0 + 1" :width="(PX1-PX0)/10 - 4" :height="Math.max(1.5, b.n / maxBinN * 5)"
              fill="#475569" style="opacity:0.5"/>
          </g>
        </template>
      </g>

      <!-- Legend -->
      <g style="font-size:7px;font-family:sans-serif">
        <rect x="58" y="14" width="11" height="7" fill="#94a3b8" style="opacity:0.55"/>
        <text x="72" y="20" fill="#475569">acc(B_m)</text>
        <circle cx="126" cy="17" r="3" fill="#CF1C24"/>
        <text x="132" y="20" fill="#CF1C24">conf(B_m)</text>
        <line x1="184" y1="17" x2="197" y2="17" stroke="#00BDF2" stroke-width="1.5" stroke-dasharray="4,2"/>
        <text x="201" y="20" fill="#0284c7">perfect</text>
        <rect x="240" y="14" width="11" height="7" fill="#CF1C24" style="opacity:0.25"/>
        <text x="254" y="20" fill="#991b1b">gap → ECE</text>
      </g>

      <!-- Right panel -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Expected Calibration Error</text>

      <rect x="398" y="32" width="144" height="24" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="47" text-anchor="middle"
        style="font-size:6.8px;fill:#c2410c;font-family:monospace">ECE = Σ (|B_m|/N)·|acc−conf|</text>

      <text x="470" y="92" text-anchor="middle"
        style="font-size:26px;font-weight:700;font-family:monospace"
        :fill="calib.ece < 0.03 ? '#25B34B' : calib.ece < 0.08 ? '#F15A22' : '#CF1C24'">
        {{ (calib.ece * 100).toFixed(1) }}%
      </text>

      <g style="font-size:7.5px;font-family:monospace">
        <text x="404" y="118" fill="#334155">confidence bias: {{ bias >= 0 ? '+' : '' }}{{ bias.toFixed(2) }}</text>
        <text x="404" y="134" :fill="bias > 0.03 ? '#CF1C24' : bias < -0.03 ? '#2563eb' : '#25B34B'" font-weight="700">
          {{ bias > 0.03 ? 'OVER-confident' : bias < -0.03 ? 'UNDER-confident' : 'well calibrated' }}
        </text>
      </g>

      <rect x="398" y="146" width="144" height="40" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="470" y="158" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">Bias shifts confidences,</text>
      <text x="470" y="168" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">not actual successes: the red</text>
      <text x="470" y="178" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">points leave the diagonal.</text>

      <text x="470" y="200" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">N = 1000 predictions, M = 10 bins</text>
    </svg>

    <div class="rd-controls">
      <label class="rd-sl">
        Confidence bias
        <strong>{{ bias >= 0 ? '+' : '' }}{{ bias.toFixed(2) }}</strong>
        <input type="range" v-model.number="bias" min="-0.3" max="0.3" step="0.01"/>
      </label>
      <button class="rd-btn" @click="bias = 0.2">Over-confident (e.g. +0.20)</button>
      <button class="rd-btn" @click="bias = 0">Calibrated (0)</button>
      <button class="rd-btn" @click="bias = -0.15">Under-confident (e.g. −0.15)</button>
    </div>
  </div>
</template>

<style scoped>
.rd-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.rd-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.rd-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.rd-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.rd-sl strong { color: #CF1C24; min-width: 44px; display: inline-block; }
.rd-sl input[type=range] { width: 130px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.rd-btn {
  font-family: monospace; font-size: 0.68rem; padding: 2px 8px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.rd-btn:hover { background: #e2e8f0; }
</style>
