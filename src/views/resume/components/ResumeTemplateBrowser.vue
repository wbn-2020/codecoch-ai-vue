<template>
  <el-dialog
    :model-value="modelValue"
    class="resume-template-browser-dialog"
    fullscreen
    append-to-body
    :show-close="false"
    :close-on-click-modal="false"
    @update:model-value="handleVisibilityChange"
  >
    <div class="template-browser">
      <header class="template-browser__header">
        <div class="template-browser__heading">
          <button type="button" class="template-browser__close" aria-label="关闭模板中心" @click="cancelBrowser">
            <X :size="20" aria-hidden="true" />
          </button>
          <div>
            <h2>模板</h2>
            <p>模板只改变视觉排版，不会改写你已经填写的简历内容。</p>
          </div>
        </div>

        <div class="template-browser__palette" role="radiogroup" aria-label="模板主题色">
          <button
            v-for="option in accentOptions"
            :key="option.value"
            type="button"
            role="radio"
            :aria-label="option.label"
            :aria-checked="localAccent === option.value"
            :title="option.label"
            :class="{ 'is-active': localAccent === option.value }"
            @click="selectAccent(option.value)"
          >
            <span
              :class="{ 'is-default': option.value === 'default' }"
              :style="{ '--swatch-color': accentColor(option.value) }"
              aria-hidden="true"
            >
              <Palette v-if="option.value === 'default'" :size="14" />
            </span>
          </button>
        </div>
      </header>

      <div v-if="registryError" class="template-browser__error" role="alert">
        <AlertTriangle :size="17" aria-hidden="true" />
        <span>{{ registryError }}</span>
      </div>

      <main class="template-browser__content">
        <div
          class="template-browser__grid"
          role="list"
          aria-label="简历模板列表"
        >
          <article
            v-for="(template, index) in templates"
            :key="template.code"
            class="template-card"
            :class="{
              'is-selected': pendingCode === template.code,
              'is-locked': !isUnlocked(template)
            }"
            :style="{ '--template-index': index }"
          >
            <button
              type="button"
              class="template-card__preview"
              :aria-label="`预览${template.name}模板`"
              @click="openPreview(template)"
            >
              <span
                :ref="(element) => registerPreviewFrame(element, template.code)"
                class="template-card__paper-frame"
              >
                <span class="template-card__paper">
                  <ResumeDocumentPreview
                    :draft="sampleDraft"
                    :template-code="template.code"
                    :accent="localAccent"
                    :density="template.code === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
                    :presentation-config="previewTemplatePresentation(template.code)"
                  />
                </span>
              </span>

              <span class="template-card__fade" aria-hidden="true"></span>
              <span class="template-card__meta">
                <span class="template-card__title">
                  <strong>{{ template.name }}</strong>
                  <span v-if="pendingCode === template.code" class="template-card__selected">
                    <Check :size="13" aria-hidden="true" />
                    当前
                  </span>
                  <span v-else-if="!isUnlocked(template)" class="template-card__locked">
                    <LockKeyhole :size="13" aria-hidden="true" />
                    未解锁
                  </span>
                </span>
                <span class="template-card__description">{{ template.description }}</span>
                <span
                  class="template-card__availability"
                  :class="{ 'is-formal': isFormalExportTemplate(template.code) }"
                >
                  {{ isFormalExportTemplate(template.code) ? '正式导出模板' : '仅预览模板' }}
                </span>
              </span>
            </button>

            <footer class="template-card__actions">
              <button type="button" class="template-card__secondary" @click="openPreview(template)">
                <Eye :size="15" aria-hidden="true" />
                预览
              </button>
              <button
                type="button"
                class="template-card__primary"
                :disabled="!isUnlocked(template)"
                @click="useTemplate(template)"
              >
                <LayoutTemplate :size="15" aria-hidden="true" />
                使用此模板
              </button>
            </footer>
          </article>
        </div>
      </main>
    </div>

    <el-dialog
      v-model="previewVisible"
      class="resume-template-preview-dialog"
      width="min(680px, 94vw)"
      append-to-body
      align-center
      :show-close="false"
    >
      <div v-if="activePreviewTemplate" class="template-preview">
        <header class="template-preview__header">
          <div>
            <h3>{{ activePreviewTemplate.name }}</h3>
            <p>{{ activePreviewTemplate.description }}</p>
          </div>
          <button type="button" aria-label="关闭大预览" @click="previewVisible = false">
            <X :size="19" aria-hidden="true" />
          </button>
        </header>

        <div class="template-preview__canvas">
          <div ref="modalPreviewFrame" class="template-preview__paper">
            <div class="template-preview__renderer">
              <ResumeDocumentPreview
                :draft="sampleDraft"
                :template-code="activePreviewTemplate.code"
                :accent="localAccent"
                :density="activePreviewTemplate.code === 'ATS_COMPACT' ? 'compact' : 'comfortable'"
                :presentation-config="previewTemplatePresentation(activePreviewTemplate.code)"
              />
            </div>
          </div>
        </div>

        <footer class="template-preview__footer">
          <button
            type="button"
            :disabled="!isUnlocked(activePreviewTemplate)"
            @click="useTemplate(activePreviewTemplate)"
          >
            <LayoutTemplate :size="16" aria-hidden="true" />
            {{ isUnlocked(activePreviewTemplate) ? '使用此模板' : '模板尚未解锁' }}
          </button>
        </footer>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type ComponentPublicInstance } from 'vue'
import {
  AlertTriangle,
  Check,
  Eye,
  LayoutTemplate,
  LockKeyhole,
  Palette,
  X
} from 'lucide-vue-next'

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

const A4_WIDTH_PX = 794

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

const localAccent = ref<ResumeAccent>(props.accent)
const previewVisible = ref(false)
const activePreviewCode = ref<ResumeTemplateCode | null>(null)
const previewFrames = new Map<ResumeTemplateCode, HTMLElement>()
const frameObservers = new Map<ResumeTemplateCode, ResizeObserver>()
const modalPreviewFrame = ref<HTMLElement>()
let modalPreviewObserver: ResizeObserver | undefined
let autoplayTimer: ReturnType<typeof setInterval> | undefined
let autoplayStopped = false

const accentValues = computed(() => props.accentOptions.map((option) => option.value))
const templateDefinitions = computed(() => listResumeTemplateDefinitions(props.templateRegistry))
const templateDefinition = (code: ResumeTemplateCode): ResumeTemplateDefinition =>
  templateDefinitions.value.find((template) => template.code === code)
  || templateDefinitions.value[0]
const isFormalExportTemplate = (code: ResumeTemplateCode) => {
  const definition = templateDefinition(code)
  return Boolean(definition?.exportAvailable && definition.backendRegistered)
}
const activePreviewTemplate = computed(() =>
  props.templates.find((template) => template.code === activePreviewCode.value)
)

const accentColor = (accent: ResumeAccent) => ({
  default: '#e7e5e4',
  blue: '#3b82f6',
  green: '#10b981',
  purple: '#8b5cf6',
  orange: '#f97316',
  red: '#ef4444',
  slate: '#475569',
  black: '#000000'
})[accent]

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
      responsibility: '负责订单状态机、库存一致性链路和异常补偿。',
      optimizationResults: '高峰期吞吐提升 45%，故障恢复时间缩短到 8 分钟。'
    }
  ]
}

const previewPresentation = (code: ResumeTemplateCode) => normalizeResumePresentation({
  ...createDefaultResumePresentation(code, templateDefinition(code).version),
  accentColor: localAccent.value,
  fontFamily: props.presentationConfig?.fontFamily,
  fontScale: props.presentationConfig?.fontScale,
  lineHeight: props.presentationConfig?.lineHeight,
  sectionSpacing: props.presentationConfig?.sectionSpacing,
  pageMarginPt: props.presentationConfig?.pageMarginPt
}, props.presentationConfig)

const previewTemplatePresentation = (code: ResumeTemplateCode) =>
  mergeResumeTemplatePresentation(previewPresentation(code), {
    templateCode: code,
    templateVersion: templateDefinition(code).version,
    definition: templateDefinition(code).backendDefinition
  })

const updateFrameScale = (element: HTMLElement) => {
  const width = element.getBoundingClientRect().width
  if (width > 0) {
    element.style.setProperty('--template-preview-scale', String(width / A4_WIDTH_PX))
  }
}

const updateModalPreviewScale = () => {
  const element = modalPreviewFrame.value
  if (!element) return
  const width = element.getBoundingClientRect().width
  if (width > 0) {
    element.style.setProperty('--template-modal-scale', String(width / A4_WIDTH_PX))
  }
}

const registerPreviewFrame = (
  element: Element | ComponentPublicInstance | null,
  code: ResumeTemplateCode
) => {
  const current = previewFrames.get(code)
  const next = element instanceof HTMLElement ? element : null
  if (current === next) return

  frameObservers.get(code)?.disconnect()
  frameObservers.delete(code)
  previewFrames.delete(code)
  if (!next) return

  previewFrames.set(code, next)
  const observer = new ResizeObserver(() => updateFrameScale(next))
  observer.observe(next)
  frameObservers.set(code, observer)
  void nextTick(() => updateFrameScale(next))
}

const stopAutoplay = () => {
  autoplayStopped = true
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = undefined
  }
}

const startAutoplay = () => {
  if (autoplayStopped || accentValues.value.length < 2) return
  if (autoplayTimer) clearInterval(autoplayTimer)
  autoplayTimer = setInterval(() => {
    const currentIndex = accentValues.value.indexOf(localAccent.value)
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % accentValues.value.length
    localAccent.value = accentValues.value[nextIndex]
  }, 3000)
}

const selectAccent = (accent: ResumeAccent) => {
  localAccent.value = accent
  stopAutoplay()
}

const openPreview = (template: ResumeTemplateOption) => {
  activePreviewCode.value = template.code
  previewVisible.value = true
}

const useTemplate = (template: ResumeTemplateOption) => {
  if (!props.isUnlocked(template)) return
  stopAutoplay()
  emit('select', template.code)
  emit('accent-change', localAccent.value)
  previewVisible.value = false
  emit('confirm')
}

const cancelBrowser = () => {
  stopAutoplay()
  previewVisible.value = false
  emit('cancel')
}

const handleVisibilityChange = (value: boolean) => {
  if (!value) cancelBrowser()
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) {
      stopAutoplay()
      return
    }
    localAccent.value = props.accent
    activePreviewCode.value = null
    previewVisible.value = false
    autoplayStopped = false
    startAutoplay()
  },
  { immediate: true }
)

watch(previewVisible, (visible) => {
  modalPreviewObserver?.disconnect()
  modalPreviewObserver = undefined
  if (!visible) return

  void nextTick(() => {
    if (!modalPreviewFrame.value) return
    modalPreviewObserver = new ResizeObserver(updateModalPreviewScale)
    modalPreviewObserver.observe(modalPreviewFrame.value)
    updateModalPreviewScale()
  })
})

onBeforeUnmount(() => {
  stopAutoplay()
  frameObservers.forEach((observer) => observer.disconnect())
  frameObservers.clear()
  previewFrames.clear()
  modalPreviewObserver?.disconnect()
})
</script>

<style scoped lang="scss">
:global(.resume-template-browser-dialog) {
  --magic-page: #f9f8f6;
  --magic-surface: #ffffff;
  --magic-ink: #1b1b18;
  --magic-ink-soft: #4a4944;
  --magic-muted: #77756e;
  --magic-line: #dedcd6;
  --magic-line-strong: #c9c6bd;
  --magic-hover: #efede8;
  --magic-primary: #1b1b18;
  --magic-primary-foreground: #f9f8f6;
  margin: 0;
  background: var(--magic-page);
}

:global(.resume-template-browser-dialog .el-dialog__header) {
  display: none;
}

:global(.resume-template-browser-dialog .el-dialog__body) {
  height: 100%;
  padding: 0;
  overflow: auto;
}

.template-browser {
  min-height: 100%;
  color: var(--magic-ink);
  background: var(--magic-page);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.template-browser__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 22px max(24px, calc((100vw - 1600px) / 2));
  border-bottom: 1px solid color-mix(in srgb, var(--magic-line) 72%, transparent);
  background: color-mix(in srgb, var(--magic-page) 94%, transparent);
  backdrop-filter: blur(12px);
}

.template-browser__heading {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 28px;
    line-height: 1.2;
  }

  p {
    margin-top: 4px;
    color: var(--magic-muted);
    font-size: 13px;
  }
}

.template-browser__close,
.template-preview__header button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--magic-line);
  border-radius: 8px;
  background: var(--magic-surface);
  color: var(--magic-ink);
  cursor: pointer;

  &:hover {
    border-color: var(--magic-line-strong);
    background: var(--magic-hover);
  }

  &:focus-visible {
    outline: 2px solid var(--magic-ink);
    outline-offset: 2px;
  }
}

.template-browser__palette {
  display: flex;
  flex: 0 0 auto;
  gap: 7px;
  padding: 7px;
  overflow-x: auto;
  border: 1px solid var(--magic-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--magic-surface) 86%, transparent);

  > button {
    position: relative;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    transition: transform 180ms ease;

    &:hover {
      transform: scale(1.08);
    }

    &.is-active {
      box-shadow: 0 0 0 2px var(--magic-ink), 0 0 0 4px var(--magic-page);
      transform: scale(1.08);
    }

    &:focus-visible {
      outline: 2px solid var(--magic-ink);
      outline-offset: 2px;
    }
  }

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 50%;
    background: var(--swatch-color);
    color: #57534e;
  }

  .is-default {
    background: linear-gradient(145deg, #f5f5f4, #d6d3d1);
  }
}

.template-browser__error {
  display: flex;
  align-items: center;
  gap: 9px;
  max-width: 1600px;
  margin: 18px auto 0;
  padding: 10px 14px;
  border: 1px solid #e7c98d;
  border-radius: 8px;
  background: #fff8e8;
  color: #774b14;
  font-size: 13px;
}

.template-browser__content {
  width: min(100%, 1600px);
  margin: 0 auto;
  padding: 28px 24px 56px;
}

.template-browser__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 24px;
}

.template-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  aspect-ratio: 210 / 297;
  overflow: hidden;
  border: 1px solid var(--magic-line);
  border-radius: 8px;
  background: var(--magic-surface);
  animation: template-card-enter 280ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--template-index) * 45ms);
  transition: border-color 180ms ease, transform 180ms ease;

  &:hover {
    border-color: var(--magic-line-strong);
    transform: translateY(-2px);
  }

  &.is-selected {
    border-color: var(--magic-ink);
    box-shadow: 0 0 0 1px var(--magic-ink);
  }

  &.is-locked {
    background: #f5f5f4;
  }
}

.template-card__preview {
  position: relative;
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: #f4f4f3;
  color: var(--magic-ink);
  text-align: left;
  cursor: zoom-in;
}

.template-card__paper-frame {
  position: absolute;
  inset: 0 0 52px;
  display: block;
  overflow: hidden;
  background: #f3f4f6;
}

.template-card__paper {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 794px;
  height: 1123px;
  transform: scale(var(--template-preview-scale, 0.24));
  transform-origin: top left;
  pointer-events: none;
}

.template-card__paper :deep(.resume-document) {
  width: 794px;
  max-width: none;
  min-height: 1123px;
  border: 0;
  box-shadow: none;
}

.template-card__fade {
  position: absolute;
  inset: 54% 0 52px;
  z-index: 1;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.94) 68%, #fff 100%);
  pointer-events: none;
}

.template-card__meta {
  position: absolute;
  right: 0;
  bottom: 52px;
  left: 0;
  z-index: 2;
  display: grid;
  gap: 4px;
  padding: 24px 14px 12px;
  pointer-events: none;
}

.template-card__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;

  > strong {
    min-width: 0;
    overflow: hidden;
    font-size: 15px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.template-card__selected,
.template-card__locked {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 650;
}

.template-card__selected {
  color: #176b4d;
}

.template-card__locked {
  color: #8a5b14;
}

.template-card__description {
  overflow: hidden;
  color: #57534e;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card__availability {
  color: #8a5b14;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;

  &.is-formal {
    color: #176b4d;
  }
}

.template-card__actions {
  display: grid;
  flex: 0 0 52px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #ebe9e5;
  background: var(--magic-surface);

  button {
    display: inline-flex;
    min-width: 0;
    height: 34px;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 8px;
    border-radius: 6px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid var(--magic-ink);
    outline-offset: 2px;
  }
}

.template-card__secondary {
  border: 1px solid var(--magic-line);
  background: #fff;
  color: var(--magic-ink);

  &:hover {
    background: var(--magic-hover);
  }
}

.template-card__primary {
  border: 1px solid var(--magic-primary);
  background: var(--magic-primary);
  color: var(--magic-primary-foreground);

  &:hover:not(:disabled) {
    background: #33332f;
  }

  &:disabled {
    border-color: #d6d3d1;
    background: #d6d3d1;
    color: #78716c;
    cursor: not-allowed;
  }
}

:global(.resume-template-preview-dialog) {
  --magic-page: #f9f8f6;
  --magic-surface: #ffffff;
  --magic-ink: #1b1b18;
  --magic-muted: #77756e;
  --magic-line: #dedcd6;
  overflow: hidden;
  border-radius: 10px;
  background: var(--magic-surface);
}

:global(.resume-template-preview-dialog .el-dialog__header) {
  display: none;
}

:global(.resume-template-preview-dialog .el-dialog__body) {
  padding: 0;
}

.template-preview__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--magic-line);

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--magic-ink);
    font-size: 18px;
  }

  p {
    margin-top: 4px;
    color: var(--magic-muted);
    font-size: 12px;
  }

  button {
    width: 34px;
    height: 34px;
  }
}

.template-preview__canvas {
  display: flex;
  justify-content: center;
  padding: 26px;
  overflow: auto;
  background: #f4f4f3;
}

.template-preview__paper {
  position: relative;
  width: min(420px, calc(100vw - 86px));
  aspect-ratio: 210 / 297;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 8px rgba(28, 25, 23, 0.16);
}

.template-preview__renderer {
  position: absolute;
  top: 0;
  left: 0;
  width: 794px;
  height: 1123px;
  transform: scale(var(--template-modal-scale, 0.529));
  transform-origin: top left;
  pointer-events: none;
}

.template-preview__renderer :deep(.resume-document) {
  width: 794px;
  max-width: none;
  min-height: 1123px;
  border: 0;
  box-shadow: none;
}

.template-preview__footer {
  padding: 12px;
  border-top: 1px solid var(--magic-line);

  button {
    display: inline-flex;
    width: 100%;
    height: 40px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 7px;
    background: var(--magic-ink);
    color: #fff;
    font: inherit;
    font-weight: 650;
    cursor: pointer;

    &:disabled {
      background: #d6d3d1;
      color: #78716c;
      cursor: not-allowed;
    }
  }
}

@keyframes template-card-enter {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1679px) {
  .template-browser__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1359px) {
  .template-browser__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .template-browser__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .template-browser__palette {
    max-width: 100%;
  }

  .template-browser__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .template-browser__header {
    padding: 16px;
  }

  .template-browser__heading p {
    display: none;
  }

  .template-browser__content {
    padding: 18px 14px 36px;
  }

  .template-browser__grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .template-card {
    max-width: 430px;
    width: 100%;
    justify-self: center;
  }

  .template-preview__canvas {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .template-card {
    animation: none;
    transition: none;
  }

  .template-browser__palette > button {
    transition: none;
  }
}
</style>
