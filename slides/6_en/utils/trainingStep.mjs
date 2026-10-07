// A deterministic, genuinely optimized toy model, not a trained vision model.
export const imageValues = [
  .12, .22, .32, .42,
  .25, .55, .80, .65,
  .40, .70, .90, .75,
  .50, .62, .72, .85,
]
export const maskedIndices = [5, 6, 9, 10]
export const initialParameters = { theta: .6, omega: .7 }

export function visibleContext(index) {
  const row = Math.floor(index / 4), col = index % 4
  const neighbors = [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
    .filter(([r,c]) => r>=0 && r<4 && c>=0 && c<4)
    .map(([r,c]) => 4*r+c).filter(k => !maskedIndices.includes(k))
  return neighbors.reduce((s,k) => s+imageValues[k],0)/neighbors.length
}
export function forward(parameters) {
  const contexts = maskedIndices.map(visibleContext)
  const targets = maskedIndices.map(k => imageValues[k])
  const features = contexts.map(c => parameters.theta*c)
  const predictions = features.map(z => parameters.omega*z)
  const residuals = predictions.map((p,i) => p-targets[i])
  const loss = residuals.reduce((s,e) => s+e*e,0)/targets.length
  const gradient = {
    theta: 2*residuals.reduce((s,e,i) => s+e*parameters.omega*contexts[i],0)/targets.length,
    omega: 2*residuals.reduce((s,e,i) => s+e*features[i],0)/targets.length,
  }
  return { contexts, targets, features, predictions, residuals, loss, gradient }
}
export function update(parameters, eta) {
  const {gradient} = forward(parameters)
  return { theta: parameters.theta-eta*gradient.theta, omega: parameters.omega-eta*gradient.omega }
}
