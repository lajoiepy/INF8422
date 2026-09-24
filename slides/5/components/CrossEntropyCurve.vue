<script setup lang="ts">
const x = (p: number) => 48 + p * 340
const y = (loss: number) => 226 - loss * 40
const curve = Array.from({ length: 200 }, (_, i) => {
  const p = .01 + .99 * i / 199
  return `${i ? 'L' : 'M'}${x(p)},${y(-Math.log(p))}`
}).join(' ')
const examples = [
  { p: .1, label: 'p = 0,1 → perte 2,303', dx: 12, dy: -12 },
  { p: .8, label: 'p = 0,8 → perte 0,223', dx: -140, dy: -54 },
]
</script>

<template>
  <svg class="ce-curve" viewBox="0 0 420 290" role="img" aria-label="Perte moins logarithme de la probabilité de la bonne classe : 2,303 à 0,1 ; 0,223 à 0,8 ; zéro à un.">
    <g v-for="loss in [0, 1, 2, 3, 4]" :key="loss">
      <line x1="48" :y1="y(loss)" x2="388" :y2="y(loss)" stroke="#e2e8f0" />
      <text x="35" :y="y(loss) + 5" text-anchor="end">{{ loss }}</text>
    </g>
    <path d="M48 28V226H388" fill="none" stroke="#64748b" stroke-width="1.5" />
    <text x="48" y="18" class="axis-label">Perte −ln p</text>
    <g v-for="p in [0, .2, .4, .6, .8, 1]" :key="p">
      <text :x="x(p)" y="249" text-anchor="middle">{{ String(p).replace('.', ',') }}</text>
    </g>
    <text x="215" y="276" text-anchor="middle" class="axis-label">Probabilité p de la bonne classe</text>
    <path :d="curve" fill="none" stroke="#CF1C24" stroke-width="3" />
    <g v-for="point in examples" :key="point.p">
      <circle :cx="x(point.p)" :cy="y(-Math.log(point.p))" r="5" fill="#CF1C24" />
      <text :x="x(point.p) + point.dx" :y="y(-Math.log(point.p)) + point.dy">{{ point.label }}</text>
    </g>
    <circle :cx="x(1)" :cy="y(0)" r="4" fill="#218638" />
  </svg>
</template>

<style scoped>
.ce-curve { display: block; width: 100%; height: 240px; }
.ce-curve text { font: 14px 'Avenir Next', 'Nunito Sans', sans-serif; fill: #334155; }
.ce-curve .axis-label { font-weight: 600; }
</style>
