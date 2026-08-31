<template>
  <div class="entry-editor">
    <article v-for="(item, index) in items" :key="item.id" class="entry-editor__card">
      <header class="entry-editor__head">
        <input
          class="entry-editor__heading"
          :value="item.heading"
          :placeholder="headings[0]"
          :aria-label="`${label} ${index + 1} ${headings[0]}`"
          @input="patch(item.id, { heading: value($event) })"
        />
        <input
          class="entry-editor__period"
          :value="item.period"
          placeholder="2021.03-至今"
          :aria-label="`${label} ${index + 1} 时间`"
          @input="patch(item.id, { period: value($event) })"
        />
        <div class="entry-editor__actions">
          <button
            type="button"
            :disabled="index === 0"
            :aria-label="`上移 ${label} ${index + 1}`"
            @click="move(index, -1)"
          >&#8593;</button>
          <button
            type="button"
            :disabled="index === items.length - 1"
            :aria-label="`下移 ${label} ${index + 1}`"
            @click="move(index, 1)"
          >&#8595;</button>
          <button
            type="button"
            class="is-danger"
            :aria-label="`删除 ${label} ${index + 1}`"
            @click="remove(item.id)"
          >&#215;</button>
        </div>
      </header>

      <div class="entry-editor__meta">
        <input
          :value="item.subheading"
          :placeholder="headings[1]"
          :aria-label="`${label} ${index + 1} ${headings[1]}`"
          @input="patch(item.id, { subheading: value($event) })"
        />
        <input
          :value="item.meta"
          :placeholder="headings[2]"
          :aria-label="`${label} ${index + 1} ${headings[2]}`"
          @input="patch(item.id, { meta: value($event) })"
        />
      </div>

      <TextBlocksField
        :blocks="item.blocks"
        :label="`${label} ${index + 1} 描述`"
        :placeholder="headings[3]"
        @update:blocks="(blocks) => patch(item.id, { blocks })"
      />
    </article>

    <p v-if="!items.length" class="entry-editor__empty">还没有条目。</p>
    <button type="button" class="entry-editor__add" @click="addItem">添加{{ label }}</button>
  </div>
</template>

<script setup lang="ts">
import TextBlocksField from '@/views/resume/workbench/blocks/TextBlocksField.vue'
import { createEntryItem } from '@/features/resume-workbench/section-ops'
import type { ResumeEntryItem } from '@/features/resume-workbench/document'

const props = withDefaults(defineProps<{
  items: ResumeEntryItem[]
  label: string
  headings?: string[]
}>(), {
  headings: () => ['名称', '角色', '补充', '描述这一条经历']
})

const emit = defineEmits<{ 'update:items': [items: ResumeEntryItem[]] }>()

const value = (event: Event) => (event.target as HTMLInputElement).value
const write = (items: ResumeEntryItem[]) => emit('update:items', items.map((item) => ({ ...item })))
const locate = (id: string) => props.items.findIndex((item) => item.id === id)

const patch = (id: string, changes: Partial<ResumeEntryItem>) =>
  write(props.items.map((item, index) => (index === locate(id) ? { ...item, ...changes } : item)))

const move = (index: number, delta: number) => {
  const to = index + delta
  if (to < 0 || to >= props.items.length) return
  const next = [...props.items]
  const [moved] = next.splice(index, 1)
  next.splice(to, 0, moved)
  write(next)
}

const remove = (id: string) => write(props.items.filter((item) => item.id !== id))
const addItem = () => write([...props.items, createEntryItem()])
</script>

<style scoped lang="scss">
.entry-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-md);
    background: var(--user-surface);
  }

  &__head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 148px auto;
    align-items: center;
    gap: 8px;
  }

  &__meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  &__heading,
  &__period,
  &__meta input {
    min-width: 0;
    padding: 5px 8px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-sm);
    background: var(--user-control-bg);
    color: var(--user-text);
    font: inherit;
    font-size: 13px;

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 1px;
    }

    &::placeholder {
      color: var(--user-text-subtle);
    }
  }

  &__heading {
    font-weight: 600;
  }

  &__period {
    font-variant-numeric: tabular-nums;
  }

  &__actions {
    display: flex;
    gap: 2px;

    button {
      width: 24px;
      height: 24px;
      border: 1px solid transparent;
      border-radius: var(--user-radius-sm);
      background: transparent;
      color: var(--user-text-secondary);
      font-size: 13px;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--user-border);
        background: var(--user-surface-muted);
      }

      &:disabled {
        color: var(--user-text-subtle);
        cursor: not-allowed;
      }

      &.is-danger:hover:not(:disabled) {
        border-color: var(--user-danger-border);
        background: var(--user-danger-soft);
        color: var(--user-danger-text);
      }
    }
  }

  &__empty {
    margin: 0;
    color: var(--user-text-subtle);
    font-size: 12.5px;
  }

  &__add {
    align-self: flex-start;
    padding: 4px 10px;
    border: 1px dashed var(--user-border);
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-size: 12.5px;
    cursor: pointer;

    &:hover {
      border-color: var(--user-primary);
      color: var(--user-primary);
    }
  }
}
</style>
