<template>
  <TemplatePaper :model="model" variant="modern" class="timeline-renderer">
    <header class="timeline-renderer__header">
      <div class="timeline-renderer__identity">
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition" class="timeline-renderer__role">
          {{ model.identity.targetPosition }}
        </p>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div v-if="model.contacts.length" class="timeline-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="timeline-renderer__body">
      <section
        v-for="section in sections"
        :key="section.id"
        :data-section="section.builtinKey || section.id"
        class="timeline-renderer__section"
      >
        <TemplateSectionTitle :title="section.title" />

        <div v-if="section.builtinKey === 'summary'" class="timeline-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div v-else-if="section.builtinKey === 'skills'" class="timeline-renderer__skills">
          <span v-for="skill in model.skills" :key="skill">{{ skill }}</span>
        </div>

        <div v-else-if="section.builtinKey" class="timeline-renderer__track">
          <article
            v-for="entry in entriesFor(section.builtinKey)"
            :key="entry.key"
            class="timeline-renderer__entry"
          >
            <div class="timeline-renderer__marker" aria-hidden="true"></div>
            <div class="timeline-renderer__entry-content">
              <div class="timeline-renderer__entry-head">
                <div>
                  <strong v-if="entry.title">{{ entry.title }}</strong>
                  <span v-if="entry.subtitle">{{ entry.subtitle }}</span>
                </div>
                <time v-if="entry.period">{{ entry.period }}</time>
              </div>
              <p v-if="entry.meta" class="timeline-renderer__meta">{{ entry.meta }}</p>
              <div v-if="entry.projectSections?.length" class="timeline-renderer__project-sections">
                <section v-for="projectSection in entry.projectSections" :key="projectSection.key">
                  <strong>{{ projectSection.title }}</strong>
                  <ul>
                    <li v-for="value in projectSection.values" :key="value">{{ value }}</li>
                  </ul>
                </section>
              </div>
              <ul v-else-if="entry.bullets.length">
                <li v-for="bullet in entry.bullets" :key="bullet">{{ bullet }}</li>
              </ul>
            </div>
          </article>
        </div>
        <TemplateSectionBody v-else :section="section" />
      </section>
    </main>

    <div v-else class="timeline-renderer__empty">
      <strong>开始构建你的专业简历</strong>
      <span>填写基本信息或任一经历后，版面会自动更新。</span>
    </div>
  </TemplatePaper>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ResumeDocumentEntry } from '@/features/resume-document'
import type { ResumeRenderModel } from '@/features/resume-template/schema'
import {
  isFieldVisible,
  visibleRenderSections
} from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'
import TemplateSectionBody from '@/views/resume/templates/shared/TemplateSectionBody.vue'
import TemplateSectionTitle from '@/views/resume/templates/shared/TemplateSectionTitle.vue'
import type { ResumePresentationSection } from '@/types/resumePresentation'

const props = defineProps<{ model: ResumeRenderModel }>()
const sections = computed(() => visibleRenderSections(props.model))

const entriesFor = (section: ResumePresentationSection): ResumeDocumentEntry[] => {
  if (section === 'experience') return props.model.experience
  if (section === 'projects') return props.model.projects
  if (section === 'education') return props.model.education
  return []
}
</script>

<style scoped>
.timeline-renderer {
  --template-ink: #17222b;
  --template-body: #384650;
  --template-muted: #6e7b84;
}

.timeline-renderer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  border-bottom: 1px solid #d7dde0;
}

.timeline-renderer__identity h1 {
  margin: 4px 0 0;
  font-size: calc(32px * var(--template-font-scale, 1));
  line-height: 1.08;
}

.timeline-renderer__role {
  margin: 0;
  color: var(--template-accent-strong);
  font-size: calc(12px * var(--template-font-scale, 1));
  font-weight: 800;
}

.timeline-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 6px;
}

.template-paper--identity-center .timeline-renderer__header {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .timeline-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .timeline-renderer__header {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .timeline-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.timeline-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: var(--template-section-gap);
}

.timeline-renderer__section {
  break-inside: avoid;
}

.timeline-renderer__track {
  position: relative;
  display: grid;
  gap: 18px;
  padding-left: 22px;
}

.timeline-renderer__track::before {
  position: absolute;
  inset: 4px auto 4px 5px;
  width: 1px;
  background: #c8d0d4;
  content: "";
}

.timeline-renderer__entry {
  position: relative;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 10px;
  break-inside: avoid;
}

.timeline-renderer__marker {
  position: absolute;
  top: 5px;
  left: -22px;
  width: 9px;
  height: 9px;
  border: 2px solid var(--template-accent);
  border-radius: 50%;
  background: #fff;
}

.timeline-renderer__entry-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.timeline-renderer__entry-head > div {
  min-width: 0;
}

.timeline-renderer__entry-head strong {
  font-size: calc(12px * var(--template-font-scale, 1));
}

.timeline-renderer__entry-head span {
  margin-left: 8px;
  color: var(--template-muted);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.timeline-renderer__entry-head time {
  flex: 0 0 auto;
  color: var(--template-accent-strong);
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 800;
}

.timeline-renderer__meta {
  margin: 4px 0 0;
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.timeline-renderer__entry-content ul {
  display: grid;
  gap: 3px;
  margin: 7px 0 0;
  padding-left: 18px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.timeline-renderer__entry-content li::marker {
  color: var(--template-accent);
}

.timeline-renderer__project-sections {
  display: grid;
  gap: 6px;
  margin-top: 7px;
}

.timeline-renderer__project-sections strong {
  color: var(--template-accent-strong);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.timeline-renderer__summary {
  display: grid;
  gap: 6px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.timeline-renderer__summary p {
  margin: 0;
}

.timeline-renderer__skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.timeline-renderer__skills span::before {
  margin-right: 7px;
  color: var(--template-accent);
  content: "•";
}

.timeline-renderer__empty {
  display: grid;
  gap: 6px;
  margin-top: 72px;
  color: var(--template-muted);
  text-align: center;
}

.timeline-renderer__empty strong {
  color: var(--template-ink);
}

.timeline-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .timeline-renderer__header,
  .template-paper--identity-right .timeline-renderer__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .timeline-renderer__contacts,
  .template-paper--identity-right .timeline-renderer__contacts {
    justify-items: start;
  }

  .timeline-renderer__entry-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
}
</style>
