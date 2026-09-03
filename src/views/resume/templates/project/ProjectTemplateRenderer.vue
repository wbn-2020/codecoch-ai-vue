<template>
  <TemplatePaper :model="model" variant="modern" class="project-renderer">
    <header class="project-renderer__header">
      <div class="project-renderer__identity">
        <span
          v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition"
          class="project-renderer__role"
        >
          {{ model.identity.targetPosition }}
        </span>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div v-if="model.contacts.length" class="project-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="project-renderer__body">
      <section
        v-for="section in sections"
        :key="section.id"
        :data-section="section.builtinKey || section.id"
        :class="['project-renderer__section', `project-renderer__section--${section.builtinKey || 'custom'}`]"
      >
        <TemplateSectionTitle :title="section.title" />

        <div v-if="section.builtinKey === 'summary'" class="project-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div v-else-if="section.builtinKey === 'skills'" class="project-renderer__skills">
          <div
            v-for="group in model.skillGroups"
            :key="group.label"
            class="project-renderer__skill-group"
          >
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(' · ') }}</span>
          </div>
          <p v-if="!model.skillGroups.length">{{ model.skills.join(' · ') }}</p>
        </div>

        <TemplateEntryList
          v-else-if="section.builtinKey === 'projects'"
          :entries="model.projects"
          project
        />
        <TemplateEntryList
          v-else-if="section.builtinKey === 'experience'"
          :entries="model.experience"
        />
        <TemplateEntryList
          v-else-if="section.builtinKey === 'education'"
          :entries="model.education"
        />
        <TemplateSectionBody v-else :section="section" />
      </section>
    </main>

    <div v-else class="project-renderer__empty">
      <strong>开始构建你的项目型简历</strong>
      <span>填写基本信息、技能或项目经历后，版面会自动更新。</span>
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
.project-renderer {
  --template-ink: #182b3d;
  --template-body: #354b60;
  --template-muted: #708294;
}

.project-renderer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: calc(var(--template-page-margin) * -1) calc(var(--template-page-margin) * -1) 0;
  padding: 18px var(--template-page-margin);
  background: transparent;
  border-bottom: 2px solid var(--template-accent);
  color: var(--template-ink);
}

.project-renderer__identity {
  min-width: 0;
}

.project-renderer__role {
  display: block;
  margin-bottom: 4px;
  color: var(--template-accent-strong);
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 800;
}

.project-renderer__header h1 {
  margin: 0;
  color: var(--template-ink);
  font-size: calc(30px * var(--template-font-scale, 1));
  line-height: 1.12;
}

.project-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.project-renderer__contacts :deep(.template-contact-item),
.project-renderer__contacts :deep(.template-contact-item__label),
.project-renderer__contacts :deep(.template-contact-item__value),
.project-renderer__contacts :deep(svg) {
  color: var(--template-body);
}

.project-renderer__contacts :deep(svg) {
  color: var(--template-accent);
}

.template-paper--identity-center .project-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .project-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .project-renderer__header {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .project-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.project-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: var(--template-section-gap);
}

.project-renderer__section {
  min-width: 0;
  break-inside: avoid;
}

.project-renderer__section--projects :deep(.template-entry-list) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.project-renderer__section--projects :deep(.template-entry) {
  padding: 10px 11px;
  border: 1px solid color-mix(in srgb, var(--template-accent) 28%, white);
  border-radius: 4px;
  background: var(--template-accent-soft);
}

.project-renderer__section--projects :deep(.template-entry__head) {
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
}

.project-renderer__section--projects :deep(.template-entry__head time) {
  color: var(--template-muted);
}

.project-renderer__summary {
  display: grid;
  gap: 6px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.project-renderer__summary p,
.project-renderer__skills p {
  margin: 0;
}

.project-renderer__skills {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 22px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.project-renderer__skill-group {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.project-renderer__skill-group strong {
  color: var(--template-accent-strong);
}

.project-renderer__skill-group span {
  overflow-wrap: anywhere;
}

.project-renderer__empty {
  display: grid;
  gap: 6px;
  margin-top: 72px;
  padding: 28px 18px;
  border: 1px solid color-mix(in srgb, var(--template-accent) 28%, white);
  background: var(--template-accent-soft);
  color: var(--template-muted);
  text-align: center;
}

.project-renderer__empty strong {
  color: var(--template-accent-strong);
}

.project-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .project-renderer__header,
  .template-paper--identity-right .project-renderer__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .project-renderer__contacts,
  .template-paper--identity-right .project-renderer__contacts {
    justify-items: start;
  }

  .project-renderer__skills,
  .project-renderer__section--projects :deep(.template-entry-list) {
    grid-template-columns: 1fr;
  }
}
</style>
