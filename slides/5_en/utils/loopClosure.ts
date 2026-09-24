import {between, compose, dot, poseResidual, solve, sum, wrap, type Pose} from './learningMath.ts'

export type LoopAssociation = 'correct' | 'wrong'

/** A return to the third pose, after entering a rectangular courtyard. */
export const loopTruth: Pose[] = [
  [-4, -2, 0], [-2, 0, 0], [0, 0, 0], [3, 0, 0],
  [6, 0, Math.PI / 2], [6, 3, Math.PI / 2], [6, 6, Math.PI],
  [3, 6, Math.PI], [0, 6, -Math.PI / 2], [0, 3, -Math.PI / 2], [.2, .2, 0],
]
const copy = (poses: Pose[]) => poses.map(p => [...p] as Pose)
const odometry = loopTruth.slice(1).map((pose, i) => {
  const z = between(loopTruth[i], pose)
  // The approach to T2 is accurate; a systematic bias accumulates on the loop.
  return i < 2 ? z : [z[0] + .12, z[1] - .04, wrap(z[2] + .065)] as Pose
})
export const loopBefore: Pose[] = [loopTruth[0]]
for (const z of odometry) loopBefore.push(compose(loopBefore.at(-1)!, z))

export function loopConstraint(association: LoopAssociation) {
  return {
    from: association === 'correct' ? 2 : 6,
    to: loopTruth.length - 1,
    // The false recognition reports a near-identical view at a different place.
    measurement: between(loopTruth[2], loopTruth.at(-1)!),
  }
}

function residuals(poses: Pose[], association: LoopAssociation) {
  const residuals: number[] = []
  odometry.forEach((z, i) => residuals.push(...poseResidual(poses[i], poses[i + 1], z)
    .map((v, axis) => v / (axis === 2 ? .16 : .45))))
  const closure = loopConstraint(association)
  residuals.push(...poseResidual(poses[closure.from], poses[closure.to], closure.measurement)
    .map((v, axis) => v / (axis === 2 ? .025 : .10)))
  return residuals
}

export function loopMetrics(poses: Pose[], association: LoopAssociation) {
  const r = residuals(poses, association)
  return {
    cost: dot(r, r),
    positionRmse: Math.sqrt(sum(poses.map((p, i) => (p[0] - loopTruth[i][0]) ** 2 + (p[1] - loopTruth[i][1]) ** 2)) / poses.length),
  }
}

/** Gauss–Newton, fixed gauge T0, numerical Jacobian and a backtracking line search.
 * Intentionally quadratic, without outlier rejection, to expose false closures.
 */
export function optimizeLoop(association: LoopAssociation, maxIterations = 12) {
  let poses = copy(loopBefore)
  const snapshots = [copy(poses)]
  const history = [loopMetrics(poses, association).cost]
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const r = residuals(poses, association), n = (poses.length - 1) * 3, eps = 1e-5
    const jacobian = Array.from({length: r.length}, () => Array(n).fill(0))
    for (let j = 0; j < n; j++) {
      const shifted = copy(poses)
      shifted[1 + Math.floor(j / 3)][j % 3] += eps
      const next = residuals(shifted, association)
      for (let k = 0; k < r.length; k++) jacobian[k][j] = (next[k] - r[k]) / eps
    }
    const hessian = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) =>
      sum(jacobian.map(row => row[i] * row[j])) + Number(i === j) * 1e-5))
    const gradient = Array.from({length: n}, (_, i) => -sum(jacobian.map((row, k) => row[i] * r[k])))
    const delta = solve(hessian, gradient)
    let accepted = false
    for (const alpha of [1, .5, .25, .1, .01, .001]) {
      const candidate = poses.map((p, i) => i === 0 ? [...p] as Pose : p.map((v, k) =>
        k === 2 ? wrap(v + alpha * delta[(i - 1) * 3 + k]) : v + alpha * delta[(i - 1) * 3 + k]) as Pose)
      const cost = loopMetrics(candidate, association).cost
      if (cost <= history.at(-1)! + 1e-10) {
        poses = candidate
        snapshots.push(copy(poses))
        history.push(cost)
        accepted = true
        break
      }
    }
    if (!accepted || Math.abs(history.at(-2)! - history.at(-1)!) < 1e-8) break
  }
  return {snapshots, history, after: copy(poses), constraint: loopConstraint(association)}
}

/** Interpolation is only for display between actual optimizer iterates. */
export function interpolateLoop(a: Pose[], b: Pose[], t: number): Pose[] {
  return a.map((p, i) => [p[0] + t * (b[i][0] - p[0]), p[1] + t * (b[i][1] - p[1]), wrap(p[2] + t * wrap(b[i][2] - p[2]))])
}
