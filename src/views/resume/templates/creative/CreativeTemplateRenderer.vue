<template>
  <TemplatePaper :model="model" variant="modern" class="creative-renderer">
    <header class="creative-renderer__header">
      <div class="creative-renderer__header-main">
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition" class="creative-renderer__role">
          {{ model.identity.targetPosition }}
        </p>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div v-if="model.contacts.length" class="creative-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="creative-renderer__body">
      <section
        v-for="section in sections"
        :key="section"
        :data-section="section"
        :class="['creative-renderer__section', `creative-renderer__section--${section}`]"
      >
        <div class="creative-renderer__section-label">{{ sectionTitles[section] }}</div>

        <div v-if="section === 'summary'" class="creative-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>
        <div v-else-if="section === 'skills'" class="creative-renderer__skills">
          <div
            v-for="group in model.skillGroups"
            :key="group.label"
            class="creative-renderer__skill-group"
          >
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(' / ') }}</span>
          </div>
          <p v-if="!model.skillGroups.length">{{ model.skills.join(' / ') }}</p>
        </div>
        <TemplateEntryList
          v-else-if="section === 'experience'"
          :entries="model.experience"
        />
        <TemplateEntryList
          v-else-if="section === 'projects'"
          :entries="model.projects"
          project
        />
        <TemplateEntryList
          v-else
          :entries="model.education"
        />
      </section>
    </main>

    <div v-else class="creative-renderer__empty">
      <strong>开始构建你的专业简历</strong>
      <span>填写基本信息或任一经历后，版面会自动更新。</span>
    </div>
  </TemplatePaper>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ResumeRenderModel } from '@/features/resume-template/schema'
import {
  isFieldVisible,
  sectionTitles,
  visibleSections
} from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'

const props = defineProps<{ model: ResumeRenderModel }>()
const sections = computed(() => visibleSections(props.model))
</script>

<style scoped>
.creative-renderer {
  --template-ink: #202126;
  --template-body: #3d4048;
  --template-muted: #70747d;
  padding: 0;
  overflow: hidden;
}

.creative-renderer__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: calc(var(--template-page-margin) * 0.9) var(--template-page-margin);
  background: var(--template-accent);
  color: #fff;
}

.creative-renderer__header-main {
  min-width: 0;
}

.creative-renderer__role {
  margin: 0 0 7px;
  color: color-mix(in srgb, #fff 78%, var(--template-accent));
  font-size: calc(12px * var(--template-font-scale, 1));
  font-weight: 800;
}

.creative-renderer__header h1 {
  margin: 0;
  font-size: calc(35px * var(--template-font-scale, 1));
  line-height: 1.05;
}

.creative-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.creative-renderer__contacts :deep(.template-contact-item),
.creative-renderer__contacts :deep(.template-contact-item__label),
.creative-renderer__contacts :deep(.template-contact-item__value),
.creative-renderer__contacts :deep(svg) {
  color: #fff;
}

.template-paper--identity-center .creative-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .creative-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .creative-renderer__header {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .creative-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.creative-renderer__body {
  display: grid;
  gap: calc(var(--template-section-gap) * 1.15);
  padding: var(--template-section-gap) var(--template-page-margin);
}

.creative-renderer__section {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 20px;
  min-width: 0;
  break-inside: avoid;
}

.creative-renderer__section-label {
  align-self: start;
  padding: 7px 9px;
  background: var(--template-accent-soft);
  color: var(--template-accent-strong);
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 800;
  line-height: 1.3;
}

.creative-renderer__summary {
  display: grid;
  gap: 6px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.creative-renderer__summary p {
  margin: 0;
}

.creative-renderer__skills {
  display: grid;
  gap: 8px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.creative-renderer__skill-group {
  display: grid;
  grid-template-columns: minmax(90px, 0.3fr) minmax(0, 1fr);
  gap: 12px;
}

.creative-renderer__skill-group strong {
  color: var(--template-accent-strong);
}

.creative-renderer__skills p {
  margin: 0;
}

.creative-renderer :deep(.template-entry-list) {
  gap: 17px;
}

.creative-renderer :deep(.template-entry__head strong) {
  color: var(--template-accent-strong);
  font-size: calc(12px * var(--template-font-scale, 1));
}

.creative-renderer :deep(.template-entry__head time) {
  color: var(--template-muted);
}

.creative-renderer__section--experience :deep(.template-entry) {
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e6e8;
}

.creative-renderer__section--experience :deep(.template-entry:last-child) {
  padding-bottom: 0;
  border-bottom: 0;
}

.creative-renderer__empty {
  display: grid;
  gap: 6px;
  margin: var(--template-section-gap) var(--template-page-margin);
  padding: 26px 18px;
  background: var(--template-accent-soft);
  color: var(--template-muted);
  text-align: center;
}

.creative-renderer__empty strong {
  color: var(--template-accent-strong);
}

.creative-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .creative-renderer__header,
  .template-paper--identity-right .creative-renderer__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .creative-renderer__contacts,
  .template-paper--identity-right .creative-renderer__contacts {
    justify-items: start;
  }

  .creative-renderer__section {
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .creative-renderer__skill-group {
    grid-template-columns: 1fr;
    gap: 1px;
  }
}
</style>
