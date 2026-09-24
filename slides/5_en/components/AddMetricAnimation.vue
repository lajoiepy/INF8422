<script setup lang="ts">
import { computed, ref } from 'vue'

// --- Modèle de points 2D (contour échantillonné) ---
function squarePts(s = 40, nSide = 8): number[][] {
  const pts: number[][] = []
  const step = (2 * s) / nSide
  for (let i = 0; i < nSide; i++) {
    const t = -s + i * step
    pts.push([t, s]) // haut
  }
  for (let i = 0; i < nSide; i++) {
    const t = -s + i * step
    pts.push([s, -t]) // droite
  }
  for (let i = 0; i < nSide; i++) {
    const t = -s + i * step
    pts.push([-t, -s]) // bas
  }
  for (let i = 0; i < nSide; i++) {
    const t = -s + i * step
    pts.push([-s, t]) // gauche
  }
  return pts
}

function lPts(s = 40): number[][] {
  const verts = [
    [-s, -s], [s, -s], [s, -s / 3], [-s / 3, -s / 3], [-s / 3, s], [-s, s],
  ]
  const pts: number[][] = []
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i]
    const b = verts[(i + 1) % verts.length]
    for (let k = 0; k < 6; k++) {
      const u = k / 6
      pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u])
    }
  }
  return pts
}

const shape = ref<'carre' | 'L'>('carre')
const angleDeg = ref(90)
const tx = ref(0)
const showMode = ref<'ADD' | 'ADDS'>('ADD')

const modelPts = computed(() => (shape.value === 'carre' ? squarePts() : lPts()))

// Pose estimée = rotation(angle) + translation(tx, 0) appliquées au modèle
const estPts = computed(() => {
  const a = (angleDeg.value * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  return modelPts.value.map(([x, y]) => [c * x - s * y + tx.value, s * x + c * y])
})

// ADD : distance moyenne point-à-point (même indice)
const add = computed(() => {
  const P = modelPts.value
  const Q = estPts.value
  let sum = 0
  for (let i = 0; i < P.length; i++)
    sum += Math.hypot(P[i][0] - Q[i][0], P[i][1] - Q[i][1])
  return sum / P.length
})

// ADD-S : distance moyenne au plus proche point
const nearestIdx = computed(() => {
  const P = modelPts.value
  const Q = estPts.value
  return P.map((p) => {
    let best = 0
    let bestD = Infinity
    for (let j = 0; j < Q.length; j++) {
      const d = Math.hypot(p[0] - Q[j][0], p[1] - Q[j][1])
      if (d < bestD) { bestD = d; best = j }
    }
    return best
  })
})

const addS = computed(() => {
  const P = modelPts.value
  const Q = estPts.value
  let sum = 0
  for (let i = 0; i < P.length; i++) {
    const j = nearestIdx.value[i]
    sum += Math.hypot(P[i][0] - Q[j][0], P[i][1] - Q[j][1])
  }
  return sum / P.length
})

// Diamètre de l'objet et seuil standard 10 % du diamètre
const diameter = computed(() => {
  const P = modelPts.value
  let d = 0
  for (let i = 0; i < P.length; i++)
    for (let j = i + 1; j < P.length; j++)
      d = Math.max(d, Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]))
  return d
})
const threshold = computed(() => 0.1 * diameter.value)

// --- Rendu SVG ---
const cx = 128
const cy = 122
const toSvg = (p: number[]) => [cx + p[0], cy - p[1]]

const barMax = 100
function barW(v: number): number {
  return Math.min(230, (v / barMax) * 230)
}
const addOk = computed(() => add.value < threshold.value)
const addSOk = computed(() => addS.value < threshold.value)

const corrLines = computed(() => {
  const P = modelPts.value
  const Q = estPts.value
  const lines: { x1: number, y1: number, x2: number, y2: number }[] = []
  for (let i = 0; i < P.length; i += 2) {
    const j = showMode.value === 'ADD' ? i : nearestIdx.value[i]
    const [x1, y1] = toSvg(P[i])
    const [x2, y2] = toSvg(Q[j])
    lines.push({ x1, y1, x2, y2 })
  }
  return lines
})
</script>

<template>
  <div class="add-metric-anim">
    <div class="controls">
      <label>
        Objet :
        <select v-model="shape">
          <option value="carre">Carré (symétrique 90°)</option>
          <option value="L">Forme en L (asymétrique)</option>
        </select>
      </label>
      <label>
        Erreur de rotation : <b>{{ angleDeg }}°</b>
        <input v-model.number="angleDeg" type="range" min="-180" max="180" step="1">
      </label>
      <label>
        Erreur de translation : <b>{{ tx }} px</b>
        <input v-model.number="tx" type="range" min="0" max="30" step="1">
      </label>
      <label>
        Correspondances :
        <select v-model="showMode">
          <option value="ADD">ADD (même indice)</option>
          <option value="ADDS">ADD-S (plus proche)</option>
        </select>
      </label>
    </div>
    <svg viewBox="0 0 558 245" class="svg">
      <!-- Panneau scène -->
      <rect x="4" y="4" width="250" height="237" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
      <text x="129" y="20" text-anchor="middle" fill="#475569" style="font-size:10px;font-weight:bold">
        Pose de référence (vert), estimation (orange)
      </text>
      <g>
        <line
          v-for="(l, i) in corrLines" :key="`c${i}`"
          :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2"
          stroke="#475569" stroke-width="0.7" :style="{ opacity: 0.45 }"
        />
      </g>
      <g>
        <circle
          v-for="(p, i) in modelPts" :key="`m${i}`"
          :cx="toSvg(p)[0]" :cy="toSvg(p)[1]" r="2.4" fill="#25B34B"
        />
      </g>
      <g>
        <circle
          v-for="(p, i) in estPts" :key="`e${i}`"
          :cx="toSvg(p)[0]" :cy="toSvg(p)[1]" r="2.4" fill="#F15A22"
        />
      </g>

      <!-- Panneau métriques -->
      <rect x="262" y="4" width="292" height="237" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
      <text x="408" y="24" text-anchor="middle" fill="#475569" style="font-size:11px;font-weight:bold">
        Erreur moyenne (px) — seuil = 10 % du diamètre
      </text>

      <text x="278" y="62" fill="#475569" style="font-size:11px;font-weight:bold">ADD</text>
      <rect x="278" y="70" width="230" height="14" rx="3" fill="#e2e8f0" />
      <rect x="278" y="70" :width="barW(add)" height="14" rx="3" :fill="addOk ? '#25B34B' : '#CF1C24'" />
      <text x="514" y="81" fill="#475569" style="font-size:10px">{{ add.toFixed(1) }}</text>

      <text x="278" y="118" fill="#475569" style="font-size:11px;font-weight:bold">ADD-S</text>
      <rect x="278" y="126" width="230" height="14" rx="3" fill="#e2e8f0" />
      <rect x="278" y="126" :width="barW(addS)" height="14" rx="3" :fill="addSOk ? '#25B34B' : '#CF1C24'" />
      <text x="514" y="137" fill="#475569" style="font-size:10px">{{ addS.toFixed(1) }}</text>

      <!-- Ligne de seuil sur les deux barres -->
      <line
        :x1="278 + barW(threshold)" y1="64" :x2="278 + barW(threshold)" y2="146"
        stroke="#475569" stroke-width="1.2" stroke-dasharray="4 3"
      />
      <text :x="278 + barW(threshold) + 4" y="60" fill="#475569" style="font-size:9px">seuil {{ threshold.toFixed(1) }}</text>

      <text x="278" y="180" fill="#475569" style="font-size:10.5px">
        Critère ADD : <tspan :fill="addOk ? '#25B34B' : '#CF1C24'" style="font-weight:bold">{{ addOk ? 'pose acceptée' : 'pose rejetée' }}</tspan>
      </text>
      <text x="278" y="198" fill="#475569" style="font-size:10.5px">
        Critère ADD-S : <tspan :fill="addSOk ? '#25B34B' : '#CF1C24'" style="font-weight:bold">{{ addSOk ? 'pose acceptée' : 'pose rejetée' }}</tspan>
      </text>
      <text x="278" y="226" fill="#94a3b8" style="font-size:9.5px">
        Carré à 90° : ADD pénalise la permutation des points ; ADD-S respecte la symétrie.
      </text>
    </svg>
  </div>
</template>

<style scoped>
.add-metric-anim .controls {
  display: flex;
  gap: 1.2rem;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #475569;
  margin-bottom: 0.3rem;
  align-items: center;
}
.add-metric-anim .controls label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.add-metric-anim input[type='range'] {
  accent-color: #CF1C24;
  width: 110px;
}
.add-metric-anim select {
  border: 1px solid #CBD5E1;
  border-radius: 4px;
  font-size: 0.72rem;
  padding: 1px 4px;
  background: white;
}
.add-metric-anim .svg {
  height: 248px;
  width: 100%;
}
</style>
