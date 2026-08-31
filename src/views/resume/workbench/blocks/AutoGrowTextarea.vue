<template>
  <textarea
    ref="field"
    class="auto-grow-textarea"
    :class="{ 'is-disabled': disabled }"
    :value="modelValue"
    :rows="1"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-label="ariaLabel"
    spellcheck="false"
    @input="onInput"
    @keydown="emit('keydown', $event)"
    @focus="emit('focus')"
    @blur="onBlur"
  />
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
}>(), {
  placeholder: '',
  ariaLabel: '',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  keydown: [event: KeyboardEvent]
  focus: []
  blur: []
}>()

const field = ref<HTMLTextAreaElement>()
let observer: ResizeObserver | undefined

const resize = () => {
  const node = field.value
  if (!node) return
  node.style.height = 'auto'
  node.style.height = `${node.scrollHeight}px`
}

const onInput = (event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  resize()
}

onMounted(() => {
  resize()
  if (typeof ResizeObserver === 'undefined' || !field.value) return
  observer = new ResizeObserver(() => resize())
  observer.observe(field.value)
})

onBeforeUnmount(() => observer?.disconnect())
watch(() => props.modelValue, () => { void nextTick(resize) })

defineExpose({
  focus: () => field.value?.focus(),
  selection: () => {
    const node = field.value
    return node ? { start: node.selectionStart, end: node.selectionEnd } : null
  },
  select: (start: number, end: number) => {
    const node = field.value
    if (!node) return
    node.focus()
    node.setSelectionRange(start, end)
  }
})
</script>

<style scoped lang="scss">
.auto-grow-textarea {
  width: 100%;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-control-bg);
  color: var(--user-text);
  font: inherit;
  font-size: 13.5px;
  line-height: 1.6;
  resize: none;
  overflow: hidden;

  &:hover:not(.is-disabled) {
    border-color: var(--user-border-strong);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 1px;
    border-color: var(--user-primary);
  }

  &.is-disabled {
    background: var(--user-surface-muted);
    color: var(--user-text-muted);
  }

  &::placeholder {
    color: var(--user-text-subtle);
  }
}
</style>
