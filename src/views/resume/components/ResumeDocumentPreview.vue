<template>
  <article
    v-if="!rendererComponent"
    class="resume-document"
    :style="paperStyle"
    :class="[
      `is-${templateMeta.className}`,
      `is-${accent}`,
      `is-density-${density}`
    ]"
  >
    <aside v-if="isClassicTemplate" class="document-sidebar">
      <span class="document-sidebar__kicker">CAREER PROFILE</span>
      <strong v-if="isFieldVisible('targetPosition')" class="document-sidebar__role">{{ model.identity.targetPosition }}</strong>

      <section v-if="visibleContacts.length" class="document-sidebar__section">
        <span>CONTACT</span>
        <p v-for="item in visibleContacts" :key="item.key" class="document-contact__item">
          <component
            v-if="presentation.iconMode !== 'HIDDEN'"
            :is="item.icon"
            :size="13"
            :stroke-width="1.8"
            aria-hidden="true"
          />
          <span v-if="item.showLabel" class="document-contact__label">{{ item.label }}</span>
          <span class="document-contact__value">{{ item.value }}</span>
        </p>
      </section>

      <section v-if="isFieldVisible('skills') && model.skills.length" class="document-sidebar__section">
        <span>SKILLS</span>
        <p v-for="skill in model.skills" :key="skill">{{ skill }}</p>
      </section>
    </aside>

    <div class="document-main">
      <header class="document-header">
        <div class="document-header__identity">
          <span v-if="isFieldVisible('targetPosition')" class="document-role-label">{{ model.identity.targetPosition }}</span>
          <h2 v-if="isFieldVisible('realName')">{{ model.identity.name }}</h2>
          <p v-if="isFieldVisible('targetPosition')">{{ model.identity.targetPosition }}</p>
        </div>
        <div v-if="visibleContacts.length && !isClassicTemplate" class="document-contact">
          <span v-for="item in visibleContacts" :key="item.key" class="document-contact__item">
            <component
              v-if="presentation.iconMode !== 'HIDDEN'"
              :is="item.icon"
              :size="13"
              :stroke-width="1.8"
              aria-hidden="true"
            />
            <span v-if="item.showLabel" class="document-contact__label">{{ item.label }}</span>
            <span class="document-contact__value">{{ item.value }}</span>
          </span>
        </div>
      </header>

      <div v-if="model.hasContent || renderSections.length" class="document-body">
        <template v-for="section in renderSections" :key="section.id">
          <section v-if="section.builtinKey === 'summary' && isFieldVisible('summary') && model.summary.length" class="document-section">
            <div class="document-section__heading">
              <h3>个人摘要</h3>
              <i></i>
            </div>
            <div class="document-copy">
              <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
            </div>
          </section>

          <section v-else-if="section.builtinKey === 'skills' && isFieldVisible('skills') && model.skills.length" class="document-section skills-section">
            <div class="document-section__heading">
              <h3>专业技能</h3>
              <i></i>
            </div>
            <div v-if="templateCode === 'ATS_PROJECT_FOCUS'" class="skill-groups">
              <div v-for="group in model.skillGroups" :key="group.label">
                <strong>{{ group.label }}</strong>
                <p>{{ group.items.join(' · ') }}</p>
              </div>
            </div>
            <div v-else class="skill-list">
              <span v-for="skill in model.skills" :key="skill">{{ skill }}</span>
            </div>
          </section>

          <section v-else-if="section.builtinKey === 'experience' && isFieldVisible('workExperience') && model.experience.length" class="document-section">
            <div class="document-section__heading">
              <h3>工作经历</h3>
              <i></i>
            </div>
            <ResumeDocumentEntries :entries="model.experience" />
          </section>

          <section v-else-if="section.builtinKey === 'projects' && isFieldVisible('projects') && model.projects.length" class="document-section">
            <div class="document-section__heading">
              <h3>项目经历</h3>
              <i></i>
            </div>
            <ResumeDocumentEntries :entries="model.projects" project />
          </section>

          <section v-else-if="section.builtinKey === 'education' && isFieldVisible('educationExperience') && model.education.length" class="document-section">
            <div class="document-section__heading">
              <h3>教育经历</h3>
              <i></i>
            </div>
            <ResumeDocumentEntries :entries="model.education" />
          </section>

          <section v-else class="document-section">
            <div class="document-section__heading">
              <h3>{{ section.title }}</h3>
              <i></i>
            </div>
            <TemplateSectionBody :section="section" />
          </section>
        </template>
      </div>

      <div v-else class="document-empty">
        <FileText :size="30" />
        <strong>开始构建你的专业简历</strong>
        <span>填写姓名、目标岗位或任一经历后，这里会按所选模板实时排版。</span>
      </div>
    </div>
  </article>
  <component
    v-else
    :is="rendererComponent"
    :model="model"
    :class="[
      `is-${templateMeta.className}`,
      `is-${accent}`,
      `is-density-${density}`
    ]"
  />
</template>

<script setup lang="ts">
import { FileText, Mail, Phone } from 'lucide-vue-next'
import { computed, defineComponent, h, type PropType } from 'vue'

import {
  normalizeResumeTemplateCode,
  type ResumeAccent,
  type ResumeDocumentDraft,
  type ResumeDocumentEntry,
  type ResumePreviewDensity,
  type ResumeTemplateCode
} from '@/features/resume-document'
import { normalizeResumePresentation } from '@/features/resume-presentation'
import TemplateSectionBody from '@/views/resume/templates/shared/TemplateSectionBody.vue'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'
import { buildResumeRenderModel } from '@/features/resume-template/adapter'
import { getResumeTemplateDefinition } from '@/features/resume-template/registry'
import { getResumeRendererComponent } from '@/views/resume/templates'
import type { ResumePresentationConfig } from '@/types/resumePresentation'

const props = withDefaults(defineProps<{
  draft: ResumeDocumentDraft
  document?: ResumeDocumentV2 | null
  templateCode?: ResumeTemplateCode | string
  accent?: ResumeAccent
  density?: ResumePreviewDensity
  presentationConfig?: ResumePresentationConfig
}>(), {
  document: null,
  templateCode: 'ATS_SINGLE_COLUMN',
  accent: 'default',
  density: 'comfortable',
  presentationConfig: undefined
})

const ResumeDocumentEntries = defineComponent({
  name: 'ResumeDocumentEntries',
  props: {
    entries: {
      type: Array as PropType<ResumeDocumentEntry[]>,
      required: true
    },
    project: Boolean
  },
  setup(entryProps) {
    return () => h('div', { class: ['document-entries', { 'is-projects': entryProps.project }] },
      entryProps.entries.map((entry) => h('article', { key: entry.key, class: 'document-entry' }, [
        entry.title || entry.subtitle || entry.period
          ? h('div', { class: 'document-entry__head' }, [
            h('div', [
              entry.title ? h('strong', entry.title) : null,
              entry.subtitle ? h('span', entry.subtitle) : null
            ]),
            entry.period ? h('time', entry.period) : null
          ])
          : null,
        entry.meta ? h('p', { class: 'document-entry__meta' }, entry.meta) : null,
        entry.projectSections?.length
          ? h('div', { class: 'document-project-sections' },
            entry.projectSections.map((section) => h('section', {
              key: section.key,
              class: 'document-project-section'
            }, [
              h('strong', { class: 'document-project-section__title' }, section.title),
              h('ul', section.values.map((value) => h('li', { key: value }, value)))
            ])))
          : entry.bullets.length
          ? h('ul', entry.bullets.map((bullet) => h('li', { key: bullet }, bullet)))
          : null
      ]))
    )
  }
})

const templateCode = computed(() => normalizeResumeTemplateCode(props.templateCode))
const templateMeta = computed(() => getResumeTemplateDefinition(templateCode.value))
const presentation = computed(() => normalizeResumePresentation(
  props.presentationConfig || props.draft.presentationConfig,
  {
  templateCode: templateCode.value
  }
))
const model = computed(() => buildResumeRenderModel(props.draft, presentation.value, props.density, props.document))
const rendererComponent = computed(() =>
  getResumeRendererComponent(templateMeta.value.rendererKey)
)
const renderSections = computed(() => model.value.renderSections)
const isClassicTemplate = computed(() => templateMeta.value.layout.contactPlacement === 'sidebar')
const isFieldVisible = (field: keyof NonNullable<ResumePresentationConfig['fieldVisibility']>) =>
  presentation.value.fieldVisibility[field] !== false
  && (
    field !== 'realName'
    && field !== 'targetPosition'
    && field !== 'email'
    && field !== 'phone'
    || presentation.value.basicFieldVisibility[field] !== false
  )
const visibleContacts = computed(() => model.value.contacts.map((contact) => ({
  ...contact,
  icon: contact.iconKey === 'phone' ? Phone : Mail
})))
const paperStyle = computed(() => ({
  '--paper-font-family': presentation.value.fontFamily,
  '--paper-font-scale': String(presentation.value.fontScale),
  '--paper-line-height': String(presentation.value.lineHeight),
  '--paper-section-gap': `${17 * presentation.value.sectionSpacing}px`,
  '--paper-pad-x': `${presentation.value.pageMarginPt}px`,
  '--paper-pad-y': `${presentation.value.pageMarginPt}px`
}))
</script>

<style scoped lang="scss">
.resume-document {
  --paper-accent: #1779a7;
  --paper-accent-strong: #0d5c7f;
  --paper-accent-soft: #e9f5fa;
  --paper-ink: #17202a;
  --paper-body: #303b47;
  --paper-muted: #66717d;
  --paper-rule: #aeb9c4;
  --paper-pad-x: 42px;
  --paper-pad-y: 38px;
  --paper-body-size: 11.5px;
  --paper-line-height: 1.62;
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  height: auto;
  aspect-ratio: 210 / 297;
  min-height: max-content;
  padding: var(--paper-pad-y) var(--paper-pad-x);
  border: 1px solid #d6dce3;
  background: #fff;
  color: var(--paper-ink);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  font-family: var(--paper-font-family, Arial), "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
  overflow-wrap: anywhere;

  &.is-blue {
    --paper-accent: #3b82f6;
    --paper-accent-strong: #1d4ed8;
    --paper-accent-soft: #eff6ff;
  }

  &.is-green {
    --paper-accent: #10b981;
    --paper-accent-strong: #047857;
    --paper-accent-soft: #ecfdf5;
  }

  &.is-purple {
    --paper-accent: #8b5cf6;
    --paper-accent-strong: #6d28d9;
    --paper-accent-soft: #f5f3ff;
  }

  &.is-orange {
    --paper-accent: #f97316;
    --paper-accent-strong: #c2410c;
    --paper-accent-soft: #fff7ed;
  }

  &.is-red {
    --paper-accent: #ef4444;
    --paper-accent-strong: #b91c1c;
    --paper-accent-soft: #fef2f2;
  }

  &.is-slate {
    --paper-accent: #475569;
    --paper-accent-strong: #334155;
    --paper-accent-soft: #f1f5f9;
  }

  &.is-black {
    --paper-accent: #000000;
    --paper-accent-strong: #000000;
    --paper-accent-soft: #f5f5f5;
  }

  &.is-density-compact,
  &.is-compact {
    --paper-pad-x: 32px;
    --paper-pad-y: 28px;
    --paper-body-size: 10.5px;
    --paper-line-height: 1.48;
  }

  &.is-project {
    --paper-accent: #255da8;
    --paper-accent-strong: #173f76;
    --paper-accent-soft: #eaf1fb;
  }

  &.is-streak {
    --paper-accent: #b66e09;
    --paper-accent-strong: #865002;
    --paper-accent-soft: #fff5df;
    border: 2px solid #e9ca92;
    background:
      linear-gradient(145deg, rgba(255, 244, 219, 0.86), transparent 30%),
      #fffdf8;
  }

  &.is-classic {
    display: grid;
    grid-template-columns: 178px minmax(0, 1fr);
    padding: 0;
    background: #ffffff;
  }
}

.resume-document,
.resume-document :deep(*) {
  color: inherit;
}

.document-main {
  min-width: 0;
}

.document-header {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 0 0 20px;
  border-bottom: 2px solid var(--paper-accent);
}

.document-header__identity {
  min-width: 0;

  h2 {
    margin: 5px 0 0;
    color: var(--paper-ink);
    font-size: calc(30px * var(--paper-font-scale, 1));
    line-height: 1.14;
  }

  p {
    margin: 7px 0 0;
    color: var(--paper-accent-strong);
    font-size: calc(14px * var(--paper-font-scale, 1));
    font-weight: 700;
  }
}

.document-role-label {
  display: none;
}

.document-contact {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 5px;
  color: var(--paper-muted);
  font-size: 10.5px;
  line-height: 1.4;
  text-align: right;
}

.document-contact__item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 5px;

  > svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--paper-accent-strong);
  }
}

.document-contact__value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.document-body {
  padding-top: 4px;
}

.document-section {
  margin-top: var(--paper-section-gap, 17px);
  break-inside: avoid;
}

.document-section__heading {
  display: flex;
  align-items: center;
  margin-bottom: 9px;

  h3 {
    flex: 0 0 auto;
    margin: 0;
    padding: 4px 12px 4px 10px;
    background: var(--paper-accent);
    color: #fff;
    font-size: 14px;
    line-height: 1.35;
  }

  i {
    display: block;
    flex: 1 1 auto;
    height: 1px;
    background: var(--paper-accent);
  }
}

.document-copy {
  display: grid;
  gap: 5px;

  p {
    margin: 0;
    color: var(--paper-body);
    font-size: calc(var(--paper-body-size) * var(--paper-font-scale, 1));
    line-height: var(--paper-line-height);
    white-space: pre-wrap;
  }
}

.document-entries {
  position: relative;
  display: grid;
  gap: 12px;
}

.document-entries:not(.is-projects) {
  padding-left: 18px;

  &::before {
    position: absolute;
    top: 7px;
    bottom: 8px;
    left: 4px;
    width: 1px;
    background: color-mix(in srgb, var(--paper-accent) 34%, white);
    content: "";
  }
}

.document-entry {
  position: relative;
  break-inside: avoid;
}

.document-entries:not(.is-projects) .document-entry::before {
  position: absolute;
  top: 6px;
  left: -18px;
  width: 9px;
  height: 9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--paper-accent);
  box-shadow: 0 0 0 1px var(--paper-accent);
  content: "";
}

.document-entry__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;

  > div {
    min-width: 0;
  }

  strong {
    color: var(--paper-ink);
    font-size: 12.5px;
    line-height: 1.4;
  }

  span {
    margin-left: 8px;
    color: var(--paper-muted);
    font-size: 10.5px;
  }

  time {
    flex: 0 0 auto;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--paper-accent-soft);
    color: var(--paper-accent-strong);
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
  }
}

.document-entry__meta {
  margin: 4px 0 0;
  color: var(--paper-accent-strong);
  font-size: 10.5px;
  line-height: 1.5;
}

.document-entry ul {
  display: grid;
  gap: 3px;
  margin: 6px 0 0;
  padding-left: 18px;
  color: var(--paper-body);
  font-size: calc(var(--paper-body-size) * var(--paper-font-scale, 1));
  line-height: var(--paper-line-height);
}

.document-project-sections {
  display: grid;
  gap: 9px;
  margin-top: 8px;
}

.document-project-section {
  break-inside: avoid;

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--paper-accent-strong);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    line-height: 1.45;

    &::before {
      content: '';
      flex: none;
      width: 3px;
      height: 10px;
      border-radius: 2px;
      background: var(--paper-accent);
    }
  }

  ul {
    margin-top: 4px;
  }
}

.document-entry li::marker {
  color: var(--paper-accent);
}

.skill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    padding: 3px 8px;
    border: 1px solid color-mix(in srgb, var(--paper-accent) 28%, white);
    border-radius: 4px;
    background: var(--paper-accent-soft);
    color: var(--paper-accent-strong);
    font-size: 10.5px;
    font-weight: 700;
  }
}

.skill-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;

  div {
    min-width: 0;
  }

  strong {
    display: block;
    color: var(--paper-accent-strong);
    font-size: 10.5px;
  }

  p {
    margin: 3px 0 0;
    color: var(--paper-body);
    font-size: 10.5px;
    line-height: 1.55;
  }
}

.document-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  margin-top: 70px;
  padding: 36px;
  border: 1px dashed #bac3ce;
  border-radius: 6px;
  background: #f7f9fb;
  color: var(--paper-muted);
  text-align: center;

  strong {
    color: var(--paper-ink);
    font-size: 16px;
  }

  span {
    max-width: 330px;
    font-size: 11.5px;
    line-height: 1.65;
  }
}

.document-sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 100%;
  padding: 40px 20px;
  background: #263340;
  color: #e8eef3;
}

.document-sidebar__kicker,
.document-sidebar__section > span {
  color: #9cc8c0;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.document-sidebar__role {
  color: #ffffff;
  font-size: 16px;
  line-height: 1.45;
}

.document-sidebar__section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 14px;
  border-top: 1px solid rgba(232, 238, 243, 0.22);

  p {
    margin: 0;
    color: #d7e1e7;
    font-size: 10px;
    line-height: 1.55;
  }

  .document-contact__item {
    justify-content: flex-start;
  }

  .document-contact__item > svg {
    color: #9cc8c0;
  }
}

.resume-document.is-compact {
  min-height: 930px;

  .document-header {
    align-items: center;
    padding-bottom: 13px;
    border-bottom-width: 1px;
  }

  .document-header__identity h2 {
    font-size: 26px;
  }

  .document-section {
    margin-top: 12px;
  }

  .document-section__heading {
    gap: 8px;
    margin-bottom: 6px;

    h3 {
      padding: 0;
      background: transparent;
      color: var(--paper-accent-strong);
      font-size: 12px;
    }

    i {
      background: #bcc5cf;
    }
  }

  .document-entries {
    gap: 8px;
  }

  .document-entries:not(.is-projects) {
    padding-left: 0;

    &::before {
      display: none;
    }
  }

  .document-entries:not(.is-projects) .document-entry::before {
    display: none;
  }

  .document-entry__head time {
    padding: 0;
    background: transparent;
    color: var(--paper-muted);
    font-weight: 400;
  }

  .skill-list {
    gap: 3px 8px;

    span {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--paper-body);
      font-weight: 600;

      &::after {
        margin-left: 8px;
        color: #a3adb8;
        content: "·";
      }

      &:last-child::after {
        display: none;
      }
    }
  }
}

.resume-document.is-project {
  .document-header {
    align-items: center;
    padding: 17px 20px;
    border: 0;
    background: var(--paper-accent-strong);
  }

  .document-header__identity h2,
  .document-header__identity p,
  .document-contact {
    color: #fff;
  }

  .document-role-label {
    display: block;
    color: #cfe1fb;
    font-size: 9.5px;
    font-weight: 700;
  }

  .document-header__identity h2 {
    margin-top: 3px;
  }

  .document-body {
    padding-top: 2px;
  }

  .document-section__heading {
    gap: 9px;

    h3 {
      padding: 0;
      background: transparent;
      color: var(--paper-accent-strong);
      font-size: 13px;
    }
  }

  .document-entries.is-projects {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
  }

  .document-entries.is-projects .document-entry {
    padding: 10px 11px;
    border: 1px solid color-mix(in srgb, var(--paper-accent) 24%, white);
    border-radius: 4px;
    background: var(--paper-accent-soft);
  }

  .document-entries.is-projects .document-entry__head {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }

  .document-entries.is-projects .document-entry__head time {
    padding: 0;
    background: transparent;
  }
}

.resume-document.is-streak {
  .document-header {
    align-items: center;
    padding: 18px 20px;
    border: 0;
    background: linear-gradient(120deg, #fff1cf, #fffdf8 66%);
  }

  .document-header__identity h2 {
    color: #6c3f00;
  }

  .document-header__identity p,
  .document-contact {
    color: #865002;
  }

  .document-role-label {
    display: block;
    color: #b66e09;
    font-size: 9.5px;
    font-weight: 800;
  }

  .document-section__heading h3 {
    color: #865002;
  }
}

.resume-document.is-classic {
  .document-main {
    padding: 38px 34px;
  }

  .document-header {
    align-items: flex-start;
  }

  .document-role-label {
    display: block;
    color: var(--paper-accent-strong);
    font-size: 9.5px;
    font-weight: 800;
  }

  .document-header__identity h2 {
    margin-top: 4px;
  }
}

@media (max-width: 720px) {
  .resume-document {
    --paper-pad-x: 25px;
    --paper-pad-y: 26px;
    min-height: max-content;
  }

  .document-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .document-contact {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
    text-align: left;
  }

  .skill-groups {
    grid-template-columns: 1fr;
  }

  .resume-document.is-project .document-entries.is-projects {
    grid-template-columns: 1fr;
  }

  .resume-document.is-classic {
    grid-template-columns: 1fr;

    .document-sidebar {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      min-height: 0;
      padding: 22px 24px;
    }

    .document-sidebar__kicker,
    .document-sidebar__role {
      grid-column: 1 / -1;
    }

    .document-main {
      padding: 28px 25px;
    }
  }
}
</style>
