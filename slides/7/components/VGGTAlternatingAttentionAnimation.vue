<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const nImages = ref(4)
const phase = ref<'idle'|'framewise'|'global'>('idle')
const autoPlay = ref(false)
const layerCount = ref(0)

let timer: ReturnType<typeof setInterval> | null = null

const N_TOKENS = 4  // tokens par image (2×2)

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

function playFramewise() {
  stopTimer()
  autoPlay.value = false
  phase.value = 'framewise'
}
function playGlobal() {
  stopTimer()
  autoPlay.value = false
  phase.value = 'global'
}
function playAuto() {
  autoPlay.value = true
  layerCount.value = 0
  phase.value = 'framewise'
  let toggle = true
  timer = setInterval(() => {
    toggle = !toggle
    phase.value = toggle ? 'global' : 'framewise'
    layerCount.value++
    if (layerCount.value >= 6) { stopTimer(); autoPlay.value = false; phase.value = 'idle' }
  }, 1000)
}
function stopAuto() {
  stopTimer(); autoPlay.value = false; phase.value = 'idle'
}

onUnmounted(stopTimer)

// ── Layout SVG ────────────────────────────────────────────────
// Images: rectangles de 60×50 espacés de 20px
const IMG_W = 55, IMG_H = 48
const IMG_GAP = 20
const OY = 35

function imgX(i: number): number {
  const n = nImages.value
  const totalW = n * IMG_W + (n - 1) * IMG_GAP
  return 15 + i * (IMG_W + IMG_GAP)
}

// Positions des tokens dans une image
function tokenPos(imgIdx: number, tokenIdx: number): { cx: number; cy: number } {
  const col = tokenIdx % 2, row = Math.floor(tokenIdx / 2)
  return {
    cx: imgX(imgIdx) + IMG_W * (0.25 + col * 0.5),
    cy: OY + IMG_H * (0.3 + row * 0.4),
  }
}

// ── Arêtes d'attention ────────────────────────────────────────
interface Attention { x1:number; y1:number; x2:number; y2:number; color:string; opacity:number }

const attentionEdges = computed((): Attention[] => {
  if (phase.value === 'idle') return []
  const edges: Attention[] = []
  const n = nImages.value

  if (phase.value === 'framewise') {
    // Attention intra-frame : tokens dans la même image se connectent
    for (let i = 0; i < n; i++) {
      for (let t1 = 0; t1 < N_TOKENS; t1++) {
        for (let t2 = t1 + 1; t2 < N_TOKENS; t2++) {
          const p1 = tokenPos(i, t1), p2 = tokenPos(i, t2)
          edges.push({ x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy, color: '#3b82f6', opacity: 0.5 })
        }
      }
    }
  } else {
    // Attention globale : quelques arêtes inter-images (pas toutes pour la lisibilité)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // Connecter token 0 de i avec token 0 de j, et token 3 de i avec token 2 de j
        for (const [t1, t2] of [[0, 0], [3, 2], [1, 3]]) {
          const p1 = tokenPos(i, t1 as number), p2 = tokenPos(j, t2 as number)
          edges.push({ x1: p1.cx, y1: p1.cy, x2: p2.cx, y2: p2.cy, color: '#F15A22', opacity: 0.4 })
        }
      }
    }
  }
  return edges
})

const phaseLabel = computed(() => {
  if (phase.value === 'framewise') return 'Intra-vue Self-Attention (bleu)'
  if (phase.value === 'global') return 'Global Cross-Image Attention (orange)'
  return 'Cliquer un bouton ou "Play" pour animer'
})
</script>

<template>
  <div class="vggt-wrap">
    <svg viewBox="0 0 560 215" class="vggt-svg">
      <defs>
        <marker id="vggtArrB" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#3b82f6"/>
        </marker>
        <marker id="vggtArrO" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#F15A22"/>
        </marker>
      </defs>

      <!-- Label phase -->
      <text x="280" y="14" text-anchor="middle"
        :style="`font-size:9px;fill:${phase==='framewise'?'#1e40af':phase==='global'?'#c2410c':'#64748b'};font-weight:700;font-family:sans-serif`">
        {{ phaseLabel }}
      </text>

      <!-- Arêtes d'attention -->
      <g v-for="(e, i) in attentionEdges" :key="i">
        <line :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
          :stroke="e.color" stroke-width="1.2"
          :style="{ opacity: e.opacity }"
          :marker-end="e.color === '#3b82f6' ? 'url(#vggtArrB)' : 'url(#vggtArrO)'"/>
      </g>

      <!-- Rectangles images + tokens -->
      <g v-for="i in nImages" :key="i">
        <rect :x="imgX(i-1)" :y="OY" :width="IMG_W" :height="IMG_H"
          :fill="phase==='framewise' ? '#eff6ff' : phase==='global' ? '#fff7ed' : '#f8fafc'"
          :stroke="phase==='framewise' ? '#3b82f6' : phase==='global' ? '#F15A22' : '#CBD5E1'"
          stroke-width="1.5" rx="4"/>
        <text :x="imgX(i-1) + IMG_W/2" :y="OY - 5" text-anchor="middle"
          style="font-size:7.5px;fill:#64748b;font-weight:700;font-family:sans-serif">I_{{ i }}</text>

        <!-- Tokens -->
        <g v-for="t in N_TOKENS" :key="t">
          <rect
            :x="tokenPos(i-1, t-1).cx - 7" :y="tokenPos(i-1, t-1).cy - 6"
            width="14" height="12"
            :fill="phase==='framewise' ? '#bfdbfe' : phase==='global' ? '#fed7aa' : '#e2e8f0'"
            stroke="white" stroke-width="1" rx="2"/>
        </g>

        <!-- Flèche vers les têtes de prédiction -->
        <line :x1="imgX(i-1)+IMG_W/2" :y1="OY+IMG_H+2"
          :x2="imgX(i-1)+IMG_W/2" :y2="OY+IMG_H+15"
          stroke="#CBD5E1" stroke-width="1" stroke-dasharray="2,2"/>
      </g>

      <!-- Têtes de prédiction -->
      <rect x="0" :y="OY+IMG_H+18" width="540" height="28"
        fill="#f0fdf4" rx="4" stroke="#86efac" stroke-width="1"/>
      <text x="270" :y="OY+IMG_H+30" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">
        Têtes de prédiction
      </text>
      <text x="270" :y="OY+IMG_H+42" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:sans-serif">
        Caméra (MLP) | Profondeur (DPT) | Points (DPT) | Suivi (CoTracker2)
      </text>

      <!-- Légende -->
      <rect x="0" :y="OY+IMG_H+50" width="540" height="22" fill="#f8fafc" rx="3" stroke="#e2e8f0"/>
      <rect x="8" :y="OY+IMG_H+57" width="16" height="10" fill="#bfdbfe" stroke="#3b82f6" stroke-width="1" rx="1"/>
      <text x="27" :y="OY+IMG_H+66"
        style="font-size:7.5px;fill:#1e40af;font-family:sans-serif">Intra-vue : relations spatiales dans une image</text>
      <rect x="270" :y="OY+IMG_H+57" width="16" height="10" fill="#fed7aa" stroke="#F15A22" stroke-width="1" rx="1"/>
      <text x="290" :y="OY+IMG_H+66"
        style="font-size:7.5px;fill:#c2410c;font-family:sans-serif">Globale : échanges entre les images</text>

      <!-- Compteur de couches -->
      <text x="500" y="14" text-anchor="end"
        style="font-size:8px;fill:#64748b;font-family:monospace">
        Couche {{ layerCount }}/6
      </text>
    </svg>

    <div class="vggt-controls">
      <label class="vggt-sl">
        N images
        <strong>{{ nImages }}</strong>
        <input type="range" v-model.number="nImages" min="2" max="6" step="1" @change="stopAuto"/>
      </label>
      <button class="vggt-btn" :class="{ active: phase==='framewise' }" @click="playFramewise">
        Intra-vue
      </button>
      <button class="vggt-btn" :class="{ active: phase==='global' }" @click="playGlobal">
        Global
      </button>
      <button class="vggt-btn-main" :class="{ active: autoPlay }" @click="autoPlay ? stopAuto() : playAuto()">
        {{ autoPlay ? '⏸ Pause' : '▶ Lecture automatique' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.vggt-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.vggt-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.vggt-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.vggt-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.vggt-sl strong { color: #CF1C24; min-width: 18px; display: inline-block; }
.vggt-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.vggt-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b; font-weight: 600;
  transition: background 0.15s;
}
.vggt-btn.active { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
.vggt-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.vggt-btn-main.active { background: #CF1C24; color: white; }
.vggt-btn-main:hover:not(.active) { background: #CF1C24; color: white; }
</style>
