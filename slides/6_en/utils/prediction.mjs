import pixels from './cameraPixels.json' with {type:'json'}

export const columns=12,rows=4,patchCount=columns*rows
export const patchMeans=pixels.map(p=>[0,1,2].map(c=>p.filter((_,i)=>i%3===c).reduce((s,v)=>s+v,0)/(p.length/3)/255))
const luminance=rgb=>.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]
export const patchSignals=patchMeans.map(luminance)
export const blocks=[{name:'A',color:'#007da8',indices:[14,15,26,27]},{name:'B',color:'#CF1C24',indices:[18,19,30,31]},{name:'C',color:'#8c6800',indices:[21,22,33,34]}]
export const targetUnion=[...new Set(blocks.flatMap(b=>b.indices))]
export const contextIndices=Array.from({length:patchCount},(_,k)=>k).filter(k=>!targetUnion.includes(k))
export function maskSets(pattern=0,ratio=.75){
  // A repeatable permutation of all 48 indices, not a semantic selection.
  const order=Array.from({length:patchCount},(_,k)=>(k*17+pattern*7)%patchCount)
  const hidden=order.slice(0,Math.round(patchCount*ratio)).sort((a,b)=>a-b)
  return {hidden,visible:order.filter(k=>!hidden.includes(k)).sort((a,b)=>a-b)}
}
export function pixelPrediction(visible,brightness=1){
  if(!visible.length)throw Error('A context must contain visible patches')
  return patchMeans.map((_,k)=>{
    const nearest=visible.reduce((best,j)=>{
      const distance=i=>Math.hypot(i%columns-k%columns,Math.floor(i/columns)-Math.floor(k/columns))
      return distance(j)<distance(best)?j:best
    },visible[0])
    return patchMeans[nearest].map(v=>Math.min(1,Math.max(0,v*brightness)))
  })
}
export function patchPixelError(k,prediction){return pixels[k].reduce((sum,value,j)=>sum+(value/255-prediction[j%3])**2,0)}
export function pixelStats(hidden,prediction){
  if(!hidden.length)throw Error('A loss must contain target patches')
  const errors=hidden.map(k=>patchPixelError(k,prediction[k]))
  return {errors,loss:errors.reduce((s,v)=>s+v,0)/hidden.length}
}
export const initialFeatureModel={theta:.8,psi:.7,targetTheta:1}
const mean=xs=>xs.reduce((s,v)=>s+v,0)/xs.length
export const contextSignal=mean(contextIndices.map(k=>patchSignals[k]))
export function featurePrediction(model,k){
  const u=(k%columns)/(columns-1),v=Math.floor(k/columns)/(rows-1)
  return [model.psi*model.theta*contextSignal+.2*u,model.psi*model.theta*contextSignal+.2*v]
}
export function targetFeature(model,k){return [model.targetTheta*patchSignals[k],model.targetTheta*(.5+patchSignals[k]-mean(patchSignals))]}
export function featureStats(model,indices=blocks[0].indices){
  const predictions=indices.map(k=>featurePrediction(model,k)),targets=indices.map(k=>targetFeature(model,k))
  const loss=mean(predictions.map((p,i)=>p.reduce((s,v,e)=>s+(v-targets[i][e])**2,0)))
  const errorSum=predictions.reduce((sum,p,i)=>sum+p.reduce((s,v,e)=>s+v-targets[i][e],0),0)
  const common=2*errorSum/indices.length*contextSignal
  return {predictions,targets,loss,gradient:{theta:common*model.psi,psi:common*model.theta}}
}
export function featureGradientStep(model,indices=blocks[0].indices,eta=.1){
  const before=featureStats(model,indices),next={...model,theta:model.theta-eta*before.gradient.theta,psi:model.psi-eta*before.gradient.psi}
  return {next,lossBefore:before.loss,lossAfter:featureStats(next,indices).loss}
}
export function featureEMA(model,mu=.8){return {...model,targetTheta:mu*model.targetTheta+(1-mu)*model.theta}}
