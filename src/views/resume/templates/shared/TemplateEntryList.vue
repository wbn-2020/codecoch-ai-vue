<template>
  <div class="template-entry-list" :class="{ 'template-entry-list--projects': project }">
    <article v-for="entry in entries" :key="entry.key" class="template-entry document-entry">
      <div v-if="entry.title || entry.subtitle || entry.period" class="template-entry__head document-entry__head">
        <div>
          <strong v-if="entry.title">{{ entry.title }}</strong>
          <span v-if="entry.subtitle">{{ entry.subtitle }}</span>
        </div>
        <time v-if="entry.period">{{ entry.period }}</time>
      </div>
      <p v-if="entry.meta" class="template-entry__meta document-entry__meta">{{ entry.meta }}</p>
      <div v-if="entry.projectSections?.length" class="template-entry__sections document-project-sections">
        <section v-for="section in entry.projectSections" :key="section.key" class="document-project-section">
          <strong class="document-project-section__title">{{ section.title }}</strong>
          <ul class="document-project-section__list">
            <li v-for="value in section.values" :key="value">{{ value }}</li>
          </ul>
        </section>
      </div>
      <ul v-else-if="entry.bullets.length" class="document-entry__bullets">
        <li v-for="bullet in entry.bullets" :key="bullet">{{ bullet }}</li>
      </ul>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ResumeDocumentEntry } from '@/features/resume-document'

defineProps<{
  entries: ResumeDocumentEntry[]
  project?: boolean
}>()
</script>

<style scoped>
.template-entry-list {
  display: grid;
  gap: 14px;
}

.template-entry {
  min-width: 0;
  break-inside: avoid;
}

.template-entry__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.template-entry__head > div {
  min-width: 0;
}

.template-entry__head strong {
  color: var(--template-ink);
  font-size: calc(12.5px * var(--template-font-scale, 1));
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.4;
}

.template-entry__head span {
  margin-left: 8px;
  color: var(--template-muted);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.template-entry__head time {
  flex: 0 0 auto;
  color: var(--template-accent-strong);
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.template-entry__meta {
  margin: 4px 0 0;
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.template-entry ul {
  display: grid;
  gap: 4px;
  margin: 6px 0 0;
  padding-left: 16px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
  line-height: var(--template-line-height);
}

.template-entry li::marker {
  color: var(--template-accent);
}

.template-entry__sections {
  display: grid;
  gap: 9px;
  margin-top: 8px;
}

.template-entry__sections strong {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--template-accent-strong);
  font-size: calc(11px * var(--template-font-scale, 1));
  font-weight: 700;
  letter-spacing: 0.03em;

  &::before {
    content: '';
    flex: none;
    width: 3px;
    height: 10px;
    border-radius: 2px;
    background: var(--template-accent);
  }
}
</style>
