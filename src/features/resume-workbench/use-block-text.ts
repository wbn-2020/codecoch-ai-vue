import { ref, watch } from 'vue'

import {
  blocksToMarkdownLines,
  nextDocumentId,
  textToBlocks
} from '@/features/resume-workbench/document-migrator'
import type { ResumeBlock } from '@/features/resume-workbench/document'

/**
 * Edits one legacy narrative field as document blocks. The field string stays the persisted
 * value, so validation, completion and the ATS projection keep working while the editor already
 * speaks in blocks; block kinds ride along as the same line markers the server strips.
 */
export const useBlockText = (
  read: () => string | undefined | null,
  write: (value: string) => void,
  prefix: string
) => {
  const blocks = ref<ResumeBlock[]>(textToBlocks(read(), prefix))

  const serialize = () => blocksToMarkdownLines(blocks.value)
  const flush = () => write(serialize())

  watch(read, (value) => {
    if ((value || '') !== serialize()) blocks.value = textToBlocks(value, prefix)
  })

  const locate = (id: string) => blocks.value.findIndex((block) => block.id === id)

  return {
    blocks,
    setText(id: string, text: string) {
      const index = locate(id)
      if (index < 0) return
      blocks.value[index] = { ...blocks.value[index], text }
      flush()
    },
    setKind(id: string, kind: ResumeBlock['kind']) {
      const index = locate(id)
      if (index < 0) return
      blocks.value[index] = { ...blocks.value[index], kind }
      flush()
    },
    add() {
      blocks.value = [...blocks.value, { id: nextDocumentId(prefix), kind: 'line', text: '' }]
      flush()
    },
    remove(id: string) {
      if (blocks.value.length <= 1) return
      blocks.value = blocks.value.filter((block) => block.id !== id)
      flush()
    },
    move(id: string, delta: number) {
      const from = locate(id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= blocks.value.length) return
      const next = [...blocks.value]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      blocks.value = next
      flush()
    }
  }
}

