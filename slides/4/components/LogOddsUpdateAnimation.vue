<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Mise à jour log-odds d'une grille d'occupation ────────────────
// Modèle de capteur inverse : cellules traversées par le rayon → l += l_free,
// cellule d'impact → l += l_occ. La mise à jour est ADDITIVE en log-odds ;
// le panneau central montre la sigmoïde P = 1/(1+e^-l) : chaque mesure
// déplace la cellule le long de la courbe. Le clamping l ∈ [-4, 4] borne
// la confiance (sinon une cellule très observée deviendrait incorrigeable).
const GRID = 8
const L_CLAMP = 4
const lFree = ref(-0.5)
const lOcc  = ref(1.0)
const angleSlider = ref(30) // angle en degrés

const logOdds = ref<number[][]>(Array.from({ length: GRID }, () => Array(GRID).fill(0)))
const nMeasures = ref(0)

const OX = 18, OY = 18
const CELL = 22

// ── Mur (vérité terrain) : forme en L ─────────────────────────
const WALL = new Set<string>([
  ...[1,2,3,4,5,6].map(r => `${r}_5`),   // segment vertical (col 5)
  ...[0,1,2,3,4].map(c => `1_${c}`),      // segment horizontal (rang 1)
])

const RAY_START_X = OX
const RAY_START_Y = OY + GRID * CELL

function rayHitCells(angleDeg: number): { row: number; col: number; hit: boolean }[] {
  const angle = angleDeg * Math.PI / 180
  const dx = Math.cos(angle), dy = -Math.sin(angle)
  const cells: { row: number; col: number; hit: boolean }[] = []
  let x = 0.5, y = GRID - 0.5
  const maxSteps = GRID * 4 + 2
  const seen = new Set<string>()
  for (let st = 0; st < maxSteps; st++) {
    const col = Math.floor(x), row = Math.floor(y)
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) break
    const key = `${row}_${col}`
    if (!seen.has(key)) {
      seen.add(key)
      if (WALL.has(key)) {
        cells.push({ row, col, hit: true })
        break
      }
      cells.push({ row, col, hit: false })
    }
    x += dx * 0.25; y += dy * 0.25
  }
  return cells
}

const rayCells = computed(() => rayHitCells(angleSlider.value))

function addMeasure() {
  const cells = rayCells.value
  const newL = logOdds.value.map(r => [...r])
  for (const c of cells) {
    if (c.hit) newL[c.row][c.col] = Math.min(L_CLAMP, newL[c.row][c.col] + lOcc.value)
    else       newL[c.row][c.col] = Math.max(-L_CLAMP, newL[c.row][c.col] + lFree.value)
  }
  logOdds.value = newL
  nMeasures.value++
}

// Balayage automatique : le capteur balaie 10° → 80° comme un vrai scan
let sweepTimer: ReturnType<typeof setInterval> | null = null
const sweeping = ref(false)
function sweep() {
  if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; sweeping.value = false; return }
  sweeping.value = true
  angleSlider.value = 10
  addMeasure()
  sweepTimer = setInterval(() => {
    if (angleSlider.value >= 80) {
      clearInterval(sweepTimer!); sweepTimer = null; sweeping.value = false
      return
    }
    angleSlider.value += 2
    addMeasure()
  }, 100)
}
onUnmounted(() => { if (sweepTimer) clearInterval(sweepTimer) })

function resetGrid() {
  if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; sweeping.value = false }
  logOdds.value = Array.from({ length: GRID }, () => Array(GRID).fill(0))
  nMeasures.value = 0
}

function probOcc(l: number): number {
  return 1 / (1 + Math.exp(-l))
}

const wallCells = computed(() =>
  [...WALL].map(k => { const [row, col] = k.split('_').map(Number); return { row, col } })
)

function cellColor(row: number, col: number): string {
  const l = logOdds.value[row][col]
  const p = probOcc(l)
  if (p > 0.5) {
    return `rgb(${207},${Math.round(28 * (1 - (p - 0.5) * 2) + 180 * (1 - (p - 0.5) * 2))},${Math.round(36 * (1 - (p - 0.5) * 2) + 180 * (1 - (p - 0.5) * 2))})`
  } else {
    const t = (0.5 - p) * 2
    const r = Math.round(0 + (1 - t) * 200)
    const g = Math.round(189 + (1 - t) * 20)
    return `rgb(${r},${g},242)`
  }
}

// ── Cellule sélectionnée + sigmoïde ───────────────────────────
const selRow = ref<number>(2)
const selCol = ref<number>(5)  // cellule du mur par défaut

const selLogOdds = computed(() => logOdds.value[selRow.value][selCol.value])
const selProb = computed(() => probOcc(selLogOdds.value))

function cellX(col: number) { return OX + col * CELL }
function cellY(row: number) { return OY + row * CELL }

const rayLine = computed(() => {
  const cells = rayCells.value
  if (cells.length === 0) return null
  const last = cells[cells.length - 1]
  const x2 = OX + (last.col + 0.5) * CELL
  const y2 = OY + (last.row + 0.5) * CELL
  return { x2, y2 }
})

// Sigmoïde : l ∈ [-4.8, 4.8] → x SVG ; P ∈ [0,1] → y SVG
const SGX = 240, SGW = 138, SGY_TOP = 44, SGY_BOT = 168
function sigX(l: number) { return SGX + (l + 4.8) / 9.6 * SGW }
function sigY(p: number) { return SGY_BOT - p * (SGY_BOT - SGY_TOP) }
const sigmoidPath = computed(() => {
  const pts: string[] = []
  for (let i = 0; i <= 60; i++) {
    const l = -4.8 + i / 60 * 9.6
    pts.push(`${sigX(l).toFixed(1)},${sigY(probOcc(l)).toFixed(1)}`)
  }
  return pts.join(' ')
})
</script>

<template>
  <div class="lo-wrap">
    <svg viewBox="0 0 560 215" class="lo-svg">
      <!-- Panneau gauche : grille -->
      <rect x="0" y="0" width="215" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="107" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Grille de log-odds
      </text>

      <!-- Cellules -->
      <g v-for="r in GRID" :key="r">
        <g v-for="c in GRID" :key="c"
          @click="selRow = r-1; selCol = c-1" style="cursor:pointer">
          <rect :x="cellX(c-1)" :y="cellY(r-1)" :width="CELL" :height="CELL"
            :fill="cellColor(r-1, c-1)"
            stroke="white" stroke-width="0.8"/>
          <text v-if="logOdds[r-1][c-1] !== 0"
            :x="cellX(c-1) + CELL/2" :y="cellY(r-1) + CELL/2 + 3"
            text-anchor="middle"
            style="font-size:6px;fill:white;font-weight:700;font-family:monospace;pointer-events:none">
            {{ logOdds[r-1][c-1].toFixed(1) }}
          </text>
        </g>
      </g>

      <!-- Mur (vérité terrain) -->
      <rect v-for="w in wallCells" :key="`w${w.row}_${w.col}`"
        :x="cellX(w.col)" :y="cellY(w.row)" :width="CELL" :height="CELL"
        fill="none" stroke="#334155" stroke-width="1.6" stroke-dasharray="3,1.5" rx="1"
        style="pointer-events:none"/>

      <!-- Rayon -->
      <line v-if="rayLine"
        :x1="RAY_START_X" :y1="RAY_START_Y"
        :x2="rayLine.x2" :y2="rayLine.y2"
        stroke="#F15A22" stroke-width="1.8" stroke-dasharray="4,2" style="opacity:0.85"/>
      <g v-for="(cell, idx) in rayCells" :key="idx">
        <rect :x="cellX(cell.col)+1" :y="cellY(cell.row)+1" :width="CELL-2" :height="CELL-2"
          :stroke="cell.hit ? '#CF1C24' : '#F15A22'"
          :stroke-width="cell.hit ? 2 : 1" fill="none" rx="1" style="pointer-events:none"/>
      </g>

      <!-- Cellule sélectionnée (surbrillance verte épaisse) -->
      <rect :x="cellX(selCol)-1" :y="cellY(selRow)-1" :width="CELL+2" :height="CELL+2"
        fill="none" stroke="#25B34B" stroke-width="2.5" rx="2" style="pointer-events:none"/>

      <!-- Source du rayon -->
      <circle :cx="RAY_START_X" :cy="RAY_START_Y" r="5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <text :x="RAY_START_X" :y="RAY_START_Y + 12"
        style="font-size:7px;fill:#334155;font-family:sans-serif">Robot</text>

      <!-- Panneau central : sigmoïde -->
      <rect x="225" y="0" width="168" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="309" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        P = 1 - 1/(1+e⁻ˡ)
      </text>
      <text x="309" y="24" text-anchor="middle"
        style="font-size:7px;fill:#25B34B;font-family:sans-serif">
        cellule sélectionnée (cadre vert)
      </text>

      <!-- Axes -->
      <line :x1="SGX" :y1="SGY_BOT" :x2="SGX + SGW" :y2="SGY_BOT" stroke="#475569" stroke-width="1"/>
      <line :x1="sigX(0)" :y1="SGY_TOP - 4" :x2="sigX(0)" :y2="SGY_BOT" stroke="#e2e8f0" stroke-width="1"/>
      <line :x1="SGX" :y1="sigY(0.5)" :x2="SGX + SGW" :y2="sigY(0.5)" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="3,2"/>
      <text :x="SGX + SGW + 3" :y="sigY(0.5) + 3" style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">0.5</text>
      <text :x="SGX + SGW/2" :y="SGY_BOT + 12" text-anchor="middle" style="font-size:7px;fill:#475569;font-family:sans-serif">l (log-odds)</text>
      <text :x="sigX(-4)" :y="SGY_BOT + 12" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-family:monospace">-4</text>
      <text :x="sigX(0)" :y="SGY_BOT + 12" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-family:monospace">0</text>
      <text :x="sigX(4)" :y="SGY_BOT + 12" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-family:monospace">+4</text>

      <!-- Bornes de clamping -->
      <line :x1="sigX(-L_CLAMP)" :y1="SGY_TOP" :x2="sigX(-L_CLAMP)" :y2="SGY_BOT" stroke="#CF1C24" stroke-width="1" stroke-dasharray="2,2" style="opacity:0.6"/>
      <line :x1="sigX(L_CLAMP)" :y1="SGY_TOP" :x2="sigX(L_CLAMP)" :y2="SGY_BOT" stroke="#CF1C24" stroke-width="1" stroke-dasharray="2,2" style="opacity:0.6"/>
      <text :x="sigX(L_CLAMP)" :y="SGY_TOP - 6" text-anchor="middle" style="font-size:6px;fill:#CF1C24;font-family:sans-serif">clamp</text>

      <!-- Courbe sigmoïde -->
      <polyline :points="sigmoidPath" fill="none" stroke="#1e40af" stroke-width="2" stroke-linejoin="round"/>

      <!-- Point de la cellule sélectionnée sur la courbe -->
      <line :x1="sigX(selLogOdds)" :y1="SGY_BOT" :x2="sigX(selLogOdds)" :y2="sigY(selProb)"
        stroke="#25B34B" stroke-width="1" stroke-dasharray="2,2"/>
      <circle :cx="sigX(selLogOdds)" :cy="sigY(selProb)" r="5.5"
        fill="#25B34B" stroke="white" stroke-width="2"/>

      <text x="309" y="188" text-anchor="middle"
        style="font-size:8px;fill:#1e293b;font-weight:700;font-family:monospace">
        l = {{ selLogOdds.toFixed(2) }} → P = {{ selProb.toFixed(3) }}
      </text>
      <text x="309" y="201" text-anchor="middle"
        style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        mise à jour additive en l = glissement le long de la courbe
      </text>

      <!-- Panneau droit : règle -->
      <rect x="399" y="0" width="159" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="478" y="12" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Règle de mise à jour
      </text>
      <text x="407" y="30" style="font-size:7.5px;fill:#334155;font-family:monospace">
        l += l_occ  (impact)
      </text>
      <text x="407" y="43" style="font-size:7.5px;fill:#334155;font-family:monospace">
        l += l_free (traversée)
      </text>
      <rect x="404" y="50" width="148" height="22" fill="#fef2f2" rx="3" stroke="#fca5a5" stroke-width="1"/>
      <text x="478" y="64" text-anchor="middle"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:monospace">
        clamp : l ∈ [-{{ L_CLAMP }}, +{{ L_CLAMP }}]
      </text>
      <text x="407" y="90" style="font-size:7.5px;fill:#475569;font-family:monospace">
        l_free = {{ lFree.toFixed(1) }}
      </text>
      <text x="407" y="104" style="font-size:7.5px;fill:#475569;font-family:monospace">
        l_occ  = +{{ lOcc.toFixed(1) }}
      </text>
      <text x="407" y="126" style="font-size:6.8px;fill:#475569;font-family:sans-serif">Saturation aux extrêmes :</text>
      <text x="407" y="136" style="font-size:6.8px;fill:#475569;font-family:sans-serif">la sigmoïde s'aplatit → P bouge</text>
      <text x="407" y="146" style="font-size:6.8px;fill:#475569;font-family:sans-serif">peu, mais l continuerait de</text>
      <text x="407" y="156" style="font-size:6.8px;fill:#475569;font-family:sans-serif">croître sans le clamping.</text>
      <rect x="404" y="166" width="148" height="30" fill="#f0fdf4" rx="3" stroke="#86efac" stroke-width="1"/>
      <text x="478" y="179" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">
        Mesures : {{ nMeasures }}
      </text>
      <text x="478" y="191" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:sans-serif">
        Angle : {{ angleSlider }}°
      </text>
    </svg>

    <div class="lo-controls">
      <label class="lo-sl">
        Angle
        <strong>{{ angleSlider }}°</strong>
        <input type="range" v-model.number="angleSlider" min="10" max="80" step="5" :disabled="sweeping"/>
      </label>
      <label class="lo-sl">
        l_free
        <strong>{{ lFree.toFixed(1) }}</strong>
        <input type="range" v-model.number="lFree" min="-3" max="-0.1" step="0.1"/>
      </label>
      <label class="lo-sl">
        l_occ
        <strong>{{ lOcc.toFixed(1) }}</strong>
        <input type="range" v-model.number="lOcc" min="0.1" max="3" step="0.1"/>
      </label>
      <button class="lo-btn-main" @click="addMeasure" :disabled="sweeping">+ Mesure</button>
      <button class="lo-btn-main" @click="sweep">{{ sweeping ? '■ Stop' : '⟳ Balayage' }}</button>
      <button class="lo-btn" @click="resetGrid">↺</button>
    </div>
  </div>
</template>

<style scoped>
.lo-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.lo-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.lo-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.lo-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.lo-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.lo-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.lo-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.lo-btn-main:hover:not(:disabled) { background: #CF1C24; color: white; }
.lo-btn-main:disabled { opacity: 0.5; cursor: not-allowed; }
.lo-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.lo-btn:hover { background: #f1f5f9; }
</style>
