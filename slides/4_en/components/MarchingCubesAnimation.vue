<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js'

// ── Marching Squares pas-à-pas (analogue 2D exact de Marching Cubes) ──
// Champ implicite synthétique : minimum de distances signées aux primitives.
// Le signe décrit leur union, mais la distance intérieure n’est pas exacte partout.
// Ce champ échantillonné illustre la même extraction que sur un TSDF fusionné. L'algorithme « marche » case par case :
// signes des 4 coins → code binaire → table (16 cas) → segments
// interpolés. En 3D : 8 coins → 256 cas, sinon identique.
const NR = 8, NC = 8            // nœuds ; (NR-1)×(NC-1) = 49 cases
const iso = ref(0)
const seed = ref(3)

// ── SDF : union (min) de 2 disques + 1 rectangle arrondi ──────────
interface Shape { kind: 'disc' | 'box'; cx: number; cy: number; r: number; hx?: number; hy?: number }
function makeLcg(s0: number) {
  let s = s0
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
}
const shapes = computed<Shape[]>(() => {
  const lcg = makeLcg(seed.value * 7919 + 13)
  const sh: Shape[] = []
  for (let k = 0; k < 2; k++)
    sh.push({ kind: 'disc', cx: 1.3 + lcg() * 4.4, cy: 1.3 + lcg() * 4.4, r: 0.9 + lcg() * 1.0 })
  sh.push({ kind: 'box', cx: 1.8 + lcg() * 3.4, cy: 1.8 + lcg() * 3.4, r: 0.35, hx: 0.5 + lcg() * 1.0, hy: 0.4 + lcg() * 0.8 })
  return sh
})
function sdf(x: number, y: number): number {
  let d = Infinity
  for (const s of shapes.value) {
    if (s.kind === 'disc') d = Math.min(d, Math.hypot(x - s.cx, y - s.cy) - s.r)
    else {
      const qx = Math.abs(x - s.cx) - s.hx!, qy = Math.abs(y - s.cy) - s.hy!
      d = Math.min(d, Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - s.r)
    }
  }
  return d
}
// Champ échantillonné aux nœuds (= voxels stockant la distance signée)
const field = computed<number[][]>(() => {
  const g: number[][] = []
  for (let r = 0; r < NR; r++) { g[r] = []; for (let c = 0; c < NC; c++) g[r][c] = sdf(c, r) }
  return g
})
const inside = (r: number, c: number) => field.value[r][c] < iso.value

// ── Layout grille ─────────────────────────────────────────────────
const CS = 24, OX = 40, OY = 26
const nx = (c: number) => OX + c * CS
const ny = (r: number) => OY + r * CS

// Table exacte des 16 cas (bit : TL*8+TR*4+BR*2+BL*1) → segments [arêteA,arêteB]
// Arêtes : 0=haut(TL-TR) 1=droite(TR-BR) 2=bas(BL-BR) 3=gauche(TL-BL)
const CASES: number[][][] = [
  [], [[3,2]], [[1,2]], [[3,1]], [[0,1]], [[0,1],[2,3]], [[0,2]], [[0,3]],
  [[0,3]], [[0,2]], [[0,3],[1,2]], [[0,1]], [[3,1]], [[1,2]], [[3,2]], [],
]
const EDGE_CORNERS: [string, string][] = [['TL','TR'], ['TR','BR'], ['BL','BR'], ['TL','BL']]
function cornersOf(r: number, c: number) {
  return { TL: { r, c }, TR: { r, c: c + 1 }, BR: { r: r + 1, c: c + 1 }, BL: { r: r + 1, c } }
}
// t d'interpolation sur une arête (0 → coin A, 1 → coin B)
function edgeT(r: number, c: number, e: number): number {
  const cs = cornersOf(r, c)
  const A = cs[EDGE_CORNERS[e][0] as keyof typeof cs], B = cs[EDGE_CORNERS[e][1] as keyof typeof cs]
  const fA = field.value[A.r][A.c], fB = field.value[B.r][B.c]
  return Math.abs(fB - fA) < 1e-9 ? 0.5 : (iso.value - fA) / (fB - fA)
}
function edgePoint(r: number, c: number, e: number): { x: number; y: number } {
  const cs = cornersOf(r, c)
  const A = cs[EDGE_CORNERS[e][0] as keyof typeof cs], B = cs[EDGE_CORNERS[e][1] as keyof typeof cs]
  const t = edgeT(r, c, e)
  return { x: nx(A.c) + t * (nx(B.c) - nx(A.c)), y: ny(A.r) + t * (ny(B.r) - ny(A.r)) }
}

// ── Décodage par case ─────────────────────────────────────────────
interface CellInfo {
  r: number; c: number; ci: number; bits: boolean[]
  segs: { x1: number; y1: number; x2: number; y2: number }[]
  edges: [number, number][]
}
function decodeCell(r: number, c: number): CellInfo {
  const bits = [inside(r, c), inside(r, c + 1), inside(r + 1, c + 1), inside(r + 1, c)]
  const ci = (bits[0] ? 8 : 0) | (bits[1] ? 4 : 0) | (bits[2] ? 2 : 0) | (bits[3] ? 1 : 0)
  const segs = CASES[ci].map(([ea, eb]) => {
    const p = edgePoint(r, c, ea), q = edgePoint(r, c, eb)
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y }
  })
  return { r, c, ci, bits, segs, edges: CASES[ci] as [number, number][] }
}
const TOTAL = (NR - 1) * (NC - 1)
const allCells = computed<CellInfo[]>(() => {
  const cells: CellInfo[] = []
  for (let r = 0; r < NR - 1; r++) for (let c = 0; c < NC - 1; c++) cells.push(decodeCell(r, c))
  return cells
})

// ── Balayage « marching » ─────────────────────────────────────────
const marchStep = ref(TOTAL)          // TOTAL = contour complet affiché
const running = ref(false)
let timer: ReturnType<typeof setInterval> | null = null
const marching = computed(() => marchStep.value < TOTAL)
const shownCells = computed(() => allCells.value.slice(0, marchStep.value))
const currentCell = computed<CellInfo | null>(() =>
  marching.value ? allCells.value[marchStep.value] : null)

function startMarch() {
  marchStep.value = 0
  running.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (!running.value) return
    marchStep.value++
    if (marchStep.value >= TOTAL) stopMarch()
  }, 140)
}
function stopMarch() {
  running.value = false
  if (timer) { clearInterval(timer); timer = null }
}
function togglePause() { running.value = !running.value }
function stepOnce() {
  if (marchStep.value >= TOTAL) marchStep.value = 0
  else marchStep.value++
  running.value = false
}
function randomize() { seed.value++; stopMarch(); marchStep.value = TOTAL }

// ── Loupe : case survolée, sinon case en cours de balayage ────────
const hovered = ref<{ r: number; c: number } | null>(null)
const loupe = computed<CellInfo | null>(() => {
  if (hovered.value) return decodeCell(hovered.value.r, hovered.value.c)
  return currentCell.value
})
// Géométrie de la loupe (case agrandie)
const LX = 288, LY = 42, LS = 86
const L_CORNERS = [
  { key: 'TL', x: LX, y: LY, tx: LX - 4, ty: LY - 5, anchor: 'end' },
  { key: 'TR', x: LX + LS, y: LY, tx: LX + LS + 4, ty: LY - 5, anchor: 'start' },
  { key: 'BR', x: LX + LS, y: LY + LS, tx: LX + LS + 4, ty: LY + LS + 11, anchor: 'start' },
  { key: 'BL', x: LX, y: LY + LS, tx: LX - 4, ty: LY + LS + 11, anchor: 'end' },
]
const loupeCornerVals = computed(() => {
  if (!loupe.value) return []
  const { r, c } = loupe.value
  const cs = cornersOf(r, c)
  return L_CORNERS.map((L, k) => ({
    ...L,
    v: field.value[cs[L.key as keyof typeof cs].r][cs[L.key as keyof typeof cs].c],
    in: loupe.value!.bits[k],
  }))
})
// Points de croisement + segments dans la loupe
function loupeEdgePos(e: number, t: number): { x: number; y: number } {
  const [a, b] = [[0, 1], [1, 2], [3, 2], [0, 3]][e]
  const A = L_CORNERS[a], B = L_CORNERS[b]
  return { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) }
}
const loupeSegs = computed(() => {
  if (!loupe.value) return []
  const { r, c } = loupe.value
  return loupe.value.edges.map(([ea, eb]) => {
    const p = loupeEdgePos(ea, edgeT(r, c, ea)), q = loupeEdgePos(eb, edgeT(r, c, eb))
    return { p, q }
  })
})

// ── Mini panneau 3D : Marching Cubes (three.js, 256 cas) ──────────
const threeEl = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let effect: MarchingCubes | null = null
let raf = 0
const balls = computed(() => {
  const lcg = makeLcg(seed.value * 104729 + 7)
  return Array.from({ length: 3 }, () => ({
    x: 0.36 + lcg() * 0.28, y: 0.36 + lcg() * 0.28, z: 0.36 + lcg() * 0.28,
    s: 0.5 + lcg() * 0.35,
  }))
})
onMounted(() => {
  const el = threeEl.value
  if (!el) return
  const w = el.clientWidth || 200, h = el.clientHeight || 248
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0xf8fafc, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  el.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 100)
  cam.position.set(0, 0.9, 3.6)
  cam.lookAt(0, 0, 0)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dl = new THREE.DirectionalLight(0xffffff, 1.6)
  dl.position.set(2, 3, 4)
  scene.add(dl)
  // flatShading → les triangles générés par la table de 256 cas sont visibles
  const mat = new THREE.MeshPhongMaterial({ color: 0x00BDF2, flatShading: true, shininess: 25 })
  effect = new MarchingCubes(20, mat, false, false, 40000)
  effect.scale.setScalar(1.05)
  scene.add(effect)
  const grid = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.1, 2.1, 2.1)),
    new THREE.LineBasicMaterial({ color: 0x94a3b8 }),
  )
  scene.add(grid)
  const animate = () => {
    raf = requestAnimationFrame(animate)
    if (!effect || !renderer) return
    // Le slider pilote ici le seuil d’un champ de métaballes distinct, non métrique.
    effect.isolation = 80 * Math.pow(2, -iso.value)
    effect.reset()
    for (const b of balls.value) effect.addBall(b.x, b.y, b.z, b.s, 12)
    effect.update()
    effect.rotation.y += 0.006
    grid.rotation.y = effect.rotation.y
    renderer.render(scene, cam)
  }
  animate()
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  if (timer) clearInterval(timer)
  if (renderer) { renderer.dispose(); renderer.domElement.remove(); renderer = null }
})
</script>

<template>
  <div class="mc-wrap">
    <div class="mc-row">
      <svg viewBox="0 0 400 215" class="mc-svg">
        <!-- ══════ Grille : la TSDF 2D et le balayage ══════ -->
        <rect x="0" y="0" width="252" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
        <text x="126" y="13" text-anchor="middle"
          style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
          Marching Squares — champ synthétique 2D
        </text>

        <!-- cases déjà balayées (teinte) -->
        <g v-if="marching">
          <rect v-for="cell in shownCells" :key="`d${cell.r}-${cell.c}`"
            :x="nx(cell.c)" :y="ny(cell.r)" :width="CS" :height="CS"
            fill="#25B34B" style="opacity:0.07;pointer-events:none"/>
        </g>

        <!-- arêtes de grille -->
        <g stroke="#e2e8f0" stroke-width="0.8">
          <line v-for="r in NR" :key="`h${r}`" :x1="nx(0)" :y1="ny(r-1)" :x2="nx(NC-1)" :y2="ny(r-1)"/>
          <line v-for="c in NC" :key="`v${c}`" :x1="nx(c-1)" :y1="ny(0)" :x2="nx(c-1)" :y2="ny(NR-1)"/>
        </g>

        <!-- case courante du balayage -->
        <rect v-if="currentCell"
          :x="nx(currentCell.c)" :y="ny(currentCell.r)" :width="CS" :height="CS"
          fill="#F59E0B" stroke="#F15A22" stroke-width="1.8" style="opacity:0.35;pointer-events:none"/>
        <!-- case survolée -->
        <rect v-if="hovered"
          :x="nx(hovered.c)" :y="ny(hovered.r)" :width="CS" :height="CS"
          fill="none" stroke="#F15A22" stroke-width="1.5" style="pointer-events:none"/>

        <!-- zones de survol -->
        <g v-for="r in NR - 1" :key="`hr${r}`">
          <rect v-for="c in NC - 1" :key="`hc${c}`"
            :x="nx(c-1)" :y="ny(r-1)" :width="CS" :height="CS"
            fill="transparent"
            @mouseenter="hovered = { r: r-1, c: c-1 }" @mouseleave="hovered = null"/>
        </g>

        <!-- contour extrait (cases balayées seulement) -->
        <g style="pointer-events:none">
          <template v-for="cell in shownCells" :key="`sc${cell.r}-${cell.c}`">
            <line v-for="(s, i) in cell.segs" :key="i"
              :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2"
              stroke="#25B34B" stroke-width="2.5" stroke-linecap="round"/>
          </template>
        </g>

        <!-- nœuds : rouge = dedans (f < iso), bleu = dehors -->
        <g v-for="r in NR" :key="`nr${r}`" style="pointer-events:none">
          <circle v-for="c in NC" :key="`nc${c}`"
            :cx="nx(c-1)" :cy="ny(r-1)" r="4"
            :fill="inside(r-1, c-1) ? '#CF1C24' : '#1e40af'" stroke="white" stroke-width="1"/>
        </g>

        <!-- légende -->
        <circle cx="14" cy="203" r="4" fill="#CF1C24"/>
        <text x="21" y="206" style="font-size:6.5px;fill:#CF1C24;font-family:sans-serif">f &lt; iso (dedans)</text>
        <circle cx="88" cy="203" r="4" fill="#1e40af"/>
        <text x="95" y="206" style="font-size:6.5px;fill:#1e40af;font-family:sans-serif">f &gt; iso</text>
        <line x1="128" y1="203" x2="142" y2="203" stroke="#25B34B" stroke-width="2.5"/>
        <text x="146" y="206" style="font-size:6.5px;fill:#25B34B;font-family:sans-serif">surface extraite</text>

        <!-- ══════ Loupe : décodage de la case ══════ -->
        <rect x="258" y="0" width="142" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
        <text x="329" y="13" text-anchor="middle"
          style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
          Loupe {{ loupe ? `— case (${loupe.r}, ${loupe.c})` : '' }}
        </text>

        <template v-if="loupe">
          <rect :x="LX" :y="LY" :width="LS" :height="LS" fill="white" stroke="#94a3b8" stroke-width="1"/>
          <!-- segments -->
          <line v-for="(s, i) in loupeSegs" :key="`ls${i}`"
            :x1="s.p.x" :y1="s.p.y" :x2="s.q.x" :y2="s.q.y"
            stroke="#25B34B" stroke-width="3" stroke-linecap="round"/>
          <!-- points d'arête interpolés -->
          <g v-for="(s, i) in loupeSegs" :key="`lp${i}`">
            <circle :cx="s.p.x" :cy="s.p.y" r="4" fill="#F15A22" stroke="white" stroke-width="1.2"/>
            <circle :cx="s.q.x" :cy="s.q.y" r="4" fill="#F15A22" stroke="white" stroke-width="1.2"/>
          </g>
          <!-- coins + valeurs -->
          <g v-for="cv in loupeCornerVals" :key="cv.key">
            <circle :cx="cv.x" :cy="cv.y" r="6.5"
              :fill="cv.in ? '#CF1C24' : '#1e40af'" stroke="white" stroke-width="1.5"/>
            <text :x="cv.x" :y="cv.y + 2.5" text-anchor="middle"
              style="font-size:6px;fill:white;font-weight:700;font-family:monospace">{{ cv.in ? 1 : 0 }}</text>
            <text :x="cv.tx" :y="cv.ty" :text-anchor="cv.anchor"
              :style="`font-size:6.5px;font-family:monospace;fill:${cv.in ? '#CF1C24' : '#1e40af'}`">
              {{ cv.v.toFixed(2) }}
            </text>
          </g>
          <!-- décodage -->
          <text x="329" y="158" text-anchor="middle"
            style="font-size:7.5px;fill:#854d0e;font-weight:700;font-family:monospace">
            {{ loupe.bits.map(b => b ? 1 : 0).join('') }}₂ → cas {{ loupe.ci }}/15
          </text>
          <text x="329" y="170" text-anchor="middle"
            style="font-size:7px;fill:#854d0e;font-family:monospace">
            table[{{ loupe.ci }}] → {{ loupe.segs.length }} segment(s)
          </text>
          <text x="329" y="186" text-anchor="middle"
            style="font-size:6.2px;fill:#94a3b8;font-family:monospace">
            v = pA + (iso−fA)/(fB−fA)·(pB−pA)
          </text>
          <text x="329" y="197" text-anchor="middle"
            style="font-size:6.2px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
            croisement interpolé sur chaque arête
          </text>
        </template>
        <template v-else>
          <text x="329" y="100" text-anchor="middle"
            style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
            survolez une case, ou lancez
          </text>
          <text x="329" y="112" text-anchor="middle"
            style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
            ▶ Marcher pour suivre le balayage
          </text>
        </template>
      </svg>

      <!-- ══════ Mini 3D : le vrai Marching Cubes ══════ -->
      <div class="mc-3d">
        <div class="mc-3d-title">Marching <b>Cubes</b> — 3D, 2⁸ = 256 cas</div>
        <div ref="threeEl" class="mc-3d-canvas"></div>
        <div class="mc-3d-caption">champ de métaballes distinct · facettes triangulaires</div>
      </div>
    </div>

    <div class="mc-controls">
      <button class="mc-btn-main" @click="startMarch">▶ Marcher</button>
      <button class="mc-btn" :disabled="!marching" @click="togglePause">{{ running ? '⏸' : '▶' }}</button>
      <button class="mc-btn" @click="stepOnce">⏭ +1</button>
      <label class="mc-sl">
        Isovaleur
        <strong>{{ iso.toFixed(2) }}</strong>
        <input type="range" v-model.number="iso" min="-0.9" max="0.9" step="0.05"/>
      </label>
      <button class="mc-btn" @click="randomize">🎲 Nouvelle scène</button>
      <span class="mc-info" v-if="marching">
        case {{ marchStep + 1 }}/{{ TOTAL }} — {{ shownCells.reduce((n, c) => n + c.segs.length, 0) }} segments extraits
      </span>
      <span class="mc-info" v-else>
        isovaleur : niveau du champ extrait · {{ allCells.reduce((n, c) => n + c.segs.length, 0) }} segments
      </span>
    </div>
  </div>
</template>

<style scoped>
.mc-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.mc-row  { display: flex; gap: 10px; align-items: stretch; }
.mc-svg  { height: 248px; width: auto; max-width: 100%; display: block; flex: 0 1 auto; }
.mc-3d   { display: flex; flex-direction: column; width: 205px; flex: 0 0 auto; }
.mc-3d-title {
  font-size: 0.62rem; color: #64748b; font-weight: 600; text-align: center;
  font-family: sans-serif; padding: 2px 0;
}
.mc-3d-canvas {
  height: 205px; width: 205px; border: 1.2px solid #CBD5E1; border-radius: 5px;
  overflow: hidden; background: #f8fafc;
}
.mc-3d-caption {
  font-size: 0.56rem; color: #94a3b8; font-style: italic; text-align: center;
  font-family: sans-serif; padding-top: 2px;
}
.mc-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mc-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.mc-sl strong { color: #CF1C24; min-width: 34px; display: inline-block; }
.mc-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.mc-btn, .mc-btn-main {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem; font-weight: 700;
}
.mc-btn {
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b;
}
.mc-btn:hover { background: #f1f5f9; }
.mc-btn:disabled { opacity: 0.4; cursor: default; }
.mc-btn-main {
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24;
}
.mc-btn-main:hover { background: #CF1C24; color: white; }
.mc-info { font-size: 0.66rem; color: #64748b; font-style: italic; }
</style>
