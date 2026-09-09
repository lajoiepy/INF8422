<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Interpoler entre deux orientations : A = I et B = Exp(θ·u) ─────
// Gauche  : géodésique R_geo(t) = Exp(t·Log(B))  → rotation RIGIDE
// Droite  : linéaire naïf M(t) = (1−t)·I + t·B   → cube DÉFORMÉ
// Montre qu'on ne peut PAS combiner des rotations linéairement.
const thetaB = ref(2.3)   // angle de B (rad)
const az = ref(40)        // azimut de l'axe u (deg)
const el = ref(25)        // élévation de l'axe u (deg)
const tt = ref(0.5)       // paramètre d'interpolation

const axisVec = computed(() => {
  const a = az.value * Math.PI / 180, e = el.value * Math.PI / 180
  return { x: Math.cos(e) * Math.cos(a), y: Math.cos(e) * Math.sin(a), z: Math.sin(e) }
})

type M3 = number[][]
function rodrigues(ux: number, uy: number, uz: number, th: number): M3 {
  const c = Math.cos(th), s = Math.sin(th), t = 1 - c
  return [
    [t*ux*ux+c,    t*ux*uy-s*uz, t*ux*uz+s*uy],
    [t*ux*uy+s*uz, t*uy*uy+c,    t*uy*uz-s*ux],
    [t*ux*uz-s*uy, t*uy*uz+s*ux, t*uz*uz+c   ],
  ]
}
const RB = computed(() => { const u = axisVec.value; return rodrigues(u.x, u.y, u.z, thetaB.value) })

// Géodésique : Exp(t·Log(B)) = rotation d'angle t·θ autour de u
const Rgeo = computed(() => { const u = axisVec.value; return rodrigues(u.x, u.y, u.z, tt.value * thetaB.value) })
// Linéaire naïf : (1−t)·I + t·B
const Mlin = computed((): M3 => {
  const b = RB.value, t = tt.value
  return [
    [(1-t) + t*b[0][0], t*b[0][1], t*b[0][2]],
    [t*b[1][0], (1-t) + t*b[1][1], t*b[1][2]],
    [t*b[2][0], t*b[2][1], (1-t) + t*b[2][2]],
  ]
})

// Diagnostics du naïf : det et ‖MᵀM − I‖
function det3(m: M3) {
  return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
       - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
       + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0])
}
function orthoErr(m: M3) {
  let s = 0
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
    let v = 0; for (let k = 0; k < 3; k++) v += m[k][a]*m[k][b]
    v -= (a === b ? 1 : 0)
    s += v*v
  }
  return Math.sqrt(s)
}
const detLin = computed(() => det3(Mlin.value))
const orthoLin = computed(() => orthoErr(Mlin.value))

// ── Cube + projection ─────────────────────────────────────────────
const VERTS: [number,number,number][] = [
  [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],
]
const EDGES: [number,number][] = [
  [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],
]
const VX = [1, 0, 0], VY = [0, 0.7, -0.7]
const SCALE = 40
function projAll(m: M3, cx: number, cy: number) {
  return VERTS.map(v => {
    const rx = m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2]
    const ry = m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2]
    const rz = m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]
    return { x: cx + (VX[0]*rx+VX[1]*ry+VX[2]*rz)*SCALE, y: cy - (VY[0]*rx+VY[1]*ry+VY[2]*rz)*SCALE }
  })
}
const IDN: M3 = [[1,0,0],[0,1,0],[0,0,1]]
const CY = 100, CXL = 140, CXR = 419
const geoVerts = computed(() => projAll(Rgeo.value, CXL, CY))
const linVerts = computed(() => projAll(Mlin.value, CXR, CY))
const refVertsL = projAll(IDN, CXL, CY)
const refVertsR = projAll(IDN, CXR, CY)

// ── Play (ping-pong sur t) ────────────────────────────────────────
const playing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
let dir = 1
function play() {
  if (playing.value) { stop(); return }
  playing.value = true
  timer = setInterval(() => {
    tt.value = Math.round((tt.value + dir * 0.02) * 1000) / 1000
    if (tt.value >= 1) { tt.value = 1; dir = -1 }
    else if (tt.value <= 0) { tt.value = 0; dir = 1 }
  }, 40)
}
function stop() { if (timer) clearInterval(timer); playing.value = false }
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="si-wrap">
    <svg viewBox="0 0 558 215" class="si-svg">

      <!-- ═══ GAUCHE : géodésique (rigide) ═══ -->
      <rect x="2" y="2" width="274" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="139" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#25B34B;font-weight:700;font-family:sans-serif">
        Géodésique : Exp(t·Log B) — rigide
      </text>
      <!-- cube référence (identité, gris) -->
      <line v-for="([a,b], i) in EDGES" :key="`gr${i}`"
        :x1="refVertsL[a].x" :y1="refVertsL[a].y" :x2="refVertsL[b].x" :y2="refVertsL[b].y"
        stroke="#e2e8f0" stroke-width="1"/>
      <!-- cube géodésique -->
      <line v-for="([a,b], i) in EDGES" :key="`ge${i}`"
        :x1="geoVerts[a].x" :y1="geoVerts[a].y" :x2="geoVerts[b].x" :y2="geoVerts[b].y"
        stroke="#25B34B" stroke-width="2" stroke-linecap="round" :opacity="i < 4 ? 0.55 : 1"/>
      <circle v-for="(v, i) in geoVerts" :key="`gv${i}`" :cx="v.x" :cy="v.y" r="2.5" fill="#25B34B"/>
      <!-- diag -->
      <rect x="12" y="176" width="256" height="30" fill="#f0fdf4" rx="4" stroke="#86efac" stroke-width="1"/>
      <text x="139" y="189" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-family:monospace">det(R)=1.000 · RᵀR = I</text>
      <text x="139" y="201" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">✓ toujours une rotation valide</text>

      <!-- ═══ DROITE : linéaire naïf (déformé) ═══ -->
      <rect x="282" y="2" width="274" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="419" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">
        Naïf : (1−t)·I + t·R — déformé
      </text>
      <line v-for="([a,b], i) in EDGES" :key="`rr${i}`"
        :x1="refVertsR[a].x" :y1="refVertsR[a].y" :x2="refVertsR[b].x" :y2="refVertsR[b].y"
        stroke="#e2e8f0" stroke-width="1"/>
      <line v-for="([a,b], i) in EDGES" :key="`le${i}`"
        :x1="linVerts[a].x" :y1="linVerts[a].y" :x2="linVerts[b].x" :y2="linVerts[b].y"
        stroke="#CF1C24" stroke-width="2" stroke-linecap="round" :opacity="i < 4 ? 0.55 : 1"/>
      <circle v-for="(v, i) in linVerts" :key="`lv${i}`" :cx="v.x" :cy="v.y" r="2.5" fill="#CF1C24"/>
      <!-- diag -->
      <rect x="292" y="176" width="256" height="30" fill="#fef2f2" rx="4" stroke="#fca5a5" stroke-width="1"/>
      <text x="419" y="189" text-anchor="middle"
        style="font-size:8px;fill:#991b1b;font-family:monospace">
        det(M)={{ detLin.toFixed(3) }} · ‖MᵀM−I‖={{ orthoLin.toFixed(3) }}
      </text>
      <text x="419" y="201" text-anchor="middle"
        style="font-size:7.5px;fill:#991b1b;font-weight:700;font-family:sans-serif">
        ✗ PAS une rotation (det≠1, non orthogonale)
      </text>

      <!-- barre t -->
      <text x="279" y="24" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-family:monospace">t={{ tt.toFixed(2) }}</text>
    </svg>

    <!-- Contrôles -->
    <div class="si-controls">
      <label class="si-sl">
        <span class="si-lbl">t</span><strong>{{ tt.toFixed(2) }}</strong>
        <input type="range" v-model.number="tt" min="0" max="1" step="0.01"/>
      </label>
      <button class="si-btn" @click="play">{{ playing ? '⏸ Pause' : '▶ Animer t' }}</button>
      <label class="si-sl">
        <span class="si-lbl">θ_B</span><strong>{{ thetaB.toFixed(2) }}</strong>
        <input type="range" v-model.number="thetaB" min="0.3" :max="Math.PI.toFixed(2)" step="0.05"/>
      </label>
      <label class="si-sl">
        <span class="si-lbl">az</span><strong>{{ az }}°</strong>
        <input type="range" v-model.number="az" min="0" max="360" step="5"/>
      </label>
      <label class="si-sl">
        <span class="si-lbl">el</span><strong>{{ el }}°</strong>
        <input type="range" v-model.number="el" min="-90" max="90" step="5"/>
      </label>
      <div class="si-info">On ne peut pas additionner des rotations → il faut Exp/Log (géodésique).</div>
    </div>
  </div>
</template>

<style scoped>
.si-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.si-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.si-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.si-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.si-lbl { min-width: 24px; }
.si-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.si-sl input[type=range] { width: 84px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.si-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.si-btn:hover { background: #CF1C24; color: white; }
.si-info { font-size: 0.68rem; color: #64748b; font-style: italic;
  padding: 2px 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; }
</style>
