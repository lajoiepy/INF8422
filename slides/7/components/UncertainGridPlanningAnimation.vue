<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

type Cell = { x: number; y: number }
type Strategy = 'mean' | 'safe'

const COLS = 15
const ROWS = 8
const CELL = 28
const MAP_X = 8
const MAP_Y = 10
const START: Cell = { x: 1, y: 3 }
const GOAL: Cell = { x: 13, y: 3 }
const MEAN_OBJECT: Cell = { x: 7, y: 0 }

const key = (cell: Cell): string => `${cell.x},${cell.y}`
const walls = new Set<string>()
for (let x = 5; x <= 9; x++) {
  for (let y = 2; y <= 4; y++) walls.add(`${x},${y}`)
}
for (let x = 5; x <= 7; x++) walls.add(`${x},5`)

// Une seule de ces cellules contient réellement l'objet. La somme vaut 1.
const objectDistribution = [
  { x: 7, y: 0, p: 0.32 },
  { x: 6, y: 0, p: 0.08 },
  { x: 8, y: 0, p: 0.08 },
  { x: 6, y: 1, p: 0.12 },
  { x: 7, y: 1, p: 0.20 },
  { x: 8, y: 1, p: 0.12 },
  { x: 5, y: 1, p: 0.04 },
  { x: 9, y: 1, p: 0.04 },
]
const probability = new Map(objectDistribution.map(cell => [key(cell), cell.p]))

const strategies: Record<Strategy, { label: string; riskWeight: number }> = {
  mean: { label: 'Position moyenne', riskWeight: 0 },
  safe: { label: "Sécurité d'abord", riskWeight: 4 },
}

const strategy = ref<Strategy>('mean')
const running = ref(false)
const trialsDone = ref(0)
const collisions = ref(0)
const sampledObject = ref<Cell | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

function heuristic(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function reconstruct(cameFrom: Map<string, Cell>, current: Cell): Cell[] {
  const path = [current]
  while (cameFrom.has(key(current))) {
    current = cameFrom.get(key(current))!
    path.push(current)
  }
  return path.reverse()
}

function plan(riskWeight: number): Cell[] {
  const open: Cell[] = [START]
  const cameFrom = new Map<string, Cell>()
  const g = new Map<string, number>([[key(START), 0]])
  const f = new Map<string, number>([[key(START), heuristic(START, GOAL)]])
  const directions = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]

  while (open.length) {
    open.sort((a, b) => (f.get(key(a)) ?? Infinity) - (f.get(key(b)) ?? Infinity))
    const current = open.shift()!
    if (key(current) === key(GOAL)) return reconstruct(cameFrom, current)

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y }
      const nextKey = key(next)
      if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) continue
      if (walls.has(nextKey) || nextKey === key(MEAN_OBJECT)) continue

      const riskCost = riskWeight * 12 * (probability.get(nextKey) ?? 0)
      const candidate = (g.get(key(current)) ?? Infinity) + 1 + riskCost
      if (candidate >= (g.get(nextKey) ?? Infinity)) continue

      cameFrom.set(nextKey, current)
      g.set(nextKey, candidate)
      f.set(nextKey, candidate + heuristic(next, GOAL))
      if (!open.some(cell => key(cell) === nextKey)) open.push(next)
    }
  }
  return []
}

const path = computed(() => plan(strategies[strategy.value].riskWeight))
const pathKeys = computed(() => new Set(path.value.map(key)))
const pathLength = computed(() => Math.max(0, path.value.length - 1))
const collisionProbability = computed(() => objectDistribution
  .filter(cell => pathKeys.value.has(key(cell)))
  .reduce((sum, cell) => sum + cell.p, 0))

function center(cell: Cell): { x: number; y: number } {
  return {
    x: MAP_X + cell.x * CELL + CELL / 2,
    y: MAP_Y + cell.y * CELL + CELL / 2,
  }
}

const pathPoints = computed(() => path.value
  .map(cell => {
    const point = center(cell)
    return `${point.x},${point.y}`
  })
  .join(' '))

function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0
    seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function sampleObject(random: () => number): Cell {
  const draw = random()
  let cumulative = 0
  for (const cell of objectDistribution) {
    cumulative += cell.p
    if (draw <= cumulative) return cell
  }
  return objectDistribution[objectDistribution.length - 1]
}

function stop(): void {
  running.value = false
  if (timer) clearInterval(timer)
  timer = null
}

function runTrials(): void {
  stop()
  const random = seededRandom(2026)
  trialsDone.value = 0
  collisions.value = 0
  sampledObject.value = null
  running.value = true

  timer = setInterval(() => {
    const object = sampleObject(random)
    sampledObject.value = object
    trialsDone.value++
    if (pathKeys.value.has(key(object))) collisions.value++
    if (trialsDone.value >= 30) stop()
  }, 90)
}

function choose(next: Strategy): void {
  stop()
  strategy.value = next
  trialsDone.value = 0
  collisions.value = 0
  sampledObject.value = null
}

const interpretation = computed(() => {
  const risk = Math.round(collisionProbability.value * 100)
  if (strategy.value === 'safe')
    return `Le plan accepte ${pathLength.value - 16} cases de détour pour éviter la zone incertaine : risque ${risk} %.`
  return `Le trajet est court, mais il traverse des positions plausibles de l'objet : risque ${risk} %.`
})

onUnmounted(stop)
</script>

<template>
  <div class="plan-wrap">
    <svg class="plan-svg" viewBox="0 0 558 244" role="img" aria-labelledby="plan-title plan-desc">
      <title id="plan-title">Planification sur une grille avec un obstacle incertain</title>
      <desc id="plan-desc">Le chemin court traverse la zone des positions possibles de l'objet. Une stratégie prudente choisit un détour plus long mais réduit le risque de collision.</desc>

      <g class="grid">
        <rect
          v-for="y in ROWS" :key="`row-${y}`"
          :x="MAP_X" :y="MAP_Y + (y - 1) * CELL"
          :width="COLS * CELL" :height="CELL"
          class="grid-row"
        />
        <line v-for="x in COLS + 1" :key="`vx-${x}`"
          :x1="MAP_X + (x - 1) * CELL" :x2="MAP_X + (x - 1) * CELL"
          :y1="MAP_Y" :y2="MAP_Y + ROWS * CELL" />
        <line v-for="y in ROWS + 1" :key="`hy-${y}`"
          :x1="MAP_X" :x2="MAP_X + COLS * CELL"
          :y1="MAP_Y + (y - 1) * CELL" :y2="MAP_Y + (y - 1) * CELL" />
      </g>

      <rect v-for="wall in [...walls]" :key="wall"
        :x="MAP_X + Number(wall.split(',')[0]) * CELL + 1"
        :y="MAP_Y + Number(wall.split(',')[1]) * CELL + 1"
        :width="CELL - 2" :height="CELL - 2" class="wall" />

      <rect v-for="cell in objectDistribution" :key="`p-${key(cell)}`"
        :x="MAP_X + cell.x * CELL + 2" :y="MAP_Y + cell.y * CELL + 2"
        :width="CELL - 4" :height="CELL - 4"
        :style="{ opacity: 0.12 + cell.p * 1.8 }" class="uncertain-cell" />

      <polyline :points="pathPoints" class="route-shadow" />
      <polyline :points="pathPoints" :class="['route', `route-${strategy}`]" />

      <g :transform="`translate(${center(START).x} ${center(START).y})`">
        <circle r="9" class="start" />
        <text y="3" text-anchor="middle">D</text>
      </g>
      <g :transform="`translate(${center(GOAL).x} ${center(GOAL).y})`">
        <circle r="9" class="goal" />
        <text y="3" text-anchor="middle">A</text>
      </g>

      <g :transform="`translate(${center(MEAN_OBJECT).x} ${center(MEAN_OBJECT).y})`">
        <circle r="7" class="mean-object" />
        <text x="12" y="3" class="map-label">position la plus probable</text>
      </g>

      <g v-if="sampledObject" :transform="`translate(${center(sampledObject).x} ${center(sampledObject).y})`">
        <circle r="10" :class="['sampled-object', { collision: pathKeys.has(key(sampledObject)) }]" />
        <text y="3" text-anchor="middle" class="sampled-label">●</text>
      </g>

      <g class="side-info">
        <text x="446" y="25" class="side-heading">Plan choisi</text>
        <text x="446" y="45">Longueur : {{ pathLength }} cases</text>
        <text x="446" y="62">Risque exact :</text>
        <text x="446" y="80" class="risk-value">{{ Math.round(collisionProbability * 100) }} %</text>

        <text x="446" y="112" class="side-heading">Test de 30 mondes</text>
        <text x="446" y="132">Essais : {{ trialsDone }} / 30</text>
        <text x="446" y="149">Collisions : {{ collisions }}</text>
        <text v-if="trialsDone === 30" x="446" y="168" class="trial-result">
          observé : {{ Math.round(collisions / 30 * 100) }} %
        </text>

        <g transform="translate(446 195)" class="legend">
          <rect width="10" height="10" class="uncertain-cell" />
          <text x="15" y="9">position plausible</text>
          <rect y="17" width="10" height="10" class="wall" />
          <text x="15" y="26">obstacle certain</text>
        </g>
      </g>
    </svg>

    <div class="plan-controls" aria-label="Choix de la stratégie de planification">
      <button v-for="(settings, id) in strategies" :key="id" type="button"
        class="plan-btn" :class="{ selected: strategy === id }"
        :aria-pressed="strategy === id" @click="choose(id as Strategy)">
        {{ settings.label }}
      </button>
      <button type="button" class="plan-btn run" :disabled="running" @click="runTrials">
        {{ running ? 'Simulation…' : 'Tester 30 mondes possibles' }}
      </button>
    </div>

    <div class="interpretation" aria-live="polite">{{ interpretation }}</div>
  </div>
</template>

<style scoped>
.plan-wrap { width: 100%; color: currentColor; }
.plan-svg { display: block; width: auto; max-width: 100%; height: 270px; margin: 0 auto; }
.grid line, .grid-row { fill: transparent; stroke: currentColor; stroke-width: 0.55; opacity: 0.16; }
.wall { fill: currentColor; opacity: 0.5; }
.uncertain-cell { fill: var(--poly-orange); }
.route-shadow { fill: none; stroke: var(--background, white); stroke-width: 7; stroke-linejoin: round; stroke-linecap: round; }
.route { fill: none; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; }
.route-mean, .route-balanced { stroke: var(--poly-blue); }
.route-safe { stroke: var(--poly-green); }
.start { fill: var(--poly-blue); }
.goal { fill: var(--poly-green); }
.start + text, .goal + text { fill: white; font: 700 8px sans-serif; }
.mean-object { fill: var(--poly-orange); stroke: currentColor; stroke-width: 1; }
.map-label, .side-info text, .legend text { fill: currentColor; font: 7px sans-serif; }
.sampled-object { fill: none; stroke: var(--poly-orange); stroke-width: 3; }
.sampled-object.collision { stroke: var(--poly-red); stroke-width: 4; }
.sampled-label { fill: var(--poly-orange); font: 8px sans-serif; }
.side-heading { font-weight: 700 !important; }
.risk-value { fill: var(--poly-red) !important; font: 700 17px sans-serif !important; }
.trial-result { fill: var(--poly-red) !important; font-weight: 700 !important; }
.plan-controls { display: flex; justify-content: center; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 2px; }
.plan-btn { border: 1px solid currentColor; border-radius: 4px; padding: 3px 9px; background: transparent; color: currentColor; font: 0.66rem monospace; cursor: pointer; opacity: 0.72; }
.plan-btn.selected { background: var(--poly-red); border-color: var(--poly-red); color: white; opacity: 1; }
.plan-btn.run { border-color: var(--poly-green); opacity: 1; }
.plan-btn:disabled { cursor: default; opacity: 0.45; }
.interpretation { margin-top: 5px; text-align: center; font-size: 0.72rem; font-weight: 600; }
@media (prefers-reduced-motion: reduce) {
  .sampled-object { transition: none; }
}
</style>
