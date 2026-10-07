<script setup lang="ts">
import {yawRotation,matVec,add} from '../utils/geometry.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const angle=Math.PI/6,c=Math.cos(angle),s=Math.sin(angle),pr=[1,.6,0],t=[2,.4,0],R=[[c,-s,0],[s,c,0],[0,0,1]],pw=add(matVec(R,pr),t)
const project=(p:number[])=>[90+p[0]*90,215-p[1]*75]
const point=(p:number[])=>project(p).join(',')
const axis=(a:number[],b:number[])=>`M${point(a)}L${point(b)}`
</script>
<template>
 <svg class="ssl-svg pose-frames" viewBox="0 0 860 285" role="img" aria-label="Repères monde et robot, translation d’origine et même point exprimé dans les deux repères">
  <path :d="axis([0,0,0],[3.6,0,0])+' '+axis([0,0,0],[0,2.25,0])" fill="none" stroke="#64748b" stroke-width="2"/><text x="426" y="221" class="small">Xw</text><text x="82" y="35" class="small">Yw</text><text x="54" y="239" class="small">Origine w</text>
  <path :d="axis(t,add(t,matVec(R,[1.1,0,0])))+' '+axis(t,add(t,matVec(R,[0,1.1,0])))" fill="none" stroke="#007da8" stroke-width="2"/><text x="374" y="133" class="small">Xr</text><text x="203" y="106" class="small">Yr</text><circle :cx="project(t)[0]" :cy="project(t)[1]" r="5" fill="#007da8"/><text x="275" y="206" class="small">Origine r</text>
  <path :d="axis([0,0,0],t)" fill="none" stroke="#F15A22" stroke-width="2"/><text x="185" y="189" class="small" style="fill:#b3470f">tᵣʷ</text>
  <circle :cx="project(pw)[0]" :cy="project(pw)[1]" r="6" fill="#25B34B"/><text :x="project(pw)[0]+10" :y="project(pw)[1]-7" class="small">Même point</text><path :d="axis(t,pw)" fill="none" stroke="#007da8" stroke-dasharray="4 3"/><path v-if="stage>=1" :d="axis([0,0,0],pw)" fill="none" stroke="#25B34B" stroke-dasharray="4 3"/>
  <rect x="520" y="32" width="319" height="83" rx="4" fill="#edf8fc" stroke="#00BDF2"/><text x="535" y="59">Coordonnées dans le robot</text><text x="535" y="91">pʳ = [1.00, 0.60, 0.00]</text>
  <g v-if="stage>=1"><rect x="520" y="130" width="319" height="83" rx="4" fill="#eff8f1" stroke="#25B34B"/><text x="535" y="157">Coordonnées dans le monde</text><text x="535" y="189">pʷ = [{{pw[0].toFixed(2)}}, {{pw[1].toFixed(2)}}, 0.00]</text></g>
  <text x="520" y="251" class="small">Translation : origine de r exprimée dans w.</text>
 </svg>
 <MathLine :formula="String.raw`p^w=R_r^w\,p^r+t_r^w`"/>
 <SSLControls/>
</template>
<style scoped>.pose-frames{height:280px}</style>
