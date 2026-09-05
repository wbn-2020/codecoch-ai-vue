<template>
  <header class="magic-topbar">
    <div class="magic-topbar__left">
      <button type="button" class="magic-topbar__brand" title="返回简历管理" @click="emit('back')">
        CodeCoachAI
      </button>
      <span class="magic-topbar__divider">/</span>
      <div class="magic-topbar__name">
        <input
          class="magic-topbar__name-input"
          :value="title"
          placeholder="简历名称"
          aria-label="简历名称"
          @change="handleRename"
        >
        <PenLine class="magic-topbar__name-pen" :size="13" />
      </div>
      <span
        v-if="saveBadge"
        class="magic-topbar__badge"
        :class="`magic-topbar__badge--${saveBadge.tone}`"
      >
        <ShieldAlert v-if="saveBadge.tone === 'warn'" :size="14" />
        <ShieldCheck v-else :size="14" />
        {{ saveBadge.text }}
      </span>
    </div>

    <div class="magic-topbar__right">
      <button
        type="button"
        class="magic-topbar__icon-btn"
        :disabled="!canUndo"
        aria-label="撤销"
        title="撤销"
        @click="emit('undo')"
      >
        <Undo2 :size="16" />
      </button>
      <button
        type="button"
        class="magic-topbar__icon-btn"
        :disabled="!canRedo"
        aria-label="重做"
        title="重做"
        @click="emit('redo')"
      >
        <Redo2 :size="16" />
      </button>

      <span class="magic-topbar__sep" />

      <button
        type="button"
        class="magic-topbar__ghost"
        :class="{ 'is-active': inspectorMode !== 'edit' }"
        @click="emit('mode-change', inspectorMode === 'edit' ? 'review' : 'edit')"
      >
        <ClipboardCheck :size="15" />
        检查
      </button>
      <button
        type="button"
        class="magic-topbar__ghost"
        @click="emit('open-export')"
      >
        <Sparkles :size="15" />
        AI 优化
      </button>
      <button
        type="button"
        class="magic-topbar__ghost"
        :disabled="saving"
        @click="emit('save-draft')"
      >
        保存草稿
      </button>
      <button
        type="button"
        class="magic-topbar__primary"
        :disabled="saving"
        @click="emit('save')"
      >
        {{ saving ? '保存中…' : '保存修改' }}
      </button>
      <el-dropdown trigger="click" @command="handleExportCommand">
        <button type="button" class="magic-topbar__export">
          导出
          <ChevronDown :size="14" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="pdf">
              <FileCheck2 :size="14" />
              导出 PDF
            </el-dropdown-item>
            <el-dropdown-item command="print">
              <Printer :size="14" />
              打印设计版
            </el-dropdown-item>
            <el-dropdown-item command="reset" divided>
              <RotateCcw :size="14" />
              重置简历
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  PenLine,
  Printer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Undo2,
  Redo2
} from 'lucide-vue-next'
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  saveState: string
  saving?: boolean
  canUndo?: boolean
  canRedo?: boolean
  inspectorMode?: 'edit' | 'review' | 'ai'
}>(), {
  saving: false,
  canUndo: false,
  canRedo: false,
  inspectorMode: 'edit'
})

const emit = defineEmits<{
  back: []
  rename: [value: string]
  save: []
  'save-draft': []
  'open-export': []
  'reset-resume': []
  'export-pdf': []
  'open-print': []
  undo: []
  redo: []
  'mode-change': [mode: 'edit' | 'review' | 'ai']
}>()

const saveBadge = computed(() => {
  const state = props.saveState || ''
  if (state.includes('保存中') || state.includes('自动保存')) {
    return { tone: 'muted' as const, text: state }
  }
  if (state.includes('未保存') || state.includes('草稿')) {
    return { tone: 'warn' as const, text: state }
  }
  if (state.includes('有未保存')) {
    return { tone: 'warn' as const, text: '未备份' }
  }
  if (state.includes('已保存')) {
    return { tone: 'ok' as const, text: '已保存' }
  }
  return null
})

const handleRename = (event: Event) => {
  emit('rename', (event.target as HTMLInputElement).value)
}

const handleExportCommand = (command: string | number | object) => {
  if (command === 'pdf') emit('export-pdf')
  else if (command === 'print') emit('open-print')
  else if (command === 'reset') emit('reset-resume')
}
</script>

<style scoped lang="scss">
.magic-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 18px 0 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.magic-topbar__left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.magic-topbar__brand {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: #111827;
  cursor: pointer;
  font-size: 17px;
  font-weight: 600;

  &:hover { color: var(--el-color-primary, #0047ab); }
}

.magic-topbar__divider {
  color: rgba(156, 163, 175, 0.45);
  font-weight: 300;
}

.magic-topbar__name {
  position: relative;
  display: flex;
  align-items: center;
}

.magic-topbar__name-input {
  width: 216px;
  height: 32px;
  padding: 4px 30px 4px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(243, 244, 246, 0.6);
  color: #374151;
  cursor: default;
  font-size: 13px;
  font-weight: 500;
  outline: none;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover { background: rgba(243, 244, 246, 1); }

  &:focus {
    background: #ffffff;
    border-color: #e5e7eb;
    cursor: text;
  }
}

.magic-topbar__name-pen {
  position: absolute;
  right: 10px;
  color: rgba(156, 163, 175, 0.5);
  pointer-events: none;
}

.magic-topbar__badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;

  &--warn {
    color: #d97706;
    background: rgba(254, 243, 199, 0.55);
  }

  &--ok {
    color: #059669;
    background: rgba(209, 250, 229, 0.55);
  }

  &--muted {
    color: #6b7280;
    background: #f3f4f6;
  }
}

.magic-topbar__right {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

.magic-topbar__sep {
  width: 1px;
  height: 18px;
  margin: 0 4px;
  background: #e5e7eb;
}

.magic-topbar__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #4b5563;
  cursor: pointer;

  &:hover:not(:disabled) { background: #f3f4f6; color: #111827; }

  &:disabled { color: #d1d5db; cursor: not-allowed; }
}

.magic-topbar__ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.18s ease, border-color 0.18s ease;

  &:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }

  &:disabled { color: #9ca3af; cursor: not-allowed; }

  &.is-active {
    border-color: var(--el-color-primary, #0047ab);
    color: var(--el-color-primary, #0047ab);
  }
}

.magic-topbar__primary {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: #111827;
  color: #ffffff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.18s ease;

  &:hover:not(:disabled) { background: #1f2937; }

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.magic-topbar__export {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 13px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;

  &:hover { background: #f9fafb; border-color: #d1d5db; }
}
</style>
