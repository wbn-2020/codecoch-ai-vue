<template>
  <section class="next-action-banner" :class="`is-${action.tone}`">
    <div class="next-action-banner__icon" aria-hidden="true">
      <component :is="toneIcon" :size="22" />
    </div>

    <div class="next-action-banner__content">
      <div class="next-action-banner__head">
        <p class="next-action-banner__kicker">下一步动作</p>
        <h2>{{ action.title }}</h2>
      </div>
      <p class="next-action-banner__description">{{ action.description }}</p>
      <p v-if="action.reason" class="next-action-banner__reason">{{ action.reason }}</p>
      <el-alert
        v-if="notice"
        class="next-action-banner__notice"
        type="warning"
        :closable="false"
        show-icon
        :title="notice"
      />
    </div>

    <div class="next-action-banner__action">
      <el-button type="primary" round @click="$emit('open', action.path)">
        <span>{{ action.label }}</span>
        <ArrowRight :size="16" />
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'

import type { NextAction } from '@/features/job-readiness/types'

const props = defineProps<{
  action: NextAction
  notice?: string
}>()

defineEmits<{
  open: [path: NextAction['path']]
}>()

const toneIcon = computed(() => {
  const iconMap = {
    primary: Sparkles,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info
  }
  return iconMap[props.action.tone] || Sparkles
})
</script>

<style scoped lang="scss">
.next-action-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--user-primary-soft);
  box-shadow: none;
}

.next-action-banner.is-success {
  border-color: var(--user-success-border);
  background: var(--user-success-soft);
}

.next-action-banner.is-warning {
  border-color: rgba(230, 173, 85, 0.34);
  background: var(--user-warning-soft);
}

.next-action-banner.is-info {
  background: var(--user-surface-muted);
}

.next-action-banner__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.next-action-banner__content {
  min-width: 0;
}

.next-action-banner__head {
  min-width: 0;
}

.next-action-banner__kicker,
.next-action-banner h2,
.next-action-banner p {
  margin: 0;
}

.next-action-banner__kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.next-action-banner h2 {
  margin-top: 5px;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.next-action-banner__description {
  margin-top: 8px;
  color: var(--app-text-muted);
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.next-action-banner__reason {
  margin-top: 8px;
  color: var(--app-text);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.next-action-banner__notice {
  margin-top: 12px;
}

.next-action-banner__action {
  display: flex;
  justify-content: flex-end;
  min-width: 0;

  :deep(.el-button) {
    max-width: 100%;
    height: auto;
    min-height: 36px;
    white-space: normal;
  }

  :deep(.el-button > span) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 720px) {
  .next-action-banner {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    padding: 16px;
  }

  .next-action-banner__action {
    grid-column: 1 / -1;
    justify-content: stretch;

    :deep(.el-button) {
      width: 100%;
    }
  }
}
</style>
