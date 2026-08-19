<template>
  <div class="info-block">
    <div v-if="title" class="block-title">{{ title }}</div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()
</script>
