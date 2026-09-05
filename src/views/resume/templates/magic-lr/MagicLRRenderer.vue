<template>
  <TemplatePaper :model="model" variant="modern" class="magic-lr-renderer">
    <header
      class="magic-lr__header"
      :class="[`magic-lr__header--${model.basicLayout.toLowerCase()}`]"
    >
      <div
        class="magic-lr__identity"
        :class="[`magic-lr__identity--${model.basicLayout.toLowerCase()}`]"
      >
        <div
          v-if="model.avatar.visible"
          class="magic-lr__photo"
          :class="`magic-lr__photo--${model.avatar.shape.toLowerCase()}`"
        >
          <img :src="model.avatar.url" :alt="model.identity.name">
        </div>
        <div
          class="magic-lr__name-title"
          :class="[`magic-lr__name-title--${model.basicLayout.toLowerCase()}`]"
        >
          <h1 v-if="model.identity.name">{{ model.identity.name }}</h1>
          <h2 v-if="model.identity.targetPosition">{{ model.identity.targetPosition }}</h2>
        </div>
      </div>

      <div v-if="visibleContacts.length" class="magic-lr__fields">
        <div v-for="contact in visibleContacts" :key="contact.key" class="magic-lr__field">
          <template v-if="iconOn">
            <component
              :is="iconFor(contact.iconKey)"
              class="magic-lr__field-icon"
              aria-hidden="true"
            />
            <a
              v-if="contact.iconKey === 'mail'"
              :href="`mailto:${contact.value}`"
              class="magic-lr__link"
            >{{ contact.value }}</a>
            <span v-else class="magic-lr__field-value">{{ contact.value }}</span>
          </template>
          <template v-else>
            <span class="magic-lr__field-label">{{ contact.label }}:</span>
            <span class="magic-lr__field-value">{{ contact.value }}</span>
          </template>
        </div>
      </div>
    </header>

    <main class="magic-lr__body">
      <section
        v-for="section in sections"
        :key="section.id"
        :data-section="section.builtinKey || section.id"
        class="magic-lr__section"
      >
        <div class="magic-lr__title-wrap">
          <div class="magic-lr__title-band" aria-hidden="true" />
          <h3 class="magic-lr__title" style="color: var(--template-accent); border-left-color: var(--template-accent);">
            {{ section.title }}
          </h3>
        </div>

        <div v-if="section.builtinKey === 'summary'" class="magic-lr__rich">
          <p v-for="paragraph in model.summary" :key="paragraph" v-html="md(paragraph)" />
        </div>

        <ul v-else-if="section.builtinKey === 'skills'" class="magic-lr__list">
          <template v-if="model.skillGroups.length">
            <li v-for="group in model.skillGroups" :key="group.label" v-html="md(`${group.label}：${group.items.join('、')}`)" />
          </template>
          <template v-else>
            <li v-for="skill in model.skills" :key="skill" v-html="md(skill)" />
          </template>
        </ul>

        <template v-else-if="section.builtinKey === 'experience'">
          <article v-for="entry in model.experience" :key="entry.key" class="magic-lr__entry">
            <div class="magic-lr__entry-head">
              <strong class="magic-lr__entry-title">{{ entry.title }}</strong>
              <span v-if="entry.subtitle" class="magic-lr__entry-sub">{{ entry.subtitle }}</span>
              <time v-if="entry.period" class="magic-lr__entry-time">{{ entry.period }}</time>
            </div>
            <p v-if="entry.meta" class="magic-lr__entry-meta">{{ entry.meta }}</p>
            <ul v-if="entry.bullets.length" class="magic-lr__list magic-lr__list--entry">
              <li v-for="bullet in entry.bullets" :key="bullet" v-html="md(bullet)" />
            </ul>
          </article>
        </template>

        <template v-else-if="section.builtinKey === 'education'">
          <article v-for="entry in model.education" :key="entry.key" class="magic-lr__entry">
            <div class="magic-lr__entry-head">
              <strong class="magic-lr__entry-title">{{ entry.title }}</strong>
              <span v-if="entry.subtitle" class="magic-lr__entry-sub">{{ entry.subtitle }}</span>
              <time v-if="entry.period" class="magic-lr__entry-time">{{ entry.period }}</time>
            </div>
            <p v-if="entry.meta" class="magic-lr__entry-meta">{{ entry.meta }}</p>
            <ul v-if="entry.bullets.length" class="magic-lr__list magic-lr__list--entry">
              <li v-for="bullet in entry.bullets" :key="bullet" v-html="md(bullet)" />
            </ul>
          </article>
        </template>

        <template v-else-if="section.builtinKey === 'projects'">
          <article v-for="entry in model.projects" :key="entry.key" class="magic-lr__entry">
            <div class="magic-lr__entry-head">
              <strong class="magic-lr__entry-title">{{ entry.title }}</strong>
              <span v-if="entry.subtitle" class="magic-lr__entry-sub">{{ entry.subtitle }}</span>
              <time v-if="entry.period" class="magic-lr__entry-time">{{ entry.period }}</time>
            </div>
            <p v-if="entry.meta" class="magic-lr__entry-meta">{{ entry.meta }}</p>
            <div v-if="entry.projectSections?.length" class="magic-lr__project-groups">
              <section v-for="group in entry.projectSections" :key="group.key">
                <strong class="magic-lr__group-title">{{ group.title }}</strong>
                <ul class="magic-lr__list magic-lr__list--group">
                  <li v-for="value in group.values" :key="value" v-html="md(value)" />
                </ul>
              </section>
            </div>
            <ul v-else-if="entry.bullets.length" class="magic-lr__list magic-lr__list--entry">
              <li v-for="bullet in entry.bullets" :key="bullet">{{ bullet }}</li>
            </ul>
          </article>
        </template>

        <ul v-else-if="section.certificates?.length" class="magic-lr__list">
          <li v-for="cert in section.certificates" :key="cert.name + cert.date">
            <strong>{{ cert.name }}</strong><template v-if="cert.issuer"> · {{ cert.issuer }}</template><template v-if="cert.date">（{{ cert.date }}）</template>
          </li>
        </ul>

        <div v-else-if="section.kind === 'custom' && section.blocks?.length" class="magic-lr__rich">
          <template v-for="block in section.blocks" :key="block.id">
            <p v-if="block.kind === 'line'" v-html="md(block.text)" />
            <ul v-else-if="block.kind === 'bullet'" class="magic-lr__list">
              <li v-html="md(block.text)" />
            </ul>
            <ol v-else class="magic-lr__list magic-lr__list--ordered">
              <li v-html="md(block.text)" />
            </ol>
          </template>
        </div>

        <template v-else-if="section.kind === 'custom' && section.entries?.length">
          <article v-for="entry in section.entries" :key="entry.key" class="magic-lr__entry">
            <div class="magic-lr__entry-head">
              <strong class="magic-lr__entry-title">{{ entry.title }}</strong>
              <span v-if="entry.subtitle" class="magic-lr__entry-sub">{{ entry.subtitle }}</span>
              <time v-if="entry.period" class="magic-lr__entry-time">{{ entry.period }}</time>
            </div>
            <p v-if="entry.meta" class="magic-lr__entry-meta">{{ entry.meta }}</p>
            <ul v-if="entry.bullets.length" class="magic-lr__list magic-lr__list--entry">
              <li v-for="bullet in entry.bullets" :key="bullet" v-html="md(bullet)" />
            </ul>
          </article>
        </template>
      </section>
    </main>
  </TemplatePaper>
</template>

<script setup lang="ts">
import {
  Briefcase,
  Circle,
  GraduationCap,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  User
} from 'lucide-vue-next'
import { computed, type Component } from 'vue'

import type { ResumeRenderModel, ResumeContactIconKey, ResumeRenderSection } from '@/features/resume-template/schema'
import { renderMarkdownInline } from '@/features/resume-workbench/markdown-lite'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'

const props = defineProps<{ model: ResumeRenderModel }>()

const iconMap: Record<ResumeContactIconKey, Component> = {
  phone: Phone,
  mail: Mail,
  user: User,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  circle: Circle,
  url: LinkIcon,
  location: MapPin
}

const iconFor = (iconKey: ResumeContactIconKey) => iconMap[iconKey] || Circle

/** 正文文本走 markdown-lite 内联渲染（**加粗** / *斜体* / 链接），其余内容保持纯文本。 */
const md = (text: string) => renderMarkdownInline(text)
const iconOn = computed(() => props.model.iconMode !== 'TEXT' && props.model.iconMode !== 'HIDDEN')
const visibleContacts = computed(() => props.model.contacts)
const sections = computed<ResumeRenderSection[]>(() =>
  props.model.renderSections.filter((section) => section.kind !== 'custom'
    || section.blocks?.length
    || section.entries?.length
    || section.certificates?.length)
)
</script>

<style scoped>
/* ===== 1:1 复刻 magic-resume「left-right」模板 =====
   头部：头像+姓名左、联系方式两列网格右；分区标题：左侧 3px 色条 + 主题色 10% 底色带。 */
.magic-lr-renderer {
  --magic-ink: #212529;
  --magic-muted: #4b5563;
  color: var(--magic-ink);
}

.magic-lr__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.magic-lr__header--center {
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.magic-lr__header--right {
  flex-direction: row-reverse;
}

.magic-lr__identity {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
  min-width: 0;
  max-width: 42%;
}

.magic-lr__identity--center {
  flex-direction: column;
  gap: 16px;
  max-width: none;
}

.magic-lr__identity--right {
  flex-direction: row-reverse;
  justify-content: flex-start;
}

.magic-lr__photo {
  overflow: hidden;
  flex-shrink: 0;
  width: 100px;
  height: 100px;
}

.magic-lr__photo--square { border-radius: 0; }
.magic-lr__photo--rounded { border-radius: 10px; }
.magic-lr__photo--circle { border-radius: 9999px; }

.magic-lr__photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.magic-lr__name-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 16rem;
  flex: 1;
}

.magic-lr__name-title--center {
  text-align: center;
  max-width: none;
}

.magic-lr__name-title--right {
  text-align: right;
}

.magic-lr__name-title h1 {
  margin: 0;
  color: var(--magic-ink);
  font-size: calc(30px * var(--template-font-scale, 1));
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
  overflow-wrap: normal;
}

.magic-lr__name-title h2 {
  margin: 4px 0 0;
  color: var(--magic-ink);
  font-size: calc(18px * var(--template-font-scale, 1));
  font-weight: 400;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: normal;
}

.magic-lr__fields {
  display: grid;
  flex: 1;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 24px;
  justify-content: start;
  max-width: 600px;
  color: var(--magic-muted);
  font-size: calc(14px * var(--template-font-scale, 1));
}

.magic-lr__header--center .magic-lr__fields {
  grid-template-columns: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 12px;
  max-width: none;
}

.magic-lr__field {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 4px;
}

.magic-lr__field-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 0.2em;
}

.magic-lr__field-label {
  flex-shrink: 0;
}

.magic-lr__field-value {
  min-width: 0;
  overflow-wrap: anywhere;
}

.magic-lr__link {
  min-width: 0;
  color: inherit;
  text-decoration: underline;
  overflow-wrap: anywhere;
}

.magic-lr__body {
  display: block;
}

.magic-lr__section {
  margin-top: var(--template-section-gap);
  break-inside: avoid;
}

.magic-lr__title-wrap {
  position: relative;
}

.magic-lr__title-band {
  position: absolute;
  inset: 0;
  background: var(--template-accent);
  opacity: 0.1;
}

.magic-lr__title {
  position: relative;
  margin: 0 0 8px;
  padding: 4px 0 4px 16px;
  border-left: 3px solid var(--template-accent);
  color: var(--template-accent);
  font-size: calc(18px * var(--template-font-scale, 1));
  font-weight: 700;
  line-height: 1.4;
}

.magic-lr__rich {
  color: var(--magic-ink);
  font-size: calc(14px * var(--template-font-scale, 1));
  line-height: var(--template-line-height);
}

.magic-lr__rich p {
  margin: 0 0 4px;
}

.magic-lr__list {
  display: grid;
  gap: 3px;
  margin: 4px 0 0;
  padding-left: 20px;
  color: var(--magic-ink);
  font-size: calc(14px * var(--template-font-scale, 1));
  line-height: var(--template-line-height);
  list-style: disc;
}

.magic-lr__list--ordered {
  list-style: decimal;
}

.magic-lr__list li::marker {
  color: var(--template-accent);
}

.magic-lr__entry {
  margin-top: 8px;
  break-inside: avoid;
}

.magic-lr__entry:first-of-type {
  margin-top: 0;
}

.magic-lr__entry-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.magic-lr__entry-title {
  flex: 1.5;
  min-width: 0;
  color: var(--magic-ink);
  font-size: calc(16px * var(--template-font-scale, 1));
  font-weight: 700;
}

.magic-lr__entry-sub {
  flex: 1;
  min-width: 0;
  color: var(--magic-ink);
  font-size: calc(16px * var(--template-font-scale, 1));
}

.magic-lr__entry-time {
  flex: 1;
  flex-shrink: 0;
  color: var(--magic-ink);
  font-size: calc(16px * var(--template-font-scale, 1));
  text-align: right;
}

.magic-lr__entry-meta {
  margin: 2px 0 0;
  color: var(--magic-muted);
  font-size: calc(14px * var(--template-font-scale, 1));
}

.magic-lr__list--entry {
  margin-top: 4px;
}

.magic-lr__project-groups {
  display: grid;
  gap: 6px;
  margin-top: 6px;
}

.magic-lr__group-title {
  display: block;
  color: var(--magic-ink);
  font-size: calc(15px * var(--template-font-scale, 1));
  font-weight: 700;
}

.magic-lr__list--group {
  margin-top: 2px;
}
</style>
