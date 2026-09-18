<script setup lang="ts">
import { ref, computed } from 'vue'

const maxDepth = ref(3)
const showDense = ref(false)

// ── Obstacles (cercles dans l'espace [0,1]²) — éditables au clic ──
const obstacles = ref([
  { x: 0.25, y: 0.3, r: 0.08 },
  { x: 0.65, y: 0.6, r: 0.12 },
  { x: 0.45, y: 0.75, r: 0.06 },
])

// Clic : retirer l'obstacle touché, sinon en ajouter un
const svgRef = ref<SVGSVGElement | null>(null)
function handleClick(e: MouseEvent) {
  if (!svgRef.value) return
  const rect = svgRef.value.getBoundingClientRect()
  const sx = (e.clientX - rect.left) * (560 / rect.width)
  const sy = (e.clientY - rect.top) * (215 / rect.height)
  const x = (sx - GX) / GW, y = (sy - GY) / GH
  if (x < 0 || x > 1 || y < 0 || y > 1) return
  const hit = obstacles.value.findIndex(o => Math.hypot(x - o.x, y - o.y) < o.r + 0.02)
  if (hit >= 0) obstacles.value = obstacles.value.filter((_, i) => i !== hit)
  else obstacles.value = [...obstacles.value, { x, y, r: 0.09 }]
}

// ── Quadtree ─────────────────────────────────────────────────
interface QNode {
  x: number; y: number; w: number; h: number
  depth: number
  status: 'free' | 'occupied'
}

function intersectsObstacle(x: number, y: number, w: number, h: number): boolean {
  for (const o of obstacles.value) {
    const cx = Math.max(x, Math.min(o.x, x + w))
    const cy = Math.max(y, Math.min(o.y, y + h))
    if (Math.hypot(cx - o.x, cy - o.y) < o.r) return true
  }
  return false
}

function fullyInsideObstacle(x: number, y: number, w: number, h: number): boolean {
  // Un rectangle axis-aligned est entièrement dans un cercle ssi ses 4 coins le sont (convexité).
  const corners: [number, number][] = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]
  return obstacles.value.some(o => corners.every(([px, py]) => Math.hypot(px - o.x, py - o.y) < o.r))
}

function buildQuadtree(x: number, y: number, w: number, h: number, depth: number): QNode[] {
  const hasObs = intersectsObstacle(x, y, w, h)
  if (!hasObs) return [{ x, y, w, h, depth, status: 'free' }]
  if (fullyInsideObstacle(x, y, w, h)) return [{ x, y, w, h, depth, status: 'occupied' }]
  if (depth >= maxDepth.value) return [{ x, y, w, h, depth, status: 'occupied' }]
  const hw = w / 2, hh = h / 2
  return [
    ...buildQuadtree(x,      y,      hw, hh, depth + 1),
    ...buildQuadtree(x + hw, y,      hw, hh, depth + 1),
    ...buildQuadtree(x,      y + hh, hw, hh, depth + 1),
    ...buildQuadtree(x + hw, y + hh, hw, hh, depth + 1),
  ]
}

const quadNodes = computed(() => buildQuadtree(0, 0, 1, 1, 0))

const nodeCount = computed(() => quadNodes.value.length)
const leafCount = computed(() => {
  // Dense grid at max depth
  const side = 2 ** maxDepth.value
  return side * side
})

// ── SVG layout ────────────────────────────────────────────────
const GX = 18, GY = 18, GW = 200, GH = 185  // grille panneau gauche

function depthColor(depth: number, status: string): string {
  if (status === 'occupied') return '#CF1C24'
  const colors = ['#ffffff', '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a']
  return colors[Math.min(depth, colors.length - 1)]
}

function toSVGX(wx: number) { return GX + wx * GW }
function toSVGY(wy: number) { return GY + wy * GH }

// Dense grid for comparison
const denseSize = computed(() => 2 ** maxDepth.value)
const denseCellW = computed(() => GW / denseSize.value)
const denseCellH = computed(() => GH / denseSize.value)

// For drawing obstacles on top
function obstSVG(o: { x: number; y: number; r: number }) {
  return {
    cx: toSVGX(o.x),
    cy: toSVGY(o.y),
    r: o.r * GW,
  }
}
</script>

<template>
  <div class="oct-wrap">
    <svg ref="svgRef" viewBox="0 0 560 215" class="oct-svg" @click="handleClick" style="cursor:crosshair">
      <!-- Panneau quadtree -->
      <rect x="0" y="0" width="240" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="120" y="12" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ showDense ? 'Grille Uniforme' : 'Quadtree' }} (profondeur {{ maxDepth }})
      </text>

      <!-- Mode dense -->
      <g v-if="showDense">
        <g v-for="r in denseSize" :key="r">
          <g v-for="c in denseSize" :key="c">
            <rect
              :x="GX + (c-1)*denseCellW" :y="GY + (r-1)*denseCellH"
              :width="denseCellW-0.5" :height="denseCellH-0.5"
              :fill="intersectsObstacle((c-1)/denseSize, (r-1)/denseSize, 1/denseSize, 1/denseSize) ? '#CF1C24' : '#dbeafe'"
              stroke="white" stroke-width="0.3"/>
          </g>
        </g>
      </g>

      <!-- Mode quadtree -->
      <g v-else>
        <g v-for="(node, i) in quadNodes" :key="i">
          <rect
            :x="toSVGX(node.x)+0.5" :y="toSVGY(node.y)+0.5"
            :width="node.w * GW - 1" :height="node.h * GH - 1"
            :fill="depthColor(node.depth, node.status)"
            stroke="#94a3b8" stroke-width="0.6" rx="0.5"/>
          <!-- Label profondeur sur les grandes cellules -->
          <text v-if="node.w * GW > 30"
            :x="toSVGX(node.x + node.w/2)" :y="toSVGY(node.y + node.h/2) + 3"
            text-anchor="middle"
            :style="`font-size:7px;fill:${node.status==='occupied'?'white':'#334155'};font-family:monospace`">
            {{ node.depth }}
          </text>
        </g>
      </g>

      <!-- Contours des obstacles (vérité terrain) -->
      <circle v-for="(o, i) in obstacles" :key="`ob${i}`"
        :cx="obstSVG(o).cx" :cy="obstSVG(o).cy" :r="obstSVG(o).r"
        fill="none" stroke="#334155" stroke-width="1.3" stroke-dasharray="3,2"
        style="pointer-events:none"/>

      <!-- Légende profondeur -->
      <text x="10" y="205" style="font-size:6.5px;fill:#64748b;font-family:sans-serif">
        ← clic : ajouter/retirer un obstacle · profondeur : 0=blanc → {{ maxDepth }}=bleu foncé
      </text>

      <!-- Panneau droit : stats et légende -->
      <rect x="248" y="0" width="310" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="403" y="12" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Statistiques
      </text>

      <!-- Stats -->
      <rect x="255" y="20" width="296" height="60" fill="#eff6ff" rx="4" stroke="#bfdbfe" stroke-width="1"/>
      <text x="403" y="35" text-anchor="middle"
        style="font-size:9px;fill:#1e40af;font-weight:700;font-family:sans-serif">
        Quadtree
      </text>
      <text x="263" y="50" style="font-size:8px;fill:#1e293b;font-family:monospace">
        Nœuds feuilles : {{ nodeCount }}
      </text>
      <text x="263" y="63" style="font-size:8px;fill:#1e293b;font-family:monospace">
        Grille dense : {{ leafCount }} cellules
      </text>
      <text x="263" y="76" style="font-size:8px;fill:#25B34B;font-weight:700;font-family:monospace">
        Réduction : {{ ((1 - nodeCount/leafCount)*100).toFixed(0) }}%
      </text>

      <!-- Légende couleur -->
      <rect x="255" y="90" width="296" height="80" fill="#f8fafc" rx="4" stroke="#e2e8f0" stroke-width="1"/>
      <g v-for="(d, i) in [0,1,2,3,4]" :key="d">
        <rect :x="263" :y="100 + i*14" width="14" height="10"
          :fill="depthColor(d, 'free')" stroke="#CBD5E1" stroke-width="0.5" rx="1"/>
        <text :x="282" :y="100 + i*14 + 9"
          style="font-size:7.5px;fill:#334155;font-family:sans-serif">
          Profondeur {{ d }}
        </text>
      </g>
      <rect x="367" y="100" width="14" height="10" fill="#CF1C24" rx="1"/>
      <text x="386" y="109" style="font-size:7.5px;fill:#CF1C24;font-family:sans-serif">Occupé</text>

      <!-- Info -->
      <rect x="255" y="178" width="296" height="28" fill="#f0fdf4" rx="3" stroke="#86efac" stroke-width="1"/>
      <text x="403" y="192" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">
        Mémoire : O(S) vs O(N³) · Accès : O(log N) vs O(1)
      </text>
      <text x="403" y="203" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:sans-serif">
        Zones libres uniformes = 1 seul nœud, quelle que soit leur taille
      </text>
    </svg>

    <div class="oct-controls">
      <label class="oct-sl">
        Profondeur max
        <strong>{{ maxDepth }}</strong>
        <input type="range" v-model.number="maxDepth" min="1" max="5" step="1"/>
      </label>
      <label class="oct-toggle">
        <input type="checkbox" v-model="showDense"/>
        Grille uniforme
      </label>
    </div>
  </div>
</template>

<style scoped>
.oct-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.oct-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.oct-controls { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.oct-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.oct-sl strong { color: #CF1C24; min-width: 20px; display: inline-block; }
.oct-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.oct-toggle {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.72rem; color: #334155; cursor: pointer;
}
</style>
