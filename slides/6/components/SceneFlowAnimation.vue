<script setup lang="ts">
import { ref, computed } from 'vue'

// ── PRNG seedé ────────────────────────────────────────────────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Scène BEV dans le repère robot à l'instant t ──────────────
// Fond statique : mur du haut, mur de droite, voiture stationnée.
// Objet mobile : voiture (12 points) avec mouvement propre m.
interface Pt { x: number; y: number; dyn: boolean }
const points: Pt[] = (() => {
  const rng = mulberry32(17)
  const pts: Pt[] = []
  for (let i = 0; i < 26; i++) pts.push({ x: 1.5 + 16.5 * i / 25 + 0.06 * (rng() - 0.5), y: 10.3 + 0.12 * (rng() - 0.5), dyn: false })
  for (let i = 0; i < 13; i++) pts.push({ x: 18 + 0.12 * (rng() - 0.5), y: 2 + 8 * i / 12 + 0.05 * (rng() - 0.5), dyn: false })
  for (let i = 0; i < 10; i++) pts.push({ x: 3.5 + 2.2 * rng(), y: 1.8 + 1.3 * rng(), dyn: false })
  for (let i = 0; i < 12; i++) pts.push({ x: 8.5 + 2.4 * rng(), y: 4.6 + 1.2 * rng(), dyn: true })
  return pts
})()
const N_DYN = points.filter(p => p.dyn).length

// Mouvement propre de l'objet mobile (repère t, en m par pas)
const M_OBJ = { x: 0.85, y: 0.3 }

// ── Ego-motion SE(2) réelle et estimée ────────────────────────
const egoSpeed = ref(0.6)   // translation avant (m / pas)
const egoRotDeg = ref(2.5)  // rotation (° / pas)
const egoErrDeg = ref(0)    // biais sur la rotation ESTIMÉE
const compensate = ref(false)
const eps = ref(0.3)

// Coordonnées d'un point (repère t) exprimées dans le repère t+1 :
// p' = R(dθ)ᵀ (p_world − d), le robot est à l'origine, avance en +x.
function toNextFrame(px: number, py: number, dx: number, dth: number): { x: number; y: number } {
  const c = Math.cos(dth), s = Math.sin(dth)
  const tx = px - dx, ty = py
  return { x: c * tx + s * ty, y: -s * tx + c * ty }
}

// Positions à t+1 (vraie physique) : statiques = ego seul ; mobiles = ego + m.
const nextPos = computed(() =>
  points.map(p => {
    const wx = p.x + (p.dyn ? M_OBJ.x : 0), wy = p.y + (p.dyn ? M_OBJ.y : 0)
    return toNextFrame(wx, wy, egoSpeed.value, egoRotDeg.value * Math.PI / 180)
  }))

// Prédiction « fond statique » avec l'ego ESTIMÉ (biais possible) :
// p̂ = R(dθ̂)ᵀ (p − d̂). Résidu δ = p' − p̂ ; statique + ego exact → δ = 0.
const residuals = computed(() =>
  points.map((p, i) => {
    const hat = toNextFrame(p.x, p.y, egoSpeed.value, (egoRotDeg.value + egoErrDeg.value) * Math.PI / 180)
    const dx = nextPos.value[i].x - hat.x, dy = nextPos.value[i].y - hat.y
    return { dx, dy, n: Math.hypot(dx, dy) }
  }))

const flagged = computed(() => residuals.value.map(r => r.n > eps.value))

// Clustering par rayon (union-find) des points signalés dynamiques
const clusters = computed(() => {
  const idx = flagged.value.map((f, i) => f ? i : -1).filter(i => i >= 0)
  const parent = new Map<number, number>()
  const find = (a: number): number => parent.get(a) === a ? a : (parent.set(a, find(parent.get(a)!)), parent.get(a)!)
  idx.forEach(i => parent.set(i, i))
  for (const a of idx) for (const b of idx) {
    if (a >= b) continue
    if (Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) < 1.4) {
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
  }
  const label = new Map<number, number>()
  const out = new Map<number, number>()
  for (const i of idx) {
    const r = find(i)
    if (!label.has(r)) label.set(r, label.size)
    out.set(i, label.get(r)!)
  }
  return { map: out, count: label.size }
})

const stats = computed(() => {
  const tp = points.filter((p, i) => p.dyn && flagged.value[i]).length
  const fp = points.filter((p, i) => !p.dyn && flagged.value[i]).length
  const maxStatic = Math.max(...residuals.value.filter((_, i) => !points[i].dyn).map(r => r.n))
  return { tp, fp, maxStatic }
})

// ── Tracé ─────────────────────────────────────────────────────
const PX0 = 16, PX1 = 374, PY0 = 196, PY1 = 18
function sx(x: number): number { return PX0 + x / 20 * (PX1 - PX0) }
function sy(y: number): number { return PY0 - y / 12 * (PY0 - PY1) }

const CLUST_COLORS = ['#CF1C24', '#8B5CF6', '#0891b2', '#ca8a04', '#ec4899', '#F15A22']
function ptColor(i: number): string {
  if (!compensate.value) return points[i].dyn ? '#334155' : '#334155'
  if (!flagged.value[i]) return '#94a3b8'
  const c = clusters.value.map.get(i)
  return CLUST_COLORS[(c ?? 0) % CLUST_COLORS.length]
}
// Vecteur affiché : flux brut (p'−p) ou résidu compensé (δ)
function vec(i: number): { x1: number; y1: number; x2: number; y2: number } {
  const p = points[i]
  if (!compensate.value) {
    const q = nextPos.value[i]
    return { x1: sx(p.x), y1: sy(p.y), x2: sx(q.x), y2: sy(q.y) }
  }
  const r = residuals.value[i]
  return { x1: sx(p.x), y1: sy(p.y), x2: sx(p.x + r.dx), y2: sy(p.y + r.dy) }
}
</script>

<template>
  <div class="sf9-wrap">
    <svg viewBox="0 0 558 215" class="sf9-svg">
      <!-- Panneau scène -->
      <rect x="8" y="8" width="374" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>

      <!-- Robot -->
      <g :transform="`translate(${sx(10)}, ${sy(0.6)})`">
        <rect x="-8" y="-6" width="16" height="12" fill="#00BDF2" rx="2" stroke="#0284c7"/>
        <path d="M 8,0 L 14,0" stroke="#0284c7" stroke-width="1.5"/>
      </g>
      <text :x="sx(10)" :y="sy(0.6) + 16" text-anchor="middle"
        style="font-size:6.5px;fill:#0369a1;font-family:monospace">robot (avance + tourne)</text>

      <!-- Points + vecteurs -->
      <g>
        <g v-for="(p, i) in points" :key="i">
          <line v-bind="vec(i)" :stroke="ptColor(i)" stroke-width="1"
            :style="`opacity:${compensate && !flagged[i] ? 0.45 : 0.85}`"/>
          <circle :cx="sx(p.x)" :cy="sy(p.y)" r="2.2" :fill="ptColor(i)"/>
        </g>
      </g>

      <!-- Légende -->
      <g style="font-size:6.8px;font-family:sans-serif">
        <template v-if="!compensate">
          <circle cx="24" cy="19" r="2.2" fill="#334155"/>
          <text x="30" y="22" fill="#334155">point à t, trait = flux brut p′ − p : déplacement du capteur et des objets</text>
        </template>
        <template v-else>
          <circle cx="24" cy="19" r="2.2" fill="#94a3b8"/>
          <text x="30" y="22" fill="#64748b">résidu ‖δ‖ ≤ ε (statique)</text>
          <circle cx="150" cy="19" r="2.2" fill="#CF1C24"/>
          <text x="156" y="22" fill="#CF1C24">‖δ‖ &gt; ε → dynamique (couleur = groupe)</text>
        </template>
      </g>

      <!-- Panneau info -->
      <rect x="390" y="8" width="160" height="199" fill="#f8fafc" rx="5" stroke="#CBD5E1"/>
      <text x="470" y="24" text-anchor="middle"
        style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Décomposition du flux</text>

      <rect x="398" y="32" width="144" height="34" fill="#fff7ed" rx="3" stroke="#fed7aa"/>
      <text x="470" y="45" text-anchor="middle"
        style="font-size:7px;fill:#c2410c;font-family:monospace">δᵢ = p′ᵢ − T̂⁻¹ pᵢ</text>
      <text x="470" y="58" text-anchor="middle"
        style="font-size:6.5px;fill:#c2410c;font-family:monospace">statique + ego exact → δ = 0</text>

      <g style="font-size:7.4px;font-family:monospace">
        <text x="398" y="84" fill="#334155">mode : {{ compensate ? 'résidu compensé' : 'flux brut' }}</text>
        <text x="398" y="100" fill="#334155" v-if="compensate">détectés : {{ stats.tp }}/{{ N_DYN }} vrais + {{ stats.fp }} faux</text>
        <text x="398" y="100" fill="#94a3b8" v-else>activer la compensation</text>
        <text x="398" y="116" fill="#334155" v-if="compensate">groupes : {{ clusters.count }}</text>
        <text x="398" y="132" :fill="stats.maxStatic < 1e-6 ? '#25B34B' : '#c2410c'" v-if="compensate">
          max ‖δ‖ fond : {{ stats.maxStatic < 1e-6 ? '≈ 0 (exact)' : stats.maxStatic.toFixed(2) + ' m' }}</text>
      </g>

      <rect x="398" y="144" width="144" height="42" fill="#eff6ff" rx="3" stroke="#bfdbfe"/>
      <text x="470" y="156" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">{{ egoErrDeg > 0.01 ? 'Erreur d’ego-mouvement : des points' : 'La scène statique suit une transformation' }}</text>
      <text x="470" y="166" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">{{ egoErrDeg > 0.01 ? 'statiques dépassent le seuil, surtout les' : 'rigide T_ego ; les objets mobiles' }}</text>
      <text x="470" y="176" text-anchor="middle"
        style="font-size:6.5px;fill:#1d4ed8;font-family:sans-serif">{{ egoErrDeg > 0.01 ? 'points lointains (bras de levier).' : 'ont chacun leur résidu propre.' }}</text>

      <text x="470" y="200" text-anchor="middle"
        style="font-size:6.3px;fill:#94a3b8;font-family:sans-serif">transformations SE(2) exactes, aucun bruit ajouté</text>
    </svg>

    <div class="sf9-controls">
      <button class="sf9-btn" :class="{ 'sf9-on': compensate }" @click="compensate = !compensate">
        Compenser l’ego-mouvement</button>
      <label class="sf9-sl">
        ego : avance
        <strong>{{ egoSpeed.toFixed(1) }}</strong>
        <input type="range" v-model.number="egoSpeed" min="0" max="1.2" step="0.1"/>
      </label>
      <label class="sf9-sl">
        rotation
        <strong>{{ egoRotDeg.toFixed(1) }}°</strong>
        <input type="range" v-model.number="egoRotDeg" min="0" max="6" step="0.5"/>
      </label>
      <label class="sf9-sl">
        seuil ε
        <strong>{{ eps.toFixed(2) }}</strong>
        <input type="range" v-model.number="eps" min="0.05" max="0.8" step="0.05"/>
      </label>
      <label class="sf9-sl">
        erreur d'ego
        <strong>{{ egoErrDeg.toFixed(1) }}°</strong>
        <input type="range" v-model.number="egoErrDeg" min="0" max="3" step="0.1"/>
      </label>
    </div>
  </div>
</template>

<style scoped>
.sf9-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.sf9-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.sf9-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sf9-sl {
  display: flex; align-items: center; gap: 4px;
  font-family: monospace; font-size: 0.68rem; color: #334155;
}
.sf9-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.sf9-sl input[type=range] { width: 80px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.sf9-btn {
  font-family: monospace; font-size: 0.7rem; padding: 2px 9px;
  border: 1px solid #CBD5E1; border-radius: 4px; background: #f8fafc;
  color: #334155; cursor: pointer;
}
.sf9-btn:hover { background: #e2e8f0; }
.sf9-on { background: #25B34B; color: white; border-color: #25B34B; }
</style>
