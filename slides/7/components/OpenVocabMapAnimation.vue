<script setup lang="ts">
import { ref, computed } from 'vue'

// ── Carte à vocabulaire ouvert : features CLIP fusionnées en 3D ────
// Chaque cellule porte un embedding (features de fondation). Une requête
// TEXTE est encodée en embedding ; on colore par similarité cosinus.
// → localisation en langage naturel, sans classes pré-définies.
const ROWS = 6, COLS = 8
const CW = 30, CH = 26, OX = 12, OY = 26

// Classes et leurs directions d'embedding (2D jouet, angle en degrés)
const CLASS_ANGLE: Record<string, number> = { Mur: 315, Sol: 10, Chaise: 100, Table: 160, Plante: 250 }
function emb(angleDeg: number): [number, number] {
  const a = angleDeg * Math.PI / 180
  return [Math.cos(a), Math.sin(a)]
}

// Carte de classes (vérité) de la scène
const classMap: string[][] = (() => {
  const g: string[][] = []
  for (let r = 0; r < ROWS; r++) {
    g[r] = []
    for (let c = 0; c < COLS; c++) {
      if (r <= 1) g[r][c] = 'Mur'
      else if (r >= 4) g[r][c] = 'Sol'
      else if (c >= 1 && c <= 2) g[r][c] = 'Chaise'
      else if (c >= 4 && c <= 5) g[r][c] = 'Table'
      else if (c === 7) g[r][c] = 'Plante'
      else g[r][c] = 'Mur'
    }
  }
  return g
})()

// Embedding par cellule = direction de classe + petit bruit déterministe
function cellEmb(r: number, c: number): [number, number] {
  const [x, y] = emb(CLASS_ANGLE[classMap[r][c]])
  const n = Math.sin(r * 2.3 + c * 1.7) * 0.12
  const v: [number, number] = [x + n, y - n]
  const norm = Math.hypot(v[0], v[1])
  return [v[0] / norm, v[1] / norm]
}

const QUERIES = ['Chaise', 'Table', 'Sol', 'Plante']
const query = ref('Chaise')
const threshold = ref(0.6)

function cosineSim(r: number, c: number): number {
  const [ex, ey] = cellEmb(r, c)
  const [qx, qy] = emb(CLASS_ANGLE[query.value])
  return ex * qx + ey * qy   // vecteurs unitaires → cosinus
}

function heatColor(sim: number): string {
  const t = Math.max(0, Math.min(1, (sim + 0.2) / 1.2))  // [-0.2,1]→[0,1]
  // bleu (bas) → jaune → rouge (haut)
  if (t < 0.5) { const s = t * 2; return `rgb(${Math.round(30 + s * 220)},${Math.round(90 + s * 165)},${Math.round(200 - s * 120)})` }
  const s = (t - 0.5) * 2; return `rgb(${Math.round(250)},${Math.round(255 - s * 200)},${Math.round(80 - s * 80)})`
}

const detected = computed(() => {
  let n = 0
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (cosineSim(r, c) >= threshold.value) n++
  return n
})
</script>

<template>
  <div class="ov-wrap">
    <svg viewBox="0 0 560 215" class="ov-svg">
      <!-- Panneau scène -->
      <rect x="0" y="0" width="272" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="136" y="14" text-anchor="middle"
        style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Similarité à « {{ query }} » (cosinus CLIP)
      </text>

      <g v-for="r in ROWS" :key="r">
        <g v-for="c in COLS" :key="c">
          <rect :x="OX+(c-1)*CW" :y="OY+(r-1)*CH" :width="CW-1" :height="CH-1"
            :fill="heatColor(cosineSim(r-1, c-1))" rx="1"/>
          <rect v-if="cosineSim(r-1,c-1) >= threshold"
            :x="OX+(c-1)*CW" :y="OY+(r-1)*CH" :width="CW-1" :height="CH-1"
            fill="none" stroke="#25B34B" stroke-width="2" rx="1"/>
        </g>
      </g>
      <text x="136" y="204" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-family:sans-serif">
        contour vert = au-dessus du seuil ({{ threshold.toFixed(2) }})
      </text>

      <!-- Panneau info -->
      <rect x="279" y="0" width="281" height="210" fill="#f8fafc" rx="5" stroke="#CBD5E1" stroke-width="1.2"/>
      <text x="419" y="14" text-anchor="middle" style="font-size:8.5px;fill:#64748b;font-weight:700;font-family:sans-serif">
        Requête en langage naturel
      </text>

      <rect x="287" y="22" width="265" height="40" fill="#eff6ff" rx="4" stroke="#bfdbfe"/>
      <text x="295" y="37" style="font-size:8px;fill:#1e40af;font-family:monospace">
        sim(x) = ⟨ φ(x) , ψ("{{ query }}") ⟩
      </text>
      <text x="295" y="52" style="font-size:7.5px;fill:#475569;font-family:sans-serif">
        φ : caractéristique 3D fusionnée · ψ : encodeur texte (CLIP)
      </text>

      <rect x="287" y="70" width="265" height="26" fill="#f0fdf4" rx="4" stroke="#86efac"/>
      <text x="419" y="87" text-anchor="middle" style="font-size:8.5px;fill:#15803d;font-weight:700;font-family:sans-serif">
        {{ detected }} région(s) détectée(s) pour « {{ query }} »
      </text>

      <text x="295" y="115" style="font-size:8px;fill:#475569;font-weight:700;font-family:sans-serif">Vocabulaire ouvert :</text>
      <foreignObject x="295" y="120" width="250" height="52">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:8.5px;color:#475569;font-family:sans-serif;line-height:1.3">
          Les requêtes et les caractéristiques visuelles sont comparées dans un espace commun. Les vecteurs de cette démonstration sont synthétiques.
        </div>
      </foreignObject>

      <rect x="287" y="176" width="265" height="28" fill="#fff7ed" rx="4" stroke="#fed7aa"/>
      <text x="419" y="188" text-anchor="middle" style="font-size:7.5px;fill:#c2410c;font-weight:700;font-family:sans-serif">
        Fusion de caractéristiques pré-entraînées en 3D
      </text>
      <text x="419" y="199" text-anchor="middle" style="font-size:7px;fill:#94a3b8;font-style:italic;font-family:sans-serif">
        ConceptFusion · OpenScene · LERF · CLIP-Fields
      </text>
    </svg>

    <div class="ov-controls">
      <span class="ov-lbl">Requête :</span>
      <button v-for="q in QUERIES" :key="q" class="ov-btn" :class="{ on: query === q }" @click="query = q">{{ q }}</button>
      <label class="ov-sl">seuil <strong>{{ threshold.toFixed(2) }}</strong>
        <input type="range" v-model.number="threshold" min="0.2" max="0.95" step="0.05"/></label>
    </div>
  </div>
</template>

<style scoped>
.ov-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.ov-svg  { height: 248px; width: auto; max-width: 100%; display: block; }
.ov-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ov-lbl { font-size: 0.72rem; color: #334155; font-weight: 700; }
.ov-btn {
  padding: 3px 10px; border-radius: 5px; cursor: pointer; font-size: 0.72rem;
  border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b; font-weight: 600;
}
.ov-btn.on { border-color: #CF1C24; background: #fef2f2; color: #CF1C24; }
.ov-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.ov-sl strong { color: #CF1C24; min-width: 30px; display: inline-block; }
.ov-sl input[type=range] { width: 90px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
</style>
