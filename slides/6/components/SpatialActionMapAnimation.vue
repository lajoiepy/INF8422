<script setup lang="ts">
import { computed, ref } from 'vue'

// Grille top-down N x N contenant un objet barre orientable.
// Filtre "saisie" fixe (détecte une barre verticale) appliqué par convolution réelle
// sur l'image tournée de -θ pour chaque bin de rotation.
const N = 11
const objAngle = ref(45) // orientation de la barre (0° = verticale)
const bins = [0, 45, 90, 135]

// Rasterisation de la barre (L x W) centrée, tournée de objAngle
function renderScene(thetaDeg: number): number[][] {
  const img: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 0))
  const c = (N - 1) / 2
  const th = (thetaDeg * Math.PI) / 180
  const L = 4.4
  const W = 1.2
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      // coordonnées dans le repère de l'objet (rotation inverse)
      const dx = j - c
      const dy = i - c
      const u = Math.cos(th) * dx + Math.sin(th) * dy
      const v = -Math.sin(th) * dx + Math.cos(th) * dy
      if (Math.abs(u) <= W / 2 && Math.abs(v) <= L / 2)
        img[i][j] = 1
    }
  }
  return img
}

// Rotation d'image (plus proche voisin) autour du centre
function rotateImg(img: number[][], deg: number): number[][] {
  const out: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => 0))
  const c = (N - 1) / 2
  const th = (deg * Math.PI) / 180
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const dx = j - c
      const dy = i - c
      const sj = Math.round(Math.cos(th) * dx + Math.sin(th) * dy + c)
      const si = Math.round(-Math.sin(th) * dx + Math.cos(th) * dy + c)
      if (si >= 0 && si < N && sj >= 0 && sj < N)
        out[i][j] = img[si][sj]
    }
  }
  return out
}

// Convolution 3x3 réelle avec le filtre [-1,2,-1] (colonnes) : détecte une barre verticale
const FILT = [
  [-1, 2, -1],
  [-1, 2, -1],
  [-1, 2, -1],
]
function convolve(img: number[][]): number[][] {
  const out: number[][] = Array.from({ length: N }, () => Array.from({ length: N }, () => -99))
  for (let i = 1; i < N - 1; i++) {
    for (let j = 1; j < N - 1; j++) {
      let s = 0
      for (let di = -1; di <= 1; di++)
        for (let dj = -1; dj <= 1; dj++)
          s += img[i + di][j + dj] * FILT[di + 1][dj + 1]
      out[i][j] = s
    }
  }
  return out
}

const scene = computed(() => renderScene(objAngle.value))

interface BinResult {
  angle: number
  scores: number[][]
  max: number
  argmax: [number, number]
}

const binResults = computed<BinResult[]>(() =>
  bins.map((bth) => {
    const rotated = rotateImg(scene.value, -bth)
    const scores = convolve(rotated)
    let max = -Infinity
    let argmax: [number, number] = [0, 0]
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (scores[i][j] > max) {
          max = scores[i][j]
          argmax = [i, j]
        }
      }
    }
    return { angle: bth, scores, max, argmax }
  }),
)

const bestBin = computed(() =>
  binResults.value.reduce((a, b) => (b.max > a.max ? b : a)),
)

// Position du meilleur grasp reprojetée dans l'image d'origine :
// le pixel (i,j) de l'image tournée de -θ provient du pixel tourné de +(-θ) inverse
const bestGrasp = computed(() => {
  const [i, j] = bestBin.value.argmax
  const c = (N - 1) / 2
  const th = (-bestBin.value.angle * Math.PI) / 180
  const dx = j - c
  const dy = i - c
  const x = Math.cos(th) * dx + Math.sin(th) * dy + c
  const y = -Math.sin(th) * dx + Math.cos(th) * dy + c
  return { x, y, theta: bestBin.value.angle }
})

// --- Rendu SVG ---
const cell = 15
const gx = 18
const gy = 40
function sceneFill(v: number): string {
  return v > 0.5 ? '#475569' : '#ffffff'
}
function scoreFill(v: number): string {
  if (v <= -90) return '#f1f5f9'
  if (v <= 0) return '#e2e8f0'
  const t = Math.min(1, v / 6)
  const r = Math.round(255 - t * (255 - 241))
  const g = Math.round(255 - t * (255 - 90))
  const bl = Math.round(255 - t * (255 - 34))
  return `rgb(${r},${g},${bl})`
}
const miniCell = 6.4
const miniY = 52

// Pince dessinée sur la scène : deux mâchoires perpendiculaires à l'axe de la barre
const gripper = computed(() => {
  const px = gx + (bestGrasp.value.x + 0.5) * cell
  const py = gy + (bestGrasp.value.y + 0.5) * cell
  const th = (bestGrasp.value.theta * Math.PI) / 180
  // direction de fermeture : perpendiculaire à la barre (barre à 0° = verticale -> fermeture horizontale)
  const dx = Math.cos(th)
  const dy = Math.sin(th)
  const open = 18
  const jaw = 9
  // axe de la mâchoire : le long de la barre
  const ax = -Math.sin(th)
  const ay = Math.cos(th)
  return {
    line: { x1: px - dx * open, y1: py - dy * open, x2: px + dx * open, y2: py + dy * open },
    jawA: { x1: px - dx * open - ax * jaw, y1: py - dy * open - ay * jaw, x2: px - dx * open + ax * jaw, y2: py - dy * open + ay * jaw },
    jawB: { x1: px + dx * open - ax * jaw, y1: py + dy * open - ay * jaw, x2: px + dx * open + ax * jaw, y2: py + dy * open + ay * jaw },
  }
})
</script>

<template>
  <div class="sam-anim">
    <div class="controls">
      <label>
        Orientation de l'objet : <b>{{ objAngle }}°</b>
        <input v-model.number="objAngle" type="range" min="0" max="180" step="15">
      </label>
      <span class="verdict">
        Orientation sélectionnée : <b style="color:#CF1C24">{{ bestBin.angle }}°</b>
        (score {{ bestBin.max.toFixed(0) }}) → préhension (x, y, θ) extraite de la carte
      </span>
    </div>
    <svg viewBox="0 0 558 245" class="svg">
      <!-- Panneau scène -->
      <rect x="4" y="4" width="200" height="237" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
      <text x="104" y="22" text-anchor="middle" fill="#475569" style="font-size:10px;font-weight:bold">
        Vue de dessus (carte de hauteur)
      </text>
      <g>
        <template v-for="(row, i) in scene" :key="`r${i}`">
          <rect
            v-for="(v, j) in row" :key="`c${i}-${j}`"
            :x="gx + j * cell" :y="gy + i * cell" :width="cell - 1" :height="cell - 1"
            :fill="sceneFill(v)" stroke="#e2e8f0" stroke-width="0.5"
          />
        </template>
      </g>
      <!-- Pince au meilleur grasp -->
      <line v-bind="gripper.line" stroke="#CF1C24" stroke-width="2" />
      <line v-bind="gripper.jawA" stroke="#CF1C24" stroke-width="3" />
      <line v-bind="gripper.jawB" stroke="#CF1C24" stroke-width="3" />

      <!-- Panneau cartes de score -->
      <rect x="212" y="4" width="342" height="237" rx="5" fill="#f8fafc" stroke="#CBD5E1" />
      <text x="383" y="22" text-anchor="middle" fill="#475569" style="font-size:10px;font-weight:bold">
        Une carte de score par orientation : convolution d’un filtre partagé sur l'image tournée de −θ
      </text>
      <g>
        <template v-for="(res, k) in binResults" :key="`b${k}`">
          <g>
            <text
              :x="228 + k * 82 + (N * miniCell) / 2" :y="miniY - 6" text-anchor="middle"
              :fill="res.angle === bestBin.angle ? '#CF1C24' : '#475569'"
              :style="{ fontSize: '9.5px', fontWeight: res.angle === bestBin.angle ? 'bold' : 'normal' }">
              θ = {{ res.angle }}°
            </text>
            <template v-for="(row, i) in res.scores" :key="`m${k}-${i}`">
              <rect
                v-for="(v, j) in row" :key="`m${k}-${i}-${j}`"
                :x="228 + k * 82 + j * miniCell" :y="miniY + i * miniCell"
                :width="miniCell - 0.4" :height="miniCell - 0.4" :fill="scoreFill(v)"
              />
            </template>
            <rect
              v-if="res.angle === bestBin.angle"
              :x="228 + k * 82 + res.argmax[1] * miniCell - 1" :y="miniY + res.argmax[0] * miniCell - 1"
              :width="miniCell + 1.6" :height="miniCell + 1.6"
              fill="none" stroke="#CF1C24" stroke-width="1.6"
            />
            <rect
              :x="228 + k * 82 - 2" :y="miniY - 2"
              :width="N * miniCell + 4" :height="N * miniCell + 4"
              fill="none"
              :stroke="res.angle === bestBin.angle ? '#CF1C24' : '#CBD5E1'"
              :stroke-width="res.angle === bestBin.angle ? 1.8 : 0.8"
            />
          </g>
        </template>
      </g>
      <text x="228" y="152" fill="#475569" style="font-size:9.5px">
        Maximum sur les pixels et orientations → préhension (x, y, θ).
      </text>
      <text x="228" y="166" fill="#475569" style="font-size:9.5px">
        Un filtre fixe détecte les motifs verticaux dans chaque image tournée.
      </text>
      <text x="228" y="192" fill="#94a3b8" style="font-size:9.5px">
        La rotation de l’objet modifie l’orientation du maximum.
      </text>
      <text x="228" y="206" fill="#94a3b8" style="font-size:9.5px">
        Filtre 3×3 par colonnes : [−1, 2, −1] (répété sur 3 lignes).
      </text>
    </svg>
  </div>
</template>

<style scoped>
.sam-anim .controls {
  display: flex;
  gap: 1.4rem;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #475569;
  margin-bottom: 0.3rem;
  align-items: center;
}
.sam-anim .controls label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.sam-anim input[type='range'] {
  accent-color: #CF1C24;
  width: 130px;
}
.sam-anim .svg {
  height: 248px;
  width: 100%;
}
</style>
