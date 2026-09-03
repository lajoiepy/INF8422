<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// Suit la présentation au tableau « Contrainte de coplanarité » :
// géométrie → élimination des profondeurs → matrice essentielle → échelle.

type V3 = { x: number; y: number; z: number }
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const scl = (a: V3, s: number): V3 => ({ x: a.x * s, y: a.y * s, z: a.z * s })
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z)
const unit = (a: V3): V3 => scl(a, 1 / Math.max(norm(a), 1e-9))

// ── Scène ─────────────────────────────────────────────────────
const baseline = ref(2.2)     // ‖t‖
const angleP   = ref(8)       // position de P sur un arc (°)
const errDeg   = ref(0)       // erreur d'appariement : x₂ dévié hors du plan (°)
const scaleS   = ref(1)       // facteur d'échelle global (étape 4)

const C1: V3 = { x: 0, y: 0, z: 0 }
const C2 = computed((): V3 => ({ x: baseline.value * scaleS.value, y: 0, z: 0 }))
const P  = computed((): V3 => {
  const a = angleP.value * Math.PI / 180, r = 4.6
  return scl({ x: baseline.value / 2 + r * Math.sin(a), y: 1.35, z: r * Math.cos(a) }, scaleS.value)
})

// t = C₂ − C₁ ; x₁ = direction de P vue de C₁ ; Rx₂ = direction de P vue de C₂,
// exprimée dans le repère de la caméra 1 (c'est ce que fait la rotation R).
const tVec = computed(() => sub(C2.value, C1))
const x1   = computed(() => unit(sub(P.value, C1)))
const Rx2  = computed(() => {
  const v = unit(sub(P.value, C2.value))
  if (errDeg.value === 0) return v
  // Un mauvais appariement fait sortir le rayon du plan : on le bascule
  // autour de l'axe C₁C₂, donc hors du plan C₁-P-C₂.
  const axis = unit(tVec.value)
  const a = errDeg.value * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const k = cross(axis, v), d = dot(axis, v)
  return { x: v.x * c + k.x * s + axis.x * d * (1 - c),
           y: v.y * c + k.y * s + axis.y * d * (1 - c),
           z: v.z * c + k.z * s + axis.z * d * (1 - c) }
})

// La quantité de la présentation : x₁ᵀ (t × R x₂)
const normalVec = computed(() => cross(tVec.value, Rx2.value))
const mixed     = computed(() => dot(x1.value, normalVec.value))
const consistent = computed(() => Math.abs(mixed.value) < 1e-3)

// ── Projection oblique (orthographique) ───────────────────────
const YAW = 34 * Math.PI / 180, PITCH = 24 * Math.PI / 180
const CX = 88, CY = 176, S = 40
function proj(p: V3): { x: number; y: number } {
  const x1p = p.x * Math.cos(YAW) + p.z * Math.sin(YAW)
  const z1p = -p.x * Math.sin(YAW) + p.z * Math.cos(YAW)
  return { x: CX + x1p * S, y: CY - (p.y * Math.cos(PITCH) + z1p * Math.sin(PITCH)) * S }
}
const pt = (p: V3) => { const q = proj(p); return `${q.x.toFixed(1)},${q.y.toFixed(1)}` }
const sC1 = computed(() => proj(C1))
const sC2 = computed(() => proj(C2.value))
const sP  = computed(() => proj(P.value))
// Bout du rayon issu de C₂ : suit R x₂ (dévié si l'appariement est faux)
const sQ2 = computed(() => proj({
  x: C2.value.x + Rx2.value.x * norm(sub(P.value, C2.value)),
  y: C2.value.y + Rx2.value.y * norm(sub(P.value, C2.value)),
  z: C2.value.z + Rx2.value.z * norm(sub(P.value, C2.value)) }))
const planePts = computed(() => `${pt(C1)} ${pt(P.value)} ${pt(C2.value)}`)
// Normale n = t × R x₂. Dessinée depuis le centre du triangle plutôt que
// depuis C₁ : elle plonge vers le bas et sortait du cadre.
const centroid = computed((): V3 => ({
  x: (C1.x + P.value.x + C2.value.x) / 3,
  y: (C1.y + P.value.y + C2.value.y) / 3,
  z: (C1.z + P.value.z + C2.value.z) / 3 }))
const sNbase = computed(() => proj(centroid.value))
const sN = computed(() => {
  const n = unit(normalVec.value), c = centroid.value, L = 1.7
  return proj({ x: c.x + n.x * L, y: c.y + n.y * L, z: c.z + n.z * L })
})

// ── Étapes, calquées sur les quatre sections des notes ────────
const STEPS = [
  { k: 'geo',   t: 'Géométrie' },
  { k: 'plan',  t: 'Coplanarité' },
  { k: 'E',     t: 'Matrice essentielle' },
  { k: 'scale', t: 'Échelle' },
]
const step = ref(0)
const kind = computed(() => STEPS[step.value].k)
const showPlane  = computed(() => step.value >= 1)
const showNormal = computed(() => step.value >= 2)

const LABEL = computed(() => {
  if (kind.value === 'geo')
    return { t: 'Le même point 3D vu deux fois : λ₁x₁ = t + λ₂Rx₂. Les deux profondeurs sont inconnues.', c: '#475569' }
  if (kind.value === 'plan')
    return consistent.value
      ? { t: 'x₁, t et Rx₂ ferment un triangle : ils sont dans un même plan, donc leur produit mixte est nul.', c: '#25B34B' }
      : { t: 'Appariement faux : Rx₂ sort du plan, le produit mixte n\'est plus nul — c\'est ce résidu que RANSAC teste.', c: '#CF1C24' }
  if (kind.value === 'E')
    return { t: 'n = t × Rx₂ est normal au plan. Écrire le produit vectoriel comme [t]ₓ donne x₁ᵀ[t]ₓR x₂ = 0, soit E = [t]ₓR.', c: '#7C3AED' }
  return { t: 'Tout multiplier par s ne change ni x₁ ni x₂ : les deux images sont identiques. ‖t‖ est inobservable.', c: '#F15A22' }
})

// ── Contrôles ────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | null = null
const playing = ref(false)
function clearTimer() { if (timer) { clearTimeout(timer); timer = null } }
function go(d: 1 | -1) { clearTimer(); playing.value = false; step.value = Math.max(0, Math.min(3, step.value + d)) }
function togglePlay() {
  if (playing.value) { clearTimer(); playing.value = false; return }
  if (step.value >= 3) step.value = 0
  playing.value = true
  const tick = () => {
    if (step.value >= 3) { playing.value = false; return }
    step.value++; timer = setTimeout(tick, 2600)
  }
  tick()
}
function reset() { clearTimer(); playing.value = false; step.value = 0; errDeg.value = 0; scaleS.value = 1 }
onUnmounted(clearTimer)
</script>

<template>
  <div class="cp-wrap">
    <svg viewBox="0 0 560 224" class="cp-svg">
      <defs>
        <marker id="cpA" markerWidth="7" markerHeight="7" refX="6" refY="2.4" orient="auto">
          <path d="M0,0 L7,2.4 L0,4.8 Z" style="fill:#475569"/></marker>
        <marker id="cpAv" markerWidth="7" markerHeight="7" refX="6" refY="2.4" orient="auto">
          <path d="M0,0 L7,2.4 L0,4.8 Z" style="fill:#7C3AED"/></marker>
        <marker id="cpAr" markerWidth="7" markerHeight="7" refX="6" refY="2.4" orient="auto">
          <path d="M0,0 L7,2.4 L0,4.8 Z" style="fill:#CF1C24"/></marker>
      </defs>

      <rect x="2" y="2" width="336" height="220" style="fill:#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <rect x="344" y="2" width="214" height="220" style="fill:#ffffff" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Plan C₁-P-C₂ -->
      <polygon v-if="showPlane" :points="planePts"
        :style="consistent ? 'fill:#25B34B;fill-opacity:0.13' : 'fill:#CF1C24;fill-opacity:0.10'"
        :stroke="consistent ? '#25B34B' : '#CF1C24'" stroke-width="1" stroke-dasharray="4,3" class="cp-plane"/>

      <!-- t : baseline C₁ → C₂ -->
      <line :x1="sC1.x" :y1="sC1.y" :x2="sC2.x" :y2="sC2.y"
        stroke="#475569" stroke-width="2.2" marker-end="url(#cpA)" class="cp-seg"/>
      <text :x="(sC1.x + sC2.x) / 2" :y="(sC1.y + sC2.y) / 2 + 15" text-anchor="middle"
        style="font-size:11px;fill:#475569;font-weight:700;font-family:sans-serif">t</text>

      <!-- x₁ : C₁ → P -->
      <line :x1="sC1.x" :y1="sC1.y" :x2="sP.x" :y2="sP.y"
        stroke="#00BDF2" stroke-width="2.2" marker-end="url(#cpA)" class="cp-seg"/>
      <text :x="(sC1.x + sP.x) / 2 - 14" :y="(sC1.y + sP.y) / 2"
        style="font-size:11px;fill:#00BDF2;font-weight:700;font-family:sans-serif">x₁</text>

      <!-- R x₂ : C₂ → P (dévié si appariement faux) -->
      <line :x1="sC2.x" :y1="sC2.y" :x2="sQ2.x" :y2="sQ2.y"
        :stroke="consistent ? '#F15A22' : '#CF1C24'" stroke-width="2.2"
        :marker-end="consistent ? 'url(#cpA)' : 'url(#cpAr)'" class="cp-seg"/>
      <text :x="(sC2.x + sQ2.x) / 2 + 10" :y="(sC2.y + sQ2.y) / 2"
        :style="`font-size:11px;font-weight:700;font-family:sans-serif;fill:${consistent ? '#F15A22' : '#CF1C24'}`">
        R x₂
      </text>

      <!-- n = t × R x₂ -->
      <g v-if="showNormal">
        <line :x1="sNbase.x" :y1="sNbase.y" :x2="sN.x" :y2="sN.y"
          stroke="#7C3AED" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#cpAv)" class="cp-seg"/>
        <text :x="sN.x + 7" :y="sN.y + 10"
          style="font-size:10px;fill:#7C3AED;font-weight:700;font-family:sans-serif">n = t × Rx₂</text>
      </g>

      <!-- Caméras et point -->
      <circle :cx="sC1.x" :cy="sC1.y" r="6" style="fill:#334155" stroke="white" stroke-width="2"/>
      <text :x="sC1.x - 10" :y="sC1.y + 15" style="font-size:11px;fill:#334155;font-weight:700;font-family:sans-serif">C₁</text>
      <circle :cx="sC2.x" :cy="sC2.y" r="6" style="fill:#334155" stroke="white" stroke-width="2"/>
      <text :x="sC2.x + 6" :y="sC2.y + 15" style="font-size:11px;fill:#334155;font-weight:700;font-family:sans-serif">C₂</text>
      <circle :cx="sP.x" :cy="sP.y" r="7" style="fill:#CF1C24" stroke="white" stroke-width="2"/>
      <text :x="sP.x + 9" :y="sP.y - 5" style="font-size:12px;fill:#CF1C24;font-weight:700;font-family:sans-serif">P</text>

      <text x="170" y="16" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        deux caméras calibrées observant le même point
      </text>

      <!-- ═══ Ce qu'on écrit au tableau ═══ -->
      <text x="356" y="24" style="font-size:9px;fill:#94a3b8;font-style:italic;font-family:sans-serif">au tableau</text>

      <text x="356" y="48" :style="`font-size:11px;font-family:monospace;fill:${step === 0 ? '#0f172a' : '#cbd5e1'}`">
        λ₁ x₁ = t + λ₂ R x₂
      </text>
      <text x="356" y="64" style="font-size:8.5px;fill:#94a3b8;font-family:sans-serif">λ₁, λ₂ inconnues</text>

      <text x="356" y="96" :style="`font-size:11px;font-family:monospace;fill:${step === 1 ? '#0f172a' : '#cbd5e1'}`">
        x₁ᵀ (t × R x₂) =
      </text>
      <text x="356" y="112" :style="`font-size:13px;font-family:monospace;font-weight:700;fill:${consistent ? '#25B34B' : '#CF1C24'}`">
        {{ mixed.toFixed(3) }} {{ consistent ? '✓' : '≠ 0' }}
      </text>

      <text x="356" y="144" :style="`font-size:11px;font-family:monospace;fill:${step === 2 ? '#0f172a' : '#cbd5e1'}`">
        x₁ᵀ E x₂ = 0
      </text>
      <text x="356" y="160" :style="`font-size:11px;font-family:monospace;fill:${step === 2 ? '#7C3AED' : '#cbd5e1'}`">
        E = [t]ₓ R
      </text>

      <text x="356" y="192" :style="`font-size:10px;font-family:monospace;fill:${step === 3 ? '#F15A22' : '#cbd5e1'}`">
        s·t, s·P → mêmes images
      </text>
      <text x="356" y="206" :style="`font-size:9px;font-family:sans-serif;fill:${step === 3 ? '#F15A22' : '#cbd5e1'}`">
        ‖t‖ inobservable (échelle)
      </text>
    </svg>

    <div class="cp-status"><span :style="{ color: LABEL.c }">{{ LABEL.t }}</span></div>

    <div class="cp-steps">
      <template v-for="(s, i) in STEPS" :key="s.k">
        <div :class="['cp-step', step === i && 'on']"><span class="sn">{{ i + 1 }}</span>{{ s.t }}</div>
        <span v-if="i < 3" class="sep">→</span>
      </template>
    </div>

    <div class="cp-controls">
      <button class="btn" @click="go(-1)" :disabled="step === 0">◀</button>
      <button class="btn btn-play" @click="togglePlay">{{ playing ? '⏸' : '▶ Auto' }}</button>
      <button class="btn" @click="go(1)" :disabled="step >= 3">▶</button>
      <button class="btn btn-reset" @click="reset">↺</button>
      <label class="sl"><span>P</span>
        <input type="range" v-model.number="angleP" min="-22" max="22" step="1"/></label>
      <label class="sl"><span>‖t‖</span>
        <input type="range" v-model.number="baseline" min="1.2" max="3.4" step="0.1"/></label>
      <label class="sl sl-err"><span>erreur x₂</span><strong>{{ errDeg }}°</strong>
        <input type="range" v-model.number="errDeg" min="0" max="14" step="1"/></label>
      <label class="sl sl-s" :class="{ dim: step < 3 }"><span>échelle s</span><strong>{{ scaleS.toFixed(1) }}</strong>
        <input type="range" v-model.number="scaleS" min="0.6" max="1.8" step="0.1"/></label>
    </div>
  </div>
</template>

<style scoped>
.cp-wrap { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.cp-svg { height: 268px; width: auto; max-width: 100%; display: block; }
.cp-seg, .cp-plane { transition: all 0.12s linear; }

.cp-status { min-height: 18px; font-size: 0.72rem; font-weight: 600; }

.cp-steps { display: flex; align-items: center; justify-content: center; gap: 0; }
.cp-step {
  display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 5px;
  border: 1.5px solid #CBD5E1; background: #f8fafc; font-size: 0.64rem; color: #94a3b8;
  white-space: nowrap;
}
.cp-step .sn { font-weight: 700; }
.cp-step.on { background: #CF1C24; border-color: #CF1C24; color: white; }
.sep { color: #CBD5E1; font-size: 0.85rem; padding: 0 4px; }

.cp-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn {
  padding: 3px 10px; border: 1.5px solid #CBD5E1; border-radius: 5px; background: white;
  font-size: 0.7rem; cursor: pointer; color: #334155; font-weight: 600;
}
.btn:hover:not(:disabled) { background: #f1f5f9; }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-play { background: #CF1C24; color: white; border-color: #CF1C24; }
.btn-reset { color: #64748b; }

.sl { display: flex; align-items: center; gap: 4px; font-family: monospace; font-size: 0.68rem; color: #334155; }
.sl input[type=range] { width: 74px; height: 4px; accent-color: #334155; cursor: pointer; }
.sl-err strong { color: #CF1C24; min-width: 26px; }
.sl-err input[type=range] { accent-color: #CF1C24; }
.sl-s strong { color: #F15A22; min-width: 24px; }
.sl-s input[type=range] { accent-color: #F15A22; }
.sl.dim { opacity: 0.45; }
</style>
