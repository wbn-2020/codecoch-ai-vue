<template>
  <TemplatePaper :model="model" variant="modern" class="modern-renderer">
    <header class="modern-renderer__header">
      <div class="modern-renderer__identity">
        <span v-if="isFieldVisible(model, 'targetPosition')" class="modern-renderer__kicker">
          {{ model.identity.targetPosition }}
        </span>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div v-if="model.contacts.length" class="modern-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <div v-if="visibleRenderSections(model).length" class="modern-renderer__body">
      <section
        v-for="section in visibleRenderSections(model)"
        :key="section.id"
        class="modern-renderer__section"
      >
        <TemplateSectionTitle :title="section.title" tone="band" />

        <div v-if="section.builtinKey === 'summary'" class="modern-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div v-else-if="section.builtinKey === 'skills'" class="modern-renderer__skills">
          <div v-for="group in model.skillGroups" :key="group.label" class="modern-renderer__skill-group">
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(' · ') }}</span>
          </div>
          <div v-if="!model.skillGroups.length" class="modern-renderer__skill-list">
            <span v-for="skill in model.skills" :key="skill">{{ skill }}</span>
          </div>
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
    </div>
  </TemplatePaper>
</template>

<script setup lang="ts">
import type { ResumeRenderModel } from '@/features/resume-template/schema'
import { isFieldVisible, visibleRenderSections } from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'
import TemplateSectionBody from '@/views/resume/templates/shared/TemplateSectionBody.vue'
import TemplateSectionTitle from '@/views/resume/templates/shared/TemplateSectionTitle.vue'

defineProps<{
  model: ResumeRenderModel
}>()
</script>

<style scoped>
.modern-renderer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: calc(var(--template-page-margin) * -1) calc(var(--template-page-margin) * -1) 0;
  padding: 22px var(--template-page-margin);
  background: var(--template-accent-strong);
  color: #fff;
}

.template-paper--identity-center .modern-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .modern-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .modern-renderer__header {
  flex-direction: row-reverse;
}

.template-paper--identity-right .modern-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.modern-renderer__identity {
  min-width: 0;
}

.modern-renderer__kicker {
  display: block;
  margin-bottom: 4px;
  color: #d8eef0;
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 800;
  letter-spacing: 0.08em;
}

.modern-renderer__header h1 {
  margin: 0;
  color: #fff;
  font-size: calc(30px * var(--template-font-scale, 1));
  line-height: 1.15;
}

.modern-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.modern-renderer__contacts :deep(.template-contact-item) {
  color: #e7f1f2;
}

.modern-renderer__contacts :deep(.template-contact-item svg) {
  color: #b8dcda;
}

.modern-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: var(--template-section-gap);
}

.modern-renderer__section {
  break-inside: avoid;
}

.modern-renderer__summary {
  display: grid;
  gap: 5px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.modern-renderer__summary p {
  margin: 0;
}

.modern-renderer__skills {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px 18px;
}

.modern-renderer__skill-group {
  display: grid;
  gap: 3px;
}

.modern-renderer__skill-group strong {
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.modern-renderer__skill-group span {
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.modern-renderer__skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  grid-column: 1 / -1;
}

.modern-renderer__skill-list span {
  padding: 3px 8px;
  background: var(--template-accent-soft);
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
  font-weight: 700;
}

@container template-paper (max-width: 640px) {
  .modern-renderer__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .modern-renderer__contacts {
    justify-items: start;
  }

  .modern-renderer__skills {
    grid-template-columns: 1fr;
  }
}
</style>
