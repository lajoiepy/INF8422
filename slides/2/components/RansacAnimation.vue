<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Données : 12 correspondances, 8 bonnes + 4 fausses ────────
// Les bonnes partagent le même mouvement (~+285, −13 px) ; les fausses non.
interface Pt { x: number; y: number }
const matches: { p1: Pt; p2: Pt; inlier: boolean }[] = [
  { p1:{x:50, y:55},  p2:{x:336,y:41},  inlier:true  },
  { p1:{x:85, y:95},  p2:{x:368,y:84},  inlier:true  },
  { p1:{x:130,y:65},  p2:{x:418,y:52},  inlier:true  },
  { p1:{x:170,y:108}, p2:{x:454,y:96},  inlier:true  },
  { p1:{x:55, y:148}, p2:{x:341,y:136}, inlier:true  },
  { p1:{x:115,y:178}, p2:{x:397,y:167}, inlier:true  },
  { p1:{x:162,y:152}, p2:{x:447,y:140}, inlier:true  },
  { p1:{x:90, y:42},  p2:{x:373,y:31},  inlier:true  },
  { p1:{x:42, y:185}, p2:{x:466,y:196}, inlier:false },
  { p1:{x:158,y:38},  p2:{x:318,y:170}, inlier:false },
  { p1:{x:102,y:122}, p2:{x:424,y:196}, inlier:false },
  { p1:{x:178,y:192}, p2:{x:342,y:88},  inlier:false },
]

const EPS = 10          // seuil d'accord, en pixels
const SAMPLES = [[8, 9], [2, 10], [0, 6]]   // 2 fausses · 1 fausse · 0 fausse

// ── Modèle : similitude z = a·w + b (translation + rotation + échelle) ──
// 4 DDL, donc 2 correspondances suffisent : c'est l'échantillon MINIMAL,
// ce que tire RANSAC. Tout ci-dessous est calculé, rien n'est écrit d'avance.
interface Model { ax: number; ay: number; bx: number; by: number }
function fitSimilarity(i: number, j: number): Model {
  const w1 = matches[i].p1, w2 = matches[j].p1
  const z1 = matches[i].p2, z2 = matches[j].p2
  const dwx = w2.x - w1.x, dwy = w2.y - w1.y
  const dzx = z2.x - z1.x, dzy = z2.y - z1.y
  const den = dwx * dwx + dwy * dwy
  const ax = (dzx * dwx + dzy * dwy) / den
  const ay = (dzy * dwx - dzx * dwy) / den
  return { ax, ay, bx: z1.x - (ax * w1.x - ay * w1.y), by: z1.y - (ay * w1.x + ax * w1.y) }
}
function applyModel(m: Model, p: Pt): Pt {
  return { x: m.ax * p.x - m.ay * p.y + m.bx, y: m.ay * p.x + m.ax * p.y + m.by }
}
function residual(m: Model, k: number): number {
  const q = applyModel(m, matches[k].p1)
  return Math.hypot(q.x - matches[k].p2.x, q.y - matches[k].p2.y)
}

const ITERS = SAMPLES.map((s, n) => {
  const model = fitSimilarity(s[0], s[1])
  const res = matches.map((_, k) => residual(model, k))
  const inliers = new Set(res.map((r, k) => (r <= EPS ? k : -1)).filter(k => k >= 0))
  return {
    n: n + 1, sample: new Set(s), model, res, inliers,
    scale: Math.hypot(model.ax, model.ay),
    rot: Math.atan2(model.ay, model.ax) * 180 / Math.PI,
    nOut: s.filter(k => !matches[k].inlier).length,
  }
})
const BEST = ITERS.reduce((a, b) => (b.inliers.size > a.inliers.size ? b : a))

// ── Phases : un pas = une étape de l'algorithme ───────────────
// C'est le point de la refonte : « calculer le modèle » et « compter les
// inliers » sont deux moments distincts, on ne peut plus les confondre.
type Kind = 'initial' | 'pick' | 'fit' | 'score' | 'best'
interface Phase { kind: Kind; it: number }
const PHASES: Phase[] = [
  { kind: 'initial', it: -1 },
  ...ITERS.flatMap((_, i) => ([
    { kind: 'pick'  as const, it: i },
    { kind: 'fit'   as const, it: i },
    { kind: 'score' as const, it: i },
  ])),
  { kind: 'best', it: BEST.n - 1 },
]
const phaseIdx = ref(0)
const ph   = computed(() => PHASES[phaseIdx.value])
const iter = computed(() => (ph.value.it >= 0 ? ITERS[ph.value.it] : null))

const showModel  = computed(() => ph.value.kind === 'fit' || ph.value.kind === 'score' || ph.value.kind === 'best')
const showResid  = computed(() => ph.value.kind === 'score' || ph.value.kind === 'best')
const scoredSoFar = computed(() =>
  ITERS.filter((_, i) => i < ph.value.it || (i === ph.value.it && ph.value.kind === 'score') || ph.value.kind === 'best'))
const bestSoFar = computed(() =>
  scoredSoFar.value.length ? scoredSoFar.value.reduce((a, b) => (b.inliers.size > a.inliers.size ? b : a)) : null)

// ── Étapes affichées : une seule active à la fois ─────────────
const STEPS = [
  { n: '①', t: 'Tirer 2 points',    k: 'pick'  },
  { n: '②', t: 'Calculer modèle',   k: 'fit'   },
  { n: '③', t: 'Mesurer l\'accord', k: 'score' },
  { n: '④', t: 'Garder le meilleur', k: 'best' },
]

// ── Rendu : cadre de l'image 1 transporté par le modèle ───────
const FRAME: Pt[] = [{x:32,y:28}, {x:190,y:28}, {x:190,y:202}, {x:32,y:202}]
const framePts = FRAME.map(p => `${p.x},${p.y}`).join(' ')
const mappedPts = computed(() => {
  if (!iter.value) return ''
  return FRAME.map(p => { const q = applyModel(iter.value!.model, p); return `${q.x.toFixed(1)},${q.y.toFixed(1)}` }).join(' ')
})
const preds = computed(() => {
  if (!iter.value) return []
  return matches.map((m, k) => {
    const q = applyModel(iter.value!.model, m.p1)
    return { k, q, ok: iter.value!.inliers.has(k), sampled: iter.value!.sample.has(k) }
  })
})

// ── Couleurs ─────────────────────────────────────────────────
const C_SAMPLE = '#00BDF2', C_IN = '#25B34B', C_OUT = '#CF1C24', C_MODEL = '#7C3AED', C_GREY = '#CBD5E1'
function matchColor(i: number): string {
  const p = ph.value
  if (p.kind === 'initial') return C_GREY
  const it = iter.value!
  if (it.sample.has(i)) return C_SAMPLE
  if (p.kind === 'pick' || p.kind === 'fit') return C_GREY
  return it.inliers.has(i) ? C_IN : C_OUT
}
function matchOpacity(i: number): number {
  const p = ph.value
  if (p.kind === 'initial') return 0.6
  const it = iter.value!
  if (it.sample.has(i)) return 1
  if (p.kind === 'pick' || p.kind === 'fit') return 0.18
  return it.inliers.has(i) ? 0.95 : 0.75
}
// Les longues lignes entre panneaux masquent tout dès qu'on regarde les résidus.
function lineOpacity(i: number): number {
  const p = ph.value
  if (p.kind === 'initial') return 0.55
  const it = iter.value!
  if (it.sample.has(i)) return p.kind === 'score' || p.kind === 'best' ? 0.35 : 0.9
  return p.kind === 'score' || p.kind === 'best' ? 0.08 : 0.12
}

const LABEL = computed((): { text: string; color: string } => {
  const p = ph.value, it = iter.value
  if (p.kind === 'initial')
    return { text: '12 correspondances brutes : impossible de savoir lesquelles sont fausses', color: '#475569' }
  if (p.kind === 'pick')
    return { text: `Itération ${it!.n} — on tire 2 correspondances au hasard (bleu). C'est le minimum pour fixer une similitude.`, color: '#0284c7' }
  if (p.kind === 'fit')
    return it!.nOut === 0
      ? { text: `Le modèle ajusté sur ces 2 points transporte le cadre au bon endroit : rotation ${it!.rot.toFixed(0)}°, échelle ${it!.scale.toFixed(2)}.`, color: '#7C3AED' }
      : { text: `${it!.nOut} fausse${it!.nOut > 1 ? 's' : ''} correspondance${it!.nOut > 1 ? 's' : ''} dans le tirage → le cadre part n'importe où : rotation ${it!.rot.toFixed(0)}°, échelle ${it!.scale.toFixed(2)}.`, color: C_OUT }
  if (p.kind === 'score')
    return it!.inliers.size > 2
      ? { text: `${it!.inliers.size}/12 correspondances tombent à moins de ${EPS} px de leur prédiction : le modèle fait consensus.`, color: C_IN }
      : { text: `Seules les 2 correspondances tirées sont d'accord avec ce modèle — personne d'autre ne suit.`, color: C_OUT }
  return { text: `Itération ${BEST.n} retenue : le modèle qui rassemble le plus de monde (${BEST.inliers.size}/12). Les 4 fausses sont rejetées.`, color: C_IN }
})

// ── Contrôles ────────────────────────────────────────────────
let timer: ReturnType<typeof setTimeout> | null = null
const playing = ref(false)
function clearTimer() { if (timer) { clearTimeout(timer); timer = null } }
function go(dir: 1 | -1) {
  clearTimer(); playing.value = false
  phaseIdx.value = Math.max(0, Math.min(PHASES.length - 1, phaseIdx.value + dir))
}
function togglePlay() {
  if (playing.value) { clearTimer(); playing.value = false; return }
  if (phaseIdx.value >= PHASES.length - 1) phaseIdx.value = 0
  playing.value = true
  const tick = () => {
    if (phaseIdx.value >= PHASES.length - 1) { playing.value = false; return }
    phaseIdx.value++
    timer = setTimeout(tick, 1500)
  }
  tick()
}
function reset() { clearTimer(); playing.value = false; phaseIdx.value = 0 }
</script>

<template>
  <div class="ra-wrap">

    <div class="ra-panel-labels">
      <span>Image k−1</span>
      <span>Image k</span>
    </div>

    <svg viewBox="0 0 520 224" class="ra-svg">
      <defs>
        <clipPath id="raClipR"><rect x="300" y="8" width="208" height="210" rx="6"/></clipPath>
      </defs>

      <rect x="12"  y="8" width="208" height="210" fill="#f8fafc" rx="6" stroke="#CBD5E1" stroke-width="1.2"/>
      <rect x="300" y="8" width="208" height="210" fill="#f8fafc" rx="6" stroke="#CBD5E1" stroke-width="1.2"/>

      <!-- Correspondances : très effacées dès qu'on regarde les résidus -->
      <line v-for="(m, i) in matches" :key="`l${i}`"
        :x1="m.p1.x" :y1="m.p1.y" :x2="m.p2.x" :y2="m.p2.y"
        :stroke="matchColor(i)" :stroke-width="iter && iter.sample.has(i) ? 3 : 1.4"
        :style="{ opacity: lineOpacity(i) }" stroke-dasharray="5,3"/>

      <!-- ÉTAPE ② : le modèle, rendu visible — le cadre de l'image k−1
           transporté dans l'image k par la similitude estimée -->
      <polygon v-if="showModel" :points="framePts"
        fill="none" :stroke="C_MODEL" stroke-width="1.4" stroke-dasharray="4,3" style="opacity:0.55"/>
      <g v-if="showModel" clip-path="url(#raClipR)">
        <polygon :points="mappedPts" style="fill:#7C3AED;fill-opacity:0.07"
          :stroke="C_MODEL" stroke-width="2" class="ra-quad"/>
      </g>
      <text v-if="showModel && iter" x="306" y="21"
        style="font-size:8.5px;fill:#7C3AED;font-weight:700;font-family:monospace">
        modèle : rot {{ iter.rot.toFixed(0) }}° · éch. {{ iter.scale.toFixed(2) }} · t ({{ iter.model.bx.toFixed(0) }}, {{ iter.model.by.toFixed(0) }})
      </text>

      <!-- ÉTAPE ③ : le désaccord — prédiction, seuil, résidu -->
      <g v-if="showResid && iter" clip-path="url(#raClipR)">
        <g v-for="p in preds" :key="`r${p.k}`">
          <circle :cx="p.q.x" :cy="p.q.y" :r="EPS"
            :style="`fill:${p.ok ? '#25B34B' : '#CF1C24'};fill-opacity:0.07`"
            :stroke="p.ok ? C_IN : C_OUT" stroke-width="0.7" stroke-dasharray="2,2" style="opacity:0.7"/>
          <line :x1="p.q.x" :y1="p.q.y" :x2="matches[p.k].p2.x" :y2="matches[p.k].p2.y"
            :stroke="p.ok ? C_IN : C_OUT" stroke-width="2" style="opacity:0.9"/>
          <circle :cx="p.q.x" :cy="p.q.y" r="3" fill="white"
            :stroke="p.ok ? C_IN : C_OUT" stroke-width="1.6"/>
        </g>
      </g>

      <!-- Points d'intérêt -->
      <circle v-for="(m, i) in matches" :key="`a${i}`"
        :cx="m.p1.x" :cy="m.p1.y" r="7" :fill="matchColor(i)"
        :style="{ opacity: matchOpacity(i) }" stroke="white" stroke-width="2"/>
      <circle v-for="(m, i) in matches" :key="`b${i}`"
        :cx="m.p2.x" :cy="m.p2.y" r="7" :fill="matchColor(i)"
        :style="{ opacity: matchOpacity(i) }" stroke="white" stroke-width="2"/>

      <!-- Compteur d'accord -->
      <g v-if="showResid && iter">
        <rect x="300" y="196" width="122" height="20" rx="4"
          :fill="iter.inliers.size > 2 ? '#f0fdf4' : '#fef2f2'"
          :stroke="iter.inliers.size > 2 ? C_IN : C_OUT" stroke-width="1.2"/>
        <text x="308" y="210"
          :style="`font-size:10px;font-weight:700;font-family:monospace;fill:${iter.inliers.size > 2 ? C_IN : C_OUT}`">
          accord : {{ iter.inliers.size }}/12
        </text>
      </g>
      <!-- Le meilleur score va dans le panneau de GAUCHE : à droite il tombait
           sur le compteur d'accord de l'itération courante. -->
      <text v-if="bestSoFar" x="18" y="210"
        style="font-size:9px;fill:#F59E0B;font-weight:700;font-family:monospace">
        ★ meilleur jusqu'ici : {{ bestSoFar.inliers.size }}/12 (iter. {{ bestSoFar.n }})
      </text>
    </svg>

    <!-- Légende, dépendante de l'étape -->
    <div class="ra-legend">
      <template v-if="ph.kind === 'pick' || ph.kind === 'fit'">
        <span class="leg-dot" style="background:#00BDF2"/><span>échantillon minimal (2 pts)</span>
        <template v-if="ph.kind === 'fit'">
          <span class="leg-box ml"/><span>cadre transporté par le modèle</span>
        </template>
      </template>
      <template v-if="ph.kind === 'score' || ph.kind === 'best'">
        <span class="leg-ring"/><span>prédiction du modèle · cercle = seuil {{ EPS }} px</span>
        <span class="leg-dot ml" style="background:#25B34B"/><span>d'accord (inlier)</span>
        <span class="leg-dot ml" style="background:#CF1C24"/><span>en désaccord (outlier)</span>
      </template>
    </div>

    <!-- Étapes : une seule allumée -->
    <div class="ra-steps">
      <template v-for="(s, idx) in STEPS" :key="s.k">
        <div :class="['ra-step', ph.kind === s.k && 'ra-step-on']">
          <span class="sn">{{ s.n }}</span><span class="st">{{ s.t }}</span>
        </div>
        <span v-if="idx < 3" class="step-sep">→</span>
      </template>
    </div>

    <div class="ra-status">
      <span class="ra-label" :style="{ color: LABEL.color }">{{ LABEL.text }}</span>
    </div>

    <div class="ra-controls">
      <button class="btn" @click="go(-1)" :disabled="phaseIdx === 0">◀</button>
      <button class="btn btn-play" @click="togglePlay">{{ playing ? '⏸' : '▶ Auto' }}</button>
      <button class="btn" @click="go(1)" :disabled="phaseIdx >= PHASES.length - 1">▶</button>
      <button class="btn btn-reset" @click="reset">↺</button>
      <span class="phase-info">{{ phaseIdx + 1 }} / {{ PHASES.length }}</span>
      <span v-if="iter" class="phase-iter">itération {{ iter.n }} / {{ ITERS.length }}</span>
    </div>

  </div>
</template>

<style scoped>
.ra-wrap { width: 100%; display: flex; flex-direction: column; gap: 4px; }

.ra-panel-labels {
  display: flex;
  font-size: 0.68rem; font-weight: 700; color: #64748b; letter-spacing: 0.03em;
}
.ra-panel-labels span:first-child { flex: 0 0 40%; text-align: center; }
.ra-panel-labels span:last-child  { flex: 0 0 40%; text-align: center; margin-left: 15.4%; }

.ra-svg { height: 265px; width: auto; max-width: 100%; display: block; }
.ra-quad { transition: points 0.25s ease; }

.ra-steps { display: flex; align-items: center; justify-content: center; gap: 0; }
.ra-step {
  display: flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 5px;
  border: 1.5px solid #CBD5E1; background: #f8fafc;
  transition: background 0.2s, border-color 0.2s;
  min-width: 112px;
}
.ra-step .sn { font-size: 0.82rem; font-weight: 700; color: #94a3b8; transition: color 0.2s; }
.ra-step .st { font-size: 0.62rem; color: #94a3b8; transition: color 0.2s; white-space: nowrap; }
.ra-step-on { background: #CF1C24; border-color: #CF1C24; }
.ra-step-on .sn, .ra-step-on .st { color: white; }
.step-sep { color: #CBD5E1; font-size: 0.9rem; padding: 0 4px; }

.ra-legend {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; color: #475569; min-height: 16px;
}
.leg-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.leg-ring {
  display: inline-block; width: 9px; height: 9px; border-radius: 50%;
  border: 1.6px solid #475569; background: white; flex-shrink: 0;
}
.leg-box {
  display: inline-block; width: 12px; height: 9px;
  border: 1.6px solid #7C3AED; background: rgba(124,58,237,0.08); flex-shrink: 0;
}
.ml { margin-left: 10px; }

.ra-status { padding: 0 2px; min-height: 18px; }
.ra-label  { font-size: 0.72rem; font-weight: 600; transition: color 0.3s; }

.ra-controls { display: flex; align-items: center; gap: 8px; }
.btn {
  padding: 4px 12px; border: 1.5px solid #CBD5E1; border-radius: 5px;
  background: white; font-size: 0.72rem; cursor: pointer; color: #334155; font-weight: 600;
  transition: background 0.15s;
}
.btn:hover:not(:disabled) { background: #f1f5f9; }
.btn:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-play  { background: #CF1C24; color: white; border-color: #CF1C24; }
.btn-play:hover:not(:disabled) { background: #b01420; }
.btn-reset { color: #64748b; }
.phase-info { font-size: 0.65rem; color: #94a3b8; font-family: monospace; margin-left: 4px; }
.phase-iter { font-size: 0.65rem; color: #64748b; font-family: monospace; }
</style>
