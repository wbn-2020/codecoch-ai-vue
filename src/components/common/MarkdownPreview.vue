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

const html = computed(() => md.render(normalizeContent(props.content)))
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
