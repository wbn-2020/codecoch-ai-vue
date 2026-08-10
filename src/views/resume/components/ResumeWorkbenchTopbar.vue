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

    <nav class="resume-workbench-topbar__modes" aria-label="简历工作台模式">
      <button
        type="button"
        :class="{ 'is-active': inspectorMode === 'edit' }"
        :aria-current="inspectorMode === 'edit' ? 'page' : undefined"
        @click="emit('mode-change', 'edit')"
      >
        编辑
      </button>
      <button
        type="button"
        :class="{ 'is-active': inspectorMode === 'review' }"
        :aria-current="inspectorMode === 'review' ? 'page' : undefined"
        @click="emit('mode-change', 'review')"
      >
        <ClipboardCheck :size="16" aria-hidden="true" />
        检查
      </button>
      <button
        type="button"
        :class="{ 'is-active': inspectorMode === 'ai' }"
        :aria-current="inspectorMode === 'ai' ? 'page' : undefined"
        @click="emit('mode-change', 'ai')"
      >
        <Sparkles :size="16" aria-hidden="true" />
        AI 优化
      </button>
    </nav>

    <div class="resume-workbench-topbar__actions">
      <span class="resume-workbench-topbar__completion" :aria-label="`简历完成度 ${completion}%`">
        {{ completion }}%
      </span>
      <button class="resume-workbench-topbar__action" type="button" @click="emit('open-templates')">
        <LayoutTemplate :size="16" aria-hidden="true" />
        <span>{{ templateLabel }}</span>
      </button>
      <button class="resume-workbench-topbar__action" type="button" @click="emit('open-export')">
        <Download :size="16" aria-hidden="true" />
        <span>导出</span>
      </button>
      <button
        class="resume-workbench-topbar__action resume-workbench-topbar__action--primary"
        type="button"
        :disabled="saving"
        @click="emit('save')"
      >
        <Save :size="16" aria-hidden="true" />
        <span>{{ saving ? '保存中' : isEdit ? '保存' : '创建简历' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import {
  ArrowLeft,
  ClipboardCheck,
  Download,
  FileText,
  LayoutTemplate,
  Save,
  Sparkles
} from 'lucide-vue-next'

defineProps<{
  title: string
  saveState: string
  completion: number
  saving: boolean
  isEdit: boolean
  templateLabel: string
  inspectorMode: 'edit' | 'review' | 'ai'
}>()

const emit = defineEmits<{
  back: []
  save: []
  'open-templates': []
  'open-export': []
  'mode-change': [mode: 'edit' | 'review' | 'ai']
}>()
</script>

<style scoped lang="scss">
.resume-workbench-topbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto minmax(330px, 1fr);
  align-items: center;
  min-height: 58px;
  padding: 0 16px;
  border-bottom: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
}

.resume-workbench-topbar__document,
.resume-workbench-topbar__title,
.resume-workbench-topbar__modes,
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

.resume-workbench-topbar__modes {
  justify-content: center;
  gap: 3px;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
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

@media (max-width: 1180px) {
  .resume-workbench-topbar {
    grid-template-columns: minmax(220px, 1fr) auto;
  }

  .resume-workbench-topbar__modes {
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

  .resume-workbench-topbar__modes,
  .resume-workbench-topbar__completion,
  .resume-workbench-topbar__action:not(.resume-workbench-topbar__action--primary) {
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
