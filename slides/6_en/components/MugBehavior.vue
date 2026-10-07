<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useNav } from '@slidev/client'
import { stageScene, playbackScene, sceneReadout } from '../utils/representationScene.mjs'
import { usePlayback } from '../utils/usePlayback'
const props=withDefaults(defineProps<{mode?:'identity'|'pose';stage?:number}>(),{mode:'identity',stage:0})
const nav=useNav(),scene=ref(stageScene(props.mode,props.stage)),tick=ref(0)
const reset=()=>{scene.value=stageScene(props.mode,props.stage);tick.value=0}
const advance=()=>{tick.value++;scene.value=playbackScene(props.mode,tick.value);return tick.value<24}
const {playing}=usePlayback(advance,reset,120)
watch(()=>props.stage,()=>{playing.value=false;reset()})
const state=computed(()=>nav.isPrintMode.value?stageScene(props.mode,props.stage):scene.value)
const readout=computed(()=>sceneReadout(state.value))
const reference=stageScene(props.mode,0)
const stop=()=>{playing.value=false}
const togglePlayback=()=>{if(playing.value)playing.value=false;else{if(tick.value>=24)tick.value=0;playing.value=true}}
const blurButton=(event:Event)=>(event.target as HTMLElement).closest('button')?.blur()
</script>
<template>
  <div class="mug-behavior" :data-mode="mode" :data-stage="stage" :data-tick="tick" :data-u="state.u" :data-v="state.v" :data-angle="state.alpha" :data-identity="readout.identity" :data-grasp-u="readout.grasp.point[0]" :data-grasp-v="readout.grasp.point[1]" :data-lighting="state.lighting" :data-background="state.background">
    <div class="scene-pair">
      <div class="scene-column"><div class="scene-label">Reference observation</div><MugScene :scene="reference" :features="mode==='pose'" :grasp="mode==='pose'" :axes="mode==='pose'"/></div>
      <div class="change-arrow">→<small>{{mode==='identity'?'change appearance':'move the mug'}}</small></div>
      <div class="scene-column"><div class="scene-label">Changed observation</div><MugScene :scene="state" :features="mode==='pose'" :grasp="mode==='pose'" :axes="mode==='pose'"/></div>
      <div v-if="mode==='identity'" class="behavior-readout"><span class="readout-label">Desired identity output</span><b class="identity">{{readout.identity}}</b><span>Lighting: {{state.lighting.toFixed(2)}}×</span><span>Background: {{state.background}}</span></div>
      <div v-else class="behavior-readout"><span class="readout-label">Grasp in image coordinates</span><b class="grasp-value">({{readout.grasp.point[0].toFixed(1)}}, {{readout.grasp.point[1].toFixed(1)}})</b><span>α = {{readout.grasp.alpha.toFixed(0)}}° · positive clockwise</span><div class="descriptor-label">B: same illustrative descriptor</div><FeatureVector :values="readout.features[1].descriptor" compact accent="#c45314"/></div>
    </div>
    <div class="behavior-caption">{{mode==='identity'?'Pixels change; the recognition decision stays stable.':'The handle descriptor stays associated with B; its image location and grasp orientation change.'}}</div>
    <div v-if="!nav.isPrintMode.value" class="mug-controls" @click.stop="blurButton">
      <div v-if="mode==='identity'" class="lab-controls parameter-controls">
        <label>Lighting <input aria-label="Lighting" type="range" min=".4" max="1.2" step=".05" v-model.number="scene.lighting" @input="stop"/>{{scene.lighting.toFixed(2)}}×</label>
        <label>Background <select aria-label="Background" v-model="scene.background" @change="stop"><option value="plain">Plain</option><option value="pattern">Pattern</option></select></label>
      </div>
      <div v-else class="lab-controls parameter-controls">
        <label>Center u <input aria-label="Horizontal position" type="range" min="90" max="175" step="5" v-model.number="scene.u" @input="stop"/>{{scene.u.toFixed(1)}}</label>
        <label>Center v <input aria-label="Vertical position" type="range" min="80" max="130" step="5" v-model.number="scene.v" @input="stop"/>{{scene.v.toFixed(1)}}</label>
        <label>Angle <input aria-label="Orientation" type="range" min="-45" max="45" step="5" v-model.number="scene.alpha" @input="stop"/>{{scene.alpha.toFixed(0)}}°</label>
      </div>
      <div class="lab-controls playback-controls">
        <button :disabled="nav.clicks.value===0" @click="nav.prev()">Previous stage</button><button :disabled="nav.clicks.value===nav.clicksTotal.value" @click="nav.next()">Next stage</button>
        <button class="primary" @click="togglePlayback">{{playing?'Pause':'Play changes'}}</button><button @click="playing=false;reset()">Reset scene</button>
        <span>{{mode==='identity'?['Original appearance','Lighting changes','Background changes'][stage]:['Original pose','Position changes','Orientation changes'][stage]}}</span>
      </div>
    </div>
  </div>
</template>
<style scoped>
.scene-pair{display:grid;grid-template-columns:255px 70px 255px 1fr;gap:12px;align-items:center;margin-top:10px}.scene-label{font-size:16px;font-weight:600;margin-bottom:7px}.change-arrow{font-size:34px;text-align:center;color:#475569}.change-arrow small{display:block;font-size:12px;line-height:1.3}.behavior-readout{display:flex;flex-direction:column;gap:7px;padding-left:11px;border-left:3px solid #00BDF2;font-size:14px;line-height:1.35}.readout-label{font-size:15px;font-weight:600}.identity{font-size:27px;color:#1b7b37}.grasp-value{font-size:23px;color:#9d4312;font-variant-numeric:tabular-nums}.descriptor-label{font-size:12px;margin-top:5px}.behavior-caption{font-size:17px;line-height:1.35;margin:10px 0}.mug-controls{margin:9px 0}.parameter-controls{margin-bottom:9px}.mug-behavior button,.mug-behavior select{border:1px solid #cbd5e1;background:white;border-radius:5px;padding:4px 10px;color:#334155;font:inherit;font-size:14px}.mug-behavior button.primary{background:#CF1C24;color:white;border-color:#CF1C24}.mug-behavior button:disabled{opacity:.5;cursor:default}.playback-controls{gap:10px}.playback-controls span{font-size:13px;color:#475569}.behavior-disclosure{font-size:13px;color:#475569;margin-top:9px;line-height:1.4}.parameter-controls input[type=range]{width:110px}
</style>
