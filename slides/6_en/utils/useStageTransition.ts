import {computed,ref,watch} from 'vue'
import {useNav} from '@slidev/client'
import {usePlayback} from './usePlayback'
export function useStageTransition(stage:()=>number){
  const nav=useNav(),blend=ref(1)
  const reset=()=>{blend.value=1}
  const {playing}=usePlayback(()=>{blend.value=Math.min(1,blend.value+.08);return blend.value<1},reset,100)
  watch(stage,()=>{playing.value=false;reset()})
  const fraction=computed(()=>nav.isPrintMode.value?1:blend.value)
  const replay=()=>{if(playing.value)playing.value=false;else{blend.value=0;playing.value=true}}
  const step=()=>{playing.value=false;if(blend.value>=1)blend.value=0;blend.value=Math.min(1,blend.value+.2)}
  return {fraction,playing,replay,step,reset:()=>{playing.value=false;reset()}}
}
