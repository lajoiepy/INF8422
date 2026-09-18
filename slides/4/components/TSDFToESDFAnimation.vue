<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const props = defineProps<{ step: number }>()
const nav = useNav()
// A PDF without click expansion should retain the complete worked example.
const frame = computed(() => nav.isPrintMode.value && !nav.isPrintWithClicks.value ? 4 : Math.min(4, Math.max(0, props.step)))
const stage = computed(() => [0, 1, 2, 2, 3][frame.value])
const positions = [-0.7, -0.5, -0.3, -0.1, 0.1, 0.3, 0.5]
const arrival = [4, 3, 2, 1, 1, 2, Infinity]
const labels = ['Lire le TSDF', 'Fixer les amorces', 'Propager', 'Lire l’ESDF']
const descriptions = [
  ['Une valeur tronquée cache la distance', 'Les deux premiers voxels valent +0,4 m. Pourtant, ils ne sont pas à la même distance du mur.', 'Le signe situe le côté de la surface ; W indique si le voxel est observé.'],
  ['Partir tout près du zéro', 'On copie +0,1 et −0,1 m dans l’ESDF. Ces deux amorces restent fixes pendant la propagation.', 'Le changement de signe situe la surface entre les centres : on conserve ce décalage sous-voxel.'],
  ['Étendre les distances aux voisins', 'Chaque pas de 0,2 m loin du mur augmente |d| de 0,2 m.', 'Les amorces restent fixes. Les autres distances sont recalculées, même si le TSDF y est tronqué.'],
  ['Une distance utile loin de la surface', 'À gauche, l’ESDF donne +0,7 m jusqu’au mur, là où le TSDF plafonnait à +0,4 m.', 'Même surface, même signe : le champ de distance s’étend dans le domaine observé.'],
]
const description = computed(() => descriptions[stage.value])
const fmt = (value: number) => `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(1).replace('.', ',')}`
const cx = (i: number) => 120 + 58 * i
const esdf = (i: number) => i === 6 ? '?' : frame.value >= arrival[i] ? fmt(-positions[i]) : '…'
const fill = (i: number) => i === 6 ? '#e2e8f0' : positions[i] < 0 ? '#e0f2fe' : '#fee2e2'
</script>

<template>
  <div class="conversion-demo" :data-frame="frame">
    <div class="conversion-stages">
      <span v-for="(label, i) in labels" :key="label" :class="{ active: stage === i, passed: stage > i }">
        <b>{{ i + 1 }}</b> {{ label }}
      </span>
    </div>
    <div class="conversion-body">
      <svg viewBox="0 0 520 292" role="img" aria-label="Conversion d’un TSDF en ESDF sur une ligne perpendiculaire à un mur. Les distances sont en mètres.">
        <defs>
          <marker id="conversion-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10Z" fill="#c2410c" /></marker>
        </defs>
        <text x="100" y="18" class="legend">Coupe 1D · voxels de 0,2 m · troncature δ = 0,4 m</text>
        <rect x="323" y="40" width="176" height="59" rx="3" fill="#fff1f2" />
        <text x="185" y="54" class="side" text-anchor="middle">côté libre (+)</text>
        <text x="408" y="54" class="side" text-anchor="middle">côté obstacle (−)</text>
        <line x1="94" y1="79" x2="493" y2="79" stroke="#94a3b8" />
        <g v-for="(x, i) in positions" :key="i">
          <circle :cx="cx(i)" cy="79" r="4" :fill="i === 6 ? '#94a3b8' : '#334155'" />
        </g>
        <line x1="323" y1="31" x2="323" y2="237" stroke="#334155" stroke-width="2" stroke-dasharray="4 4" />
        <text x="323" y="30" text-anchor="middle" class="surface">surface : zéro</text>
        <text x="12" y="128" class="row-label">TSDF F</text>
        <text x="12" y="145" class="legend">entrée</text>
        <g v-for="(x, i) in positions" :key="`tsdf-${i}`">
          <rect :x="cx(i)-26" y="109" width="52" height="43" rx="5" :fill="fill(i)"
            :stroke="frame === 0 && i < 2 ? '#c2410c' : '#cbd5e1'" :stroke-width="frame === 0 && i < 2 ? 2 : 1" />
          <text :x="cx(i)" y="136" class="value" text-anchor="middle">{{ i === 6 ? '?' : fmt(Math.max(-0.4, Math.min(0.4, -x))) }}</text>
        </g>
        <g v-if="frame >= 1" class="reveal">
          <path v-for="x in [294, 352]" :key="x" :d="`M${x} 155 V184`" stroke="#c2410c" stroke-width="2" marker-end="url(#conversion-arrow)" />
          <text x="220" y="173" class="seed-label" text-anchor="end">copier les amorces</text>
        </g>
        <text x="12" y="210" class="row-label">ESDF d</text>
        <text x="12" y="227" class="legend">sortie</text>
        <g v-for="(_, i) in positions" :key="`esdf-${i}`">
          <rect :x="cx(i)-26" y="189" width="52" height="43" rx="5"
            :fill="frame >= arrival[i] || i === 6 ? fill(i) : '#f8fafc'"
            :stroke="frame === 4 && i < 2 ? '#15803d' : frame >= 1 && (i === 3 || i === 4) ? '#c2410c' : '#cbd5e1'"
            :stroke-width="(frame === 4 && i < 2) || (frame >= 1 && (i === 3 || i === 4)) ? 2.5 : 1" />
          <text :key="esdf(i)" :x="cx(i)" y="216" class="value reveal" text-anchor="middle" :data-esdf-cell="i">{{ esdf(i) }}</text>
        </g>
        <g v-if="frame >= 2" :key="frame" class="reveal">
          <path :d="`M${cx(frame === 2 ? 3 : frame === 3 ? 2 : 1)} 241 H${cx(frame === 2 ? 2 : frame === 3 ? 1 : 0)}`"
            stroke="#c2410c" stroke-width="2" marker-end="url(#conversion-arrow)" />
          <text x="207" y="267" text-anchor="middle" class="calculation">{{ frame === 2 ? '0,1 + 0,2 = 0,3 m' : frame === 3 ? '0,3 + 0,2 = 0,5 m' : '0,5 + 0,2 = 0,7 m' }}</text>
        </g>
        <text x="468" y="256" class="unknown" text-anchor="middle">W = 0</text>
        <text x="468" y="274" class="unknown" text-anchor="middle">inconnu</text>
        <text x="100" y="290" class="legend">Valeurs aux centres des voxels, en mètres · … = à calculer</text>
      </svg>
      <div class="conversion-explanation" aria-live="polite">
        <h3>{{ description[0] }}</h3>
        <p>{{ description[1] }}</p>
        <p class="detail">{{ description[2] }}</p>
        <div class="unknown-note"><strong>? reste inconnu</strong><br>On n’invente pas de distance dans les voxels sans observation.</div>
      </div>
    </div>
    <div class="conversion-takeaway"><strong>En 2D / 3D :</strong> propager la distance à la surface la plus proche dans toutes les directions.</div>
    <div class="conversion-footer">
      <span>Exemple idéal : mur plan, rayon perpendiculaire. En général, les amorces TSDF sont approximatives.</span>
      <div class="conversion-controls" @click.stop>
        <button aria-label="Étape précédente" :disabled="frame === 0" @click="nav.prev()">←</button>
        <span>vue {{ frame + 1 }} / 5</span>
        <button aria-label="Étape suivante" :disabled="frame === 4" @click="nav.next()">→</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversion-demo { margin-top: 14px; }
.conversion-stages { display: flex; gap: 10px; font-size: 14px; }
.conversion-stages span { flex: 1; padding: 7px 10px; border-radius: 5px; background: #f1f5f9; color: #475569; }
.conversion-stages b { margin-right: 5px; }
.conversion-stages .active { background: #ffedd5; color: #9a3412; font-weight: 700; }
.conversion-stages .passed { color: #166534; background: #f0fdf4; }
.conversion-body { display: grid; grid-template-columns: 516px 1fr; gap: 22px; align-items: start; margin-top: 10px; }
svg { width: 516px; height: 290px; }
.legend { font-size: 11px; fill: #475569; }
.side, .surface { font-size: 12px; fill: #334155; }
.surface { font-weight: 700; }
.row-label { font-size: 16px; font-weight: 700; fill: #334155; }
.value { font: 17px ui-monospace, monospace; fill: #0f172a; }
.seed-label { font-size: 12px; fill: #9a3412; }
.calculation { font-size: 15px; font-weight: 700; fill: #9a3412; }
.unknown { font-size: 11px; fill: #475569; }
.conversion-explanation { padding-top: 14px; }
.conversion-explanation h3 { font-size: 20px; line-height: 1.18; color: #9a3412; margin: 0 0 12px; }
.conversion-explanation p { font-size: 16px; line-height: 1.4; margin: 0 0 12px; }
.conversion-explanation .detail { font-size: 14px; color: #475569; }
.unknown-note { font-size: 13px; line-height: 1.35; border-left: 3px solid #94a3b8; padding-left: 10px; }
.conversion-takeaway { background: #f0f9ff; padding: 8px 12px; margin-top: 6px; font-size: 15px; border-radius: 5px; }
.conversion-footer { display: flex; align-items: center; gap: 18px; margin-top: 8px; font-size: 11px; color: #475569; }
.conversion-controls { display: flex; align-items: center; gap: 8px; white-space: nowrap; margin-left: auto; }
.conversion-controls button { border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 10px; font-size: 16px; }
.conversion-controls button:disabled { opacity: .35; }
.reveal { animation: appear .35s ease-out; }
@keyframes appear { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
@media print { .conversion-controls { display: none; } }
</style>
