<script setup lang="ts">
withDefaults(defineProps<{
  playing: boolean
  done?: boolean
  speed?: number
  /** Télémétrie live, affichée en chiffres tabulaires à droite. */
  stats?: string
  /** Une phrase qui dit ce qu'on regarde en ce moment. */
  caption?: string
  /** Libellé du bouton principal (défaut « Lecture »). */
  playLabel?: string
  /** Libellé du bouton « un pas » (défaut « 1 pas »). */
  stepLabel?: string
  /** Masque le bouton pas-à-pas pour les simulations en temps continu. */
  hideStep?: boolean
  /** Masque le réglage de vitesse quand la simulation doit rester en temps réel. */
  hideSpeed?: boolean
}>(), {
  done: false,
  speed: 1,
  playLabel: 'Lecture',
  stepLabel: '1 pas',
  hideStep: false,
  hideSpeed: false,
})

defineEmits<{
  toggle: []
  step: []
  reset: []
  'update:speed': [value: number]
}>()
</script>

<template>
  <div class="anim-controls-root">
    <div class="anim-controls">
      <button class="anim-btn-main" @click.stop="$emit('toggle')">
        {{ playing ? '⏸ Pause' : `▶ ${playLabel}` }}
      </button>
      <button
        v-if="!hideStep" class="anim-btn" :disabled="playing || done"
        @click.stop="$emit('step')"
      >⏭ {{ stepLabel }}</button>
      <button class="anim-btn" @click.stop="$emit('reset')">↺</button>

      <label v-if="!hideSpeed" class="anim-sl">
        vitesse
        <input
          type="range" min="1" max="16" step="1" :value="speed"
          @click.stop @pointerdown.stop @keydown.stop
          @input="$emit('update:speed', Number(($event.target as HTMLInputElement).value))"
        >
      </label>

      <slot />

      <span v-if="stats" class="anim-stats">{{ stats }}</span>
    </div>
    <p v-if="caption" class="anim-caption">{{ caption }}</p>
  </div>
</template>

<style scoped>
.anim-controls-root {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 4px;
}
.anim-caption {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.25;
  color: #475569;
  font-weight: 600;
}
</style>

<!--
  Non scopé volontairement : le contenu du <slot> est compilé dans la portée du
  composant parent, donc des styles scopés ici ne l'atteindraient pas. Tous les
  sélecteurs sont préfixés `anim-` pour rester confinés aux animations.
-->
<style>
.anim-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 24px;
}
.anim-btn-main {
  padding: 3px 12px;
  border: 1.5px solid #cf1c24;
  border-radius: 5px;
  background: #fef2f2;
  color: #cf1c24;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.anim-btn-main:hover { background: #cf1c24; color: white; }
.anim-btn {
  padding: 3px 9px;
  border: 1.5px solid #cbd5e1;
  border-radius: 5px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.anim-btn:hover:not(:disabled) { background: #e2e8f0; }
.anim-btn:disabled { opacity: 0.4; cursor: not-allowed; }
/* Bascule active : même géométrie, accent vert « en marche ». */
.anim-btn.on {
  border-color: #25b34b;
  background: #f0fdf4;
  color: #15803d;
}
.anim-sl {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  color: #334155;
  white-space: nowrap;
}
.anim-sl strong {
  color: #cf1c24;
  min-width: 30px;
  display: inline-block;
  font-variant-numeric: tabular-nums;
}
.anim-sl input[type="range"] {
  width: 86px;
  height: 4px;
  accent-color: #cf1c24;
  cursor: pointer;
}
.anim-stats {
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.68rem;
  color: #64748b;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
/* Conteneur commun : le SVG prend toute la hauteur restante sous le titre. */
.anim-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
.anim-svg {
  width: 100%;
  flex: 1;
  min-height: 0;
}
@media (prefers-reduced-motion: reduce) {
  .anim-btn-main, .anim-btn { transition: none; }
}
</style>
