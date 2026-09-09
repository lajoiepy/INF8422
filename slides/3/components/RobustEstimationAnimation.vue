<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Ajustement d'une droite avec un point point rouge ────────────────
// Des inliers alignés + 1 point rouge. Le slider éloigne le point rouge de la
// droite (augmente son résidu). On compare la droite estimée selon la
// perte choisie : L2, Huber ou Cauchy.
type Kernel = 'L2' | 'Huber' | 'Cauchy'
const kernel = ref<Kernel>('L2')

const DELTA = 2.0   // échelle des noyaux robustes ≈ bruit des inliers

// Inliers ~ droite y = 0.55x + 1.8 (bruit plus marqué)
const INLIERS = [
  { x: 0.8, y: 2.7 }, { x: 2.0, y: 2.3 }, { x: 3.1, y: 4.1 },
  { x: 4.3, y: 3.6 }, { x: 6.0, y: 5.7 }, { x: 7.2, y: 5.1 }, { x: 8.6, y: 6.9 },
]
const OUTLIER_X = 5.0
const outlierY = ref(9.2)
const points = computed(() => [...INLIERS, { x: OUTLIER_X, y: outlierY.value }])

// Poids du noyau (calcul interne de l'ajustement robuste)
function weightFn(k: Kernel, r: number): number {
  const a = Math.abs(r)
  if (k === 'L2') return 1
  if (k === 'Huber') return a <= DELTA ? 1 : DELTA / a
  return 1 / (1 + (r / DELTA) ** 2)   // Cauchy
}

// Ajustement d'une droite y = a·x + b (moindres carrés, pondérés en
// interne pour les pertes robustes — quelques passes suffisent).
function fit(k: Kernel) {
  const pts = points.value
  let a = 0.5, b = 2, w = pts.map(() => 1)
  for (let it = 0; it < 25; it++) {
    let Sw = 0, Swx = 0, Swy = 0, Swxx = 0, Swxy = 0
    for (let i = 0; i < pts.length; i++) {
      const { x, y } = pts[i], wi = w[i]
      Sw += wi; Swx += wi * x; Swy += wi * y; Swxx += wi * x * x; Swxy += wi * x * y
    }
    const den = Sw * Swxx - Swx * Swx
    if (Math.abs(den) < 1e-9) break
    a = (Sw * Swxy - Swx * Swy) / den
    b = (Swy - a * Swx) / Sw
    w = pts.map(p => weightFn(k, p.y - (a * p.x + b)))
  }
  return { a, b }
}
const current = computed(() => fit(kernel.value))
const l2fit   = computed(() => fit('L2'))

// ── Plot gauche : nuage + droites ─────────────────────────────────
const PLX1 = 24, PLX2 = 268, PYB = 196, PYT = 26
const YMAX = 15   // axe y étendu → le point rouge peut être bien plus haut
const wx = (x: number) => PLX1 + x / 10 * (PLX2 - PLX1)
const wy = (y: number) => PYB - y / YMAX * (PYB - PYT)
function linePts(a: number, b: number) {
  return `${wx(0)},${wy(b)} ${wx(10)},${wy(a * 10 + b)}`
}
// y de la droite estimée à l'abscisse de le point rouge, et résidu associé
const fitYatOut = computed(() => current.value.a * OUTLIER_X + current.value.b)
const rOut = computed(() => outlierY.value - fitYatOut.value)

// ── Plot droite : courbe de coût ρ(r) ─────────────────────────────
const R = 6, VMAX = 20   // demi-plage de résidu et échelle verticale du coût
const RGX1 = 302, RGX2 = 546, RGYB = 150, RGYT = 30
const rx = (r: number) => RGX1 + (r + R) / (2 * R) * (RGX2 - RGX1)
const ry = (v: number) => RGYB - Math.min(v / VMAX, 1) * (RGYB - RGYT)
function rho(k: Kernel, r: number): number {
  const a = Math.abs(r)
  if (k === 'L2') return 0.5 * r * r
  if (k === 'Huber') return a <= DELTA ? 0.5 * r * r : DELTA * (a - 0.5 * DELTA)
  return 0.5 * DELTA * DELTA * Math.log(1 + (r / DELTA) ** 2)   // Cauchy
}
function rhoPts(k: Kernel) {
  return Array.from({ length: 121 }, (_, i) => {
    const r = -R + i / 120 * 2 * R
    return `${rx(r).toFixed(1)},${ry(rho(k, r)).toFixed(1)}`
  }).join(' ')
}
const rClamped     = computed(() => Math.max(-R, Math.min(R, rOut.value)))
const outCost      = computed(() => rho(kernel.value, rOut.value))
const outCostClamp = computed(() => rho(kernel.value, rClamped.value))
const kColor = computed(() =>
  kernel.value === 'L2' ? '#F15A22' : kernel.value === 'Huber' ? '#25B34B' : '#7C3AED')
const rTicks = [-9, -6, -3, 0, 3, 6, 9]
</script>

<template>
  <div class="rb-wrap">
    <svg viewBox="0 0 558 215" class="rb-svg">

      <!-- ══════ GAUCHE : nuage + droite estimée ══════ -->
      <rect x="2" y="2" width="286" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="145" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Droite estimée — perte {{ kernel }}
      </text>

      <!-- axes -->
      <line :x1="PLX1" :y1="PYB" :x2="PLX2" :y2="PYB" stroke="#475569" stroke-width="1"/>
      <line :x1="PLX1" :y1="PYT" :x2="PLX1" :y2="PYB" stroke="#475569" stroke-width="1"/>

      <!-- droite L2 de référence (pointillé, faible) -->
      <polyline :points="linePts(l2fit.a, l2fit.b)" fill="none"
        stroke="#F15A22" stroke-width="1.3" stroke-dasharray="4,3" opacity="0.5"/>
      <text :x="PLX2-40" :y="wy(l2fit.a*10+l2fit.b)-3"
        style="font-size:7px;fill:#F15A22;opacity:0.75;font-family:sans-serif">L2 (réf.)</text>

      <!-- droite estimée courante -->
      <polyline :points="linePts(current.a, current.b)" fill="none"
        :stroke="kColor" stroke-width="2.6" stroke-linecap="round"/>

      <!-- résidu de le point rouge (segment vertical point ↔ droite) -->
      <line :x1="wx(OUTLIER_X)" :y1="wy(outlierY)" :x2="wx(OUTLIER_X)" :y2="wy(fitYatOut)"
        stroke="#CF1C24" stroke-width="1.4" stroke-dasharray="3,2" opacity="0.85"/>
      <text :x="wx(OUTLIER_X)+5" :y="(wy(outlierY)+wy(fitYatOut))/2+3"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:monospace">r</text>

      <!-- inliers -->
      <circle v-for="(p, i) in INLIERS" :key="`in${i}`"
        :cx="wx(p.x)" :cy="wy(p.y)" r="4" fill="#00BDF2" stroke="white" stroke-width="1"/>
      <!-- point rouge -->
      <circle :cx="wx(OUTLIER_X)" :cy="wy(outlierY)" r="5.5"
        fill="#CF1C24" stroke="white" stroke-width="1.2"/>
      <text :x="wx(OUTLIER_X)+9" :y="wy(outlierY)+3"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">point rouge</text>

      <text x="145" y="209" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        L2 (pointillé) suit le point rouge · la perte robuste garde la droite sur les inliers
      </text>

      <!-- ══════ DROITE : courbe de coût ρ(r) ══════ -->
      <rect x="292" y="2" width="264" height="211" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="424" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Coût de la perte ρ(r)
      </text>

      <!-- axes ρ(r) -->
      <line :x1="RGX1" :y1="RGYB" :x2="RGX2" :y2="RGYB" stroke="#475569" stroke-width="1"/>
      <line :x1="rx(0)" :y1="RGYT-2" :x2="rx(0)" :y2="RGYB" stroke="#475569" stroke-width="1"/>
      <text :x="rx(0)-4" :y="RGYT+2" text-anchor="end"
        style="font-size:7px;fill:#475569;font-style:italic;font-family:sans-serif">ρ</text>
      <text :x="RGX2-2" :y="RGYB+11" text-anchor="end"
        style="font-size:7px;fill:#475569;font-style:italic;font-family:sans-serif">résidu r</text>
      <g v-for="t in rTicks" :key="`rt${t}`">
        <line :x1="rx(t)" :y1="RGYB" :x2="rx(t)" :y2="RGYB+3" stroke="#475569" stroke-width="0.8"/>
        <text :x="rx(t)" :y="RGYB+11" text-anchor="middle"
          style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">{{ t }}</text>
      </g>

      <!-- les 3 courbes (sélectionnée en gras, autres estompées) -->
      <polyline :points="rhoPts('L2')" fill="none" stroke="#F15A22"
        :stroke-width="kernel==='L2' ? 2.4 : 1.4" :opacity="kernel==='L2' ? 1 : 0.5"/>
      <polyline :points="rhoPts('Huber')" fill="none" stroke="#25B34B"
        :stroke-width="kernel==='Huber' ? 2.4 : 1.4" :opacity="kernel==='Huber' ? 1 : 0.5"/>
      <polyline :points="rhoPts('Cauchy')" fill="none" stroke="#7C3AED"
        :stroke-width="kernel==='Cauchy' ? 2.4 : 1.4" :opacity="kernel==='Cauchy' ? 1 : 0.5"/>

      <!-- coût associé (ligne horizontale) puis résidu (ligne verticale) -->
      <line :x1="rx(0)" :y1="ry(outCostClamp)" :x2="rx(rClamped)" :y2="ry(outCostClamp)"
        stroke="#CF1C24" stroke-width="1.2" stroke-dasharray="3,2" opacity="0.9"/>
      <line :x1="rx(rClamped)" :y1="RGYB" :x2="rx(rClamped)" :y2="ry(outCostClamp)"
        stroke="#CF1C24" stroke-width="1.3" stroke-dasharray="3,2"/>
      <circle :cx="rx(rClamped)" :cy="ry(outCostClamp)" r="3.2" fill="#CF1C24" stroke="white" stroke-width="1"/>
      <text :x="rx(rClamped)" :y="RGYB+21" text-anchor="middle"
        style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:monospace">r = {{ rOut.toFixed(2) }}</text>

      <!-- lecture du coût -->
      <text x="300" y="176"
        :style="`font-size:8px;fill:${kColor};font-weight:700;font-family:monospace`">
        coût de le point rouge : ρ(r) = {{ outCost.toFixed(2) }}
      </text>

      <!-- légende + message -->
      <text x="300" y="191" style="font-size:6.8px;fill:#F15A22;font-weight:700;font-family:sans-serif">▬ L2</text>
      <text x="330" y="191" style="font-size:6.8px;fill:#25B34B;font-weight:700;font-family:sans-serif">▬ Huber</text>
      <text x="374" y="191" style="font-size:6.8px;fill:#7C3AED;font-weight:700;font-family:sans-serif">▬ Cauchy</text>
      <text x="300" y="205" style="font-size:7px;fill:#475569;font-family:sans-serif">
        L2 : coût ∝ r² (explose) · Huber : linéaire · Cauchy : plafonne
      </text>
    </svg>

    <!-- Contrôles -->
    <div class="rb-controls">
      <div class="rb-btns">
        <button :class="['rb-btn', kernel==='L2' && 'on']" @click="kernel='L2'">L2</button>
        <button :class="['rb-btn', kernel==='Huber' && 'on']" @click="kernel='Huber'">Huber</button>
        <button :class="['rb-btn', kernel==='Cauchy' && 'on']" @click="kernel='Cauchy'">Cauchy</button>
      </div>
      <label class="rb-sl">
        <span>y du point rouge</span><strong>{{ outlierY.toFixed(1) }}</strong>
        <input type="range" v-model.number="outlierY" min="3" max="14" step="0.1"/>
      </label>
      <div class="rb-info">
        Éloignez le point rouge : sous <b>L2</b> la droite le suit ; sous <b>Huber/Cauchy</b> son coût plafonne et la droite tient.
      </div>
    </div>
  </div>
</template>

<style scoped>
.rb-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.rb-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.rb-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rb-btns { display: flex; gap: 4px; }
.rb-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.rb-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.rb-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.rb-sl strong { color: #CF1C24; min-width: 28px; display: inline-block; }
.rb-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.rb-info { font-size: 0.68rem; color: #64748b; font-style: italic;
  padding: 2px 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; }
</style>
