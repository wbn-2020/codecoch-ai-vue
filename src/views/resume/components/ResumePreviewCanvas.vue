<template>
  <div
    ref="rootRef"
    class="resume-preview-canvas"
    :class="{ 'is-fit-active': fitScale < 0.999, 'is-fit-warning': cannotFit }"
    @click.capture="handleClickCapture"
  >
    <ResumeDocumentPreview
      :draft="draft"
      :document="document"
      :template-code="templateCode"
      :accent="accent"
      :density="density"
      :presentation-config="presentationConfig"
      :fit-scale="fitScale"
    />

    <div
      v-for="line in shownBreakLines"
      :key="line.page"
      class="resume-page-break"
      :style="{ top: `${line.top}px` }"
      aria-hidden="true"
    >
      <span class="resume-page-break__label">第 {{ line.page + 1 }} 页从这开始</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  normalizeResumeTemplateCode,
  type ResumeAccent,
  type ResumeDocumentDraft,
  type ResumePreviewDensity,
  type ResumeTemplateCode
} from '@/features/resume-document'
import { A4_PAGE_HEIGHT_PX } from '@/features/resume-template/pagination'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'
import type { ResumePresentationConfig } from '@/types/resumePresentation'

import ResumeDocumentPreview from './ResumeDocumentPreview.vue'

/** 允许的亚像素/取整误差，避免刚好一页的内容被判成两页。 */
const PAGE_TOLERANCE_PX = 6
/** 自适应一页允许的最小压缩系数，压到下限仍放不下就提示用户（对齐 magic-resume）。 */
const MIN_FIT_SCALE = 0.9

const props = withDefaults(defineProps<{
  draft: ResumeDocumentDraft
  document?: ResumeDocumentV2 | null
  templateCode?: ResumeTemplateCode | string
  accent?: string
  density?: ResumePreviewDensity
  presentationConfig?: ResumePresentationConfig
  pageBreakLinesVisible?: boolean
}>(), {
  document: null,
  templateCode: 'ATS_SINGLE_COLUMN',
  accent: '#0047AB',
  density: 'comfortable',
  presentationConfig: undefined,
  pageBreakLinesVisible: true
})

const emit = defineEmits<{
  'section-activate': [key: string]
  'page-status': [status: { pageCount: number; fitted: boolean; cannotFit: boolean }]
}>()

const rootRef = ref<HTMLElement | null>(null)

const layoutHeight = ref(0)
const fitScale = ref(1)
const cannotFit = ref(false)

const autoOnePageEnabled = computed(() => props.presentationConfig?.autoOnePage === true)

/**
 * 纸张在“布局像素”下的高度。外层 stage 会用 CSS zoom 做预览缩放，
 * 直接读 rect 会被放大缩小；纸张宽度固定 794 布局像素，
 * 用宽度的缩放比反推，即可与 zoom 无关地测高。
 */
const measurePaper = () => {
  const root = rootRef.value
  if (!root) return 0
  const paper = root.querySelector<HTMLElement>('.template-paper, .resume-document')
  if (!paper) return 0
  const rect = paper.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return 0
  return rect.height * (794 / rect.width)
}

/** 单步测量与压缩：读高度 -> 更新页数口径 -> 计算下一步 fitScale。 */
const applyMeasurement = () => {
  const height = measurePaper()
  if (height <= 0) return
  layoutHeight.value = height

  if (!autoOnePageEnabled.value) {
    if (fitScale.value !== 1) fitScale.value = 1
    cannotFit.value = false
    return
  }

  // 内容不足一页时回到 1，避免上一轮压缩残留。
  if (height <= A4_PAGE_HEIGHT_PX + PAGE_TOLERANCE_PX) {
    fitScale.value = 1
    cannotFit.value = false
    return
  }

  // height 是当前 fitScale 下的实测高度；candidate 是再缩放一步后的估计值。
  // fitScale 与内容高度单调相关，逐次逼近不会振荡；到下限即停并提示。
  const candidate = fitScale.value * (A4_PAGE_HEIGHT_PX / height)
  const next = Math.max(MIN_FIT_SCALE, Math.min(1, candidate))

  fitScale.value = next
  // 压到下限仍超一页：提示用户精简内容（height 已含当前缩放，不再重复相乘）。
  cannotFit.value = next <= MIN_FIT_SCALE + 0.004 && height > A4_PAGE_HEIGHT_PX + PAGE_TOLERANCE_PX
}

let observer: ResizeObserver | null = null
let measureQueued = false
let convergeToken = 0
const FIT_SETTLE_DELAY_MS = 40
const FIT_MAX_PASSES = 8

/**
 * 有界收敛循环：应用一次压缩后等 DOM 重排，再测量下一步。
 * 不能只依赖 ResizeObserver 逐环驱动——同一帧内的连续尺寸变化
 * 可能触发 "ResizeObserver loop" 限制而丢掉后续通知。
 */
const convergeFit = async () => {
  const token = ++convergeToken
  for (let pass = 0; pass < FIT_MAX_PASSES; pass += 1) {
    applyMeasurement()
    await new Promise((resolve) => setTimeout(resolve, FIT_SETTLE_DELAY_MS))
    if (token !== convergeToken) return
  }
}

const scheduleMeasure = () => {
  if (measureQueued) return
  measureQueued = true
  Promise.resolve().then(() => {
    measureQueued = false
    void convergeFit()
  })
}

onMounted(() => {
  observer = new ResizeObserver(scheduleMeasure)
  if (rootRef.value) observer.observe(rootRef.value)
  scheduleMeasure()
})

onBeforeUnmount(() => {
  convergeToken += 1
  observer?.disconnect()
  observer = null
  measureQueued = false
})

watch(() => [
  props.templateCode,
  props.draft,
  props.document,
  props.presentationConfig,
  props.density,
  autoOnePageEnabled.value
], () => {
  if (!autoOnePageEnabled.value) fitScale.value = 1
  scheduleMeasure()
}, { deep: true })

const pageCount = computed(() => {
  if (layoutHeight.value <= 0) return 1
  return Math.max(1, Math.ceil((layoutHeight.value - PAGE_TOLERANCE_PX) / A4_PAGE_HEIGHT_PX))
})

const pageBreakLines = computed(() => {
  const lines: Array<{ page: number; top: number }> = []
  for (let page = 1; page < pageCount.value; page += 1) {
    lines.push({ page, top: page * A4_PAGE_HEIGHT_PX })
  }
  return lines
})

const shownBreakLines = computed(() =>
  props.pageBreakLinesVisible === false ? [] : pageBreakLines.value
)

watch(() => ({
  pageCount: pageCount.value,
  fitted: autoOnePageEnabled.value && pageCount.value === 1,
  cannotFit: cannotFit.value
}), (status) => {
  emit('page-status', status)
}, { deep: true, immediate: true })

const handleClickCapture = (event: MouseEvent) => {
  const target = event.target as HTMLElement | null
  const sectionEl = target?.closest<HTMLElement>('[data-section]')
  const key = sectionEl?.dataset.section
  if (!key) return
  emit('section-activate', key)
}
</script>

<style scoped lang="scss">
.resume-preview-canvas {
  position: relative;
  /* 与 TemplatePaper 同宽：预览缩放由 stage 的 zoom 负责，这里保持布局像素稳定，
     画布高度始终随纸张生长。flex-basis 固定，避免被 stage 压缩导致 A4 比例失真。 */
  flex: 0 0 auto;
  width: 794px;
  margin: 0 auto;
}

.resume-page-break {
  position: absolute;
  right: 0;
  left: 0;
  height: 0;
  pointer-events: none;

  &::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 0;
    border-top: 2px dashed rgba(229, 72, 77, 0.75);
    content: "";
  }

  &__label {
    position: absolute;
    right: 6px;
    top: -22px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(229, 72, 77, 0.1);
    color: #c73338;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
    white-space: nowrap;
  }
}

/* 预览与编辑联动：悬停高亮可点击的板块，点击回到编辑器对应表单。 */
.resume-preview-canvas :deep([data-section]) {
  cursor: pointer;
  outline: 1.5px dashed transparent;
  outline-offset: 8px;
  transition: outline-color 0.15s ease;
}

.resume-preview-canvas :deep([data-section]:hover) {
  outline-color: rgba(31, 111, 92, 0.55);
}
</style>
