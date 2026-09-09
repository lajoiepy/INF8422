<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Résolution de Λx = η par élimination, une OPÉRATION DE LIGNE par étape ──
// Système « arrowhead » : 3 poses (x0,x1,x2) avec prior + arête vers l'amer ℓ,
// AUCUNE arête pose-pose.  ℓ = variable dense.
//   Λ = [ 2  0  0 -1 ]   η = ( 3, 1, 5, -2 )   →  x = (2, 1, 3, 1)
//       [ 0  2  0 -1 ]
//       [ 0  0  2 -1 ]
//       [-1 -1 -1  4 ]
//   ℓ éliminé EN DERNIER  → 0 fill-in.   ℓ éliminé EN PREMIER → relie x0,x1,x2 (3 fill-in).
// Chaque étape d'élimination = une sous-équation  rᵢ ← rᵢ − (Λᵢₖ/Λₖₖ)·rₖ  affichée explicitement.
const N = 4
const LAM0 = [
  [2, 0, 0, -1],
  [0, 2, 0, -1],
  [0, 0, 2, -1],
  [-1, -1, -1, 4],
]
const ETA0 = [3, 1, 5, -2]
const LABEL = ['x0', 'x1', 'x2', 'ℓ']
function lbl(v: number) { return LABEL[v] }
function ek(a: number, b: number) { return a < b ? `${a},${b}` : `${b},${a}` }
function f(v: number) { const r = Math.abs(v) < 1e-9 ? 0 : Math.round(v * 100) / 100; return Number.isInteger(r) ? `${r}` : r.toFixed(2) }

type Step = {
  phase: 'init' | 'elim' | 'back'
  M: number[][]; g: number[]; fill: boolean[][]
  pivotRow: number; targetRow: number; solveRow: number
  elim: number[]; pivotVar: number
  msg: string
}
function clone(m: number[][]) { return m.map(r => r.slice()) }

function buildSteps(mode: 'last' | 'first') {
  const P = mode === 'first' ? [3, 0, 1, 2] : [0, 1, 2, 3]
  const M = P.map(i => P.map(j => LAM0[i][j]))
  const g = P.map(i => ETA0[i])
  const origZero = M.map(row => row.map(v => v === 0))
  const zeros = () => Array.from({ length: N }, () => Array(N).fill(false))
  const fillMask = () => M.map((row, i) => row.map((v, j) => origZero[i][j] && Math.abs(v) > 1e-9))

  const steps: Step[] = [{
    phase: 'init', M: clone(M), g: g.slice(), fill: zeros(),
    pivotRow: -1, targetRow: -1, solveRow: -1, elim: [], pivotVar: -1,
    msg: 'Système Λx = η réordonné selon l\'ordre choisi. « ▶ Étape » applique une opération de ligne.',
  }]

  // ── élimination avant : une opération rᵢ ← rᵢ − fac·rₖ par étape ──
  for (let k = 0; k < N; k++) {
    for (let i = k + 1; i < N; i++) {
      if (Math.abs(M[i][k]) <= 1e-12) continue
      const fac = M[i][k] / M[k][k]
      const before = origZero[i].map((z, j) => z && Math.abs(M[i][j]) <= 1e-9)   // cases vides avant
      for (let j = k; j < N; j++) M[i][j] -= fac * M[k][j]
      g[i] -= fac * g[k]
      const created: number[] = []
      for (let j = 0; j < N; j++) if (before[j] && Math.abs(M[i][j]) > 1e-9 && j !== i) created.push(j)
      const eq = `${lbl(P[i])} ← ${lbl(P[i])} − (${f(fac)})·${lbl(P[k])}`
      const cr = ''
      steps.push({
        phase: 'elim', M: clone(M), g: g.slice(), fill: fillMask(),
        pivotRow: k, targetRow: i, solveRow: -1, elim: P.slice(0, k), pivotVar: P[k], msg: eq + cr,
      })
    }
  }

  // ── substitution arrière : x = (η − Σ)/diag = val, une composante par étape ──
  const U = clone(M), gf = g.slice(), y = Array(N).fill(0)
  const finalFill = fillMask()
  for (let i = N - 1; i >= 0; i--) {
    let s = gf[i]; let terms = ''
    for (let j = i + 1; j < N; j++) {
      if (Math.abs(U[i][j]) > 1e-9) { s -= U[i][j] * y[j]; terms += ` − (${f(U[i][j])})·${f(y[j])}` }
    }
    y[i] = s / U[i][i]
    const rhs = terms ? `(${f(gf[i])}${terms}) / ${f(U[i][i])}` : `${f(gf[i])} / ${f(U[i][i])}`
    steps.push({
      phase: 'back', M: clone(U), g: gf.slice(), fill: finalFill,
      pivotRow: -1, targetRow: -1, solveRow: i, elim: [...P], pivotVar: -1,
      msg: `x_${lbl(P[i])} = ${rhs} = ${f(y[i])}`,
    })
  }
  return { P, steps, y }
}

const orderMode = ref<'last' | 'first'>('last')
const step = ref(0)
const built = computed(() => buildSteps(orderMode.value))
const steps = computed(() => built.value.steps)
const LAST = computed(() => steps.value.length - 1)
const cur = computed(() => steps.value[step.value])
const P = computed(() => built.value.P)

const nSteps = (m: 'last' | 'first') => buildSteps(m).steps.length - 1
const stepsLast = nSteps('last')      // 7
const stepsFirst = nSteps('first')    // 10

function nextStep() { if (step.value < LAST.value) step.value++ }
function solveAll() { step.value = LAST.value }
function reset() { step.value = 0 }
function setMode(m: 'last' | 'first') { orderMode.value = m; step.value = 0 }

function xRevealed(r: number) { return cur.value.phase === 'back' && r >= cur.value.solveRow }

// ── Graphe (gauche) ───────────────────────────────────────────────
function nodePos(v: number): { x: number, y: number } {
  if (v < 3) return { x: 34 + v * 100, y: 56 }
  return { x: 134, y: 150 }
}
const graph = computed(() => {
  const c = cur.value, Pc = P.value
  const elimSet = new Set(c.phase === 'back' ? [0, 1, 2, 3] : c.elim)
  const piv = c.pivotVar
  const fillKeys = new Set<string>()
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (c.fill[i][j]) fillKeys.add(ek(Pc[i], Pc[j]))
  const keys = new Set<string>([ek(0, 3), ek(1, 3), ek(2, 3), ...fillKeys])
  const edges = [...keys].map(key => {
    const [a, b] = key.split(',').map(Number)
    const pa = nodePos(a), pb = nodePos(b)
    return { x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y, fill: fillKeys.has(key) }
  })
  const nodes = [0, 1, 2].map(i => ({ ...nodePos(i), label: `x${i}`, elim: elimSet.has(i), pivot: piv === i }))
  const amer = { ...nodePos(3), elim: elimSet.has(3), pivot: piv === 3 }
  return { edges, nodes, amer }
})

// ── Matrice (droite) ──────────────────────────────────────────────
const MX = 322, MY = 40, CS = 25
const cx = (j: number) => MX + j * CS
const cyy = (i: number) => MY + i * CS
function cellBg(i: number, j: number) {
  const c = cur.value
  if (c.phase === 'elim' && i === c.pivotRow && j === c.pivotRow) return '#FDE68A'  // pivot
  if (c.fill[i][j]) return '#FFE0CC'                                                // fill-in
  if (i === j) return '#e2e8f0'                                                     // diagonale
  if (Math.abs(c.M[i][j]) > 1e-9) return '#eef2ff'                                  // entrée présente
  return '#f8fafc'
}
function rowTint(i: number) {
  const c = cur.value
  if (c.phase === 'elim' && i === c.targetRow) return true   // ligne modifiée
  if (c.phase === 'back' && i === c.solveRow) return true    // ligne résolue
  return false
}
function pcol(i: number) { return P.value[i] < 3 ? '#475569' : '#00BDF2' }
</script>

<template>
  <div class="ef-wrap">
    <svg viewBox="0 0 558 215" class="ef-svg">

      <!-- ══════ GAUCHE : graphe ══════ -->
      <rect x="2" y="2" width="286" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="145" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Graphe — ℓ (amer) vu par toutes les poses
      </text>

      <line v-for="(e, i) in graph.edges" :key="`e${i}`"
        :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
        :stroke="e.fill ? '#F15A22' : '#94a3b8'" :stroke-width="e.fill ? 1.9 : 1.2"
        :stroke-dasharray="e.fill ? '4,2' : 'none'"/>

      <g v-for="(p, i) in graph.nodes" :key="`p${i}`">
        <circle :cx="p.x" :cy="p.y" r="12" :fill="p.elim ? '#cbd5e1' : '#475569'"
          :stroke="p.pivot ? '#CF1C24' : 'white'" :stroke-width="p.pivot ? 3 : 2"/>
        <text :x="p.x" :y="p.y+4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">{{ p.label }}</text>
      </g>
      <circle :cx="graph.amer.x" :cy="graph.amer.y" r="11" :fill="graph.amer.elim ? '#bae6fd' : '#00BDF2'"
        :stroke="graph.amer.pivot ? '#CF1C24' : 'white'" :stroke-width="graph.amer.pivot ? 3 : 2"/>
      <text :x="graph.amer.x" :y="graph.amer.y+4" text-anchor="middle"
        style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">ℓ</text>

      <text x="145" y="180" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-family:sans-serif">
        <tspan fill="#94a3b8">▬</tspan> arête d'origine ·
        <tspan fill="#F15A22">▬</tspan> fill-in · anneau rouge = pivot
      </text>
      <rect x="12" y="186" width="266" height="22" rx="4"
        :fill="stepsFirst>stepsLast ? '#fff7ed' : '#f0fdf4'" :stroke="stepsFirst>stepsLast ? '#fed7aa' : '#86efac'"/>
      <text x="145" y="200" text-anchor="middle" style="font-size:7.5px;fill:#475569;font-family:monospace">
        étapes pour résoudre — ℓ dernier <tspan fill="#25B34B" font-weight="700">{{ stepsLast }}</tspan>
        vs ℓ premier <tspan fill="#F15A22" font-weight="700">{{ stepsFirst }}</tspan>
      </text>

      <!-- ══════ DROITE : système Λx = η → x ══════ -->
      <rect x="292" y="2" width="264" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="424" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Élimination de Λx = η  →  x
      </text>

      <g v-for="j in N" :key="`h${j}`">
        <text :x="cx(j-1)+ (CS-2)/2" :y="MY-4" text-anchor="middle"
          :style="`font-size:6.5px;font-weight:700;font-family:sans-serif;fill:${pcol(j-1)}`">{{ lbl(P[j-1]) }}</text>
      </g>
      <text :x="440" :y="MY-4" text-anchor="middle" style="font-size:7.5px;fill:#0f766e;font-weight:700;font-family:serif">η</text>
      <text :x="470" :y="MY-4" text-anchor="middle" style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:serif">x</text>

      <g v-for="i in N" :key="`row${i}`">
        <!-- surlignage de la ligne active -->
        <rect v-if="rowTint(i-1)" :x="MX-2" :y="cyy(i-1)-1.5" :width="4*CS+58" :height="CS-1"
          rx="2" fill="none" stroke="#F59E0B" stroke-width="1.2" stroke-dasharray="3,2"/>
        <text :x="MX-5" :y="cyy(i-1)+(CS-2)/2+2.5" text-anchor="end"
          :style="`font-size:6.5px;font-weight:700;font-family:sans-serif;fill:${pcol(i-1)}`">{{ lbl(P[i-1]) }}</text>
        <g v-for="j in N" :key="`c${i}_${j}`">
          <rect :x="cx(j-1)" :y="cyy(i-1)" :width="CS-2" :height="CS-2" rx="1.5"
            :fill="cellBg(i-1,j-1)"
            :stroke="cur.phase==='elim' && (i-1)===cur.pivotRow && (j-1)===cur.pivotRow ? '#F59E0B' : 'none'" :stroke-width="1.5"/>
          <text v-if="Math.abs(cur.M[i-1][j-1])>1e-9"
            :x="cx(j-1)+(CS-2)/2" :y="cyy(i-1)+(CS-2)/2+3" text-anchor="middle"
            :style="`font-size:7.5px;font-weight:700;font-family:monospace;fill:${cur.fill[i-1][j-1] ? '#C2410C' : '#334155'}`">{{ f(cur.M[i-1][j-1]) }}</text>
        </g>
        <rect :x="428" :y="cyy(i-1)" :width="CS-2" :height="CS-2" rx="1.5" fill="#ccfbf1" stroke="#5eead4" stroke-width="0.8"/>
        <text :x="428+(CS-2)/2" :y="cyy(i-1)+(CS-2)/2+3" text-anchor="middle"
          style="font-size:7.5px;font-weight:700;font-family:monospace;fill:#0f766e">{{ f(cur.g[i-1]) }}</text>
        <rect :x="458" :y="cyy(i-1)" :width="CS-2" :height="CS-2" rx="1.5"
          :fill="xRevealed(i-1) ? '#dcfce7' : '#f1f5f9'"
          :stroke="cur.phase==='back' && cur.solveRow===(i-1) ? '#F59E0B' : (xRevealed(i-1) ? '#86efac' : '#e2e8f0')" :stroke-width="cur.phase==='back' && cur.solveRow===(i-1)?1.5:0.8"/>
        <text v-if="xRevealed(i-1)" :x="458+(CS-2)/2" :y="cyy(i-1)+(CS-2)/2+3" text-anchor="middle"
          style="font-size:8px;font-weight:700;font-family:monospace;fill:#15803d">{{ f(built.y[i-1]) }}</text>
      </g>
      <text x="420" :y="MY + 2*CS - 4" text-anchor="middle" style="font-size:11px;fill:#94a3b8;font-family:sans-serif">=</text>

      <!-- sous-équation de l'étape courante -->
      <rect x="300" y="150" width="250" height="58" rx="4"
        :fill="cur.phase==='back' ? '#f0fdf4' : (cur.phase==='elim' ? '#fffbeb' : '#fff')"
        :stroke="cur.phase==='back' ? '#bbf7d0' : (cur.phase==='elim' ? '#fde68a' : '#e2e8f0')"/>
      <text x="308" y="163" style="font-size:7px;fill:#94a3b8;font-family:sans-serif;font-style:italic">
        {{ cur.phase==='elim' ? 'Opération de ligne' : cur.phase==='back' ? 'Substitution arrière' : 'Système' }}
      </text>
      <foreignObject x="306" y="167" width="240" height="38">
        <div xmlns="http://www.w3.org/1999/xhtml"
          style="font-size:9.5px;color:#1e293b;font-family:monospace;font-weight:700;line-height:1.3">{{ cur.msg }}</div>
      </foreignObject>
    </svg>

    <!-- Contrôles -->
    <div class="ef-controls">
      <div class="ef-btns">
        <button :class="['ef-btn', orderMode==='last' && 'on']" @click="setMode('last')">ℓ en dernier</button>
        <button :class="['ef-btn', orderMode==='first' && 'on']" @click="setMode('first')">ℓ en premier</button>
      </div>
      <button class="ef-btn-main" @click="nextStep" :disabled="step >= LAST">▶ Étape ({{ step }}/{{ LAST }})</button>
      <button class="ef-btn-r2" @click="solveAll" :disabled="step >= LAST">⏩ Résoudre</button>
      <button class="ef-btn-r" @click="reset">↺</button>
      <span class="ef-info">Chaque étape = une sous-équation ; même x, fill-in différent selon l'ordre.</span>
    </div>
  </div>
</template>

<style scoped>
.ef-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ef-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ef-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ef-btns { display: flex; gap: 4px; }
.ef-btn {
  padding: 3px 9px; border-radius: 5px; cursor: pointer; font-size: 0.7rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.ef-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.ef-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.ef-btn-main:hover:not(:disabled) { background: #CF1C24; color: white; }
.ef-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }
.ef-btn-r2 {
  padding: 3px 9px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #25B34B; background: #f0fdf4; color: #15803d; font-weight: 700;
}
.ef-btn-r2:disabled { opacity: 0.4; cursor: not-allowed; }
.ef-btn-r {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b;
}
.ef-info { font-size: 0.66rem; color: #64748b; font-style: italic; }
</style>
