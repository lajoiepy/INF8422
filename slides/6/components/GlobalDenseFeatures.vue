<script setup lang="ts">
import { computed } from 'vue'
import { stageScene, sceneReadout } from '../utils/representationScene.mjs'
withDefaults(defineProps<{stage?:number}>(),{stage:0})
const scenes=[stageScene('pose',0),stageScene('pose',2)]
const selected=computed(()=>scenes.map(s=>{const [u,v]=sceneReadout(s).grasp.point;return Math.floor(v/210*4)*6+Math.floor(u/300*6)}))
</script>
<template>
  <div class="global-dense">
    <section class="feature-example"><h3>Caractéristiques globales : 1 vecteur par image</h3><div class="example-task">Reconnaître un lieu déjà visité</div>
      <div class="observation-pair"><div v-for="i in 2" :key="i"><div class="observation-label">{{i===1?'Image requête':'Image stockée'}}</div><PlaceObservation :alternate="i===2"/><div class="encoder-mini">Encodeur fθ ↓</div><FeatureVector :values="i===1?[.42,-.18,.73]:[.40,-.20,.71]" compact/></div></div>
      <div class="match-summary">Comparer les descripteurs globaux</div>
    </section>
    <section class="feature-example dense-example" :class="{'pending':stage===0}"><h3>Caractéristiques denses : vecteurs par position</h3><div class="example-task">Trouver le point d’anse correspondant</div>
      <div class="observation-pair"><div v-for="(scene,i) in scenes" :key="i"><div class="observation-label">{{i===0?'Image de référence':'Nouvelle image'}}</div><MugScene :scene="scene" features/><div class="encoder-mini">Encodeur fθ ↓</div>
        <div class="dense-grid" aria-label="Grille illustrative de descripteurs à résolution réduite"><div v-for="k in 24" :key="k" :class="{'selected':k-1===selected[i]}"><span/><span/><span/></div></div>
      </div></div>
      <div class="match-summary dense-summary"><b></b><FeatureVector :values="[-.24,.81,.46]" compact accent="#c45314"/></div>
    </section>
  </div>
</template>
<style scoped>
.global-dense{display:grid;grid-template-columns:1fr 1fr;gap:29px;margin-top:12px}.feature-example{padding-right:18px}.dense-example{border-left:1px solid #cbd5e1;padding-left:27px;padding-right:0}.feature-example h3{font-size:19px!important;font-weight:600;margin:0 0 7px!important}.example-task{font-size:16px;margin-bottom:13px}.observation-pair{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:360px;margin:0 auto}.observation-label{font-size:14px;margin-bottom:6px}.encoder-mini{font-size:14px;text-align:center;color:#146e88;margin:8px 0}.dense-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:2px;height:54px}.dense-grid>div{display:flex;gap:2px;align-items:center;justify-content:center;background:#edf6f9;border:1px solid #c4e0e8}.dense-grid span{width:3px;height:5px;background:#549eb4}.dense-grid span:nth-child(2){height:8px}.dense-grid .selected{border:2px solid #c45314;background:#fff0e7}.dense-grid .selected span{background:#c45314}.match-summary{font-size:16px;margin-top:13px;color:#1b7b37;font-weight:600;text-align:center;min-height:30px;display:flex;align-items:center;justify-content:center}.dense-summary{gap:12px;color:#9d4312;margin-top:7px}.feature-disclosure{font-size:13px;color:#475569;margin:13px 0 6px}.pending{visibility:hidden}
</style>
