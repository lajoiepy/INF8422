<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Pourquoi l'inférence incrémentale est rapide : les mises à jour ──
// sont LOCALES. Une nouvelle pose (odométrie) ne change qu'un bloc de M ;
// une fermeture de boucle ne touche que la bande entre les 2 poses liées.
const MAXP = 8
const nPoses = ref(4)
const loops = ref<[number, number][]>([])

type Action = { type: 'pose' | 'loop' | null; cells: Set<string>; vars: number[] }
const last = ref<Action>({ type: null, cells: new Set(), vars: [] })

function addPose() {
  if (nPoses.value >= MAXP) return
  const k = nPoses.value          // nouvel index
  nPoses.value++
  last.value = {
    type: 'pose',
    cells: new Set([`${k},${k}`, `${k - 1},${k}`]),
    vars: [k - 1, k],
  }
}
function addLoop() {
  const k = nPoses.value - 1
  const j = Math.max(0, nPoses.value - 4)
  if (j >= k - 1) return
  if (loops.value.some(([a, b]) => a === j && b === k)) return
  loops.value = [...loops.value, [j, k]]
  const cells = new Set<string>()
  for (let a = j; a <= k; a++) for (let b = a; b <= k; b++) cells.add(`${a},${b}`)
  const vars = []
  for (let v = j; v <= k; v++) vars.push(v)
  last.value = { type: 'loop', cells, vars }
}
function reset() {
  nPoses.value = 4; loops.value = []
  last.value = { type: null, cells: new Set(), vars: [] }
}

// ── Structure creuse de M (triangulaire supérieure) ───────────────
const nz = computed(() => {
  const s = new Set<string>()
  const n = nPoses.value
  for (let i = 0; i < n; i++) s.add(`${i},${i}`)
  for (let i = 0; i < n - 1; i++) s.add(`${i},${i + 1}`)      // odométrie
  for (const [j, k] of loops.value) {
    s.add(`${j},${k}`)
    for (let a = j; a <= k; a++) for (let b = a + 1; b <= k; b++) s.add(`${a},${b}`) // fill bande
  }
  return s
})
function cellType(i: number, j: number): 'diag' | 'odom' | 'loop' | 'fill' | null {
  if (!nz.value.has(`${i},${j}`)) return null
  if (i === j) return 'diag'
  if (j === i + 1) return 'odom'
  for (const [lj, lk] of loops.value) if (i === lj && j === lk) return 'loop'
  return 'fill'
}
const cellColor = { diag: '#334155', odom: '#475569', loop: '#CF1C24', fill: '#F59E0B' }

const nnz = computed(() => nz.value.size)
const affectedCount = computed(() => last.value.vars.length)
const actionColor = computed(() => last.value.type === 'loop' ? '#F15A22' : '#25B34B')

// ── Layout graphe (gauche) ────────────────────────────────────────
const GY = 118
function poseX(i: number) { return 26 + i * (250 / Math.max(nPoses.value - 1, 1)) }
function loopArc(j: number, k: number): string {
  const x1 = poseX(j), x2 = poseX(k)
  const h = 26 + (k - j) * 9
  return `M ${x1} ${GY - 12} Q ${(x1 + x2) / 2} ${GY - 12 - h} ${x2} ${GY - 12}`
}

// ── Layout matrice M (droite) ─────────────────────────────────────
const MC = computed(() => Math.min(26, Math.floor(196 / nPoses.value)))
const MGX = 350, MGY = 44
function mx(j: number) { return MGX + j * MC.value }
function my(i: number) { return MGY + i * MC.value }
const gridIdx = computed(() => Array.from({ length: nPoses.value }, (_, i) => i))
</script>

<template>
  <div class="iu-wrap">
    <svg viewBox="0 0 558 255" class="iu-svg">

      <!-- ═══ PANNEAU GRAPHE (trajectoire) ═══ -->
      <rect x="2" y="2" width="300" height="251" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="152" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Trajectoire du robot (graphe de poses)
      </text>

      <!-- Arêtes d'odométrie -->
      <line v-for="i in nPoses-1" :key="`od${i}`"
        :x1="poseX(i-1)" :y1="GY" :x2="poseX(i)" :y2="GY"
        stroke="#475569" stroke-width="2" stroke-linecap="round"/>

      <!-- Fermetures de boucle (arcs) -->
      <path v-for="([j,k], i) in loops" :key="`lp${i}`"
        :d="loopArc(j,k)" fill="none" stroke="#CF1C24" stroke-width="1.8"
        stroke-dasharray="4,2" stroke-linecap="round"/>

      <!-- Poses -->
      <g v-for="i in gridIdx" :key="`p${i}`">
        <circle :cx="poseX(i)" :cy="GY" r="11"
          fill="#475569" stroke="white" stroke-width="2"
          :stroke-dasharray="last.vars.includes(i) ? '0' : '0'"/>
        <circle v-if="last.vars.includes(i)"
          :cx="poseX(i)" :cy="GY" r="14" fill="none"
          :stroke="actionColor" stroke-width="2"/>
        <text :x="poseX(i)" :y="GY+3.5" text-anchor="middle"
          style="font-size:7.5px;fill:white;font-weight:700;font-family:sans-serif">x{{ i }}</text>
      </g>

      <!-- Statut action -->
      <text x="152" y="188" text-anchor="middle"
        style="font-size:8px;font-weight:700;font-family:sans-serif" :fill="actionColor">
        {{ last.type === 'pose' ? 'Odométrie : mise à jour LOCALE (2 variables)'
         : last.type === 'loop' ? 'Fermeture de boucle : ' + affectedCount + ' variables recalculées'
         : 'Ajoutez des poses / fermetures de boucle' }}
      </text>
      <text x="152" y="203" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        cercle surligné = variable affectée par la dernière mise à jour
      </text>

      <!-- ═══ PANNEAU MATRICE M ═══ -->
      <rect x="306" y="2" width="300" height="251" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="431" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Facteur M (racine carrée d'information)
      </text>

      <!-- Fond -->
      <rect :x="MGX" :y="MGY" :width="nPoses*MC" :height="nPoses*MC" fill="#e2e8f0" rx="2"/>

      <!-- Cellules -->
      <template v-for="i in gridIdx" :key="`r${i}`">
        <template v-for="j in gridIdx" :key="`c${i}-${j}`">
          <rect v-if="cellType(i,j)"
            :x="mx(j)+0.6" :y="my(i)+0.6" :width="MC-1.2" :height="MC-1.2" rx="1.5"
            :fill="cellColor[cellType(i,j)!]" opacity="0.92"/>
          <rect v-if="last.cells.has(`${i},${j}`)"
            :x="mx(j)+0.6" :y="my(i)+0.6" :width="MC-1.2" :height="MC-1.2" rx="1.5"
            fill="none" :stroke="actionColor" stroke-width="2"/>
        </template>
      </template>

      <!-- Légende -->
      <rect x="314" y="222" width="9" height="9" rx="1" fill="#475569"/>
      <text x="326" y="230" style="font-size:6.5px;fill:#475569;font-weight:700;font-family:sans-serif">odom</text>
      <rect x="356" y="222" width="9" height="9" rx="1" fill="#CF1C24"/>
      <text x="368" y="230" style="font-size:6.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">boucle</text>
      <rect x="398" y="222" width="9" height="9" rx="1" fill="#F59E0B"/>
      <text x="410" y="230" style="font-size:6.5px;fill:#b45309;font-weight:700;font-family:sans-serif">fill-in</text>

      <text x="431" y="244" text-anchor="middle"
        style="font-size:7.5px;fill:#475569;font-family:monospace">
        {{ nPoses }} variables · {{ nnz }} non-zéros dans M
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="iu-controls">
      <button class="iu-btn iu-pose" @click="addPose" :disabled="nPoses >= MAXP">+ Pose (odométrie)</button>
      <button class="iu-btn iu-loop" @click="addLoop">+ Fermeture de boucle</button>
      <button class="iu-btn iu-reset" @click="reset">↺ Reset</button>
      <div class="iu-info">
        Incrémental = <b>local</b> : odométrie → 1 bloc ; boucle → bande.
        Jamais de refactorisation complète O(n³).
      </div>
    </div>
  </div>
</template>

<style scoped>
.iu-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.iu-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.iu-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.iu-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.iu-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.iu-btn.iu-pose { border-color: #25B34B; color: #15803d; background: #f0fdf4; }
.iu-btn.iu-pose:hover:not(:disabled) { background: #25B34B; color: white; }
.iu-btn.iu-loop { border-color: #F15A22; color: #c2410c; background: #fff7ed; }
.iu-btn.iu-loop:hover:not(:disabled) { background: #F15A22; color: white; }
.iu-btn.iu-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.iu-btn.iu-reset:hover { background: #94a3b8; color: white; }
.iu-info {
  font-size: 0.68rem; color: #64748b; font-style: italic; max-width: 45%;
  padding: 2px 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px;
}
</style>
