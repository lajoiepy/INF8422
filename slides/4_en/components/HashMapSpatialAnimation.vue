<script setup lang="ts">
import { ref, computed } from 'vue'

const blockSize = ref(4)  // en "unités monde" par bloc

// ── Grille : 10×8 blocs ───────────────────────────────────────
const COLS = 10, ROWS = 8
const BW = 22, BH = 22  // taille SVG d'un bloc
const OX = 12, OY = 18

// Trajectoire réaliste : couloir en L (le robot n'explore PAS tout →
// seuls les blocs le long du chemin sont alloués = intérêt du hashing)
const PATH: [number, number][] = [
  [7, 0], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0],          // remonte le couloir
  [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7],  // tourne à droite
  [2, 8], [2, 9], [1, 9], [0, 9],                            // fin du couloir
]
const pathIdx = ref(0)
const robotRow = computed(() => PATH[pathIdx.value][0])
const robotCol = computed(() => PATH[pathIdx.value][1])

// Blocs alloués : Set de "row_col"
const allocated = ref<Set<string>>(new Set(['7_0']))

// Hash function (spatial hashing simplifié)
function spatialHash(row: number, col: number): number {
  const p1 = 73856093, p2 = 19349663, p3 = 83492791
  return ((row * p1) ^ (col * p2) ^ (blockSize.value * p3)) & 0xFFFF
}

function allocateBlock(row: number, col: number) {
  const key = `${row}_${col}`
  if (!allocated.value.has(key)) {
    const s = new Set(allocated.value)
    s.add(key)
    allocated.value = s
  }
}

function advanceRobot() {
  if (pathIdx.value >= PATH.length - 1) return
  pathIdx.value++
  // Allouer le bloc courant et les blocs voisins observés par le capteur
  const [r, c] = PATH[pathIdx.value]
  allocateBlock(r, c)
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) allocateBlock(nr, nc)
  }
}

function resetRobot() {
  pathIdx.value = 0
  allocated.value = new Set(['7_0'])
}

// ── Table de hachage ──────────────────────────────────────────
const hashEntries = computed(() => {
  const all = [...allocated.value].map(key => {
    const [r, c] = key.split('_').map(Number)
    return { row: r, col: c, hash: spatialHash(r, c), current: r === robotRow.value && c === robotCol.value }
  }).sort((a, b) => a.hash - b.hash)
  // garder 10 lignes en s'assurant que le bloc courant est visible
  let shown = all.slice(0, 10)
  if (!shown.some(e => e.current)) {
    const cur = all.find(e => e.current)
    if (cur) shown = [...all.slice(0, 9), cur]
  }
  return shown
})

const memAllocated = computed(() => allocated.value.size * blockSize.value * blockSize.value)
const memUniform = computed(() => COLS * ROWS * blockSize.value * blockSize.value)

function blockColor(r: number, c: number): string {
  const key = `${r}_${c}`
  if (r === robotRow.value && c === robotCol.value) return '#CF1C24'
  if (allocated.value.has(key)) return '#00BDF2'
  return '#e2e8f0'
}
</script>

<template>
  <div class="hm-wrap">
    <svg viewBox="0 0 560 215" class="hm-svg">
      <!-- Panneau gauche : environnement -->
      <rect x="0" y="0" width="240" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="120" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Environnement (blocs {{ blockSize }}×{{ blockSize }})
      </text>

      <!-- Grille de blocs -->
      <g v-for="r in ROWS" :key="r">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX + (c-1)*BW" :y="OY + (r-1)*BH" :width="BW-1" :height="BH-1"
            :fill="blockColor(r-1, c-1)"
            stroke="white" stroke-width="0.5" rx="1"/>
        </g>
      </g>

      <!-- Robot -->
      <text :x="OX + robotCol*BW + BW/2" :y="OY + robotRow*BH + BH/2 + 4"
        text-anchor="middle"
        style="font-size:12px;font-family:sans-serif;pointer-events:none">🤖</text>

      <!-- Légende -->
      <rect x="10" y="198" width="14" height="8" fill="#00BDF2" rx="1"/>
      <text x="27" y="205" style="font-size:7px;fill:#00BDF2;font-family:sans-serif">Alloué</text>
      <rect x="65" y="198" width="14" height="8" fill="#e2e8f0" stroke="#CBD5E1" stroke-width="0.5" rx="1"/>
      <text x="82" y="205" style="font-size:7px;fill:#94a3b8;font-family:sans-serif">Vide</text>
      <rect x="108" y="198" width="14" height="8" fill="#CF1C24" rx="1"/>
      <text x="125" y="205" style="font-size:7px;fill:#CF1C24;font-family:sans-serif">Robot</text>

      <!-- Panneau droit : table de hachage -->
      <rect x="248" y="0" width="310" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="403" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Table de Hachage Spatiale
      </text>

      <!-- En-tête table -->
      <rect x="255" y="18" width="296" height="15" fill="#e2e8f0" rx="2"/>
      <text x="295" y="29" style="font-size:7.5px;fill:#475569;font-weight:700;font-family:monospace">Hash</text>
      <text x="365" y="29" style="font-size:7.5px;fill:#475569;font-weight:700;font-family:monospace">Bloc (r,c)</text>
      <text x="450" y="29" style="font-size:7.5px;fill:#475569;font-weight:700;font-family:monospace">Mémoire</text>

      <!-- Lignes de la table -->
      <g v-for="(e, i) in hashEntries" :key="i">
        <rect :x="255" :y="35 + i*17" width="296" :height="16"
          :fill="e.current ? '#fef2f2' : i % 2 === 0 ? '#f1f5f9' : '#f8fafc'"
          :stroke="e.current ? '#CF1C24' : 'none'" stroke-width="1" rx="1"/>
        <text v-if="e.current" :x="262" :y="35 + i*17 + 11"
          style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">🤖→</text>
        <text :x="295" :y="35 + i*17 + 11"
          :style="`font-size:7.5px;font-family:monospace;fill:${e.current ? '#CF1C24' : '#1e40af'};font-weight:${e.current ? 700 : 400}`">
          0x{{ e.hash.toString(16).padStart(4, '0').toUpperCase() }}
        </text>
        <text :x="365" :y="35 + i*17 + 11"
          :style="`font-size:7.5px;font-family:monospace;fill:${e.current ? '#CF1C24' : '#334155'}`">
          ({{ e.row }}, {{ e.col }})
        </text>
        <text :x="450" :y="35 + i*17 + 11"
          style="font-size:7.5px;fill:#64748b;font-family:monospace">
          {{ blockSize*blockSize }} vox
        </text>
      </g>

      <!-- Résumé mémoire -->
      <rect x="255" y="205" width="296" height="0" fill="none"/>
      <rect x="255" y="183" width="296" height="24" fill="#f0fdf4" rx="3" stroke="#86efac" stroke-width="1"/>
      <text x="403" y="194" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">
        Alloué : {{ memAllocated }} voxels ({{ allocated.size }} blocs)
        vs dense : {{ memUniform }} vox
      </text>
      <text x="403" y="205" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:sans-serif">
        Économie : {{ ((1 - memAllocated / memUniform) * 100).toFixed(0) }}% de mémoire
      </text>
    </svg>

    <div class="hm-controls">
      <label class="hm-sl">
        Taille bloc
        <strong>{{ blockSize }}×{{ blockSize }}</strong>
        <input type="range" v-model.number="blockSize" :min="2" :max="8" step="2" @change="resetRobot"/>
      </label>
      <button class="hm-btn-main" @click="advanceRobot"
        :disabled="pathIdx >= PATH.length - 1">▶ Avancer</button>
      <button class="hm-btn" @click="resetRobot">↺</button>
      <span class="hm-info">{{ allocated.size }} blocs alloués / {{ COLS*ROWS }} total</span>
    </div>
  </div>
</template>

<style scoped>
.hm-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.hm-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.hm-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.hm-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.hm-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.hm-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.hm-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.hm-btn-main:hover:not(:disabled) { background: #CF1C24; color: white; }
.hm-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }
.hm-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.hm-info { font-size: 0.68rem; color: #64748b; font-style: italic; }
</style>
