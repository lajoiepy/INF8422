<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Sliders ────────────────────────────────────────────────
const X   = ref(1.2)    // base X : -2 to 2
const Y   = ref(0.8)    // base Y : -2 to 2
const Z   = ref(2.5)    // base depth : 1.5 to 5
const fPx = ref(400)    // focal length in pixels : 200 to 700
const lam = ref(1.0)    // λ : slides P along the viewing ray

// ── Actual 3D point = λ·(X, Y, Z) ────────────────────────
const Xw = computed(() => lam.value * X.value)
const Yw = computed(() => lam.value * Y.value)
const Zw = computed(() => lam.value * Z.value)

// ── Fixed image parameters ─────────────────────────────────
const W = 640, H = 480
const cx = W / 2, cy = H / 2

// ── Projection: only X/Z and Y/Z matter (λ cancels out!) ──
const xn = computed(() => X.value / Z.value)   // = Xw/Zw
const yn = computed(() => Y.value / Z.value)
const uNum = computed(() => fPx.value * xn.value + cx)
const vNum = computed(() => fPx.value * yn.value + cy)
const inImage = computed(() =>
  uNum.value >= 0 && uNum.value <= W && vNum.value >= 0 && vNum.value <= H)

// ── SVG constants ──────────────────────────────────────────
const VW = 490, VH = 300
const CAM_X = 70, CAM_Y = 150
const SCALE_Z = 70, SCALE_Y = 60

// ── Image plane position — moves with focal length ────────
// At fPx=400 (default), plane is at SCALE_Z = 70 units from camera
const planeX = computed(() => CAM_X + fPx.value * SCALE_Z / 400)

// ── P position in SVG (at λ·(X,Y,Z)) ─────────────────────
const ptX = computed(() => CAM_X + Zw.value * SCALE_Z)
const ptY = computed(() => CAM_Y - Yw.value * SCALE_Y)

// ── Projected point on image plane ────────────────────────
// By similar triangles: projY = CAM_Y - yn * SCALE_Y * (f_svg / SCALE_Z)
// f_svg = fPx * SCALE_Z / 400, so: projY = CAM_Y - yn * SCALE_Y * fPx / 400
// λ still cancels (yn = Y/Z regardless of λ)
const projSvgY = computed(() => CAM_Y - yn.value * SCALE_Y * fPx.value / 400)

// ── Ambiguity ray through camera ──────────────────────────
const rayY0  = computed(() => CAM_Y + yn.value * SCALE_Y)
const rayYVW = computed(() => CAM_Y - yn.value * (SCALE_Y / SCALE_Z) * (VW - CAM_X))

// ── Image display ──────────────────────────────────────────
const IMG_W = 160, IMG_H = 120
const uDisp = computed(() => (uNum.value / W) * IMG_W)
const vDisp = computed(() => (vNum.value / H) * IMG_H)

const camTri = `${CAM_X},${CAM_Y-20} ${CAM_X-18},${CAM_Y+14} ${CAM_X+18},${CAM_Y+14}`
</script>

<template>
  <div class="ph-wrap">
    <div class="ph-main">

      <!-- ── SVG side view ───────────────────────────────── -->
      <svg :viewBox="`0 0 ${VW} ${VH}`" class="ph-svg">
        <defs>
          <marker id="arrZ" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8"/>
          </marker>
          <marker id="arrY" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8"/>
          </marker>
          <marker id="fA1" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#F15A22"/>
          </marker>
          <marker id="fA2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
            <path d="M0,0 L6,3 L0,6 Z" fill="#F15A22"/>
          </marker>
          <clipPath id="clip"><rect x="0" y="0" :width="VW" :height="VH"/></clipPath>
        </defs>

        <rect width="100%" height="100%" fill="#f8fafc" rx="8"/>

        <!-- Grid -->
        <g style="opacity:0.15" stroke="#94a3b8" stroke-width="0.5">
          <line v-for="n in [1,2,3,4,5]" :key="`gz${n}`"
            :x1="CAM_X+n*SCALE_Z" y1="20" :x2="CAM_X+n*SCALE_Z" y2="280"/>
          <line v-for="n in [-2,-1,0,1,2]" :key="`gy${n}`"
            x1="60" :y1="CAM_Y-n*SCALE_Y" x2="470" :y2="CAM_Y-n*SCALE_Y"/>
        </g>

        <!-- Ambiguity ray: all λ·(X,Y,Z) share the same pixel -->
        <line x1="0" :y1="rayY0" :x2="VW" :y2="rayYVW"
          stroke="#00BDF2" stroke-width="2" stroke-dasharray="10,5" style="opacity:0.5"
          clip-path="url(#clip)"
          :style="{ transition: 'y1 0.12s, y2 0.12s' }"/>

        <!-- Axes -->
        <line :x1="CAM_X" :y1="CAM_Y" x2="467" :y2="CAM_Y"
          stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrZ)"/>
        <text x="472" :y="CAM_Y+4" style="font-size:5px" fill="#64748b" font-style="italic">Z</text>
        <line :x1="CAM_X" y1="285" :x2="CAM_X" y2="18"
          stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrY)"/>
        <text :x="CAM_X-6" y="14" style="font-size:5px" fill="#64748b" font-style="italic" text-anchor="middle">Y</text>

        <text v-for="n in [1,2,3,4,5]" :key="`lz${n}`"
          :x="CAM_X+n*SCALE_Z" :y="CAM_Y+14" style="font-size:5px" fill="#94a3b8" text-anchor="middle">{{ n }}</text>
        <text v-for="n in [-2,-1,1,2]" :key="`ly${n}`"
          :x="CAM_X-6" :y="CAM_Y-n*SCALE_Y+4" style="font-size:5px" fill="#94a3b8" text-anchor="end">{{ n }}</text>

        <!-- Optical axis -->
        <line :x1="CAM_X" :y1="CAM_Y" x2="462" :y2="CAM_Y"
          stroke="#CBD5E1" stroke-width="1" stroke-dasharray="6,4"/>

        <!-- Image plane — position animée selon f -->
        <line :x1="planeX" y1="22" :x2="planeX" y2="278" stroke="#F15A22" stroke-width="3"
          :style="{ transition: 'x1 0.12s, x2 0.12s' }"/>
        <text :x="planeX+5" y="22" style="font-size:5px" fill="#F15A22" font-weight="700"
          :style="{ transition: 'x 0.12s' }">plan image</text>

        <!-- F bracket -->
        <line :x1="CAM_X+2" y1="283" :x2="planeX-2" y2="283"
          stroke="#F15A22" stroke-width="1.2" marker-start="url(#fA2)" marker-end="url(#fA1)"
          :style="{ transition: 'x2 0.12s' }"/>
        <text :x="(CAM_X+planeX)/2" y="293" style="font-size:5px" fill="#F15A22"
          text-anchor="middle" font-style="italic"
          :style="{ transition: 'x 0.12s' }">F</text>

        <!-- Projection ray P → pinhole → image plane -->
        <line :x1="ptX" :y1="ptY" :x2="CAM_X" :y2="CAM_Y"
          stroke="#25B34B" stroke-width="2" style="opacity:0.8"
          :style="{ transition: 'x1 0.12s, y1 0.12s' }"/>
        <line :x1="CAM_X" :y1="CAM_Y" :x2="planeX" :y2="projSvgY"
          stroke="#25B34B" stroke-width="2" stroke-dasharray="5,3" style="opacity:0.7"
          :style="{ transition: 'x2 0.12s, y2 0.12s' }"/>

        <!-- Camera -->
        <polygon :points="camTri" style="fill:#475569;fill-opacity:0.12;stroke-opacity:0.4" stroke="#475569"
          stroke-width="1.2"/>
        <circle :cx="CAM_X" :cy="CAM_Y" r="5" fill="#475569"/>
        <text :x="CAM_X" :y="CAM_Y+28" style="font-size:5px" fill="#475569" text-anchor="middle" font-weight="600">O</text>

        <!-- P at λ·(X,Y,Z) -->
        <circle :cx="ptX" :cy="ptY" r="11"
          fill="#CF1C24" stroke="white" stroke-width="2.5"
          :style="{ transition: 'cx 0.12s, cy 0.12s' }"/>
        <text :x="ptX+14" :y="ptY-8" style="font-size:5px" fill="#CF1C24" font-weight="700"
          :style="{ transition: 'x 0.12s, y 0.12s' }">P</text>
        <text :x="ptX+14" :y="ptY+5" style="font-size:3px" fill="#CF1C24"
          :style="{ transition: 'x 0.12s, y 0.12s' }">
          ({{ Xw.toFixed(2) }}, {{ Yw.toFixed(2) }}, {{ Zw.toFixed(2) }})
        </text>

        <!-- Projected point -->
        <circle :cx="planeX" :cy="projSvgY" r="8"
          fill="#F15A22" stroke="white" stroke-width="2.5"
          :style="{ transition: 'cx 0.12s, cy 0.12s' }"/>
        <text :x="planeX+11" :y="projSvgY+4" style="font-size:5px" fill="#F15A22"
          font-weight="700" :style="{ transition: 'x 0.12s, y 0.12s' }">(u, v)</text>
      </svg>

      <!-- ── Right panel ──────────────────────────────────── -->
      <div class="ph-right">

        <!-- Image display -->
        <div class="ph-image-section">
          <p class="img-title">Plan image (640 × 480 px)</p>
          <div class="ph-image" :class="{ out: !inImage }">
            <div class="ch-h"/><div class="ch-v"/>
            <div v-if="inImage" class="proj-dot"
              :style="{ left: uDisp+'px', top: vDisp+'px' }"/>
            <div v-else class="out-overlay">hors cadre</div>
          </div>
          <p class="img-coords">
            <span v-if="inImage" class="coord-ok">({{ uNum.toFixed(0) }}, {{ vNum.toFixed(0) }}) px</span>
            <span v-else class="coord-ko">hors image</span>
          </p>
        </div>

        <!-- Sliders -->
        <div class="ph-sliders">
          <div class="slider-row">
            <label>X = <strong>{{ X.toFixed(2) }}</strong></label>
            <input type="range" v-model.number="X" min="-2" max="2" step="0.05"/>
          </div>
          <div class="slider-row">
            <label>Y = <strong>{{ Y.toFixed(2) }}</strong></label>
            <input type="range" v-model.number="Y" min="-2" max="2" step="0.05"/>
          </div>
          <div class="slider-row">
            <label>Z = <strong>{{ Z.toFixed(2) }}</strong></label>
            <input type="range" v-model.number="Z" min="1.5" max="5" step="0.05"/>
          </div>
          <div class="slider-row">
            <label>f = <strong>{{ fPx }} px</strong></label>
            <input type="range" v-model.number="fPx" min="200" max="700" step="10"/>
          </div>
          <div class="divider"/>
          <div class="slider-row">
            <label class="lam-label">λ = <strong>{{ lam.toFixed(2) }}</strong></label>
            <input type="range" v-model.number="lam" min="0.4" max="2.5" step="0.05"
              class="lam-input"/>
          </div>
          <p class="lam-hint">← déplacer P le long du rayon</p>
        </div>

        <!-- Formulas -->
        <div class="ph-formulas">
          <div class="formula-line">
            <span class="vn">u</span>
            <span class="eq"> = f · <em>X/Z</em> + c<sub>x</sub></span>
            <span class="calc"> = {{ fPx }}·<em>{{ xn.toFixed(3) }}</em> + {{ cx }}</span>
            = <span :class="inImage ? 'rok' : 'rko'">{{ uNum.toFixed(0) }}</span>
          </div>
          <div class="formula-line mt1">
            <span class="vn">v</span>
            <span class="eq"> = f · <em>Y/Z</em> + c<sub>y</sub></span>
            <span class="calc"> = {{ fPx }}·<em>{{ yn.toFixed(3) }}</em> + {{ cy }}</span>
            = <span :class="inImage ? 'rok' : 'rko'">{{ vNum.toFixed(0) }}</span>
          </div>
          <div class="depth-loss">
            ⚠ λ s'annule : <strong>(u,v) ne change pas</strong> avec λ.<br/>
            La profondeur Z est <strong>perdue</strong>.
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.ph-wrap { width: 100%; }
.ph-main { display: flex; gap: 14px; align-items: stretch; height: 335px; }
.ph-svg  { flex: 0 0 57%; min-width: 0; }
.ph-right { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }

.ph-image-section { flex-shrink: 0; }
.img-title { font-size: 0.62rem; color: #64748b; margin: 0 0 3px; font-weight: 600; }
.ph-image {
  position: relative; width: 160px; height: 120px;
  border: 1.5px solid #CBD5E1; background: #fff; overflow: hidden; border-radius: 3px;
}
.ph-image.out { border-color: #CF1C24; background: #fff5f5; }
.ch-h { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e2e8f0; transform: translateY(-50%); }
.ch-v { position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #e2e8f0; transform: translateX(-50%); }
.proj-dot {
  position: absolute; width: 12px; height: 12px;
  background: #F15A22; border-radius: 50%; border: 2px solid white;
  box-shadow: 0 0 6px rgba(241,90,34,0.6);
  transform: translate(-50%, -50%);
  transition: left 0.12s, top 0.12s;
}
.out-overlay {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(207,28,36,0.08); color: #CF1C24; font-size: 0.65rem; font-weight: 700;
}
.img-coords { font-size: 0.62rem; margin: 3px 0 0; font-family: monospace; }
.coord-ok { color: #25B34B; font-weight: 600; }
.coord-ko { color: #CF1C24; font-weight: 600; }

.ph-sliders { display: flex; flex-direction: column; gap: 4px; }
.slider-row { display: flex; align-items: center; gap: 8px; }
.slider-row label { font-family: monospace; font-size: 0.68rem; color: #334155; width: 90px; flex-shrink: 0; }
.slider-row label strong { color: #CF1C24; }
.slider-row input[type=range] { flex: 1; height: 4px; accent-color: #CF1C24; cursor: pointer; }

.divider { height: 1px; background: #e2e8f0; margin: 3px 0; }
.lam-label { color: #0369a1 !important; }
.lam-label strong { color: #0284c7 !important; }
.lam-input { accent-color: #00BDF2 !important; height: 5px !important; }
.lam-hint { font-size: 0.6rem; color: #0284c7; margin: 0 0 0 98px; font-style: italic; }

.ph-formulas {
  font-family: monospace; font-size: 0.67rem; line-height: 1.55;
  color: #334155; background: #f1f5f9; border-radius: 6px; padding: 7px 10px; flex-shrink: 0;
}
.formula-line { display: block; }
.mt1 { margin-top: 3px; }
.vn   { font-weight: 700; color: #1e293b; font-size: 0.74rem; }
.eq em { color: #CF1C24; font-style: normal; font-weight: 700; }
.eq   { color: #475569; }
.calc { color: #64748b; }
.calc em { color: #CF1C24; font-style: normal; font-weight: 700; }
.rok  { color: #25B34B; font-weight: 700; }
.rko  { color: #CF1C24; font-weight: 700; }

.depth-loss {
  margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0;
  font-size: 0.64rem; color: #475569; line-height: 1.5;
}
.depth-loss strong { color: #CF1C24; }
</style>
