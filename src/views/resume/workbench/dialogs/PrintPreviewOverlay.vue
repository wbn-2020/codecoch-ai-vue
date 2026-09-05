<template>
  <div class="print-preview-overlay" role="dialog" aria-modal="true" aria-label="设计版打印预览">
    <div class="print-preview-overlay__backdrop" @click="emit('close')"></div>

    <div class="print-preview-overlay__panel">
      <header class="print-preview-overlay__topbar">
        <div class="print-preview-overlay__title">
          <strong>设计版打印预览</strong>
          <span>{{ templateName }} · A4 共 {{ pageCount }} 页 · 卡片不跨页拆分</span>
        </div>
        <div class="print-preview-overlay__actions">
          <el-button type="primary" :loading="printing" @click="handlePrint">
            <Printer :size="15" />
            打印 / 另存为 PDF
          </el-button>
          <el-button @click="emit('close')">关闭</el-button>
        </div>
      </header>

      <div ref="viewportRef" class="print-preview-overlay__viewport">
        <div
          class="print-preview-overlay__sheet-frame"
          :style="{
            width: `${Math.round(A4_PAGE_WIDTH_PX * previewScale)}px`,
            height: `${Math.round(paperHeight * previewScale)}px`
          }"
        >
          <div
            class="print-preview-overlay__sheet"
            :style="{ transform: `scale(${previewScale})` }"
          >
            <div ref="sheetRef" class="print-preview-overlay__paper">
              <ResumeDocumentPreview
                :draft="draft"
                :template-code="templateCode"
                :accent="accent"
                :density="density"
                :presentation-config="presentationConfig"
                :document="document"
              />
              <div
                v-for="(top, index) in pageBreakTops"
                :key="top"
                class="print-preview-overlay__page-line"
                :style="{ top: `${top}px` }"
              >
                <span>第 {{ index + 2 }} 页起</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer class="print-preview-overlay__footer">
        <span>浏览器打印通道按模板设计排版，分页线为实际打印分页位置；如需机器解析优先的单栏版本，请使用服务器导出。</span>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Printer } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { ResumeDocumentDraft, ResumePreviewDensity, ResumeTemplateCode } from '@/features/resume-document'
import type { ResumeDocumentV2 } from '@/features/resume-workbench/document'
import type { ResumePresentationConfig } from '@/types/resumePresentation'
import { A4_PAGE_WIDTH_PX } from '@/features/resume-template/pagination'
import { stabilizePrintBreaks } from '@/views/resume/workbench/dialogs/print-pagination'
import { printResumeSheet } from '@/views/resume/workbench/dialogs/print-iframe'
import ResumeDocumentPreview from '@/views/resume/components/ResumeDocumentPreview.vue'

const props = defineProps<{
  draft: ResumeDocumentDraft
  templateCode: ResumeTemplateCode | string
  accent: string
  density: ResumePreviewDensity
  presentationConfig?: ResumePresentationConfig
  document?: ResumeDocumentV2 | null
  templateName: string
}>()

const emit = defineEmits<{ close: [] }>()

const viewportRef = ref<HTMLElement | null>(null)
const sheetRef = ref<HTMLElement | null>(null)
const printing = ref(false)
const pageCount = ref(1)
const paperHeight = ref(1123)
const pageBreakTops = ref<number[]>([])
const previewScale = ref(0.6)

let viewportObserver: ResizeObserver | null = null

const updateScale = () => {
  const viewport = viewportRef.value
  if (!viewport) return
  const available = viewport.clientWidth - 72
  previewScale.value = Math.min(1, Math.max(0.36, available / A4_PAGE_WIDTH_PX))
}

const measure = () => {
  const sheet = sheetRef.value
  if (!sheet) return
  const paper = sheet.querySelector<HTMLElement>('.resume-document')
  if (!paper) return
  const result = stabilizePrintBreaks(paper)
  pageCount.value = result.pageCount
  pageBreakTops.value = result.pageBreakTops
  paperHeight.value = Math.max(1123, paper.offsetHeight)
}

const handlePrint = async () => {
  printing.value = true
  try {
    await printResumeSheet({
      draft: props.draft,
      templateCode: props.templateCode,
      accent: props.accent,
      density: props.density,
      presentationConfig: props.presentationConfig,
      document: props.document
    })
  } catch {
    ElMessage.error('打印通道打开失败，请改用浏览器菜单中的打印功能')
  } finally {
    printing.value = false
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  updateScale()
  if (typeof ResizeObserver !== 'undefined' && viewportRef.value) {
    viewportObserver = new ResizeObserver(updateScale)
    viewportObserver.observe(viewportRef.value)
  }
  window.addEventListener('keydown', handleKeydown)
  void nextTick(measure)
})

onBeforeUnmount(() => {
  viewportObserver?.disconnect()
  window.removeEventListener('keydown', handleKeydown)
})

watch(
  () => [props.draft, props.templateCode, props.accent, props.density, props.presentationConfig, props.document],
  () => {
    void nextTick(measure)
  },
  { flush: 'post' }
)
</script>

<style scoped lang="scss">
.print-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.print-preview-overlay__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(8, 10, 12, 0.66);
}

.print-preview-overlay__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(1040px, calc(100vw - 48px));
  margin: 24px;
  padding: 18px 20px;
  border: 1px solid var(--user-border);
  border-radius: 14px;
  background: var(--user-bg-panel);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
}

.print-preview-overlay__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.print-preview-overlay__title {
  display: grid;
  gap: 3px;

  strong {
    color: var(--user-text);
    font-size: 15px;
  }

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.print-preview-overlay__actions {
  display: flex;
  gap: 8px;
}

.print-preview-overlay__viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 20px 36px 32px;
  border-radius: 10px;
  background: var(--user-surface);
  overscroll-behavior: contain;
}

.print-preview-overlay__sheet-frame {
  position: relative;
  margin: 0 auto;
}

.print-preview-overlay__sheet {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
}

.print-preview-overlay__paper {
  position: relative;
  width: 794px;
}

.print-preview-overlay__page-line {
  position: absolute;
  right: -14px;
  left: -14px;
  height: 0;
  border-top: 1px dashed #d16a5a;

  span {
    position: absolute;
    top: -9px;
    right: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: #d16a5a;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.6;
    white-space: nowrap;
  }
}

.print-preview-overlay__footer {
  span {
    color: var(--user-text-muted);
    font-size: 11.5px;
    line-height: 1.6;
  }
}

@media (max-width: 900px) {
  .print-preview-overlay__panel {
    margin: 12px;
    padding: 14px;
  }

  .print-preview-overlay__viewport {
    padding: 14px 16px 22px;
  }
}
</style>
