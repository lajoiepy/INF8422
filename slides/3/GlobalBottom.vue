<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const { currentPage, total, slides } = useNav()

// Walk backward from current slide to find the last section-layout slide
const currentSection = computed((): string => {
  const idx = currentPage.value - 1
  for (let i = idx; i >= 0; i--) {
    const slide = slides.value[i]
    if (slide?.frontmatter?.layout === 'section') {
      return slide.title ?? ''
    }
  }
  return 'INF8422'
})

// Hide on cover slide and section transition slides
const isVisible = computed((): boolean => {
  const slide = slides.value[currentPage.value - 1]
  const layout = slide?.frontmatter?.layout
  return layout !== 'cover' && layout !== 'section'
})
</script>

<template>
  <div v-if="isVisible" class="poly-footer">
    <span class="footer-section">{{ currentSection }}</span>
    <span class="footer-center">INF8422 — Inférence Probabiliste et Estimation d'État</span>
    <span class="footer-right">{{ currentPage }} / {{ total }}</span>
  </div>
</template>

<style scoped>
.poly-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #333333;
  color: white;
  padding: 3px 14px;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 100;
}
.footer-section {
  font-weight: bold;
  flex: 1;
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
