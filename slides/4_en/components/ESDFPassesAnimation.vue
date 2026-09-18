<script setup lang="ts">
import { computed, ref } from 'vue'
import { signedEDT2D } from '../lib/distance-transform.mjs'
import { useAnimationPlayer } from './useAnimationPlayer'
import AnimationControls from './AnimationControls.vue'

const ROWS = 8, COLS = 11
const initial = () => Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) =>
  (y >= 2 && y <= 4 && x >= 2 && x <= 4) || (y >= 4 && y <= 6 && x >= 7 && x <= 8)))
const occupied = ref(initial())
const observed = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => !(x >= 9 && y <= 1)))
type Frame = { phase: string; axis: string | null; line: number; candidates: number[]; values: (number | null)[][] }
const frames = ref<Frame[]>([])
const index = ref(0)
function prepare() {
  const sequence: Frame[] = []
  const result = signedEDT2D(occupied.value, observed, 1, (f: Frame) => sequence.push(f))
  sequence.push({ phase: 'signed', axis: null, line: -1, candidates: [], values: result })
  frames.value = sequence
  index.value = 0
}
prepare()
const player = useAnimationPlayer({
  tick: () => { index.value = Math.min(index.value + 1, frames.value.length - 1); return index.value < frames.value.length - 1 },
  reset: prepare, intervalMs: 320,
})
const { playing, done, speed } = player
const current = computed(() => frames.value[index.value])
const descriptions: Record<string, [string, string, string]> = {
  initial: ['Initialiser', 'Obstacles : 0. Autres sites : ∞.', 'Le gris reste inconnu ; il ne devient pas libre.'],
  'forward-x': ['X — passe avant →', 'Chaque ligne : comparer avec le voisin de gauche + 1.', 'La couleur orange indique la ligne balayée.'],
  'backward-x': ['X — passe arrière ←', 'Comparer aussi avec le voisin de droite + 1.', 'On connaît la distance au plus proche obstacle de la ligne.'],
  square: ['Passer aux carrés', 'Élever les distances X au carré.', 'Les axes suivants combinent des distances au carré.'],
  'forward-y': ['Y — passe avant ↓', 'Sélectionner les candidats de chaque colonne.', 'Un candidat combine la distance X et le déplacement en Y.'],
  'backward-y': ['Y — passe arrière ↑', 'Évaluer le minimum euclidien dans la colonne.', 'D(x,y) = minⱼ [Dₓ(x,j) + (y−j)²]'],
  signed: ['Racine et signe', 'Bleu : extérieur (+). Rouge : intérieur (−).', 'À l’intérieur, utiliser la distance aux sites libres.'],
}
const description = computed(() => descriptions[current.value.phase])
const units = computed(() => ['square', 'forward-y', 'backward-y'].includes(current.value.phase) ? 'distance² (voxels²)' : 'distance (voxels)')
function edit(y: number, x: number) {
  if (!observed[y][x]) return
  player.pause()
  occupied.value[y][x] = !occupied.value[y][x]
  player.restart()
  player.play()
}
function resetScene() { occupied.value = initial(); player.restart() }
function value(y: number, x: number) {
  if (!observed[y][x]) return '?'
  const d = current.value.values[y][x]
  if (d === null) return '?'
  if (!Number.isFinite(d)) return d < 0 ? '−∞' : '∞'
  return Number.isInteger(d) ? String(d) : d.toFixed(1)
}
function fill(y: number, x: number) {
  if (!observed[y][x]) return '#d1d5db'
  if (occupied.value[y][x]) return '#fee2e2'
  const d = current.value.values[y][x]
  return d !== null && Number.isFinite(d) ? '#e0f2fe' : '#fff'
}
function highlight(y: number, x: number) {
  return (current.value.axis === 'x' && current.value.line === y) || (current.value.axis === 'y' && current.value.line === x)
}
</script>

<template>
  <div class="edt-demo" @click.stop>
    <div class="edt-content">
      <svg viewBox="0 0 374 295" class="edt-grid" aria-label="Transformée euclidienne par passes sur X puis Y">
        <text x="187" y="16" text-anchor="middle" class="grid-title">{{ units }} · cliquer pour modifier un obstacle</text>
        <g v-for="(row, y) in occupied" :key="y">
          <g v-for="(_, x) in row" :key="x" @click="edit(y, x)" :data-cell="`${y},${x}`" class="cell">
            <rect :x="11+x*32" :y="28+y*30" width="30" height="28" rx="3"
              :fill="fill(y,x)" :stroke="highlight(y,x) ? '#F15A22' : occupied[y][x] ? '#CF1C24' : '#cbd5e1'"
              :stroke-width="highlight(y,x) ? 2.5 : 1" />
            <text :x="26+x*32" :y="46+y*30" text-anchor="middle" class="cell-value"
              :fill="occupied[y][x] ? '#991b1b' : '#164e63'">{{ value(y,x) }}</text>
            <circle v-if="current.phase === 'forward-y' && current.line === x && current.candidates.includes(y)"
              :cx="36+x*32" :cy="32+y*30" r="3" fill="#F15A22" />
          </g>
        </g>
        <text x="15" y="285" class="grid-legend">Rouge : obstacle · bleu : valeur finie · gris : inconnu</text>
      </svg>
      <div class="edt-explanation">
        <div class="edt-steps">
          <span :class="{ active: current.phase === 'initial' }">0 / ∞</span><b>→</b>
          <span :class="{ active: current.axis === 'x' }">X ⇄</span><b>→</b>
          <span :class="{ active: current.axis === 'y' || current.phase === 'square' }">Y ⇅</span><b>→</b>
          <span :class="{ active: current.phase === 'signed' }">√ + signe</span>
        </div>
        <h3 data-phase>{{ description[0] }}</h3>
        <p>{{ description[1] }}</p>
        <p class="edt-detail">{{ description[2] }}</p>
        <div class="edt-note"><strong>En 3D :</strong> ajouter les passes sur Z avant la racine.</div>
        <div class="edt-note">Convention discrète : distance aux centres de la classe opposée. Le zéro se situe entre les classes.</div>
        <div v-if="current.phase === 'signed'" class="edt-note">Une seconde transformée, vers les sites libres, fournit les distances intérieures.</div>
      </div>
    </div>
    <AnimationControls :playing="playing" :done="done" :speed="speed" step-label="Ligne suivante"
      :stats="`${index + 1} / ${frames.length}`" caption="Après ajout ou retrait d’un obstacle, la démonstration rejoue les passes sur la grille."
      @toggle="player.toggle" @step="player.stepOnce" @reset="resetScene" @update:speed="speed = $event" />
  </div>
</template>

<style scoped>
.edt-content { display: grid; grid-template-columns: 1.05fr 1fr; gap: 24px; align-items: start; }
.edt-grid { width: 100%; height: 295px; }
.grid-title { font: 10px sans-serif; fill: #475569; }
.grid-legend { font: 10px sans-serif; fill: #475569; }
.cell-value { font: 11px ui-monospace, monospace; pointer-events: none; }
.cell { cursor: pointer; }
.edt-explanation { padding-top: 12px; font-size: 15px; }
.edt-explanation h3 { color: #c2410c; margin-top: 22px; font-size: 21px; }
.edt-detail { min-height: 43px; color: #475569; }
.edt-steps { display: flex; gap: 8px; align-items: center; font-size: 13px; }
.edt-steps span { background: #f1f5f9; border-radius: 5px; padding: 6px; }
.edt-steps .active { background: #ffedd5; color: #9a3412; font-weight: 700; }
.edt-note { font-size: 12px; margin-top: 12px; color: #475569; }
</style>
