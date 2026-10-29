<script setup lang="ts">
import { computed, ref } from 'vue'

type Point = { x: number; y: number }

// ── Données synthétiques reproductibles ──────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-12)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const model = (x: number) => 0.78 * Math.sin(1.18 * x)
const NOISE = 0.25

function samplePoints(seed: number, count: number): Point[] {
  const rng = mulberry32(seed)
  return Array.from({ length: count }, () => {
    const x = 0.35 + 9.3 * rng()
    return { x, y: model(x) + NOISE * gaussian(rng) }
  })
}

// ── État de l'explication ─────────────────────────────────────
const steps = [
  { id: 1, label: 'Predict' },
  { id: 2, label: 'Measure errors' },
  { id: 3, label: 'Choose q̂' },
  { id: 4, label: 'Predict an interval' },
]

const step = ref(1)
const targetCoverage = ref(0.9)
const experimentSeed = ref(9)
const NCAL = 20

const calibration = computed(() => samplePoints(experimentSeed.value, NCAL))
const futurePoint = computed(() => samplePoints(experimentSeed.value + 10_000, 1)[0])

const scores = computed(() =>
  calibration.value
    .map(point => Math.abs(point.y - model(point.x)))
    .sort((a, b) => a - b),
)

const conformal = computed(() => {
  const k = Math.ceil((NCAL + 1) * targetCoverage.value)
  const q = scores.value[Math.min(k, NCAL) - 1]
  const prediction = model(futurePoint.value.x)
  const lower = prediction - q
  const upper = prediction + q
  const covered = futurePoint.value.y >= lower && futurePoint.value.y <= upper
  return { k, q, prediction, lower, upper, covered }
})

function newExperiment() {
  experimentSeed.value += 37
}

// ── Géométrie du graphique ────────────────────────────────────
const XMIN = 0
const XMAX = 10
const YMIN = -1.45
const YMAX = 1.45
const LEFT = 34
const RIGHT = 486
const TOP = 18
const BOTTOM = 226

function sx(x: number) {
  return LEFT + (x - XMIN) / (XMAX - XMIN) * (RIGHT - LEFT)
}

function sy(y: number) {
  const clipped = Math.max(YMIN, Math.min(YMAX, y))
  return BOTTOM - (clipped - YMIN) / (YMAX - YMIN) * (BOTTOM - TOP)
}

const modelPath = computed(() => {
  const points: string[] = []
  for (let i = 0; i <= 140; i++) {
    const x = XMIN + (XMAX - XMIN) * i / 140
    points.push(`${sx(x).toFixed(1)},${sy(model(x)).toFixed(1)}`)
  }
  return `M${points.join(' L')}`
})

const bandPath = computed(() => {
  const upper: string[] = []
  const lower: string[] = []
  for (let i = 0; i <= 140; i++) {
    const x = XMIN + (XMAX - XMIN) * i / 140
    upper.push(`${sx(x).toFixed(1)},${sy(model(x) + conformal.value.q).toFixed(1)}`)
    lower.push(`${sx(x).toFixed(1)},${sy(model(x) - conformal.value.q).toFixed(1)}`)
  }
  return `M${upper.join(' L')} L${lower.reverse().join(' L')} Z`
})

const scoreMax = computed(() => scores.value[NCAL - 1] * 1.08)
const scoreX = (score: number) => 8 + score / scoreMax.value * 244
</script>

<template>
  <div class="cp-root">
    <nav class="cp-steps" aria-label="Conformal prediction steps">
      <button
        v-for="item in steps"
        :key="item.id"
        type="button"
        class="cp-step"
        :class="{ active: step === item.id, done: step > item.id }"
        :aria-pressed="step === item.id"
        @click="step = item.id"
      >
        <span>{{ item.id }}</span>{{ item.label }}
      </button>
    </nav>

    <div class="cp-stage">
      <svg
        class="cp-plot"
        viewBox="0 0 520 250"
        role="img"
        aria-labelledby="cp-title cp-description"
      >
        <title id="cp-title">Progressive construction of a conformal prediction interval</title>
        <desc id="cp-description">The model predicts a curve, calibration errors determine a margin q, then this margin forms a band around a new prediction.</desc>

        <line :x1="LEFT" :y1="BOTTOM" :x2="RIGHT" :y2="BOTTOM" class="axis" />
        <line :x1="LEFT" :y1="TOP" :x2="LEFT" :y2="BOTTOM" class="axis" />
        <text :x="RIGHT" :y="BOTTOM + 16" text-anchor="end" class="axis-label">input x</text>
        <text :x="LEFT + 4" :y="TOP + 10" class="axis-label">output y</text>

        <!-- Step 3: the margin becomes a band around the model -->
        <path :d="bandPath" class="prediction-band" :class="{ visible: step >= 3 }" />

        <!-- Step 2: each segment shows a calibration error -->
        <g class="residuals" :class="{ visible: step === 2 }">
          <line
            v-for="(point, index) in calibration"
            :key="`r-${index}`"
            :x1="sx(point.x)"
            :x2="sx(point.x)"
            :y1="sy(model(point.x))"
            :y2="sy(point.y)"
          />
        </g>

        <!-- Calibration points -->
        <g class="calibration-points" :class="{ visible: step >= 2, subdued: step >= 3 }">
          <circle
            v-for="(point, index) in calibration"
            :key="`p-${index}`"
            :cx="sx(point.x)"
            :cy="sy(point.y)"
            r="3.2"
          />
        </g>

        <!-- Central prediction -->
        <path :d="modelPath" class="model-line" />
        <text x="397" :y="sy(model(8.15)) - 8" class="model-label">prediction ŷ(x)</text>

        <!-- Step 4: a single new observation, as in the theorem -->
        <g class="future" :class="{ visible: step === 4 }">
          <line
            :x1="sx(futurePoint.x)"
            :x2="sx(futurePoint.x)"
            :y1="sy(conformal.upper)"
            :y2="sy(conformal.lower)"
            class="future-interval"
          />
          <line
            :x1="sx(futurePoint.x) - 7"
            :x2="sx(futurePoint.x) + 7"
            :y1="sy(conformal.upper)"
            :y2="sy(conformal.upper)"
            class="future-interval"
          />
          <line
            :x1="sx(futurePoint.x) - 7"
            :x2="sx(futurePoint.x) + 7"
            :y1="sy(conformal.lower)"
            :y2="sy(conformal.lower)"
            class="future-interval"
          />
          <circle
            :cx="sx(futurePoint.x)"
            :cy="sy(futurePoint.y)"
            r="5"
            :class="conformal.covered ? 'covered' : 'missed'"
          />
          <circle :cx="sx(futurePoint.x)" :cy="sy(conformal.prediction)" r="3" class="prediction-dot" />
          <text :x="sx(futurePoint.x)" :y="BOTTOM + 16" text-anchor="middle" class="future-label">x*</text>
        </g>

        <g class="band-label" :class="{ visible: step >= 3 }">
          <line x1="52" :y1="sy(model(0.4) - conformal.q)" x2="52" :y2="sy(model(0.4) + conformal.q)" />
          <text x="59" :y="sy(model(0.4)) + 3">calibrated margin: ±q̂</text>
        </g>
      </svg>

      <section class="cp-panel" aria-live="polite">
        <template v-if="step === 1">
          <div class="cp-kicker">Step 1</div>
          <h3>The model predicts a central value</h3>
          <div class="cp-formula">ŷ(x)</div>
          <p>The curve says what the model expects, but it gives <strong>no margin of error</strong> yet.</p>
          <p class="cp-takeaway">A prediction alone does not express its reliability.</p>
        </template>

        <template v-else-if="step === 2">
          <div class="cp-kicker">Step 2</div>
          <h3>Calibration reveals past errors</h3>
          <div class="cp-formula">sᵢ = |yᵢ − ŷ(xᵢ)|</div>
          <p>Each orange segment measures the gap between a true value and the model's prediction.</p>
          <p class="cp-takeaway">Large segment = large error = more observed uncertainty.</p>
        </template>

        <template v-else-if="step === 3">
          <div class="cp-kicker">Step 3</div>
          <h3>A quantile turns errors into a margin</h3>
          <div class="cp-formula">k = {{ conformal.k }}, &nbsp; q̂ = s₍ₖ₎ = {{ conformal.q.toFixed(2) }}</div>
          <svg class="score-strip" viewBox="0 0 260 48" role="img" aria-label="Sorted errors and selected quantile">
            <line x1="8" y1="22" x2="252" y2="22" class="score-axis" />
            <line
              v-for="(score, index) in scores"
              :key="index"
              :x1="scoreX(score)"
              :x2="scoreX(score)"
              y1="14"
              y2="30"
              :class="index + 1 === conformal.k ? 'selected-score' : 'score-tick'"
            />
            <text :x="scoreX(conformal.q)" y="43" text-anchor="middle" class="score-label">q̂</text>
          </svg>
          <p><strong>q̂ is a distance, not a probability.</strong> It becomes the width added on each side of the curve.</p>
        </template>

        <template v-else>
          <div class="cp-kicker">Step 4</div>
          <h3>The margin surrounds the new prediction</h3>
          <div class="cp-formula">C(x*) = [{{ conformal.lower.toFixed(2) }}, {{ conformal.upper.toFixed(2) }}]</div>
          <p>The true value is <strong>{{ futurePoint.y.toFixed(2) }}</strong>.</p>
          <p class="cp-result" :class="conformal.covered ? 'ok' : 'fail'">
            {{ conformal.covered ? 'It falls inside the interval: covered.' : 'It falls outside the interval: not covered.' }}
          </p>
          <p class="cp-takeaway">A single click only gives "covered" or "not covered". The {{ (targetCoverage * 100).toFixed(0) }} % describes the expected frequency when the whole experiment is repeated.</p>
        </template>
      </section>
    </div>

    <div v-if="step >= 3" class="cp-controls">
      <label>
        Target coverage
        <strong>{{ (targetCoverage * 100).toFixed(0) }} %</strong>
        <input v-model.number="targetCoverage" type="range" min="0.5" max="0.95" step="0.05" />
      </label>
      <span class="cp-tradeoff">Higher target coverage → more cautious, wider band</span>
      <button v-if="step === 4" type="button" @click="newExperiment">New experiment</button>
    </div>
  </div>
</template>

<style scoped>
.cp-root {
  --ink: #334155;
  --muted: #64748b;
  --line: #cbd5e1;
  --green: #25b34b;
  --green-dark: #15803d;
  --orange: #f15a22;
  --red: #cf1c24;
  display: grid;
  gap: 7px;
  width: 100%;
  color: var(--ink);
}

.cp-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.cp-step {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 5px 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: #f8fafc;
  color: var(--muted);
  font-size: 0.68rem;
  cursor: pointer;
}

.cp-step span {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e2e8f0;
  font-family: monospace;
  font-weight: 700;
}

.cp-step.active {
  border-color: var(--orange);
  background: #fff7ed;
  color: #9a3412;
  font-weight: 700;
}

.cp-step.active span,
.cp-step.done span {
  background: var(--orange);
  color: white;
}

.cp-stage {
  display: grid;
  grid-template-columns: minmax(0, 1.8fr) minmax(250px, 1fr);
  gap: 10px;
  align-items: stretch;
}

.cp-plot {
  width: 100%;
  height: 268px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #f8fafc;
}

.axis { stroke: #94a3b8; stroke-width: 1; }
.axis-label, .model-label, .future-label, .score-label {
  fill: var(--muted);
  font: 8px sans-serif;
}

.prediction-band {
  fill: var(--green);
  opacity: 0;
  transition: opacity 180ms ease;
}
.prediction-band.visible { opacity: 0.16; }

.model-line {
  fill: none;
  stroke: #475569;
  stroke-width: 2.2;
}
.model-label { fill: #475569; font-weight: 700; }

.residuals,
.calibration-points,
.future,
.band-label {
  opacity: 0;
  transition: opacity 180ms ease;
}
.residuals.visible,
.calibration-points.visible,
.future.visible,
.band-label.visible { opacity: 1; }
.calibration-points.subdued { opacity: 0.55; }
.residuals line { stroke: var(--orange); stroke-width: 1.8; }
.calibration-points circle { fill: #475569; stroke: white; stroke-width: 0.8; }

.band-label line { stroke: var(--green-dark); stroke-width: 1.5; }
.band-label text { fill: var(--green-dark); font: 8px sans-serif; font-weight: 700; }

.future-interval { stroke: var(--green-dark); stroke-width: 2; }
.future circle.covered { fill: var(--green); stroke: white; stroke-width: 1.5; }
.future circle.missed { fill: var(--red); stroke: white; stroke-width: 1.5; }
.future .prediction-dot { fill: #475569; stroke: white; stroke-width: 1; }

.cp-panel {
  min-height: 268px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: white;
  font-size: 0.7rem;
  line-height: 1.35;
}

.cp-kicker {
  color: var(--orange);
  font-family: monospace;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
}

.cp-panel h3 {
  margin: 4px 0 9px;
  color: var(--ink);
  font-size: 0.9rem;
  line-height: 1.15;
}

.cp-panel p { margin: 8px 0; }

.cp-formula {
  margin: 8px 0 10px;
  padding: 7px 8px;
  border-left: 3px solid var(--orange);
  background: #fff7ed;
  color: #9a3412;
  font-family: monospace;
  font-size: 0.72rem;
}

.cp-takeaway {
  color: var(--muted);
  font-style: italic;
}

.cp-result {
  padding: 6px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.cp-result.ok { background: #f0fdf4; color: var(--green-dark); }
.cp-result.fail { background: #fef2f2; color: #991b1b; }

.score-strip { width: 100%; height: 48px; }
.score-axis { stroke: #94a3b8; stroke-width: 1; }
.score-tick { stroke: #64748b; stroke-width: 1.2; }
.selected-score { stroke: var(--red); stroke-width: 3; }
.score-label { fill: var(--red); font-family: monospace; font-weight: 700; }

.cp-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 27px;
  font-size: 0.68rem;
}

.cp-controls label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: monospace;
}

.cp-controls label strong { color: var(--red); min-width: 34px; }
.cp-controls input { width: 150px; accent-color: var(--red); cursor: pointer; }
.cp-tradeoff { color: var(--muted); }

.cp-controls button {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: #f8fafc;
  color: var(--ink);
  font-size: 0.68rem;
  cursor: pointer;
}

.cp-controls button:hover { background: #e2e8f0; }

@media (prefers-reduced-motion: reduce) {
  .prediction-band,
  .residuals,
  .calibration-points,
  .future,
  .band-label { transition: none; }
}
</style>
