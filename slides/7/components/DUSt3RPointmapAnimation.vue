<script setup lang="ts">
import { ref, computed } from 'vue'

const rotDeg = ref(0)    // rotation de I2 (0→45°)
const transl = ref(0)    // translation de I2 (0→1)
const showConf = ref(false)

// ── Génération d'une grille de points 6×5 ────────────────────
const COLS = 6, ROWS = 5
const PW = 20, PH = 18

// Profondeurs fictives par pixel (pré-calculées)
function depth(r: number, c: number): number {
  return 2.0 + Math.sin(r * 0.8 + c * 0.6) * 0.4
}

// Confiance : plus faible sur les bords
function conf(r: number, c: number): number {
  const cx = Math.abs(c - (COLS - 1) / 2) / (COLS / 2)
  const cy = Math.abs(r - (ROWS - 1) / 2) / (ROWS / 2)
  return Math.max(0.2, 1 - (cx + cy) * 0.4)
}

function pixelColor(r: number, c: number): string {
  const colors = ['#bfdbfe','#ddd6fe','#fce7f3','#dcfce7','#fef3c7','#fee2e2',
                  '#e0f2fe','#fef9c3','#f0fdf4','#fdf2f8','#ecfeff','#fff7ed']
  return colors[(r * COLS + c) % colors.length]
}

// ── Points 3D de I1 (X^{1,1} en ref I1) ─────────────────────
// Projection inverse: X = (u - cx)/fx * D, Y = (v - cy)/fy * D, Z = D
// On simplifie: cx=COLS/2, cy=ROWS/2, fx=fy=4
const fx = 4.0, cx = (COLS - 1) / 2, cy = (ROWS - 1) / 2

function pt3d_I1(r: number, c: number): [number, number, number] {
  const D = depth(r, c)
  return [(c - cx) / fx * D, (r - cy) / fx * D, D]
}

// ── Points 3D de I2 dans ref I1 (X^{2,1}) ───────────────────
// On applique rotation Ry(theta) puis translation T
const theta = computed(() => rotDeg.value * Math.PI / 180)

function pt3d_I2_inRef1(r: number, c: number): [number, number, number] {
  const D = depth(r, c)
  const x2 = (c - cx) / fx * D
  const y2 = (r - cy) / fx * D
  const z2 = D
  // Rotation autour de Y et translation en X
  const cosT = Math.cos(theta.value), sinT = Math.sin(theta.value)
  const x1 = cosT * x2 + sinT * z2 + transl.value * 0.6
  const y1 = y2 + transl.value * 0.1
  const z1 = -sinT * x2 + cosT * z2 + 0.1
  return [x1, y1, z1]
}

// ── Projection orthographique pour le nuage 3D ───────────────
const OX3 = 368, OY3 = 22, W3 = 165, H3 = 170

function project3D(x: number, y: number, z: number): { sx: number; sy: number } {
  // Vue de dessus et côté (projection oblique)
  const sx = OX3 + W3 / 2 + x * 22 - z * 6
  const sy = OY3 + H3 / 2 - y * 20 + z * 4
  return { sx, sy }
}

const pts3D_I1 = computed(() => {
  const pts: { sx: number; sy: number; conf: number }[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const [x, y, z] = pt3d_I1(r, c)
      const p = project3D(x, y, z)
      pts.push({ ...p, conf: conf(r, c) })
    }
  return pts
})

const pts3D_I2 = computed(() => {
  const pts: { sx: number; sy: number; conf: number }[] = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const [x, y, z] = pt3d_I2_inRef1(r, c)
      const p = project3D(x, y, z)
      pts.push({ ...p, conf: conf(r, c) })
    }
  return pts
})

// Layout images
const OX1 = 10, OX2 = 150, OY = 22
</script>

<template>
  <div class="dust-wrap">
    <svg viewBox="0 0 540 215" class="dust-svg">
      <!-- Cadre image I1 -->
      <rect :x="OX1-2" :y="OY-2" :width="COLS*PW+4" :height="ROWS*PH+4"
        fill="none" stroke="#1e40af" stroke-width="1.5" rx="3"/>
      <text :x="OX1 + COLS*PW/2" :y="OY-8" text-anchor="middle"
        style="font-size:8px;fill:#1e40af;font-weight:700;font-family:sans-serif">I₁</text>

      <!-- Pixels I1 -->
      <g v-for="r in ROWS" :key="r">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX1+(c-1)*PW" :y="OY+(r-1)*PH" :width="PW-1" :height="PH-1"
            :fill="pixelColor(r-1,c-1)" rx="1"/>
        </g>
      </g>

      <!-- Cadre image I2 -->
      <rect :x="OX2-2" :y="OY-2" :width="COLS*PW+4" :height="ROWS*PH+4"
        fill="none" stroke="#CF1C24" stroke-width="1.5" rx="3"/>
      <text :x="OX2 + COLS*PW/2" :y="OY-8" text-anchor="middle"
        style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">I₂</text>

      <!-- Pixels I2 (décalés visuellement) -->
      <g v-for="r in ROWS" :key="`i2${r}`">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX2+(c-1)*PW" :y="OY+(r-1)*PH" :width="PW-1" :height="PH-1"
            :fill="pixelColor(r-1, (c + Math.round(rotDeg/15)) % COLS)" rx="1"/>
        </g>
      </g>

      <!-- Flèche DUSt3R -->
      <text x="295" y="60" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">DUSt3R</text>
      <text x="295" y="73" text-anchor="middle"
        style="font-size:7.5px;fill:#94a3b8;font-family:sans-serif">→ Cartes de points</text>

      <!-- Panneau nuage 3D -->
      <rect :x="OX3-5" :y="OY3-5" :width="W3+10" :height="H3+10"
        fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text :x="OX3+W3/2" :y="OY3+5" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Nuage 3D (repère de I₁)
      </text>

      <!-- Points X^{2,1} (en rouge — I2 dans ref I1) -->
      <g v-for="(p, i) in pts3D_I2" :key="`p2${i}`">
        <circle :cx="p.sx" :cy="p.sy" r="3.5"
          fill="#CF1C24"
          :style="{ opacity: showConf ? p.conf * 0.9 : 0.7 }"
          stroke="none"/>
      </g>

      <!-- Points X^{1,1} (en bleu — I1 dans ref I1) -->
      <g v-for="(p, i) in pts3D_I1" :key="`p1${i}`">
        <circle :cx="p.sx" :cy="p.sy" r="3.5"
          fill="#1e40af"
          :style="{ opacity: showConf ? p.conf * 0.9 : 0.7 }"
          stroke="none"/>
      </g>

      <!-- Légende nuage -->
      <circle :cx="OX3+5" :cy="OY3+H3+2" r="4" fill="#1e40af" style="opacity:0.8"/>
      <text :x="OX3+12" :y="OY3+H3+6" style="font-size:7px;fill:#1e40af;font-family:sans-serif">X¹,¹ (I₁)</text>
      <circle :cx="OX3+70" :cy="OY3+H3+2" r="4" fill="#CF1C24" style="opacity:0.8"/>
      <text :x="OX3+77" :y="OY3+H3+6" style="font-size:7px;fill:#CF1C24;font-family:sans-serif">X²,¹ (I₂)</text>

      <!-- Explication insight -->
      <rect x="0" y="195" width="360" height="18" fill="#f0fdf4" rx="3" stroke="#86efac"/>
      <text x="180" y="207" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">
        X²,¹ : points de I₂ exprimés dans le repère de I₁
      </text>
    </svg>

    <div class="dust-controls">
      <label class="dust-sl">
        Rotation I₂
        <strong>{{ rotDeg }}°</strong>
        <input type="range" v-model.number="rotDeg" min="0" max="45" step="1"/>
      </label>
      <label class="dust-sl">
        Translation I₂
        <strong>{{ transl.toFixed(1) }}</strong>
        <input type="range" v-model.number="transl" min="0" max="1" step="0.05"/>
      </label>
      <label class="dust-toggle">
        <input type="checkbox" v-model="showConf"/>
        Afficher confiance
      </label>
    </div>
  </div>
</template>

<style scoped>
.dust-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.dust-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.dust-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dust-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.dust-sl strong { color: #CF1C24; min-width: 32px; display: inline-block; }
.dust-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.dust-toggle {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.72rem; color: #334155; cursor: pointer;
}
</style>
