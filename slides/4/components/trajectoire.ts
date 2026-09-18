// Helpers de trajectoire partagés par OdometryDriftAnimation et SimToRealAnimation.
// Tout est en coordonnées d'écran SVG (y vers le bas), pas en mètres.

export type Pt = [number, number]

/**
 * Rééchantillonne une polyligne en `n` points équidistants le long du parcours.
 * Sans ça, les coins concentrent les points et la dérive s'applique de travers.
 */
export function resample(corners: Pt[], n: number): Pt[] {
  const segLen: number[] = []
  let total = 0
  for (let i = 0; i < corners.length - 1; i++) {
    const d = Math.hypot(
      corners[i + 1][0] - corners[i][0],
      corners[i + 1][1] - corners[i][1],
    )
    segLen.push(d)
    total += d
  }

  const out: Pt[] = []
  for (let k = 0; k < n; k++) {
    let target = (total * k) / (n - 1)
    let i = 0
    while (i < segLen.length - 1 && target > segLen[i]) {
      target -= segLen[i]
      i++
    }
    const t = segLen[i] === 0 ? 0 : target / segLen[i]
    out.push([
      corners[i][0] + t * (corners[i + 1][0] - corners[i][0]),
      corners[i][1] + t * (corners[i + 1][1] - corners[i][1]),
    ])
  }
  return out
}

/** Rotation + mise à l'échelle autour d'un centre. C'est le modèle de dérive :
 *  une erreur de cap qui s'accumule, plus un biais d'échelle sur la distance. */
export function rotScaleAbout(p: Pt, cx: number, cy: number, rad: number, s: number): Pt {
  const dx = (p[0] - cx) * s
  const dy = (p[1] - cy) * s
  return [
    cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  ]
}

/** Bruit déterministe et reproductible : pas de Math.random(), sinon la figure
 *  change à chaque rechargement et l'enseignant ne peut plus la commenter. */
export function bruit(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296 - 0.5
  }
}

/** Convertit une liste de points en attribut `points` de <polyline>. */
export function toPoints(pts: Pt[]): string {
  return pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
}
