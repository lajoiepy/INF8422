/** Exact squared EDT on sampled grid sites (Meijster / separable parabola envelope).
 * Grid convention: grid[y][x], unit spacing; multiply sqrt(D) by voxel size.
 * Unknown sites never act as sources. The transform is geometric, not a path search.
 */

/** Lower envelope: forward selection, backward evaluation. Infinite costs are skipped. */
export function squaredTransform1D(cost, onCandidates) {
  const sites = [], cuts = []
  for (let q = 0; q < cost.length; q++) {
    if (!Number.isFinite(cost[q])) continue
    let cut = -Infinity
    while (sites.length) {
      const p = sites.at(-1)
      cut = ((cost[q] + q * q) - (cost[p] + p * p)) / (2 * (q - p))
      if (cut > cuts.at(-1)) break
      sites.pop(); cuts.pop()
    }
    sites.push(q)
    cuts.push(sites.length === 1 ? -Infinity : cut)
  }
  onCandidates?.([...sites])
  const out = Array(cost.length).fill(Infinity)
  let k = sites.length - 1
  if (k < 0) return out
  for (let x = cost.length - 1; x >= 0; x--) {
    while (k > 0 && x < cuts[k]) k--
    out[x] = (x - sites[k]) ** 2 + cost[sites[k]]
  }
  return out
}

/** trace receives independent snapshots after each scanned line. */
export function squaredEDT2D(sources, trace) {
  const height = sources.length, width = sources[0]?.length ?? 0
  if (!height || !width || sources.some(row => row.length !== width))
    throw new Error('Expected a nonempty rectangular grid')
  const g = sources.map(row => row.map(source => source ? 0 : Infinity))
  const emit = (phase, axis, line, candidates = []) => trace?.({
    phase, axis, line, candidates, values: g.map(row => [...row]),
  })
  emit('initial', null, -1)
  // X: binary 1D distance, using the elementary +1 recurrence.
  for (let y = 0; y < height; y++) {
    for (let x = 1; x < width; x++) g[y][x] = Math.min(g[y][x], g[y][x - 1] + 1)
    emit('forward-x', 'x', y)
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 2; x >= 0; x--) g[y][x] = Math.min(g[y][x], g[y][x + 1] + 1)
    emit('backward-x', 'x', y)
  }
  for (const row of g) for (let x = 0; x < width; x++) row[x] **= 2
  emit('square', null, -1)
  // Y: retain squared X distance, then minimize (y-j)^2 + Dx(x,j).
  // Save all outputs before applying them, to show the two sweeps separately.
  const columns = []
  for (let x = 0; x < width; x++) {
    columns[x] = squaredTransform1D(g.map(row => row[x]), candidates =>
      emit('forward-y', 'y', x, candidates))
  }
  for (let x = width - 1; x >= 0; x--) {
    for (let y = height - 1; y >= 0; y--) g[y][x] = columns[x][y]
    emit('backward-y', 'y', x)
  }
  return g
}

/** Two transforms produce signed distances to opposite-class voxel centers.
 * This discrete convention is NOT exact distance to voxel faces / physical surfaces.
 * Unobserved queries return null; a missing opposite class yields signed infinity.
 */
export function signedEDT2D(occupied, observed = occupied.map(row => row.map(() => true)), spacing = 1, trace) {
  if (!(spacing > 0) || !Number.isFinite(spacing)) throw new Error('Invalid voxel size')
  if (observed.length !== occupied.length || occupied.some((row, y) => observed[y]?.length !== row.length))
    throw new Error('Observation mask must match occupancy grid')
  const outside = squaredEDT2D(occupied.map((row, y) => row.map((v, x) => observed[y][x] && v)), trace)
  const inside = squaredEDT2D(occupied.map((row, y) => row.map((v, x) => observed[y][x] && !v)))
  return outside.map((row, y) => row.map((d, x) => !observed[y][x] ? null
    : occupied[y][x] ? -spacing * Math.sqrt(inside[y][x]) : spacing * Math.sqrt(d)))
}
