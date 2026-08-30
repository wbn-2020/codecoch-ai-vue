<template>
  <header class="cc-hero-band">
    <div class="cc-hero-band__copy">
      <span v-if="eyebrow || $slots.eyebrow" class="cc-hero-band__eyebrow" :class="`is-${tone}`">
        <i v-if="dot" class="cc-hero-band__dot" aria-hidden="true"></i>
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </span>
      <h1 class="cc-hero-band__title">
        <slot name="title">{{ title }}</slot>
      </h1>
      <p v-if="sub || $slots.sub" class="cc-hero-band__sub">
        <slot name="sub">{{ sub }}</slot>
      </p>
      <div v-if="$slots.default" class="cc-hero-band__chips">
        <slot />
      </div>
    </div>
    <div v-if="$slots.actions" class="cc-hero-band__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  eyebrow?: string
  sub?: string
  /** 徽标左侧圆点（对齐原型 .eyebrow .dot） */
  dot?: boolean
  tone?: 'accent' | 'ai'
}>(), { tone: 'accent' })
</script>

<style scoped lang="scss">
.cc-hero-band {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;

  &__copy {
    min-width: 0;
  }

  &__title {
    margin: 10px 0 0;
    color: var(--user-text);
    font-size: var(--user-text-h1, 30px);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.2;
  }

  &__sub {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: var(--user-text-body-sm, 13px);
    line-height: 1.5;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: var(--user-radius-full, 999px);
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: var(--user-text-overline, 11px);
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;

    &.is-ai {
      background: var(--user-ai-soft);
      color: var(--user-ai);
    }
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    :deep(.el-button),
    :deep(.arena-btn) {
      height: 36px;
      font-size: 13px;
    }
  }
}
</style>
