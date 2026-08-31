<template>
  <TemplatePaper :model="model" variant="classic" class="elegant-renderer">
    <header class="elegant-renderer__header">
      <div class="elegant-renderer__identity">
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition">
          {{ model.identity.targetPosition }}
        </p>
      </div>
      <div v-if="model.contacts.length" class="elegant-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="elegant-renderer__body">
      <section
        v-for="section in sections"
        :key="section.id"
        :data-section="section.builtinKey || section.id"
        class="elegant-renderer__section"
      >
        <TemplateSectionTitle :title="section.title" />
        <div v-if="section.builtinKey === 'summary'" class="elegant-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>
        <div v-else-if="section.builtinKey === 'skills'" class="elegant-renderer__skills">
          <span v-for="skill in model.skills" :key="skill">{{ skill }}</span>
        </div>
        <TemplateEntryList
          v-else-if="section.builtinKey === 'experience'"
          :entries="model.experience"
        />
        <TemplateEntryList
          v-else-if="section.builtinKey === 'projects'"
          :entries="model.projects"
          project
        />
        <TemplateEntryList
          v-else-if="section.builtinKey === 'education'"
          :entries="model.education"
        />
        <TemplateSectionBody v-else :section="section" />
      </section>
    </main>

    <div v-else class="elegant-renderer__empty">
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
  visibleRenderSections
} from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'
import TemplateSectionBody from '@/views/resume/templates/shared/TemplateSectionBody.vue'
import TemplateSectionTitle from '@/views/resume/templates/shared/TemplateSectionTitle.vue'

const props = defineProps<{ model: ResumeRenderModel }>()
const sections = computed(() => visibleRenderSections(props.model))
</script>

<style scoped>
.elegant-renderer {
  --template-ink: #242126;
  --template-body: #4b4650;
  --template-muted: #7a737d;
}

.elegant-renderer__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(150px, 0.42fr);
  align-items: end;
  gap: 30px;
  padding-bottom: 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--template-accent) 45%, #fff);
}

.elegant-renderer__identity h1 {
  margin: 0;
  font-size: calc(35px * var(--template-font-scale, 1));
  font-weight: 500;
  letter-spacing: 0;
  line-height: 1.1;
}

.elegant-renderer__identity p {
  margin: 9px 0 0;
  color: var(--template-accent-strong);
  font-size: calc(12px * var(--template-font-scale, 1));
  font-weight: 700;
}

.elegant-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 6px;
  padding-bottom: 2px;
}

.template-paper--identity-center .elegant-renderer__header {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .elegant-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .elegant-renderer__header {
  direction: rtl;
  text-align: right;
}

.template-paper--identity-right .elegant-renderer__identity,
.template-paper--identity-right .elegant-renderer__contacts {
  direction: ltr;
}

.template-paper--identity-right .elegant-renderer__contacts {
  justify-items: start;
}

.elegant-renderer__body {
  display: grid;
  gap: calc(var(--template-section-gap) * 1.15);
  padding-top: calc(var(--template-section-gap) * 1.2);
}

.elegant-renderer__section {
  break-inside: avoid;
}

.elegant-renderer__section :deep(.template-section-title) {
  margin-bottom: 14px;
}

.elegant-renderer__section :deep(.template-section-title h3) {
  color: var(--template-ink);
  font-family: Georgia, "Times New Roman", serif;
  font-size: calc(13px * var(--template-font-scale, 1));
  font-weight: 500;
}

.elegant-renderer__section :deep(.template-section-title span) {
  background: color-mix(in srgb, var(--template-accent) 35%, #fff);
}

.elegant-renderer__summary {
  display: grid;
  gap: 7px;
  max-width: 68ch;
  color: var(--template-body);
  font-family: Georgia, "Times New Roman", serif;
  font-size: calc(11px * var(--template-font-scale, 1));
}

.elegant-renderer__summary p {
  margin: 0;
}

.elegant-renderer__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 20px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.elegant-renderer__skills span::after {
  margin-left: 20px;
  color: color-mix(in srgb, var(--template-accent) 45%, #fff);
  content: "·";
}

.elegant-renderer__skills span:last-child::after {
  content: none;
}

.elegant-renderer :deep(.template-entry-list) {
  gap: 19px;
}

.elegant-renderer :deep(.template-entry__head strong) {
  font-family: Georgia, "Times New Roman", serif;
  font-size: calc(12.5px * var(--template-font-scale, 1));
  font-weight: 600;
}

.elegant-renderer :deep(.template-entry__head time) {
  color: var(--template-muted);
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 500;
}

.elegant-renderer :deep(.template-entry ul) {
  color: var(--template-body);
}

.elegant-renderer__empty {
  display: grid;
  gap: 7px;
  margin-top: 74px;
  padding: 24px 0;
  border-top: 1px solid #d9d4d9;
  border-bottom: 1px solid #d9d4d9;
  color: var(--template-muted);
  text-align: center;
}

.elegant-renderer__empty strong {
  color: var(--template-ink);
  font-family: Georgia, "Times New Roman", serif;
  font-weight: 600;
}

.elegant-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .elegant-renderer__header,
  .template-paper--identity-right .elegant-renderer__header {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .elegant-renderer__contacts,
  .template-paper--identity-right .elegant-renderer__contacts {
    justify-items: start;
  }
}
</style>
