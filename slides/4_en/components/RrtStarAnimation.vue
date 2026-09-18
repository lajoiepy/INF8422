<script setup lang="ts">
import { computed, ref, shallowRef, triggerRef, watch } from 'vue'
import AnimationControls from './AnimationControls.vue'
import { useAnimationPlayer } from './useAnimationPlayer'
import { mulberry32 } from './rng'

type Pt = { x: number; y: number }
type Node = { id: number; x: number; y: number; parent: number; cost: number; children: number[] }
type Rect = { x: number; y: number; w: number; h: number }

// ── L'espace de configuration ─────────────────────────────────────────────
const OX = 10
const OY = 24
const W = 478
const H = 258
const START: Pt = { x: 18, y: 228 }
const GOAL: Pt = { x: 452, y: 32 }
const GOAL_RADIUS = 18
const MAX_STEP = 42
const MAX_ITER = 500

const OBSTACLES: Rect[] = [
  { x: 96, y: 0, w: 52, h: 158 },
  { x: 200, y: 108, w: 58, h: 150 },
  { x: 302, y: 0, w: 52, h: 140 },
  { x: 372, y: 186, w: 96, h: 44 },
  { x: 138, y: 196, w: 46, h: 36 },
]

// ── Géométrie ─────────────────────────────────────────────────────────────
const inObstacle = (p: Pt) =>
  OBSTACLES.some((o) => p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + o.h)

function collisionFree(a: Pt, b: Pt): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const n = Math.max(2, Math.ceil(d / 4))
  for (let i = 0; i <= n; i++) {
    const t = i / n
    if (inObstacle({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return false
  }
  return true
}

function steer(from: Pt, to: Pt, maxStep: number): Pt {
  const d = Math.hypot(to.x - from.x, to.y - from.y)
  if (d <= maxStep) return { x: to.x, y: to.y }
  return { x: from.x + ((to.x - from.x) / d) * maxStep, y: from.y + ((to.y - from.y) / d) * maxStep }
}

// ── Réglages exposés au présentateur ──────────────────────────────────────
const rewireRadius = ref(78)
const goalBias = ref(8) // en %
const rewireOn = ref(true)

// ── État de l'algorithme ──────────────────────────────────────────────────
type Phase = 'sample' | 'nearest' | 'steer' | 'collision' | 'parent' | 'rewire'
const PHASES: { id: Phase; n: string; label: string; detail: string }[] = [
  { id: 'sample', n: '1', label: 'Tirer x_rand', detail: 'Un point uniforme dans l’espace libre — ou le but lui-même, avec le biais choisi.' },
  { id: 'nearest', n: '2', label: 'Nœud le plus proche', detail: 'On cherche le nœud de l’arbre le plus proche de x_rand.' },
  { id: 'steer', n: '3', label: 'Avancer d’un pas', detail: 'On ne saute pas jusqu’à x_rand : on avance d’au plus un pas vers lui.' },
  { id: 'collision', n: '4', label: 'Tester la collision', detail: 'Si le segment traverse un obstacle, l’échantillon est rejeté et on recommence.' },
  { id: 'parent', n: '5', label: 'Choisir le parent', detail: 'Parmi les voisins dans le rayon, on retient celui qui minimise le coût total.' },
  { id: 'rewire', n: '6', label: 'Recâbler le voisinage', detail: 'Si passer par le nouveau nœud est moins cher, on rebranche les voisins sur lui.' },
]

const state = shallowRef(freshState())
const phase = ref<Phase>('sample')

function freshState() {
  return {
    rand: mulberry32(20260831),
    nodes: [{ id: 0, x: START.x, y: START.y, parent: -1, cost: 0, children: [] }] as Node[],
    rejected: [] as Pt[],
    iter: 0,
    goalNode: -1,
    bestCost: Infinity,
    history: [] as { i: number; c: number }[],
    // Ce qui est en cours d'examen, et qu'on met en évidence à l'écran
    xRand: null as Pt | null,
    biased: false,
    nearestId: -1,
    xNew: null as Pt | null,
    blocked: false,
    nearIds: [] as number[],
    chosenParent: -1,
    rewired: [] as { id: number; from: Pt; to: Pt }[],
  }
}

function reset() {
  state.value = freshState()
  phase.value = 'sample'
}

function nearestTo(p: Pt): number {
  const s = state.value
  let best = 0
  let bd = Infinity
  for (const n of s.nodes) {
    const d = (n.x - p.x) ** 2 + (n.y - p.y) ** 2
    if (d < bd) { bd = d; best = n.id }
  }
  return best
}

/** `a` est-il un ancêtre de `b` ? Garde-fou contre les cycles au recâblage. */
function isAncestor(a: number, b: number): boolean {
  const nodes = state.value.nodes
  let cur = b
  let hops = 0
  while (cur >= 0 && hops++ <= nodes.length) {
    if (cur === a) return true
    cur = nodes[cur].parent
  }
  return false
}

/** Recalcule le coût de tout le sous-arbre après un changement de parent. */
function updateSubtreeCost(root: number) {
  const nodes = state.value.nodes
  const stack = [root]
  let guard = 0
  while (stack.length && guard++ <= nodes.length * 4) {
    const id = stack.pop()!
    const n = nodes[id]
    const p = nodes[n.parent]
    n.cost = p.cost + Math.hypot(n.x - p.x, n.y - p.y)
    for (const c of n.children) stack.push(c)
  }
}

function noteBest() {
  const s = state.value
  let best = Infinity
  let id = -1
  for (const n of s.nodes) {
    if (Math.hypot(n.x - GOAL.x, n.y - GOAL.y) <= GOAL_RADIUS && n.cost < best) {
      best = n.cost
      id = n.id
    }
  }
  if (id >= 0 && best < s.bestCost - 1e-6) {
    s.bestCost = best
    s.goalNode = id
    s.history.push({ i: s.iter, c: best })
  }
}

/** Un battement = une micro-étape. C'est ce qui rend le tirage visible. */
function tick(): boolean {
  const s = state.value
  if (s.iter >= MAX_ITER) return false

  switch (phase.value) {
    case 'sample': {
      s.rewired = []
      s.nearIds = []
      s.chosenParent = -1
      s.blocked = false
      s.biased = s.rand() * 100 < goalBias.value
      s.xRand = s.biased
        ? { x: GOAL.x, y: GOAL.y }
        : { x: s.rand() * W, y: s.rand() * H }
      phase.value = 'nearest'
      break
    }
    case 'nearest': {
      s.nearestId = nearestTo(s.xRand!)
      phase.value = 'steer'
      break
    }
    case 'steer': {
      const from = s.nodes[s.nearestId]
      s.xNew = steer(from, s.xRand!, MAX_STEP)
      phase.value = 'collision'
      break
    }
    case 'collision': {
      const from = s.nodes[s.nearestId]
      if (!collisionFree(from, s.xNew!)) {
        s.blocked = true
        s.rejected.push(s.xRand!)
        s.iter++
        phase.value = 'sample'
      } else {
        phase.value = rewireOn.value ? 'parent' : 'rewire'
      }
      break
    }
    case 'parent': {
      // choose_parent : le voisinage entier est candidat, pas seulement le plus proche.
      const xn = s.xNew!
      s.nearIds = s.nodes
        .filter((n) => Math.hypot(n.x - xn.x, n.y - xn.y) <= rewireRadius.value)
        .map((n) => n.id)
      let bestId = s.nearestId
      let bestCost = s.nodes[s.nearestId].cost + Math.hypot(xn.x - s.nodes[s.nearestId].x, xn.y - s.nodes[s.nearestId].y)
      for (const id of s.nearIds) {
        const n = s.nodes[id]
        const c = n.cost + Math.hypot(xn.x - n.x, xn.y - n.y)
        if (c < bestCost && collisionFree(n, xn)) { bestCost = c; bestId = id }
      }
      s.chosenParent = bestId
      phase.value = 'rewire'
      break
    }
    case 'rewire': {
      const xn = s.xNew!
      const parent = s.chosenParent >= 0 ? s.chosenParent : s.nearestId
      const node: Node = {
        id: s.nodes.length,
        x: xn.x,
        y: xn.y,
        parent,
        cost: s.nodes[parent].cost + Math.hypot(xn.x - s.nodes[parent].x, xn.y - s.nodes[parent].y),
        children: [],
      }
      s.nodes.push(node)
      s.nodes[parent].children.push(node.id)

      if (rewireOn.value) {
        for (const id of s.nearIds) {
          if (id === parent || id === node.id) continue
          const n = s.nodes[id]
          const through = node.cost + Math.hypot(n.x - node.x, n.y - node.y)
          if (through >= n.cost - 1e-6) continue
          // Rebrancher un ancêtre du nouveau nœud sur lui fermerait un cycle.
          if (isAncestor(id, node.id)) continue
          if (!collisionFree(node, n)) continue

          const previous = s.nodes[n.parent]
          s.rewired.push({ id, from: { x: n.x, y: n.y }, to: { x: previous.x, y: previous.y } })
          previous.children = previous.children.filter((c) => c !== id)
          n.parent = node.id
          node.children.push(id)
          // Le gain se propage à tout le sous-arbre, pas seulement au voisin.
          updateSubtreeCost(id)
        }
      }
      noteBest()
      s.iter++
      phase.value = 'sample'
      break
    }
  }
  triggerRef(state)
  return s.iter < MAX_ITER
}

const player = useAnimationPlayer({ tick, reset, intervalMs: 30, initialSpeed: 6 })
watch([rewireOn, rewireRadius, goalBias], ([r], [oldR]) => {
  // Changer de mode change l'algorithme : on repart proprement.
  if (r !== oldR) player.restart()
})

// ── Rendu ─────────────────────────────────────────────────────────────────
const px = (x: number) => OX + x
const py = (y: number) => OY + y
// Alias direct sur la ref : passer par `computed(() => state.value)` renverrait
// toujours le même objet, et Vue supprime la notification quand la valeur ne
// change pas d'identité — la télémétrie resterait figée sur l'état initial.
const s = state

const edges = computed(() =>
  s.value.nodes.filter((n) => n.parent >= 0).map((n) => {
    const p = s.value.nodes[n.parent]
    return { id: n.id, x1: px(p.x), y1: py(p.y), x2: px(n.x), y2: py(n.y) }
  }),
)

const bestPath = computed(() => {
  const st = s.value
  if (st.goalNode < 0) return ''
  const pts: string[] = []
  let cur = st.goalNode
  let hops = 0
  while (cur >= 0 && hops++ <= st.nodes.length) {
    pts.push(`${px(st.nodes[cur].x)},${py(st.nodes[cur].y)}`)
    cur = st.nodes[cur].parent
  }
  return pts.join(' ')
})

/** Courbe coût-vs-itération : l'optimalité asymptotique, rendue visible. */
const costCurve = computed(() => {
  const h = s.value.history
  if (!h.length) return ''
  const x0 = 576
  const x1 = 748
  const y0 = 46
  const y1 = 116
  const cMax = h[0].c
  const cMin = Math.min(...h.map((p) => p.c)) * 0.95
  const pts: string[] = []
  let prevY = 0
  h.forEach((p, k) => {
    const x = x0 + (p.i / MAX_ITER) * (x1 - x0)
    const y = y1 - ((p.c - cMin) / Math.max(1, cMax - cMin)) * (y1 - y0)
    if (k > 0) pts.push(`${x.toFixed(1)},${prevY.toFixed(1)}`) // marches d'escalier
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    prevY = y
  })
  pts.push(`${x1},${prevY.toFixed(1)}`)
  return pts.join(' ')
})

const activePhaseIdx = computed(() => PHASES.findIndex((p) => p.id === phase.value))
const stats = computed(() =>
  `itér. ${s.value.iter}/${MAX_ITER} · ${s.value.nodes.length} nœuds · `
  + `${s.value.rejected.length} rejets · coût ${s.value.bestCost === Infinity ? '—' : s.value.bestCost.toFixed(0)}`,
)
const caption = computed(() => {
  if (s.value.blocked) return 'Segment en collision : l’échantillon est rejeté (× pâle) et on retire au hasard.'
  return PHASES[activePhaseIdx.value]?.detail ?? ''
})
</script>

<template>
  <div class="anim-wrap">
    <svg viewBox="0 0 760 298" class="anim-svg" role="img"
         aria-label="RRT* tire des échantillons aléatoires, étend l'arbre et le recâble pour faire baisser le coût">
      <!-- ── Espace de configuration ──────────────────────────────────── -->
      <rect x="2" y="6" width="500" height="286" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="252" y="20" text-anchor="middle" class="panel-title">
        {{ rewireOn ? 'RRT* : choix du parent et recâblage' : 'RRT : on garde le premier parent venu' }}
      </text>

      <rect v-for="(o, i) in OBSTACLES" :key="`o${i}`" :x="px(o.x)" :y="py(o.y)"
            :width="o.w" :height="o.h" fill="#334155" rx="2" />

      <!-- Le nuage des rejets : c'est lui qui montre comment l'espace est fouillé -->
      <g stroke="#cbd5e1" stroke-width="1.1">
        <g v-for="(r, i) in s.rejected" :key="`x${i}`">
          <line :x1="px(r.x) - 2.6" :y1="py(r.y) - 2.6" :x2="px(r.x) + 2.6" :y2="py(r.y) + 2.6" />
          <line :x1="px(r.x) - 2.6" :y1="py(r.y) + 2.6" :x2="px(r.x) + 2.6" :y2="py(r.y) - 2.6" />
        </g>
      </g>

      <g stroke="#94a3b8" stroke-width="1.1">
        <line v-for="e in edges" :key="`e${e.id}`" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" />
      </g>
      <g fill="#64748b">
        <circle v-for="n in s.nodes" :key="`n${n.id}`" :cx="px(n.x)" :cy="py(n.y)" r="1.7" />
      </g>

      <polyline v-if="bestPath" :points="bestPath" fill="none" stroke="#25b34b"
                stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.95" />

      <!-- Voisinage examiné pendant le choix du parent / le recâblage -->
      <circle v-if="s.xNew && (phase === 'parent' || phase === 'rewire') && rewireOn"
              :cx="px(s.xNew.x)" :cy="py(s.xNew.y)" :r="rewireRadius"
              fill="#00bdf2" fill-opacity="0.07" stroke="#00bdf2" stroke-width="1.2" stroke-dasharray="4 3" />
      <g v-if="phase === 'rewire' && rewireOn" stroke="#00bdf2" stroke-width="1" stroke-dasharray="3 3">
        <line v-for="id in s.nearIds" :key="`nb${id}`"
              :x1="px(s.xNew!.x)" :y1="py(s.xNew!.y)" :x2="px(s.nodes[id].x)" :y2="py(s.nodes[id].y)" />
      </g>
      <g v-if="s.rewired.length" stroke="#cf1c24" stroke-width="2.2" stroke-dasharray="5 4" class="flash">
        <line v-for="(w, i) in s.rewired" :key="`rw${i}`"
              :x1="px(w.from.x)" :y1="py(w.from.y)" :x2="px(w.to.x)" :y2="py(w.to.y)" />
      </g>

      <!-- L'échantillon en cours d'examen -->
      <g v-if="s.xRand">
        <circle :cx="px(s.xRand.x)" :cy="py(s.xRand.y)" r="6.5" fill="none"
                :stroke="s.biased ? '#cf1c24' : '#00bdf2'" stroke-width="2.2" />
        <text v-if="s.biased" :x="px(s.xRand.x) + 10" :y="py(s.xRand.y) - 8" class="tag-bias">biais vers le but</text>
      </g>
      <line v-if="s.xRand && s.nearestId >= 0 && phase !== 'sample'"
            :x1="px(s.nodes[s.nearestId].x)" :y1="py(s.nodes[s.nearestId].y)"
            :x2="px(s.xRand.x)" :y2="py(s.xRand.y)"
            stroke="#00bdf2" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.7" />
      <line v-if="s.xNew && s.nearestId >= 0 && phase !== 'sample' && phase !== 'nearest'"
            :x1="px(s.nodes[s.nearestId].x)" :y1="py(s.nodes[s.nearestId].y)"
            :x2="px(s.xNew.x)" :y2="py(s.xNew.y)"
            :stroke="s.blocked ? '#cf1c24' : '#f15a22'" stroke-width="3" />
      <circle v-if="s.xNew && phase !== 'sample' && phase !== 'nearest'"
              :cx="px(s.xNew.x)" :cy="py(s.xNew.y)" r="4"
              :fill="s.blocked ? '#cf1c24' : '#f15a22'" />

      <circle :cx="px(GOAL.x)" :cy="py(GOAL.y)" :r="GOAL_RADIUS" fill="none"
              stroke="#25b34b" stroke-width="1.6" stroke-dasharray="4 3" />
      <circle :cx="px(GOAL.x)" :cy="py(GOAL.y)" r="6" fill="white" stroke="#25b34b" stroke-width="3" />
      <circle :cx="px(START.x)" :cy="py(START.y)" r="6" fill="#333" />

      <!-- ── Coût de la meilleure solution ────────────────────────────── -->
      <rect x="510" y="6" width="246" height="120" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="633" y="20" text-anchor="middle" class="panel-title">Coût de la meilleure solution</text>
      <line x1="576" y1="116" x2="748" y2="116" stroke="#cbd5e1" stroke-width="1" />
      <line x1="576" y1="42" x2="576" y2="116" stroke="#cbd5e1" stroke-width="1" />
      <text x="572" y="124" text-anchor="end" class="axis">0</text>
      <text x="748" y="124" text-anchor="end" class="axis">{{ MAX_ITER }} itér.</text>
      <polyline v-if="costCurve" :points="costCurve" fill="none" stroke="#25b34b" stroke-width="2.2" />
      <text v-if="!costCurve" x="662" y="82" text-anchor="middle" class="hint">aucune solution pour l’instant</text>
      <text v-else x="748" y="38" text-anchor="end" class="cost-val">{{ s.bestCost.toFixed(0) }}</text>

      <!-- ── Les six micro-étapes ─────────────────────────────────────── -->
      <rect x="510" y="134" width="246" height="158" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="633" y="148" text-anchor="middle" class="panel-title">Une itération, étape par étape</text>
      <g v-for="(p, k) in PHASES" :key="p.id">
        <rect x="518" :y="155 + k * 22" width="230" height="19" rx="4"
              :fill="k === activePhaseIdx ? '#cf1c24' : 'white'"
              :stroke="k === activePhaseIdx ? '#cf1c24' : '#e2e8f0'" stroke-width="1" />
        <circle :cx="530" :cy="164.5 + k * 22" r="6.5"
                :fill="k === activePhaseIdx ? 'white' : '#e2e8f0'" />
        <text :x="530" :y="168 + k * 22" text-anchor="middle" class="pip"
              :fill="k === activePhaseIdx ? '#cf1c24' : '#94a3b8'">{{ p.n }}</text>
        <text :x="545" :y="168 + k * 22" class="phase-label"
              :fill="k === activePhaseIdx ? 'white' : '#64748b'"
              :style="{ opacity: !rewireOn && k >= 4 ? 0.35 : 1 }">{{ p.label }}</text>
      </g>
    </svg>

    <AnimationControls
      :playing="player.playing.value" :done="player.done.value" :speed="player.speed.value"
      :stats="stats" :caption="caption" play-label="Échantillonner" step-label="1 étape"
      @toggle="player.toggle" @step="player.stepOnce" @reset="player.restart"
      @update:speed="player.speed.value = $event"
    >
      <label class="anim-sl">
        rayon <strong>{{ rewireRadius }}</strong>
        <input type="range" min="45" max="140" step="5" v-model.number="rewireRadius"
               @click.stop @pointerdown.stop @keydown.stop>
      </label>
      <label class="anim-sl">
        biais but <strong>{{ goalBias }} %</strong>
        <input type="range" min="0" max="25" step="1" v-model.number="goalBias"
               @click.stop @pointerdown.stop @keydown.stop>
      </label>
      <button class="anim-btn" :class="{ on: rewireOn }" @click.stop="rewireOn = !rewireOn">
        {{ rewireOn ? 'RRT*' : 'RRT' }}
      </button>
    </AnimationControls>
  </div>
</template>

<style scoped>
/*
  `.anim-wrap` est en `height: 100%` du bloc de contenu de la diapo, mais il
  commence sous le titre : il déborde donc toujours de la hauteur du <h1>, et
  les contrôles finissent sous le bord de la diapo. Ici on laisse plutôt le
  rapport d'aspect du viewBox donner sa hauteur au SVG, et le tout se replie
  naturellement au-dessus des boutons.
*/
.anim-wrap { height: auto; }
.anim-svg { flex: none; height: auto; aspect-ratio: 760 / 298; }
.panel-title { font-size: 9px; fill: #64748b; font-weight: 700; }
.axis { font-size: 8px; fill: #94a3b8; }
.hint { font-size: 9px; fill: #94a3b8; font-style: italic; }
.cost-val { font-size: 15px; font-weight: 800; fill: #25b34b; font-family: ui-monospace, Menlo, monospace; }
.pip { font-size: 8.5px; font-weight: 800; font-family: ui-monospace, Menlo, monospace; }
.phase-label { font-size: 10px; font-weight: 600; }
.tag-bias { font-size: 9px; fill: #cf1c24; font-weight: 700; }
.flash { animation: flash 0.4s ease both; }
@keyframes flash { from { opacity: 1; } to { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .flash { animation: none; } }
</style>
