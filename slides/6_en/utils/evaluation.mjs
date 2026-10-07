// Fixed teaching records and curves; no experiments or networks are run here.
export const labelCounts=[10,50,100,250,500,1000]
export const baselineStyles=[
 {key:'random',name:'Random initialization',color:'#475569'},
 {key:'supervised',name:'Supervised pretraining',color:'#F15A22'},
 {key:'self',name:'Self-supervised pretraining',color:'#25B34B'}
]
export const labelScores={
 'self-ahead':{random:[.42,.48,.56,.66,.75,.82],supervised:[.58,.66,.71,.77,.81,.85],self:[.62,.70,.75,.80,.84,.86]},
 'supervised-ahead':{random:[.42,.48,.56,.66,.75,.82],supervised:[.65,.74,.79,.83,.87,.89],self:[.58,.65,.70,.76,.81,.85]}
}
export const labelX=n=>80+650*(Math.log10(n)-1)/2
export const scoreY=s=>235-190*s
export const scorePath=values=>values.map((v,i)=>[labelX(labelCounts[i]),scoreY(v)].join(',')).join(' ')
export const runs=[
 {id:'A',environment:'Hall'},{id:'B',environment:'Hall'},
 {id:'C',environment:'Lab'},{id:'D',environment:'Lab'},
 {id:'E',environment:'Warehouse'},{id:'F',environment:'Warehouse'}
]
const frameRoles=['train','train','test','validation','train','test','train','validation']
export function assignedFrames(mode){
 return runs.flatMap((run,k)=>Array.from({length:8},(_,t)=>({
  ...run,t,role:mode==='frame'?frameRoles[t]:mode==='trajectory'?(k<4?k%2===0?'train':'test':'validation'):['train','validation','test'][Math.floor(k/2)]
 })))
}
export function splitDiagnostics(frames){
 const overlap=key=>{
  const train=new Set(frames.filter(f=>f.role==='train').map(f=>f[key]))
  return [...new Set(frames.filter(f=>f.role==='test').map(f=>f[key]))].filter(g=>train.has(g))
 }
 let adjacent=0
 for(const f of frames){
  const next=frames.find(g=>g.id===f.id&&g.t===f.t+1)
  if(next&&((f.role==='train'&&next.role==='test')||(f.role==='test'&&next.role==='train')))adjacent++
 }
 return {adjacent,trajectories:overlap('id'),environments:overlap('environment')}
}
export const depthReference=[2,4,6]
const median=a=>{const b=[...a].sort((x,y)=>x-y),n=b.length;return n%2?b[(n-1)/2]:(b[n/2-1]+b[n/2])/2}
export function absRel(reference,prediction){
 if(!reference.length||reference.length!==prediction.length||reference.some(d=>!(d>0))||prediction.some(d=>!(d>0)))throw new RangeError('Depth comparison requires equal nonempty positive samples')
 return reference.reduce((s,d,i)=>s+Math.abs(d-prediction[i])/d,0)/reference.length
}
export function depthEvaluation(scale=1,align=false){
 if(!(scale>0))throw new RangeError('Positive prediction scale required')
 const raw=[1,2,3].map(d=>d*scale),ratio=align?median(depthReference)/median(raw):1,prediction=raw.map(d=>d*ratio)
 return {raw,prediction,ratio,error:absRel(depthReference,prediction)}
}
export const shortcutLoss=[1.2,.8,.5,.3,.18]
export const shortcutScore=[.60,.60,.59,.61,.60]
