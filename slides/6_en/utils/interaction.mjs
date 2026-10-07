// Synthetic outcomes for one teaching run, not terrain-class physics or a paper benchmark.
export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x))
export const speeds=[.9,.8,.35,.25,.6]
export const commandedSpeed=1
export const terrainBands=[
 {name:'Grass',near:.2,far:1.1,color:'#d7e9ca'},
 {name:'Gravel',near:1.1,far:1.9,color:'#e0ddd6'},
 {name:'Mud',near:1.9,far:4.3,color:'#e7cbb4'}
]
export function measuredCost(commanded,measured){
 if(!(commanded>0))throw new RangeError('The teaching ratio requires positive commanded speed')
 return clamp(1-measured/commanded)
}
export const positions=[0]
for(const v of speeds)positions.push(positions.at(-1)+v)
export function poseAt(time){
 const t=clamp(time,0,5),k=Math.min(4,Math.floor(t)),f=t-k
 return [0,positions[k]+f*(positions[k+1]-positions[k]),0]
}
export const measurements=speeds.map((v,i)=>({
 time:i+1,poseTime:i+.5,commanded:commandedSpeed,measured:v,cost:measuredCost(commandedSpeed,v)
}))
// Earlier camera mounted at the t=0 robot origin, +X right/+Y down/+Z forward, pitched 50°.
export const cameraPitch=50*Math.PI/180
export const cameraPosition=[0,0,1.2]
export const cameraIntrinsics={fx:90,fy:90,cx:180,cy:100,width:360,height:180}
export function projectGround([x,y,z=0]){
 const s=Math.sin(cameraPitch),c=Math.cos(cameraPitch),h=z-cameraPosition[2]
 const pc=[x,-s*y-c*h,c*y-s*h]
 const K=cameraIntrinsics
 return {pc,uv:[K.fx*pc[0]/pc[2]+K.cx,K.fy*pc[1]/pc[2]+K.cy],valid:pc[2]>0}
}
export function footprintAt(time){
 const [x,y]=poseAt(time)
 return [[x-.24,y-.16,0],[x+.24,y-.16,0],[x+.24,y+.16,0],[x-.24,y+.16,0]]
}
export function projectedFootprint(measurement,offset=0){
 const corners=footprintAt(measurement.poseTime+offset)
 return {corners,uv:corners.map(p=>projectGround(p).uv),center:projectGround(poseAt(measurement.poseTime+offset)).uv}
}
export const availableMeasurements=time=>measurements.filter(m=>m.time<=time+1e-10)
export const polygonText=points=>points.map(p=>p.join(',')).join(' ')
export const groundBandPolygon=band=>[[-1.4,band.near,0],[1.4,band.near,0],[1.4,band.far,0],[-1.4,band.far,0]]
export const observedColor=cost=>cost<=.3?'#25B34B':'#F15A22'
export function updateLocalEstimates(estimates,time,eta=.2){
 const available=availableMeasurements(time)
 return estimates.map((p,i)=>i<available.length?p-eta*2*(p-available[i].cost):p)
}
export function localLoss(estimates,time){
 const samples=availableMeasurements(time)
 return samples.length?samples.reduce((s,m,i)=>s+(estimates[i]-m.cost)**2,0)/samples.length:null
}
export function terrainState(mode,stage){
 const t=mode==='measure'?[0,2,5][Math.min(stage,2)]:mode==='delay'?[0,3,5][Math.min(stage,2)]:mode==='project'?stage===0?3:5:5
 return {time:t,offset:mode==='project'&&stage===2?1:0,estimates:Array(5).fill(.5)}
}
export const platformTrials={
 grass:{wheels:.8,tracks:.92},gravel:{wheels:.65,tracks:.9},mud:{wheels:.25,tracks:.65}
}
// Scripted hinge-constrained motion, not a force simulation. Inward commands hit the closed stop.
export function actionDirection(degrees){
 const r=degrees*Math.PI/180
 return [Math.sin(r),-Math.cos(r),0]
}
export function cabinetOutcome({contact=.85,direction=0,locked=false}={}){
 const opening=locked?0:clamp(contact/.85*Math.cos(direction*Math.PI/180))
 const angle=55*opening
 return {angle,target:angle>=30?1:0}
}
export function doorPoint(distance,z,angle=0){
 const a=angle*Math.PI/180
 return [distance*Math.cos(a),-distance*Math.sin(a),z]
}
export function drawCabinet([x,y,z]){
 return [55+160*x-65*y,225-45*y-150*z]
}
export function cabinetPrediction(contact,direction){
 const logit=-1+3*(contact/.85)*Math.cos(direction*Math.PI/180)
 return {logit,probability:1/(1+Math.exp(-logit))}
}
export function binaryTarget(measuredAngle,threshold=30){return measuredAngle>=threshold?1:0}
export function binaryLoss(logit,target){
 if(target!==0&&target!==1)throw new RangeError('Binary target must be 0 or 1')
 return Math.max(logit,0)-logit*target+Math.log1p(Math.exp(-Math.abs(logit)))
}
export function cabinetState(mode,stage){
 return {direction:mode==='execute'&&stage>=3||mode==='predict'&&stage>=2?180:mode==='affordance'&&stage>=1?stage>=2?180:90:0,contact:.85,progress:mode==='execute'?stage>=2?1:stage===1?.55:0:0}
}
