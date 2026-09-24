/** Calculs déterministes des démonstrations. Aucune inférence distante. */
export type V2 = [number, number]
export type V3 = [number, number, number]
export const clamp = (x:number,a:number,b:number)=>Math.max(a,Math.min(b,x))
export const wrap = (a:number)=>Math.atan2(Math.sin(a),Math.cos(a))
export const sum = (xs:number[])=>xs.reduce((a,b)=>a+b,0)
export const dot = (a:number[],b:number[])=>sum(a.map((x,i)=>x*b[i]))
export const norm = (a:number[])=>Math.sqrt(dot(a,a))
export const distance = (a:number[],b:number[])=>norm(a.map((x,i)=>x-b[i]))
export function seeded(seed=42){return ()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}}
export function regressionLoss(e:number,kind='quadratic',delta=1){
 if(kind==='absolute')return {loss:Math.abs(e),gradient:Math.sign(e)}
 if(kind==='huber')return Math.abs(e)<=delta?{loss:e*e/2,gradient:e}:{loss:delta*(Math.abs(e)-delta/2),gradient:delta*Math.sign(e)}
 return {loss:e*e/2,gradient:e}
}
export function softmax(scores:number[]){const m=Math.max(...scores),ex=scores.map(v=>Math.exp(v-m)),s=sum(ex);return ex.map(v=>v/s)}
export function crossEntropy(scores:number[],target:number){const m=Math.max(...scores),p=softmax(scores);return {p,loss:m+Math.log(sum(scores.map(v=>Math.exp(v-m))))-scores[target],gradient:p.map((v,i)=>v-Number(i===target))}}
export function network(theta:number[],x:number,y:number){
 const [w1,b1,w2,b2]=theta,a=w1*x+b1,h=Math.tanh(a),prediction=w2*h+b2,error=prediction-y;
 const dh=error*w2,da=dh*(1-h*h);
 return {a,h,prediction,error,loss:error*error/2,dh,da,gradient:[da*x,da,error*h,error]}
}
export const trainingPairs=Array.from({length:24},(_,i)=>{const x=(i-11.5)/8;return [x,1.2*x+.4+.6*Math.sin(i*2.3)] as V2})
export function linearLoss(theta:number[],data=trainingPairs){return sum(data.map(([x,y])=>(theta[0]*x+theta[1]-y)**2/2))/data.length}
export function linearGradient(theta:number[],data=trainingPairs){return [sum(data.map(([x,y])=>(theta[0]*x+theta[1]-y)*x))/data.length,sum(data.map(([x,y])=>theta[0]*x+theta[1]-y))/data.length]}
export function descent(batch:number,eta:number,steps:number){
 let theta=[-1.6,-1.3];const path=[{theta:[...theta],loss:linearLoss(theta)}],rnd=seeded(17);
 for(let k=0;k<steps;k++){const data=batch>=trainingPairs.length?trainingPairs:Array.from({length:batch},()=>trainingPairs[Math.floor(rnd()*trainingPairs.length)]);const g=linearGradient(theta,data);theta=theta.map((x,i)=>x-eta*g[i]);if(!theta.every(Number.isFinite)||norm(theta)>1e5)break;path.push({theta:[...theta],loss:linearLoss(theta)})}return path
}
const truth=(x:number)=>.7*Math.sin(3*x)+.25*x
export function generalization(capacity=14,noise=.45,lambda=0){
 const centers=Array.from({length:capacity},(_,i)=>-1+2*i/Math.max(1,capacity-1));
 const features=(x:number)=>[1,...centers.map(c=>Math.exp(-(((x-c)*capacity/3)**2)))];
 const make=(n:number,seed:number)=>{const rnd=seeded(seed);return Array.from({length:n},()=>{const x=2*rnd()-1;return {x,y:truth(x)+noise*(rnd()*2-1),phi:features(x)}})};
 const train=make(12,11),validation=make(50,32),test=make(50,93);let w=Array(capacity+1).fill(0);const curves:any[]=[];
 const mse=(data:typeof train)=>sum(data.map(p=>(dot(w,p.phi)-p.y)**2))/data.length;
 for(let epoch=0;epoch<=1200;epoch++){
  if(epoch%10===0)curves.push({epoch,train:mse(train),validation:mse(validation),test:mse(test),weights:[...w]});
  const grad=w.map((v,k)=>sum(train.map(p=>2*(dot(w,p.phi)-p.y)*p.phi[k]))/train.length+2*lambda*v);w=w.map((v,k)=>v-.08*grad[k]);
 }
 return {train,validation,test,curves,predict:(x:number,weights:number[])=>dot(weights,features(x)),truth}
}
export function iou(a:number[],b:number[]){const intersection=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return intersection/(a[2]*a[3]+b[2]*b[3]-intersection||1)}
export function quaternionMatrix(q:number[]){const n=norm(q);if(n<1e-9)throw Error('Quaternion nul');const [w,x,y,z]=q.map(v=>v/n);return [[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]}
export function rotation6d(v:number[]){const a=v.slice(0,3),b=v.slice(3),na=norm(a);if(na<1e-9)throw Error('Premier axe nul');const e1=a.map(v=>v/na),proj=dot(e1,b),ortho=b.map((v,i)=>v-proj*e1[i]),nb=norm(ortho);if(nb<1e-9)throw Error('Axes colinéaires');const e2=ortho.map(v=>v/nb),e3=[e1[1]*e2[2]-e1[2]*e2[1],e1[2]*e2[0]-e1[0]*e2[2],e1[0]*e2[1]-e1[1]*e2[0]];return e1.map((_,i)=>[e1[i],e2[i],e3[i]])}
export const mv=(R:number[][],p:number[])=>R.map(row=>dot(row,p))
export function unproject(u:number,v:number,d:number,fx=200,fy=200,cx=160,cy=100):V3{return [(u-cx)*d/fx,(v-cy)*d/fy,d]}
export function pinhole(p:number[],fx=200,fy=200,cx=160,cy=100):V2{if(p[2]<=0)throw Error('Point derrière la caméra');return [fx*p[0]/p[2]+cx,fy*p[1]/p[2]+cy]}
export function depthDistribution(mean:number,sigma:number,bins:number[]){return softmax(bins.map(d=>-.5*((d-mean)/sigma)**2))}
export function splat(samples:{x:number,y:number,weight:number}[],cell=1){const grid=new Map<string,number>();for(const p of samples){const key=[Math.floor(p.x/cell),Math.floor(p.y/cell)].join(',');grid.set(key,(grid.get(key)||0)+p.weight)}return grid}
export function contrastive(a:number[],b:number[],positive:boolean,margin:number){const d=distance(a,b);return positive?d*d:Math.max(0,margin-d)**2}
export function triplet(a:number[],p:number[],n:number[],margin:number){const dap=distance(a,p),dan=distance(a,n),loss=Math.max(0,dap-dan+margin),unit=(x:number[],y:number[],d:number)=>x.map((v,i)=>(v-y[i])/Math.max(d,1e-9));const ap=unit(a,p,dap),an=unit(a,n,dan);return {dap,dan,loss,gradient:loss>0?[ap.map((v,i)=>v-an[i]),ap.map(v=>-v),an]:[a.map(()=>0),a.map(()=>0),a.map(()=>0)]}}
export function polarContext(points:V3[],rings=6,sectors=12,maxRange=30){const grid=Array.from({length:rings},()=>Array(sectors).fill(0));for(const [x,y,z] of points){const r=Math.floor(Math.hypot(x,y)/maxRange*rings+1e-10),s=Math.floor(((Math.atan2(y,x)+2*Math.PI)%(2*Math.PI))/(2*Math.PI)*sectors);if(r<rings)grid[r][s]=Math.max(grid[r][s],Math.max(0,z))}return grid}
export function circularScore(a:number[][],b:number[][],shift:number){const sectors=a[0].length;let cost=0,count=0;for(let s=0;s<sectors;s++){const x=a.map(row=>row[s]),y=b.map(row=>row[(s+shift)%sectors]),den=norm(x)*norm(y);if(den>1e-9){cost+=1-dot(x,y)/den;count++}}return count?cost/count:1}
// Petits graphes de poses SE(2), avec la première pose fixée pour lever la jauge.
export type Pose=[number,number,number]
export function compose(a:Pose,b:Pose):Pose{const c=Math.cos(a[2]),s=Math.sin(a[2]);return [a[0]+c*b[0]-s*b[1],a[1]+s*b[0]+c*b[1],wrap(a[2]+b[2])]}
export function inverse(a:Pose):Pose{const c=Math.cos(a[2]),s=Math.sin(a[2]);return [-c*a[0]-s*a[1],s*a[0]-c*a[1],-a[2]]}
export function between(a:Pose,b:Pose){return compose(inverse(a),b)}
export function logSE2(p:Pose):Pose{const [x,y,t]=p;if(Math.abs(t)<1e-8)return [x,y,t];const A=Math.sin(t)/t,B=(1-Math.cos(t))/t,den=A*A+B*B;return [(A*x+B*y)/den,(-B*x+A*y)/den,t]}
export function poseResidual(a:Pose,b:Pose,z:Pose){return logSE2(compose(inverse(z),between(a,b)))}
export function solve(A:number[][],b:number[]){const n=b.length,M=A.map((row,i)=>[...row,b[i]]);for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[pivot][k]))pivot=i;[M[k],M[pivot]]=[M[pivot],M[k]];if(Math.abs(M[k][k])<1e-12)throw Error('Système singulier');const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const f=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j]}}return M.map(row=>row[n])}
export function graphExample(mode='loop',sigma=1,bad=false,iterations=8){
 const truth:Pose[]=[[0,0,0],[4,0,0],[8,0,Math.PI/2],[8,4,Math.PI],[4,4,Math.PI],[0,1,-Math.PI/2]];
 const measurements=truth.slice(1).map((p,i)=>{const z=between(truth[i],p);return [z[0]+.14,z[1]-.08,wrap(z[2]+.045)] as Pose});
 const before:Pose[]=[[0,0,0]];measurements.forEach(z=>before.push(compose(before.at(-1)!,z)));
 const loop=between(truth[0],truth.at(-1)!);if(bad)loop[0]+=4;
 // Le GNSS appartient à l'image de référence, située près de la dernière vue.
 const geo:V2=bad?[4,1]:[0,.6];
 const residual=(poses:Pose[])=>{const r:number[]=[];measurements.forEach((z,i)=>r.push(...poseResidual(poses[i],poses[i+1],z).map((v,k)=>v/(k===2?.1:.4))));if(mode==='loop')r.push(...poseResidual(poses[0],poses.at(-1)!,loop).map((v,k)=>v/(k===2?sigma*.12:sigma)));if(mode==='gnss')r.push((poses.at(-1)![0]-geo[0])/sigma,(poses.at(-1)![1]-geo[1])/sigma);return r};
 let poses=before.map(p=>[...p] as Pose);const history=[dot(residual(poses),residual(poses))];
 for(let iteration=0;iteration<iterations&&mode!=='none';iteration++){
  const r=residual(poses),n=(poses.length-1)*3,eps=1e-5,J=Array.from({length:r.length},()=>Array(n).fill(0));
  for(let j=0;j<n;j++){const pert=poses.map(p=>[...p] as Pose);pert[1+Math.floor(j/3)][j%3]+=eps;const r2=residual(pert);for(let k=0;k<r.length;k++)J[k][j]=(r2[k]-r[k])/eps}
  const H=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>sum(J.map(row=>row[i]*row[j]))+Number(i===j)*1e-5)),g=Array.from({length:n},(_,i)=>-sum(J.map((row,k)=>row[i]*r[k]))),delta=solve(H,g);
  let accepted=false;for(const alpha of [1,.5,.25,.1,.01]){const candidate=poses.map((p,i)=>i===0?p:p.map((v,k)=>k===2?wrap(v+alpha*delta[(i-1)*3+k]):v+alpha*delta[(i-1)*3+k]) as Pose);const cost=dot(residual(candidate),residual(candidate));if(cost<=history.at(-1)!+1e-10){poses=candidate;history.push(cost);accepted=true;break}}if(!accepted)break;
 }
 return {truth,before,after:poses,geo,history,loop,residual:mode==='loop'?poseResidual(poses[0],poses.at(-1)!,loop):[poses.at(-1)![0]-geo[0],poses.at(-1)![1]-geo[1]]}
}
