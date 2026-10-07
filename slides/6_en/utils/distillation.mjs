import {softmax} from './matching.mjs'
export const initialLogits={student:[.18,.03,-.08],teacher:[.25,.11,-.02],center:[.05,.02,-.01]}
export function distillationStats(student,teacher,center=initialLogits.center,tauStudent=.4,tauTeacher=.2,centered=true){
  const studentProbability=softmax(student,tauStudent)
  const teacherProbability=softmax(teacher.map((v,k)=>v-(centered?center[k]:0)),tauTeacher)
  return {studentProbability,teacherProbability,loss:-teacherProbability.reduce((s,v,k)=>s+v*Math.log(studentProbability[k]),0)}
}
export const initialTeacherModel={theta:.45,phi:.8,teacherTheta:.6,teacherPhi:1}
const logits=(theta,phi,input)=>{const z=theta*input;return [phi*z,-phi*z,.5*z]}
export function toyStudentUpdate(model,eta=.08,tauStudent=.4,tauTeacher=.2){
  const q=logits(model.theta,model.phi,.9),target=logits(model.teacherTheta,model.teacherPhi,1.1)
  const stats=distillationStats(q,target,[.05,-.03,-.02],tauStudent,tauTeacher)
  const gradientQ=stats.studentProbability.map((v,k)=>(v-stats.teacherProbability[k])/tauStudent)
  const gradientTheta=gradientQ[0]*model.phi*.9-gradientQ[1]*model.phi*.9+gradientQ[2]*.45
  const gradientPhi=(gradientQ[0]-gradientQ[1])*model.theta*.9
  const next={...model,theta:model.theta-eta*gradientTheta,phi:model.phi-eta*gradientPhi}
  const lossAfter=distillationStats(logits(next.theta,next.phi,.9),target,[.05,-.03,-.02],tauStudent,tauTeacher).loss
  return {next,gradientTheta,gradientPhi,lossBefore:stats.loss,lossAfter}
}
export const movingAverage=(teacher,student,mu)=>mu*teacher+(1-mu)*student
export function toyTeacherStep(model,mu=.8){
  return {...model,teacherTheta:movingAverage(model.teacherTheta,model.theta,mu),teacherPhi:movingAverage(model.teacherPhi,model.phi,mu)}
}
