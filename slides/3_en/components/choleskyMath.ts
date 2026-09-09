// Upper Cholesky, computed row by row. Steps only use previously known entries.
export const SLAM_INFORMATION = [
  [3, -1, 0, -1], [-1, 2, -1, 0], [0, -1, 2, -1], [-1, 0, -1, 2],
]

export function factorCholesky(matrix: number[][]) {
  const n = matrix.length
  if (!n || matrix.some(row => row.length !== n)) throw new Error('Expected a square matrix')
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (!Number.isFinite(matrix[i][j]) || Math.abs(matrix[i][j] - matrix[j][i]) > 1e-12)
      throw new Error('Expected a finite symmetric matrix')
  }
  const M = Array.from({ length: n }, () => Array<number>(n).fill(0))
  const steps = []
  for (let j = 0; j < n; j++) for (let i = j; i < n; i++) {
    const terms = Array.from({ length: j }, (_, k) => ({ k, left: M[k][j], right: M[k][i] }))
    const contribution = terms.reduce((sum, term) => sum + term.left * term.right, 0)
    const remainder = matrix[j][i] - contribution
    if (i === j && remainder <= 0) throw new Error('Expected a positive definite matrix')
    const divisor = i === j ? null : M[j][j]
    const value = i === j ? Math.sqrt(remainder) : remainder / divisor!
    M[j][i] = value
    steps.push({ j, i, terms, contribution, remainder, divisor, value })
  }
  return { M, steps }
}
