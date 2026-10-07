export const sampleColors=['#b75b1e','#8a3b92','#177e9c']
export const initialAngles=[0,32,66,98,198,237]
export const motionStart=[0,74,35,122,199,270]
export const motionEnd=[0,8,115,123,237,245]
export const lerp=(a,b,t)=>t===0?a:t===1?b:a+(b-a)*t
export const directions=angles=>angles.map(a=>[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)])
export function softmax(logits,temperature=1){
  if(!(temperature>0))throw new Error('Temperature must be positive')
  const scores=logits.map(v=>v/temperature),max=Math.max(...scores),weights=scores.map(v=>Math.exp(v-max)),sum=weights.reduce((a,b)=>a+b,0)
  return weights.map(v=>v/sum)
}
export function cosine(a,b){
  const norm=Math.hypot(...a)*Math.hypot(...b)
  if(!norm)throw new Error('Cosine similarity requires nonzero vectors')
  return a.reduce((s,v,k)=>s+v*b[k],0)/norm
}
export function contrastiveStats(vectors,anchor=0,temperature=.5){
  const positive=anchor^1,indices=vectors.map((_,k)=>k).filter(k=>k!==anchor)
  const similarities=indices.map(k=>cosine(vectors[anchor],vectors[k]))
  const probabilities=softmax(similarities,temperature)
  const candidates=indices.map((index,k)=>({index,positive:index===positive,similarity:similarities[k],probability:probabilities[k]}))
  return {anchor,positive,candidates,loss:-Math.log(probabilities[indices.indexOf(positive)])}
}
export const motionVectors=t=>directions(motionStart.map((a,k)=>lerp(a,motionEnd[k],t)))
export const meanContrastiveLoss=(vectors,tau=.5)=>vectors.reduce((s,_,k)=>s+contrastiveStats(vectors,k,tau).loss,0)/vectors.length
export function augmentedViews(seed=1){
  let s=seed>>>0
  const random=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/2**32}
  return Array.from({length:6},(_,k)=>({sample:Math.floor(k/2),view:k%2+1,brightness:.6+.5*random(),crop:Math.floor(3+10*random())}))
}
export const agreementStart=[[-1.2,-.7],[-.9,-.4],[.1,1.1],[.3,.8],[1.1,-.2],[.8,-.1]]
export const agreementCloud=t=>agreementStart.map(p=>p.map((v,k)=>lerp(v,[.2,.15][k],t)))
export const agreementLoss=points=>[0,2,4].reduce((s,k)=>s+points[k].reduce((v,x,e)=>v+(x-points[k+1][e])**2,0),0)/3
export const dimensionClouds=[
  Array.from({length:6},()=>[.2,.15]),
  [-1.2,-.7,-.2,.2,.7,1.2].map(v=>[v,v]),
  [[-1.2,-.7],[-.9,.5],[-.15,1.1],[.3,-1.1],[1.05,-.2],[.8,.85]],
]
export function covariance(points){
  const n=points.length,d=points[0].length,mean=Array.from({length:d},(_,e)=>points.reduce((s,p)=>s+p[e],0)/n)
  const matrix=Array.from({length:d},(_,e)=>Array.from({length:d},(_,f)=>points.reduce((s,p)=>s+(p[e]-mean[e])*(p[f]-mean[f]),0)/(n-1)))
  return {mean,matrix,std:matrix.map((row,e)=>Math.sqrt(row[e]))}
}
const vicA=[[-.22,-.18],[.02,.06],[.25,.27]],vicB=vicA.map(p=>[p[0]+.1,p[1]-.07])
const paired=vicA.map((p,i)=>p.map((v,e)=>(v+vicB[i][e])/2))
const pairedStats=covariance(paired)
const expanded=paired.map(p=>p.map((v,e)=>(v-pairedStats.mean[e])/pairedStats.std[e]*1.2))
const decorrelated=[[-1.2,1.2/Math.sqrt(3)],[0,-2.4/Math.sqrt(3)],[1.2,1.2/Math.sqrt(3)]]
export const vicregClouds=[[vicA,vicB],[paired,paired],[expanded,expanded],[decorrelated,decorrelated]]
export function vicregCloud(stage,blend=1){
  const prev=vicregClouds[Math.max(0,stage-1)],next=vicregClouds[stage]
  return next.map((branch,b)=>branch.map((p,i)=>p.map((v,e)=>lerp(prev[b][i][e],v,blend))))
}
export function vicregTerms(a,b){
  const stats=[covariance(a),covariance(b)],d=a[0].length
  const invariance=a.reduce((s,p,i)=>s+p.reduce((r,v,e)=>r+(v-b[i][e])**2,0),0)/a.length
  const variance=stats.reduce((s,c)=>s+c.std.reduce((r,std)=>r+Math.max(0,1-Math.sqrt(std**2+.0001)),0)/d,0)
  const covarianceTerm=stats.reduce((s,c)=>s+c.matrix.reduce((r,row,e)=>r+row.reduce((q,v,f)=>q+(e===f?0:v**2),0),0)/d,0)
  return {invariance,variance,covariance:covarianceTerm,total:25*invariance+25*variance+covarianceTerm,stats}
}
