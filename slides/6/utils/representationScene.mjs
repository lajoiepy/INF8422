// Deterministic 2D illustration, not a learned perception model.
// u increases right, v down; alpha is clockwise in image coordinates.
export const initialScene = Object.freeze({u:125,v:105,alpha:0,lighting:1,background:'plain'})
export const featurePoints = Object.freeze([
  {id:'A',local:[-21,-21],color:'#a8266e',descriptor:[.72,-.18,.31]},
  {id:'B',local:[62,0],color:'#c45314',descriptor:[-.24,.81,.46]},
  {id:'C',local:[-16,24],color:'#127999',descriptor:[.38,.12,-.64]},
])
export function imagePoint(local,scene) {
  const a=scene.alpha*Math.PI/180,c=Math.cos(a),s=Math.sin(a)
  return [scene.u+c*local[0]-s*local[1],scene.v+s*local[0]+c*local[1]]
}
export function sceneReadout(scene) {
  return {
    identity:'same mug',
    features:featurePoints.map(p=>({...p,image:imagePoint(p.local,scene)})),
    grasp:{point:imagePoint([62,0],scene),alpha:scene.alpha},
  }
}
export function stageScene(mode,stage=0) {
  const scene={...initialScene}
  if(mode==='identity') {
    if(stage>=1)scene.lighting=.55
    if(stage>=2)scene.background='pattern'
  } else if(mode==='pose') {
    if(stage>=1){scene.u=165;scene.v=130}
    if(stage>=2)scene.alpha=-40
  }
  return scene
}
export function playbackScene(mode,tick) {
  const t=tick/24*2*Math.PI
  if(mode==='identity')return {...initialScene,lighting:.8+.25*Math.cos(t),background:tick<12?'plain':'pattern'}
  return {...initialScene,u:145+25*Math.sin(t),v:110+15*Math.sin(t),alpha:40*Math.sin(t)}
}
