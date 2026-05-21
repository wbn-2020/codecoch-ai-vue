<template>
  <div class="markdown-preview" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = defineProps<{
  content?: unknown
}>()

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

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

const normalizeContent = (content: unknown) => {
  if (content === null || content === undefined) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === 'string' ? item : JSON.stringify(item, null, 2)))
      .join('\n')
  }
  if (typeof content === 'object') return JSON.stringify(content, null, 2)
  return String(content)
}

const html = computed(() => sanitizeHtml(md.render(normalizeContent(props.content))))
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
