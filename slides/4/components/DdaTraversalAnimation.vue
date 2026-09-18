<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── DDA voxélisé (Amanatides & Woo 1987) ──────────────────────────
// Pour un rayon o + t·d, on maintient par axe t_max (t du PROCHAIN
// franchissement de frontière) et t_Δ (t pour traverser une cellule).
// À chaque pas : avancer sur l'axe dont le t_max est minimal, puis
// l'incrémenter de son t_Δ. Exact : aucune cellule manquée — contrairement
// à l'échantillonnage à pas fixe (toggle pour le constater).
const COLS = 12, ROWS = 8
const origin = { x: 0.45, y: 7.45 }              // capteur (coin bas-gauche, monde y vers le haut)
const target = ref({ x: 10.6, y: 1.3 })          // extrémité draggable
const stepIdx = ref(Infinity)                    // Infinity = traversée complète affichée
const running = ref(false)
const showSampling = ref(false)
const dt = ref(0.9)                              // pas de l'échantillonnage naïf (en cellules)

// ── DDA : liste des pas ───────────────────────────────────────────
interface Step {
  ix: number; iy: number                          // cellule courante (avant le pas)
  tMaxX: number; tMaxY: number                    // état AVANT le choix
  axis: 'x' | 'y' | null                          // axe franchi (null = dernière cellule)
  cross: { x: number; y: number } | null          // point de franchissement
}
const dda = computed<Step[]>(() => {
  const o = origin, e = target.value
  const dx = e.x - o.x, dy = e.y - o.y
  let ix = Math.floor(o.x), iy = Math.floor(o.y)
  const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1
  const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity
  const tDY = dy !== 0 ? Math.abs(1 / dy) : Infinity
  let tMaxX = dx !== 0 ? ((dx > 0 ? ix + 1 : ix) - o.x) / dx : Infinity
  let tMaxY = dy !== 0 ? ((dy > 0 ? iy + 1 : iy) - o.y) / dy : Infinity
  const steps: Step[] = []
  for (let guard = 0; guard < 200; guard++) {
    const t = Math.min(tMaxX, tMaxY)
    if (t >= 1 || ix < 0 || ix >= COLS || iy < 0 || iy >= ROWS) {
      steps.push({ ix, iy, tMaxX, tMaxY, axis: null, cross: null })
      break
    }
    const axis = tMaxX < tMaxY ? 'x' : 'y'
    const cross = { x: o.x + t * dx, y: o.y + t * dy }
    steps.push({ ix, iy, tMaxX, tMaxY, axis, cross })
    if (axis === 'x') { ix += stepX; tMaxX += tDX } else { iy += stepY; tMaxY += tDY }
  }
  return steps
})
const tDelta = computed(() => {
  const dx = target.value.x - origin.x, dy = target.value.y - origin.y
  return { x: dx !== 0 ? Math.abs(1 / dx) : Infinity, y: dy !== 0 ? Math.abs(1 / dy) : Infinity }
})
const shown = computed(() => dda.value.slice(0, Math.min(stepIdx.value + 1, dda.value.length)))
const current = computed<Step | null>(() =>
  stepIdx.value < dda.value.length ? dda.value[stepIdx.value] : null)
const done = computed(() => stepIdx.value >= dda.value.length)

// ── Échantillonnage naïf à pas fixe (pour comparaison) ────────────
const sampling = computed(() => {
  if (!showSampling.value) return null
  const o = origin, e = target.value
  const dx = e.x - o.x, dy = e.y - o.y
  const len = Math.hypot(dx, dy)
  const n = Math.max(1, Math.floor(len / dt.value))
  const pts: { x: number; y: number }[] = []
  const visited = new Set<string>()
  for (let k = 0; k <= n; k++) {
    const t = Math.min(1, (k * dt.value) / len)
    const p = { x: o.x + t * dx, y: o.y + t * dy }
    pts.push(p)
    visited.add(`${Math.floor(p.x)},${Math.floor(p.y)}`)
  }
  const missed = dda.value.filter(s => !visited.has(`${s.ix},${s.iy}`))
  return { pts, missed }
})

// ── Contrôles ─────────────────────────────────────────────────────
let timer: ReturnType<typeof setInterval> | null = null
function play() {
  stepIdx.value = 0
  running.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    stepIdx.value++
    if (stepIdx.value >= dda.value.length) stop()
  }, 550)
}
function stop() { running.value = false; if (timer) { clearInterval(timer); timer = null } }
function stepOnce() { stop(); stepIdx.value = done.value ? 0 : stepIdx.value + 1 }
function reset() { stop(); stepIdx.value = Infinity }
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── Layout SVG ────────────────────────────────────────────────────
const CS = 23, OX = 22, OY = 14
const sx = (x: number) => OX + x * CS
const sy = (y: number) => OY + (ROWS - y) * CS   // monde y vers le haut
const svgRef = ref<SVGSVGElement | null>(null)
let dragging = false
function setTarget(e: PointerEvent) {
  if (!svgRef.value) return
  const r = svgRef.value.getBoundingClientRect()
  const px = (e.clientX - r.left) * (560 / r.width)
  const py = (e.clientY - r.top) * (215 / r.height)
  const wx = (px - OX) / CS, wy = ROWS - (py - OY) / CS
  if (wx < 0.05 || wx > COLS - 0.05 || wy < 0.05 || wy > ROWS - 0.05 || px > 330) return
  target.value = { x: wx, y: wy }
}
function onDown(e: PointerEvent) { dragging = true; setTarget(e) }
function onMove(e: PointerEvent) { if (dragging) setTarget(e) }
function onUp() { dragging = false }

const fmt = (v: number) => (v === Infinity ? '∞' : v.toFixed(3))
</script>

<template>
  <div class="dda-wrap">
    <svg ref="svgRef" viewBox="0 0 560 215" class="dda-svg" style="touch-action:none"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp">
      <!-- ══════ Grille ══════ -->
      <rect x="0" y="0" width="330" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- cellules traversées (ordre) -->
      <g v-for="(s, k) in shown" :key="`c${k}`">
        <rect :x="sx(s.ix)" :y="sy(s.iy + 1)" :width="CS" :height="CS"
          :fill="current && k === stepIdx ? '#F59E0B' : '#00BDF2'"
          :style="`opacity:${current && k === stepIdx ? 0.4 : 0.22}`"/>
        <text :x="sx(s.ix) + 3" :y="sy(s.iy + 1) + 8"
          style="font-size:5.5px;fill:#0369a1;font-family:monospace">{{ k }}</text>
      </g>
      <!-- cellules manquées par l'échantillonnage naïf -->
      <g v-if="sampling">
        <rect v-for="(s, k) in sampling.missed" :key="`m${k}`"
          :x="sx(s.ix) + 1.5" :y="sy(s.iy + 1) + 1.5" :width="CS - 3" :height="CS - 3"
          fill="none" stroke="#CF1C24" stroke-width="1.8" stroke-dasharray="3,2"/>
      </g>

      <!-- lignes de grille -->
      <g stroke="#e2e8f0" stroke-width="0.8">
        <line v-for="c in COLS + 1" :key="`v${c}`" :x1="sx(c - 1)" :y1="sy(0)" :x2="sx(c - 1)" :y2="sy(ROWS)"/>
        <line v-for="r in ROWS + 1" :key="`h${r}`" :x1="sx(0)" :y1="sy(r - 1)" :x2="sx(COLS)" :y2="sy(r - 1)"/>
      </g>

      <!-- rayon -->
      <line :x1="sx(origin.x)" :y1="sy(origin.y)" :x2="sx(target.x)" :y2="sy(target.y)"
        stroke="#F15A22" stroke-width="2"/>
      <!-- franchissements -->
      <g v-for="(s, k) in shown" :key="`x${k}`">
        <circle v-if="s.cross" :cx="sx(s.cross.x)" :cy="sy(s.cross.y)" r="2.6"
          :fill="s.axis === 'x' ? '#CF1C24' : '#25B34B'"/>
      </g>
      <!-- échantillons naïfs -->
      <g v-if="sampling">
        <circle v-for="(p, k) in sampling.pts" :key="`s${k}`"
          :cx="sx(p.x)" :cy="sy(p.y)" r="2" fill="none" stroke="#7c3aed" stroke-width="1.4"/>
      </g>

      <!-- capteur + cible -->
      <circle :cx="sx(origin.x)" :cy="sy(origin.y)" r="5" fill="#334155" stroke="white" stroke-width="1.5"/>
      <text :x="sx(origin.x) + 8" :y="sy(origin.y) + 3" style="font-size:6.5px;fill:#334155;font-family:sans-serif">capteur</text>
      <g style="cursor:grab">
        <circle :cx="sx(target.x)" :cy="sy(target.y)" r="7" fill="#CF1C24" style="opacity:0.25"/>
        <circle :cx="sx(target.x)" :cy="sy(target.y)" r="3.5" fill="#CF1C24" stroke="white" stroke-width="1.5"/>
        <text :x="sx(target.x) + 8" :y="sy(target.y) - 5" style="font-size:6.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">⤢ glisser</text>
      </g>

      <text x="165" y="207" text-anchor="middle" style="font-size:6.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        franchissement : <tspan fill="#CF1C24">●</tspan> vertical (X) · <tspan fill="#25B34B">●</tspan> horizontal (Y)
      </text>

      <!-- ══════ État de l'algorithme ══════ -->
      <rect x="336" y="0" width="222" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="447" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        État DDA {{ current ? `— pas ${stepIdx}` : done ? '— traversée complète' : '' }}
      </text>

      <rect x="344" y="20" width="206" height="30" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="352" y="32" style="font-size:7px;fill:#1e40af;font-family:monospace">
        t_Δx = {{ fmt(tDelta.x) }}  t_Δy = {{ fmt(tDelta.y) }}
      </text>
      <text x="352" y="44" style="font-size:6.5px;fill:#64748b;font-style:italic;font-family:sans-serif">
        coût (en t) pour traverser une cellule sur chaque axe
      </text>

      <!-- comparaison du pas courant -->
      <template v-if="current">
        <rect x="344" y="56" width="100" height="42"
          :fill="current.axis === 'x' ? '#fef2f2' : 'white'" rx="4"
          :stroke="current.axis === 'x' ? '#CF1C24' : '#e2e8f0'" :stroke-width="current.axis === 'x' ? 1.8 : 1"/>
        <text x="394" y="70" text-anchor="middle" style="font-size:7px;fill:#64748b;font-family:monospace">t_max,x</text>
        <text x="394" y="86" text-anchor="middle"
          :style="`font-size:9px;font-weight:700;font-family:monospace;fill:${current.axis === 'x' ? '#CF1C24' : '#475569'}`">
          {{ fmt(current.tMaxX) }}
        </text>
        <rect x="450" y="56" width="100" height="42"
          :fill="current.axis === 'y' ? '#f0fdf4' : 'white'" rx="4"
          :stroke="current.axis === 'y' ? '#25B34B' : '#e2e8f0'" :stroke-width="current.axis === 'y' ? 1.8 : 1"/>
        <text x="500" y="70" text-anchor="middle" style="font-size:7px;fill:#64748b;font-family:monospace">t_max,y</text>
        <text x="500" y="86" text-anchor="middle"
          :style="`font-size:9px;font-weight:700;font-family:monospace;fill:${current.axis === 'y' ? '#25B34B' : '#475569'}`">
          {{ fmt(current.tMaxY) }}
        </text>
        <text x="447" y="112" text-anchor="middle" style="font-size:7.5px;fill:#334155;font-weight:700;font-family:sans-serif">
          {{ current.axis
            ? `min → avancer en ${current.axis.toUpperCase()}, puis t_max,${current.axis} += t_Δ${current.axis}`
            : 'cible atteinte — fin de la traversée' }}
        </text>
      </template>
      <template v-else>
        <text x="447" y="80" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
          ▶ Dérouler ou ⏭ +1 pour suivre
        </text>
        <text x="447" y="92" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
          la comparaison t_max,x / t_max,y pas à pas
        </text>
      </template>

      <rect x="344" y="122" width="206" height="34" fill="#fff7ed" rx="4" stroke="#fed7aa"/>
      <text x="352" y="135" style="font-size:7.5px;fill:#c2410c;font-weight:700;font-family:sans-serif">
        {{ shown.length }} cellule(s) visitée(s) — aucune manquée
      </text>
      <text x="352" y="148" style="font-size:6.8px;fill:#78716c;font-family:sans-serif">
        chaque cellule doit être mise à jour (libre / occupée)
      </text>

      <rect x="344" y="162" width="206" height="40"
        :fill="sampling && sampling.missed.length ? '#fef2f2' : '#f8fafc'" rx="4"
        :stroke="sampling && sampling.missed.length ? '#fca5a5' : '#e2e8f0'"/>
      <template v-if="sampling">
        <text x="352" y="175" style="font-size:7.5px;font-weight:700;font-family:sans-serif"
          :fill="sampling.missed.length ? '#CF1C24' : '#15803d'">
          Pas fixe Δt = {{ dt.toFixed(1) }} : {{ sampling.missed.length }} cellule(s) manquée(s)
        </text>
        <text x="352" y="188" style="font-size:6.8px;fill:#78716c;font-family:sans-serif">
          {{ sampling.missed.length
            ? 'des mises à jour « libre » sautées → cellules fantômes'
            : 'réduire Δt finit par tout couvrir… en échantillonnant trop' }}
        </text>
      </template>
      <text v-else x="352" y="184" style="font-size:6.8px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        activez « pas fixe » pour comparer à l'échantillonnage naïf
      </text>
    </svg>

    <div class="dda-controls">
      <button class="dda-btn-main" @click="play">▶ Dérouler</button>
      <button class="dda-btn" @click="stepOnce">⏭ +1</button>
      <button class="dda-btn" @click="reset">↺</button>
      <button class="dda-btn" :class="{ on: showSampling }" @click="showSampling = !showSampling">
        {{ showSampling ? '✓ pas fixe' : 'vs pas fixe' }}
      </button>
      <label v-if="showSampling" class="dda-sl">Δt <strong>{{ dt.toFixed(1) }}</strong>
        <input type="range" v-model.number="dt" min="0.3" max="1.5" step="0.1"/></label>
      <span class="dda-info">glissez l'extrémité du rayon — le DDA énumère exactement les cellules traversées</span>
    </div>
  </div>
</template>

<style scoped>
.dda-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.dda-svg  { height: 248px; width: auto; max-width: 100%; display: block; cursor: crosshair; }
.dda-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dda-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.dda-sl strong { color: #CF1C24; min-width: 24px; display: inline-block; }
.dda-sl input[type=range] { width: 80px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.dda-btn, .dda-btn-main {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem; font-weight: 700;
}
.dda-btn { border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; }
.dda-btn:hover { background: #f1f5f9; }
.dda-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.dda-btn-main { border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; }
.dda-btn-main:hover { background: #CF1C24; color: white; }
.dda-info { font-size: 0.64rem; color: #64748b; font-style: italic; }
</style>
