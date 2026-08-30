<template>
  <span class="cc-status-chip" :class="`is-${tone}`">
    <span v-if="dot" class="cc-status-chip__dot" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'ai'
  dot?: boolean
}>(), {
  tone: 'neutral',
  dot: false
})
</script>

<style scoped lang="scss">
.cc-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  max-width: 100%;
  padding: 0 8px;
  border: 1px solid var(--user-border);
  border-radius: 999px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  overflow-wrap: anywhere;
}

.cc-status-chip__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: currentColor;
}

.is-success {
  border-color: var(--user-success-border);
  background: var(--user-success-soft);
  color: var(--user-success-text);
}

.is-warning {
  border-color: rgba(245, 158, 11, 0.3);
  background: var(--user-warning-soft);
  color: var(--user-warning-text);
}

.is-danger {
  border-color: var(--user-danger-border);
  background: var(--user-danger-soft);
  color: var(--user-danger-text);
}

.is-info {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
}

.is-ai {
  border-color: rgba(139, 92, 246, 0.24);
  background: var(--user-ai-soft);
  color: var(--user-ai);
}
</style>
