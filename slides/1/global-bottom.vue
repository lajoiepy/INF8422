<template>
  <!-- 4-color bar on cover, footer on all other slides -->
  <div v-if="$nav.currentLayout === 'cover'" class="cover-footer-bar">
    <span style="background: #CF1C24;" />
    <span style="background: #F15A22;" />
    <span style="background: #25B34B;" />
    <span style="background: #00BDF2;" />
  </div>
  <div v-else class="poly-footer">
    <span class="footer-section">{{ $slidev.configs.title }}</span>
    <span class="footer-right">INF8422 | {{ $nav.currentPage }}</span>
  </div>
</template>
