<script setup lang="ts">
import { ref, computed } from 'vue'

// ── 3D Scene Graph : hiérarchie points → objets → lieux → bâtiment ─
// Chaque niveau abstrait le précédent (Hydra, 3D Dynamic Scene Graph).
const level = ref(0)   // 0=points, 1=+objets, 2=+lieux, 3=+bâtiment
const MAXL = 3

const YP = 188, YO = 140, YR = 88, YB = 40

// Points 3D étiquetés (bas niveau)
const points = Array.from({ length: 18 }, (_, i) => ({ x: 24 + i * 14, y: YP + (i % 3 - 1) * 5 }))
// Objets
const objects = [
  { x: 45, y: YO, label: 'Chaise', room: 0, color: '#CF1C24' },
  { x: 100, y: YO, label: 'Table', room: 0, color: '#F15A22' },
  { x: 155, y: YO, label: 'Plante', room: 0, color: '#25B34B' },
  { x: 210, y: YO, label: 'Lit', room: 1, color: '#00BDF2' },
  { x: 262, y: YO, label: 'Porte', room: 1, color: '#8B5CF6' },
]
const rooms = [
  { x: 100, y: YR, label: 'Salon' },
  { x: 236, y: YR, label: 'Chambre' },
]
const building = { x: 150, y: YB, label: 'Bâtiment' }

// point → objet le plus proche (assignation visuelle)
const pointEdges = points.map(p => {
  let best = 0, bd = 1e9
  objects.forEach((o, i) => { const d = Math.abs(o.x - p.x); if (d < bd) { bd = d; best = i } })
  return { p, o: objects[best] }
})

const nodeCount = computed(() => [18, 5, 2, 1][level.value])
const levelName = computed(() => ['Points 3D étiquetés', 'Objets', 'Lieux / pièces', 'Bâtiment (racine)'][level.value])
const levelDesc = computed(() => [
  'Nuage de points ou maillage avec attributs sémantiques.',
  'Instances segmentées (chaise, table…) → nœuds compacts.',
  'Regroupement spatial des objets = carte topologique (graphe de lieux).',
  'Racine de la hiérarchie spatiale, utilisée pour les requêtes.',
][level.value])

function step() { if (level.value < MAXL) level.value++ }
function reset() { level.value = 0 }
</script>

<template>
  <div class="sg-wrap">
    <svg viewBox="0 0 560 215" class="sg-svg">
      <!-- Panneau graphe -->
      <rect x="0" y="0" width="320" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="160" y="13" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Graphe de scène hiérarchique
      </text>

      <!-- niveaux (labels) -->
      <text x="6" :y="YB+3" style="font-size:6px;fill:#94a3b8;font-family:sans-serif">bâtiment</text>
      <text x="6" :y="YR+3" style="font-size:6px;fill:#94a3b8;font-family:sans-serif">lieux</text>
      <text x="6" :y="YO+3" style="font-size:6px;fill:#94a3b8;font-family:sans-serif">objets</text>
      <text x="6" :y="YP+3" style="font-size:6px;fill:#94a3b8;font-family:sans-serif">points</text>

      <!-- edges points→objets -->
      <g v-if="level >= 1">
        <line v-for="(e, i) in pointEdges" :key="`pe${i}`"
          :x1="e.p.x" :y1="e.p.y" :x2="e.o.x" :y2="e.o.y + 8"
          stroke="#CBD5E1" stroke-width="0.6" style="opacity:0.6"/>
      </g>
      <!-- edges objets→lieux -->
      <g v-if="level >= 2">
        <line v-for="(o, i) in objects" :key="`oe${i}`"
          :x1="o.x" :y1="o.y - 8" :x2="rooms[o.room].x" :y2="rooms[o.room].y + 8"
          stroke="#94a3b8" stroke-width="1.2"/>
      </g>
      <!-- edges lieux→bâtiment -->
      <g v-if="level >= 3">
        <line v-for="(r, i) in rooms" :key="`re${i}`"
          :x1="r.x" :y1="r.y - 8" :x2="building.x" :y2="building.y + 8"
          stroke="#475569" stroke-width="1.5"/>
      </g>

      <!-- points -->
      <circle v-for="(p, i) in points" :key="`p${i}`" :cx="p.x" :cy="p.y" r="2.5"
        fill="#94a3b8" :style="{ opacity: level === 0 ? 0.9 : 0.35 }"/>

      <!-- objets -->
      <template v-if="level >= 1">
        <g v-for="(o, i) in objects" :key="`o${i}`">
          <circle :cx="o.x" :cy="o.y" r="8" :fill="o.color" stroke="white" stroke-width="1.5"/>
          <text :x="o.x" :y="o.y - 11" text-anchor="middle" :style="`font-size:6.5px;fill:${o.color};font-weight:700;font-family:sans-serif`">{{ o.label }}</text>
        </g>
      </template>

      <!-- lieux -->
      <template v-if="level >= 2">
        <g v-for="(r, i) in rooms" :key="`r${i}`">
          <rect :x="r.x-16" :y="r.y-9" width="32" height="18" fill="#F59E0B" stroke="white" stroke-width="1.5" rx="4"/>
          <text :x="r.x" :y="r.y+3" text-anchor="middle" style="font-size:6.5px;fill:white;font-weight:700;font-family:sans-serif">{{ r.label }}</text>
        </g>
      </template>

      <!-- bâtiment -->
      <g v-if="level >= 3">
        <rect :x="building.x-22" :y="building.y-10" width="44" height="20" fill="#334155" stroke="white" stroke-width="2" rx="5"/>
        <text :x="building.x" :y="building.y+3.5" text-anchor="middle" style="font-size:7px;fill:white;font-weight:700;font-family:sans-serif">{{ building.label }}</text>
      </g>

      <!-- Panneau info -->
      <rect x="327" y="0" width="233" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="443" y="14" text-anchor="middle" style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Niveau {{ level }} / {{ MAXL }}
      </text>

      <rect x="335" y="22" width="217" height="42" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="343" y="37" style="font-size:9px;fill:#1e40af;font-weight:700;font-family:sans-serif">{{ levelName }}</text>
      <foreignObject x="343" y="42" width="200" height="22">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:8px;color:#475569;font-family:sans-serif;line-height:1.2">{{ levelDesc }}</div>
      </foreignObject>

      <rect x="335" y="72" width="217" height="26" fill="#f0fdf4" rx="4" stroke="#86efac"/>
      <text x="443" y="89" text-anchor="middle" style="font-size:8px;fill:#15803d;font-weight:700;font-family:monospace">
        {{ nodeCount }} nœud(s) à ce niveau
      </text>

      <text x="335" y="116" style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Propriétés du graphe de scène</text>
      <foreignObject x="335" y="120" width="217" height="70">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:8.5px;color:#475569;font-family:sans-serif;line-height:1.35">
          • <b>Compression</b> : regroupement des points par instance<br/>
          • <b>Recherche</b> : contraintes d’objets et de lieux<br/>
          • <b>Planification</b> : définition de sous-buts<br/>
          • <b>Mise à jour</b> : association des nouvelles observations
        </div>
      </foreignObject>
      <text x="443" y="204" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        Hydra · 3D Dynamic Scene Graphs
      </text>
    </svg>

    <div class="sg-controls">
      <button class="sg-btn-main" @click="step" :disabled="level >= MAXL">▶ Abstraire (niveau {{ level }}→{{ level+1 }})</button>
      <button class="sg-btn" @click="reset">↺</button>
      <span class="sg-info">Chaque niveau regroupe les entités du niveau inférieur.</span>
    </div>
  </div>
</template>

<style scoped>
.sg-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.sg-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.sg-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sg-btn-main {
  padding: 3px 12px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700;
}
.sg-btn-main:hover:not(:disabled) { background: #CF1C24; color: white; }
.sg-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }
.sg-btn {
  padding: 3px 8px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b;
}
.sg-info { font-size: 0.68rem; color: #64748b; font-style: italic; }
</style>
