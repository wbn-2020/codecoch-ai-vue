<template>
  <div class="markdown-preview" v-html="html" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  content?: unknown
}>()

let markdownModulePromise: Promise<typeof import('markdown-it')> | null = null
let markdownRenderer: { render: (source: string) => string } | null = null
let renderSeq = 0

const loadMarkdownRenderer = async () => {
  if (!markdownModulePromise) {
    markdownModulePromise = import('markdown-it')
  }
  const { default: MarkdownIt } = await markdownModulePromise
  if (!markdownRenderer) {
    markdownRenderer = new MarkdownIt({
      html: false,
      linkify: true,
      breaks: true
    })
  }
  return markdownRenderer
}

const allowedTags = new Set([
  'A',
  'BLOCKQUOTE',
  'BR',
  'CODE',
  'EM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'LI',
  'OL',
  'P',
  'PRE',
  'S',
  'STRONG',
  'TABLE',
  'TBODY',
  'TD',
  'TH',
  'THEAD',
  'TR',
  'UL'
])

const allowedAttributes: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
  CODE: new Set(['class'])
}

const isSafeUrl = (value: string) => /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(value)

const escapeHtml = (source: string) =>
  source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderPlainHtml = (source: string) => {
  if (!source) return ''
  return `<p>${escapeHtml(source).replace(/\r?\n/g, '<br>')}</p>`
}

const sanitizeHtml = (source: string) => {
  if (!source || typeof DOMParser === 'undefined') return source

  const doc = new DOMParser().parseFromString(source, 'text/html')

  doc.body.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const allowed = allowedAttributes[element.tagName]?.has(attribute.name)
      const isUnsafeHref = element.tagName === 'A' && attribute.name === 'href' && !isSafeUrl(attribute.value)

      if (!allowed || attribute.name.startsWith('on') || isUnsafeHref) {
        element.removeAttribute(attribute.name)
      }
    })

    if (element.tagName === 'A') {
      element.setAttribute('target', '_blank')
      element.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return doc.body.innerHTML
}

const keyLabels: Record<string, string> = {
  title: '标题',
  content: '内容',
  question: '题目',
  answer: '答案',
  referenceAnswer: '参考答案',
  analysis: '解析',
  reason: '原因',
  suggestion: '建议',
  suggestions: '建议',
  summary: '摘要',
  score: '得分',
  result: '结果',
  message: '说明',
  type: '类型',
  status: '状态',
  label: '标签',
  name: '名称',
  options: '选项',
  nextActions: '下一步'
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isStructuredValue = (value: unknown) => Array.isArray(value) || isRecord(value)

const keyLabel = (key: string) => {
  if (keyLabels[key]) return keyLabels[key]
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
}

const formatStructuredValue = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined || value === '') return '暂未返回'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)

  const indent = '  '.repeat(depth)
  if (Array.isArray(value)) {
    if (!value.length) return '暂无内容'
    return value
      .map((item, index) => {
        const formatted = formatStructuredValue(item, depth + 1)
        return `${indent}${index + 1}. ${isStructuredValue(item) ? '\n' : ''}${formatted}`
      })
      .join('\n')
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== '')
    if (!entries.length) return '暂无内容'
    return entries
      .map(([key, item]) => {
        const formatted = formatStructuredValue(item, depth + 1)
        return `${indent}- ${keyLabel(key)}：${isStructuredValue(item) ? '\n' : ''}${formatted}`
      })
      .join('\n')
  }

  return String(value)
}

const normalizeContent = (content: unknown) => {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content) || typeof content === 'object') return formatStructuredValue(content)
  return String(content)
}

const html = ref('')

watch(
  () => props.content,
  async (content) => {
    const seq = ++renderSeq
    const normalized = normalizeContent(content)
    html.value = sanitizeHtml(renderPlainHtml(normalized))
    if (!normalized) return

    const renderer = await loadMarkdownRenderer()
    if (seq !== renderSeq) return
    html.value = sanitizeHtml(renderer.render(normalized))
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.markdown-preview {
  color: var(--app-text);
  font-size: 14px;
  line-height: 1.75;
  word-break: break-word;

  :deep(p) {
    margin: 0 0 10px;
  }

  :deep(pre) {
    overflow-x: auto;
    padding: 12px;
    border-radius: 8px;
    background: #0f172a;
    color: #e5e7eb;
  }

  :deep(code) {
    font-family: 'JetBrains Mono', Consolas, monospace;
  }
}
</style>
