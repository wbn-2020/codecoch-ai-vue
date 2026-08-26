<template>
  <TemplatePaper :model="model" variant="modern" class="swiss-renderer">
    <header class="swiss-renderer__header">
      <div class="swiss-renderer__name">
        <h1 v-if="isFieldVisible(model, 'realName')">{{ model.identity.name }}</h1>
      </div>
      <div class="swiss-renderer__role">
        <p v-if="isFieldVisible(model, 'targetPosition') && model.identity.targetPosition">
          {{ model.identity.targetPosition }}
        </p>
      </div>
      <div v-if="model.contacts.length" class="swiss-renderer__contacts">
        <TemplateContactItem
          v-for="contact in model.contacts"
          :key="contact.key"
          :contact="contact"
          :model="model"
        />
      </div>
    </header>

    <main v-if="sections.length" class="swiss-renderer__body">
      <section
        v-for="section in sections"
        :key="section"
        :data-section="section"
        :class="['swiss-renderer__section', `swiss-renderer__section--${section}`]"
      >
        <h2>{{ sectionTitles[section] }}</h2>

        <div v-if="section === 'summary'" class="swiss-renderer__summary">
          <p v-for="paragraph in model.summary" :key="paragraph">{{ paragraph }}</p>
        </div>
        <div v-else-if="section === 'skills'" class="swiss-renderer__skills">
          <div v-for="group in model.skillGroups" :key="group.label">
            <strong>{{ group.label }}</strong>
            <span>{{ group.items.join(', ') }}</span>
          </div>
          <p v-if="!model.skillGroups.length">{{ model.skills.join(', ') }}</p>
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
          v-else
          :entries="model.education"
        />
      </section>
    </main>

    <div v-else class="swiss-renderer__empty">
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
  sectionTitles,
  visibleSections
} from '@/views/resume/templates/shared/renderModel'
import TemplateContactItem from '@/views/resume/templates/shared/TemplateContactItem.vue'
import TemplateEntryList from '@/views/resume/templates/shared/TemplateEntryList.vue'
import TemplatePaper from '@/views/resume/templates/shared/TemplatePaper.vue'

const props = defineProps<{ model: ResumeRenderModel }>()
const sections = computed(() => visibleSections(props.model))
</script>

<style scoped>
.swiss-renderer {
  --template-ink: #1c2024;
  --template-body: #363c42;
  --template-muted: #6d757d;
  display: block;
}

.swiss-renderer__header {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(110px, 0.65fr) minmax(150px, 0.8fr);
  align-items: end;
  gap: 20px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--template-ink);
}

.swiss-renderer__name h1 {
  margin: 0;
  font-size: calc(34px * var(--template-font-scale, 1));
  font-weight: 800;
  line-height: 1;
}

.swiss-renderer__role p {
  margin: 0;
  color: var(--template-accent-strong);
  font-size: calc(11px * var(--template-font-scale, 1));
  font-weight: 800;
  line-height: 1.35;
}

.swiss-renderer__contacts {
  display: grid;
  justify-items: end;
  gap: 4px;
}

.template-paper--identity-center .swiss-renderer__header {
  grid-template-columns: 1fr;
  justify-items: center;
  text-align: center;
}

.template-paper--identity-center .swiss-renderer__contacts {
  justify-items: center;
}

.template-paper--identity-right .swiss-renderer__header {
  grid-template-columns: minmax(150px, 0.8fr) minmax(110px, 0.65fr) minmax(0, 1.35fr);
  direction: rtl;
  text-align: right;
}

.template-paper--identity-right .swiss-renderer__name,
.template-paper--identity-right .swiss-renderer__role,
.template-paper--identity-right .swiss-renderer__contacts {
  direction: ltr;
}

.template-paper--identity-right .swiss-renderer__contacts {
  justify-items: start;
  text-align: left;
}

.swiss-renderer__body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--template-section-gap) * 1.25) 30px;
  padding-top: calc(var(--template-section-gap) * 1.25);
}

.swiss-renderer__section {
  min-width: 0;
  break-inside: avoid;
}

.swiss-renderer__section--summary,
.swiss-renderer__section--experience {
  grid-column: 1 / -1;
}

.swiss-renderer__section h2 {
  margin: 0 0 11px;
  padding-bottom: 5px;
  border-bottom: 1px solid #c7cdd2;
  color: var(--template-ink);
  font-size: calc(11px * var(--template-font-scale, 1));
  font-weight: 800;
  line-height: 1.3;
}

.swiss-renderer__summary {
  display: grid;
  gap: 6px;
  max-width: 75ch;
  color: var(--template-body);
  font-size: calc(11px * var(--template-font-scale, 1));
}

.swiss-renderer__summary p {
  margin: 0;
}

.swiss-renderer__skills {
  display: grid;
  gap: 6px;
  color: var(--template-body);
  font-size: calc(10.5px * var(--template-font-scale, 1));
}

.swiss-renderer__skills div {
  display: grid;
  grid-template-columns: 0.42fr 1fr;
  gap: 10px;
}

.swiss-renderer__skills strong {
  color: var(--template-accent-strong);
}

.swiss-renderer__skills p {
  margin: 0;
}

.swiss-renderer :deep(.template-entry-list) {
  gap: 16px;
}

.swiss-renderer :deep(.template-entry__head strong) {
  font-size: calc(11.5px * var(--template-font-scale, 1));
  font-weight: 800;
}

.swiss-renderer :deep(.template-entry__head time) {
  color: var(--template-accent-strong);
}

.swiss-renderer__empty {
  display: grid;
  gap: 6px;
  margin-top: 72px;
  padding-top: 14px;
  border-top: 2px solid var(--template-ink);
  color: var(--template-muted);
  text-align: center;
}

.swiss-renderer__empty strong {
  color: var(--template-ink);
}

.swiss-renderer__empty span {
  font-size: calc(11px * var(--template-font-scale, 1));
}

@container template-paper (max-width: 640px) {
  .swiss-renderer__header,
  .template-paper--identity-right .swiss-renderer__header {
    grid-template-columns: 1fr;
    align-items: start;
    direction: ltr;
    text-align: left;
  }

  .swiss-renderer__name,
  .swiss-renderer__role,
  .swiss-renderer__contacts,
  .template-paper--identity-right .swiss-renderer__name,
  .template-paper--identity-right .swiss-renderer__role,
  .template-paper--identity-right .swiss-renderer__contacts {
    direction: ltr;
  }

  .swiss-renderer__contacts,
  .template-paper--identity-right .swiss-renderer__contacts {
    justify-items: start;
    text-align: left;
  }

  .swiss-renderer__body {
    grid-template-columns: 1fr;
  }

  .swiss-renderer__section--summary,
  .swiss-renderer__section--experience {
    grid-column: auto;
  }

  .swiss-renderer__skills div {
    grid-template-columns: 1fr;
    gap: 1px;
  }
}
</style>
