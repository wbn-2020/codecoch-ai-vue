<template>
  <div class="project-item-editor">
    <section v-for="field in FIELDS" :key="field.key" class="project-item-editor__field">
      <h4>{{ field.label }}</h4>
      <TextBlocksField
        :blocks="fields[field.key]"
        :label="`${label} · ${field.label}`"
        :placeholder="field.placeholder"
        :disabled="disabled"
        @update:blocks="(blocks) => writeField(field.key, blocks)"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import TextBlocksField from '@/views/resume/workbench/blocks/TextBlocksField.vue'
import type { ResumeBlock, ResumeProjectItem } from '@/features/resume-workbench/document'

type ProjectFieldKey = keyof ResumeProjectItem['fields']
type ProjectFields = ResumeProjectItem['fields']

const props = defineProps<{
  fields: ProjectFields
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:fields': [fields: ProjectFields] }>()

// 行内只展开简历上真正成段的三段；核心功能与补充信息留在完整编辑弹窗里。
const FIELDS: Array<{ key: ProjectFieldKey; label: string; placeholder: string }> = [
  { key: 'background', label: '背景', placeholder: '说明业务场景、规模和系统边界' },
  { key: 'technicalChallenges', label: '技术决策', placeholder: '说明为什么这样设计、关键方案和取舍' },
  { key: 'outcome', label: '量化结果', placeholder: '用性能、效率、稳定性、成本或业务指标证明结果' }
]

const writeField = (key: ProjectFieldKey, blocks: ResumeBlock[]) =>
  emit('update:fields', { ...props.fields, [key]: blocks })
</script>

<style scoped lang="scss">
.project-item-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;

    h4 {
      margin: 0;
      color: var(--user-text-secondary);
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }
  }
}
</style>
