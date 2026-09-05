<template>
  <header class="resume-workbench-topbar">
    <div class="resume-workbench-topbar__document">
      <button class="resume-workbench-topbar__icon-button" type="button" aria-label="返回简历列表" @click="emit('back')">
        <ArrowLeft :size="18" aria-hidden="true" />
      </button>
      <div class="resume-workbench-topbar__identity">
        <div class="resume-workbench-topbar__title">
          <FileText :size="16" aria-hidden="true" />
          <strong>{{ title || '未命名简历' }}</strong>
        </div>
        <span class="resume-workbench-topbar__save-state" :class="{ 'is-dirty': saveState !== '已保存' }">
          {{ saveState }}
        </span>
      </div>
    </div>

    <!-- v22 原型：中央区域改为模板切换 tab -->
    <nav class="resume-workbench-topbar__templates" aria-label="简历模板切换">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        :class="{ 'is-active': activeTemplateId === template.id }"
        :aria-current="activeTemplateId === template.id ? 'true' : undefined"
        :title="`切换到「${template.label}」`"
        @click="emit('template-change', template.id)"
      >
        {{ template.label }}
      </button>
    </nav>

    <div class="resume-workbench-topbar__actions">
      <span v-if="hasStarted" class="resume-workbench-topbar__completion" :aria-label="`已完善 ${completion}%`">
        已完善 {{ completion }}%
      </span>
      <span v-else class="resume-workbench-topbar__completion is-pending">
        待填写
      </span>
      <div class="resume-workbench-topbar__history" role="group" aria-label="编辑历史">
        <button
          class="resume-workbench-topbar__icon-button"
          type="button"
          aria-label="撤销"
          title="撤销"
          :disabled="!canUndo"
          @click="emit('undo')"
        >
          <Undo2 :size="16" aria-hidden="true" />
        </button>
        <button
          class="resume-workbench-topbar__icon-button"
          type="button"
          aria-label="重做"
          title="重做"
          :disabled="!canRedo"
          @click="emit('redo')"
        >
          <Redo2 :size="16" aria-hidden="true" />
        </button>
      </div>
      <!-- v22 原型：右侧三动作（AI 优化 / 重置 / 导出 PDF） -->
      <button
        class="resume-workbench-topbar__action resume-workbench-topbar__action--utility"
        type="button"
        aria-label="打开 AI 优化建议"
        title="打开 AI 优化建议"
        @click="emit('mode-change', 'ai')"
      >
        <Sparkles :size="16" aria-hidden="true" />
        <span>AI 优化</span>
      </button>
      <button
        class="resume-workbench-topbar__action resume-workbench-topbar__action--utility"
        type="button"
        aria-label="重置当前简历"
        title="重置当前简历"
        @click="emit('reset-resume')"
      >
        <RotateCcw :size="16" aria-hidden="true" />
        <span>重置</span>
      </button>
      <button
        class="resume-workbench-topbar__action resume-workbench-topbar__action--utility"
        type="button"
        aria-label="导出 PDF"
        title="导出 PDF"
        @click="emit('export-pdf')"
      >
        <FileDown :size="16" aria-hidden="true" />
        <span>导出 PDF</span>
      </button>
      <button
        class="resume-workbench-topbar__action"
        type="button"
        :disabled="saving"
        @click="emit('save-draft')"
      >
        <span>{{ saving ? '保存中' : '保存草稿' }}</span>
      </button>
      <button
        class="resume-workbench-topbar__action resume-workbench-topbar__action--primary"
        type="button"
        :disabled="saving"
        @click="emit('save')"
      >
        <Save :size="16" aria-hidden="true" />
        <span>{{ saving ? '保存中' : isEdit ? '保存更改' : '保存并创建简历' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  FileDown,
  FileText,
  Redo2,
  RotateCcw,
  Save,
  Sparkles,
  Undo2
} from 'lucide-vue-next'

export interface TemplateOption {
  id: string
  label: string
}

defineProps<{
  title: string
  saveState: string
  completion: number
  hasStarted: boolean
  saving: boolean
  isEdit: boolean
  canUndo: boolean
  canRedo: boolean
  templateLabel: string
  inspectorMode: 'edit' | 'review' | 'ai'
  activeStep: 'fill' | 'review' | 'preview' | 'export'
  templates: TemplateOption[]
  activeTemplateId: string
}>()

const emit = defineEmits<{
  back: []
  save: []
  'save-draft': []
  'open-templates': []
  'open-export': []
  'open-preview': []
  'template-change': [id: string]
  'reset-resume': []
  'export-pdf': []
  undo: []
  redo: []
  'mode-change': [mode: 'edit' | 'review' | 'ai']
}>()
</script>

<style scoped lang="scss">
.resume-workbench-topbar {
  display: grid;
  grid-template-columns: minmax(250px, 1fr) auto minmax(360px, 1fr);
  align-items: center;
  min-height: 60px;
  padding: 0 18px;
  border-bottom: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
  box-shadow: 0 1px 2px rgba(26, 25, 23, 0.03), 0 8px 20px -16px rgba(26, 25, 23, 0.18);
}

.resume-workbench-topbar__document,
.resume-workbench-topbar__title,
.resume-workbench-topbar__templates,
.resume-workbench-topbar__actions {
  display: flex;
  align-items: center;
}

.resume-workbench-topbar__document {
  min-width: 0;
  gap: 10px;
}

/* v22 原型：模板切换 tab —— 5 个模板，当前激活用主色绿底白字 */
.resume-workbench-topbar__templates {
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 8px;
    background: var(--resume-workbench-surface-soft);
    color: var(--resume-workbench-text-soft);
    font-size: 12.5px;
    font-weight: 550;
    cursor: pointer;
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      color: var(--resume-workbench-accent);
      outline: 0;
    }

    &.is-active {
      background: var(--resume-workbench-accent);
      border-color: var(--resume-workbench-accent);
      color: #fff;
      font-weight: 600;
      box-shadow: none;
    }
  }
}

.resume-workbench-topbar__icon-button,
.resume-workbench-topbar__modes button,
.resume-workbench-topbar__action {
  border: 0;
  font: inherit;
  cursor: pointer;
}

.resume-workbench-topbar__icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border-radius: 9px;
  background: transparent;
  color: var(--resume-workbench-muted);
  transition: background 0.16s ease, color 0.16s ease;

  &:hover,
  &:focus-visible {
    background: var(--resume-workbench-surface-soft);
    color: var(--resume-workbench-text);
    outline: 0;
  }
}

.resume-workbench-topbar__identity {
  min-width: 0;
}

.resume-workbench-topbar__title {
  min-width: 0;
  gap: 7px;
  font-size: 14px;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.resume-workbench-topbar__save-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  color: var(--resume-workbench-success);
  font-size: 11px;

  &::before {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    content: '';
  }

  &.is-dirty {
    color: var(--resume-workbench-warning);
  }
}

.resume-workbench-topbar__steps {
  justify-content: center;
  gap: 3px;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 36px;
    padding: 0 13px;
    border-radius: 9px;
    background: transparent;
    color: var(--resume-workbench-muted);
    font-size: 12.5px;
    font-weight: 650;
    transition: background 0.16s ease, color 0.16s ease;

    &:hover,
    &:focus-visible {
      background: var(--resume-workbench-surface-soft);
      color: var(--resume-workbench-text);
      outline: 0;
    }

    &.is-active {
      background: var(--resume-workbench-accent-soft);
      color: var(--resume-workbench-accent);
      font-weight: 700;
    }

    > span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 17px;
      height: 17px;
      border: 1px solid currentColor;
      border-radius: 50%;
      font-size: 9px;
      line-height: 1;
    }
  }
}

.resume-workbench-topbar__actions {
  justify-content: flex-end;
  min-width: 0;
  gap: 8px;
}

.resume-workbench-topbar__history {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 2px;
  padding-right: 9px;
  border-right: 1px solid var(--resume-workbench-line);

  .resume-workbench-topbar__icon-button {
    width: 32px;
    height: 32px;
    flex-basis: 32px;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.38;
    }

    &:disabled:hover,
    &:disabled:focus-visible {
      background: transparent;
      color: var(--resume-workbench-muted);
    }
  }
}

.resume-workbench-topbar__completion {
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--resume-workbench-success-soft);
  color: var(--resume-workbench-success);
  font-size: 11px;
  font-weight: 700;

  &.is-pending {
    background: var(--resume-workbench-surface-soft);
    color: var(--resume-workbench-muted);
  }
}

.resume-workbench-topbar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid var(--resume-workbench-line-strong);
  border-radius: 8px;
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text-soft);
  font-size: 13px;
  font-weight: 600;
  transition: border-color 0.16s ease, color 0.16s ease, background 0.16s ease,
    box-shadow 0.16s ease, transform 0.08s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--resume-workbench-accent);
    color: var(--resume-workbench-accent);
    outline: 0;
  }

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
}

.resume-workbench-topbar__action--primary {
  border-color: var(--resume-workbench-accent);
  background: var(--resume-workbench-accent);
  color: #fff;
  box-shadow: 0 1px 2px rgba(26, 25, 23, 0.06), 0 8px 16px -8px rgba(31, 111, 92, 0.5);

  &:hover,
  &:focus-visible {
    border-color: var(--resume-workbench-accent-strong);
    background: var(--resume-workbench-accent-strong);
    color: #fff;
    box-shadow: 0 2px 4px rgba(26, 25, 23, 0.08), 0 12px 22px -10px rgba(31, 111, 92, 0.55);
  }
}

.resume-workbench-topbar__action--utility {
  border-color: transparent;
  background: transparent;
  color: var(--resume-workbench-muted);

  &:hover,
  &:focus-visible {
    border-color: var(--resume-workbench-line);
    background: var(--resume-workbench-surface-soft);
    color: var(--resume-workbench-text);
  }
}

@media (max-width: 1180px) {
  .resume-workbench-topbar {
    grid-template-columns: minmax(220px, 1fr) auto;
  }

  .resume-workbench-topbar__steps {
    order: 3;
    grid-column: 1 / -1;
    min-height: 42px;
    border-top: 1px solid var(--resume-workbench-line);
  }
}

@media (max-width: 720px) {
  .resume-workbench-topbar {
    display: flex;
    min-height: 54px;
    padding: 0 10px;
  }

  .resume-workbench-topbar__document {
    flex: 1;
  }

  .resume-workbench-topbar__steps,
  .resume-workbench-topbar__completion,
  .resume-workbench-topbar__action--utility {
    display: none;
  }

  .resume-workbench-topbar__action--primary {
    min-width: 68px;
  }
}

@media (max-width: 480px) {
  .resume-workbench-topbar__history {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-workbench-topbar__action:active {
    transform: none;
  }
}
</style>
