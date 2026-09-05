<template>
  <el-drawer
    :model-value="modelValue"
    class="resume-template-browser-drawer"
    direction="ltr"
    size="52%"
    append-to-body
    :with-header="false"
    :modal-class="'resume-template-browser-modal'"
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
            <div class="template-card__cover">
              <button
                type="button"
                class="template-card__select"
                :aria-label="`使用${template.name}模板`"
                :disabled="!isUnlocked(template)"
                @click="useTemplate(template)"
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
              </button>

              <span v-if="pendingCode === template.code" class="template-card__veil" aria-hidden="true">
                <LayoutTemplate :size="26" />
              </span>
              <span v-else-if="!isUnlocked(template)" class="template-card__veil is-lock">
                <LockKeyhole :size="18" aria-hidden="true" />
                <em>连续打卡 7 天解锁</em>
              </span>

              <button
                type="button"
                class="template-card__zoom"
                :aria-label="`放大预览${template.name}模板`"
                :disabled="!isUnlocked(template)"
                @click.stop="openPreview(template)"
              >
                <Eye :size="13" aria-hidden="true" />
                预览
              </button>
            </div>

            <footer class="template-card__name">
              <strong>{{ template.name }}</strong>
              <span :class="{ 'is-formal': isFormalExportTemplate(template.code) }">
                {{ isFormalExportTemplate(template.code) ? '正式导出' : '仅预览' }}
              </span>
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
  </el-drawer>
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
import {
  resolveAccentHex,
  type ResumeDocumentDraft,
  type ResumeTemplateCode,
  type ResumeTemplateOption
} from '@/features/resume-document'
import type { ResumeAtsTemplateVO } from '@/types/resumeDelivery'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

const A4_WIDTH_PX = 794

const props = defineProps<{
  modelValue: boolean
  templates: ResumeTemplateOption[]
  pendingCode: ResumeTemplateCode
  accent: string
  accentOptions: Array<{ value: string; label: string }>
  zoom: number
  isUnlocked: (template: ResumeTemplateOption) => boolean
  templateRegistry?: ResumeAtsTemplateVO[]
  presentationConfig?: ResumePresentationConfig
  registryError?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [code: ResumeTemplateCode]
  'accent-change': [accent: string]
  'zoom-change': [delta: number]
  cancel: []
  confirm: []
}>()

const localAccent = ref<string>(props.accent)
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

const accentColor = (accent: string) => resolveAccentHex(accent)

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

const selectAccent = (accent: string) => {
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
:global(.resume-template-browser-drawer) {
  --el-drawer-bg-color: #ffffff;
}

:global(.resume-template-browser-drawer .el-drawer__body) {
  padding: 0;
}

.template-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.template-browser__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e5e7eb;
}

.template-browser__heading {
  display: flex;
  align-items: center;
  gap: 10px;

  h2 {
    margin: 0;
    color: #111827;
    font-size: 17px;
    font-weight: 600;
  }

  p {
    margin: 2px 0 0;
    color: #9ca3af;
    font-size: 12px;
  }
}

.template-browser__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;

  &:hover { background: #f3f4f6; color: #111827; }
}

.template-browser__palette {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      border-radius: 999px;
      background: var(--swatch-color, #e5e7eb);
      color: #ffffff;
    }

    &:hover { transform: scale(1.12); }

    &.is-active {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px var(--el-color-primary, #0047ab);
    }
  }
}

.template-browser__error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 20px 0;
  padding: 10px 12px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.06);
  color: #b91c1c;
  font-size: 12.5px;
}

.template-browser__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.template-browser__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  padding: 18px 20px 28px;
}

/* ---- 模板卡（魔方 TemplateSheet 同款纯封面卡） ---- */
.template-card {
  position: relative;
}

.template-card__cover {
  position: relative;
  aspect-ratio: 210 / 297;
  overflow: hidden;
  border: 2px solid #f3f4f6;
  border-radius: 10px;
  background: #f9fafb;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;

  .template-card:hover & {
    border-color: #e5e7eb;
    transform: scale(1.02);
  }

  .template-card.is-selected & {
    border-color: var(--el-color-primary, #0047ab);
    box-shadow: 0 10px 24px rgba(0, 71, 171, 0.18);
  }
}

.template-card__select {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;

  &:disabled { cursor: not-allowed; }
}

.template-card__paper-frame {
  position: absolute;
  inset: 0;
  display: block;
  overflow: hidden;
  background: #ffffff;
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

.template-card__veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(17, 24, 39, 0.35);
  color: #ffffff;
  pointer-events: none;

  &.is-lock {
    background: rgba(17, 24, 39, 0.55);

    em {
      color: #f3f4f6;
      font-size: 11px;
      font-style: normal;
    }
  }
}

.template-card__zoom {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  color: #374151;
  cursor: pointer;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.16s ease;

  &:hover { background: #ffffff; color: #111827; }

  &:disabled { opacity: 0 !important; cursor: not-allowed; }

  .template-card:hover & { opacity: 1; }
}

.template-card__name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 2px 0;

  strong {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    color: #111827;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;

    .template-card.is-selected & { color: var(--el-color-primary, #0047ab); }
  }

  span {
    flex: 0 0 auto;
    color: #9ca3af;
    font-size: 11px;

    &.is-formal { color: var(--el-color-primary, #0047ab); }
  }
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
