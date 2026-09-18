/**
 * Noyau partagé des animations de cartographie et de planification.
 *
 * Les composants « grille d'occupation », « A* », « exploration » et
 * « inflation » s'appuient tous sur ce fichier : quand l'exploration
 * replanifie, elle appelle littéralement le même A* que la diapo A*, sur la
 * costmap réellement inflatée. Aucun chemin n'est codé en dur.
 *
 * Repère : le monde est en mètres, la grille est rasterisée à la résolution
 * demandée. Les indices de cellules sont des entiers `r * cols + c`.
 */

// ── États d'une cellule de la carte construite par le robot ────────────────
export const UNKNOWN = 0
export const FREE = 1
export const OCCUPIED = 2

// ── Coûts, convention Nav2 ─────────────────────────────────────────────────
export const LETHAL = 254
export const INSCRIBED = 253
export const NO_INFORMATION = 255

export interface Rect { x: number; y: number; w: number; h: number }
export interface World { w: number; h: number; rects: Rect[] }

export interface TruthGrid {
  cols: number
  rows: number
  res: number
  occ: Uint8Array
}

export interface RayResult {
  /** Cellules libres traversées, dans l'ordre, départ inclus. */
  cells: number[]
  /** Cellule d'impact, ou null si le rayon s'est perdu. */
  hit: number | null
  /** Distance parcourue, en mètres. */
  dist: number
}

/** Rasterise un monde continu à la résolution demandée. */
export function rasterize(world: World, res: number): TruthGrid {
  const cols = Math.ceil(world.w / res)
  const rows = Math.ceil(world.h / res)
  const occ = new Uint8Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Une cellule est un obstacle dès que son centre tombe dans un mur :
      // c'est ce qui fait qu'un passage étroit disparaît à basse résolution.
      const x = (c + 0.5) * res
      const y = (r + 0.5) * res
      for (const q of world.rects) {
        if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h) {
          occ[r * cols + c] = 1
          break
        }
      }
    }
  }
  return { cols, rows, res, occ }
}

/**
 * Lancer de rayon DDA (Amanatides & Woo) : avance de cellule en cellule et
 * s'arrête au premier obstacle. C'est ce qui donne l'occlusion — l'ombre
 * derrière un mur reste inconnue tant que le robot ne l'a pas contournée.
 */
export function castRay(
  truth: TruthGrid, ox: number, oy: number, theta: number, rMax: number,
): RayResult {
  const { cols, rows, res, occ } = truth
  const dx = Math.cos(theta)
  const dy = Math.sin(theta)
  let cx = Math.floor(ox / res)
  let cy = Math.floor(oy / res)

  const stepX = dx >= 0 ? 1 : -1
  const stepY = dy >= 0 ? 1 : -1
  const flat = 1e-9
  const tDeltaX = Math.abs(dx) < flat ? Infinity : Math.abs(res / dx)
  const tDeltaY = Math.abs(dy) < flat ? Infinity : Math.abs(res / dy)
  let tMaxX = Math.abs(dx) < flat
    ? Infinity
    : ((cx + (dx >= 0 ? 1 : 0)) * res - ox) / dx
  let tMaxY = Math.abs(dy) < flat
    ? Infinity
    : ((cy + (dy >= 0 ? 1 : 0)) * res - oy) / dy

  const cells: number[] = []
  let t = 0
  while (t <= rMax) {
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) break
    const idx = cy * cols + cx
    if (occ[idx]) return { cells, hit: idx, dist: t }
    cells.push(idx)
    if (tMaxX < tMaxY) {
      t = tMaxX
      cx += stepX
      tMaxX += tDeltaX
    } else {
      t = tMaxY
      cy += stepY
      tMaxY += tDeltaY
    }
  }
  return { cells, hit: null, dist: Math.min(t, rMax) }
}

/**
 * Écrit un rayon dans la carte : ce qu'il a traversé est libre, ce qu'il a
 * touché est occupé. Trois états, pas de probabilités.
 * Retourne le nombre de cellules qui viennent de changer d'état — de quoi
 * savoir si le balayage apprend encore quelque chose.
 */
export function markRay(map: Uint8Array, ray: RayResult): number {
  let changed = 0
  for (const idx of ray.cells) {
    if (map[idx] !== FREE && map[idx] !== OCCUPIED) {
      map[idx] = FREE
      changed++
    }
  }
  if (ray.hit !== null && map[ray.hit] !== OCCUPIED) {
    map[ray.hit] = OCCUPIED
    changed++
  }
  return changed
}

/** Cellules libres ayant au moins un voisin-4 inconnu : la limite du connu. */
export function frontiers(map: Uint8Array, cols: number, rows: number): number[] {
  const out: number[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (map[idx] !== FREE) continue
      if (
        (c > 0 && map[idx - 1] === UNKNOWN) ||
        (c < cols - 1 && map[idx + 1] === UNKNOWN) ||
        (r > 0 && map[idx - cols] === UNKNOWN) ||
        (r < rows - 1 && map[idx + cols] === UNKNOWN)
      ) out.push(idx)
    }
  }
  return out
}

/** Regroupe les frontières en amas connexes (voisinage 8). */
export function clusterFrontiers(
  cells: number[], cols: number, rows: number,
): number[][] {
  const pending = new Set(cells)
  const clusters: number[][] = []
  for (const seed of cells) {
    if (!pending.has(seed)) continue
    const group: number[] = []
    const stack = [seed]
    pending.delete(seed)
    while (stack.length) {
      const idx = stack.pop()!
      group.push(idx)
      const c = idx % cols
      const r = (idx / cols) | 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc
          const nr = r + dr
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
          const n = nr * cols + nc
          if (pending.has(n)) {
            pending.delete(n)
            stack.push(n)
          }
        }
      }
    }
    clusters.push(group)
  }
  return clusters
}

/**
 * Costmap inflatée, convention Nav2 : transformée de distance (brushfire)
 * depuis les obstacles, puis
 *   coût = 253 · exp(−cost_scaling_factor · (d − r_inscrit))
 * au-delà du rayon inscrit. Les inconnues sont traitées comme libres ou
 * comme létales selon `unknownIsLethal` — c'est exactement le compromis que
 * doit trancher un explorateur.
 */
export function inflate(
  map: Uint8Array,
  cols: number,
  rows: number,
  opts: {
    res: number
    inflationRadius: number
    inscribedRadius: number
    costScale: number
    unknownIsLethal?: boolean
  },
): { cost: Uint8Array; dist: Float32Array } {
  const { res, inflationRadius, inscribedRadius, costScale } = opts
  const n = cols * rows
  const dist = new Float32Array(n).fill(Infinity)
  const cost = new Uint8Array(n)

  // Brushfire : file d'attente amorcée sur toutes les cellules obstacles.
  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    if (map[i] === OCCUPIED) {
      dist[i] = 0
      queue.push(i)
    }
  }
  // Voisinage 8 avec les vrais poids : une diagonale coûte √2 cellules.
  const D = res
  const DD = res * Math.SQRT2
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head]
    const c = idx % cols
    const r = (idx / cols) | 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
        const ni = nr * cols + nc
        const nd = dist[idx] + (dc && dr ? DD : D)
        if (nd < dist[ni] && nd <= inflationRadius + DD) {
          dist[ni] = nd
          queue.push(ni)
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    if (map[i] === OCCUPIED) { cost[i] = LETHAL; continue }
    if (map[i] === UNKNOWN && opts.unknownIsLethal) { cost[i] = LETHAL; continue }
    const d = dist[i]
    if (d <= inscribedRadius) cost[i] = INSCRIBED
    else if (d <= inflationRadius) {
      cost[i] = Math.round((INSCRIBED - 1) * Math.exp(-costScale * (d - inscribedRadius)))
    } else cost[i] = 0
  }
  return { cost, dist }
}

// ── A* incrémental ────────────────────────────────────────────────────────

export interface AStarOptions {
  /** 0 = Dijkstra, 1 = A* classique. Une valeur > 1 rend la recherche gloutonne. */
  heuristicWeight?: number
  /** Voisinage 8 plutôt que 4. */
  diagonal?: boolean
  /** Poids du coût de la costmap dans le coût de déplacement. */
  costWeight?: number
  /** Coût à partir duquel une cellule est infranchissable. */
  lethalThreshold?: number
}

export type AStarStatus = 'running' | 'found' | 'failed'

/** Tas binaire minimal, indexé par f. */
class MinHeap {
  private items: number[] = []
  private keys: Float64Array
  constructor(capacity: number) { this.keys = new Float64Array(capacity) }
  get size() { return this.items.length }
  /** Les entrées obsolètes ne sont pas supprimées : on les ignore au dépilage. */
  push(idx: number, key: number) {
    this.keys[idx] = key
    this.items.push(idx)
    let i = this.items.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.keys[this.items[p]] <= this.keys[this.items[i]]) break
      ;[this.items[p], this.items[i]] = [this.items[i], this.items[p]]
      i = p
    }
  }
  pop(): number | undefined {
    if (!this.items.length) return undefined
    const top = this.items[0]
    const last = this.items.pop()!
    if (this.items.length) {
      this.items[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.items.length && this.keys[this.items[l]] < this.keys[this.items[m]]) m = l
        if (r < this.items.length && this.keys[this.items[r]] < this.keys[this.items[m]]) m = r
        if (m === i) break
        ;[this.items[m], this.items[i]] = [this.items[i], this.items[m]]
        i = m
      }
    }
    return top
  }
  /** Les k meilleures entrées encore valides, pour l'affichage de la file. */
  peekBest(k: number, valid: (idx: number) => boolean): number[] {
    return this.items
      .filter(valid)
      .sort((a, b) => this.keys[a] - this.keys[b])
      .slice(0, k)
  }
}

/**
 * A* qu'on fait avancer d'une expansion à la fois : `step()` dépile un nœud,
 * relâche ses voisins et rend la main. C'est ce qui permet de *voir*
 * l'algorithme au lieu de rejouer son résultat.
 */
export function createAStar(
  cost: Uint8Array,
  cols: number,
  rows: number,
  start: number,
  goal: number,
  options: AStarOptions = {},
) {
  const {
    heuristicWeight = 1,
    diagonal = false,
    costWeight = 4,
    lethalThreshold = INSCRIBED,
  } = options

  const n = cols * rows
  const g = new Float64Array(n).fill(Infinity)
  const f = new Float64Array(n).fill(Infinity)
  const cameFrom = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)
  const inOpen = new Uint8Array(n)
  const heap = new MinHeap(n)

  const gx = goal % cols
  const gy = (goal / cols) | 0

  function h(idx: number): number {
    const dx = Math.abs((idx % cols) - gx)
    const dy = Math.abs(((idx / cols) | 0) - gy)
    // Octile en 8-voisinage, Manhattan en 4-voisinage : dans les deux cas
    // l'heuristique reste admissible, donc A* reste optimal.
    return diagonal
      ? (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy)
      : dx + dy
  }

  g[start] = 0
  f[start] = heuristicWeight * h(start)
  heap.push(start, f[start])
  inOpen[start] = 1

  let status: AStarStatus = 'running'
  let current = start
  let expanded = 0
  const expandedOrder: number[] = []
  let path: number[] = []
  /** Voisins relâchés lors de la dernière expansion : mis en évidence à l'écran. */
  let lastRelaxed: number[] = []

  function reconstruct(): number[] {
    const out: number[] = []
    let cur = goal
    while (cur !== -1) {
      out.push(cur)
      if (cur === start) break
      cur = cameFrom[cur]
    }
    return out.reverse()
  }

  function step(): AStarStatus {
    if (status !== 'running') return status
    lastRelaxed = []

    let idx: number | undefined
    // Entrées périmées : le nœud a déjà été fermé via un meilleur chemin.
    do { idx = heap.pop() } while (idx !== undefined && closed[idx])
    if (idx === undefined) { status = 'failed'; return status }

    current = idx
    closed[idx] = 1
    inOpen[idx] = 0
    expanded++
    expandedOrder.push(idx)

    if (idx === goal) {
      path = reconstruct()
      status = 'found'
      return status
    }

    const c = idx % cols
    const r = (idx / cols) | 0
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dc && !dr) continue
        if (!diagonal && dc && dr) continue
        const nc = c + dc
        const nr = r + dr
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
        const ni = nr * cols + nc
        if (closed[ni] || cost[ni] >= lethalThreshold) continue
        // Interdit de couper le coin d'un obstacle en diagonale.
        if (dc && dr && (cost[r * cols + nc] >= lethalThreshold || cost[nr * cols + c] >= lethalThreshold)) continue

        const stepCost = (dc && dr ? Math.SQRT2 : 1) + (costWeight * cost[ni]) / LETHAL
        const tentative = g[idx] + stepCost
        if (tentative < g[ni]) {
          g[ni] = tentative
          f[ni] = tentative + heuristicWeight * h(ni)
          cameFrom[ni] = idx
          heap.push(ni, f[ni])
          inOpen[ni] = 1
          lastRelaxed.push(ni)
        }
      }
    }
    return status
  }

  function runToCompletion(limit = 1e6): AStarStatus {
    let guard = 0
    while (status === 'running' && guard++ < limit) step()
    return status
  }

  return {
    step,
    runToCompletion,
    get status() { return status },
    get current() { return current },
    get expanded() { return expanded },
    get expandedOrder() { return expandedOrder },
    get path() { return path },
    get openCount() { return inOpen.reduce((a, b) => a + b, 0) },
    get cost() { return path.length ? g[goal] : Infinity },
    g, f, h, closed, inOpen, cameFrom,
    /** Les k meilleures entrées de la file, pour le panneau de gauche. */
    bestOpen: (k: number) => heap.peekBest(k, (i) => inOpen[i] === 1 && !closed[i]),
  }
}

/** Raccourci : lance A* jusqu'au bout et rend le chemin (vide si échec). */
export function astar(
  cost: Uint8Array, cols: number, rows: number,
  start: number, goal: number, options: AStarOptions = {},
): number[] {
  const search = createAStar(cost, cols, rows, start, goal, options)
  search.runToCompletion()
  return search.path
}
