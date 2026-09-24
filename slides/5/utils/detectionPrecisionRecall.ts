import {iou} from './learningMath.ts'

export type DetectionBox = [number, number, number, number]
export type ScoredDetection = {id: string; score: number; box: DetectionBox}
export type DetectionAnnotation = {id: string; box: DetectionBox}

// Coordinates on the 1536 × 1024 synthetic street image. One evaluated class: pedestrian.
export const prSceneAnnotations: DetectionAnnotation[] = [
  {id: 'P1', box: [146, 124, 261, 725]},
  {id: 'P2', box: [850, 219, 192, 562]},
  {id: 'P3', box: [1179, 319, 108, 286]},
]
export const prScenePredictions: ScoredDetection[] = [
  {id: 'A', score: .95, box: [145, 120, 266, 734]},
  {id: 'B', score: .90, box: [566, 416, 61, 405]},
  {id: 'C', score: .80, box: [844, 214, 205, 572]},
  {id: 'D', score: .60, box: [154, 136, 263, 716]},
  {id: 'E', score: .40, box: [1173, 315, 120, 293]},
]

/** Evaluate one class in one image: descending scores, at most one match per annotation.
 * No ignored/crowd annotations or NMS here; the candidate list stays fixed during the sweep.
 */
export function evaluateDetections(predictions: ScoredDetection[], annotations: DetectionAnnotation[], threshold: number, iouThreshold = .5) {
  const used = new Set<string>()
  const selected = predictions.filter(p => p.score >= threshold).slice().sort((a,b) => b.score - a.score)
  const detections = selected.map(prediction => {
    const overlaps = annotations.map(annotation => ({annotation, overlap: iou(prediction.box, annotation.box)}))
      .sort((a,b) => b.overlap - a.overlap)
    const match = overlaps.find(row => row.overlap >= iouThreshold && !used.has(row.annotation.id))
    if (match) {
      used.add(match.annotation.id)
      return {...prediction, kind: 'tp' as const, annotationId: match.annotation.id, overlap: match.overlap}
    }
    return {...prediction, kind: overlaps.some(row => row.overlap >= iouThreshold) ? 'duplicate' as const : 'background' as const, annotationId: null, overlap: overlaps[0]?.overlap ?? 0}
  })
  const tp = used.size, fp = detections.length - tp, fn = annotations.length - tp
  return {
    detections, tp, fp, fn,
    precision: detections.length ? tp / detections.length : null,
    recall: annotations.length ? tp / annotations.length : null,
    missed: annotations.filter(annotation => !used.has(annotation.id)),
  }
}

/** Raw empirical PR points. Empty predictions have undefined precision, so no artificial origin. */
export function detectionPrecisionRecallCurve(predictions: ScoredDetection[], annotations: DetectionAnnotation[], iouThreshold = .5) {
  const scores = [...new Set(predictions.map(p => p.score))].sort((a,b) => b-a)
  return scores.map(threshold => ({threshold, ...evaluateDetections(predictions, annotations, threshold, iouThreshold)}))
}
