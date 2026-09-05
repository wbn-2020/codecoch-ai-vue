<template>
  <div class="markdown-toolbar" role="toolbar" :aria-label="label">
    <button
      v-for="command in commands"
      :key="command.key"
      type="button"
      class="markdown-toolbar__button"
      :title="command.title"
      :aria-label="command.title"
      :disabled="disabled"
      @mousedown.prevent
      @click="emit('command', command.key)"
    >
      {{ command.glyph }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ label?: string; disabled?: boolean }>(), {
  label: '文本格式',
  disabled: false
})

const emit = defineEmits<{ command: ['bold' | 'italic' | 'link'] }>()

const commands = computed(() => [
  { key: 'bold' as const, glyph: 'B', title: '加粗 **文字**' },
  { key: 'italic' as const, glyph: 'I', title: '斜体 *文字*' },
  { key: 'link' as const, glyph: '↗', title: '链接 [文字](https://…)' }
])
</script>

<style scoped lang="scss">
.markdown-toolbar {
  display: flex;
  gap: 2px;

  &__button {
    min-width: 26px;
    height: 24px;
    padding: 0 6px;
    border: 1px solid transparent;
    border-radius: var(--user-radius-sm);
    background: transparent;
    color: var(--user-text-secondary);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12px;
    font-weight: 600;
    line-height: 22px;
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
  }
}
</style>
