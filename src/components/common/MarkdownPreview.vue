<template>
  <div class="markdown-preview" v-html="html" />
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    content?: string | null
  }>(),
  {
    content: ''
  }
)

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const html = computed(() => md.render(props.content || ''))
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
