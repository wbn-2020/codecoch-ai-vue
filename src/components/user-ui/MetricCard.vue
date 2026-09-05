<template>
  <article class="cc-metric-card" :class="`is-${tone}`">
    <div class="cc-metric-card__head">
      <span>{{ label }}</span>
      <slot name="icon" />
    </div>
    <strong :data-testid="testId">{{ value }}</strong>
    <p v-if="detail" :class="{ 'is-emphasis': emphasis }">{{ detail }}</p>
    <slot />
  </article>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string | number
  detail?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'ai'
  emphasis?: boolean
  testId?: string
}>(), {
  tone: 'default',
  emphasis: false
})
</script>

<style scoped lang="scss">
// v21 · KPI 数据卡：overline 标签 + 30/600 tabular-nums 数值 + 去饱和 tint
.cc-metric-card {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  min-height: 112px;
  padding: 16px;
  border: 1px solid var(--user-border, #e3e0da);
  border-radius: var(--user-radius-lg, 14px);
  background: var(--user-surface, #ffffff);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.cc-metric-card:hover {
  border-color: var(--user-border-strong, #c9c4bb);
  box-shadow: var(--user-shadow-sm, 0 2px 4px rgba(26, 25, 23, 0.04));
}

.cc-metric-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--user-text-muted, #6e6963);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1.5;
}

strong {
  min-width: 0;
  margin-top: 2px;
  overflow-wrap: anywhere;
  color: var(--user-text, #1a1917);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}

p {
  margin: 0;
  color: var(--user-text-muted, #6e6963);
  font-size: 12px;
  line-height: 1.5;
}

p.is-emphasis {
  color: var(--user-primary, #1f6f5c);
  font-weight: 600;
}

.is-success {
  border-color: var(--user-success-border, rgba(46, 125, 91, 0.32));
  background: var(--user-success-soft, #eaf3ee);
}

.is-warning {
  border-color: color-mix(in srgb, var(--user-warning, #b4690e) 30%, transparent);
  background: var(--user-warning-soft, #fdf3e3);
}

.is-danger {
  border-color: var(--user-danger-border, rgba(176, 58, 58, 0.3));
  background: var(--user-danger-soft, #fbeeee);
}

.is-info {
  border-color: color-mix(in srgb, var(--user-cyan, #3a6b8c) 28%, transparent);
  background: var(--user-cyan-soft, #eaf1f6);
}

.is-ai {
  border-color: color-mix(in srgb, var(--user-ai, #6f5c93) 26%, transparent);
  background: var(--user-ai-soft, #f1edf7);
}

@media (max-width: 760px) {
  .cc-metric-card {
    min-height: 100px;
  }
}
</style>
