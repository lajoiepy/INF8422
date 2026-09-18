<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Rétroprojection pinhole : profondeur → point 3D ───────────────
// La carte de profondeur (gauche) est RENDUE par vrai ray-casting sur
// une scène 3D simple (mur du fond, sol, caisse). Convention caméra :
// X à droite, Y vers le BAS, Z vers l'avant.
// Cliquer un pixel (u,v) : le point 3D est p = Z(u,v) · K⁻¹ [u,v,1]ᵀ
// soit X = Z(u-cx)/f, Y = Z(v-cy)/f — visualisé dans la vue latérale
// (plan Y-Z). Le slider f montre l'effet de la focale (champ de vision).
const IW = 40, IH = 30           // résolution de l'image
const f = ref(30)                // focale en pixels
const cx = IW / 2, cy = IH / 2
const sel = ref<{ u: number; v: number } | null>({ u: 26, v: 17 })

// ── Scène 3D (mètres, caméra à l'origine) ─────────────────────────
const FLOOR_Y = 1.0              // sol 1 m sous la caméra (Y vers le bas)
const WALL_Z = 5.0
const BOX = { x1: -0.7, x2: 0.7, y1: 0.15, y2: FLOOR_Y, z: 2.2 }  // face avant

// Profondeur projective Z du premier objet touché par le rayon du pixel (u,v)
function depthAt(u: number, v: number): number {
  const dx = (u + 0.5 - cx) / f.value
  const dy = (v + 0.5 - cy) / f.value
  let z = WALL_Z
  if (dy > 1e-9) {                       // sol : y = FLOOR_Y → Z = FLOOR_Y/dy
    const zf = FLOOR_Y / dy
    if (zf < z) z = zf
  }
  // caisse : face avant en z = BOX.z
  const bx = BOX.z * dx, by = BOX.z * dy
  if (BOX.z < z && bx >= BOX.x1 && bx <= BOX.x2 && by >= BOX.y1 && by <= BOX.y2) z = BOX.z
  return z
}

const depthImage = computed(() => {
  const rows: number[][] = []
  for (let v = 0; v < IH; v++) {
    const row: number[] = []
    for (let u = 0; u < IW; u++) row.push(depthAt(u, v))
    rows.push(row)
  }
  return rows
})

function depthColor(z: number): string {
  const t = Math.min(Math.max((z - 1.2) / (WALL_Z - 1.2), 0), 1)
  const R = Math.round(215 - t * 185), G = Math.round(70 + t * 70), B = Math.round(45 + t * 195)
  return `rgb(${R},${G},${B})`
}

// ── Point 3D du pixel sélectionné ─────────────────────────────────
const selPoint = computed(() => {
  if (!sel.value) return null
  const { u, v } = sel.value
  const Z = depthAt(u, v)
  const X = Z * (u + 0.5 - cx) / f.value
  const Y = Z * (v + 0.5 - cy) / f.value
  return { X, Y, Z, u, v }
})

// ── Layout ────────────────────────────────────────────────────────
const PX = 5                      // px SVG par pixel image
const IMG_X = 15, IMG_Y = 24
function imgX(u: number) { return IMG_X + u * PX }
function imgY(v: number) { return IMG_Y + v * PX }

// Vue latérale (plan Y-Z) : Z vers la droite, Y vers le bas (convention caméra)
const SVX = 250, SVY_C = 84, SM = 48   // origine caméra, échelle px/m
const svz = (z: number) => SVX + z * SM
const svy = (y: number) => SVY_C + y * SM

// Frustum : rayons passant par le haut (v=0) et le bas (v=IH) de l'image
const frustum = computed(() => {
  const dyTop = (0.5 - cy) / f.value
  const dyBot = (IH - 0.5 - cy) / f.value
  const zEnd = 5.6
  return {
    top: { x2: svz(zEnd), y2: svy(zEnd * dyTop) },
    bot: { x2: svz(zEnd), y2: svy(Math.min(zEnd * dyBot, 1.35)) },
  }
})

function handleImgClick(e: MouseEvent) {
  const svg = (e.currentTarget as SVGElement).closest('svg') as SVGSVGElement
  const r = svg.getBoundingClientRect()
  const sx = (e.clientX - r.left) * (560 / r.width)
  const sy = (e.clientY - r.top) * (215 / r.height)
  const u = Math.floor((sx - IMG_X) / PX)
  const v = Math.floor((sy - IMG_Y) / PX)
  if (u >= 0 && u < IW && v >= 0 && v < IH) sel.value = { u, v }
}
</script>

<template>
  <div class="ph-wrap">
    <svg viewBox="0 0 560 215" class="ph-svg">
      <!-- ══════ GAUCHE : carte de profondeur ══════ -->
      <rect x="0" y="0" width="232" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="116" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Carte de profondeur I_D ({{ IW }}×{{ IH }})
      </text>

      <g @click="handleImgClick" style="cursor:crosshair">
        <template v-for="(row, v) in depthImage" :key="v">
          <rect v-for="(z, u) in row" :key="u"
            :x="imgX(u)" :y="imgY(v)" :width="PX" :height="PX"
            :fill="depthColor(z)"/>
        </template>
      </g>

      <!-- pixel sélectionné -->
      <g v-if="sel" style="pointer-events:none">
        <rect :x="imgX(sel.u)" :y="imgY(sel.v)" :width="PX" :height="PX"
          fill="none" stroke="white" stroke-width="1.5"/>
        <rect :x="imgX(sel.u)-1.5" :y="imgY(sel.v)-1.5" :width="PX+3" :height="PX+3"
          fill="none" stroke="#1e293b" stroke-width="1"/>
      </g>

      <text x="116" y="188" text-anchor="middle"
        style="font-size:7px;fill:#94a3b8;font-family:sans-serif">
        ← cliquer un pixel (u,v) · rouge = proche, bleu = loin
      </text>
      <text v-if="selPoint" x="116" y="200" text-anchor="middle"
        style="font-size:7.5px;fill:#1e293b;font-weight:700;font-family:monospace">
        (u,v)=({{ selPoint.u }},{{ selPoint.v }}) · Z={{ selPoint.Z.toFixed(2) }} m
      </text>

      <!-- ══════ DROITE : vue latérale Y-Z ══════ -->
      <rect x="239" y="0" width="319" height="160" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="398" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Vue latérale (plan Y-Z, Y vers le bas)
      </text>

      <!-- scène : sol, mur, caisse -->
      <line :x1="svz(0)" :y1="svy(FLOOR_Y)" :x2="svz(5.4)" :y2="svy(FLOOR_Y)" stroke="#78716c" stroke-width="2.5"/>
      <text :x="svz(4.6)" :y="svy(FLOOR_Y) + 10" style="font-size:6.5px;fill:#78716c;font-family:sans-serif">sol</text>
      <line :x1="svz(WALL_Z)" :y1="svy(-1.15)" :x2="svz(WALL_Z)" :y2="svy(FLOOR_Y)" stroke="#78716c" stroke-width="2.5"/>
      <text :x="svz(WALL_Z) - 3" :y="svy(-1.0)" text-anchor="end" style="font-size:6.5px;fill:#78716c;font-family:sans-serif">mur</text>
      <rect :x="svz(BOX.z)" :y="svy(BOX.y1)" :width="12" :height="svy(BOX.y2) - svy(BOX.y1)"
        fill="#a8a29e" stroke="#78716c" stroke-width="1"/>
      <text :x="svz(BOX.z) + 6" :y="svy(BOX.y1) - 4" text-anchor="middle" style="font-size:6.5px;fill:#78716c;font-family:sans-serif">caisse</text>

      <!-- frustum -->
      <line :x1="svz(0)" :y1="svy(0)" :x2="frustum.top.x2" :y2="frustum.top.y2"
        stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="4,3"/>
      <line :x1="svz(0)" :y1="svy(0)" :x2="frustum.bot.x2" :y2="frustum.bot.y2"
        stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="4,3"/>

      <!-- caméra -->
      <path :d="`M ${svz(0)} ${svy(0)} l -10 -7 l 0 14 Z`" fill="#334155"/>
      <text :x="svz(0) - 14" :y="svy(0) + 3" text-anchor="end" style="font-size:7px;fill:#334155;font-family:sans-serif">caméra</text>
      <!-- plan image (à z = f, échelle symbolique) -->
      <line :x1="svz(0.55)" :y1="svy(-0.62)" :x2="svz(0.55)" :y2="svy(0.62)"
        stroke="#00BDF2" stroke-width="1.8"/>
      <text :x="svz(0.55)" :y="svy(-0.7)" text-anchor="middle" style="font-size:6px;fill:#0284c7;font-family:sans-serif">plan image</text>

      <!-- rayon du pixel sélectionné + point 3D -->
      <g v-if="selPoint">
        <line :x1="svz(0)" :y1="svy(0)"
          :x2="svz(selPoint.Z)" :y2="svy(selPoint.Y)"
          stroke="#F15A22" stroke-width="1.8"/>
        <circle :cx="svz(selPoint.Z)" :cy="svy(selPoint.Y)" r="4.5"
          fill="#CF1C24" stroke="white" stroke-width="1.5"/>
        <text :x="svz(selPoint.Z)" :y="svy(selPoint.Y) - 8" text-anchor="middle"
          style="font-size:7px;fill:#CF1C24;font-weight:700;font-family:monospace">
          p = ({{ selPoint.X.toFixed(2) }}, {{ selPoint.Y.toFixed(2) }}, {{ selPoint.Z.toFixed(2) }})
        </text>
      </g>

      <!-- ══════ BAS-DROITE : équation ══════ -->
      <rect x="239" y="166" width="319" height="44" fill="#f0fdf4" rx="4" stroke="#86efac" stroke-width="1"/>
      <text x="398" y="180" text-anchor="middle"
        style="font-size:8px;fill:#15803d;font-weight:700;font-family:monospace">
        p = Z(u,v) · K⁻¹ [u, v, 1]ᵀ
      </text>
      <text v-if="selPoint" x="398" y="194" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:monospace">
        X = Z(u-cx)/f = {{ selPoint.Z.toFixed(2) }}·({{ selPoint.u }}-{{ cx }})/{{ f }} = {{ selPoint.X.toFixed(2) }} m
      </text>
      <text v-if="selPoint" x="398" y="205" text-anchor="middle"
        style="font-size:7.5px;fill:#15803d;font-family:monospace">
        Y = Z(v-cy)/f = {{ selPoint.Z.toFixed(2) }}·({{ selPoint.v }}-{{ cy }})/{{ f }} = {{ selPoint.Y.toFixed(2) }} m
      </text>
    </svg>

    <div class="ph-controls">
      <label class="ph-sl">
        Focale f
        <strong>{{ f }} px</strong>
        <input type="range" v-model.number="f" min="18" max="55" step="1"/>
      </label>
      <span class="ph-info">
        FOV horizontal = 2·atan({{ cx }}/f) = {{ (2 * Math.atan(cx / f) * 180 / Math.PI).toFixed(0) }}° —
        petite focale = grand angle (l'image "recule"), le frustum s'ouvre.
      </span>
    </div>
  </div>
</template>

<style scoped>
.ph-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ph-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ph-controls { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ph-sl {
  display: flex; align-items: center; gap: 5px;
  font-family: monospace; font-size: 0.72rem; color: #334155;
}
.ph-sl strong { color: #CF1C24; min-width: 42px; display: inline-block; }
.ph-sl input[type=range] { width: 120px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.ph-info { font-size: 0.66rem; color: #64748b; font-style: italic; }
</style>
