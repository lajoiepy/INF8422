export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

export function projectPinhole(p: Vec3, fx: number, fy: number, cx = 0, cy = 0): Vec2 {
  if (p[2] <= 0) throw new RangeError('La profondeur doit être positive')
  return [fx * p[0] / p[2] + cx, fy * p[1] / p[2] + cy]
}

export function transformSE2(p: Vec2, yaw: number, t: Vec2): Vec2 {
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return [c * p[0] - s * p[1] + t[0], s * p[0] + c * p[1] + t[1]]
}

/** Intersection o + λd avec le plan z = planeZ. */
export function rayPlane(o: Vec3, d: Vec3, planeZ = 0): Vec3 | null {
  if (Math.abs(d[2]) < 1e-12) return null
  const lambda = (planeZ - o[2]) / d[2]
  if (lambda < 0) return null
  return [o[0] + lambda * d[0], o[1] + lambda * d[1], planeZ]
}

export function circularAngleError(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))
}

/** Waymo APH : poids linéaire, 1 à 0 rad et 0 à π rad. */
export function headingWeight(a: number, b: number): number {
  return 1 - circularAngleError(a, b) / Math.PI
}

export function stoppingDistance(v: number, latency: number, deceleration: number): number {
  if (v < 0 || latency < 0 || deceleration <= 0) throw new RangeError('Paramètres physiques invalides')
  return v * latency + v * v / (2 * deceleration)
}

export function fuseGaussian1D(means: number[], variances: number[]): { mean: number; variance: number } {
  if (!means.length || means.length !== variances.length || variances.some(v => v <= 0)) throw new RangeError('Mesures invalides')
  const precision = variances.reduce((s, v) => s + 1 / v, 0)
  return {
    mean: means.reduce((s, m, i) => s + m / variances[i], 0) / precision,
    variance: 1 / precision,
  }
}

export function logOddsUpdate(priorProbability: number, measurements: number[]): number {
  const clamp = (p: number) => Math.min(.999999, Math.max(.000001, p))
  const logit = (p: number) => Math.log(clamp(p) / (1 - clamp(p)))
  const sigmoid = (l: number) => 1 / (1 + Math.exp(-l))
  const prior = logit(priorProbability)
  return sigmoid(prior + measurements.reduce((s, p) => s + logit(p) - prior, 0))
}

export function bicycleStep(state: { x: number; y: number; yaw: number; v: number }, steer: number, accel: number, dt: number, wheelbase = 2.8) {
  const yawRate = state.v * Math.tan(steer) / wheelbase
  return {
    x: state.x + state.v * Math.cos(state.yaw) * dt,
    y: state.y + state.v * Math.sin(state.yaw) * dt,
    yaw: state.yaw + yawRate * dt,
    v: Math.max(0, state.v + accel * dt),
  }
}

/** Borne unilatérale exacte : P(défaillance) <= 1 - alpha^(1/n), avec zéro échec. */
export function zeroFailureUpperBound(n: number, confidence = .95): number {
  if (n <= 0 || confidence <= 0 || confidence >= 1) throw new RangeError('Paramètres statistiques invalides')
  return 1 - Math.pow(1 - confidence, 1 / n)
}
