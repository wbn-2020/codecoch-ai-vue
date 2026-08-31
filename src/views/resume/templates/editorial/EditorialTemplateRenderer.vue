<template>
  <TemplatePaper :model="model" variant="classic" class="editorial-renderer">
    <header class="editorial-renderer__masthead">
      <div class="editorial-renderer__identity">
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
        <p
          v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition"
          class="editorial-renderer__role"
        >
          {{ model.identity.targetPosition }}
        </p>
      </div>

      <div v-if="model.contacts.length" class="editorial-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="editorial-renderer__body">
      <section
        v-for="section in sections"
        :key="section.id"
        class="editorial-renderer__section"
        :data-section="section.builtinKey || section.id"
      >
        <TemplateSectionTitle :title="section.title" />

        <div v-if="section.builtinKey === 'summary'" class="editorial-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div v-else-if="section.builtinKey === 'skills'" class="editorial-renderer__skills">
          <div
            v-for="group in model.skillGroups"
            :key="group.label"
            class="editorial-renderer__skill-group"
          >
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(' / ') }}</span>
          </div>
          <p v-if="!model.skillGroups.length">{{ model.skills.join(' / ') }}</p>
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

    <div v-else class="editorial-renderer__empty">
      <strong>简历内容将在这里呈现</strong>
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

const props = defineProps<{
  model: ResumeRenderModel
}>()

const sections = computed(() => visibleRenderSections(props.model))
</script>

<style scoped>
.editorial-renderer {
  --template-ink: #16191d;
  --template-body: #343a40;
  --template-muted: #66707a;
}

.editorial-renderer__masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--template-ink);
}

.editorial-renderer__identity {
  min-width: 0;
}

.editorial-renderer__identity h1 {
  margin: 0;
  color: var(--template-ink);
  font-size: calc(34px * var(--template-font-scale, 1));
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: 0;
  text-wrap: balance;
}

.editorial-renderer__role {
  margin: 8px 0 0;
  color: var(--template-accent-strong);
  font-size: calc(13px * var(--template-font-scale, 1));
  font-weight: 700;
  line-height: 1.4;
}

.editorial-renderer__contacts {
  display: flex;
  max-width: 54%;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px 16px;
}

.template-paper--identity-center .editorial-renderer__masthead {
  align-items: center;
  flex-direction: column;
  gap: 12px;
  text-align: center;
}

.template-paper--identity-center .editorial-renderer__contacts {
  max-width: 100%;
  justify-content: center;
}

.template-paper--identity-right .editorial-renderer__masthead {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .editorial-renderer__contacts {
  justify-content: flex-start;
}

.editorial-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: var(--template-section-gap);
}

.editorial-renderer__section {
  min-width: 0;
  break-inside: avoid;
}

.editorial-renderer__section :deep(.template-section-title) {
  margin-bottom: 12px;
}

.editorial-renderer__section :deep(.template-section-title h3) {
  color: var(--template-ink);
  font-size: calc(12px * var(--template-font-scale, 1));
  font-weight: 800;
  letter-spacing: 0;
}

.editorial-renderer__section :deep(.template-section-title span) {
  background: color-mix(in srgb, var(--template-accent) 70%, var(--template-ink));
}

.editorial-renderer__summary {
  display: grid;
  gap: 7px;
  max-width: 72ch;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.editorial-renderer__summary p,
.editorial-renderer__skills p {
  margin: 0;
}

.editorial-renderer__skills {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.editorial-renderer__skill-group {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.editorial-renderer__skill-group strong {
  color: var(--template-accent-strong);
  font-size: inherit;
}

.editorial-renderer__skill-group span {
  overflow-wrap: anywhere;
}

.editorial-renderer__skills > p {
  grid-column: 1 / -1;
  max-width: 72ch;
  line-height: var(--template-line-height);
}

.editorial-renderer :deep(.template-entry-list) {
  gap: 16px;
}

.editorial-renderer :deep(.template-entry__head strong) {
  color: var(--template-ink);
  font-size: calc(11.5px * var(--template-font-scale, 1));
}

.editorial-renderer :deep(.template-entry__head time) {
  color: var(--template-muted);
  font-weight: 600;
}

.editorial-renderer__empty {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin-top: 72px;
  padding: 30px 20px;
  border-top: 1px solid #c9ced3;
  border-bottom: 1px solid #c9ced3;
  color: var(--template-muted);
  text-align: center;
}

.editorial-renderer__empty strong {
  color: var(--template-ink);
}

.editorial-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .editorial-renderer__masthead,
  .template-paper--identity-right .editorial-renderer__masthead {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .editorial-renderer__contacts,
  .template-paper--identity-right .editorial-renderer__contacts {
    max-width: 100%;
    justify-content: flex-start;
  }

  .editorial-renderer__skills {
    grid-template-columns: 1fr;
  }
}
</style>
