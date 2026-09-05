<template>
  <TemplatePaper :model="model" variant="classic" class="classic-renderer">
    <header class="classic-renderer__header">
      <div>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition">
          {{ model.identity.targetPosition }}
        </p>
      </div>
      <div v-if="model.contacts.length" class="classic-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <div v-if="visibleRenderSections(model).length" class="classic-renderer__body">
      <section
        v-for="section in visibleRenderSections(model)"
        :key="section.id"
        class="classic-renderer__section"
        :data-section="section.builtinKey || section.id"
      >
        <TemplateSectionTitle :title="section.title" tone="classic" />

        <div v-if="section.builtinKey === 'summary'" class="classic-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div v-else-if="section.builtinKey === 'skills'" class="classic-renderer__skills">
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
    </div>

    <div v-else class="classic-renderer__empty">
      <strong>开始构建你的专业简历</strong>
      <span>填写姓名、目标岗位或任一经历后，这里会按所选模板实时排版。</span>
    </div>
  </TemplatePaper>
</template>

<script setup lang="ts">
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

defineProps<{
  model: ResumeRenderModel
}>()
</script>

<style scoped>
.classic-renderer__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--template-accent);
}

.template-paper--identity-center .classic-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .classic-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .classic-renderer__header {
  flex-direction: row-reverse;
}

.template-paper--identity-right .classic-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.classic-renderer__header h1 {
  margin: 0;
  color: var(--template-ink);
  font-size: calc(30px * var(--template-font-scale, 1));
  line-height: 1.15;
}

.classic-renderer__header p {
  margin: 7px 0 0;
  color: var(--template-accent-strong);
  font-size: calc(14px * var(--template-font-scale, 1));
  font-weight: 700;
}

.classic-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.classic-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: 4px;
}

.classic-renderer__section {
  break-inside: avoid;
}

.classic-renderer__summary {
  display: grid;
  gap: 5px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.classic-renderer__summary p {
  margin: 0;
}

.classic-renderer__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.classic-renderer__skills span {
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--template-accent) 28%, white);
  border-radius: 3px;
  background: var(--template-accent-soft);
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
  font-weight: 700;
}

.classic-renderer__empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-top: 70px;
  padding: 36px;
  border: 1px dashed #bac3ce;
  background: #f7f9fb;
  color: var(--template-muted);
  text-align: center;
}

.classic-renderer__empty strong {
  color: var(--template-ink);
}

.classic-renderer__empty span {
  max-width: 330px;
  font-size: 11.5px;
}

@container template-paper (max-width: 640px) {
  .classic-renderer__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .classic-renderer__contacts {
    justify-items: start;
  }
}
</style>
