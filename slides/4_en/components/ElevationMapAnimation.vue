<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

// ── Carte d'élévation 2.5D vs MLS — construite depuis les mesures ──
// On streame de vrais hits capteur (échantillonnés sur le sol et, si
// pont, sur le dessus ET le dessous de la dalle — plusieurs points de
// vue accumulés). La carte se construit hit par hit :
//   2.5D : z[i] ← max(z[i], z_hit)  — une seule hauteur par cellule →
//     les hits du tablier ÉCRASENT le sol : le passage libre disparaît
//     des DONNÉES elles-mêmes, pas d'un état pré-câblé.
//   MLS  : les z de chaque cellule sont regroupés en clusters (écart
//     > seuil → nouvelle surface) → sol ET dalle stockés, l'intervalle
//     libre entre les deux est retrouvé.
const N = 16
const GAP = 0.6                    // seuil de clustering MLS (m)
type Rep = 'flat25' | 'mls'
const rep = ref<Rep>('flat25')
const overhang = ref(true)
const seed = ref(11)

// Profil de terrain (coupe latérale), déterministe et regénérable
function makeLcg(s0: number) {
  let s = s0
  return () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff }
}
const terrain = computed(() => {
  const lcg = makeLcg(seed.value * 2654435761 + 17)
  // amplitudes bornées pour que le sol reste sous ~2.05 m : l'intervalle
  // libre sous la dalle (z=3.0) reste toujours détectable (> GAP)
  return { a: 0.3 + lcg() * 0.25, w1: 0.5 + lcg() * 0.45, p1: lcg() * 6.28, b: 0.15 + lcg() * 0.15, w2: 0.25 + lcg() * 0.2, p2: lcg() * 6.28 }
})
function groundH(x: number) {
  const t = terrain.value
  return 1.2 + t.a * Math.sin(x * t.w1 + t.p1) + t.b * Math.sin(x * t.w2 + t.p2)
}
const OA = 5, OB = 10, SLAB_B = 3.0, SLAB_T = 3.6   // pont (dalle)

// ── Hits capteur : échantillonnés sur les vraies surfaces, mélangés ──
interface Hit { x: number; z: number }
const hits = computed<Hit[]>(() => {
  const lcg = makeLcg(seed.value * 48271 + (overhang.value ? 5 : 3))
  const out: Hit[] = []
  for (let k = 0; k < 100; k++) {           // sol (visible partout, y compris sous le pont)
    const x = lcg() * (N - 1)
    out.push({ x, z: Math.max(0.15, groundH(x) + (lcg() - 0.5) * 0.12) })
  }
  if (overhang.value) {
    for (let k = 0; k < 26; k++) {          // dessus de la dalle (vu du drone / de loin)
      const x = OA + lcg() * (OB - OA)
      out.push({ x, z: SLAB_T + (lcg() - 0.5) * 0.1 })
    }
    for (let k = 0; k < 16; k++) {          // dessous de la dalle (vu depuis le passage)
      const x = OA + lcg() * (OB - OA)
      out.push({ x, z: SLAB_B + (lcg() - 0.5) * 0.08 })
    }
  }
  // mélange déterministe : l'ordre d'arrivée est arbitraire
  for (let k = out.length - 1; k > 0; k--) {
    const r = Math.floor(lcg() * (k + 1)); [out[k], out[r]] = [out[r], out[k]]
  }
  return out
})

// ── Streaming ─────────────────────────────────────────────────────
const hitCount = ref(Infinity)   // Infinity = scan complet affiché
let timer: ReturnType<typeof setInterval> | null = null
const received = computed(() => hits.value.slice(0, Math.min(hitCount.value, hits.value.length)))
function startScan() {
  hitCount.value = 0
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    hitCount.value += 2
    if (hitCount.value >= hits.value.length) {
      hitCount.value = hits.value.length
      clearInterval(timer!); timer = null
    }
  }, 40)
}
function randomize() { seed.value++; hitCount.value = Infinity }
onUnmounted(() => { if (timer) clearInterval(timer) })

// ── La carte, dérivée des hits reçus ──────────────────────────────
// Par cellule : liste de z → 2.5D = max ; MLS = clusters (gap > GAP)
const cellClusters = computed<number[][][]>(() => {
  const zs: number[][] = Array.from({ length: N }, () => [])
  for (const h of received.value) {
    const i = Math.max(0, Math.min(N - 1, Math.round(h.x)))
    zs[i].push(h.z)
  }
  return zs.map(list => {
    if (list.length === 0) return []
    const sorted = [...list].sort((a, b) => a - b)
    const clusters: number[][] = [[sorted[0]]]
    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k] - sorted[k - 1] > GAP) clusters.push([sorted[k]])
      else clusters[clusters.length - 1].push(sorted[k])
    }
    return clusters
  })
})
// 2.5D : une seule valeur stockée = max des hits de la cellule
const stored25 = computed<(number | null)[]>(() =>
  cellClusters.value.map(cl => cl.length ? cl[cl.length - 1][cl[cl.length - 1].length - 1] : null))
// Intervalle libre connu (MLS) ou perdu (2.5D) : entre 2 clusters
const gaps = computed(() =>
  cellClusters.value.map(cl => {
    if (cl.length < 2) return null
    const lower = cl[cl.length - 2], upper = cl[cl.length - 1]
    return { zLo: lower[lower.length - 1], zHi: upper[0] }
  }))

// Verdict drone : le passage sous le pont est-il connu comme libre ?
const bridgeCells = Array.from({ length: OB - OA - 1 }, (_, k) => OA + 1 + k)
const droneState = computed<'pass' | 'blocked' | null>(() => {
  if (!overhang.value) return null
  const covered = bridgeCells.filter(i => stored25.value[i] !== null && stored25.value[i]! > SLAB_B)
  if (covered.length < bridgeCells.length) return null   // dalle pas encore cartographiée
  if (rep.value === 'mls' && bridgeCells.every(i => gaps.value[i] !== null)) return 'pass'
  return rep.value === 'mls' ? null : 'blocked'
})

// ── Layout coupe (x, z) ───────────────────────────────────────────
const PX1 = 16, PX2 = 292, ZB = 192, ZT = 26, ZMAX = 4.6
const sx = (x: number) => PX1 + x / (N - 1) * (PX2 - PX1)
const sz = (z: number) => ZB - z / ZMAX * (ZB - ZT)
const groundPath = computed(() => {
  let d = `M ${sx(0)} ${ZB}`
  for (let i = 0; i <= 60; i++) { const x = i / 60 * (N - 1); d += ` L ${sx(x).toFixed(1)} ${sz(groundH(x)).toFixed(1)}` }
  d += ` L ${sx(N - 1)} ${ZB} Z`
  return d
})
const TICK = (PX2 - PX1) / (N - 1) * 0.62

const stats = computed(() => {
  const filled = cellClusters.value.filter(c => c.length > 0).length
  const maxSurf = Math.max(0, ...cellClusters.value.map(c => c.length))
  return { hits: received.value.length, filled, maxSurf }
})
</script>

<template>
  <div class="em-wrap">
    <svg viewBox="0 0 560 215" class="em-svg">
      <!-- ══════ Coupe latérale : vérité + carte construite ══════ -->
      <rect x="0" y="0" width="300" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="150" y="13" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Coupe (x, z) — carte {{ rep === 'mls' ? 'MLS' : '2.5D' }} construite depuis {{ stats.hits }} hits
      </text>

      <!-- vraie géométrie -->
      <path :d="groundPath" fill="#e7e5e4" stroke="#a8a29e" stroke-width="1"/>
      <g v-if="overhang">
        <rect :x="sx(OA)" :y="sz(SLAB_T)" :width="sx(OB)-sx(OA)" :height="sz(SLAB_B)-sz(SLAB_T)"
          fill="#d6d3d1" stroke="#a8a29e" stroke-width="1" rx="1"/>
        <text :x="(sx(OA)+sx(OB))/2" :y="sz(SLAB_T)-3" text-anchor="middle"
          style="font-size:7px;fill:#78716c;font-family:sans-serif">pont / surplomb</text>
      </g>

      <!-- intervalle perdu (2.5D) / retrouvé (MLS), dérivé des clusters -->
      <g v-for="(g, i) in gaps" :key="`gap${i}`">
        <rect v-if="g"
          :x="sx(i) - TICK / 2" :y="sz(g.zHi)" :width="TICK" :height="sz(g.zLo) - sz(g.zHi)"
          :fill="rep === 'mls' ? '#25B34B' : '#CF1C24'"
          :style="`opacity:${rep === 'mls' ? 0.18 : 0.25}`"/>
      </g>

      <!-- hits capteur reçus -->
      <circle v-for="(h, k) in received" :key="`h${k}`"
        :cx="sx(h.x)" :cy="sz(h.z)" r="1.4" fill="#F15A22" style="opacity:0.75"/>

      <!-- carte stockée -->
      <template v-if="rep === 'flat25'">
        <!-- 2.5D : un tick cyan = LA hauteur stockée de la cellule -->
        <g v-for="(z, i) in stored25" :key="`s${i}`">
          <rect v-if="z !== null"
            :x="sx(i) - TICK / 2" :y="sz(z) - 1.4" :width="TICK" height="2.8"
            fill="#00BDF2" rx="1"/>
        </g>
      </template>
      <template v-else>
        <!-- MLS : un tick par surface (cluster) + intervalle occupé -->
        <g v-for="(clusters, i) in cellClusters" :key="`m${i}`">
          <g v-for="(cl, ci) in clusters" :key="ci">
            <rect :x="sx(i) - TICK / 2" :y="sz(cl[cl.length - 1]) - 1.2" :width="TICK" height="2.4"
              fill="#00BDF2" rx="1"/>
            <rect v-if="cl[cl.length - 1] - cl[0] > 0.04"
              :x="sx(i) - TICK / 2" :y="sz(cl[cl.length - 1])" :width="TICK"
              :height="Math.max(1, sz(cl[0]) - sz(cl[cl.length - 1]))"
              fill="#00BDF2" style="opacity:0.3"/>
          </g>
        </g>
      </template>

      <!-- drone dans le passage -->
      <g v-if="overhang">
        <text :x="(sx(OA)+sx(OB))/2" :y="(sz(SLAB_B)+sz(groundH((OA+OB)/2)))/2 + 3" text-anchor="middle"
          style="font-size:11px">🚁</text>
        <text v-if="droneState === 'pass'" :x="(sx(OA)+sx(OB))/2 + 22" :y="(sz(SLAB_B)+sz(groundH((OA+OB)/2)))/2 + 3"
          style="font-size:8px;fill:#15803d;font-weight:700;font-family:sans-serif">✓ passe</text>
        <text v-else-if="droneState === 'blocked'" :x="(sx(OA)+sx(OB))/2 + 22" :y="(sz(SLAB_B)+sz(groundH((OA+OB)/2)))/2 + 3"
          style="font-size:8px;fill:#CF1C24;font-weight:700;font-family:sans-serif">✗ bloqué</text>
      </g>

      <line :x1="PX1" :y1="ZB" :x2="PX2" :y2="ZB" stroke="#475569" stroke-width="1"/>

      <!-- légende -->
      <circle cx="14" cy="202" r="2" fill="#F15A22"/>
      <text x="20" y="205" style="font-size:6.5px;fill:#c2410c;font-family:sans-serif">hits capteur</text>
      <rect x="68" y="200" width="12" height="3" fill="#00BDF2" rx="1"/>
      <text x="84" y="205" style="font-size:6.5px;fill:#0284c7;font-family:sans-serif">{{ rep === 'mls' ? 'surfaces stockées' : 'z stocké (max)' }}</text>
      <template v-if="overhang">
        <rect x="163" y="199" width="10" height="6" :fill="rep === 'mls' ? '#25B34B' : '#CF1C24'" style="opacity:0.35"/>
        <text x="176" y="205" :style="`font-size:6.5px;font-family:sans-serif;fill:${rep === 'mls' ? '#15803d' : '#CF1C24'}`">
          {{ rep === 'mls' ? 'passage retrouvé' : 'passage perdu' }}
        </text>
      </template>

      <!-- ══════ Panneau droit : règle de mise à jour + compteurs ══════ -->
      <rect x="307" y="0" width="251" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="432" y="13" text-anchor="middle"
        style="font-size:9px;fill:#64748b;font-weight:700;font-family:sans-serif">
        {{ rep === 'mls' ? 'MLS — plusieurs surfaces par (x,y)' : '2.5D — une hauteur par (x,y)' }}
      </text>

      <rect x="315" y="20" width="236" height="46" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="323" y="33" style="font-size:8px;fill:#1e40af;font-weight:700;font-family:sans-serif">Règle de mise à jour (par hit)</text>
      <text x="433" y="48" text-anchor="middle" style="font-size:8px;fill:#1e40af;font-family:monospace">
        {{ rep === 'mls' ? 'clusters de z ; écart > 0.6 m → surface' : 'z[i] ← max(z[i], z_hit)' }}
      </text>
      <text x="433" y="60" text-anchor="middle" style="font-size:6.8px;fill:#64748b;font-style:italic;font-family:sans-serif">
        {{ rep === 'mls' ? 'chaque cellule stocke une LISTE d\'intervalles' : 'chaque cellule stocke UN seul scalaire' }}
      </text>

      <rect x="315" y="74" width="236" height="58" fill="#fff7ed" rx="4" stroke="#fed7aa"/>
      <text x="323" y="87" style="font-size:8px;fill:#c2410c;font-weight:700;font-family:sans-serif">État de la carte (live)</text>
      <text x="323" y="101" style="font-size:7.5px;fill:#475569;font-family:monospace">hits reçus : {{ stats.hits }} / {{ hits.length }}</text>
      <text x="323" y="113" style="font-size:7.5px;fill:#475569;font-family:monospace">cellules remplies : {{ stats.filled }} / {{ N }}</text>
      <text x="323" y="125" style="font-size:7.5px;fill:#475569;font-family:monospace">max surfaces / cellule : {{ stats.maxSurf }}</text>

      <rect x="315" y="140" width="236" height="62"
        :fill="droneState === 'blocked' ? '#fef2f2' : droneState === 'pass' ? '#f0fdf4' : '#f8fafc'" rx="4"
        :stroke="droneState === 'blocked' ? '#fca5a5' : droneState === 'pass' ? '#86efac' : '#e2e8f0'"/>
      <template v-if="!overhang">
        <text x="323" y="155" style="font-size:7.5px;fill:#475569;font-family:sans-serif">Terrain simple : une hauteur par cellule</text>
        <text x="323" y="167" style="font-size:7.5px;fill:#475569;font-family:sans-serif">suffit — compact et bien plus léger</text>
        <text x="323" y="179" style="font-size:7.5px;fill:#475569;font-family:sans-serif">qu'une grille de voxels 3D.</text>
        <text x="323" y="194" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">activez le surplomb pour voir la limite…</text>
      </template>
      <template v-else-if="rep === 'flat25'">
        <text x="323" y="155" style="font-size:7.5px;fill:#475569;font-family:sans-serif">Les hits du tablier écrasent ceux du sol :</text>
        <text x="323" y="167" style="font-size:7.5px;fill:#475569;font-family:sans-serif">avec UN z par cellule, l'espace libre sous</text>
        <text x="323" y="179" style="font-size:7.5px;fill:#475569;font-family:sans-serif">le pont n'est plus représentable.</text>
        <text x="323" y="194" style="font-size:7.5px;fill:#CF1C24;font-weight:700;font-family:sans-serif">→ le drone est bloqué. Solution : MLS.</text>
      </template>
      <template v-else>
        <text x="323" y="155" style="font-size:7.5px;fill:#475569;font-family:sans-serif">Mêmes hits, autre règle : les z de chaque</text>
        <text x="323" y="167" style="font-size:7.5px;fill:#475569;font-family:sans-serif">cellule forment 2 clusters (sol, dalle) →</text>
        <text x="323" y="179" style="font-size:7.5px;fill:#475569;font-family:sans-serif">l'intervalle libre entre les deux est connu.</text>
        <text x="323" y="194" style="font-size:7.5px;fill:#15803d;font-weight:700;font-family:sans-serif">→ ~2 valeurs/cellule ≪ grille 3D dense.</text>
      </template>
    </svg>

    <div class="em-controls">
      <button class="em-btn em-scan" @click="startScan">▶ Scanner</button>
      <span class="em-mode">
        <button class="em-btn" :class="{ on: rep === 'flat25' }" @click="rep = 'flat25'">2.5D</button>
        <button class="em-btn" :class="{ on: rep === 'mls' }" @click="rep = 'mls'">MLS</button>
      </span>
      <button class="em-btn" :class="{ on: overhang }" @click="overhang = !overhang">
        {{ overhang ? '✓ surplomb' : '+ surplomb' }}
      </button>
      <button class="em-btn" @click="randomize">🎲 terrain</button>
      <span class="em-info">mêmes mesures, deux règles de stockage — basculez 2.5D ⟷ MLS pendant ou après le scan</span>
    </div>
  </div>
</template>

<style scoped>
.em-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.em-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.em-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.em-mode { display: flex; gap: 0; }
.em-mode .em-btn:first-child { border-radius: 5px 0 0 5px; }
.em-mode .em-btn:last-child { border-radius: 0 5px 5px 0; border-left: none; }
.em-btn {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #94a3b8; background: #f8fafc; color: #64748b; font-weight: 700;
}
.em-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.em-scan { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.em-scan:hover { background: #CF1C24; color: white; }
.em-info { font-size: 0.64rem; color: #64748b; font-style: italic; }
</style>
