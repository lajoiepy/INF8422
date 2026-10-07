import {observedTarget,observedSource,sourcePose,fromWorld,project,visibility,matVec,add,transpose} from './geometry.mjs'
export {observedTarget,observedSource}
export const queryExamples={panel:[48,20],background:[60,20],occluded:[31,20],outside:[3,20]}
export function geometricPair(u=48,v=20){
 const point=observedTarget.points[v*observedTarget.width+u],projection=project(fromWorld(point,sourcePose)),seen=visibility(point,sourcePose)
 const positive=projection.valid&&seen.visible?projection.uv:null,negative=[56,24],negativePoint=observedSource.points[negative[1]*observedSource.width+negative[0]]
 return {u,v,point,projection,visible:seen.visible,occluded:seen.occluded,hit:seen.hit,positive,rounded:positive?positive.map(Math.round):null,negative,negativePoint}
}
// Assign illustrative, world-consistent descriptors once; no neural network runs here.
// The inference function below accepts ONLY a query vector and descriptor arrays.
const clamp=x=>Math.max(0,Math.min(1,x))
export function illustrativeDescriptors(image){return image.points.map((p,k)=>[clamp(.5+.16*p[0]),clamp(.5+.24*p[1]),image.surfaces[k]==='panel'?.2:.8])}
export const targetDescriptors=illustrativeDescriptors(observedTarget),sourceDescriptors=illustrativeDescriptors(observedSource)
export const descriptorDistance=(a,b)=>Math.sqrt(a.reduce((s,v,k)=>s+(v-b[k])**2,0))
export function descriptorImage(image,vectors){return {width:image.width,height:image.height,pixels:vectors}}
export const targetDescriptorImage=descriptorImage(observedTarget,targetDescriptors),sourceDescriptorImage=descriptorImage(observedSource,sourceDescriptors)
export function nearestDescriptor(query,vectors,limit=vectors.length){
 let index=-1,distance=Infinity
 const count=Math.min(vectors.length,Math.max(0,limit))
 for(let k=0;k<count;k++){const d=descriptorDistance(query,vectors[k]);if(d<distance){distance=d;index=k}}
 return {index,distance,count}
}
export function descriptorSearch(u=48,v=20,limit=sourceDescriptors.length){
 const query=targetDescriptors[v*observedTarget.width+u],match=nearestDescriptor(query,sourceDescriptors,limit)
 return {...match,query,uv:match.index<0?null:[match.index%observedSource.width,Math.floor(match.index/observedSource.width)],vector:match.index<0?null:sourceDescriptors[match.index]}
}
export function distanceImage(query,limit=sourceDescriptors.length){return {width:80,height:48,pixels:sourceDescriptors.map((z,k)=>{if(k>=limit)return [.83,.86,.89];const d=Math.min(1,descriptorDistance(query,z)/.9);return [d,.08+.24*(1-d),.15+.65*(1-d)]})}}
export function trainingDistances(u=48,v=20){const pair=geometricPair(u,v),query=targetDescriptors[v*80+u],positive=pair.rounded?sourceDescriptors[pair.rounded[1]*80+pair.rounded[0]]:null,negative=sourceDescriptors[pair.negative[1]*80+pair.negative[0]];return {pair,query,positive,negative,positiveDistance:positive?descriptorDistance(query,positive):null,negativeDistance:descriptorDistance(query,negative)}}
export const interactionTimes=[0,1,2,3,4]
export function interactionState(time){const t=Math.max(0,Math.min(4,time));return {time:t,tilt:[0,35,65,65,0][t],fill:[0,.1,.45,.8,.8][t],stream:t>=1&&t<=3}}
const angle=Math.PI/5,c=Math.cos(angle),s=Math.sin(angle)
export const cloudPose={R:[[c,-s,0],[s,c,0],[0,0,1]],t:[.6,-.25,.3]}
export const cloudWorld=Array.from({length:36},(_,k)=>{const x=k%6,y=Math.floor(k/6);return [(x-2.5)*.36,(y-2.5)*.3,.25*Math.sin(x*.8)+.12*y]})
const cloudFeature=p=>[.5+p[0]*.25,.5+p[1]*.3,.2+p[2]*.5]
export const cloudA=cloudWorld.slice(0,28).map((p,id)=>({id,p,z:cloudFeature(p)}))
export const cloudB=cloudWorld.slice(8).map((p,k)=>({id:k+8,p:add(matVec(cloudPose.R,p),cloudPose.t),z:cloudFeature(p)}))
export function cloudMatch(id=14){const query=cloudA.find(p=>p.id===id);if(!query)return null;const best=nearestDescriptor(query.z,cloudB.map(p=>p.z));return {query,match:cloudB[best.index],...best}}
export function cloudToA(p){return matVec(transpose(cloudPose.R),p.map((v,k)=>v-cloudPose.t[k]))}
