<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const { currentPage, total, slides } = useNav()

const currentSection = computed((): string => {
  const index = currentPage.value - 1
  for (let i = index; i >= 0; i--) {
    const slide = slides.value[i]
    if (slide?.frontmatter?.layout === 'section')
      return slide.title ?? ''
  }
  return 'INF8422'
})

const isVisible = computed((): boolean => {
  const slide = slides.value[currentPage.value - 1]
  const layout = slide?.frontmatter?.layout
  return layout !== 'cover' && layout !== 'section'
})
</script>

<template>
  <div v-if="isVisible" class="poly-footer">
    <span class="footer-section">{{ currentSection }}</span>
    <span class="footer-center">INF8422 — Robotic Perception and Uncertainty</span>
    <span class="footer-right">{{ currentPage }} / {{ total }}</span>
  </div>
</template>

<style scoped>
.poly-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 3px 14px;
  background: #333333;
  color: white;
  font-size: 0.6rem;
}

.footer-section {
  flex: 1;
  font-weight: bold;
}

.footer-center {
  flex: 1;
  text-align: center;
  opacity: 0.7;
}

.footer-right {
  flex: 1;
  text-align: right;
}
</style>
