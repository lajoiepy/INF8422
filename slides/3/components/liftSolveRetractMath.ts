// A one-dimensional manifold embedded in R³, not a rotation group.
export type Vec3 = [number, number, number]
export const PITCH = 0.35
export const TARGET_T = 1.35
export const helix = (t: number): Vec3 => [Math.cos(t), Math.sin(t), PITCH * t]
export const tangent = (t: number): Vec3 => [-Math.sin(t), Math.cos(t), PITCH]
export const dot = (a: Vec3, b: Vec3) => a.reduce((s, v, i) => s + v * b[i], 0)
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const addScaled = (x: Vec3, v: Vec3, scale: number): Vec3 => [x[0] + scale * v[0], x[1] + scale * v[1], x[2] + scale * v[2]]
export const target = helix(TARGET_T)
export function cost(t: number) {
  const r = sub(helix(t), target)
  return dot(r, r) / 2
}
// R_{q(t)}(J δ) = q(t + δ): identity at zero and derivative J at zero.
export const retract = (t: number, delta: number) => helix(t + delta)
export function solveStep(t: number) {
  const x = helix(t), J = tangent(t), r = sub(x, target)
  const hessian = dot(J, J), gradient = dot(J, r)
  const delta = -gradient / hessian
  return { x, J, r, hessian, gradient, delta, trial: addScaled(x, J, delta), next: retract(t, delta), nextT: t + delta }
}
// Orthographic orbit camera; the same projection is used for every object.
export function project(p: Vec3, yaw: number, elevation: number) {
  const u = Math.cos(yaw) * p[0] - Math.sin(yaw) * p[1]
  const v = Math.sin(yaw) * p[0] + Math.cos(yaw) * p[1]
  return {
    x: 245 + 94 * u,
    y: 176 + 94 * (Math.sin(elevation) * v - Math.cos(elevation) * p[2]),
    depth: Math.cos(elevation) * v + Math.sin(elevation) * p[2],
  }
}
