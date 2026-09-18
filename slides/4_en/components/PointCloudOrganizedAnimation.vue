<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Organisé vs non-organisé : MÊME nuage, deux structures ────────
// Organisé : le nuage garde la grille 2D (H×W) de l'image capteur.
//   L'index (i,j) EST la structure : les 8 voisins d'index (i±1,j±1)
//   sont presque toujours des voisins 3D (la surface observée est
//   continue) → voisinage spatial en O(1), sans aucune recherche.
// Non-organisé : simple tableau 1D. Après fusion de scans ou
//   filtrage (VoxelGrid…), l'ordre est arbitraire : l'adjacence
//   d'index ne dit plus RIEN sur l'espace → recherche nécessaire
//   (k-d tree — voir la section Structures de Données).
const H = 14, W = 20, N = H * W

type Mode = 'org' | 'unorg'
const mode = ref<Mode>('org')
const selGrid = ref<number | null>(null)  // index grille i*W+j du point choisi
const shuffleSeed = ref(7)

// ── Caméra RGB-D virtuelle : raycast d'une petite scène ───────────
// Monde : y vers le haut, z vers l'avant. Sol + mur du fond + 2 boîtes.
const CAM = { x: 0, y: 1.5, z: -0.2 }
const PITCH = 0.34            // caméra inclinée vers le bas
const FPX = 13                // focale en « pixels » → FOV ≈ 75°
const WALL_Z = 7
const BOXES = [
  { x1: -2.2, x2: -0.7, y1: 0, y2: 1.15, z1: 2.4, z2: 3.6 },
  { x1: 0.8, x2: 2.1, y1: 0, y2: 0.7, z1: 4.0, z2: 5.3 },
]

function rayDir(i: number, j: number) {
  const dx = (j - (W - 1) / 2) / FPX
  const dy = -(i - (H - 1) / 2) / FPX
  const cp = Math.cos(PITCH), sp = Math.sin(PITCH)
  const d = { x: dx, y: dy * cp - sp, z: dy * sp + cp }
  const n = Math.hypot(d.x, d.y, d.z)
  return { x: d.x / n, y: d.y / n, z: d.z / n }
}
function hitBox(d: { x: number; y: number; z: number }, b: typeof BOXES[0]): number | null {
  let tmin = 1e-3, tmax = Infinity
  const o = [CAM.x, CAM.y, CAM.z], dir = [d.x, d.y, d.z]
  const lo = [b.x1, b.y1, b.z1], hi = [b.x2, b.y2, b.z2]
  for (let a = 0; a < 3; a++) {
    if (Math.abs(dir[a]) < 1e-9) { if (o[a] < lo[a] || o[a] > hi[a]) return null; continue }
    let t1 = (lo[a] - o[a]) / dir[a], t2 = (hi[a] - o[a]) / dir[a]
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2)
    if (tmin > tmax) return null
  }
  return tmin
}
// Nuage : un point 3D par pixel (déterministe)
const pts: { x: number; y: number; z: number; t: number }[] = []
for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
  const d = rayDir(i, j)
  let t = Infinity
  if (d.y < -1e-6) t = Math.min(t, -CAM.y / d.y)                 // sol y=0
  if (d.z > 1e-6) t = Math.min(t, (WALL_Z - CAM.z) / d.z)        // mur du fond
  for (const b of BOXES) { const tb = hitBox(d, b); if (tb !== null) t = Math.min(t, tb) }
  pts.push({ x: CAM.x + t * d.x, y: CAM.y + t * d.y, z: CAM.z + t * d.z, t })
}
const tMin = Math.min(...pts.map(p => p.t)), tMax = Math.max(...pts.map(p => p.t))
function depthColor(t: number): string {
  const u = (t - tMin) / (tMax - tMin)
  return `rgb(${Math.round(u * 30)},${Math.round(189 - u * 131)},${Math.round(242 - u * 147)})`
}

// ── Permutation aléatoire (tableau 1D mélangé, déterministe) ──────
const perm = computed<number[]>(() => {
  let s = shuffleSeed.value
  const lcg = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
  const a = Array.from({ length: N }, (_, k) => k)
  for (let k = N - 1; k > 0; k--) { const r = Math.floor(lcg() * (k + 1)); [a[k], a[r]] = [a[r], a[k]] }
  return a
})
const invPerm = computed<number[]>(() => {
  const inv = new Array(N)
  perm.value.forEach((g, pos) => { inv[g] = pos })
  return inv
})

// ── Voisins d'index (selon le mode) ───────────────────────────────
const neighborSet = computed<Set<number>>(() => {
  if (selGrid.value === null) return new Set()
  const nb = new Set<number>()
  if (mode.value === 'org') {
    const i = Math.floor(selGrid.value / W), j = selGrid.value % W
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (di === 0 && dj === 0) continue
      const ni = i + di, nj = j + dj
      if (ni >= 0 && ni < H && nj >= 0 && nj < W) nb.add(ni * W + nj)
    }
  } else {
    const pos = invPerm.value[selGrid.value]
    for (const dp of [-4, -3, -2, -1, 1, 2, 3, 4]) {
      const p2 = pos + dp
      if (p2 >= 0 && p2 < N) nb.add(perm.value[p2])
    }
  }
  return nb
})
// Distance 3D moyenne des voisins d'index → le verdict quantitatif
const avgDist = computed(() => {
  if (selGrid.value === null || neighborSet.value.size === 0) return null
  const q = pts[selGrid.value]
  let sum = 0
  for (const g of neighborSet.value) {
    const p = pts[g]
    sum += Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)
  }
  return sum / neighborSet.value.size
})

// ── Panneau gauche : structure mémoire ────────────────────────────
const GX = 30, GY = 30, CW = 11.6, CH = 11.4
const cellAt = (pos: number) => ({ x: GX + (pos % W) * CW, y: GY + Math.floor(pos / W) * CH })

// ── Panneau droit : projection isométrique du nuage 3D ────────────
const YAW = 0.55
function projRaw(p: { x: number; y: number; z: number }) {
  const u = p.x * Math.cos(YAW) + p.z * Math.sin(YAW)
  const w = -p.x * Math.sin(YAW) + p.z * Math.cos(YAW)
  return { u, v: -p.y * 0.95 - w * 0.34 }
}
const iso = (() => {
  const raw = pts.map(projRaw)
  const camRaw = projRaw(CAM)
  const us = [...raw.map(r => r.u), camRaw.u], vs = [...raw.map(r => r.v), camRaw.v]
  const uMin = Math.min(...us), uMax = Math.max(...us)
  const vMin = Math.min(...vs), vMax = Math.max(...vs)
  const box = { x: 292, y: 30, w: 252, h: 152 }
  const sc = Math.min(box.w / (uMax - uMin), box.h / (vMax - vMin))
  const map = (r: { u: number; v: number }) => ({
    x: box.x + (box.w - (uMax - uMin) * sc) / 2 + (r.u - uMin) * sc,
    y: box.y + (box.h - (vMax - vMin) * sc) / 2 + (r.v - vMin) * sc,
  })
  return { pts: raw.map(map), cam: map(camRaw) }
})()
// Frustum : caméra → points des 4 pixels coin
const frustum = [0, W - 1, (H - 1) * W, H * W - 1].map(g => iso.pts[g])

function select(g: number) { selGrid.value = g }
function reset() { selGrid.value = null }
</script>

<template>
  <div class="pc-wrap">
    <svg viewBox="0 0 560 215" class="pc-svg">
      <!-- ══════ GAUCHE : structure mémoire ══════ -->
      <rect x="0" y="0" width="270" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="135" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ mode === 'org' ? `Structure : image capteur ${H}×${W} — index (i, j)` : `Structure : tableau 1D mélangé — index k = 0…${N - 1}` }}
      </text>

      <!-- étiquettes d'index -->
      <template v-if="mode === 'org'">
        <text v-for="ii in H" :key="`ri${ii}`" v-show="(ii - 1) % 4 === 0"
          :x="GX - 4" :y="GY + (ii - 1) * CH + CH / 2 + 2" text-anchor="end"
          style="font-size:5.5px;fill:#94a3b8;font-family:monospace">i={{ ii - 1 }}</text>
        <text v-for="jj in W" :key="`cj${jj}`" v-show="(jj - 1) % 5 === 0"
          :x="GX + (jj - 1) * CW + CW / 2" :y="GY - 4" text-anchor="middle"
          style="font-size:5.5px;fill:#94a3b8;font-family:monospace">j={{ jj - 1 }}</text>
      </template>
      <template v-else>
        <text v-for="ii in H" :key="`rk${ii}`" v-show="(ii - 1) % 2 === 0"
          :x="GX - 4" :y="GY + (ii - 1) * CH + CH / 2 + 2" text-anchor="end"
          style="font-size:5.5px;fill:#94a3b8;font-family:monospace">k={{ (ii - 1) * W }}</text>
      </template>

      <!-- cellules : mode organisé = grille (i,j) ; mode 1D = ordre mélangé -->
      <g v-for="pos in N" :key="`c${pos}`">
        <rect
          :x="cellAt(pos - 1).x" :y="cellAt(pos - 1).y" :width="CW - 0.7" :height="CH - 0.7"
          :fill="(() => {
            const g = mode === 'org' ? pos - 1 : perm[pos - 1]
            return g === selGrid ? '#CF1C24' : neighborSet.has(g) ? '#25B34B' : depthColor(pts[g].t)
          })()"
          :stroke="(() => {
            const g = mode === 'org' ? pos - 1 : perm[pos - 1]
            return g === selGrid || neighborSet.has(g) ? 'white' : 'none'
          })()"
          stroke-width="1" rx="1" style="cursor:pointer"
          @click="select(mode === 'org' ? pos - 1 : perm[pos - 1])"/>
      </g>

      <text x="135" y="200" text-anchor="middle"
        style="font-size:7px;fill:#64748b;font-family:sans-serif">
        {{ mode === 'org'
          ? 'cliquer un pixel → ses 8 voisins d\'index (i±1, j±1), accès O(1)'
          : 'cliquer une case → ses 8 voisins d\'index (k±1 … k±4)' }}
      </text>
      <text x="135" y="208" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        {{ mode === 'org'
          ? 'couleur = profondeur : l\'image est lisse, la structure 2D a du sens'
          : 'mêmes points, ordre arbitraire (après fusion / VoxelGrid) : plus aucune structure' }}
      </text>

      <!-- ══════ DROITE : le même nuage dans l'espace 3D ══════ -->
      <rect x="277" y="0" width="281" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="417" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Espace 3D — le même nuage ({{ N }} points)
      </text>

      <!-- frustum caméra -->
      <line v-for="(f, k) in frustum" :key="`f${k}`"
        :x1="iso.cam.x" :y1="iso.cam.y" :x2="f.x" :y2="f.y"
        stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="2,2" style="opacity:0.7"/>
      <rect :x="iso.cam.x - 4" :y="iso.cam.y - 3" width="8" height="6" fill="#475569" rx="1"/>
      <text :x="iso.cam.x + 7" :y="iso.cam.y + 2"
        style="font-size:6px;fill:#475569;font-family:sans-serif">RGB-D</text>

      <!-- liens sélection → voisins d'index -->
      <g v-if="selGrid !== null">
        <line v-for="g in [...neighborSet]" :key="`l${g}`"
          :x1="iso.pts[selGrid].x" :y1="iso.pts[selGrid].y"
          :x2="iso.pts[g].x" :y2="iso.pts[g].y"
          :stroke="mode === 'org' ? '#25B34B' : '#F15A22'" stroke-width="1.1" style="opacity:0.75"/>
      </g>

      <!-- points -->
      <circle v-for="(sp, g) in iso.pts" :key="`p${g}`"
        :cx="sp.x" :cy="sp.y"
        :r="g === selGrid ? 4.2 : neighborSet.has(g) ? 3.4 : 2"
        :fill="g === selGrid ? '#CF1C24' : neighborSet.has(g) ? '#25B34B' : depthColor(pts[g].t)"
        :stroke="g === selGrid || neighborSet.has(g) ? 'white' : 'none'" stroke-width="1"
        style="cursor:pointer" @click="select(g)"/>

      <!-- verdict -->
      <template v-if="avgDist !== null">
        <text x="417" y="200" text-anchor="middle"
          :style="`font-size:7.5px;font-weight:700;font-family:sans-serif;fill:${mode === 'org' ? '#15803d' : '#CF1C24'}`">
          distance 3D moyenne des 8 voisins d'index : {{ avgDist.toFixed(2) }} m
          {{ mode === 'org' ? '→ voisins spatiaux ✓' : '→ éparpillés ✗' }}
        </text>
        <text x="417" y="208" text-anchor="middle"
          style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
          {{ mode === 'org'
            ? 'la grille capteur donne le voisinage spatial gratuitement'
            : 'voisinage spatial ⇒ recherche (k-d tree — section Structures de Données)' }}
        </text>
      </template>
      <text v-else x="417" y="204" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        cliquez un point (à gauche ou ici) pour tester ses voisins d'index
      </text>
    </svg>

    <div class="pc-controls">
      <span class="pc-mode">
        <button class="pc-btn" :class="{ on: mode === 'org' }" @click="mode = 'org'">Organisé (H×W)</button>
        <button class="pc-btn" :class="{ on: mode === 'unorg' }" @click="mode = 'unorg'">Non-organisé (1D)</button>
      </span>
      <button v-if="mode === 'unorg'" class="pc-btn" @click="shuffleSeed++">🎲 remélanger</button>
      <button class="pc-btn" @click="reset">↺</button>
      <span class="pc-info">
        {{ mode === 'org'
          ? 'l\'index (i,j) hérite de la grille du capteur : adjacence d\'index ≈ adjacence spatiale'
          : 'liste de points P = {p₁, …, p_N} : l\'ordre ne porte aucune information spatiale' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.pc-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.pc-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.pc-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pc-mode { display: flex; gap: 0; }
.pc-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 600;
}
.pc-btn:hover { background: #f1f5f9; }
.pc-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.pc-mode .pc-btn:first-child { border-radius: 5px 0 0 5px; }
.pc-mode .pc-btn:last-child { border-radius: 0 5px 5px 0; border-left: none; }
.pc-info { font-size: 0.66rem; color: #64748b; font-style: italic; }
</style>
