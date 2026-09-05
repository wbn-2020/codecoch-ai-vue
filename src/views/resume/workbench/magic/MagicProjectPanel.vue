<template>
  <div class="magic-project-panel">
    <div
      v-for="(project, index) in projects"
      :key="project.projectId"
      class="magic-item-card"
      :class="{
        'is-expanded': project.projectId === selectedId,
        'is-drag-over': dragOverIndex === index && dragFromIndex !== index
      }"
      :draggable="projects.length > 1 && project.projectId !== selectedId"
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
          @click="emit('select', project.projectId)"
        >
          <span class="magic-item-card__title">{{ project.projectName || '未命名项目' }}</span>
          <span class="magic-item-card__meta">{{ project.projectTime || project.projectPeriod || '' }}</span>
          <span class="magic-item-card__actions">
            <span
              class="magic-item-card__btn is-danger"
              role="button"
              tabindex="0"
              aria-label="删除该项目"
              @click.stop="handleRemove(project)"
              @keydown.enter.stop="handleRemove(project)"
            >
              <Trash2 :size="15" />
            </span>
            <ChevronDown class="magic-item-card__chevron" :size="17" />
          </span>
        </button>

        <div v-if="project.projectId === selectedId" class="magic-item-card__body">
          <div class="magic-item-card__divider" />
          <div class="magic-item-card__form">
            <div class="magic-item-card__grid">
              <label class="magic-field">
                <span class="magic-field__label">项目名称</span>
                <input
                  class="magic-field__input"
                  :value="project.projectName"
                  placeholder="例如：招聘平台简历解析服务"
                  @input="emit('patch', { projectName: ($event.target as HTMLInputElement).value })"
                >
              </label>
              <label class="magic-field">
                <span class="magic-field__label">担任角色</span>
                <input
                  class="magic-field__input"
                  :value="project.role || project.responsibility || ''"
                  placeholder="例如：后端负责人"
                  @input="emit('patch', { role: ($event.target as HTMLInputElement).value })"
                >
              </label>
            </div>

            <div class="magic-field">
              <span class="magic-field__label">时间范围</span>
              <MagicDateRange
                :model-value="project.projectTime || project.projectPeriod || ''"
                @update:model-value="emit('patch', { projectTime: $event })"
              />
            </div>

            <div class="magic-field">
              <span class="magic-field__label">技术栈</span>
              <input
                class="magic-field__input"
                :value="project.techStack || ''"
                placeholder="例如：Spring Boot、MySQL、Redis、RocketMQ"
                @input="emit('patch', { techStack: ($event.target as HTMLInputElement).value })"
              >
            </div>

            <div
              v-for="group in fieldGroups"
              :key="group.key"
              class="magic-field"
            >
              <span class="magic-field__label">{{ group.title }}</span>
              <MagicBlocksInput
                :blocks="fields?.[group.key] || []"
                :placeholder="group.placeholder"
                @update:blocks="patchField(group.key, $event)"
              />
            </div>

            <div class="magic-project-panel__extras">
              <slot name="extras" />
            </div>

            <div class="magic-project-panel__save">
              <button
                type="button"
                class="magic-project-panel__save-btn"
                :disabled="saving || projectSaving"
                @click="emit('save')"
              >
                <Save :size="14" />
                {{ projectSaving ? '保存中…' : '保存项目' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="magic-project-panel__add" @click="emit('add')">
      <CirclePlus :size="15" />
      添加项目经历
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDown,
  CirclePlus,
  GripVertical,
  Save,
  Trash2
} from 'lucide-vue-next'
import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { ResumeProjectVO } from '@/types/resume'
import type { ResumeProjectItem } from '@/features/resume-workbench/document'
import MagicBlocksInput from './MagicBlocksInput.vue'
import MagicDateRange from './MagicDateRange.vue'

const props = withDefaults(defineProps<{
  projects: ResumeProjectVO[]
  selectedId?: number | null
  fields: ResumeProjectItem['fields'] | null
  saving?: boolean
  projectSaving?: boolean
}>(), {
  selectedId: null,
  fields: null,
  saving: false,
  projectSaving: false
})

const emit = defineEmits<{
  select: [projectId: number]
  patch: [changes: Partial<ResumeProjectVO>]
  'update:fields': [fields: ResumeProjectItem['fields']]
  add: []
  remove: [projectId: number]
  reorder: [fromIndex: number, toIndex: number]
  save: []
}>()

const fieldGroups: Array<{
  key: keyof ResumeProjectItem['fields']
  title: string
  placeholder: string
}> = [
  { key: 'background', title: '项目背景', placeholder: '业务场景、服务对象、要解决的问题' },
  { key: 'coreFeatures', title: '核心功能', placeholder: '按模块或链路逐条写' },
  { key: 'technicalChallenges', title: '技术难点', placeholder: '难在哪里、怎么权衡、怎么解决' },
  { key: 'outcome', title: '结果指标', placeholder: '量化结果，写清口径' },
  { key: 'supplement', title: '补充说明', placeholder: '其他值得交代的信息（可选）' }
]

const patchField = (
  key: keyof ResumeProjectItem['fields'],
  blocks: ResumeProjectItem['fields']['background']
) => {
  emit('update:fields', { ...(props.fields || ({} as ResumeProjectItem['fields'])), [key]: blocks })
}

const handleRemove = (project: ResumeProjectVO) => {
  void ElMessageBox.confirm(
    `确定删除「${project.projectName || '未命名项目'}」吗？删除后不可恢复。`,
    '删除项目',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    }
  ).then(() => {
    emit('remove', project.projectId)
  }).catch(() => undefined)
}

const dragFromIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

const handleDragStart = (index: number, event: DragEvent) => {
  dragFromIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

const handleDrop = (index: number) => {
  const from = dragFromIndex.value
  resetDrag()
  if (from === null || from === index) return
  emit('reorder', from, index)
}

const resetDrag = () => {
  dragFromIndex.value = null
  dragOverIndex.value = null
}
</script>

<style scoped lang="scss">
.magic-project-panel {
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

.magic-item-card__meta {
  flex: 0 0 auto;
  margin-left: 10px;
  color: #9ca3af;
  font-size: 12px;
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

.magic-item-card__body { animation: magic-project-expand 0.18s ease; }

@keyframes magic-project-expand {
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

.magic-project-panel__extras {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.magic-project-panel__save {
  display: flex;
  justify-content: flex-end;
}

.magic-project-panel__save-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #111827;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;

  &:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.magic-project-panel__add {
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
