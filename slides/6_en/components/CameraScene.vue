<script setup lang="ts">
import {computed} from 'vue'
import {targetPose,sourcePose,toWorld,ray,scale,add,matVec} from '../utils/geometry.mjs'
const props=withDefaults(defineProps<{point?:number[]|null;actualPoint?:number[]|null;estimate?:any;showRay?:boolean;showSource?:boolean;blocked?:number[]|null;objectShift?:number;flat?:boolean;sourcePoint?:number[]|null;pointLabelText?:string}>(),{point:null,actualPoint:null,estimate:null,showRay:true,showSource:false,blocked:null,objectShift:0,flat:false,sourcePoint:null,pointLabelText:""})
const screen=(p:number[])=>[145+33*p[0]+15*p[2],198+27*p[1]-15*p[2]]
const xy=(p:number[])=>screen(p).join(',')
const line=(a:number[],b:number[])=>`M${xy(a)}L${xy(b)}`
const wall=[[-2.8,-1.5,5],[2.8,-1.5,5],[2.8,1.5,5],[-2.8,1.5,5]]
const panel=(shift=0)=>[[-.25+shift,-.55,3],[.75+shift,-.55,3],[.75+shift,.65,3],[-.25+shift,.65,3]]
const actualSource=computed(()=>sourcePose)
const cameras=computed(()=>[{pose:targetPose,color:'#007da8',name:'Recorded cₜ'},{pose:actualSource.value,color:'#b3470f',name:'Recorded cₛ'}])
const frustum=(pose:any)=>[[0,0],[79,0],[79,47],[0,47]].map(([u,v])=>toWorld(scale(ray(u,v),.9),pose))
const estimateDifferent=computed(()=>props.estimate&&JSON.stringify(props.estimate)!==JSON.stringify(sourcePose))
const onSurface=computed(()=>props.point&&props.actualPoint&&props.point.every((v,j)=>Math.abs(v-props.actualPoint![j])<1e-7))
const pointLabel=computed(()=>{
 if(!props.point)return {x:0,y:0,anchor:'start'}
 const [x,y]=screen(props.point)
 if(props.objectShift)return {x:x-12,y:y-18,anchor:'end'}
 if(y<60)return {x:Math.min(410,x-8),y:y-12,anchor:'end'}
 return {x:Math.min(310,x+8),y:y-12,anchor:'start'}
})
</script>
<template>
 <svg class="camera-scene" viewBox="0 0 430 245" role="img" aria-label="Fixed three-dimensional synthetic scene with two camera poses and rays computed from the pinhole model">
  <text x="10" y="17" class="scene-title">Synthetic 3D scene · fixed view</text>
  <polygon :points="wall.map(xy).join(' ')" :fill="flat?'#c9d2d9':'#e8edf2'" stroke="#94a3b8" stroke-width="1"/>
  <g v-if="!flat"><path v-for="x in [-2,-1,0,1,2]" :d="line([x,-1.5,5],[x,1.5,5])" stroke="#c2ced8"/><path v-for="y in [-1,0,1]" :d="line([-2.8,y,5],[2.8,y,5])" stroke="#c2ced8"/><polygon :points="panel().map(xy).join(' ')" fill="#f8cead" stroke="#b3470f" stroke-width="1.5"/></g>
  <polygon v-if="objectShift" :points="panel(objectShift).map(xy).join(' ')" fill="#fff4ee" fill-opacity=".35" stroke="#CF1C24" stroke-dasharray="4 3" stroke-width="1.5"/>
  <text x="315" y="151" class="small">Background</text><text v-if="!flat" x="227" y="188" class="small">Foreground</text>
  <g v-for="(camera,c) in cameras" :key="c"><path v-for="corner in frustum(camera.pose)" :d="line(camera.pose.t,corner)" :stroke="camera.color" stroke-width="1" opacity=".7"/><polygon :points="frustum(camera.pose).map(xy).join(' ')" fill="none" :stroke="camera.color" stroke-width="1"/><circle :cx="screen(camera.pose.t)[0]" :cy="screen(camera.pose.t)[1]" r="3.5" :fill="camera.color"/><text :x="screen(camera.pose.t)[0]+(c===0?-7:7)" y="230" :text-anchor="c===0?'end':'start'" class="camera-label" :style="`fill:${camera.color}`">{{camera.name}}</text></g>
  <g v-if="estimateDifferent"><path v-for="corner in frustum(estimate)" :d="line(estimate.t,corner)" stroke="#7c3d8d" stroke-dasharray="2 3" stroke-width="1"/><polygon :points="frustum(estimate).map(xy).join(' ')" fill="none" stroke="#7c3d8d" stroke-dasharray="2 3"/><circle :cx="screen(estimate.t)[0]" :cy="screen(estimate.t)[1]" r="4" fill="white" stroke="#7c3d8d" stroke-dasharray="2 2"/><path :d="line(sourcePose.t,estimate.t)" stroke="#7c3d8d" stroke-dasharray="2 3"/><text x="310" y="214" class="small" style="fill:#7c3d8d">Pose estimate</text></g>
  <path v-if="point&&showRay" :d="line(targetPose.t,point)" stroke="#007da8" stroke-width="1.6"/>
  <path v-if="point&&showSource" :d="line(estimate?.t||sourcePose.t,point)" stroke="#b3470f" stroke-width="1.6" stroke-dasharray="5 3"/>
  <g v-if="actualPoint&&!onSurface"><circle :cx="screen(actualPoint)[0]" :cy="screen(actualPoint)[1]" r="3.5" fill="#25B34B"/><text :x="screen(actualPoint)[0]+7" :y="screen(actualPoint)[1]+13" class="small">Surface</text></g>
  <g v-if="point"><circle :cx="screen(point)[0]" :cy="screen(point)[1]" r="4" fill="#CF1C24"/><text :x="pointLabel.x" :y="pointLabel.y" :text-anchor="pointLabel.anchor" class="small" style="fill:#a8161d">{{pointLabelText||(onSurface?'Point on surface':'Estimated point')}}</text></g>
  <circle v-if="blocked" :cx="screen(blocked)[0]" :cy="screen(blocked)[1]" r="5" fill="white" stroke="#CF1C24" stroke-width="2"/>
  <path v-if="sourcePoint&&point" :d="line(point,sourcePoint)" stroke="#25B34B" stroke-width="2" stroke-dasharray="3 3"/>
  <g transform="translate(25 177)"><path d="M0 0H31M0 0V31M0 0L17 -17" fill="none" stroke="#64748b" stroke-width="1.5"/><text x="35" y="4" class="axis-label">X</text><text x="-4" y="44" class="axis-label">Y</text><text x="20" y="-21" class="axis-label">Z</text><text x="-1" y="-9" class="axis-label">w</text></g>
 </svg>
</template>
<style scoped>.camera-scene{display:block;width:100%;height:235px}.camera-scene text{font-family:'Avenir Next','Nunito Sans',sans-serif;fill:#334155;font-size:14px}.camera-scene .small{font-size:12px}.camera-scene .scene-title{font-size:14px;font-weight:600}.camera-scene .camera-label{font-size:13px}.camera-scene .axis-label{font-size:11px}</style>
