<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Implicite vs explicite ────────────────────────────────────────
// Implicite : surface = zéro-niveau de f. Toute opération CSG est UNE
//   LIGNE de maths : union = min(f₁,f₂), intersection = max(f₁,f₂),
//   soustraction = max(f₁,−f₂), mélange lisse = smooth-min. Le contour
//   (extrait par marching squares, honnête) change de topologie seul.
// Explicite : polygones de sommets. La même union exige de calculer
//   les intersections d'arêtes puis de RE-MAILLER ; le mélange lisse
//   n'a aucun équivalent polygonal direct. Et savoir si un point est
//   dedans exige d'itérer TOUTES les arêtes (point-in-polygon),
//   alors que l'implicite répond avec le SIGNE de f(q) en O(1).
const rad = ref(1.0)
const iso = ref(0)
const nVerts = ref(8)
type Op = 'none' | 'union' | 'inter' | 'sub' | 'smooth'
const op = ref<Op>('union')
const smoothK = ref(0.45)
const disc2 = ref({ x: 1.1, y: 0.5 })  // centre de la forme 2 (draggable)
const D2R = 0.75
const query = ref<{ x: number; y: number } | null>({ x: 0.4, y: 0.9 })
const showExtracted = ref(false)
const extractRes = ref(14)

const OPS: { id: Op; label: string; formula: string }[] = [
  { id: 'none', label: '1 forme', formula: 'f(x,y) = x²+y²−r²' },
  { id: 'union', label: '∪ union', formula: 'f = min(f₁, f₂)' },
  { id: 'inter', label: '∩ inter.', formula: 'f = max(f₁, f₂)' },
  { id: 'sub', label: '∖ soustr.', formula: 'f = max(f₁, −f₂)' },
  { id: 'smooth', label: '∪ lisse', formula: 'f = smin(f₁, f₂, k)' },
]
const opFormula = computed(() => OPS.find(o => o.id === op.value)!.formula)
const twoShapes = computed(() => op.value !== 'none')

const HW = 26, HH = 26
const D = 2.1
const cxL = 128, cyL = 116, cxR = 425, SCALE = 84 / D
const wx = (x: number, cx: number) => cx + x * SCALE
const wy = (y: number) => cyL - y * SCALE

function f1(x: number, y: number) { return x * x + y * y - rad.value * rad.value }
function f2(x: number, y: number) { return (x - disc2.value.x) ** 2 + (y - disc2.value.y) ** 2 - D2R * D2R }
function smin(a: number, b: number, k: number) {
  const h = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / k))
  return b * (1 - h) + a * h - k * h * (1 - h)
}
function f(x: number, y: number) {
  const a = f1(x, y)
  if (op.value === 'none') return a
  const b = f2(x, y)
  if (op.value === 'union') return Math.min(a, b)
  if (op.value === 'inter') return Math.max(a, b)
  if (op.value === 'sub') return Math.max(a, -b)
  return smin(a, b, smoothK.value)
}

// Heatmap de f
const heat = computed(() => {
  const cells: { x: number; y: number; fill: string }[] = []
  for (let i = 0; i < HW; i++) for (let j = 0; j < HH; j++) {
    const x = -D + (i + 0.5) / HW * 2 * D
    const y = -D + (j + 0.5) / HH * 2 * D
    const v = f(x, y) - iso.value
    const t = Math.max(-1, Math.min(1, v / 3))
    const fill = t < 0
      ? `rgb(${Math.round(207 + t * 0)},${Math.round(28 + (1 + t) * 200)},${Math.round(36 + (1 + t) * 200)})`
      : `rgb(${Math.round(200 - t * 200)},${Math.round(209 - t * 20)},242)`
    cells.push({ x: wx(x, cxL) - (84 / HW), y: wy(y) - (84 / HH), fill })
  }
  return cells
})
const cellW = (2 * 84) / HW + 0.6

// ── Marching squares générique : segments du contour f = iso ─────
const CASES: number[][][] = [
  [], [[3,2]], [[1,2]], [[3,1]], [[0,1]], [[0,1],[2,3]], [[0,2]], [[0,3]],
  [[0,3]], [[0,2]], [[0,3],[1,2]], [[0,1]], [[3,1]], [[1,2]], [[3,2]], [],
]
function msWorldSegs(res: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const node = (i: number, j: number) => ({ x: -D + i / (res - 1) * 2 * D, y: -D + j / (res - 1) * 2 * D })
  const val: number[][] = []
  for (let i = 0; i < res; i++) {
    val[i] = []
    for (let j = 0; j < res; j++) { const p = node(i, j); val[i][j] = f(p.x, p.y) - iso.value }
  }
  const segs: { x1: number; y1: number; x2: number; y2: number }[] = []
  const corners = (i: number, j: number) => [
    [i, j + 1], [i + 1, j + 1], [i + 1, j], [i, j],  // TL TR BR BL (y vers le haut)
  ]
  const edgePairs = [[0, 1], [1, 2], [3, 2], [0, 3]]  // haut droite bas gauche
  for (let i = 0; i < res - 1; i++) for (let j = 0; j < res - 1; j++) {
    const cs = corners(i, j)
    const inside = cs.map(([ci, cj]) => val[ci][cj] < 0)
    const ci = (inside[0] ? 8 : 0) | (inside[1] ? 4 : 0) | (inside[2] ? 2 : 0) | (inside[3] ? 1 : 0)
    for (const [ea, eb] of CASES[ci]) {
      const interp = (e: number) => {
        const [a, b] = edgePairs[e]
        const A = cs[a], B = cs[b]
        const fA = val[A[0]][A[1]], fB = val[B[0]][B[1]]
        const t = Math.abs(fB - fA) < 1e-12 ? 0.5 : -fA / (fB - fA)
        const pA = node(A[0], A[1]), pB = node(B[0], B[1])
        return { x: pA.x + t * (pB.x - pA.x), y: pA.y + t * (pB.y - pA.y) }
      }
      const p = interp(ea), q = interp(eb)
      segs.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y })
    }
  }
  return segs
}
const toScreen = (s: { x1: number; y1: number; x2: number; y2: number }, cx: number) =>
  ({ x1: wx(s.x1, cx), y1: wy(s.y1), x2: wx(s.x2, cx), y2: wy(s.y2) })

// Contour du panneau implicite (haute résolution)
const contourWorld = computed(() => msWorldSegs(34))
const contourSegs = computed(() => contourWorld.value.map(s => toScreen(s, cxL)))
// Maillage extrait pour le panneau explicite (résolution choisie)
const extractedWorld = computed(() => showExtracted.value ? msWorldSegs(extractRes.value) : [])
const extractedSegs = computed(() => extractedWorld.value.map(s => toScreen(s, cxR)))

// Flèches ∇f (différences finies) sur quelques points du contour
const gradArrows = computed(() => {
  const segs = contourWorld.value
  const arrows: { x1: number; y1: number; x2: number; y2: number }[] = []
  const step = Math.max(1, Math.floor(segs.length / 10))
  const h = 0.02
  for (let k = 0; k < segs.length; k += step) {
    const sg = segs[k]
    const mx = (sg.x1 + sg.x2) / 2, my = (sg.y1 + sg.y2) / 2
    const gx = (f(mx + h, my) - f(mx - h, my)) / (2 * h)
    const gy = (f(mx, my + h) - f(mx, my - h)) / (2 * h)
    const n = Math.hypot(gx, gy) || 1
    arrows.push({
      x1: wx(mx, cxL), y1: wy(my),
      x2: wx(mx + gx / n * 0.28, cxL), y2: wy(my + gy / n * 0.28),
    })
  }
  return arrows
})

// ── Explicite : polygones sources ─────────────────────────────────
function discPoly(cx0: number, cy0: number, r: number) {
  const n = nVerts.value
  return Array.from({ length: n }, (_, k) => {
    const a = k / n * 2 * Math.PI
    return { x: cx0 + r * Math.cos(a), y: cy0 + r * Math.sin(a) }
  })
}
const poly1 = computed(() => discPoly(0, 0, rad.value))
const poly2 = computed(() => discPoly(disc2.value.x, disc2.value.y, D2R))
const polyStr = (pts: { x: number; y: number }[]) =>
  pts.map(p => `${wx(p.x, cxR).toFixed(1)},${wy(p.y).toFixed(1)}`).join(' ')

// Intersections d'arêtes entre les 2 polygones = le travail du re-maillage
function segInt(a: any, b: any, c: any, d: any): { x: number; y: number } | null {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x)
  if (Math.abs(den) < 1e-12) return null
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}
const polyIntersections = computed(() => {
  if (!twoShapes.value || op.value === 'smooth' || showExtracted.value) return []
  const pts: { x: number; y: number }[] = []
  const p1 = poly1.value, p2 = poly2.value
  for (let i = 0; i < p1.length; i++) for (let j = 0; j < p2.length; j++) {
    const it = segInt(p1[i], p1[(i + 1) % p1.length], p2[j], p2[(j + 1) % p2.length])
    if (it) pts.push(it)
  }
  return pts
})

// ── Requête : signe de f (implicite) vs itération des arêtes ─────
function pip(q: { x: number; y: number }, pts: { x: number; y: number }[]): { inside: boolean; crossings: { x: number; y: number }[] } {
  let inside = false
  const crossings: { x: number; y: number }[] = []
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j]
    if ((a.y > q.y) !== (b.y > q.y)) {
      const xCross = a.x + (q.y - a.y) / (b.y - a.y) * (b.x - a.x)
      if (xCross > q.x) { inside = !inside; crossings.push({ x: xCross, y: q.y }) }
    }
  }
  return { inside, crossings }
}
const queryResult = computed(() => {
  if (!query.value) return null
  const q = query.value
  const fVal = f(q.x, q.y) - iso.value
  if (showExtracted.value) {
    // parité des croisements du rayon avec le maillage extrait
    const crossings: { x: number; y: number }[] = []
    for (const s of extractedWorld.value) {
      if ((s.y1 > q.y) !== (s.y2 > q.y)) {
        const xc = s.x1 + (q.y - s.y1) / (s.y2 - s.y1) * (s.x2 - s.x1)
        if (xc > q.x) crossings.push({ x: xc, y: q.y })
      }
    }
    return {
      fVal, insideImplicit: fVal < 0,
      insideExplicit: (crossings.length % 2 === 1) as boolean | null,
      crossings, edges: extractedWorld.value.length,
    }
  }
  const r1 = pip(q, poly1.value)
  const r2 = twoShapes.value ? pip(q, poly2.value) : { inside: false, crossings: [] }
  let insideExplicit: boolean | null
  switch (op.value) {
    case 'none': insideExplicit = r1.inside; break
    case 'union': insideExplicit = r1.inside || r2.inside; break
    case 'inter': insideExplicit = r1.inside && r2.inside; break
    case 'sub': insideExplicit = r1.inside && !r2.inside; break
    default: insideExplicit = null  // mélange lisse : pas d'équivalent polygonal
  }
  return {
    fVal, insideImplicit: fVal < 0, insideExplicit,
    crossings: [...r1.crossings, ...r2.crossings],
    edges: nVerts.value * (twoShapes.value ? 2 : 1),
  }
})

// ── Pointeur : glisser la forme 2, sinon cliquer = requête ────────
const svgRef = ref<SVGSVGElement | null>(null)
let dragging = false
function evtWorld(e: PointerEvent): { xw: number; yw: number; panel: 'L' | 'R' } | null {
  if (!svgRef.value) return null
  const r = svgRef.value.getBoundingClientRect()
  const sx = (e.clientX - r.left) * (560 / r.width)
  const sy = (e.clientY - r.top) * (215 / r.height)
  const panel = sx < 277 ? 'L' : 'R'
  const cx = panel === 'L' ? cxL : cxR
  const xw = (sx - cx) / SCALE, yw = (cyL - sy) / SCALE
  if (Math.abs(xw) > D || Math.abs(yw) > D) return null
  return { xw, yw, panel }
}
function onDown(e: PointerEvent) {
  const p = evtWorld(e)
  if (!p) return
  if (twoShapes.value && p.panel === 'L'
    && Math.hypot(p.xw - disc2.value.x, p.yw - disc2.value.y) < 0.4) {
    dragging = true
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    return
  }
  query.value = { x: p.xw, y: p.yw }
}
function onMove(e: PointerEvent) {
  if (!dragging) return
  const p = evtWorld(e)
  if (p) disc2.value = { x: Math.max(-D + 0.2, Math.min(D - 0.2, p.xw)), y: Math.max(-D + 0.2, Math.min(D - 0.2, p.yw)) }
}
function onUp() { dragging = false }

const explicitCaption = computed(() => {
  if (showExtracted.value)
    return `maillage extrait : ${extractedWorld.value.length} segments — la fidélité dépend de la résolution`
  switch (op.value) {
    case 'none': return 'géométrie encodée directement (liste de sommets)'
    case 'smooth': return 'mélange lisse : AUCUN équivalent polygonal direct — il faut ré-échantillonner'
    default: return `re-maillage requis : ${polyIntersections.value.length} intersections d'arêtes à calculer, sommets à trier/supprimer`
  }
})
</script>

<template>
  <div class="ie-wrap">
    <svg ref="svgRef" viewBox="0 0 560 215" class="ie-svg" style="cursor:crosshair; touch-action:none"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <!-- ══════ GAUCHE : implicite ══════ -->
      <rect x="0" y="0" width="270" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="135" y="13" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Implicite : {{ opFormula }}
      </text>

      <!-- heatmap de f -->
      <rect v-for="(c, i) in heat" :key="i" :x="c.x" :y="c.y" :width="cellW" :height="cellW" :fill="c.fill"/>
      <!-- contour f = iso (marching squares) -->
      <line v-for="(sg, i) in contourSegs" :key="`c${i}`"
        :x1="sg.x1" :y1="sg.y1" :x2="sg.x2" :y2="sg.y2"
        stroke="#CF1C24" stroke-width="2.2" stroke-linecap="round"/>
      <!-- gradient ∇f -->
      <line v-for="(a, i) in gradArrows" :key="`g${i}`"
        :x1="a.x1" :y1="a.y1" :x2="a.x2" :y2="a.y2"
        stroke="#334155" stroke-width="1" style="opacity:0.5"/>

      <!-- poignée de la forme 2 (draggable) -->
      <g v-if="twoShapes" style="cursor:grab">
        <circle :cx="wx(disc2.x, cxL)" :cy="wy(disc2.y)" r="7" fill="#F15A22" style="opacity:0.25"/>
        <circle :cx="wx(disc2.x, cxL)" :cy="wy(disc2.y)" r="3" fill="#F15A22" stroke="white" stroke-width="1.2"/>
        <text :x="wx(disc2.x, cxL)" :y="wy(disc2.y) - 9" text-anchor="middle"
          style="font-size:6.5px;fill:#F15A22;font-weight:700;font-family:sans-serif">f₂ ⤢ glisser</text>
      </g>

      <!-- point de requête (implicite) -->
      <g v-if="query && queryResult">
        <circle :cx="wx(query.x, cxL)" :cy="wy(query.y)" r="5"
          :fill="queryResult.insideImplicit ? '#CF1C24' : '#1e40af'" stroke="white" stroke-width="2"/>
        <text :x="wx(query.x, cxL)" :y="wy(query.y) - 9" text-anchor="middle"
          :style="`font-size:7.5px;font-weight:700;font-family:monospace;fill:${queryResult.insideImplicit ? '#CF1C24' : '#1e40af'}`">
          f(q)={{ queryResult.fVal.toFixed(2) }}
        </text>
      </g>

      <!--text x="135" y="200" text-anchor="middle" style="font-size:7px;fill:#CF1C24;font-family:sans-serif">
        contour = {x | f(x)=iso} · flèches = ∇f · CSG = une ligne de maths
      </text-->
      <text x="135" y="208" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        requête : le SIGNE de f(q) répond en O(1)
      </text>

      <!-- ══════ DROITE : explicite ══════ -->
      <rect x="277" y="0" width="281" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="417" y="13" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ showExtracted
          ? `Explicite : maillage extrait (${extractedSegs.length} segments)`
          : `Explicite : ${nVerts * (twoShapes ? 2 : 1)} sommets + arêtes` }}
      </text>

      <!-- polygones sources -->
      <template v-if="!showExtracted">
        <polygon :points="polyStr(poly1)" fill="#25B34B" stroke="#25B34B" stroke-width="2" style="fill-opacity:0.12"/>
        <circle v-for="(p, i) in poly1" :key="`v${i}`" :cx="wx(p.x, cxR)" :cy="wy(p.y)" r="3.5"
          fill="#25B34B" stroke="white" stroke-width="1"/>
        <g v-if="twoShapes">
          <polygon :points="polyStr(poly2)" fill="#F15A22" stroke="#F15A22" stroke-width="2"
            :stroke-dasharray="op === 'sub' ? '5,3' : 'none'" style="fill-opacity:0.12"/>
          <circle v-for="(p, i) in poly2" :key="`w${i}`" :cx="wx(p.x, cxR)" :cy="wy(p.y)" r="3.5"
            fill="#F15A22" stroke="white" stroke-width="1"/>
        </g>
        <!-- intersections d'arêtes = le travail que le re-maillage devra faire -->
        <g v-for="(it, i) in polyIntersections" :key="`it${i}`">
          <circle :cx="wx(it.x, cxR)" :cy="wy(it.y)" r="4" fill="none" stroke="#F59E0B" stroke-width="1.8"/>
          <circle :cx="wx(it.x, cxR)" :cy="wy(it.y)" r="1.3" fill="#F59E0B"/>
        </g>
      </template>
      <!-- maillage extrait du champ implicite -->
      <template v-else>
        <line v-for="(sg, i) in extractedSegs" :key="`e${i}`"
          :x1="sg.x1" :y1="sg.y1" :x2="sg.x2" :y2="sg.y2"
          stroke="#25B34B" stroke-width="2" stroke-linecap="round"/>
        <g v-for="(sg, i) in extractedSegs" :key="`ev${i}`">
          <circle :cx="sg.x1" :cy="sg.y1" r="2" fill="#25B34B" stroke="white" stroke-width="0.8"/>
          <circle :cx="sg.x2" :cy="sg.y2" r="2" fill="#25B34B" stroke="white" stroke-width="0.8"/>
        </g>
      </template>

      <!-- point de requête (explicite) : rayon horizontal + croisements -->
      <g v-if="query && queryResult">
        <line :x1="wx(query.x, cxR)" :y1="wy(query.y)" :x2="cxR + D * SCALE" :y2="wy(query.y)"
          stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>
        <circle v-for="(c, i) in queryResult.crossings" :key="`x${i}`"
          :cx="wx(c.x, cxR)" :cy="wy(c.y)" r="3" fill="none" stroke="#CF1C24" stroke-width="1.5"/>
        <circle :cx="wx(query.x, cxR)" :cy="wy(query.y)" r="5"
          :fill="queryResult.insideExplicit === null ? '#94a3b8' : queryResult.insideExplicit ? '#CF1C24' : '#1e40af'"
          stroke="white" stroke-width="2"/>
        <text v-if="queryResult.insideExplicit === null"
          :x="wx(query.x, cxR)" :y="wy(query.y) + 2.5" text-anchor="middle"
          style="font-size:7px;fill:white;font-weight:700;font-family:monospace">?</text>
      </g>

      <text x="417" y="200" text-anchor="middle"
        :style="`font-size:7px;font-family:sans-serif;fill:${op === 'smooth' && !showExtracted ? '#CF1C24' : '#25B34B'}`">
        {{ explicitCaption }}
      </text>
      <text x="417" y="208" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        requête : test point-in-polygon → itérer les {{ queryResult ? queryResult.edges : 0 }} arêtes
      </text>
    </svg>

    <div class="ie-controls">
      <span class="ie-ops">
        <button v-for="o in OPS" :key="o.id" class="ie-btn" :class="{ on: op === o.id }" @click="op = o.id">
          {{ o.label }}
        </button>
      </span>
      <label v-if="op === 'smooth'" class="ie-sl">k <strong>{{ smoothK.toFixed(2) }}</strong>
        <input type="range" v-model.number="smoothK" min="0.05" max="1.2" step="0.05"/></label>
      <label class="ie-sl">r <strong>{{ rad.toFixed(2) }}</strong>
        <input type="range" v-model.number="rad" min="0.4" max="1.6" step="0.05"/></label>
      <label class="ie-sl">iso <strong>{{ iso.toFixed(1) }}</strong>
        <input type="range" v-model.number="iso" min="-0.8" max="1.5" step="0.1"/></label>
      <label v-if="!showExtracted" class="ie-sl">sommets <strong>{{ nVerts }}</strong>
        <input type="range" v-model.number="nVerts" min="3" max="32" step="1"/></label>
      <button class="ie-btn ie-extract" :class="{ on: showExtracted }" @click="showExtracted = !showExtracted">
        {{ showExtracted ? '↩ polygones sources' : '⛏ Extraire le maillage' }}
      </button>
      <label v-if="showExtracted" class="ie-sl">résolution <strong>{{ extractRes }}</strong>
        <input type="range" v-model.number="extractRes" min="6" max="40" step="1"/></label>
      <span class="ie-info">cliquer = point de requête · glisser f₂ (panneau gauche)</span>
    </div>
  </div>
</template>

<style scoped>
.ie-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ie-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ie-controls { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ie-ops { display: flex; gap: 0; }
.ie-ops .ie-btn { border-radius: 0; border-left-width: 0; }
.ie-ops .ie-btn:first-child { border-radius: 5px 0 0 5px; border-left-width: 1.5px; }
.ie-ops .ie-btn:last-child { border-radius: 0 5px 5px 0; }
.ie-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.7rem; color: #334155; }
.ie-sl strong { color: #CF1C24; min-width: 26px; display: inline-block; }
.ie-sl input[type=range] { width: 70px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ie-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.7rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.ie-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.ie-extract { border-radius: 5px; }
.ie-info { font-size: 0.62rem; color: #64748b; font-style: italic; }
</style>
