<template>
  <section class="cc-data-table-frame">
    <header v-if="title || $slots.header" class="cc-data-table-frame__head">
      <div v-if="title">
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="header" />
    </header>
    <slot name="filters" />
    <div class="cc-data-table-frame__content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<style scoped lang="scss">
.cc-data-table-frame {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.cc-data-table-frame__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  min-width: 0;
  padding: 16px;
  border-bottom: 1px solid var(--user-border);
}

.cc-data-table-frame__head > div {
  min-width: 0;
}

h2 {
  margin: 0;
  color: var(--user-text);
  font-size: 16px;
  line-height: 1.4;
}

p {
  margin: 4px 0 0;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.cc-data-table-frame__content {
  min-width: 0;
}

@media (max-width: 760px) {
  .cc-data-table-frame__head {
    flex-direction: column;
    padding: 14px;
  }
}
</style>
