<template>
  <TemplatePaper :model="model" variant="modern" class="minimalist-renderer">
    <header class="minimalist-renderer__header">
      <div class="minimalist-renderer__identity">
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition">
          {{ model.identity.targetPosition }}
        </p>
      </div>
      <div v-if="model.contacts.length" class="minimalist-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="minimalist-renderer__body">
      <section
        v-for="section in sections"
        :key="section"
        :data-section="section"
        class="minimalist-renderer__section"
      >
        <h2>{{ sectionTitles[section] }}</h2>
        <div v-if="section === 'summary'" class="minimalist-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>
        <div v-else-if="section === 'skills'" class="minimalist-renderer__skills">
          <div v-for="group in model.skillGroups" :key="group.label">
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(', ') }}</span>
          </div>
          <p v-if="!model.skillGroups.length">{{ model.skills.join(', ') }}</p>
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

    <div v-else class="minimalist-renderer__empty">
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
.minimalist-renderer {
  --template-ink: #202428;
  --template-body: #3d454b;
  --template-muted: #737b81;
  border-color: #e3e5e6;
}

.minimalist-renderer__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 30px;
}

.minimalist-renderer__identity h1 {
  margin: 0;
  font-size: calc(29px * var(--template-font-scale, 1));
  font-weight: 650;
  line-height: 1.15;
}

.minimalist-renderer__identity p {
  margin: 7px 0 0;
  color: var(--template-muted);
  font-size: calc(12px * var(--template-font-scale, 1));
}

.minimalist-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 3px;
}

.template-paper--identity-center .minimalist-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .minimalist-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .minimalist-renderer__header {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .minimalist-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.minimalist-renderer__body {
  display: grid;
  gap: calc(var(--template-section-gap) * 1.35);
}

.minimalist-renderer__section {
  break-inside: avoid;
}

.minimalist-renderer__section h2 {
  margin: 0 0 12px;
  color: var(--template-ink);
  font-size: calc(11px * var(--template-font-scale, 1));
  font-weight: 800;
}

.minimalist-renderer__summary {
  display: grid;
  gap: 6px;
  max-width: 70ch;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.minimalist-renderer__summary p {
  margin: 0;
}

.minimalist-renderer__skills {
  display: grid;
  gap: 6px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.minimalist-renderer__skills div {
  display: grid;
  grid-template-columns: minmax(90px, 0.3fr) minmax(0, 1fr);
  gap: 16px;
}

.minimalist-renderer__skills strong {
  color: var(--template-ink);
}

.minimalist-renderer__skills p {
  margin: 0;
}

.minimalist-renderer :deep(.template-entry-list) {
  gap: 20px;
}

.minimalist-renderer :deep(.template-entry__head strong) {
  font-weight: 700;
}

.minimalist-renderer :deep(.template-entry__head time),
.minimalist-renderer :deep(.template-entry__meta) {
  color: var(--template-muted);
  font-weight: 500;
}

.minimalist-renderer :deep(.template-entry ul) {
  padding-left: 14px;
}

.minimalist-renderer :deep(.template-entry li::marker) {
  color: var(--template-muted);
}

.minimalist-renderer__empty {
  display: grid;
  gap: 6px;
  margin-top: 72px;
  color: var(--template-muted);
  text-align: center;
}

.minimalist-renderer__empty strong {
  color: var(--template-ink);
}

.minimalist-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .minimalist-renderer__header,
  .template-paper--identity-right .minimalist-renderer__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .minimalist-renderer__contacts,
  .template-paper--identity-right .minimalist-renderer__contacts {
    justify-items: start;
  }

  .minimalist-renderer__skills div {
    grid-template-columns: 1fr;
    gap: 1px;
  }
}
</style>
