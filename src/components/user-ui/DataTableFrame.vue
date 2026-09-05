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
  border-radius: var(--user-radius-lg, 14px);
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

  // v21 · Quiet Luxury 表格原子：44px 行高、去斑马、overline 表头、数字右对齐
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    background: var(--user-surface);
  }

  :deep(th) {
    padding: 12px 16px;
    border-bottom: 1px solid var(--user-border);
    background: var(--user-surface-muted);
    color: var(--user-text-muted);
    font-size: var(--user-text-overline, 11px);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  :deep(td) {
    height: 44px;
    padding: 0 16px;
    border-bottom: 1px solid var(--user-border);
    color: var(--user-text-secondary);
    font-size: var(--user-text-body-sm, 13px);
    vertical-align: middle;
  }

  :deep(tbody tr:last-child td) {
    border-bottom: none;
  }

  :deep(tbody tr) {
    transition: background 0.12s ease;
  }

  :deep(tbody tr:hover) {
    background: var(--user-surface-muted);
  }

  :deep(.cc-cell-num) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}

@media (max-width: 760px) {
  .cc-data-table-frame__head {
    flex-direction: column;
    padding: 14px;
  }
}
</style>
