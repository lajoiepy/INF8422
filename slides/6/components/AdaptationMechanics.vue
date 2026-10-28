<script setup lang="ts">
import {computed} from 'vue'
const props=withDefaults(defineProps<{mode:string;stage?:number;lang?:string}>(),{stage:0,lang:'en'})
const t=(en:string,fr:string)=>props.lang==='fr'?fr:en
const panels=computed(()=>[
 {title:t('One ViT-B/16 · Table 1','Un ViT-B/16 · tableau 1'),rows:[[t('Linear probe','Sonde linéaire'),61],['ComBo',74.6],['LoRA',75.6],['Adapter+',77.6]]},
 {title:t('Multiple backbones · Table 2','Plusieurs encodeurs · tableau 2'),rows:[['RADIO + Adapter+',77.5],['DINOv2 + ComBo',77.9],[t('ComBo · all four','ComBo · quatre'),78.2],[t('ComBo · top two','ComBo · deux'),78.6]]}
])
</script>
<template>
<div class="adapt-mechanics" :data-mode="mode" :data-stage="stage">
 <svg v-if="mode==='paths'" viewBox="0 0 870 195" role="img" :aria-label="t('Frozen features versus internal adaptation','Caractéristiques gelées ou adaptation interne')">
  <g v-for="(y,i) in [40,125]" :key="i" :opacity="i===1&&stage<1?.15:1">
   <text x="0" :y="y+5" class="small">{{i===0?t('Head only','Tête seule'):'LoRA'}}</text>
   <path :d="`M105 ${y}H770`" class="wire"/>
   <rect x="130" :y="y-25" width="275" height="50" class="frozen"/>
   <text x="267" :y="y+6" text-anchor="middle">{{t('Encoder θ₀ · frozen','Encodeur θ₀ · gelé')}}</text>
   <g v-if="i===1"><rect x="196" :y="y+30" width="145" height="28" class="train"/><text x="268" :y="y+50" text-anchor="middle" class="small">A, B {{t('trainable','entraînables')}}</text><path :d="`M196 ${y+44}H150V${y+25}M341 ${y+44}H385V${y+25}`" class="orange-wire"/></g>
   <text x="458" :y="y-12" text-anchor="middle">{{i===0?'ψ':'ψ′'}}</text>
   <rect x="515" :y="y-25" width="150" height="50" class="train"/><text x="590" :y="y+6" text-anchor="middle">{{t('Head β','Tête β')}}</text>
   <text x="785" :y="y+6">ŷ</text>
  </g>
 </svg>
 <svg v-else-if="mode==='branch'" viewBox="0 0 870 195" role="img" :aria-label="t('Parallel LoRA computation','Calcul parallèle de LoRA')">
  <text x="12" y="91">u ∈ ℝᵏ</text><path d="M90 85H130V32H620V85H790" class="wire"/>
  <rect x="245" y="10" width="220" height="45" class="frozen"/><text x="355" y="39" text-anchor="middle">W₀ · {{t('frozen','gelé')}}</text>
  <g :opacity="stage>=1?1:.15"><path d="M130 85V135H620V85" class="wire"/><rect x="185" y="110" width="120" height="50" class="train"/><text x="245" y="140" text-anchor="middle">A : k → q</text><text x="345" y="122" text-anchor="middle" class="small">Au</text><rect x="395" y="110" width="165" height="50" class="train"/><text x="477" y="140" text-anchor="middle">sB : q → d</text></g>
  <circle cx="620" cy="85" r="17" fill="white" stroke="#25B34B" stroke-width="2"/><text x="620" y="92" text-anchor="middle">+</text>
  <text x="790" y="91">z ∈ ℝᵈ</text>
  <text v-if="stage>=2" x="435" y="179" text-anchor="middle" class="small">{{t('Train A and B; keep W₀ fixed','Entraîner A et B ; garder W₀ fixe')}}</text>
 </svg>
 <svg v-else-if="mode==='rank'" viewBox="0 0 870 185" role="img" :aria-label="t('Rank-one and rank-two correction spaces','Espaces de correction de rang un et deux')">
  <g v-for="(cx,i) in [205,635]" :key="cx">
   <path :d="`M${cx-125} 105H${cx+130}M${cx} 150V15`" stroke="#cbd5e1"/>
   <polygon v-if="i===1&&stage>=2" :points="`${cx-105},120 ${cx-10},25 ${cx+105},70 ${cx+10},155`" fill="#edf8fc" stroke="#00BDF2"/>
   <path :d="`M${cx-90} 150L${cx+90} 60`" stroke="#25B34B" stroke-width="3"/>
   <text :x="cx+87" y="52" class="small">b₁</text>
   <g v-if="i===1&&stage>=2"><path :d="`M${cx} 105L${cx-35} 45`" stroke="#00BDF2" stroke-width="3"/><text :x="cx-55" y="35" class="small">b₂</text></g>
   <circle v-if="stage>=1" :cx="cx+(i===1&&stage>=2?15:45)" :cy="i===1&&stage>=2?65:82.5" r="6" fill="#CF1C24"/>
   <text :x="cx" y="20" text-anchor="middle">{{i===0?'q = 1':'q = 2'}}</text>
   <text :x="cx" y="169" text-anchor="middle" class="small">{{i===0?t('One correction direction','Une direction de correction'):t('Up to two independent directions','Jusqu’à deux directions indépendantes')}}</text>
  </g>
 </svg>
 <svg v-else-if="mode==='align'" viewBox="0 0 870 195" role="img" :aria-label="t('Aligned positions and channel concatenation','Positions alignées et concaténation des canaux')">
  <g v-for="(x,m) in [15,180]" :key="x">
   <text :x="x+57" y="20" text-anchor="middle" class="small">{{t('Model','Modèle')}} {{m+1}}</text>
   <g v-for="i in 9" :key="i"><rect :x="x+((i-1)%3)*34" :y="35+Math.floor((i-1)/3)*34" width="30" height="30" :fill="i===5?'#F15A22':m?'#dff5e5':'#dff5fc'" stroke="#94a3b8"/></g>
   <text :x="x+50" y="157" text-anchor="middle" class="small">{{t('Aligned grid','Grille alignée')}}</text>
  </g>
  <g :opacity="stage>=1?1:.15"><path d="M290 85H370" class="wire"/><rect x="375" y="36" width="65" height="112" fill="#dff5fc" stroke="#00BDF2"/><rect x="440" y="36" width="65" height="112" fill="#dff5e5" stroke="#25B34B"/><text x="440" y="22" text-anchor="middle">Sᵢ</text><text x="440" y="170" text-anchor="middle" class="small">{{t('All layers at position i','Toutes les couches en i')}}</text></g>
  <g :opacity="stage>=2?1:.15"><path d="M510 85H565M695 85H750" class="wire"/><rect x="570" y="55" width="120" height="60" class="train"/><text x="630" y="91" text-anchor="middle">P Sᵢ + b</text><rect x="755" y="57" width="85" height="55" fill="#fff4ed" stroke="#F15A22"/><text x="796" y="91" text-anchor="middle">tᵢ</text><text x="700" y="157" text-anchor="middle" class="small">D → D′</text></g>
 </svg>
 <svg v-else-if="mode==='results'" class="results" viewBox="0 0 870 245" role="img" :aria-label="t('Published VTAB aggregate accuracy, axis zero to 100 percent','Précision agrégée VTAB publiée, axe de zéro à 100 pour cent')">
  <g v-for="(p,j) in panels" :key="j" :transform="`translate(${j*445},0)`">
   <text x="205" y="20" text-anchor="middle" class="panel-title">{{p.title}}</text>
   <g v-for="(row,i) in p.rows" :key="String(row[0])">
    <text x="172" :y="56+i*41" text-anchor="end" class="small">{{row[0]}}</text>
    <rect x="185" :y="42+i*41" :width="Number(row[1])*1.9" height="22" :fill="String(row[0]).includes('ComBo')?'#00BDF2':'#94a3b8'"/>
    <text :x="192+Number(row[1])*1.9" :y="58+i*41" class="small">{{row[1]}}</text>
   </g>
   <path d="M185 210H375" stroke="#94a3b8"/><text x="185" y="231" text-anchor="middle" class="small">0</text><text x="280" y="231" text-anchor="middle" class="small">50</text><text x="375" y="231" text-anchor="middle" class="small">100 %</text>
  </g>
 </svg>
</div>
</template>
<style scoped>
.adapt-mechanics svg{display:block;width:100%;height:180px;margin:10px 0}.adapt-mechanics svg.results{height:225px}.adapt-mechanics text{font:18px 'Avenir Next','Nunito Sans',sans-serif;fill:#334155}.adapt-mechanics text.small{font-size:14px}.adapt-mechanics text.panel-title{font-size:16px;font-weight:650}.wire{fill:none;stroke:#475569;stroke-width:2}.orange-wire{fill:none;stroke:#F15A22;stroke-width:2}.frozen{fill:#f1f5f9;stroke:#64748b;stroke-width:2}.train{fill:#fff4ed;stroke:#F15A22;stroke-width:2}g[opacity]{transition:opacity .3s ease}@media(prefers-reduced-motion:reduce){g[opacity]{transition:none}}
</style>
