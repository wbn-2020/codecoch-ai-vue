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

    <nav class="resume-workbench-topbar__steps" aria-label="简历工作流程">
      <button
        type="button"
        :class="{ 'is-active': activeStep === 'fill' }"
        :aria-current="activeStep === 'fill' ? 'step' : undefined"
        @click="emit('mode-change', 'edit')"
      >
        <span>1</span>
        填写
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeStep === 'review' }"
        :aria-current="activeStep === 'review' ? 'step' : undefined"
        @click="emit('mode-change', 'review')"
      >
        <span>2</span>
        检查
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeStep === 'preview' }"
        :aria-current="activeStep === 'preview' ? 'step' : undefined"
        @click="emit('open-preview')"
      >
        <span>3</span>
        预览
      </button>
      <button
        type="button"
        :class="{ 'is-active': activeStep === 'export' }"
        :aria-current="activeStep === 'export' ? 'step' : undefined"
        @click="emit('open-export')"
      >
        <span>4</span>
        导出
      </button>
    </nav>

    <div class="resume-workbench-topbar__actions">
      <span v-if="hasStarted" class="resume-workbench-topbar__completion" :aria-label="`已完善 ${completion}%`">
        已完善 {{ completion }}%
      </span>
      <span v-else class="resume-workbench-topbar__completion is-pending">
        待填写
      </span>
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
        :aria-label="`调整模板，当前为 ${templateLabel}`"
        :title="`调整模板，当前为 ${templateLabel}`"
        @click="emit('open-templates')"
      >
        <LayoutTemplate :size="16" aria-hidden="true" />
        <span>模板</span>
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
  FileText,
  LayoutTemplate,
  Save,
  Sparkles
} from 'lucide-vue-next'

defineProps<{
  title: string
  saveState: string
  completion: number
  hasStarted: boolean
  saving: boolean
  isEdit: boolean
  templateLabel: string
  inspectorMode: 'edit' | 'review' | 'ai'
  activeStep: 'fill' | 'review' | 'preview' | 'export'
}>()

const emit = defineEmits<{
  back: []
  save: []
  'save-draft': []
  'open-templates': []
  'open-export': []
  'open-preview': []
  'mode-change': [mode: 'edit' | 'review' | 'ai']
}>()
</script>

<style scoped lang="scss">
.resume-workbench-topbar {
  display: grid;
  grid-template-columns: minmax(250px, 1fr) auto minmax(360px, 1fr);
  align-items: center;
  min-height: 58px;
  padding: 0 16px;
  border-bottom: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
}

.resume-workbench-topbar__document,
.resume-workbench-topbar__title,
.resume-workbench-topbar__steps,
.resume-workbench-topbar__actions {
  display: flex;
  align-items: center;
}

.resume-workbench-topbar__document {
  min-width: 0;
  gap: 10px;
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
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 6px;
  background: transparent;
  color: var(--resume-workbench-muted);

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
    min-height: 34px;
    padding: 0 12px;
    border-radius: 6px;
    background: transparent;
    color: var(--resume-workbench-muted);
    font-size: 12.5px;
    font-weight: 650;

    &:hover,
    &:focus-visible {
      background: var(--resume-workbench-surface-soft);
      color: var(--resume-workbench-text);
      outline: 0;
    }

    &.is-active {
      background: var(--resume-workbench-accent-soft);
      color: var(--resume-workbench-accent);
    }

    > span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
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
  min-height: 34px;
  padding: 0 11px;
  border: 1px solid var(--resume-workbench-line-strong);
  border-radius: 6px;
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text-soft);
  font-size: 12.5px;
  font-weight: 650;

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

  &:hover,
  &:focus-visible {
    border-color: var(--resume-workbench-accent-strong);
    background: var(--resume-workbench-accent-strong);
    color: #fff;
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

@media (prefers-reduced-motion: reduce) {
  .resume-workbench-topbar__action:active {
    transform: none;
  }
}
</style>
