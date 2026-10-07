// Camera convention: +X right, +Y down, +Z forward. Depth is optical-axis Z.
export const intrinsics={width:80,height:48,fx:68,fy:68,cx:39.5,cy:23.5}
export const identity=[[1,0,0],[0,1,0],[0,0,1]]
export const targetPose={R:identity,t:[0,0,0]}
export const sourcePose={R:identity,t:[.55,0,0]}
export const add=(a,b)=>a.map((v,i)=>v+b[i])
export const subtract=(a,b)=>a.map((v,i)=>v-b[i])
export const scale=(a,s)=>a.map(v=>v*s)
export const transpose=A=>A[0].map((_,j)=>A.map(row=>row[j]))
export const matVec=(A,p)=>A.map(row=>row.reduce((s,v,i)=>s+v*p[i],0))
export const matMul=(A,B)=>A.map(row=>B[0].map((_,j)=>row.reduce((s,v,k)=>s+v*B[k][j],0)))
export function yawRotation(angle){const c=Math.cos(angle),s=Math.sin(angle);return [[c,0,s],[0,1,0],[-s,0,c]]}
export function toWorld(p,pose){return add(matVec(pose.R,p),pose.t)}
export function fromWorld(p,pose){return matVec(transpose(pose.R),subtract(p,pose.t))}
export function relativePose(from,to){const inverse=transpose(to.R);return {R:matMul(inverse,from.R),t:matVec(inverse,subtract(from.t,to.t))}}
export function transform(p,pose){return add(matVec(pose.R,p),pose.t)}
export function ray(u,v,K=intrinsics){return [(u-K.cx)/K.fx,(v-K.cy)/K.fy,1]}
export function backProject(u,v,depth,K=intrinsics){return scale(ray(u,v,K),depth)}
export function project(p,K=intrinsics){
 if(p[2]<=0)return {valid:false,reason:'Behind source camera',uv:null}
 const uv=[K.fx*p[0]/p[2]+K.cx,K.fy*p[1]/p[2]+K.cy]
 const epsilon=1e-9
 const valid=uv[0]>=-epsilon&&uv[0]<=K.width-1+epsilon&&uv[1]>=-epsilon&&uv[1]<=K.height-1+epsilon
 if(valid){uv[0]=Math.min(K.width-1,Math.max(0,uv[0]));uv[1]=Math.min(K.height-1,Math.max(0,uv[1]))}
 return {uv,valid,reason:valid?'In bounds':'Outside source image'}
}
export function warpPoint(u,v,depth,estimatedSource=sourcePose,K=intrinsics){
 const pt=backProject(u,v,depth,K),relative=relativePose(targetPose,estimatedSource),ps=transform(pt,relative)
 return {pt,ps,relative,...project(ps,K)}
}
const clamp=x=>Math.min(1,Math.max(0,x))
function backgroundColor(p,flat=false){
 if(flat)return [.68,.73,.78]
 const [x,y]=p
 return [.18+.42*(1+Math.sin(x*2.1+y*.3))/2,.22+.42*(1+Math.sin(y*3.2-x*.4))/2,.3+.42*(1+Math.cos(x*1.6-y*1.5))/2]
}
function panelColor(p,shift){const x=p[0]-shift,y=p[1];return [.8+.12*Math.sin(6*x),.31+.12*Math.cos(5*y),.12+.08*Math.sin(4*x+3*y)].map(clamp)}
export function intersectScene(origin,direction,{objectShift=0,flat=false}={}){
 const candidates=[]
 if(direction[2]<=0)return null
 if(!flat){
  const distance=(3-origin[2])/direction[2],p=add(origin,scale(direction,distance))
  if(distance>0&&p[0]>=-.25+objectShift&&p[0]<=.75+objectShift&&p[1]>=-.55&&p[1]<=.65)candidates.push({p,surface:'panel',color:panelColor(p,objectShift),distance})
 }
 const distance=(5-origin[2])/direction[2]
 if(distance>0){const p=add(origin,scale(direction,distance));candidates.push({p,surface:'background',color:backgroundColor(p,flat),distance})}
 return candidates.sort((a,b)=>a.distance-b.distance)[0]||null
}
export function renderObservation(pose=targetPose,scenario={}){
 const pixels=[],depth=[],points=[],surfaces=[]
 for(let v=0;v<intrinsics.height;v++)for(let u=0;u<intrinsics.width;u++){
  const hit=intersectScene(pose.t,matVec(pose.R,ray(u,v)),scenario)
  pixels.push(hit?.color||[0,0,0]);depth.push(hit?fromWorld(hit.p,pose)[2]:0);points.push(hit?.p||null);surfaces.push(hit?.surface||'none')
 }
 return {...intrinsics,pixels,depth,points,surfaces}
}
export const observedTarget=renderObservation(targetPose)
export const observedSource=renderObservation(sourcePose)
export const flatTarget=renderObservation(targetPose,{flat:true})
export const flatSource=renderObservation(sourcePose,{flat:true})
export function bilinear(image,uv){
 if(!uv||uv[0]<0||uv[1]<0||uv[0]>image.width-1||uv[1]>image.height-1)return null
 const [u,v]=uv,x0=Math.floor(u),y0=Math.floor(v),x1=Math.min(x0+1,image.width-1),y1=Math.min(y0+1,image.height-1),a=u-x0,b=v-y0
 const cells=[[x0,y0],[x1,y0],[x0,y1],[x1,y1]],weights=[(1-a)*(1-b),a*(1-b),(1-a)*b,a*b],colors=cells.map(([x,y])=>image.pixels[y*image.width+x])
 const color=[0,1,2].map(e=>weights.reduce((s,w,i)=>s+w*colors[i][e],0))
 const du=[0,1,2].map(e=>(1-b)*(colors[1][e]-colors[0][e])+b*(colors[3][e]-colors[2][e]))
 return {cells,weights,colors,color,du}
}
export const colorError=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)
export function pixelReconstruction({u=60,v=20,depth=3.5,baseline=.55,yaw=0,scaleFactor=1,source=observedSource,target=observedTarget}={}){
 const estimate={R:yawRotation(yaw),t:[baseline*scaleFactor,0,0]},geometry=warpPoint(u,v,depth*scaleFactor,estimate),sample=geometry.valid?bilinear(source,geometry.uv):null,original=target.pixels[v*target.width+u]
 return {...geometry,sample,original,error:sample?colorError(original,sample.color):null,estimate}
}
export function visibility(point,pose=sourcePose,scenario={}){
 const p=fromWorld(point,pose),projection=project(p)
 if(!projection.valid)return {...projection,visible:false,occluded:false}
 const hit=intersectScene(pose.t,subtract(point,pose.t),scenario)
 const occluded=!!hit&&hit.distance<1-1e-7
 return {...projection,visible:!occluded,occluded,hit}
}
export function denseWarp(target=observedTarget,source=observedSource,{depthFactor=1,pose=sourcePose}={}){
 const pixels=[],errors=[],valid=[],occluded=[]
 for(let v=0;v<target.height;v++)for(let u=0;u<target.width;u++){
  const k=v*target.width+u,warp=warpPoint(u,v,target.depth[k]*depthFactor,pose),sample=warp.valid?bilinear(source,warp.uv):null
  valid.push(!!sample);pixels.push(sample?.color||[.83,.86,.89]);errors.push(sample?colorError(target.pixels[k],sample.color):null)
  occluded.push(visibility(target.points[k],pose).occluded)
 }
 const included=errors.filter(e=>e!==null),loss=included.reduce((s,v)=>s+v,0)/included.length
 return {...intrinsics,pixels,errors,valid,occluded,loss,count:included.length}
}
export function errorImage(warp){return {...intrinsics,pixels:warp.errors.map(e=>e===null?[.83,.86,.89]:[clamp(e*2),.08,.1]),valid:warp.valid}}
export const initialGeometryModel={depth:3.5,baseline:.55}
export function geometryLossGradient(model,{u=60,v=20}={}){
 const result=pixelReconstruction({...model,u,v})
 if(!result.sample)throw Error('Gradient example requires an in-bounds sample')
 const slope=result.sample.du.reduce((s,d,e)=>s+Math.sign(result.sample.color[e]-result.original[e])*d,0)
 return {loss:result.error,depth:slope*intrinsics.fx*model.baseline/model.depth**2,baseline:-slope*intrinsics.fx/model.depth,result}
}
export function geometryGradientStep(model,eta=.03){const g=geometryLossGradient(model),next={depth:model.depth-eta*g.depth,baseline:model.baseline-eta*g.baseline};return {next,gradient:g,lossBefore:g.loss,lossAfter:geometryLossGradient(next).loss}}
export function sourceSelection({stationary=false,u=31,v=20}={}){
 const target=observedTarget,k=v*intrinsics.width+u,depth=target.depth[k],poses=stationary?[targetPose,targetPose]:[{R:identity,t:[.55,0,0]},{R:identity,t:[-.55,0,0]}]
 const sources=poses.map(p=>renderObservation(p)),warps=poses.map((p,i)=>{const w=warpPoint(u,v,depth,p),s=bilinear(sources[i],w.uv);return {...w,sample:s,error:s?colorError(target.pixels[k],s.color):Infinity}})
 const identityErrors=sources.map(s=>colorError(target.pixels[k],s.pixels[k])),minimum=Math.min(...warps.map(w=>w.error)),identityMinimum=Math.min(...identityErrors)
 return {sources,poses,warps,identityErrors,minimum,identityMinimum,average:warps.reduce((s,w)=>s+w.error,0)/2,selected:warps[0].error<=warps[1].error?0:1,keep:minimum<identityMinimum,target:target.pixels[k]}
}
