<template>
  <header class="cc-page-header">
    <div class="cc-page-header__copy">
      <p v-if="$slots.eyebrow || eyebrow" class="cc-page-header__eyebrow">
        <slot name="eyebrow">
          <component :is="icon" v-if="icon" :size="15" aria-hidden="true" />
          {{ eyebrow }}
        </slot>
      </p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="cc-page-header__description">{{ description }}</p>
      <slot name="meta" />
    </div>
    <div v-if="$slots.actions" class="cc-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: Component
}>()
</script>

<style scoped lang="scss">
.cc-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  min-width: 0;
  padding: 2px 0 0;
}

.cc-page-header__copy {
  min-width: 0;
}

.cc-page-header__eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

h1 {
  margin: 6px 0 0;
  color: var(--user-text);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  text-wrap: balance;
}

.cc-page-header__description {
  max-width: 75ch;
  margin: 8px 0 0;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.6;
  text-wrap: pretty;
}

.cc-page-header__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 760px) {
  .cc-page-header {
    flex-direction: column;
    gap: 14px;
  }

  h1 {
    font-size: 24px;
  }

  .cc-page-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
