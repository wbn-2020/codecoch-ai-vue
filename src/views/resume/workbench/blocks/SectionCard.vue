<template>
  <div class="section-card">
    <div class="section-card__head">
      <input
        class="section-card__title"
        :value="section.title"
        :maxlength="titleLimit"
        aria-label="分区名称"
        @change="rename"
      />
      <el-tag size="small" effect="plain">{{ variantLabel }}</el-tag>
      <button type="button" class="section-card__remove" @click="emit('remove', section.id)">删除分区</button>
    </div>

    <TextBlocksField
      v-if="section.variant === 'text'"
      :blocks="section.content.blocks || []"
      :label="section.title"
      placeholder="写下这个分区要表达的内容"
      @update:blocks="(blocks) => emit('update:blocks', section.id, blocks)"
    />
    <EntryItemEditor
      v-else
      :items="section.content.items || []"
      :label="section.title"
      :headings="['名称', '角色或副标题', '补充', '展开说明']"
      @update:items="(items) => emit('update:items', section.id, items)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import EntryItemEditor from '@/views/resume/workbench/blocks/EntryItemEditor.vue'
import TextBlocksField from '@/views/resume/workbench/blocks/TextBlocksField.vue'
import { MAX_SECTION_TITLE_LENGTH } from '@/features/resume-workbench/document'
import type {
  CustomSection,
  ResumeBlock,
  ResumeEntryItem
} from '@/features/resume-workbench/document'

const props = defineProps<{ section: CustomSection }>()

const emit = defineEmits<{
  'update:blocks': [sectionId: string, blocks: ResumeBlock[]]
  'update:items': [sectionId: string, items: ResumeEntryItem[]]
  rename: [sectionId: string, title: string]
  remove: [sectionId: string]
}>()

const titleLimit = MAX_SECTION_TITLE_LENGTH
const variantLabel = computed(() => (props.section.variant === 'text' ? '文本分区' : '条目分区'))

const rename = (event: Event) => {
  const title = (event.target as HTMLInputElement).value.trim()
  if (title && title !== props.section.title) emit('rename', props.section.id, title)
}
</script>

<style scoped lang="scss">
.section-card {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
  }

  &__title {
    min-width: 0;
    padding: 5px 8px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-sm);
    background: var(--user-control-bg);
    color: var(--user-text);
    font: inherit;
    font-size: 13.5px;
    font-weight: 600;

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 1px;
    }
  }

  &__remove {
    padding: 4px 10px;
    border: 1px solid transparent;
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-size: 12.5px;
    cursor: pointer;

    &:hover {
      border-color: var(--user-danger-border);
      background: var(--user-danger-soft);
      color: var(--user-danger-text);
    }
  }
}
</style>
