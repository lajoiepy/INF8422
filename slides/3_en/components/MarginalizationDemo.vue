<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, onActivated } from 'vue'

// ── Concept : marginaliser un landmark densifie le graphe de poses ──
// L est vu par les 4 poses. Le marginaliser le retire, mais couple
// TOUTES ses voisines → les poses forment une clique (fill-in), et le
// bloc pose–pose de la matrice d'information Λ devient dense.

// Transition t = 0 (avant) → 1 (après marginalisation)
const t = ref(0)
let raf: number | null = null
function marginalize() {
  if (raf) cancelAnimationFrame(raf)
  const start = performance.now(), dur = 900, t0 = t.value
  function step(now: number) {
    const p = Math.min((now - start) / dur, 1)
    t.value = t0 + (1 - t0) * (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p)
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
function reset() { if (raf) cancelAnimationFrame(raf); t.value = 0 }
// État par défaut = « avant » (mesures + matrice Λ complète visibles).
// Slidev garde les slides montées (<KeepAlive>) : on réinitialise donc
// à chaque (ré)affichage pour ne pas rester bloqué sur t=1 après un clic.
onMounted(reset)
onActivated(reset)
onUnmounted(() => { if (raf) cancelAnimationFrame(raf) })

const fadeOut = computed(() => 1 - t.value)
const fadeIn = computed(() => t.value)

// ── Graphe (panneau gauche) : 4 poses en carré + L au centre ──────
const nodes = {
  x0: { x: 72, y: 48, label: 'x0' },
  x1: { x: 205, y: 48, label: 'x1' },
  x2: { x: 205, y: 150, label: 'x2' },
  x3: { x: 72, y: 150, label: 'x3' },
} as const
const L = { x: 138, y: 99 }

// Arêtes existantes : chaîne d'odométrie (open chain x0-x1-x2-x3)
const chainEdges = [['x0', 'x1'], ['x1', 'x2'], ['x2', 'x3']] as const
// Arêtes de mesure vers L
const Lposes = ['x0', 'x1', 'x2', 'x3'] as const
// Arêtes de fill-in créées par la marginalisation (complètent le K4)
const fillEdges = [['x0', 'x2'], ['x1', 'x3'], ['x0', 'x3']] as const

// ── Matrice d'information Λ (panneau droit) ───────────────────────
// Ordre des variables : x0, x1, x2, x3, L (index 0..4)
const MC = 26, MGX = 372, MGY = 48
function mx(j: number) { return MGX + j * MC }
function my(i: number) { return MGY + i * MC }

type MType = 'diag' | 'chain' | 'meas' | 'fill'
const mColor: Record<MType, string> = {
  diag: '#334155', chain: '#475569', meas: '#00BDF2', fill: '#F59E0B',
}
type MCell = { i: number; j: number; type: MType }
const matCells: MCell[] = (() => {
  const cells: MCell[] = []
  for (let i = 0; i < 5; i++) cells.push({ i, j: i, type: 'diag' })
  const sym = (a: number, b: number, ty: MType) => { cells.push({ i: a, j: b, type: ty }); cells.push({ i: b, j: a, type: ty }) }
  sym(0, 1, 'chain'); sym(1, 2, 'chain'); sym(2, 3, 'chain')
  sym(0, 4, 'meas'); sym(1, 4, 'meas'); sym(2, 4, 'meas'); sym(3, 4, 'meas')
  sym(0, 2, 'fill'); sym(1, 3, 'fill'); sym(0, 3, 'fill')
  return cells
})()
function cellOpacity(c: MCell): number {
  if (c.type === 'meas') return fadeOut.value        // ligne/col L disparaît
  if (c.type === 'fill') return fadeIn.value          // fill-in apparaît
  return 1
}

// Compteurs
const poseNnzBefore = 4 + 2 * 3   // diag(4) + chaîne(3 paires ×2)
const poseNnzAfter = 4 + 2 * 6    // bloc 4×4 dense
const poseNnz = computed(() => t.value < 0.5 ? poseNnzBefore : poseNnzAfter)
const varLabels = ['x0', 'x1', 'x2', 'x3', 'L']
</script>

<template>
  <div class="mg-wrap">
    <svg viewBox="0 0 558 215" class="mg-svg">

      <!-- ═══ PANNEAU GRAPHE ═══ -->
      <rect x="2" y="2" width="300" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="152" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#475569;font-weight:700;font-family:sans-serif">
        {{ t < 0.5 ? 'Graphe : L vu par les 4 poses' : 'L marginalisé → poses en clique' }}
      </text>

      <!-- Arêtes chaîne (existantes) -->
      <line v-for="(e, i) in chainEdges" :key="`ch${i}`"
        :x1="nodes[e[0]].x" :y1="nodes[e[0]].y" :x2="nodes[e[1]].x" :y2="nodes[e[1]].y"
        stroke="#475569" stroke-width="2" stroke-linecap="round"/>

      <!-- Arêtes de mesure vers L (disparaissent) -->
      <!-- NB: on passe l'opacité via `:style` et non `:opacity`. L'attribut SVG
      `opacity` est capté par l'attributify d'UnoCSS (règle [opacity~="0.8"] →
      opacity:0.008), ce qui écrase la présentation et rend l'élément invisible. -->
      <line v-for="(p, i) in Lposes" :key="`Le${i}`"
        :x1="nodes[p].x" :y1="nodes[p].y" :x2="L.x" :y2="L.y"
        stroke="#00BDF2" stroke-width="1.3" stroke-dasharray="3,2" :style="{ opacity: fadeOut * 0.8 }"/>

      <!-- Arêtes de fill-in (apparaissent, or) -->
      <line v-for="(e, i) in fillEdges" :key="`fe${i}`"
        :x1="nodes[e[0]].x" :y1="nodes[e[0]].y" :x2="nodes[e[1]].x" :y2="nodes[e[1]].y"
        stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" :style="{ opacity: fadeIn }"/>

      <!-- Landmark L (disparaît) -->
      <g :style="{ opacity: 0.12 + 0.88 * fadeOut }">
        <circle :cx="L.x" :cy="L.y" r="12" fill="#00BDF2" stroke="white" stroke-width="2"/>
        <text :x="L.x" :y="L.y+4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">L</text>
      </g>

      <!-- Poses -->
      <g v-for="(n, key) in nodes" :key="key">
        <circle :cx="n.x" :cy="n.y" r="13" fill="#475569" stroke="white" stroke-width="2.5"/>
        <text :x="n.x" :y="n.y+4" text-anchor="middle"
          style="font-size:8px;fill:white;font-weight:700;font-family:sans-serif">{{ n.label }}</text>
      </g>

      <!-- Légende + statut -->
      <line x1="12" y1="192" x2="26" y2="192" stroke="#475569" stroke-width="2"/>
      <text x="30" y="195" style="font-size:6.5px;fill:#475569;font-weight:700;font-family:sans-serif">odométrie</text>
      <line x1="78" y1="192" x2="92" y2="192" stroke="#00BDF2" stroke-width="1.3" stroke-dasharray="3,2"/>
      <text x="96" y="195" style="font-size:6.5px;fill:#00BDF2;font-weight:700;font-family:sans-serif">mesure L</text>
      <line x1="146" y1="192" x2="160" y2="192" stroke="#F59E0B" stroke-width="2.2"/>
      <text x="164" y="195" style="font-size:6.5px;fill:#b45309;font-weight:700;font-family:sans-serif">fill-in</text>
      <text x="152" y="207" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        arêtes poses : {{ t < 0.5 ? 3 : 6 }} / 6 (clique K4)
      </text>

      <!-- ═══ PANNEAU MATRICE Λ ═══ -->
      <rect x="306" y="2" width="250" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="431" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Matrice d'information Λ = AᵀA
      </text>

      <!-- En-têtes -->
      <text v-for="(lbl, j) in varLabels" :key="`ch${j}`"
        :x="mx(j)+MC/2" :y="MGY-4" text-anchor="middle"
        style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">{{ lbl }}</text>
      <text v-for="(lbl, i) in varLabels" :key="`rh${i}`"
        :x="MGX-5" :y="my(i)+MC/2+3" text-anchor="end"
        style="font-size:7px;fill:#475569;font-weight:700;font-family:sans-serif">{{ lbl }}</text>

      <!-- Fond de grille -->
      <rect :x="MGX" :y="MGY" :width="5*MC" :height="5*MC" fill="#e2e8f0" rx="2"/>
      <g v-for="i in 5" :key="`gr${i}`">
        <rect v-for="j in 5" :key="`gc${i}-${j}`"
          :x="mx(j-1)+1" :y="my(i-1)+1" :width="MC-2" :height="MC-2" rx="1.5"
          fill="white" style="opacity:0.6"/>
      </g>

      <!-- Cellules non-nulles -->
      <rect v-for="(c, k) in matCells" :key="`mc${k}`"
        :x="mx(c.j)+1" :y="my(c.i)+1" :width="MC-2" :height="MC-2" rx="1.5"
        :fill="mColor[c.type]" :style="{ opacity: cellOpacity(c) * 0.92 }"/>

      <!-- Statut matrice -->
      <text x="431" y="192" text-anchor="middle"
        style="font-size:7.5px;fill:#475569;font-family:monospace">
        bloc poses : {{ poseNnz }} / 16 non-zéros
      </text>
      <text x="431" y="204" text-anchor="middle"
        style="font-size:7.5px;font-weight:700;font-family:sans-serif"
        :fill="t < 0.5 ? '#25B34B' : '#CF1C24'">
        {{ t < 0.5 ? 'creux ✓' : 'dense (fill-in) — sparsité perdue' }}
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="mg-controls">
      <button class="mg-btn" @click="marginalize" :disabled="t > 0.5">▶ Marginaliser L</button>
      <button class="mg-btn mg-reset" @click="reset">↺ Reset</button>
      <div class="mg-info">
        Marginaliser ≠ supprimer : retirer L <b>couple toutes ses voisines</b> →
        clique dans le graphe, bloc dense dans Λ (fill-in).
      </div>
    </div>
  </div>
</template>

<style scoped>
.mg-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.mg-svg  { height: 248px; width: auto; max-width: 100%; display: block; }

.mg-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mg-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
  font-weight: 700; transition: background 0.15s;
}
.mg-btn:hover:not(:disabled) { background: #CF1C24; color: white; }
.mg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.mg-btn.mg-reset { border-color: #94a3b8; color: #64748b; background: #f8fafc; }
.mg-info {
  font-size: 0.68rem; color: #64748b; font-style: italic; max-width: 60%;
  padding: 2px 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px;
}
</style>
