<template>
  <div ref="root" class="block-field">
    <div
      v-for="(block, index) in blocks"
      :key="block.id"
      class="block-field__row"
      :class="`is-${block.kind}`"
    >
      <span class="block-field__marker" :aria-hidden="true">{{ marker(block.kind) }}</span>

      <div class="block-field__editor">
        <AutoGrowTextarea
          :ref="(node) => rememberField(block.id, node)"
          :model-value="block.text"
          :placeholder="index === 0 ? placeholder : ''"
          :aria-label="`${label} ${index + 1}`"
          :disabled="disabled"
          @update:model-value="emit('text', block.id, $event)"
          @keydown="onKeydown($event, block, index)"
          @focus="focused = block.id"
        />
        <div v-if="focused === block.id" class="block-field__tools">
          <MarkdownToolbar :disabled="disabled" @command="apply($event, block)" />
        </div>
      </div>

      <div class="block-field__actions">
        <label class="block-field__kind">
          <span class="sr-only">{{ kindLabel }}</span>
          <select :value="block.kind" :disabled="disabled" @change="onKind(block, $event)">
            <option value="line">{{ kinds.line }}</option>
            <option value="bullet">{{ kinds.bullet }}</option>
            <option value="ordered">{{ kinds.ordered }}</option>
          </select>
        </label>
        <button
          type="button"
          class="block-field__button"
          :disabled="disabled || index === 0"
          :aria-label="`${moveUpLabel} ${index + 1}`"
          @click="emit('move', block.id, -1)"
        >&#8593;</button>
        <button
          type="button"
          class="block-field__button"
          :disabled="disabled || index === blocks.length - 1"
          :aria-label="`${moveDownLabel} ${index + 1}`"
          @click="emit('move', block.id, 1)"
        >&#8595;</button>
        <button
          type="button"
          class="block-field__button is-danger"
          :disabled="disabled || blocks.length <= 1"
          :aria-label="`${removeLabel} ${index + 1}`"
          @click="emit('remove', block.id)"
        >&#215;</button>
      </div>
    </div>

    <button type="button" class="block-field__add" :disabled="disabled" @click="emitAdd(blocks.length - 1)">
      {{ addLabel }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import AutoGrowTextarea from '@/views/resume/workbench/blocks/AutoGrowTextarea.vue'
import MarkdownToolbar from '@/views/resume/workbench/blocks/MarkdownToolbar.vue'
import type { ResumeBlock } from '@/features/resume-workbench/document'

const props = withDefaults(defineProps<{
  blocks: ResumeBlock[]
  label: string
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '',
  disabled: false
})

const emit = defineEmits<{
  text: [blockId: string, value: string]
  kind: [blockId: string, kind: ResumeBlock['kind']]
  add: [afterIndex: number]
  remove: [blockId: string]
  move: [blockId: string, delta: number]
}>()

const kinds = { line: '正文', bullet: '要点', ordered: '编号' }
const label = computed(() => props.label)
const kindLabel = '内容类型'
const addLabel = '添加一行'
const removeLabel = '删除内容块'
const moveUpLabel = '上移内容块'
const moveDownLabel = '下移内容块'

const focused = ref('')
const root = ref<HTMLElement | null>(null)
const fields = new Map<string, InstanceType<typeof AutoGrowTextarea>>()

/** 插入位置由触发行决定；父级写完后把光标送进真正新增的那一行。 */
const emitAdd = (afterIndex: number) => {
  emit('add', afterIndex)
  void nextTick(() => {
    const target = root.value?.querySelectorAll('textarea')[afterIndex + 1]
    if (!target) return
    target.focus()
    target.setSelectionRange(0, 0)
  })
}

const rememberField = (id: string, node: unknown) => {
  if (node) fields.set(id, node as InstanceType<typeof AutoGrowTextarea>)
  else fields.delete(id)
}

const marker = (kind: ResumeBlock['kind']) =>
  kind === 'bullet' ? '•' : kind === 'ordered' ? '1.' : ''

const onKeydown = (event: KeyboardEvent, block: ResumeBlock, index: number) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    emitAdd(index)
    return
  }
  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault()
    emit('move', block.id, event.key === 'ArrowUp' ? -1 : 1)
    return
  }
  const target = event.target as HTMLTextAreaElement
  if (event.key === 'Backspace' && !block.text.trim() && target.selectionStart === 0 && index > 0) {
    event.preventDefault()
    emit('remove', block.id)
  }
}

const onKind = (block: ResumeBlock, event: Event) => {
  emit('kind', block.id, (event.target as HTMLSelectElement).value as ResumeBlock['kind'])
}

const WRAP = { bold: '**', italic: '*' } as const

const apply = (command: 'bold' | 'italic' | 'link', block: ResumeBlock) => {
  const field = fields.get(block.id)
  const selection = field?.selection()
  const start = selection?.start ?? block.text.length
  const end = selection?.end ?? block.text.length
  const selected = block.text.slice(start, end)
  const next = command === 'link'
    ? `[${selected || '链接文字'}](https://)`
    : `${WRAP[command]}${selected || (command === 'bold' ? '加粗文字' : '斜体文字')}${WRAP[command]}`
  emit('text', block.id, block.text.slice(0, start) + next + block.text.slice(end))
  const caret = start + next.length
  field?.select(caret, caret)
}
</script>

<style scoped lang="scss">
.block-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__row {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr) auto;
    align-items: start;
    gap: 6px;
  }

  &__marker {
    padding-top: 9px;
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  &__editor {
    min-width: 0;
  }

  &__tools {
    margin-top: 4px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-top: 4px;
  }

  &__kind select {
    height: 26px;
    padding: 0 4px;
    border: 1px solid var(--user-border);
    border-radius: var(--user-radius-sm);
    background: var(--user-control-bg);
    color: var(--user-text-secondary);
    font-size: 12px;
  }

  &__button {
    width: 26px;
    height: 26px;
    border: 1px solid transparent;
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 24px;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: var(--user-border);
      background: var(--user-surface-muted);
      color: var(--user-text);
    }

    &:focus-visible {
      outline: 2px solid var(--user-primary);
      outline-offset: 1px;
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

  &__add {
    align-self: flex-start;
    padding: 4px 10px;
    border: 1px dashed var(--user-border);
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-size: 12.5px;
    cursor: pointer;

    &:hover:not(:disabled) {
      border-color: var(--user-primary);
      color: var(--user-primary);
    }

    &:disabled {
      color: var(--user-text-subtle);
      cursor: not-allowed;
    }
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
</style>
