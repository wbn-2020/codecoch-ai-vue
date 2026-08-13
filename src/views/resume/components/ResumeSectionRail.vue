<template>
  <aside class="resume-section-rail" aria-label="简历区块">
    <div class="resume-section-rail__heading">
      <div>
        <strong>填写进度</strong>
        <span v-if="hasStarted">{{ completedCount }}/{{ items.length }} 个区块已完善</span>
        <span v-else>从基本信息开始</span>
      </div>
      <span v-if="hasStarted">{{ completion }}%</span>
      <span v-else class="is-pending">待填写</span>
    </div>

    <div v-if="hasStarted" class="resume-section-rail__progress" aria-hidden="true">
      <i :style="{ width: `${completion}%` }"></i>
    </div>

    <nav class="resume-section-rail__sections">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :class="{ 'is-active': item.id === activeId, 'is-done': item.done, 'is-invalid': item.invalid }"
        :aria-current="item.id === activeId ? 'step' : undefined"
        :aria-invalid="item.invalid || undefined"
        @click="emit('select', item.id)"
      >
        <span class="resume-section-rail__icon">
          <component :is="sectionIcon(item.id)" :size="17" aria-hidden="true" />
        </span>
        <span>{{ item.label }}</span>
        <AlertCircle v-if="item.invalid" :size="15" aria-label="需修正" />
        <CheckCircle2 v-else-if="item.done" :size="15" aria-label="已完善" />
        <Circle v-else :size="15" aria-label="待完善" />
      </button>
    </nav>

    <div class="resume-section-rail__review">
      <strong>下一步：检查</strong>
      <span v-if="hasStarted">{{ exportReadyCount }}/{{ exportTotal }} 项通过</span>
      <span v-else>填写后检查完整度</span>
      <button type="button" @click="emit('review')">
        <ClipboardCheck :size="16" aria-hidden="true" />
        开始检查
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Code2,
  FolderKanban,
  Target,
  UserRound
} from 'lucide-vue-next'

interface SectionItem {
  id: string
  label: string
  done: boolean
  invalid?: boolean
}

const props = defineProps<{
  items: SectionItem[]
  activeId: string
  completion: number
  hasStarted: boolean
  exportReadyCount: number
  exportTotal: number
}>()

const emit = defineEmits<{
  select: [id: string]
  review: []
}>()

const iconBySection: Record<string, Component> = {
  'resume-basic': UserRound,
  'resume-target': Target,
  'resume-skills': Code2,
  'resume-projects': FolderKanban,
  'resume-experience': BriefcaseBusiness
}

const sectionIcon = (id: string) => iconBySection[id] || Circle
const completedCount = computed(() => props.items.filter((item) => item.done).length)
</script>

<style scoped lang="scss">
.resume-section-rail {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface);
  color: var(--resume-workbench-text);
}

.resume-section-rail__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 16px 13px;

  div {
    display: grid;
    gap: 4px;
  }

  strong {
    font-size: 13.5px;
  }

  div span {
    color: var(--resume-workbench-muted);
    font-size: 11px;
  }

  > span {
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
}

.resume-section-rail__progress {
  height: 3px;
  margin: 0 16px 10px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--resume-workbench-line);

  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--resume-workbench-success);
    transition: width 180ms ease-out;
  }
}

.resume-section-rail__sections {
  display: grid;
  gap: 3px;
  padding: 6px 9px;

  button {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr) 18px;
    align-items: center;
    gap: 7px;
    min-height: 44px;
    padding: 0 9px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--resume-workbench-muted);
    font: inherit;
    font-size: 12.5px;
    text-align: left;
    cursor: pointer;

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

    &.is-invalid {
      background: color-mix(in srgb, var(--el-color-danger-light-9) 82%, var(--resume-workbench-surface));
      color: var(--el-color-danger);
    }

    &.is-invalid.is-active {
      box-shadow: inset 3px 0 0 var(--el-color-danger);
    }

    > svg {
      color: var(--resume-workbench-line-strong);
    }

    &.is-done > svg {
      color: var(--resume-workbench-success);
    }

    &.is-invalid > svg {
      color: var(--el-color-danger);
    }
  }
}

.resume-section-rail__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.resume-section-rail__review {
  display: grid;
  gap: 7px;
  margin: auto 12px 14px;
  padding: 13px;
  border-top: 1px solid var(--resume-workbench-line);
  background: var(--resume-workbench-surface-soft);

  strong {
    font-size: 12.5px;
  }

  span {
    color: var(--resume-workbench-muted);
    font-size: 11px;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 34px;
    border: 1px solid var(--resume-workbench-line-strong);
    border-radius: 6px;
    background: var(--resume-workbench-surface);
    color: var(--resume-workbench-text-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      color: var(--resume-workbench-accent);
      outline: 0;
    }
  }
}

@media (max-width: 1180px) {
  .resume-section-rail__heading > span,
  .resume-section-rail__heading div span,
  .resume-section-rail__review {
    display: none;
  }

  .resume-section-rail__heading {
    justify-content: center;
    padding-inline: 8px;
  }

  .resume-section-rail__heading strong {
    font-size: 12px;
  }

  .resume-section-rail__progress {
    margin-inline: 10px;
  }

  .resume-section-rail__sections button {
    grid-template-columns: 28px;
    justify-content: center;
    min-height: 42px;
    padding: 0;
  }

  .resume-section-rail__sections button > span:nth-child(2),
  .resume-section-rail__sections button > svg {
    display: none;
  }
}

@media (max-width: 900px) {
  .resume-section-rail {
    display: block;
    width: 100%;
    border-right: 0;
    border-bottom: 1px solid var(--resume-workbench-line);
    overflow: hidden;
  }

  .resume-section-rail__heading,
  .resume-section-rail__progress,
  .resume-section-rail__review {
    display: none;
  }

  .resume-section-rail__sections {
    display: flex;
    gap: 4px;
    padding: 6px 12px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    button {
      grid-template-columns: 22px minmax(0, 1fr) 16px;
      flex: 0 0 auto;
      min-height: 36px;
      padding: 0 9px;

      > span:nth-child(2),
      > svg {
        display: inline-flex;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-section-rail__progress i {
    transition: none;
  }
}
</style>
