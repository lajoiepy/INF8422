<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, triggerRef, watch } from 'vue'
import AnimationControls from './AnimationControls.vue'
import { useAnimationPlayer } from './useAnimationPlayer'
import {
  FREE, INSCRIBED, LETHAL, OCCUPIED, UNKNOWN, castRay, clusterFrontiers, createAStar,
  frontiers, inflate, markRay, rasterize, type World,
} from './gridMap'

// ── Le monde, que le robot ne connaît pas encore ──────────────────────────
const WORLD: World = {
  w: 5.6, h: 3.2,
  rects: [
    { x: 0, y: 0, w: 5.6, h: 0.2 },
    { x: 0, y: 3.0, w: 5.6, h: 0.2 },
    { x: 0, y: 0, w: 0.2, h: 3.2 },
    { x: 5.4, y: 0, w: 0.2, h: 3.2 },
    { x: 1.75, y: 0.2, w: 0.2, h: 1.7 },
    { x: 3.5, y: 1.3, w: 0.2, h: 1.7 },
    { x: 2.5, y: 2.3, w: 0.6, h: 0.35 },
    { x: 4.4, y: 0.4, w: 0.5, h: 0.5 },
  ],
}
const RES = 0.08
const SCALE = 88
const OX = 16
const OY = 22

const truth = rasterize(WORLD, RES)
const COLS = truth.cols
const ROWS = truth.rows
const N = COLS * ROWS

const RANGE = 2.3
const HALF_FOV = (55 * Math.PI) / 180
const RAYS = 61
const ROBOT_RADIUS = 0.15
const STEP = RES // le robot avance d'une cellule par pas de commande

type Phase = 'sense' | 'frontiers' | 'choose' | 'plan' | 'drive'
const PHASES: { id: Phase; n: string; label: string }[] = [
  { id: 'sense', n: '1', label: 'Percevoir' },
  { id: 'frontiers', n: '2', label: 'Extraire les frontières' },
  { id: 'choose', n: '3', label: 'Choisir une cible' },
  { id: 'plan', n: '4', label: 'Planifier (A*)' },
  { id: 'drive', n: '5', label: 'Avancer' },
]

const showCostmap = ref(false)
const showFrontiers = ref(true)

const sim = shallowRef(fresh())
const mapUrl = ref('')
let canvas: HTMLCanvasElement | null = null

function fresh() {
  return {
    map: new Uint8Array(N),
    cost: new Uint8Array(N),
    pose: { x: 0.75, y: 2.55, th: 0 },
    path: [] as { x: number; y: number }[],
    goalCell: -1,
    frontierCells: [] as number[],
    clusters: [] as number[][],
    phase: 'sense' as Phase,
    replans: 0,
    distance: 0,
    invalidFlash: 0,
    blacklist: new Set<number>(),
    pathThreshold: INSCRIBED,
    stuck: 0,
    lastDistance: 0,
    steps: 0,
    finished: false,
  }
}

const cellCenter = (i: number) => ({ x: ((i % COLS) + 0.5) * RES, y: (Math.floor(i / COLS) + 0.5) * RES })

/** Le champ de vision : c'est exactement ce secteur qui est écrit dans la carte. */
function sense() {
  const s = sim.value
  for (let k = 0; k < RAYS; k++) {
    const a = s.pose.th - HALF_FOV + (2 * HALF_FOV * k) / (RAYS - 1)
    markRay(s.map, castRay(truth, s.pose.x, s.pose.y, a, RANGE))
  }
  // Le robot sait qu'il occupe une place libre.
  const here = Math.floor(s.pose.y / RES) * COLS + Math.floor(s.pose.x / RES)
  if (s.map[here] === UNKNOWN) s.map[here] = FREE
}

function refreshCostmap() {
  const s = sim.value
  s.cost = inflate(s.map, COLS, ROWS, {
    res: RES,
    inflationRadius: 0.34,
    inscribedRadius: ROBOT_RADIUS,
    costScale: 5,
    // Exploration optimiste : l'inconnu est présumé libre. C'est ce qui rend
    // la découverte possible — et la replanification nécessaire.
    unknownIsLethal: false,
  }).cost
}

function planTo(goal: number): { x: number; y: number }[] {
  const s = sim.value
  const start = Math.floor(s.pose.y / RES) * COLS + Math.floor(s.pose.x / RES)
  // On respecte d'abord l'inflation ; si le robot est déjà coincé dans une zone
  // inflatée, on retente en n'interdisant que les obstacles eux-mêmes.
  for (const threshold of [INSCRIBED, LETHAL]) {
    const search = createAStar(s.cost, COLS, ROWS, start, goal, {
      diagonal: true,
      costWeight: 6,
      lethalThreshold: threshold,
    })
    search.runToCompletion(20000)
    if (search.status === 'found') {
      s.pathThreshold = threshold
      return search.path.map(cellCenter)
    }
  }
  return []
}

/** Le chemin restant traverse-t-il quelque chose qu'on vient de découvrir ? */
function pathInvalid(): boolean {
  const s = sim.value
  // Les deux premiers points sont sous le robot : s'il est déjà au bord d'un
  // mur, les invalider en boucle l'empêcherait de repartir.
  return s.path.slice(2).some((p) => {
    const i = Math.floor(p.y / RES) * COLS + Math.floor(p.x / RES)
    // On valide contre le seuil qui a produit ce chemin : un chemin de secours,
    // accepté au ras du mur, ne doit pas être invalidé à la seconde suivante.
    return s.map[i] === OCCUPIED || s.cost[i] >= s.pathThreshold
  })
}

function pickGoal(): boolean {
  const s = sim.value
  s.frontierCells = frontiers(s.map, COLS, ROWS)
  s.clusters = clusterFrontiers(s.frontierCells, COLS, ROWS)
    .filter((g) => g.length >= 2)
    .sort((a, b) => score(b) - score(a))
  for (const g of s.clusters) {
    const target = g[Math.floor(g.length / 2)]
    if (s.blacklist.has(target)) continue
    const path = planTo(target)
    if (path.length > 1) {
      s.goalCell = target
      s.path = path
      return true
    }
    s.blacklist.add(target)
  }
  return false
}

/** Une frontière large et proche vaut mieux qu'une frontière étroite et lointaine. */
function score(group: number[]): number {
  const s = sim.value
  const c = cellCenter(group[Math.floor(group.length / 2)])
  const d = Math.hypot(c.x - s.pose.x, c.y - s.pose.y)
  return group.length / (d + 0.6)
}

function tick(): boolean {
  const s = sim.value
  if (s.finished || s.steps > 4000) return false
  s.steps++
  if (s.invalidFlash > 0) s.invalidFlash--

  // 1. Percevoir, à chaque pas de commande.
  s.phase = 'sense'
  sense()
  refreshCostmap()

  // 2-3-4. Replanifier si le chemin courant n'est plus valide, ou s'il n'y en a pas.
  if (!s.path.length || pathInvalid()) {
    if (s.path.length) {
      s.replans++
      s.invalidFlash = 22
      // Replanifier sans jamais avancer : la cible est en pratique inatteignable.
      if (s.distance <= s.lastDistance + 1e-6) {
        if (++s.stuck > 8 && s.goalCell >= 0) {
          s.blacklist.add(s.goalCell)
          s.stuck = 0
        }
      } else {
        s.stuck = 0
      }
      s.lastDistance = s.distance
    }
    s.phase = 'frontiers'
    s.path = []
    if (!pickGoal()) {
      s.finished = true
      s.frontierCells = frontiers(s.map, COLS, ROWS)
      paint()
      return false
    }
    s.phase = 'plan'
    paint()
    return true
  }

  // 5. Avancer d'un pas le long du chemin, cap tangent à la trajectoire.
  s.phase = 'drive'
  const next = s.path[1] ?? s.path[0]
  // Filet de sécurité : on n'entre jamais dans une cellule vue occupée.
  const nextCell = Math.floor(next.y / RES) * COLS + Math.floor(next.x / RES)
  if (s.map[nextCell] === OCCUPIED) {
    s.path = []
    s.replans++
    s.invalidFlash = 22
    paint()
    return true
  }
  const dx = next.x - s.pose.x
  const dy = next.y - s.pose.y
  const d = Math.hypot(dx, dy)
  const target = Math.atan2(dy, dx)
  let dth = target - s.pose.th
  while (dth > Math.PI) dth -= 2 * Math.PI
  while (dth < -Math.PI) dth += 2 * Math.PI
  // On tourne d'abord, on avance ensuite : un cap qui ment fausserait le cône.
  const MAX_TURN = 0.28
  if (Math.abs(dth) > MAX_TURN) {
    s.pose.th += Math.sign(dth) * MAX_TURN
    paint()
    return true
  }
  s.pose.th = target
  const move = Math.min(STEP, d)
  s.pose.x += (dx / d) * move
  s.pose.y += (dy / d) * move
  s.distance += move
  if (d - move < 1e-3) s.path.shift()
  if (s.path.length <= 1) s.path = []
  paint()
  return true
}

function reset() {
  sim.value = fresh()
  sense()
  refreshCostmap()
  pickGoal()
  paint()
}

// ── Rendu de la carte ─────────────────────────────────────────────────────
function paint() {
  if (!canvas) return
  canvas.width = COLS
  canvas.height = ROWS
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(COLS, ROWS)
  const s = sim.value
  for (let i = 0; i < N; i++) {
    let r = 203
    let g = 213
    let b = 225
    if (showCostmap.value && s.map[i] === FREE) {
      const v = s.cost[i]
      const t = Math.min(1, v / 252)
      r = Math.round(255 - t * 14)
      g = Math.round(255 - t * 165)
      b = Math.round(255 - t * 221)
    } else if (s.map[i] === FREE) { r = 255; g = 255; b = 255 }
    else if (s.map[i] === OCCUPIED) { r = 51; g = 51; b = 51 }
    const o = i * 4
    img.data[o] = r
    img.data[o + 1] = g
    img.data[o + 2] = b
    img.data[o + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  mapUrl.value = canvas.toDataURL()
  triggerRef(sim)
}

const player = useAnimationPlayer({ tick, reset, intervalMs: 30, initialSpeed: 2 })
watch([showCostmap, showFrontiers], paint)
onMounted(() => { canvas = document.createElement('canvas'); reset() })

// ── Géométrie d'affichage ─────────────────────────────────────────────────
const px = (x: number) => OX + x * SCALE
const py = (y: number) => OY + y * SCALE
const s = sim

/** Un vrai secteur circulaire : le dessin correspond au calcul, à l'arc près. */
const conePath = computed(() => {
  const p = s.value.pose
  const r = RANGE * SCALE
  const a0 = p.th - HALF_FOV
  const a1 = p.th + HALF_FOV
  const x0 = px(p.x) + r * Math.cos(a0)
  const y0 = py(p.y) + r * Math.sin(a0)
  const x1 = px(p.x) + r * Math.cos(a1)
  const y1 = py(p.y) + r * Math.sin(a1)
  return `M${px(p.x)},${py(p.y)} L${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Z`
})

const pathLine = computed(() =>
  s.value.path.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' '),
)
const coverage = computed(() => {
  const m = s.value.map
  let k = 0
  for (let i = 0; i < N; i++) if (m[i] !== UNKNOWN) k++
  return (100 * k) / N
})
const activePhaseIdx = computed(() => PHASES.findIndex((p) => p.id === s.value.phase))
const stats = computed(() =>
  `${coverage.value.toFixed(0)} % exploré · ${s.value.clusters.length} frontières · `
  + `${s.value.replans} replanifications · ${s.value.distance.toFixed(1)} m`,
)
const caption = computed(() => {
  if (s.value.finished) return 'Plus aucune frontière atteignable : l’exploration est terminée.'
  if (s.value.invalidFlash > 0)
    return 'Un obstacle vient d’entrer dans le champ de vision et coupe le chemin : A* repart de la carte mise à jour.'
  if (s.value.phase === 'plan') return 'Nouvelle cible retenue, et un chemin recalculé sur la carte telle qu’elle est maintenant.'
  return 'Percevoir, extraire les frontières, choisir, planifier, avancer — puis recommencer, à chaque pas.'
})
</script>

<template>
  <div class="anim-wrap">
    <svg viewBox="0 0 760 316" class="anim-svg" role="img"
         aria-label="Un robot explore une carte inconnue, détecte les frontières et replanifie quand il découvre un obstacle">
      <defs>
        <clipPath id="explore-clip">
          <rect :x="OX" :y="OY" :width="WORLD.w * SCALE" :height="WORLD.h * SCALE" />
        </clipPath>
      </defs>
      <rect x="2" y="6" width="512" height="304" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="258" y="18" text-anchor="middle" class="panel-title">
        {{ showCostmap ? 'La costmap inflatée que voit le planificateur' : 'La carte telle que le robot la connaît' }}
      </text>

      <image v-if="mapUrl" :href="mapUrl" :x="OX" :y="OY"
             :width="WORLD.w * SCALE" :height="WORLD.h * SCALE"
             preserveAspectRatio="none" style="image-rendering: pixelated" />

      <!-- La vérité terrain, en filigrane : ce que le robot n'a pas encore vu -->
      <g fill="none" stroke="#94a3b8" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.55">
        <rect v-for="(q, i) in WORLD.rects" :key="`t${i}`"
              :x="px(q.x)" :y="py(q.y)" :width="q.w * SCALE" :height="q.h * SCALE" />
      </g>

      <g v-if="showFrontiers">
        <rect v-for="i in s.frontierCells" :key="`f${i}`"
              :x="px((i % COLS) * RES)" :y="py(Math.floor(i / COLS) * RES)"
              :width="RES * SCALE" :height="RES * SCALE" fill="#25b34b" opacity="0.8" />
      </g>

      <path :d="conePath" clip-path="url(#explore-clip)" fill="#00bdf2" fill-opacity="0.17"
            stroke="#008fbd" stroke-width="1.2" stroke-dasharray="5 4" />

      <polyline v-if="pathLine" :points="pathLine" fill="none" stroke="#25b34b"
                stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.9" />
      <circle v-if="s.goalCell >= 0 && s.path.length" :cx="px(cellCenter(s.goalCell).x)"
              :cy="py(cellCenter(s.goalCell).y)" r="6" fill="none" stroke="#25b34b" stroke-width="2.4" />

      <g :transform="`translate(${px(s.pose.x)}, ${py(s.pose.y)}) rotate(${(s.pose.th * 180) / Math.PI})`">
        <circle r="8" fill="#333" stroke="white" stroke-width="2.5" />
        <path d="M4,-5 L13,0 L4,5 Z" fill="#f15a22" />
      </g>

      <g v-if="s.invalidFlash > 0">
        <rect x="150" y="128" width="216" height="38" rx="6" fill="#fef2f2" stroke="#cf1c24" stroke-width="2" />
        <text x="258" y="152" text-anchor="middle" class="flash-label">chemin invalidé</text>
      </g>
      <g v-if="s.finished">
        <rect x="140" y="128" width="236" height="38" rx="6" fill="#f0fdf4" stroke="#25b34b" stroke-width="2" />
        <text x="258" y="152" text-anchor="middle" class="done-label">exploration terminée</text>
      </g>

      <!-- ── La boucle de commande ────────────────────────────────────── -->
      <rect x="522" y="6" width="236" height="152" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="640" y="20" text-anchor="middle" class="panel-title">La boucle, à chaque pas</text>
      <g v-for="(p, k) in PHASES" :key="p.id">
        <rect x="530" :y="27 + k * 24" width="220" height="20" rx="4"
              :fill="k === activePhaseIdx ? '#cf1c24' : 'white'"
              :stroke="k === activePhaseIdx ? '#cf1c24' : '#e2e8f0'" stroke-width="1" />
        <circle cx="543" :cy="37 + k * 24" r="7"
                :fill="k === activePhaseIdx ? 'white' : '#e2e8f0'" />
        <text x="543" :y="40.5 + k * 24" text-anchor="middle" class="pip"
              :fill="k === activePhaseIdx ? '#cf1c24' : '#94a3b8'">{{ p.n }}</text>
        <text x="559" :y="41 + k * 24" class="phase-label"
              :fill="k === activePhaseIdx ? 'white' : '#64748b'">{{ p.label }}</text>
      </g>

      <!-- ── Télémétrie ───────────────────────────────────────────────── -->
      <rect x="522" y="166" width="236" height="144" fill="#f8fafc" rx="5" stroke="#cbd5e1" stroke-width="1.2" />
      <text x="640" y="180" text-anchor="middle" class="panel-title">Où en est l’exploration</text>
      <g>
        <text x="534" y="204" class="tel">exploré</text>
        <text x="746" y="204" text-anchor="end" class="tel-val">{{ coverage.toFixed(0) }} %</text>
        <text x="534" y="228" class="tel">frontières restantes</text>
        <text x="746" y="228" text-anchor="end" class="tel-val">{{ s.clusters.length }}</text>
        <text x="534" y="252" class="tel">replanifications</text>
        <text x="746" y="252" text-anchor="end" class="tel-val warn">{{ s.replans }}</text>
        <text x="534" y="276" class="tel">distance parcourue</text>
        <text x="746" y="276" text-anchor="end" class="tel-val">{{ s.distance.toFixed(1) }} m</text>
        <line x1="534" y1="288" x2="746" y2="288" stroke="#e2e8f0" />
        <rect x="534" y="296" width="11" height="10" fill="#25b34b" />
        <text x="551" y="305" class="legend">frontière : libre, voisine d’un inconnu</text>
      </g>
    </svg>

    <AnimationControls
      :playing="player.playing.value" :done="player.done.value" :speed="player.speed.value"
      :stats="stats" :caption="caption" play-label="Explorer" step-label="1 pas"
      @toggle="player.toggle" @step="player.stepOnce" @reset="player.restart"
      @update:speed="player.speed.value = $event"
    >
      <button class="anim-btn" :class="{ on: showFrontiers }" @click.stop="showFrontiers = !showFrontiers">
        frontières
      </button>
      <button class="anim-btn" :class="{ on: showCostmap }" @click.stop="showCostmap = !showCostmap">
        costmap inflatée
      </button>
    </AnimationControls>
  </div>
</template>

<style scoped>
.panel-title { font-size: 9px; fill: #64748b; font-weight: 700; }
.pip { font-size: 9px; font-weight: 800; font-family: ui-monospace, Menlo, monospace; }
.phase-label { font-size: 10.5px; font-weight: 600; }
.tel { font-size: 10.5px; fill: #475569; }
.tel-val { font-size: 14px; font-weight: 800; fill: #334155; font-family: ui-monospace, Menlo, monospace; }
.tel-val.warn { fill: #cf1c24; }
.legend { font-size: 9px; fill: #64748b; }
.flash-label { font-size: 15px; fill: #cf1c24; font-weight: 800; }
.done-label { font-size: 15px; fill: #25b34b; font-weight: 800; }
</style>
