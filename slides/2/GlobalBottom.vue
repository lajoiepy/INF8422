<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'

const { currentPage, total, slides } = useNav()

// Depuis Slidev 52.19, SlideRoute expose la diapo sous meta.slide ;
// on accepte les deux formes pour rester compatible avec les versions antérieures.
const fmOf = (s: any) => s?.meta?.slide?.frontmatter ?? s?.frontmatter ?? {}
const titleOf = (s: any) => s?.meta?.slide?.title ?? s?.title ?? ''

// Walk backward from current slide to find the last section-layout slide
const currentSection = computed((): string => {
  for (let i = currentPage.value - 1; i >= 0; i--) {
    if (fmOf(slides.value[i]).layout === 'section') return titleOf(slides.value[i]) || 'INF8422'
  }
  return 'INF8422'
})

// Hide on cover slide and section transition slides
const isVisible = computed((): boolean => {
  const layout = fmOf(slides.value[currentPage.value - 1]).layout
  return layout !== 'cover' && layout !== 'section'
})
</script>

<template>
  <div v-if="isVisible" class="poly-footer">
    <span class="footer-section">{{ currentSection }}</span>
    <span class="footer-center">INF8422 — SLAM Visuel et Inertiel</span>
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
