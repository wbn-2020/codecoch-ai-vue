<template>
  <BlockField
    :blocks="blocks"
    :label="label"
    :placeholder="placeholder"
    :disabled="disabled"
    @text="setText"
    @kind="setKind"
    @add="insertAfter"
    @remove="remove"
    @move="move"
  />
</template>

<script setup lang="ts">
import BlockField from '@/views/resume/workbench/blocks/BlockField.vue'
import { nextDocumentId } from '@/features/resume-workbench/document-migrator'
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

const emit = defineEmits<{ 'update:blocks': [blocks: ResumeBlock[]] }>()

const write = (blocks: ResumeBlock[]) => emit('update:blocks', blocks)
const patch = (blockId: string, changes: Partial<ResumeBlock>) =>
  write(props.blocks.map((block) => (block.id === blockId ? { ...block, ...changes } : block)))

const setText = (blockId: string, text: string) => patch(blockId, { text })
const setKind = (blockId: string, kind: ResumeBlock['kind']) => patch(blockId, { kind })

const insertAfter = (afterIndex: number) => {
  const blocks = [...props.blocks]
  blocks.splice(Math.max(0, Math.min(blocks.length, afterIndex + 1)), 0,
    { id: nextDocumentId('blk'), kind: 'line', text: '' })
  write(blocks)
}

const remove = (blockId: string) =>
  write(props.blocks.length <= 1 ? props.blocks : props.blocks.filter((block) => block.id !== blockId))

const move = (blockId: string, delta: number) => {
  const blocks = [...props.blocks]
  const from = blocks.findIndex((block) => block.id === blockId)
  const to = from + delta
  if (from < 0 || to < 0 || to >= blocks.length) return
  const [moved] = blocks.splice(from, 1)
  blocks.splice(to, 0, moved)
  write(blocks)
}
</script>
