<template>
  <div class="magic-entry-panel">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="magic-item-card"
      :class="{ 'is-expanded': expandedId === item.id, 'is-drag-over': dragOverIndex === index && dragFromIndex !== index }"
      :draggable="items.length > 1 && expandedId !== item.id"
      @dragstart="handleDragStart(index, $event)"
      @dragover.prevent="dragOverIndex = index"
      @dragleave="dragOverIndex = null"
      @drop.prevent="handleDrop(index)"
      @dragend="resetDrag"
    >
      <div class="magic-item-card__grip" title="拖拽排序">
        <GripVertical :size="15" />
      </div>
      <div class="magic-item-card__main">
        <button
          type="button"
          class="magic-item-card__head"
          @click="toggleExpand(item.id)"
        >
          <span class="magic-item-card__title">{{ item.heading || labels.headingPlaceholder }}</span>
          <span class="magic-item-card__actions">
            <span
              class="magic-item-card__btn"
              role="button"
              tabindex="0"
              :aria-label="item.visible === false ? '显示该条目' : '隐藏该条目'"
              @click.stop="toggleVisible(item)"
              @keydown.enter.stop="toggleVisible(item)"
            >
              <Eye v-if="item.visible !== false" :size="15" class="is-on" />
              <EyeOff v-else :size="15" />
            </span>
            <span
              class="magic-item-card__btn is-danger"
              role="button"
              tabindex="0"
              aria-label="删除该条目"
              @click.stop="handleRemove(item)"
              @keydown.enter.stop="handleRemove(item)"
            >
              <Trash2 :size="15" />
            </span>
            <ChevronDown class="magic-item-card__chevron" :size="17" />
          </span>
        </button>

        <div v-if="expandedId === item.id" class="magic-item-card__body">
          <div class="magic-item-card__divider" />
          <div class="magic-item-card__form">
            <div class="magic-item-card__grid">
              <label class="magic-field">
                <span class="magic-field__label">{{ labels.heading }}</span>
                <input
                  class="magic-field__input"
                  :value="item.heading"
                  :placeholder="`请输入${labels.heading}`"
                  @input="patchItem(item.id, 'heading', ($event.target as HTMLInputElement).value)"
                >
              </label>
              <label class="magic-field">
                <span class="magic-field__label">{{ labels.subheading }}</span>
                <input
                  class="magic-field__input"
                  :value="item.subheading"
                  :placeholder="`请输入${labels.subheading}`"
                  @input="patchItem(item.id, 'subheading', ($event.target as HTMLInputElement).value)"
                >
              </label>
            </div>
            <div class="magic-field">
              <span class="magic-field__label">{{ labels.period }}</span>
              <MagicDateRange
                :model-value="item.period"
                @update:model-value="patchItem(item.id, 'period', $event)"
              />
            </div>
            <div class="magic-field">
              <span class="magic-field__label">{{ labels.details }}</span>
              <MagicBlocksInput
                :blocks="item.blocks"
                :placeholder="labels.detailsPlaceholder"
                @update:blocks="patchBlocks(item.id, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="magic-entry-panel__add" @click="emit('add')">
      <CirclePlus :size="15" />
      {{ addButtonLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  CirclePlus,
  Eye,
  EyeOff,
  GripVertical,
  Trash2
} from 'lucide-vue-next'
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { ResumeBlock, ResumeEntryItem } from '@/features/resume-workbench/document'
import MagicBlocksInput from './MagicBlocksInput.vue'
import MagicDateRange from './MagicDateRange.vue'

const props = withDefaults(defineProps<{
  items: ResumeEntryItem[]
  labels: {
    heading: string
    subheading: string
    period: string
    details: string
    detailsPlaceholder?: string
    headingPlaceholder?: string
  }
  addButtonLabel?: string
}>(), {
  addButtonLabel: '添加条目',
  labels: () => ({
    heading: '名称',
    subheading: '副标题',
    period: '时间范围',
    details: '详细描述',
    detailsPlaceholder: '请输入详细描述…',
    headingPlaceholder: '未命名条目'
  })
})

const emit = defineEmits<{
  'update:items': [items: ResumeEntryItem[]]
  add: []
}>()

const expandedId = ref<string | null>(null)
const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const patchItem = (id: string, key: 'heading' | 'subheading' | 'period', value: string) => {
  emit('update:items', props.items.map((item) => (
    item.id === id ? { ...item, [key]: value } : item
  )))
}

const patchBlocks = (id: string, blocks: ResumeBlock[]) => {
  emit('update:items', props.items.map((item) => (
    item.id === id ? { ...item, blocks } : item
  )))
}

const toggleVisible = (item: ResumeEntryItem) => {
  emit('update:items', props.items.map((entry) => (
    entry.id === item.id ? { ...entry, visible: entry.visible === false } : entry
  )))
}

const handleRemove = (item: ResumeEntryItem) => {
  const title = item.heading || props.labels.headingPlaceholder || '未命名条目'
  void ElMessageBox.confirm(
    `确定删除「${title}」吗？删除后不可恢复。`,
    '删除条目',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(() => {
    emit('update:items', props.items.filter((entry) => entry.id !== item.id))
  }).catch(() => undefined)
}

const handleDragStart = (index: number, event: DragEvent) => {
  dragFromIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  const from = dragFromIndex.value
  resetDrag()
  if (from === null || from === index) return
  const items = [...props.items]
  const [moved] = items.splice(from, 1)
  items.splice(index, 0, moved)
  emit('update:items', items)
}

const resetDrag = () => {
  dragFromIndex.value = null
  dragOverIndex.value = null
}
</script>

<style scoped lang="scss">
.magic-entry-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.magic-item-card {
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  transition: border-color 0.18s ease;

  &:hover { border-color: rgba(0, 71, 171, 0.35); }

  &.is-expanded { border-color: rgba(0, 71, 171, 0.45); }

  &.is-drag-over {
    border-top: 2px solid var(--el-color-primary, #0047ab);
  }
}

.magic-item-card__grip {
  display: flex;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border-right: 1px solid #e5e7eb;
  color: #9ca3af;
  cursor: grab;

  &:active { cursor: grabbing; }

  .is-expanded & {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.magic-item-card__main {
  flex: 1;
  min-width: 0;
}

.magic-item-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 15px 14px;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  user-select: none;

  .is-expanded & { background: rgba(243, 244, 246, 0.5); }
}

.magic-item-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #111827;
  font-size: 13.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.magic-item-card__actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  margin-left: 12px;
}

.magic-item-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;

  &:hover { background: #f3f4f6; color: #111827; }

  .is-on { color: var(--el-color-primary, #0047ab); }

  &.is-danger {
    color: #f87171;

    &:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
  }
}

.magic-item-card__chevron {
  color: #9ca3af;
  transition: transform 0.2s ease;

  .is-expanded & { transform: rotate(180deg); }
}

.magic-item-card__body { animation: magic-expand 0.18s ease; }

@keyframes magic-expand {
  from { opacity: 0; }
  to { opacity: 1; }
}

.magic-item-card__divider {
  height: 1px;
  background: #e5e7eb;
}

.magic-item-card__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 14px;
}

.magic-item-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.magic-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.magic-field__label {
  color: #111827;
  font-size: 13px;
  font-weight: 500;
}

.magic-field__input {
  height: 34px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  font-size: 13px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;

  &::placeholder { color: #b3bac4; }

  &:focus {
    border-color: var(--el-color-primary, #0047ab);
    box-shadow: 0 0 0 2px rgba(0, 71, 171, 0.12);
  }
}

.magic-entry-panel__add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  margin-top: 2px;
  padding: 10px;
  border: 0;
  border-radius: 10px;
  background: var(--el-color-primary, #0047ab);
  color: #ffffff;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
  transition: background 0.18s ease;

  &:hover { background: #003a8c; }
}
</style>
