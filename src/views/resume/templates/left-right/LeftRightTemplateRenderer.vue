<template>
  <TemplatePaper :model="model" variant="left-right" class="left-right-renderer">
    <aside class="left-right-renderer__sidebar document-sidebar">
      <span class="left-right-renderer__label">CAREER PROFILE</span>
      <strong v-if="isFieldVisible(model, 'targetPosition')" class="left-right-renderer__role">
        {{ model.identity.targetPosition }}
      </strong>

      <section v-if="model.contacts.length" class="left-right-renderer__sidebar-section">
        <span class="left-right-renderer__label">CONTACT</span>
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </section>

      <section
        v-if="isFieldVisible(model, 'skills') && model.skills.length"
        class="left-right-renderer__sidebar-section"
      >
        <span class="left-right-renderer__label">SKILLS</span>
        <span v-for="skill in model.skills" :key="skill" class="left-right-renderer__skill">
          {{ skill }}
        </span>
      </section>
    </aside>

    <main class="left-right-renderer__main document-main">
      <header class="left-right-renderer__header">
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </header>

      <div v-if="mainSections.length" class="left-right-renderer__body">
        <section
          v-for="section in mainSections"
          :key="section"
          class="left-right-renderer__section"
        >
          <TemplateSectionTitle :title="sectionTitles[section]" />

          <div v-if="section === 'summary'" class="left-right-renderer__summary">
            <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
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
            v-else-if="section === 'education'"
            :entries="model.education"
          />
        </section>
      </div>
    </main>
  </TemplatePaper>
</template>

<script setup lang="ts">
import type { ResumeRenderModel } from '@/features/resume-template/schema'
import { computed } from 'vue'
import { isFieldVisible, sectionTitles, visibleSections } from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'
import TemplateSectionTitle from '@/views/resume/templates/shared/TemplateSectionTitle.vue'

const props = defineProps<{
  model: ResumeRenderModel
}>()

const mainSections = computed(() =>
  visibleSections(props.model).filter((section) => section !== 'skills')
)
</script>

<style scoped>
.left-right-renderer__sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 38px 20px;
  background: #263b45;
  color: #eef4f3;
}

.left-right-renderer__label {
  color: #a9d2c9;
  font-size: calc(9px * var(--template-font-scale, 1));
  font-weight: 800;
  letter-spacing: 0.08em;
}

.left-right-renderer__role {
  color: #fff;
  font-size: calc(16px * var(--template-font-scale, 1));
  line-height: 1.45;
}

.left-right-renderer__sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 14px;
  border-top: 1px solid rgba(238, 244, 243, 0.22);
}

.left-right-renderer__sidebar :deep(.template-contact-item) {
  color: #d9e7e4;
}

.left-right-renderer__sidebar :deep(.template-contact-item svg) {
  color: #a9d2c9;
}

.left-right-renderer__skill {
  color: #d9e7e4;
  font-size: calc(10px * var(--template-font-scale, 1));
  line-height: 1.55;
}

.left-right-renderer__main {
  min-width: 0;
  padding: 38px 34px;
}

.left-right-renderer__header {
  padding-bottom: 18px;
  border-bottom: 2px solid var(--template-accent);
}

.left-right-renderer__header h1 {
  margin: 0;
  color: var(--template-ink);
  font-size: calc(30px * var(--template-font-scale, 1));
  line-height: 1.15;
}

.left-right-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: 4px;
}

.left-right-renderer__section {
  break-inside: avoid;
}

.left-right-renderer__summary {
  display: grid;
  gap: 5px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.left-right-renderer__summary p {
  margin: 0;
}

.left-right-renderer__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.left-right-renderer__skills span {
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
  font-weight: 700;
}

@container template-paper (max-width: 640px) {
  .left-right-renderer__sidebar {
    min-height: auto;
    padding: 24px;
  }

  .left-right-renderer__main {
    padding: 28px 24px;
  }
}
</style>
