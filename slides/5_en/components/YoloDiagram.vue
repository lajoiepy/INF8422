<script setup lang="ts">
withDefaults(defineProps<{ mode?: 'pipeline' | 'candidates' }>(), { mode: 'pipeline' })
const scales = [
  { x: 354, size: 72, label: '80 × 80', color: '#00a0cd' },
  { x: 462, size: 54, label: '40 × 40', color: '#218638' },
  { x: 563, size: 36, label: '20 × 20', color: '#cf1c24' },
]
</script>

<template>
  <svg v-if="mode === 'pipeline'" class="yolo-pipeline" viewBox="0 0 900 172" role="img" aria-label="Image de route vers un encodeur, trois cartes de caractéristiques, puis boîtes et scores des classes à chaque position.">
    <text x="95" y="20" text-anchor="middle" class="heading">Image entière</text>
    <rect x="5" y="35" width="180" height="112" rx="6" fill="#e5f5fc" />
    <path d="M5 147L68 75H123L185 147Z" fill="#94a3b8" />
    <path d="M96 82L96 98M96 108L96 135" stroke="white" stroke-width="4" />
    <rect x="22" y="52" width="34" height="35" fill="#cbd5e1" />
    <rect x="140" y="45" width="31" height="44" fill="#cbd5e1" />
    <path d="M108 110L115 99H142L151 110Z" fill="#007fa3" />
    <rect x="106" y="110" width="49" height="23" rx="4" fill="#007fa3" />
    <circle cx="115" cy="134" r="5" fill="#334155" /><circle cx="146" cy="134" r="5" fill="#334155" />
    <circle cx="44" cy="103" r="5" fill="#334155" />
    <path d="M44 109V126M35 118L44 112L53 118M44 126L38 137M44 126L50 137" fill="none" stroke="#334155" stroke-width="4" />
    <text x="95" y="168" text-anchor="middle">640 × 640 pixels</text>
    <text x="200" y="100" class="arrow">→</text>
    <rect x="233" y="61" width="94" height="67" rx="7" fill="#fff1ed" stroke="#f15a22" />
    <text x="280" y="90" text-anchor="middle">Encodeur</text>
    <text x="280" y="114" text-anchor="middle">+ fusion</text>
    <text x="483" y="20" text-anchor="middle" class="heading">Plusieurs résolutions</text>
    <g v-for="s in scales" :key="s.label">
      <rect :x="s.x" :y="104 - s.size / 2" :width="s.size" :height="s.size" :fill="s.color" fill-opacity=".12" :stroke="s.color" stroke-width="2" />
      <g v-for="i in 3" :key="i" :stroke="s.color" stroke-opacity=".55">
        <line :x1="s.x + i * s.size / 4" :x2="s.x + i * s.size / 4" :y1="104 - s.size / 2" :y2="104 + s.size / 2" />
        <line :x1="s.x" :x2="s.x + s.size" :y1="104 - s.size / 2 + i * s.size / 4" :y2="104 - s.size / 2 + i * s.size / 4" />
      </g>
      <text :x="s.x + s.size / 2" y="166" text-anchor="middle">{{ s.label }}</text>
    </g>
    <text x="631" y="100" class="arrow">→</text>
    <text x="782" y="20" text-anchor="middle" class="heading">À chaque position</text>
    <rect x="685" y="54" width="194" height="40" rx="6" fill="#fff1ed" />
    <rect x="685" y="106" width="194" height="40" rx="6" fill="#eef8f0" />
    <text x="782" y="80" text-anchor="middle">Une boîte candidate</text>
    <text x="782" y="132" text-anchor="middle">Scores des classes</text>
  </svg>
  <svg v-else class="yolo-candidates" viewBox="0 0 350 175" role="img" aria-label="Candidats A et B sur la même voiture, candidat C sur un piéton. A et B ont une IoU de 0,85.">
    <rect x="4" y="30" width="342" height="114" rx="6" fill="#f1f5f9" />
    <path d="M68 90L83 64H137L153 90Z" fill="#79b1c4" />
    <rect x="63" y="88" width="99" height="29" rx="5" fill="#007fa3" />
    <circle cx="83" cy="118" r="9" fill="#334155" /><circle cx="144" cy="118" r="9" fill="#334155" />
    <circle cx="278" cy="64" r="10" fill="#334155" />
    <path d="M278 77V108M262 94L278 81L294 94M278 108L265 130M278 108L290 130" stroke="#334155" stroke-width="7" fill="none" />
    <rect x="50" y="45" width="120" height="80" fill="none" stroke="#cf1c24" stroke-width="3" />
    <rect x="60" y="45" width="120" height="80" fill="none" stroke="#f15a22" stroke-width="3" stroke-dasharray="6 4" />
    <rect x="250" y="43" width="58" height="92" fill="none" stroke="#218638" stroke-width="3" />
    <text x="17" y="20" fill="#a8161d">A : voiture, 0,92</text>
    <text x="17" y="166" fill="#a8390c">B : voiture, 0,78</text>
    <text x="232" y="20" fill="#218638">C : piéton</text>
    <text x="258" y="166" fill="#218638">0,88</text>
  </svg>
</template>

<style scoped>
svg { display: block; width: 100%; }
.yolo-pipeline { height: 166px; margin: 10px 0; }
.yolo-candidates { height: 170px; margin-top: 7px; }
text { font: 17px 'Avenir Next', 'Nunito Sans', sans-serif; fill: #334155; }
text[fill] { fill: revert-layer; }
.heading { font-weight: 650; }
.arrow { font-size: 28px; fill: #64748b; }
</style>
