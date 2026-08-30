<template>
  <section class="cc-empty-state" :class="`is-${tone}`">
    <div v-if="$slots.icon" class="cc-empty-state__icon">
      <slot name="icon" />
    </div>
    <div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="cc-empty-state__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description: string
  tone?: 'default' | 'warning' | 'danger'
}>(), {
  tone: 'default'
})
</script>

<style scoped lang="scss">
.cc-empty-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-height: 220px;
  padding: 32px 20px;
  border: 1px dashed var(--user-border-strong);
  border-radius: 8px;
  background: var(--user-state-bg);
  color: var(--user-text-muted);
  text-align: center;
}

.cc-empty-state__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-primary);
}

h2 {
  margin: 0;
  color: var(--user-text);
  font-size: 16px;
  line-height: 1.4;
}

p {
  max-width: 58ch;
  margin: 6px 0 0;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.cc-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.is-warning {
  border-color: rgba(245, 158, 11, 0.32);
  background: var(--user-warning-soft);
}

.is-danger {
  border-color: var(--user-danger-border);
  background: var(--user-danger-soft);
}
</style>
