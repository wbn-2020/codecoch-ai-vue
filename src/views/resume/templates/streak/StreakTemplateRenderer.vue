<template>
  <TemplatePaper :model="model" variant="classic" class="streak-renderer">
    <header class="streak-renderer__signature">
      <div class="streak-renderer__identity">
        <span
          v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition"
          class="streak-renderer__role"
        >
          {{ model.identity.targetPosition }}
        </span>
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div v-if="model.contacts.length" class="streak-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="streak-renderer__body">
      <template v-for="section in sections" :key="section.id">
        <section
          v-if="section.builtinKey === 'summary' && summaryVisible"
          class="streak-renderer__section streak-renderer__section--summary"
          data-section="summary"
        >
          <TemplateSectionTitle :title="section.title" />
          <div class="streak-renderer__summary">
            <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
          </div>
        </section>

        <section
          v-else-if="section.builtinKey === 'skills' && skillsVisible"
          class="streak-renderer__section streak-renderer__section--skills"
          data-section="skills"
        >
          <TemplateSectionTitle :title="section.title" />
          <div class="streak-renderer__skills">
            <div
              v-for="group in model.skillGroups"
              :key="group.label"
              class="streak-renderer__skill-group"
            >
              <strong>{{ group.label }}</strong>
              <span>{{ group.items.join(' / ') }}</span>
            </div>
            <p v-if="!model.skillGroups.length">{{ model.skills.join(' / ') }}</p>
          </div>
        </section>

        <section
          v-else-if="section.builtinKey && streamEntriesBySection[section.builtinKey]?.length"
          class="streak-renderer__section streak-renderer__section--stream"
          :data-section="section.builtinKey"
        >
          <TemplateSectionTitle :title="section.title" />
          <div class="streak-renderer__stream">
            <article
              v-for="entry in streamEntriesBySection[section.builtinKey]"
              :key="entry.key"
              class="streak-renderer__entry"
            >
              <div class="streak-renderer__entry-content">
                <div class="streak-renderer__entry-head">
                  <div>
                    <strong v-if="entry.title">{{ entry.title }}</strong>
                    <span v-if="entry.subtitle">{{ entry.subtitle }}</span>
                  </div>
                  <time v-if="entry.period">{{ entry.period }}</time>
                </div>
                <p v-if="entry.meta" class="streak-renderer__meta">{{ entry.meta }}</p>
                <div v-if="entry.projectSections?.length" class="streak-renderer__project-sections">
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
        </section>

        <section
          v-else-if="!section.builtinKey"
          class="streak-renderer__section streak-renderer__section--custom"
          :data-section="section.id"
        >
          <TemplateSectionTitle :title="section.title" />
          <TemplateSectionBody :section="section" />
        </section>
      </template>
    </main>

    <div v-else class="streak-renderer__empty">
      <strong>开始构建你的签名简历</strong>
      <span>填写基本信息或任一经历后，版面会自动更新。</span>
    </div>
  </TemplatePaper>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ResumeDocumentEntry } from '@/features/resume-document'
import type { ResumeRenderModel } from '@/features/resume-template/schema'
import type { ResumePresentationSection } from '@/types/resumePresentation'
import {
  hasSectionContent,
  isFieldVisible,
  sectionTitles,
  visibleRenderSections
} from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'
import TemplateSectionBody from '@/views/resume/templates/shared/TemplateSectionBody.vue'
import TemplateSectionTitle from '@/views/resume/templates/shared/TemplateSectionTitle.vue'

interface StreakStreamEntry extends ResumeDocumentEntry {
  sectionTitle: string
}

const props = defineProps<{ model: ResumeRenderModel }>()

const summaryVisible = computed(() => hasSectionContent(props.model, 'summary'))
const skillsVisible = computed(() => hasSectionContent(props.model, 'skills'))
const sections = computed(() => visibleRenderSections(props.model))

const streamEntriesBySection = computed<Record<ResumePresentationSection, StreakStreamEntry[]>>(() => {
  const toEntries = (
    section: 'experience' | 'projects' | 'education',
    source: ResumeDocumentEntry[]
  ) => source.map((entry) => ({
      ...entry,
      sectionTitle: sectionTitles[section]
    }))

  return {
    summary: [],
    skills: [],
    experience: hasSectionContent(props.model, 'experience')
      ? toEntries('experience', props.model.experience)
      : [],
    projects: hasSectionContent(props.model, 'projects')
      ? toEntries('projects', props.model.projects)
      : [],
    education: hasSectionContent(props.model, 'education')
      ? toEntries('education', props.model.education)
      : []
  }
})
</script>

<style scoped>
.streak-renderer {
  --template-ink: #3f2b1d;
  --template-body: #5a4535;
  --template-muted: #8a7160;
  border-color: #ddc7ab;
  background: #fffdf9;
}

.streak-renderer__signature {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: calc(var(--template-page-margin) * -1) calc(var(--template-page-margin) * -1) 0;
  padding: 20px var(--template-page-margin);
  border-bottom: 1px solid #d7b98f;
  background: #fff4df;
}

.streak-renderer__identity {
  min-width: 0;
}

.streak-renderer__role {
  display: block;
  margin-bottom: 5px;
  color: #a55f1f;
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 800;
  letter-spacing: 0.08em;
}

.streak-renderer__signature h1 {
  margin: 0;
  color: #6c3f00;
  font-size: calc(34px * var(--template-font-scale, 1));
  line-height: 1.08;
}

.streak-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.streak-renderer__contacts :deep(.template-contact-item),
.streak-renderer__contacts :deep(.template-contact-item__label),
.streak-renderer__contacts :deep(.template-contact-item__value),
.streak-renderer__contacts :deep(svg) {
  color: #865002;
}

.template-paper--identity-center .streak-renderer__signature {
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.template-paper--identity-center .streak-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .streak-renderer__signature {
  flex-direction: row-reverse;
  text-align: right;
}

.template-paper--identity-right .streak-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.streak-renderer__body {
  display: grid;
  gap: var(--template-section-gap);
  padding-top: var(--template-section-gap);
}

.streak-renderer__section {
  min-width: 0;
  break-inside: avoid;
}

.streak-renderer__section :deep(.template-section-title) {
  margin-bottom: 13px;
}

.streak-renderer__section :deep(.template-section-title h3) {
  color: #865002;
  font-size: calc(12px * var(--template-font-scale, 1));
  letter-spacing: 0.08em;
}

.streak-renderer__section :deep(.template-section-title span) {
  background: #d7b98f;
}

.streak-renderer__summary,
.streak-renderer__skills {
  display: grid;
  gap: 7px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.streak-renderer__summary p,
.streak-renderer__skills p {
  margin: 0;
}

.streak-renderer__skills {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.streak-renderer__skill-group {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.streak-renderer__skill-group strong {
  color: #a55f1f;
}

.streak-renderer__skill-group span {
  overflow-wrap: anywhere;
}

.streak-renderer__stream {
  display: grid;
  gap: 17px;
}

.streak-renderer__entry {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  padding-bottom: 15px;
  border-bottom: 1px solid #eadbc8;
  break-inside: avoid;
}

.streak-renderer__entry:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.streak-renderer__entry-label {
  color: #a55f1f;
  font-size: calc(9.5px * var(--template-font-scale, 1));
  font-weight: 800;
  line-height: 1.4;
}

.streak-renderer__entry-content {
  min-width: 0;
}

.streak-renderer__entry-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.streak-renderer__entry-head > div {
  min-width: 0;
}

.streak-renderer__entry-head strong {
  color: var(--template-ink);
  font-size: calc(11.5px * var(--template-font-scale, 1));
}

.streak-renderer__entry-head span {
  margin-left: 8px;
  color: var(--template-muted);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.streak-renderer__entry-head time {
  flex: 0 0 auto;
  color: #a55f1f;
  font-size: calc(10px * var(--template-font-scale, 1));
  font-weight: 700;
  white-space: nowrap;
}

.streak-renderer__meta {
  margin: 4px 0 0;
  color: #865002;
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.streak-renderer__entry-content ul {
  display: grid;
  gap: 3px;
  margin: 7px 0 0;
  padding-left: 18px;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.streak-renderer__entry-content li::marker {
  color: #c17a27;
}

.streak-renderer__project-sections {
  display: grid;
  gap: 6px;
  margin-top: 7px;
}

.streak-renderer__project-sections strong {
  color: #865002;
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.streak-renderer__empty {
  display: grid;
  gap: 6px;
  margin-top: 72px;
  padding: 30px 20px;
  border-top: 1px solid #d7b98f;
  border-bottom: 1px solid #d7b98f;
  color: var(--template-muted);
  text-align: center;
}

.streak-renderer__empty strong {
  color: #6c3f00;
}

.streak-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .streak-renderer__signature,
  .template-paper--identity-right .streak-renderer__signature {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  .streak-renderer__contacts,
  .template-paper--identity-right .streak-renderer__contacts {
    justify-items: start;
  }

  .streak-renderer__skills {
    grid-template-columns: 1fr;
  }

  .streak-renderer__entry {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .streak-renderer__entry-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }
}
</style>
