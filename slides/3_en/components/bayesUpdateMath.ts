export interface Gaussian {
  mean: number
  variance: number
}

export interface Measurement {
  value: number
  sigma: number
}

// Static scalar state: z_i = x + epsilon_i, independent Gaussian noise.
// Accumulate information from the original prior; never round intermediate values.
export function posteriorFrom(initial: Gaussian, measurements: readonly Measurement[]): Gaussian {
  let precision = 1 / initial.variance
  let information = initial.mean * precision
  for (const { value, sigma } of measurements) {
    const measurementPrecision = 1 / sigma ** 2
    precision += measurementPrecision
    information += value * measurementPrecision
  }
  return { mean: information / precision, variance: 1 / precision }
}

export function gaussianDensity(x: number, distribution: Gaussian): number {
  return Math.exp(-0.5 * (x - distribution.mean) ** 2 / distribution.variance)
    / Math.sqrt(2 * Math.PI * distribution.variance)
}
