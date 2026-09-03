<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// Suit la présentation au tableau « PnP » : poser le problème → modèle de
// projection → pourquoi plusieurs points → erreur de reprojection.

type V3 = { x: number; y: number; z: number }

// ── Carte 3D connue (les P_i) ─────────────────────────────────
const MAP: V3[] = [
  { x: -1.2, y:  0.9, z: 3.2 },
  { x:  0.4, y:  1.3, z: 4.0 },
  { x:  1.1, y:  0.7, z: 3.0 },
  { x: -0.6, y:  0.1, z: 4.6 },
  { x:  1.0, y: -0.3, z: 3.6 },
  { x:  0.0, y:  0.5, z: 2.6 },
]
const F = 200, CU = 100, CV = 75          // intrinsèques (px)
const TRUE_POSE = { cx: 0, cy: 0.35, cz: 0, psi: 0 }

// Pose candidate : 3 des 6 DDL sont manipulables, pour rester lisible
const cx  = ref(0.55)
const cz  = ref(-0.45)
const psi = ref(-7)                        // lacet (°)

interface Pose { cx: number; cy: number; cz: number; psi: number }
const pose = computed((): Pose => ({ cx: cx.value, cy: TRUE_POSE.cy, cz: cz.value, psi: psi.value }))

// p^c = R(ψ)ᵀ (p^w − C)  puis  u = f·x/z + cu ,  v = cv − f·y/z
function toCam(p: V3, q: Pose): V3 {
  const a = q.psi * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const dx = p.x - q.cx, dy = p.y - q.cy, dz = p.z - q.cz
  return { x: c * dx - s * dz, y: dy, z: s * dx + c * dz }
}
function project(p: V3, q: Pose): { u: number; v: number; ok: boolean } {
  const pc = toCam(p, q)
  if (pc.z < 0.2) return { u: 0, v: 0, ok: false }
  return { u: CU + F * pc.x / pc.z, v: CV - F * pc.y / pc.z, ok: true }
}
// Observations : les pixels mesurés, figés (ils viennent de la vraie pose)
const OBS = MAP.map(p => project(p, TRUE_POSE))

// Rayon d'observation, exprimé dans le monde pour la pose candidate :
// direction de x_i = K⁻¹ũ_i ramenée par R.
function rayDir(i: number, q: Pose): V3 {
  const xn = (OBS[i].u - CU) / F, yn = -(OBS[i].v - CV) / F
  const a = q.psi * Math.PI / 180, c = Math.cos(a), s = Math.sin(a)
  const v = { x: c * xn + s * 1, y: yn, z: -s * xn + c * 1 }   // Rᵀ appliqué à (xn, yn, 1)
  const n = Math.hypot(v.x, v.y, v.z)
  return { x: v.x / n, y: v.y / n, z: v.z / n }
}

// ── Résidus de reprojection ──────────────────────────────────
const reproj = computed(() => MAP.map((p, i) => {
  const q = project(p, pose.value)
  return { i, u: q.u, v: q.v, ok: q.ok, e: q.ok ? Math.hypot(q.u - OBS[i].u, q.v - OBS[i].v) : 999 }
}))
const totalErr = computed(() => Math.sqrt(reproj.value.reduce((a, r) => a + r.e * r.e, 0) / MAP.length))

function costOf(q: Pose): number {
  let s = 0
  for (let i = 0; i < MAP.length; i++) {
    const p = project(MAP[i], q)
    if (!p.ok) return 1e9
    s += (p.u - OBS[i].u) ** 2 + (p.v - OBS[i].v) ** 2
  }
  return s
}

// ── Étapes ───────────────────────────────────────────────────
const STEPS = [
  { t: 'Poser le problème' },
  { t: 'Modèle de projection' },
  { t: 'Pourquoi plusieurs points' },
  { t: 'Erreur de reprojection' },
]
const step = ref(0)
const focusI = 2                                    // correspondance mise en avant à l'étape 2
const usedSet = computed(() => step.value === 2 ? new Set([0, 2, 4]) : new Set(MAP.map((_, i) => i)))
const showRays = computed(() => step.value >= 1)
const showResid = computed(() => step.value >= 3)

const LABEL = computed(() => {
  if (step.value === 0) return { t: 'Connus : les amers 3D de la carte et leurs pixels. Inconnue : la pose (R<sub>w</sub><sup>c</sup>, t<sub>w</sub><sup>c</sup>) de la caméra.', c: '#475569' }
  if (step.value === 1) return { t: 'λ<sub>i</sub> x<sub>i</sub> = R<sub>w</sub><sup>c</sup> p<sub>i</sub><sup>w</sup> + t<sub>w</sub><sup>c</sup> : l\'amer, ramené dans le repère caméra, doit tomber SUR le rayon de son observation.', c: '#00BDF2' }
  if (step.value === 2) return { t: '6 DDL à fixer, et 2 équations par correspondance (u et v) → il en faut au moins 3.', c: '#7C3AED' }
  return { t: 'La bonne pose est celle qui fait retomber les reprojections sur les observations : min Σ‖m<sub>i</sub> − π(K(R<sub>w</sub><sup>c</sup> p<sub>i</sub><sup>w</sup> + t<sub>w</sub><sup>c</sup>))‖².', c: '#CF1C24' }
})

// ── Vue 3D oblique (orthographique) ──────────────────────────
const YAW = 30 * Math.PI / 180, PITCH = 20 * Math.PI / 180
const SX = 96, SY = 178, SS = 40
function proj3(p: V3) {
  const x1 = p.x * Math.cos(YAW) + p.z * Math.sin(YAW)
  const z1 = -p.x * Math.sin(YAW) + p.z * Math.cos(YAW)
  return { x: SX + x1 * SS, y: SY - (p.y * Math.cos(PITCH) + z1 * Math.sin(PITCH)) * SS }
}
const sMap = computed(() => MAP.map(p => proj3(p)))
const sCam = computed(() => proj3({ x: pose.value.cx, y: pose.value.cy, z: pose.value.cz }))
const sRays = computed(() => MAP.map((_, i) => {
  const d = rayDir(i, pose.value), q = pose.value
  const L = 5.2
  return proj3({ x: q.cx + d.x * L, y: q.cy + d.y * L, z: q.cz + d.z * L })
}))
// Écart 3D point ↔ rayon, matérialisé par un segment perpendiculaire
const sGaps = computed(() => MAP.map((p, i) => {
  const d = rayDir(i, pose.value), q = pose.value
  const w = { x: p.x - q.cx, y: p.y - q.cy, z: p.z - q.cz }
  const proj = w.x * d.x + w.y * d.y + w.z * d.z
  const foot = { x: q.cx + d.x * proj, y: q.cy + d.y * proj, z: q.cz + d.z * proj }
  return { a: proj3(p), b: proj3(foot), d: Math.hypot(p.x - foot.x, p.y - foot.y, p.z - foot.z) }
}))

// ── Panneau image ────────────────────────────────────────────
const IX = 348, IY = 30, IW = 200, IH = 150
const ix = (u: number) => IX + u
const iy = (v: number) => IY + v

// ── Optimisation : descente avec recherche linéaire ──────────
const optimizing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
function optimizeStep() {
  const q = pose.value
  const base = costOf(q)
  const h = { cx: 1e-3, cz: 1e-3, psi: 1e-2 }
  const g = {
    cx:  (costOf({ ...q, cx: q.cx + h.cx }) - base) / h.cx,
    cz:  (costOf({ ...q, cz: q.cz + h.cz }) - base) / h.cz,
    psi: (costOf({ ...q, psi: q.psi + h.psi }) - base) / h.psi,
  }
  const n = Math.hypot(g.cx, g.cz, g.psi * 0.05) || 1
  const dir = { cx: -g.cx / n, cz: -g.cz / n, psi: -g.psi * 0.05 / n }
  let best = base, chosen = 0
  for (const s of [0.5, 0.25, 0.12, 0.06, 0.03, 0.015]) {
    const c = costOf({ ...q, cx: q.cx + dir.cx * s, cz: q.cz + dir.cz * s, psi: q.psi + dir.psi * s * 20 })
    if (c < best) { best = c; chosen = s }
  }
  if (chosen === 0) return false
  cx.value  = +(q.cx + dir.cx * chosen).toFixed(4)
  cz.value  = +(q.cz + dir.cz * chosen).toFixed(4)
  psi.value = +(q.psi + dir.psi * chosen * 20).toFixed(3)
  return true
}
function toggleOptimize() {
  if (optimizing.value) { if (timer) clearInterval(timer); timer = null; optimizing.value = false; return }
  if (step.value < 3) step.value = 3
  optimizing.value = true
  timer = setInterval(() => {
    if (!optimizeStep() || totalErr.value < 0.05) {
      if (timer) clearInterval(timer); timer = null; optimizing.value = false
    }
  }, 90)
}
function perturb() {
  if (timer) { clearInterval(timer); timer = null }
  optimizing.value = false
  cx.value = 0.55; cz.value = -0.45; psi.value = -7
}
function go(d: 1 | -1) { step.value = Math.max(0, Math.min(3, step.value + d)) }
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="pp-wrap">
    <svg viewBox="0 0 560 216" class="pp-svg">
      <defs>
        <clipPath id="ppImg"><rect :x="IX" :y="IY" :width="IW" :height="IH" rx="3"/></clipPath>
      </defs>

      <rect x="2" y="2" width="332" height="212" style="fill:#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="168" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        la carte 3D (connue) et la caméra à sa pose candidate
      </text>

      <!-- Rayons d'observation partant du centre optique -->
      <g v-if="showRays">
        <line v-for="(r, i) in sRays" :key="`ry${i}`"
          :x1="sCam.x" :y1="sCam.y" :x2="r.x" :y2="r.y"
          :stroke="i === focusI && step === 1 ? '#00BDF2' : '#00BDF2'"
          :stroke-width="i === focusI && step === 1 ? 2.2 : 1"
          :style="{ opacity: usedSet.has(i) ? (i === focusI && step === 1 ? 0.95 : 0.5) : 0.12 }"/>
      </g>

      <!-- Écart 3D entre l'amer et son rayon -->
      <g v-if="step >= 1">
        <line v-for="(g, i) in sGaps" :key="`gp${i}`"
          :x1="g.a.x" :y1="g.a.y" :x2="g.b.x" :y2="g.b.y"
          stroke="#CF1C24" stroke-width="2"
          :style="{ opacity: usedSet.has(i) && g.d > 0.02 ? 0.85 : 0 }"/>
      </g>

      <!-- Amers 3D -->
      <g v-for="(p, i) in sMap" :key="`mp${i}`">
        <circle :cx="p.x" :cy="p.y" r="6"
          :style="usedSet.has(i) ? 'fill:#25B34B' : 'fill:#CBD5E1'" stroke="white" stroke-width="2"/>
        <text v-if="step === 1 && i === focusI" :x="p.x + 9" :y="p.y - 4"
          style="font-size:10px;fill:#25B34B;font-weight:700;font-family:sans-serif">Pᵢ</text>
      </g>

      <!-- Caméra -->
      <circle :cx="sCam.x" :cy="sCam.y" r="6.5" style="fill:#334155" stroke="white" stroke-width="2" class="pp-cam"/>
      <text :x="sCam.x - 8" :y="sCam.y + 17"
        style="font-size:9.5px;fill:#334155;font-weight:700;font-family:sans-serif">R, t</text>

      <!-- ═══ Image ═══ -->
      <rect :x="IX - 4" y="2" width="208" height="212" style="fill:#ffffff" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text :x="IX + IW / 2" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">image observée</text>
      <rect :x="IX" :y="IY" :width="IW" :height="IH" style="fill:#f8fafc" stroke="#CBD5E1" stroke-width="1" rx="3"/>

      <g clip-path="url(#ppImg)">
        <!-- résidus -->
        <g v-if="showResid">
          <line v-for="r in reproj" :key="`re${r.i}`"
            :x1="ix(OBS[r.i].u)" :y1="iy(OBS[r.i].v)" :x2="ix(r.u)" :y2="iy(r.v)"
            stroke="#CF1C24" stroke-width="2" style="opacity:0.9"/>
        </g>
        <!-- reprojections -->
        <g v-if="step >= 1">
          <circle v-for="r in reproj" :key="`rp${r.i}`" :cx="ix(r.u)" :cy="iy(r.v)" r="4"
            style="fill:white" stroke="#CF1C24" stroke-width="1.8"
            :style="{ opacity: usedSet.has(r.i) ? 1 : 0.25 }"/>
        </g>
        <!-- observations -->
        <circle v-for="(o, i) in OBS" :key="`ob${i}`" :cx="ix(o.u)" :cy="iy(o.v)" r="5"
          style="fill:#25B34B" stroke="white" stroke-width="1.6"
          :style="{ opacity: usedSet.has(i) ? 1 : 0.3 }"/>
      </g>

      <text :x="IX" :y="IY + IH + 16" style="font-size:9px;fill:#25B34B;font-weight:700;font-family:sans-serif">● observation mᵢ</text>
      <text :x="IX + 88" :y="IY + IH + 16" style="font-size:9px;fill:#CF1C24;font-weight:700;font-family:sans-serif">○ reprojection</text>
      <text :x="IX + IW" :y="IY + IH + 30" text-anchor="end"
        :style="`font-size:11px;font-family:monospace;font-weight:700;fill:${totalErr < 0.5 ? '#25B34B' : '#CF1C24'}`">
        erreur RMS : {{ totalErr.toFixed(1) }} px
      </text>
    </svg>

    <div class="pp-status"><span :style="{ color: LABEL.c }" v-html="LABEL.t"></span></div>

    <div class="pp-steps">
      <template v-for="(s, i) in STEPS" :key="i">
        <div :class="['pp-step', step === i && 'on']"><span class="sn">{{ i + 1 }}</span>{{ s.t }}</div>
        <span v-if="i < 3" class="sep">→</span>
      </template>
    </div>

    <div class="pp-controls">
      <button class="btn" @click="go(-1)" :disabled="step === 0">◀</button>
      <button class="btn" @click="go(1)" :disabled="step >= 3">▶</button>
      <label class="sl"><span>t_x</span>
        <input type="range" v-model.number="cx" min="-0.8" max="0.8" step="0.01"/></label>
      <label class="sl"><span>t_z</span>
        <input type="range" v-model.number="cz" min="-0.8" max="0.8" step="0.01"/></label>
      <label class="sl"><span>lacet</span>
        <input type="range" v-model.number="psi" min="-12" max="12" step="0.2"/></label>
      <button class="btn btn-opt" @click="toggleOptimize">
        {{ optimizing ? '⏸' : '▶ Minimiser l\'erreur' }}
      </button>
      <button class="btn btn-reset" @click="perturb">↺ dérégler</button>
    </div>
  </div>
</template>

<style scoped>
.pp-wrap { width: 100%; display: flex; flex-direction: column; gap: 5px; }
.pp-svg { height: 262px; width: auto; max-width: 100%; display: block; }
.pp-cam { transition: cx 0.08s linear, cy 0.08s linear; }

.pp-status { min-height: 18px; font-size: 0.72rem; font-weight: 600; }
.pp-status :deep(sub), .pp-status :deep(sup) { font-size: 0.7em; }

.pp-steps { display: flex; align-items: center; justify-content: center; gap: 0; }
.pp-step {
  display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 5px;
  border: 1.5px solid #CBD5E1; background: #f8fafc; font-size: 0.64rem; color: #94a3b8; white-space: nowrap;
}
.pp-step .sn { font-weight: 700; }
.pp-step.on { background: #CF1C24; border-color: #CF1C24; color: white; }
.sep { color: #CBD5E1; font-size: 0.85rem; padding: 0 4px; }

.pp-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn {
  padding: 3px 10px; border: 1.5px solid #CBD5E1; border-radius: 5px; background: white;
  font-size: 0.7rem; cursor: pointer; color: #334155; font-weight: 600;
}
.btn:hover:not(:disabled) { background: #f1f5f9; }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-opt { background: #CF1C24; color: white; border-color: #CF1C24; }
.btn-reset { color: #64748b; }
.sl { display: flex; align-items: center; gap: 4px; font-family: monospace; font-size: 0.68rem; color: #334155; }
.sl input[type=range] { width: 70px; height: 4px; accent-color: #334155; cursor: pointer; }
</style>
