<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ── LiDAR 2D rotatif : ray-casting réel ───────────────────────────
// Le faisceau tourne et mesure la distance au premier obstacle
// (intersections rayon-segment et rayon-cercle exactes). Chaque tour
// remplit une IMAGE DE PORTÉE 1×M (bandeau du bas) : c'est la ligne
// d'élévation ε d'une image B×M d'un LiDAR 3D.
// Si le robot AVANCE pendant le tour (~100 ms en vrai), chaque rayon
// part d'une origine différente. Reconstruire naïvement le nuage
// depuis la pose de FIN de scan → distorsion (murs courbés).
// Deskewing : réutiliser la pose p(tᵢ) de CHAQUE rayon → nuage droit.
const M = ref(180)          // rayons par tour (résolution azimutale)
const speed = ref(0)        // vitesse du robot (m/s)
const deskew = ref(false)
const running = ref(true)

// ── Scène (monde 10 m × 7 m) ──────────────────────────────────────
const WORLD_W = 10, WORLD_H = 7
const walls = [
  { x1: 0.4, y1: 0.4, x2: 9.6, y2: 0.4 },
  { x1: 9.6, y1: 0.4, x2: 9.6, y2: 6.6 },
  { x1: 9.6, y1: 6.6, x2: 0.4, y2: 6.6 },
  { x1: 0.4, y1: 6.6, x2: 0.4, y2: 0.4 },
  // caisse rectangulaire
  { x1: 4.2, y1: 4.6, x2: 5.4, y2: 4.6 },
  { x1: 5.4, y1: 4.6, x2: 5.4, y2: 5.8 },
  { x1: 5.4, y1: 5.8, x2: 4.2, y2: 5.8 },
  { x1: 4.2, y1: 5.8, x2: 4.2, y2: 4.6 },
]
const pillar = { x: 6.8, y: 2.2, r: 0.7 }

// Intersection rayon (o, d) / segment — retourne t ou null
function raySeg(ox: number, oy: number, dx: number, dy: number,
  s: { x1: number; y1: number; x2: number; y2: number }): number | null {
  const ex = s.x2 - s.x1, ey = s.y2 - s.y1
  const den = dx * ey - dy * ex
  if (Math.abs(den) < 1e-12) return null
  const t = ((s.x1 - ox) * ey - (s.y1 - oy) * ex) / den
  const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / den
  return (t > 1e-6 && u >= 0 && u <= 1) ? t : null
}
// Intersection rayon / cercle
function rayCircle(ox: number, oy: number, dx: number, dy: number,
  c: { x: number; y: number; r: number }): number | null {
  const fx = ox - c.x, fy = oy - c.y
  const b = fx * dx + fy * dy
  const disc = b * b - (fx * fx + fy * fy - c.r * c.r)
  if (disc < 0) return null
  const t = -b - Math.sqrt(disc)
  return t > 1e-6 ? t : null
}
function castRay(ox: number, oy: number, theta: number): number {
  const dx = Math.cos(theta), dy = Math.sin(theta)
  let best = Infinity
  for (const s of walls) { const t = raySeg(ox, oy, dx, dy, s); if (t !== null && t < best) best = t }
  const tc = rayCircle(ox, oy, dx, dy, pillar)
  if (tc !== null && tc < best) best = tc
  return best
}

// ── État du scan ──────────────────────────────────────────────────
const ROBOT_Y = 3.2
const robotX = ref(2.0)
const beamIdx = ref(0)
// Une mesure par azimut : distance + origine (pose du robot à l'instant du rayon)
const ranges = ref<(number | null)[]>([])
const origins = ref<({ x: number; y: number } | null)[]>([])

function resetScan() {
  ranges.value = Array(M.value).fill(null)
  origins.value = Array(M.value).fill(null)
  beamIdx.value = 0
}
resetScan()

// Un tour ≈ 3 s d'horloge (≈ 100 ms en vrai — ralenti pour l'œil).
// La distance parcourue PAR TOUR est ce qui compte pour la distorsion :
// on avance le robot de (speed × T_rev_réel=0.1 s) × M rayons.
const REV_WALL_MS = 3000
let timer: ReturnType<typeof setInterval> | null = null
let acc = 0
function tick() {
  if (!running.value) return
  const raysPerTick = M.value * 16 / REV_WALL_MS
  acc += raysPerTick
  while (acc >= 1) {
    acc -= 1
    const i = beamIdx.value
    const theta = i / M.value * 2 * Math.PI
    const r = castRay(robotX.value, ROBOT_Y, theta)
    ranges.value[i] = isFinite(r) ? r : null
    origins.value[i] = { x: robotX.value, y: ROBOT_Y }
    beamIdx.value = (i + 1) % M.value
    // le robot avance pendant le tour (0.1 s réel / M rayons)
    robotX.value += speed.value * 0.1 / M.value * 10  // ×10 : distorsion visible
    if (robotX.value > 8.2) { robotX.value = 1.6; resetScan() }
  }
  ranges.value = [...ranges.value]
}
onMounted(() => { timer = setInterval(tick, 16) })
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Panneaux SVG ──────────────────────────────────────────────────
// Gauche : scène monde. Droite : nuage reconstruit.
const S = 23  // px par mètre
const LX = 14, LY = 6   // offsets panneau gauche
const RX = 291, RY = 6  // offsets panneau droit
const lw = (x: number) => LX + x * S
const lh = (y: number) => LY + (WORLD_H - y) * S
const rw = (x: number) => RX + x * S
const rh = (y: number) => RY + (WORLD_H - y) * S

const beamTheta = computed(() => beamIdx.value / M.value * 2 * Math.PI)
const beamEnd = computed(() => {
  const r = castRay(robotX.value, ROBOT_Y, beamTheta.value)
  const rr = isFinite(r) ? r : 12
  return { x: robotX.value + rr * Math.cos(beamTheta.value), y: ROBOT_Y + rr * Math.sin(beamTheta.value) }
})

// Points mesurés, affichés dans la scène (positions vraies)
const scenePts = computed(() => {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < M.value; i++) {
    const r = ranges.value[i], o = origins.value[i]
    if (r === null || o === null) continue
    const th = i / M.value * 2 * Math.PI
    pts.push({ x: lw(o.x + r * Math.cos(th)), y: lh(o.y + r * Math.sin(th)) })
  }
  return pts
})

// Nuage reconstruit (panneau droit) :
//  - naïf : toutes les mesures depuis la pose ACTUELLE (fin de scan)
//  - deskew : chaque mesure depuis SA pose d'origine p(tᵢ)
const cloudPts = computed(() => {
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i < M.value; i++) {
    const r = ranges.value[i], o = origins.value[i]
    if (r === null || o === null) continue
    const th = i / M.value * 2 * Math.PI
    const ox = deskew.value ? o.x : robotX.value
    const oy = deskew.value ? o.y : ROBOT_Y
    pts.push({ x: rw(ox + r * Math.cos(th)), y: rh(oy + r * Math.sin(th)) })
  }
  return pts
})

// Image de portée (bandeau 1×M)
const RMAX = 11
function rangeColor(r: number | null): string {
  if (r === null) return '#1e293b'
  const t = Math.min(r / RMAX, 1)
  // proche = rouge chaud → loin = bleu froid
  const R = Math.round(220 - t * 190), G = Math.round(60 + t * 80), B = Math.round(40 + t * 200)
  return `rgb(${R},${G},${B})`
}
const STRIP_X = 60, STRIP_W = 470, STRIP_Y = 183, STRIP_H = 16
const measuredCount = computed(() => ranges.value.filter(r => r !== null).length)
</script>

<template>
  <div class="ls-wrap">
    <svg viewBox="0 0 560 215" class="ls-svg">
      <!-- ══════ GAUCHE : scène + faisceau ══════ -->
      <rect x="0" y="0" width="270" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="135" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Scène — faisceau rotatif (ray-casting)
      </text>

      <!-- murs + obstacles -->
      <line v-for="(w, i) in walls" :key="`w${i}`"
        :x1="lw(w.x1)" :y1="lh(w.y1)" :x2="lw(w.x2)" :y2="lh(w.y2)"
        stroke="#475569" stroke-width="2"/>
      <circle :cx="lw(pillar.x)" :cy="lh(pillar.y)" :r="pillar.r * S"
        fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>

      <!-- points mesurés -->
      <circle v-for="(p, i) in scenePts" :key="`sp${i}`"
        :cx="p.x" :cy="p.y" r="1.6" fill="#CF1C24"/>

      <!-- faisceau courant -->
      <line :x1="lw(robotX)" :y1="lh(ROBOT_Y)" :x2="lw(beamEnd.x)" :y2="lh(beamEnd.y)"
        stroke="#F15A22" stroke-width="1.6" style="opacity:0.9"/>
      <circle :cx="lw(beamEnd.x)" :cy="lh(beamEnd.y)" r="3" fill="#F15A22"/>

      <!-- robot -->
      <circle :cx="lw(robotX)" :cy="lh(ROBOT_Y)" r="5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <line v-if="speed > 0" :x1="lw(robotX) + 7" :y1="lh(ROBOT_Y)" :x2="lw(robotX) + 16" :y2="lh(ROBOT_Y)"
        stroke="#334155" stroke-width="1.5" marker-end="url(#lsArr)"/>
      <defs>
        <marker id="lsArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#334155"/>
        </marker>
      </defs>

      <!-- ══════ DROITE : nuage reconstruit ══════ -->
      <rect x="277" y="0" width="281" height="176" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="417" y="13" text-anchor="middle"
        :style="`font-size:8.5px;font-weight:700;font-family:sans-serif;fill:${deskew ? '#15803d' : speed > 0 ? '#CF1C24' : '#64748b'}`">
        Nuage reconstruit — {{ deskew ? 'deskew : pose p(tᵢ) par rayon ✓' : 'naïf : tout depuis la pose finale' }}
      </text>

      <!-- vérité terrain en filigrane -->
      <line v-for="(w, i) in walls" :key="`rw${i}`"
        :x1="rw(w.x1)" :y1="rh(w.y1)" :x2="rw(w.x2)" :y2="rh(w.y2)"
        stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3,3"/>
      <circle :cx="rw(pillar.x)" :cy="rh(pillar.y)" :r="pillar.r * S"
        fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="3,3"/>

      <circle v-for="(p, i) in cloudPts" :key="`cp${i}`"
        :cx="p.x" :cy="p.y" r="1.8" :fill="deskew ? '#25B34B' : '#F15A22'"/>

      <text x="417" y="170" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        pointillés gris = vraie géométrie · robot en mouvement + naïf → murs courbés
      </text>

      <!-- ══════ BAS : image de portée 1×M ══════ -->
      <rect x="0" y="178" width="558" height="37" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="8" y="193" style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">Image de</text>
      <text x="8" y="202" style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">portée 1×{{ M }}</text>
      <g>
        <rect v-for="i in M" :key="`st${i}`"
          :x="STRIP_X + (i-1) / M * STRIP_W" :y="STRIP_Y"
          :width="STRIP_W / M + 0.5" :height="STRIP_H"
          :fill="rangeColor(ranges[i-1])"/>
      </g>
      <!-- curseur d'azimut courant -->
      <rect :x="STRIP_X + beamIdx / M * STRIP_W - 1" :y="STRIP_Y - 2" width="2" :height="STRIP_H + 4" fill="#F15A22"/>
      <text :x="STRIP_X" :y="STRIP_Y + STRIP_H + 9" style="font-size:6px;fill:#94a3b8;font-family:monospace">ω=0°</text>
      <text :x="STRIP_X + STRIP_W" :y="STRIP_Y + STRIP_H + 9" text-anchor="end" style="font-size:6px;fill:#94a3b8;font-family:monospace">ω=360°</text>
      <text x="545" y="193" text-anchor="end" style="font-size:6px;fill:#CF1C24;font-family:sans-serif">proche</text>
      <text x="545" y="201" text-anchor="end" style="font-size:6px;fill:#2563eb;font-family:sans-serif">loin</text>
    </svg>

    <div class="ls-controls">
      <button class="ls-btn-main" @click="running = !running">{{ running ? '⏸' : '▶' }}</button>
      <label class="ls-sl">
        Rayons/tour
        <strong>{{ M }}</strong>
        <input type="range" :value="M" @input="M = Number(($event.target as HTMLInputElement).value); resetScan()" min="45" max="360" step="45"/>
      </label>
      <label class="ls-sl">
        Vitesse robot
        <strong>{{ speed.toFixed(1) }}</strong>
        <input type="range" v-model.number="speed" min="0" max="2" step="0.1"/>
      </label>
      <button class="ls-btn" :class="{ on: deskew }" @click="deskew = !deskew">
        {{ deskew ? '✓ Deskewing' : 'Deskewing off' }}
      </button>
      <span class="ls-info">{{ speed === 0 ? 'Robot immobile : pas de distorsion.' : 'Le robot bouge pendant le tour → comparez naïf vs deskew.' }}</span>
    </div>
  </div>
</template>

<style scoped>
.ls-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ls-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ls-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ls-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ls-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.ls-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ls-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.ls-btn-main:hover { background: #CF1C24; color: white; }
.ls-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.ls-btn.on { border-color: #25B34B; background: #f0fdf4; color: #15803d; }
.ls-info { font-size: 0.64rem; color: #64748b; font-style: italic; }
</style>
