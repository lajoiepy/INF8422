import {ref,watch,onUnmounted} from 'vue'
import {useIsSlideActive} from '@slidev/client'
export function usePlayback(step:()=>boolean|void,period=150){const playing=ref(false),active=useIsSlideActive();let timer:ReturnType<typeof setInterval>|undefined;const stop=()=>{if(timer)clearInterval(timer);timer=undefined};watch([playing,active],()=>{stop();if(playing.value&&active.value)timer=setInterval(()=>{if(step()===false)playing.value=false},period);if(!active.value)playing.value=false});onUnmounted(stop);return {playing}}
