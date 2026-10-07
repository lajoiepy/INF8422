<script setup lang="ts">
import {computed} from 'vue'
import katex from 'katex'
import 'katex/dist/katex.min.css'
const props=defineProps<{formula:string;small?:boolean}>()
const html=computed(()=>katex.renderToString(props.formula,{displayMode:true,throwOnError:true}))
</script>
<template><div class="math-line" :class="{small}" v-html="html"/></template>
<style scoped>.math-line{font-size:21px;min-height:43px;display:flex;align-items:center;justify-content:center}.math-line.small{font-size:18px}.math-line :deep(.katex-display){margin:8px 0}</style>
