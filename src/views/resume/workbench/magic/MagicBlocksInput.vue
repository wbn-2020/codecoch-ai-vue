<template>
  <div class="magic-rich">
    <div class="magic-rich__toolbar" role="toolbar" aria-label="内容格式">
      <button
        type="button"
        title="加粗"
        aria-label="加粗"
        :class="{ 'is-on': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Bold :size="14" />
      </button>
      <button
        type="button"
        title="斜体"
        aria-label="斜体"
        :class="{ 'is-on': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Italic :size="14" />
      </button>
      <button
        type="button"
        title="下划线"
        aria-label="下划线"
        :class="{ 'is-on': editor?.isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <UnderlineIcon :size="14" />
      </button>
      <button
        type="button"
        title="删除线"
        aria-label="删除线"
        :class="{ 'is-on': editor?.isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Strikethrough :size="14" />
      </button>
      <span class="magic-rich__divider" />
      <button
        type="button"
        title="圆点列表"
        aria-label="圆点列表"
        :class="{ 'is-on': editor?.isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
      >
        <List :size="14" />
      </button>
      <button
        type="button"
        title="编号列表"
        aria-label="编号列表"
        :class="{ 'is-on': editor?.isActive('orderedList') }"
        @click="editor?.chain().focus().toggleOrderedList().run()"
      >
        <ListOrdered :size="14" />
      </button>
      <span class="magic-rich__divider" />
      <el-popover trigger="click" :width="232" placement="bottom-start">
        <template #reference>
          <button type="button" title="文字颜色" aria-label="文字颜色" class="magic-rich__color-btn">
            <Baseline :size="14" />
          </button>
        </template>
        <div class="magic-rich__palette">
          <button
            v-for="hex in textColorPalette"
            :key="hex"
            type="button"
            :style="{ background: hex }"
            :title="hex"
            :aria-label="`文字颜色 ${hex}`"
            @click="editor?.chain().focus().setColor(hex).run()"
          />
        </div>
      </el-popover>
      <el-popover trigger="click" :width="232" placement="bottom-start">
        <template #reference>
          <button type="button" title="背景颜色" aria-label="背景颜色" class="magic-rich__color-btn">
            <Highlighter :size="14" />
          </button>
        </template>
        <div class="magic-rich__palette">
          <button
            v-for="hex in highlightPalette"
            :key="hex"
            type="button"
            :style="{ background: hex }"
            :title="hex"
            :aria-label="`背景颜色 ${hex}`"
            @click="editor?.chain().focus().setHighlight({ color: hex }).run()"
          />
        </div>
      </el-popover>
      <span class="magic-rich__divider" />
      <button
        type="button"
        title="清除格式"
        aria-label="清除格式"
        @click="editor?.chain().focus().unsetAllMarks().clearNodes().run()"
      >
        <RemoveFormatting :size="14" />
      </button>
    </div>
    <editor-content v-if="editor" :editor="editor" class="magic-rich__content" />
    <p class="magic-rich__hint">支持加粗、斜体、下划线、删除线与列表；回车换行。</p>
  </div>
</template>

<script setup lang="ts">
import {
  Baseline,
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon
} from 'lucide-vue-next'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { Placeholder } from '@tiptap/extensions'
import { onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import type { ResumeBlock } from '@/features/resume-workbench/document'
import { nextDocumentId } from '@/features/resume-workbench/document-migrator'

const props = withDefaults(defineProps<{
  blocks: ResumeBlock[]
  placeholder?: string
}>(), {
  placeholder: ''
})

const emit = defineEmits<{ 'update:blocks': [blocks: ResumeBlock[]] }>()

/** 魔方同款色盘：文字色与背景色分列。 */
const textColorPalette = ['#000000', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5', '#FF4500', '#666666']
const highlightPalette = ['#fff3bf', '#ffe3e3', '#d3f9d8', '#d0ebff', '#eee0ff', '#fff0f6', '#e9fcff', '#eaecef']

/** markdown-lite 内联标记 → HTML（Tiptap 初始内容）。 */
const inlineMarkersToHtml = (text: string): string => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\{\{!#([0-9a-fA-F]{3,8})\|([^{}]+)\}\}/g, '<span data-color="#$1" style="background-color:#$1">$2</span>')
  .replace(/\{\{#([0-9a-fA-F]{3,8})\|([^{}]+)\}\}/g, '<span style="color:#$1">$2</span>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/\+\+([^+\n]+)\+\+/g, '<u>$1</u>')
  .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
  .replace(/(^|[\s(（【])\*([^*\n]+)\*(?=[\s)）】.,，。;；!！?？:]|$)/g, '$1<em>$2</em>')

const blocksToHtml = (blocks: ResumeBlock[]): string => {
  let html = ''
  let listTag: 'ul' | 'ol' | null = null
  let items: string[] = []
  const flush = () => {
    if (!listTag) return
    html += `<${listTag}>${items.map((item) => `<li>${item}</li>`).join('')}</${listTag}>`
    listTag = null
    items = []
  }
  for (const block of blocks) {
    const text = inlineMarkersToHtml(block.text)
    if (block.kind === 'bullet') {
      if (listTag !== 'ul') { flush(); listTag = 'ul' }
      items.push(text)
    } else if (block.kind === 'ordered') {
      if (listTag !== 'ol') { flush(); listTag = 'ol' }
      items.push(text)
    } else {
      flush()
      html += `<p>${text}</p>`
    }
  }
  flush()
  return html || '<p></p>'
}

interface RichNode {
  type: string
  content?: RichNode[]
  text?: string
  marks?: Array<{ type: string }>
}

const serializeInline = (node: RichNode): string => {
  if (node.type === 'text') {
    let text = node.text ?? ''
    const marks = node.marks ?? []
    const markTypes = new Set(marks.map((mark) => mark.type))
    // markdown-lite 子集不支持嵌套标记：加粗优先，其次下划线/删除线/斜体。
    if (markTypes.has('bold')) text = `**${text}**`
    else if (markTypes.has('underline')) text = `++${text}++`
    else if (markTypes.has('strike')) text = `~~${text}~~`
    else if (markTypes.has('italic')) text = `*${text}*`
    // 颜色标记与样式可叠加（色值在最外层，渲染器先解析颜色再解析内层标记）。
    const highlight = marks.find((mark) => mark.type === 'highlight') as { attrs?: { color?: string } } | undefined
    const color = marks.find((mark) => mark.type === 'color') as { attrs?: { color?: string } } | undefined
    if (highlight?.attrs?.color) text = `{{!${highlight.attrs.color}|${text}}}`
    if (color?.attrs?.color) text = `{{${color.attrs.color}|${text}}}`
    return text
  }
  return (node.content ?? []).map((child) => serializeInline(child)).join('')
}

const htmlToBlocks = (editor: Editor): ResumeBlock[] => {
  const json = editor.getJSON() as RichNode
  const blocks: ResumeBlock[] = []
  for (const node of json.content ?? []) {
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const kind = node.type === 'bulletList' ? 'bullet' : 'ordered'
      for (const listItem of node.content ?? []) {
        blocks.push({ id: nextDocumentId('blk'), kind, text: serializeInline(listItem).trim() })
      }
      continue
    }
    if (node.type === 'paragraph') {
      blocks.push({ id: nextDocumentId('blk'), kind: 'line', text: serializeInline(node).trim() })
    }
  }
  while (blocks.length > 1 && blocks[blocks.length - 1].text === '') blocks.pop()
  if (!blocks.length) blocks.push({ id: nextDocumentId('blk'), kind: 'line', text: '' })
  return blocks
}

const sameContent = (left: ResumeBlock[], right: ResumeBlock[]) =>
  left.length === right.length
  && left.every((block, index) => block.kind === right[index].kind && block.text === right[index].text)

const editor = shallowRef<Editor | null>(null)
/** Tiptap 外部回写时置位，避免 onUpdate 把回写当成用户输入再吐回去。 */
let applyingExternal = false

onMounted(() => {
  editor.value = new Editor({
    content: blocksToHtml(props.blocks),
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: props.placeholder })
    ],
    editorProps: {
      attributes: {
        class: 'magic-rich__editor'
      }
    },
    onUpdate: () => {
      if (!editor.value || applyingExternal) return
      const blocks = htmlToBlocks(editor.value)
      if (!sameContent(blocks, props.blocks)) emit('update:blocks', blocks)
    }
  })
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  editor.value = null
})

watch(() => props.blocks, (blocks) => {
  if (!editor.value) return
  const current = htmlToBlocks(editor.value)
  if (sameContent(current, blocks)) return
  applyingExternal = true
  editor.value.commands.setContent(blocksToHtml(blocks), { emitUpdate: false })
  applyingExternal = false
})
</script>

<style scoped lang="scss">
.magic-rich {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.18s ease;

  &:focus-within { border-color: var(--el-color-primary, #0047ab); }
}

.magic-rich__toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid #f0f1f3;
  background: #fafbfc;

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #6b7280;
    cursor: pointer;

    &:hover { background: #eef0f3; color: #111827; }

    &.is-on {
      background: rgba(0, 71, 171, 0.08);
      color: var(--el-color-primary, #0047ab);
    }
  }
}

.magic-rich__divider {
  width: 1px;
  height: 14px;
  margin: 0 4px;
  background: #e5e7eb;
}

.magic-rich__color-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #6b7280;
  cursor: pointer;

  &:hover { background: #eef0f3; color: #111827; }
}

.magic-rich__palette {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  button {
    height: 28px;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    cursor: pointer;
    transition: transform 0.15s ease;

    &:hover { transform: scale(1.08); }
  }
}

.magic-rich__content {
  min-height: 96px;

  :deep(.magic-rich__editor) {
    min-height: 96px;
    padding: 10px 12px;
    color: #111827;
    font-size: 13px;
    line-height: 1.7;
    outline: none;

    p { margin: 0 0 2px; }

    ul, ol {
      margin: 2px 0;
      padding-left: 20px;
    }

    ul { list-style: disc; }
    ol { list-style: decimal; }

    li { margin: 0 0 2px; }

    strong { font-weight: 700; }
    u, del { text-decoration-thickness: 1px; }
  }

  /* 魔方同款占位符 */
  :deep(.magic-rich__editor p.is-editor-empty:first-child)::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    color: #b3bac4;
    pointer-events: none;
  }
}

.magic-rich__hint {
  margin: 0;
  padding: 6px 12px;
  border-top: 1px solid #f0f1f3;
  color: #b3bac4;
  font-size: 11px;
}
</style>
