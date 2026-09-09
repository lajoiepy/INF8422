<script setup lang="ts">
import { computed, ref } from 'vue'
import katex from 'katex'
import { factorCholesky, SLAM_INFORMATION } from './choleskyMath'

const { M, steps } = factorCholesky(SLAM_INFORMATION)
// Inspect the equation, reveal its value, then move to the next coefficient.
const cursor = ref(0)
const total = steps.length * 2
const done = computed(() => cursor.value === total)
const entryIndex = computed(() => Math.min(Math.floor(cursor.value / 2), steps.length - 1))
const entry = computed(() => steps[entryIndex.value])
const revealed = computed(() => cursor.value % 2 === 1)
function next() { cursor.value = Math.min(total, cursor.value + 1) }
function previous() { cursor.value = Math.max(0, cursor.value - 1) }
function reset() { cursor.value = 0 }
const number = (v: number) => Math.abs(v - Math.round(v)) < 1e-10 ? String(Math.round(v)) : v.toFixed(3)
const math = (tex: string) => katex.renderToString(tex, { throwOnError: true, displayMode: true })
const symbol = (r: number, c: number) => 'M_{' + (r + 1) + (c + 1) + '}'
const texNumber = (v: number) => v < 0 ? '(' + number(v) + ')' : number(v)
function known(r: number, c: number) {
  if (done.value || r > c) return true
  const index = steps.findIndex(s => s.j === r && s.i === c)
  return index < entryIndex.value || (index === entryIndex.value && revealed.value)
}
function selected(r: number, c: number) { return !done.value && entry.value.j === r && entry.value.i === c }
function dependency(r: number, c: number) {
  if (done.value) return false
  const { j, i } = entry.value
  return (r < j && (c === j || c === i)) || (i !== j && r === j && c === j)
}
const equations = computed(() => {
  const e = entry.value, { j, i } = e
  const target = symbol(j, i)
  const lambda = '\\Lambda_{' + (j + 1) + (i + 1) + '}'
  const prior = e.terms.map(t => j === i ? symbol(t.k, j) + '^2' : symbol(t.k, j) + symbol(t.k, i)).join(' + ')
  const unknown = j === i ? target + '^2' : symbol(j, j) + '\\,' + target
  const product = lambda + ' = ' + (prior ? '\\underbrace{' + prior + '}_{\\text{déjà connu}} + ' : '') + '\\underbrace{' + unknown + '}_{\\text{à déterminer}}'
  const remaining = lambda + (prior ? '-(' + prior + ')' : '')
  const isolate = target + ' = ' + (j === i ? '\\sqrt{' + remaining + '}' : '\\frac{' + remaining + '}{' + symbol(j, j) + '}')
  const numericRemaining = number(SLAM_INFORMATION[j][i]) + (e.terms.length ? '-(' + e.terms.map(t => j === i ? texNumber(t.left) + '^2' : texNumber(t.left) + '\\times' + texNumber(t.right)).join('+') + ')' : '')
  const numeric = target + ' \\approx ' + (j === i ? '\\sqrt{' + numericRemaining + '}' : '\\frac{' + numericRemaining + '}{' + number(e.divisor!) + '}') + ' \\approx ' + number(e.value)
  return { product: math(product), isolate: math(isolate), numeric: math(numeric) }
})
const reconstructed = M.map((_, i) => M.map((_, j) => M.reduce((s, row) => s + row[i] * row[j], 0)))
const verification = math('M^\\top M = \\begin{bmatrix}' + reconstructed.map(row => row.map(number).join('&')).join('\\\\') + '\\end{bmatrix} = \\Lambda')
</script>

<template>
  <div class="ch-wrap">
    <div class="ch-status">
      <span>{{ done ? 'Facteur terminé : vérifier le produit' : 'Ligne ' + (entry.j + 1) + ' de M · coefficient ' + (entryIndex + 1) + ' / ' + steps.length }}</span>
      <span>{{ done ? 'Λ = MᵀM' : entry.j === entry.i ? 'Diagonale → racine positive' : 'Hors diagonale → division' }}</span>
    </div>
    <div class="ch-body">
      <div class="ch-matrices">
        <div class="ch-pair">
          <div>
            <div class="ch-matrix-title">Λ <small>donnée, fixe</small></div>
            <div class="ch-grid" role="table" aria-label="Matrice d’information Lambda">
              <template v-for="(row, r) in SLAM_INFORMATION" :key="r">
                <div v-for="(v, c) in row" :key="c" role="cell" class="ch-cell" :class="{ 'ch-input': selected(r, c) }">{{ v }}</div>
              </template>
            </div>
          </div>
          <div>
            <div class="ch-matrix-title">M <small>à construire</small></div>
            <div class="ch-grid" role="table" aria-label="Facteur triangulaire M">
              <template v-for="(row, r) in M" :key="r">
                <div v-for="(v, c) in row" :key="c" role="cell" class="ch-cell"
                  :class="{ 'ch-zero': r > c, 'ch-known': known(r, c) && r <= c, 'ch-dependency': dependency(r, c), 'ch-target': selected(r, c) }">
                  {{ known(r, c) ? number(v) : selected(r, c) ? '?' : '·' }}
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="ch-legend"><span class="ch-input">Donnée utilisée</span><span class="ch-dependency">Valeurs réutilisées</span><span class="ch-target">Inconnue</span></div>
        <p class="ch-reading">Les zéros sous la diagonale sont imposés.<br>On remplit <b>une ligne à la fois</b>, de gauche à droite.</p>
        <div class="ch-rule">Chaque entrée de Λ est un <b>produit scalaire de deux colonnes de M</b>.</div>
      </div>
      <div class="ch-explanation" aria-live="polite">
        <template v-if="!done">
          <div class="ch-step-label">1 · Écrire l’entrée ({{ entry.j + 1 }}, {{ entry.i + 1 }}) du produit MᵀM</div>
          <div class="ch-equation" v-html="equations.product" />
          <div class="ch-step-label">2 · Isoler la seule inconnue</div>
          <div class="ch-equation" v-html="equations.isolate" />
          <div class="ch-result" :class="{ 'ch-result-visible': revealed }">
            <template v-if="revealed">
              <div class="ch-step-label">3 · Remplacer par les valeurs connues</div>
              <div class="ch-equation ch-numeric" v-html="equations.numeric" />
              <p>Cette valeur devient disponible pour les calculs suivants.</p>
            </template>
            <p v-else>Quelle valeur doit remplacer « ? » pour que l’égalité soit vraie ?<br><b>Cliquez sur « Calculer » pour la révéler.</b></p>
          </div>
        </template>
        <template v-else>
          <h3>Le produit redonne bien la matrice initiale.</h3>
          <div class="ch-equation" v-html="verification" />
          <p>On a construit M uniquement à partir de Λ : <b>aucun second membre n’a été utilisé.</b></p>
          <p>La diapo suivante utilise ce facteur pour résoudre ΛΔ = Aᵀb.</p>
        </template>
      </div>
    </div>
    <div class="ch-controls">
      <button @click="previous" :disabled="cursor === 0">← Précédent</button>
      <button class="ch-primary" @click="next" :disabled="done">{{ done ? 'Terminé' : !revealed ? 'Calculer' : entryIndex === steps.length - 1 ? 'Vérifier MᵀM →' : 'Coefficient suivant →' }}</button>
      <button @click="reset">↺ Recommencer</button>
      <span>Affichage arrondi à 3 décimales ; calculs non arrondis.</span>
    </div>
  </div>
</template>

<style scoped>
.ch-wrap { color:#334155; font-size:14px; }
.ch-status { display:flex; justify-content:space-between; padding:8px 12px; background:#f1f5f9; border-radius:7px; font-weight:650; font-size:13px; }
.ch-body { display:grid; grid-template-columns:400px minmax(0, 1fr); gap:18px; margin-top:12px; min-height:290px; }
.ch-matrices { padding:10px; border:1px solid #cbd5e1; border-radius:8px; }
.ch-pair { display:flex; justify-content:space-between; gap:10px; }
.ch-matrix-title { font-family:serif; font-size:20px; text-align:center; margin-bottom:8px; font-weight:bold; }
.ch-matrix-title small { font:11px sans-serif; color:#64748b; }
.ch-grid { display:grid; grid-template-columns:repeat(4, 42px); gap:2px; border-inline:2px solid #94a3b8; padding:0 3px; }
.ch-cell { height:30px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; font:10px monospace; border:2px solid transparent; border-radius:3px; }
.ch-zero { color:#94a3b8; background:white; }
.ch-known { color:#334155; background:#e2e8f0; }
.ch-input { background:#f3e8ff; color:#7e22ce; border-color:#a855f7; }
.ch-dependency { background:#dbeafe; color:#1d4ed8; border-color:#3b82f6; }
.ch-target { background:#fef3c7; color:#92400e; border-color:#f59e0b; font-weight:800; }
.ch-legend { display:flex; flex-wrap:wrap; gap:5px; margin-top:12px; font-size:10px; }
.ch-legend span { padding:3px 5px; border-radius:3px; }
.ch-reading { font-size:12px; line-height:1.5; margin:10px 0 !important; }
.ch-rule { border-top:1px solid #e2e8f0; padding-top:8px; font-size:12px; line-height:1.4; }
.ch-explanation { padding:3px 0; min-width:0; }
.ch-step-label { color:#64748b; font-size:12px; font-weight:650; }
.ch-equation { font-size:15px; padding:2px 0; }
.ch-equation :deep(.katex-display) { margin:8px 0 13px; }
.ch-numeric { font-size:13px; }
.ch-result { background:#f8fafc; border:1px dashed #cbd5e1; border-radius:7px; padding:10px; min-height:86px; }
.ch-result-visible { background:#f0fdf4; border:1px solid #86efac; }
.ch-explanation p { font-size:13px; line-height:1.6; margin:6px 0 !important; }
.ch-explanation h3 { font-size:16px; margin:0 0 8px; }
.ch-result p { font-size:12px; }
.ch-controls { display:flex; align-items:center; gap:8px; margin-top:10px; }
.ch-controls button { border:1px solid #94a3b8; border-radius:5px; padding:6px 9px; font-size:12px; cursor:pointer; }
.ch-controls button:disabled { opacity:.4; cursor:default; }
.ch-controls .ch-primary { background:#CF1C24; color:white; border-color:#CF1C24; }
.ch-controls span { margin-left:auto; font-size:10px; color:#64748b; }
button:focus-visible { outline:3px solid #0284c7; outline-offset:2px; }
</style>
