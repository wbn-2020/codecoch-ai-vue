<template>
  <el-dialog
    :model-value="modelValue"
    class="resume-template-gallery-dialog"
    width="min(1080px, 94vw)"
    align-center
    append-to-body
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="resume-template-gallery__header">
        <div>
          <h2>选择简历模板</h2>
          <p>模板只改变版式，不会修改已经填写的简历内容。</p>
        </div>
        <span>{{ unlockedCount }}/{{ templates.length }} 可用</span>
      </div>
    </template>

    <div class="resume-template-gallery">
      <div v-if="registryError" class="resume-template-gallery__error" role="alert">
        {{ registryError }}
      </div>
      <div class="resume-template-gallery__grid" role="radiogroup" aria-label="选择简历模板">
        <button
          v-for="template in templates"
          :key="template.code"
          type="button"
          role="radio"
          :aria-checked="pendingCode === template.code"
          :aria-disabled="!isUnlocked(template)"
          :tabindex="pendingCode === template.code ? 0 : -1"
          :class="{ 'is-active': pendingCode === template.code, 'is-locked': !isUnlocked(template) }"
          :disabled="!isUnlocked(template)"
          @click="emit('select', template.code)"
          @keydown="moveSelection($event, template.code)"
        >
          <span class="resume-template-gallery__preview">
            <ResumeDocumentPreview
              :draft="sampleDraft"
              :template-code="template.code"
              :accent="accent"
              :density="template.code === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
              :presentation-config="previewTemplatePresentation(template.code)"
            />
          </span>
          <span class="resume-template-gallery__copy">
            <span class="resume-template-gallery__title">
              <strong>{{ template.name }}</strong>
              <CheckCircle2 v-if="pendingCode === template.code" :size="17" aria-label="已选择" />
              <LockKeyhole v-else-if="!isUnlocked(template)" :size="16" aria-label="未解锁" />
            </span>
            <small>{{ template.description }}</small>
            <span class="resume-template-gallery__status">
              <span>v{{ templateDefinition(template.code).version }}</span>
              <span>{{ templateAvailabilityLabel(template.code) }}</span>
            </span>
            <dl>
              <div>
                <dt>岗位</dt>
                <dd>{{ template.roleFit }}</dd>
              </div>
              <div>
                <dt>页数</dt>
                <dd>{{ template.pageTendency }}</dd>
              </div>
              <div>
                <dt>ATS</dt>
                <dd>{{ template.atsRiskLabel }}</dd>
              </div>
              <div>
                <dt>版式</dt>
                <dd>{{ template.typographyLayout }}</dd>
              </div>
            </dl>
          </span>
        </button>
      </div>

      <aside class="resume-template-gallery__settings">
        <div>
          <span>强调色</span>
          <div class="resume-template-gallery__swatches" role="radiogroup" aria-label="选择简历强调色">
            <button
              v-for="option in accentOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-label="option.label"
              :aria-checked="accent === option.value"
              :class="[`is-${option.value}`, { 'is-active': accent === option.value }]"
              @click="emit('accent-change', option.value)"
            ></button>
          </div>
        </div>
        <div class="resume-template-gallery__zoom">
          <span>预览缩放</span>
          <div>
            <button type="button" aria-label="缩小预览" :disabled="zoom <= 0.72" @click="emit('zoom-change', -0.08)">
              <Minus :size="15" aria-hidden="true" />
            </button>
            <strong>{{ Math.round(zoom * 100) }}%</strong>
            <button type="button" aria-label="放大预览" :disabled="zoom >= 1.12" @click="emit('zoom-change', 0.08)">
              <Plus :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </div>

    <template #footer>
      <div class="resume-template-gallery__footer">
        <el-button @click="emit('cancel')">取消</el-button>
        <el-button type="primary" @click="emit('confirm')">应用模板</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { CheckCircle2, LockKeyhole, Minus, Plus } from 'lucide-vue-next'

import {
  createDefaultResumePresentation,
  mergeResumeTemplatePresentation,
  normalizeResumePresentation
} from '@/features/resume-presentation'
import { listResumeTemplateDefinitions } from '@/features/resume-template/registry'
import type { ResumeTemplateDefinition } from '@/features/resume-template/schema'
import type {
  ResumeAccent,
  ResumeDocumentDraft,
  ResumeTemplateCode,
  ResumeTemplateOption
} from '@/features/resume-document'
import type { ResumeAtsTemplateVO } from '@/types/resumeDelivery'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

const props = defineProps<{
  modelValue: boolean
  templates: ResumeTemplateOption[]
  pendingCode: ResumeTemplateCode
  accent: ResumeAccent
  accentOptions: Array<{ value: ResumeAccent; label: string }>
  zoom: number
  isUnlocked: (template: ResumeTemplateOption) => boolean
  templateRegistry?: ResumeAtsTemplateVO[]
  presentationConfig?: ResumePresentationConfig
  registryError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [code: ResumeTemplateCode]
  'accent-change': [accent: ResumeAccent]
  'zoom-change': [delta: number]
  cancel: []
  confirm: []
}>()

const unlockedTemplates = computed(() => props.templates.filter((template) => props.isUnlocked(template)))
const unlockedCount = computed(() => unlockedTemplates.value.length)
const sampleDraft: ResumeDocumentDraft = {
  resumeName: 'Java 后端工程师简历',
  realName: '林晨',
  phone: '138 0000 0000',
  email: 'linchen@example.com',
  targetPosition: 'Java 后端工程师',
  summary: '3 年企业应用开发经验，负责订单与履约链路。通过缓存治理和异步化改造，将核心接口 P95 降低 38%。',
  skillStack: 'Java, Spring Boot, MySQL, Redis, Kafka, Docker',
  workExperience: '某科技公司 · Java 工程师 2023.03 - 至今\n负责交易域微服务开发、性能治理和线上稳定性建设。',
  educationExperience: '华东理工大学 · 软件工程 2019.09 - 2023.06',
  projects: [
    {
      projectName: '订单履约平台',
      projectPeriod: '2024.01 - 2025.06',
      role: '核心开发',
      techStack: 'Spring Boot / MySQL / Redis / Kafka',
      responsibility: '负责订单状态机与库存一致性链路。',
      optimizationResults: '高峰期吞吐提升 45%，故障恢复时间缩短到 8 分钟。'
    }
  ]
}
const templateDefinitions = computed(() =>
  listResumeTemplateDefinitions(props.templateRegistry)
)
const templateDefinition = (code: ResumeTemplateCode): ResumeTemplateDefinition =>
  templateDefinitions.value.find((template) => template.code === code)
  || templateDefinitions.value[0]
const templateAvailabilityLabel = (code: ResumeTemplateCode) => {
  const template = templateDefinition(code)
  if (!template.backendRegistered) return '预览配置'
  return template.exportAvailable ? '正式导出可用' : '暂不可导出'
}
const previewPresentation = (code: ResumeTemplateCode) => normalizeResumePresentation({
  ...createDefaultResumePresentation(code, templateDefinition(code).version),
  accentColor: props.accent,
  fontFamily: props.presentationConfig?.fontFamily,
  fontScale: props.presentationConfig?.fontScale,
  lineHeight: props.presentationConfig?.lineHeight,
  sectionSpacing: props.presentationConfig?.sectionSpacing,
  pageMarginPt: props.presentationConfig?.pageMarginPt
}, props.presentationConfig)
const previewTemplatePresentation = (code: ResumeTemplateCode) => mergeResumeTemplatePresentation(
  previewPresentation(code),
  {
    templateCode: code,
    templateVersion: templateDefinition(code).version,
    definition: templateDefinition(code).backendDefinition
  }
)

const moveSelection = (event: KeyboardEvent, currentCode: ResumeTemplateCode) => {
  const codes = unlockedTemplates.value.map((template) => template.code)
  const currentIndex = codes.indexOf(currentCode)
  if (currentIndex < 0) return

  let nextIndex = currentIndex
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (currentIndex + 1) % codes.length
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (currentIndex - 1 + codes.length) % codes.length
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = codes.length - 1
  } else {
    return
  }

  event.preventDefault()
  emit('select', codes[nextIndex])
  void nextTick(() => {
    const buttons = event.currentTarget instanceof HTMLElement
      ? Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])
      : []
    buttons[nextIndex]?.focus()
  })
}
</script>

<style scoped lang="scss">
:global(.resume-template-gallery-dialog) {
  --user-surface: #ffffff;
  --user-text: #17211b;
  --user-text-muted: #5f6f65;
  --user-border: #d8e1da;
  --user-primary: #1f8f5f;
  --user-primary-soft: #e8f6ee;
  --user-success: #16734c;
  --user-success-soft: #e8f6ee;
  --el-color-primary: #1f8f5f;
  --el-bg-color: #ffffff;
  --el-fill-color-blank: #ffffff;
  --el-border-color: #d8e1da;
  --el-text-color-primary: #17211b;
  --el-text-color-regular: #44534a;
}

.resume-template-gallery__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  > span {
    padding: 5px 8px;
    border-radius: 999px;
    background: var(--user-success-soft);
    color: var(--user-success);
    font-size: 11px;
    font-weight: 700;
  }
}

.resume-template-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px;
  gap: 18px;
}

.resume-template-gallery__error {
  grid-column: 1 / -1;
  padding: 9px 11px;
  border: 1px solid #e7c98d;
  border-radius: 6px;
  background: #fff8e8;
  color: #815318;
  font-size: 11px;
  line-height: 1.5;
}

.resume-template-gallery__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.resume-template-gallery__grid > button {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--user-primary);
    outline: 0;
  }

  &.is-active {
    border-color: var(--user-primary);
    background: var(--user-primary-soft);
  }

  &.is-locked {
    cursor: not-allowed;
    opacity: 0.58;
  }
}

.resume-template-gallery__preview {
  display: block;
  width: 96px;
  height: 136px;
  overflow: hidden;
  border: 1px solid #d9dee7;
  background: #fff;
  box-shadow: 0 5px 8px rgba(39, 50, 68, 0.1);

  :deep(.resume-document) {
    width: 96px;
    max-width: none;
    min-height: 136px;
    aspect-ratio: 210 / 297;
    border: 0;
    box-shadow: none;
    transform-origin: top left;
  }

  :deep(.resume-document:not(.is-classic)) {
    --paper-pad-x: 8px !important;
    --paper-pad-y: 8px !important;
  }

  :deep(.document-header) {
    gap: 3px;
    padding-bottom: 3px;
  }

  :deep(.document-header__identity h2) {
    margin-top: 1px;
    font-size: 5px;
  }

  :deep(.document-header__identity p),
  :deep(.document-contact),
  :deep(.document-section__heading h3),
  :deep(.document-copy p),
  :deep(.document-entry__head strong),
  :deep(.document-entry__head span),
  :deep(.document-entry__head time),
  :deep(.document-entry__meta),
  :deep(.document-entry li),
  :deep(.skill-list span),
  :deep(.skill-groups) {
    font-size: 2.7px !important;
    line-height: 1.25 !important;
  }

  :deep(.document-section) {
    margin-top: 3px;
  }

  :deep(.document-section__heading) {
    margin-bottom: 2px;
  }

  :deep(.document-section__heading h3) {
    padding: 1px 2px;
  }

  :deep(.document-entries) {
    gap: 2px;
  }
}

.resume-template-gallery__copy {
  min-width: 0;

  > small {
    display: block;
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.5;
  }

  dl {
    display: grid;
    gap: 4px;
    margin: 10px 0 0;
  }

  dl div {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 5px;
    font-size: 10.5px;
  }

  dt {
    color: var(--user-text-muted);
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.resume-template-gallery__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--user-text);
  font-size: 13px;

  svg {
    flex: 0 0 auto;
    color: var(--user-primary);
  }
}

.resume-template-gallery__status {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;

  span {
    padding: 2px 5px;
    border: 1px solid var(--user-border);
    border-radius: 4px;
    color: var(--user-text-muted);
    font-size: 9.5px;
  }
}

.resume-template-gallery__settings {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 14px;
  border-left: 1px solid var(--user-border);
  color: var(--user-text);

  > div {
    display: grid;
    gap: 9px;
  }

  > div > span {
    color: var(--user-text-muted);
    font-size: 11px;
    font-weight: 650;
  }
}

.resume-template-gallery__swatches {
  display: flex;
  gap: 8px;

  button {
    width: 27px;
    height: 27px;
    padding: 0;
    border: 3px solid var(--user-surface);
    border-radius: 50%;
    box-shadow: 0 0 0 1px var(--user-border);
    cursor: pointer;

    &.is-ocean {
      background: #2563eb;
    }

    &.is-teal {
      background: #0b7669;
    }

    &.is-graphite {
      background: #334155;
    }

    &.is-berry {
      background: #9f3155;
    }

    &.is-active {
      box-shadow: 0 0 0 2px var(--user-primary);
    }
  }
}

.resume-template-gallery__zoom > div {
  display: grid;
  grid-template-columns: 32px minmax(54px, 1fr) 32px;
  align-items: center;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  overflow: hidden;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0;
    border: 0;
    background: var(--user-surface);
    color: var(--user-text);
    cursor: pointer;
  }

  strong {
    font-size: 11px;
    text-align: center;
  }
}

.resume-template-gallery__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 760px) {
  .resume-template-gallery {
    grid-template-columns: 1fr;
  }

  .resume-template-gallery__grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }

  .resume-template-gallery__grid > button {
    flex: 0 0 min(290px, 82vw);
    scroll-snap-align: start;
  }

  .resume-template-gallery__settings {
    border-top: 1px solid var(--user-border);
    border-left: 0;
  }
}
</style>
