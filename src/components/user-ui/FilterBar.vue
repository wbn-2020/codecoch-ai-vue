<template>
  <section class="cc-filter-bar">
    <div class="cc-filter-bar__main">
      <slot />
    </div>
    <div v-if="$slots.actions" class="cc-filter-bar__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.cc-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border-bottom: 1px solid var(--user-border);
  background: var(--user-surface-muted);
}

.cc-filter-bar__main,
.cc-filter-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cc-filter-bar__main {
  flex: 1 1 auto;
  flex-wrap: wrap;
}

.cc-filter-bar__actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .cc-filter-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .cc-filter-bar__actions {
    justify-content: flex-start;
  }
}
</style>
