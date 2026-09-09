export interface SpringFactor {
  id: string
  from: number | null
  to: number
  target: number
  variance: number
}

export function residual(x: readonly number[], factor: SpringFactor): number {
  return x[factor.to] - (factor.from === null ? 0 : x[factor.from]) - factor.target
}

export function springEnergy(x: readonly number[], factors: readonly SpringFactor[]): number {
  return factors.reduce((sum, factor) => sum + residual(x, factor) ** 2 / (2 * factor.variance), 0)
}

export function springGradient(x: readonly number[], factors: readonly SpringFactor[]): number[] {
  const gradient = x.map(() => 0)
  for (const factor of factors) {
    const force = residual(x, factor) / factor.variance
    gradient[factor.to] += force
    if (factor.from !== null) gradient[factor.from] -= force
  }
  return gradient
}

// Solve the small anchored linear Gaussian graph, H x = b, without rounding.
export function springEquilibrium(size: number, factors: readonly SpringFactor[]): number[] {
  const rows = Array.from({ length: size }, () => Array(size + 1).fill(0) as number[])
  for (const factor of factors) {
    const entries = [[factor.to, 1]]
    if (factor.from !== null) entries.push([factor.from, -1])
    for (const [i, ai] of entries) {
      rows[i][size] += ai * factor.target / factor.variance
      for (const [j, aj] of entries) rows[i][j] += ai * aj / factor.variance
    }
  }
  for (let column = 0; column < size; column++) {
    let pivot = column
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row
    }
    if (Math.abs(rows[pivot][column]) < 1e-12) throw new Error('Le graphe doit être connecté à un prior.')
    ;[rows[column], rows[pivot]] = [rows[pivot], rows[column]]
    const divisor = rows[column][column]
    for (let j = column; j <= size; j++) rows[column][j] /= divisor
    for (let row = 0; row < size; row++) {
      if (row === column) continue
      const scale = rows[row][column]
      for (let j = column; j <= size; j++) rows[row][j] -= scale * rows[column][j]
    }
  }
  return rows.map(row => row[size])
}

// For this quadratic cost, x* - x = -H^-1 ∇J(x): a damped Newton step.
// Its energy gap contracts by (1 - fraction)^2, for any positive variances.
export function relaxToward(x: readonly number[], optimum: readonly number[], fraction: number): number[] {
  return x.map((value, i) => value + fraction * (optimum[i] - value))
}
