<script setup lang="ts">
import { ref, computed } from 'vue'

const iter = ref(0)
const showColormap = ref(false)

const N_ITER = 12
const COLS = 7, ROWS = 5
const PW = 24, PH = 24
const OX1 = 12, OX2 = 210, OY = 28

// Vecteurs de flux "vrais" (mouvement simulé : expansion vers l'extérieur = caméra avance)
function trueFlow(row: number, col: number): { u: number; v: number } {
  const cx = COLS / 2 - 0.5, cy = ROWS / 2 - 0.5
  const dx = col - cx, dy = row - cy
  const mag = Math.sqrt(dx * dx + dy * dy) + 0.1
  return { u: dx / mag * 2.5, v: dy / mag * 1.5 }
}

// Flux estimé à itération k : interpolation entre 0 et vrai flux
function estimatedFlow(row: number, col: number, k: number): { u: number; v: number } {
  const t = 1 - Math.exp(-0.5 * k)
  const f = trueFlow(row, col)
  const noise = (Math.sin(row * 3.7 + col * 2.1) * 0.3) * (1 - t)
  return { u: f.u * t + noise, v: f.v * t + noise }
}

// Couleur HSV pour le flux (wheel standard optique)
function flowToHSV(u: number, v: number): string {
  const mag = Math.min(Math.sqrt(u * u + v * v) / 3, 1)
  const angle = Math.atan2(-v, u) / Math.PI * 180
  const hue = (angle + 360) % 360
  // HSV to RGB
  const c = mag
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1))
  const m = 1 - c
  let r = 0, g = 0, b = 0
  if (hue < 60) { r = c; g = x }
  else if (hue < 120) { r = x; g = c }
  else if (hue < 180) { g = c; b = x }
  else if (hue < 240) { g = x; b = c }
  else if (hue < 300) { r = x; b = c }
  else { r = c; b = x }
  return `rgb(${Math.round((r+m)*255)},${Math.round((g+m)*255)},${Math.round((b+m)*255)})`
}

function pixelColor(row: number, col: number): string {
  // Image I1 : couleurs de base par zone
  const baseColors = ['#bfdbfe','#ddd6fe','#fce7f3','#dcfce7','#fef3c7','#fee2e2']
  return baseColors[(row * COLS + col) % baseColors.length]
}

function arrowFor(row: number, col: number): { x1:number;y1:number;x2:number;y2:number } {
  const f = estimatedFlow(row, col, iter.value)
  const x1 = OX2 + col * PW + PW / 2
  const y1 = OY + row * PH + PH / 2
  const scale = 6
  return { x1, y1, x2: x1 + f.u * scale, y2: y1 + f.v * scale }
}

function replay() { iter.value = 0 }
</script>

<template>
  <div class="raft-wrap">
    <svg viewBox="0 0 540 215" class="raft-svg">
      <defs>
        <marker id="raftArr" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#CF1C24"/>
        </marker>
      </defs>

      <!-- Label I1 -->
      <text :x="OX1 + COLS*PW/2" y="18" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">I₁</text>
      <!-- Label I2 / Flux -->
      <text :x="OX2 + COLS*PW/2" y="18" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ showColormap ? 'Flux (couleurs)' : 'Flux optique' }} — k={{ iter }}
      </text>

      <!-- Image I1 -->
      <g v-for="r in ROWS" :key="r">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX1+(c-1)*PW" :y="OY+(r-1)*PH" :width="PW-1" :height="PH-1"
            :fill="pixelColor(r-1,c-1)" rx="1"/>
          <!-- Points clés -->
          <circle :cx="OX1+(c-1)*PW+PW/2" :cy="OY+(r-1)*PH+PH/2" r="3"
            fill="#1e40af" style="opacity:0.6"/>
        </g>
      </g>

      <!-- Image I2 : colormap ou vecteurs -->
      <g v-for="r in ROWS" :key="`f${r}`">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX2+(c-1)*PW" :y="OY+(r-1)*PH" :width="PW-1" :height="PH-1"
            :fill="showColormap ? flowToHSV(estimatedFlow(r-1,c-1,iter).u, estimatedFlow(r-1,c-1,iter).v) : pixelColor(r-1,c-1)"
            rx="1"/>
          <!-- Flèches de flux si pas colormap -->
          <line v-if="!showColormap"
            :x1="arrowFor(r-1,c-1).x1" :y1="arrowFor(r-1,c-1).y1"
            :x2="arrowFor(r-1,c-1).x2" :y2="arrowFor(r-1,c-1).y2"
            stroke="#CF1C24" stroke-width="1.5" marker-end="url(#raftArr)"/>
        </g>
      </g>

      <!-- Panneau EPE -->
      <rect x="382" y="5" width="155" height="130" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="459" y="17" text-anchor="middle"
        style="font-size:8px;fill:#64748b;font-weight:700;font-family:sans-serif">EPE par itération</text>
      <g v-for="k in N_ITER + 1" :key="k">
        <circle
          :cx="390 + (k-1) * 11"
          :cy="95 - (1 - Math.exp(-0.5*(k-1))) * 75"
          :r="k-1 <= iter ? 4 : 2"
          :fill="k-1 <= iter ? '#CF1C24' : '#e2e8f0'"
          stroke="white" stroke-width="1"/>
      </g>
      <polyline
        :points="Array.from({length: iter+1}, (_,k) =>
          `${390+k*11},${(95 - (1-Math.exp(-0.5*k))*75).toFixed(1)}`).join(' ')"
        fill="none" stroke="#CF1C24" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="388" y1="95" x2="532" y2="95" stroke="#e2e8f0" stroke-width="0.8"/>
      <line x1="388" y1="20" x2="388" y2="96" stroke="#475569" stroke-width="1"/>
      <text x="388" y="108" style="font-size:7px;fill:#94a3b8;font-family:sans-serif">k=0</text>
      <text x="520" y="108" style="font-size:7px;fill:#94a3b8;font-family:sans-serif">k=12</text>

      <!-- Légende colormap -->
      <rect x="382" y="142" width="155" height="40" fill="#f8fafc" rx="4" stroke="#CBD5E1"/>
      <text x="459" y="154" text-anchor="middle"
        style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">Couleurs du flux optique</text>
      <g v-for="i in 12" :key="i">
        <rect :x="385 + (i-1)*12" y="158" width="12" height="10"
          :fill="flowToHSV(Math.cos((i-1)*30*Math.PI/180)*2, Math.sin((i-1)*30*Math.PI/180)*2)"
          rx="1"/>
      </g>
      <text x="385" y="178" style="font-size:6.5px;fill:#94a3b8;font-family:sans-serif">→ ↗ ↑ ↖ ← ↙ ↓ ↘</text>
    </svg>

    <div class="raft-controls">
      <label class="raft-sl">
        Itération k
        <strong>{{ iter }}</strong>
        <input type="range" v-model.number="iter" min="0" :max="N_ITER" step="1"/>
      </label>
      <label class="raft-toggle">
        <input type="checkbox" v-model="showColormap"/>
        Couleurs
      </label>
      <button class="raft-btn" @click="replay">↺</button>
      <span class="raft-info">{{ iter === 0 ? 'Initialisation : flux nul' : iter === N_ITER ? 'Flux de référence atteint' : `Raffinement en cours…` }}</span>
    </div>
  </div>
</template>

<style scoped>
.raft-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.raft-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.raft-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.raft-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.raft-sl strong { color: #CF1C24; min-width: 20px; display: inline-block; }
.raft-sl input[type=range] { width: 130px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.raft-toggle {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.72rem; color: #334155; cursor: pointer;
}
.raft-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.raft-info { font-size: 0.68rem; color: #64748b; font-style: italic; }
</style>
