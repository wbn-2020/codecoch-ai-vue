<template>
  <div class="magic-dock" role="toolbar" aria-label="预览工具">
    <div class="magic-dock__rail">
      <button
        type="button"
        class="magic-dock__btn"
        :class="{ 'is-on': autoOnePage }"
        title="自动一页"
        aria-label="自动一页"
        @click="emit('toggle-auto-one-page')"
      >
        <FileText :size="16" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        :class="{ 'is-on': !pageBreakLinesVisible }"
        title="分页线"
        aria-label="显示或隐藏分页线"
        @click="emit('toggle-page-breaks')"
      >
        <EyeOff :size="16" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        title="导出 PDF"
        aria-label="导出 PDF"
        @click="emit('export-pdf')"
      >
        <Download :size="16" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        title="保存草稿"
        aria-label="保存草稿"
        @click="emit('save-draft')"
      >
        <Save :size="16" />
      </button>

      <span class="magic-dock__divider" />

      <button
        type="button"
        class="magic-dock__btn"
        :class="{ 'is-on': !sideCollapsed }"
        title="布局面板"
        aria-label="展开或收起布局面板"
        @click="emit('toggle-side')"
      >
        <PanelRightOpen v-if="sideCollapsed" :size="18" />
        <PanelRightClose v-else :size="18" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        :class="{ 'is-on': !editorCollapsed }"
        title="编辑面板"
        aria-label="展开或收起编辑面板"
        @click="emit('toggle-editor')"
      >
        <PenLine :size="17" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        :class="{ 'is-on': !previewFocus }"
        title="预览聚焦"
        aria-label="进入或退出预览聚焦"
        @click="emit('toggle-preview')"
      >
        <Eye :size="17" />
      </button>

      <span class="magic-dock__divider" />

      <button
        type="button"
        class="magic-dock__btn"
        title="选择模板"
        aria-label="选择模板"
        @click="emit('open-templates')"
      >
        <LayoutTemplate :size="16" />
      </button>
      <button
        type="button"
        class="magic-dock__btn"
        title="返回简历管理"
        aria-label="返回简历管理"
        @click="emit('back')"
      >
        <Home :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Download,
  Eye,
  EyeOff,
  FileText,
  Home,
  LayoutTemplate,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Save
} from 'lucide-vue-next'

withDefaults(defineProps<{
  autoOnePage?: boolean
  pageBreakLinesVisible?: boolean
  sideCollapsed?: boolean
  editorCollapsed?: boolean
  previewFocus?: boolean
}>(), {
  autoOnePage: false,
  pageBreakLinesVisible: true,
  sideCollapsed: false,
  editorCollapsed: false,
  previewFocus: false
})

const emit = defineEmits<{
  'toggle-auto-one-page': []
  'toggle-page-breaks': []
  'export-pdf': []
  'save-draft': []
  'toggle-side': []
  'toggle-editor': []
  'toggle-preview': []
  'open-templates': []
  back: []
}>()
</script>

<style scoped lang="scss">
.magic-dock {
  position: absolute;
  top: 50%;
  right: 10px;
  z-index: 30;
  transform: translateY(-50%);
}

.magic-dock__rail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid rgba(229, 231, 235, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 30px rgba(17, 24, 39, 0.12);
  backdrop-filter: blur(6px);
}

.magic-dock__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: background 0.16s ease, color 0.16s ease, transform 0.16s ease;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  &:active { transform: scale(0.94); }

  &.is-on {
    background: var(--el-color-primary, #0047ab);
    color: #ffffff;

    &:hover { background: #003a8c; color: #ffffff; }
  }
}

.magic-dock__divider {
  width: 22px;
  height: 1px;
  margin: 2px auto;
  background: #e5e7eb;
}
</style>
