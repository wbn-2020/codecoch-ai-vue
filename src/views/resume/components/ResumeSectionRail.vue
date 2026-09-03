<template>
  <aside class="resume-section-rail" :class="{ 'is-collapsed': collapsed }" aria-label="简历区块">
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
        v-for="item in visibleItems"
        :key="item.id"
        type="button"
        :class="{ 'is-active': item.id === activeId, 'is-done': item.done, 'is-invalid': item.invalid }"
        :aria-label="`${item.label}${item.done ? '，已完善' : '，待完善'}`"
        :aria-current="item.id === activeId ? 'step' : undefined"
        :aria-invalid="item.invalid || undefined"
        :title="item.label"
        @click="emit('select', item.id)"
      >
        <span class="resume-section-rail__icon">
          <component :is="sectionIcon(item.id)" :size="17" aria-hidden="true" />
        </span>
        <span v-if="!collapsed">{{ item.label }}</span>
        <AlertCircle v-if="item.invalid" :size="15" aria-label="需修正" />
        <CheckCircle2 v-else-if="item.done" :size="15" aria-label="已完善" />
        <Circle v-else :size="15" aria-label="待完善" />
      </button>
    </nav>

    <details v-if="!collapsed" class="resume-section-rail__manager">
      <summary>
        <Settings2 :size="15" aria-hidden="true" />
        模块管理
      </summary>
      <div class="resume-section-rail__manager-list">
        <div
          v-for="(item, index) in items"
          :key="item.id"
          class="resume-section-rail__manager-item"
          :class="{
            'is-dragging': draggingId === item.id,
            'is-drop-target': dropIndex === index && draggingId !== null && draggingId !== item.id
          }"
          draggable="true"
          :title="`拖拽排序${item.label}`"
          @dragstart="startDrag(item.id, $event)"
          @dragover.prevent="overDrag(index, $event)"
          @drop.prevent="dropDrag(index, $event)"
          @dragend="endDrag"
        >
          <span class="resume-section-rail__manager-grip" aria-hidden="true">
            <GripVertical :size="14" />
          </span>
          <span>{{ item.label }}</span>
          <button
            type="button"
            :aria-label="`上移${item.label}`"
            :title="`上移${item.label}`"
            :disabled="!canMoveUp(item, index)"
            @click="emit('move', item.id, -1)"
          >
            <ChevronUp :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-label="`下移${item.label}`"
            :title="`下移${item.label}`"
            :disabled="!canMoveDown(item, index)"
            @click="emit('move', item.id, 1)"
          >
            <ChevronDown :size="15" aria-hidden="true" />
          </button>
          <button
            type="button"
            :aria-label="isHidden(item.id) ? `显示${item.label}` : `隐藏${item.label}`"
            :title="canHide(item.id) ? (isHidden(item.id) ? `显示${item.label}` : `隐藏${item.label}`) : `${item.label}不可隐藏`"
            :disabled="!canHide(item.id)"
            @click="emit('toggle-visibility', item.id, isHidden(item.id))"
          >
            <EyeOff v-if="isHidden(item.id)" :size="15" aria-hidden="true" />
            <Eye v-else :size="15" aria-hidden="true" />
          </button>
        </div>
        <div v-if="customSectionQuota && customSectionQuota > 0" class="resume-section-rail__manager-add">
          <button type="button" @click="emit('add-section', 'text')">
            <Plus :size="14" aria-hidden="true" />
            文本分区
          </button>
          <button type="button" @click="emit('add-section', 'entry')">
            <Plus :size="14" aria-hidden="true" />
            条目分区
          </button>
        </div>
      </div>
    </details>

    <div v-if="!collapsed" class="resume-section-rail__review">
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
import { computed, ref } from 'vue'
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardCheck,
  Code2,
  Eye,
  EyeOff,
  FolderKanban,
  GripVertical,
  Plus,
  Settings2,
  Target,
  UserRound
} from 'lucide-vue-next'

interface SectionItem {
  id: string
  label: string
  done: boolean
  invalid?: boolean
  movableUp?: boolean
  movableDown?: boolean
}

const props = defineProps<{
  items: SectionItem[]
  activeId: string
  collapsed?: boolean
  completion: number
  hasStarted: boolean
  exportReadyCount: number
  exportTotal: number
  hiddenIds?: string[]
  customSectionQuota?: number
}>()

const emit = defineEmits<{
  select: [id: string]
  review: []
  move: [id: string, delta: -1 | 1]
  reorder: [id: string, targetIndex: number]
  'toggle-visibility': [id: string, currentlyHidden: boolean]
  'add-section': [variant: 'text' | 'entry']
}>()

const iconBySection: Record<string, Component> = {
  'resume-basic': UserRound,
  'resume-target': Target,
  'resume-skills': Code2,
  'resume-projects': FolderKanban,
  'resume-experience': BriefcaseBusiness
}

const sectionIcon = (id: string) => iconBySection[id] || Circle
const canMoveUp = (item: SectionItem, index: number) =>
  item.movableUp === undefined ? index > 0 : item.movableUp
const canMoveDown = (item: SectionItem, index: number) =>
  item.movableDown === undefined ? index < props.items.length - 1 : item.movableDown
const completedCount = computed(() => props.items.filter((item) => item.done).length)
const canHide = (id: string) => id !== 'resume-basic' && id !== 'resume-target'
const isHidden = (id: string) => props.hiddenIds?.includes(id) === true
const visibleItems = computed(() => props.items.filter((item) => !isHidden(item.id)))

// —— V-02 · 板块拖拽排序（忠于原型 v15 动态 menuSections 可拖拽）——
// 保留上/下移按钮作为键盘与触屏兜底，拖拽为其渐进增强。
const draggingId = ref<string | null>(null)
const dropIndex = ref<number | null>(null)

const resetDrag = () => {
  draggingId.value = null
  dropIndex.value = null
}

const startDrag = (id: string, event: DragEvent) => {
  draggingId.value = id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }
}

const overDrag = (index: number, event: DragEvent) => {
  if (draggingId.value === null) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dropIndex.value = index
}

const dropDrag = (index: number, event: DragEvent) => {
  const id = draggingId.value || event.dataTransfer?.getData('text/plain') || ''
  resetDrag()
  if (!id) return
  emit('reorder', id, index)
}

const endDrag = () => resetDrag()

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

.resume-section-rail.is-collapsed {
  .resume-section-rail__heading,
  .resume-section-rail__progress,
  .resume-section-rail__sections button > span:nth-child(2),
  .resume-section-rail__sections button > svg {
    display: none;
  }

  .resume-section-rail__sections button {
    grid-template-columns: 1fr;
    justify-content: center;
    padding-inline: 0;
  }

  .resume-section-rail__sections button > svg {
    justify-self: center;
  }
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

.resume-section-rail__manager {
  position: relative;
  margin: 8px 12px;

  summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 34px;
    padding: 0 9px;
    border: 1px solid var(--resume-workbench-line);
    border-radius: 6px;
    color: var(--resume-workbench-muted);
    font-size: 11.5px;
    font-weight: 650;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      color: var(--resume-workbench-accent);
      outline: 0;
    }
  }
}

.resume-section-rail__manager-list {
  position: absolute;
  z-index: 12;
  top: calc(100% + 6px);
  left: 0;
  display: grid;
  width: 210px;
  padding: 7px;
  border: 1px solid var(--resume-workbench-line);
  border-radius: 7px;
  background: var(--resume-workbench-surface);
  box-shadow: 0 12px 28px rgba(22, 34, 28, 0.16);

  > div {
    display: grid;
    grid-template-columns: 16px minmax(0, 1fr) 28px 28px 28px;
    align-items: center;
    min-height: 34px;
    gap: 3px;
    border-radius: 5px;
    transition: background 0.15s ease, box-shadow 0.15s ease;
  }

  .resume-section-rail__manager-grip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    overflow: visible;
    color: var(--resume-workbench-line-strong);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .resume-section-rail__manager-item {
    &:hover {
      background: var(--resume-workbench-surface-soft);
    }

    &.is-dragging {
      opacity: 0.45;
    }

    &.is-drop-target {
      background: var(--resume-workbench-accent-soft);
      box-shadow: inset 0 0 0 1px var(--resume-workbench-accent);
    }
  }

  span {
    min-width: 0;
    overflow: hidden;
    color: var(--resume-workbench-text-soft);
    font-size: 11.5px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--resume-workbench-muted);
    cursor: pointer;

    &:hover:not(:disabled),
    &:focus-visible {
      background: var(--resume-workbench-surface-soft);
      color: var(--resume-workbench-accent);
      outline: 0;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.32;
    }
  }
}

.resume-section-rail__manager-add {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid var(--resume-workbench-line);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 28px;
    padding: 0 6px;
    border: 1px dashed var(--resume-workbench-line-strong);
    border-radius: 5px;
    background: transparent;
    color: var(--resume-workbench-muted);
    font: inherit;
    font-size: 11px;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      border-color: var(--resume-workbench-accent);
      border-style: solid;
      color: var(--resume-workbench-accent);
      outline: 0;
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
  .resume-section-rail__review,
  .resume-section-rail__manager summary span {
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

  .resume-section-rail__manager {
    margin: 6px 12px 0;
  }

  .resume-section-rail__manager-list {
    position: fixed;
    top: 116px;
    left: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .resume-section-rail__progress i {
    transition: none;
  }
}
</style>
