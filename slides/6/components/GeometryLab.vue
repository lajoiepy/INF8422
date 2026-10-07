<script setup lang="ts">
import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from '../utils/usePlayback'
import {intrinsics,sourcePose,observedTarget,observedSource,flatTarget,flatSource,renderObservation,pixelReconstruction,visibility,project,fromWorld,add} from '../utils/geometry.mjs'
const props=withDefaults(defineProps<{mode?:'intro'|'projection'|'depth'|'pose'|'sampling'|'scale'|'motion'|'occlusion'|'flat';stage?:number}>(),{mode:'depth',stage:0})
const nav=useNav(),u=ref(60),v=ref(20),depth=ref(3.5),baseline=ref(.55),yawDegrees=ref(0),factor=ref(1),motion=ref(0),projectionCase=ref('normal'),stepIndex=ref(0)
function reset(){u.value=props.mode==='motion'?48:props.mode==='occlusion'?31:60;v.value=20;depth.value=['projection','pose','scale','occlusion'].includes(props.mode)?5:3.5;if(props.mode==='depth'&&props.stage>=1)depth.value=5;if(props.mode==='motion')depth.value=3;baseline.value=props.mode==='pose'&&props.stage===0?.3:.55;yawDegrees.value=0;factor.value=props.mode==='scale'&&props.stage>=1?2:1;motion.value=props.mode==='motion'?(props.stage===0?0:props.stage===1?.45:.8):0;projectionCase.value='normal';stepIndex.value=0}
reset()
const sweep=[3.5,4,4.5,5,5.5,6,5.5,5,4.5,4,3.5]
const advance=()=>{if(stepIndex.value>=10)stepIndex.value=0;stepIndex.value++;if(props.mode==='depth')depth.value=sweep[stepIndex.value];if(props.mode==='pose')baseline.value=.55+.25*Math.sin(stepIndex.value*Math.PI/5);if(props.mode==='scale')factor.value=.5+stepIndex.value*.15;if(props.mode==='motion')motion.value=stepIndex.value*.08;return stepIndex.value<10}
const {playing}=usePlayback(advance,reset,350)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const settings=computed(()=>{
 if(nav.isPrintMode.value)return {u:props.mode==='motion'?48:props.mode==='occlusion'?31:60,v:20,depth:props.mode==='depth'&&props.stage>=1?5:['projection','pose','scale','occlusion'].includes(props.mode)?5:props.mode==='motion'?3:3.5,baseline:props.mode==='pose'&&props.stage===0?.3:.55,yaw:0,scaleFactor:props.mode==='scale'&&props.stage>=1?2:1,motion:props.mode==='motion'?(props.stage===0?0:props.stage===1?.45:.8):0}
 return {u:u.value,v:v.value,depth:depth.value,baseline:projectionCase.value==='outside'?4:baseline.value,yaw:(projectionCase.value==='behind'?180:yawDegrees.value)*Math.PI/180,scaleFactor:factor.value,motion:motion.value}
})
const target=computed(()=>props.mode==='flat'?flatTarget:observedTarget)
const source=computed(()=>props.mode==='flat'?flatSource:props.mode==='motion'?renderObservation(sourcePose,{objectShift:settings.value.motion}):observedSource)
const reconstruction=computed(()=>pixelReconstruction({...settings.value,source:source.value,target:target.value}))
const actualPoint=computed(()=>target.value.points[settings.value.v*intrinsics.width+settings.value.u])
const sourcePoint=computed(()=>props.mode==='motion'?add(actualPoint.value,[settings.value.motion,0,0]):actualPoint.value)
const correspondence=computed(()=>project(fromWorld(sourcePoint.value,sourcePose)))
const observedVisibility=computed(()=>visibility(actualPoint.value,sourcePose))
const fmt=(p:number[]|null)=>p?`[${p.map(x=>x.toFixed(2)).join(', ')}]`:'—'
const rgb=(p:number[])=>`rgb(${p.map(x=>Math.round(x*255)).join(',')})`
const checksum=(image:any)=>image.pixels.reduce((s:number,p:number[],k:number)=>s+p.reduce((n,v,e)=>n+v*(e+1),0)*(k+1),0).toFixed(6)
const formula=computed(()=>{
 if(props.mode==='projection')return props.stage===0?String.raw`\mathbf u=\pi(K_t p^{c_t})`:String.raw`K_t=\begin{bmatrix}f_x&0&c_x\\0&f_y&c_y\\0&0&1\end{bmatrix}`
 if(props.mode==='depth')return String.raw`\widehat p^{c_t}=\widehat D_t(\mathbf u)K_t^{-1}\widetilde{\mathbf u}`
 if(props.mode==='pose')return String.raw`\widehat p^{c_s}=\widehat R_{c_t}^{c_s}\widehat p^{c_t}+\widehat t_{c_t}^{c_s}`
 if(props.mode==='sampling')return props.stage===0?String.raw`\mathbf u_s=\pi(K_s\widehat p^{c_s})`:props.stage===1?String.raw`\widehat I_t(\mathbf u)=\operatorname{sample}(I_s,\mathbf u_s)`:String.raw`\widehat Z_s>0\qquad0\le u_s\le79\quad0\le v_s\le47`
 if(props.mode==='scale')return String.raw`\pi(K_s\,\kappa\widehat p^{c_s})=\pi(K_s\widehat p^{c_s}),\qquad\kappa>0`
 if(props.mode==='flat')return String.raw`I_t(\mathbf u)=\widehat I_t(\mathbf u)\quad\text{pour plusieurs profondeurs}`
 return ''
})
const numerical=computed(()=>{
 if(props.mode==='projection')return `fx = fy = 68 · cx = 39.5 · cy = 23.5 · X droite, Y bas, Z avant`
 if(props.mode==='pose')return `p̂ dans cₜ : ${fmt(reconstruction.value.pt)} · p̂ dans cₛ : ${fmt(reconstruction.value.ps)}`
 if(props.mode==='occlusion')return `Zₛ = ${reconstruction.value.ps[2].toFixed(2)} > 0 · uₛ = ${fmt(reconstruction.value.uv)} · ${observedVisibility.value.occluded?'le rayon source atteint d’abord l’avant-plan':'surface visible'}`
 if(props.mode==='motion')return `Reprojection rigide uₛ = ${fmt(reconstruction.value.uv)} · point mobile uₛ = ${fmt(correspondence.value.uv)}`
 return `D̂ = ${(settings.value.depth*settings.value.scaleFactor).toFixed(2)} · p̂ dans cₜ : ${fmt(reconstruction.value.pt)} · uₛ = ${fmt(reconstruction.value.uv)}`
})
const colorVisible=computed(()=>['sampling','scale','motion','occlusion','flat'].includes(props.mode))
const captions=computed(()=>({intro:'L’image enregistrée fournit la cible; profondeur et pose sont prédites.',projection:props.stage===0?'Coordonnées image : u vers la droite; v vers le bas.':'La profondeur est Z optique, distinct de la distance sur un rayon unitaire.',depth:'L’estimation de profondeur déplace le point sur un rayon cible fixe.',pose:'La pose estimée modifie les coordonnées et l’échantillonnage; les observations restent fixes.',sampling:reconstruction.value.valid?'L’interpolation bilinéaire combine les pixels sources voisins enregistrés.':`${({"Behind source camera":"Derrière la caméra source","Outside source image":"Hors image source","In bounds":"Dans l’image"})[reconstruction.value.reason]||reconstruction.value.reason}: aucun échantillon source ni perte de pixel.`,scale:'Mettre profondeur et translation relative à l’échelle ensemble; les pixels restent fixes.',motion:props.stage===0?'Une transformation caméra unique explique cette scène statique.':'L’objet mobile viole la scène statique; sa reprojection rigide est incohérente.',occlusion:props.stage<1?'La caméra cible voit le fond.':'Une projection positive dans l’image peut encore être occultée.',flat:'Une apparence uniforme donne la même couleur à des projections différentes.'}[props.mode]))
</script>
<template>
 <div class="geometry-lab" :data-mode="mode" :data-stage="stage" :data-depth="settings.depth*settings.scaleFactor" :data-baseline="settings.baseline*settings.scaleFactor" :data-yaw="settings.yaw" :data-scale="settings.scaleFactor" :data-u="settings.u" :data-v="settings.v" :data-pt="JSON.stringify(reconstruction.pt)" :data-ps="JSON.stringify(reconstruction.ps)" :data-uv="JSON.stringify(reconstruction.uv)" :data-valid="reconstruction.valid" :data-reason="reconstruction.reason" :data-error="reconstruction.error" :data-target-checksum="checksum(target)" :data-source-checksum="checksum(source)" :data-motion="settings.motion" :data-occluded="observedVisibility.occluded" :data-step="stepIndex">
  <div class="geometry-main"><CameraScene :point="mode==='intro'&&stage===0?null:reconstruction.pt" :actual-point="mode==='projection'?actualPoint:null" :estimate="reconstruction.estimate" :show-source="mode!=='intro'&&mode!=='projection'&&(mode!=='occlusion'||stage>=1)" :blocked="mode==='occlusion'&&stage>=1?observedVisibility.hit?.p:null" :object-shift="settings.motion" :source-point="mode==='motion'?sourcePoint:null" :flat="mode==='flat'"/><div class="geometry-images"><div class="geometry-image-pair"><GeoImage :image="target" kind="target" label="Cible enregistrée Iₜ · u→, v↓" :point="[settings.u,settings.v]" :selectable="!nav.isPrintMode.value&&mode!=='motion'&&mode!=='occlusion'&&mode!=='scale'" @select="([x,y])=>{u=x;v=y}"/><GeoImage :image="source" kind="source" :label="mode==='motion'?`Source enregistrée Iₛ · ${settings.motion?'objet mobile':'objet statique'}`:'Source enregistrée Iₛ'" :point="reconstruction.valid?reconstruction.uv:null" :alternative="mode==='motion'&&stage>=1?correspondence.uv:null" :neighborhood="mode==='sampling'&&stage>=1"/></div>
   <div v-if="colorVisible" class="geometry-color"><span><i :style="{background:rgb(reconstruction.original)}"/>Cible</span><span v-if="reconstruction.sample"><i :style="{background:rgb(reconstruction.sample.color)}"/>Échantillonné</span><strong>{{reconstruction.error===null?'Échantillon invalide':`RVB L1 = ${reconstruction.error.toFixed(4)}`}}</strong></div>
   <template v-if="mode==='sampling'&&stage>=1&&reconstruction.sample"><div class="geometry-image-note">Voisins bilinéaires · poids</div><div class="sampling-weights"><span v-for="(w,j) in reconstruction.sample.weights" :key="j"><i :style="{background:rgb(reconstruction.sample.colors[j])}"/>{{w.toFixed(2)}}</span></div></template>
   <div v-else class="geometry-image-note">{{mode==='motion'&&stage>=1?'Rouge : rigide · vert : point mobile réel':'Le marqueur source suit la projection calculée.'}}</div>
  </div></div>
  <MathLine v-if="formula" :formula="formula" :small="mode==='pose'||mode==='sampling'&&stage>=2"/>
  <div class="geometry-readout">{{numerical}}</div><div class="geometry-caption">{{captions}}</div>
  <div v-if="!nav.isPrintMode.value&&['depth','pose','sampling','scale','motion','flat'].includes(mode)" class="ssl-parameter-controls lab-controls" @click.stop="($event.target as HTMLElement).closest('button')?.blur()">
   <label v-if="['depth','flat'].includes(mode)">Profondeur estimée <input aria-label="Profondeur estimée" type="range" min="2" max="6" step=".1" v-model.number="depth"/>{{depth.toFixed(1)}}</label>
   <template v-if="mode==='pose'"><label>x caméra <input aria-label="Estimation de x caméra" type="range" min=".1" max="1.1" step=".05" v-model.number="baseline"/>{{baseline.toFixed(2)}}</label><label>Lacet <input aria-label="Lacet estimé" type="range" min="-10" max="10" step="1" v-model.number="yawDegrees"/>{{yawDegrees}}°</label></template>
   <label v-if="mode==='scale'">Échelle commune κ <input aria-label="Échelle commune" type="range" min=".5" max="2" step=".1" v-model.number="factor"/>{{factor.toFixed(1)}}</label>
   <label v-if="mode==='motion'">Déplacement de l’objet <input aria-label="Déplacement de l’objet" type="range" min="0" max=".8" step=".05" v-model.number="motion"/>{{motion.toFixed(2)}}</label>
   <label v-if="mode==='sampling'">Exemple de projection <select aria-label="Exemple de projection" v-model="projectionCase" @change="($event.target as HTMLElement).blur()"><option value="normal">Dans l’image</option><option value="outside">Hors image</option><option value="behind">Derrière la caméra</option></select></label>
   <template v-if="['depth','pose','scale','motion'].includes(mode)"><button aria-label="Avancer l’estimation" @click="playing=false;advance()">Avancer</button><button class="primary" :aria-label="playing?'Pause':'Animer les estimations'" @click="playing=!playing">{{playing?'Pause':'Animer'}}</button></template><button aria-label="Réinitialiser la scène" @click="playing=false;reset()">Réinitialiser</button>
  </div>
  <SSLControls/><div class="ssl-disclosure">Géométrie et RVB synthétiques calculés · unités de scène · {{mode==='motion'?'le mouvement objet modifie la source enregistrée':'estimations variables; observations enregistrées fixes'}}</div>
 </div>
</template>
<style scoped>.geometry-main{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start}.geometry-images{padding-top:8px}.geometry-image-pair{display:grid;grid-template-columns:1fr 1fr;gap:15px}.geometry-color{display:flex;align-items:center;gap:12px;font-size:13px;margin:10px 0;flex-wrap:wrap}.geometry-color span,.sampling-weights span{display:inline-flex;align-items:center;gap:5px}.geometry-color i,.sampling-weights i{display:inline-block;width:19px;height:19px;border:1px solid #94a3b8}.sampling-weights{display:flex;gap:12px;font-size:13px}.geometry-image-note{font-size:12px;color:#64748b;margin:10px 0}.geometry-readout{background:#f3f9fb;border-left:3px solid #00BDF2;padding:7px 10px;font-size:15px;line-height:1.3;font-variant-numeric:tabular-nums}.geometry-caption{font-size:16px;margin:9px 0;line-height:1.35}.geometry-lab .ssl-parameter-controls{margin:7px 0}.geometry-lab .ssl-disclosure{margin:6px 0}.geometry-lab input[type=range]{width:90px}</style>
