<script setup lang="ts">
import bibliography from '../sources/references.json'
const props = defineProps<{ slide: string }>()
const entries = bibliography.entries.filter(entry => entry.slide === props.slide)
</script>

<template>
  <div class="reference-list" :class="{ compact: slide === 'R01' }" :data-reference-slide="slide">
    <template v-for="(entry, index) in entries" :key="entry.id">
      <div v-if="entry.supporting && !entries[index - 1]?.supporting" class="reference-group-label">
        {{ slide === 'R01' ? 'Autres sources citées dans le cours' : 'Source d’évaluation' }}
      </div>
      <article class="reference-entry" :data-reference-id="entry.id">
        <div class="reference-label">{{ entry.label }}</div>
        <div class="reference-body">
          <a class="reference-title" :href="entry.url" target="_blank" rel="noopener noreferrer">{{ entry.title }}</a>
          <div class="reference-authors">{{ entry.authors }}. <strong>{{ entry.venue }}.</strong></div>
          <div v-for="link in entry.links" :key="link.url" class="reference-code">
            <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.title }}</a><span v-if="link.detail"> · {{ link.detail }}</span>
          </div>
        </div>
      </article>
    </template>
  </div>
</template>

<style scoped>
.reference-list{display:grid;gap:24px;margin-top:24px;color:#334155;}
.reference-entry{display:grid;grid-template-columns:110px 1fr;gap:16px;border-left:3px solid var(--poly-blue);padding:5px 0 5px 12px;align-items:start;}
.reference-label{font-size:15px;font-weight:700;line-height:1.3;color:#334155;}
.reference-title{display:block;font-size:18px;line-height:1.3;color:#a8161d;text-decoration:none;}
.reference-title:hover,.reference-code a:hover{text-decoration:underline;}
.reference-authors{font-size:15px;line-height:1.4;margin-top:5px;}
.reference-authors strong{font-weight:650;}
.reference-entry[data-reference-id="wvn"] .reference-authors strong{display:block;margin-top:2px;}
.reference-code{font-size:14px;line-height:1.35;margin-top:5px;}
.reference-code a{color:#03687f;}
.reference-group-label{font-size:14px;font-weight:650;color:#475569;border-top:1px solid #cbd5e1;padding-top:10px;}
.compact{gap:7px;margin-top:12px;}
.compact .reference-entry{grid-template-columns:72px 1fr;gap:12px;padding:3px 0 3px 10px;}
.compact .reference-label{font-size:13px;line-height:19px;}
.compact .reference-title{font-size:15.8px;line-height:19px;}
.compact .reference-authors{font-size:13.2px;line-height:17px;margin-top:2px;}
.compact .reference-code{font-size:12.5px;line-height:16px;margin-top:2px;}
.compact .reference-group-label{font-size:12.5px;line-height:17px;padding-top:6px;margin-top:1px;}
</style>
