<template>
  <article class="cc-stat-card" :data-testid="testId">
    <div class="cc-stat-card__label">{{ label }}</div>
    <div class="cc-stat-card__value" :class="tone && `is-${tone}`">{{ value }}</div>
    <div
      v-if="progress !== undefined"
      class="cc-stat-card__meter"
      role="progressbar"
      :aria-label="label"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuenow="clampedProgress"
    >
      <span class="cc-stat-card__meter-fill" :style="{ width: `${clampedProgress}%` }" />
    </div>
    <p v-if="detail" class="cc-stat-card__detail" :class="tone && `is-${tone}`">{{ detail }}</p>
    <slot />
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  label: string
  value: string | number
  detail?: string
  /** 0-100；提供则渲染进度条 */
  progress?: number
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'ai'
  testId?: string
}>(), { tone: 'default' })

const clampedProgress = computed(() =>
  props.progress === undefined ? 0 : Math.max(0, Math.min(100, Math.round(props.progress)))
)
</script>

<style scoped lang="scss">
.cc-stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-lg);
  background: var(--user-surface);
}

.cc-stat-card__label {
  color: var(--user-text-muted);
  font-size: var(--user-text-caption, 12px);
  font-weight: 500;
}

.cc-stat-card__value {
  color: var(--user-text);
  font-size: var(--user-text-h1, 30px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;

  &.is-warning { color: var(--user-warning-text); }
  &.is-success { color: var(--user-success-text); }
  &.is-danger { color: var(--user-danger-text); }
  &.is-info { color: var(--user-cyan); }
  &.is-ai { color: var(--user-ai); }
}

.cc-stat-card__meter {
  height: 6px;
  overflow: hidden;
  border-radius: var(--user-radius-full, 999px);
  background: var(--user-surface-muted);
}

.cc-stat-card__meter-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--user-primary);
  transition: width 0.3s ease;
}

.cc-stat-card__detail {
  margin: 0;
  color: var(--user-text-muted);
  font-size: var(--user-text-body-sm, 13px);
  line-height: 1.5;

  &.is-warning { color: var(--user-warning-text); }
  &.is-danger { color: var(--user-danger-text); }
  &.is-success { color: var(--user-success-text); }
}
</style>
