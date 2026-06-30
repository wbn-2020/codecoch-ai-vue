<template>
  <section class="readiness-progress-panel">
    <header class="readiness-progress-panel__head">
      <div>
        <p class="readiness-progress-panel__kicker">求职准备度</p>
        <h2>{{ result.doneCount }}/{{ result.totalCount }} 已完成</h2>
      </div>
      <div class="readiness-progress-panel__meter">
        <strong>{{ normalizedPercent }}%</strong>
        <el-progress :percentage="normalizedPercent" :stroke-width="8" :show-text="false" />
      </div>
    </header>

    <el-alert
      v-if="result.sourceNotice"
      class="readiness-progress-panel__notice"
      type="info"
      :closable="false"
      show-icon
      :title="result.sourceNotice"
    />

    <div class="readiness-progress-panel__steps">
      <button
        v-for="step in result.steps"
        :key="step.key"
        class="readiness-step"
        :class="`is-${step.status}`"
        type="button"
        @click="$emit('open', step.path)"
      >
        <span class="readiness-step__marker" aria-hidden="true">
          <CheckCircle2 v-if="step.done" :size="16" />
          <LockKeyhole v-else-if="step.status === 'blocked'" :size="15" />
          <span v-else>{{ step.order }}</span>
        </span>

        <span class="readiness-step__copy">
          <strong>{{ step.title }}</strong>
          <small>{{ step.description }}</small>
          <em>{{ step.reason }}</em>
        </span>

        <span class="readiness-step__action">
          {{ step.actionLabel }}
          <ArrowRight :size="14" />
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-vue-next'
import { computed } from 'vue'

import type { ReadinessResult, ReadinessStep } from '@/features/job-readiness/types'

const props = defineProps<{
  result: ReadinessResult
}>()

defineEmits<{
  open: [path: ReadinessStep['path']]
}>()

const normalizedPercent = computed(() => {
  const value = Number(props.result.completionPercent || 0)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
})
</script>

<style scoped lang="scss">
.readiness-progress-panel {
  padding: 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
}

.readiness-progress-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.readiness-progress-panel__kicker,
.readiness-progress-panel h2 {
  margin: 0;
}

.readiness-progress-panel__kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.readiness-progress-panel h2 {
  margin-top: 6px;
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.35;
}

.readiness-progress-panel__meter {
  display: grid;
  gap: 8px;
  width: min(220px, 36vw);
  min-width: 140px;
  color: var(--app-text);
  text-align: right;
}

.readiness-progress-panel__notice {
  margin-bottom: 14px;
}

.readiness-progress-panel__steps {
  display: grid;
  gap: 10px;
}

.readiness-step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 13px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.38);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.readiness-step:hover,
.readiness-step.is-current {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.1);
}

.readiness-step.is-done {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.08);
}

.readiness-step.is-blocked {
  opacity: 0.78;
}

.readiness-step__marker {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.16);
  color: var(--app-text);
  font-size: 12px;
  font-weight: 800;
}

.readiness-step.is-done .readiness-step__marker {
  background: rgba(34, 197, 94, 0.16);
  color: #22c55e;
}

.readiness-step.is-current .readiness-step__marker {
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.readiness-step__copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.readiness-step__copy strong {
  color: var(--app-text);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.readiness-step__copy small,
.readiness-step__copy em {
  color: var(--app-text-muted);
  font-size: 12px;
  font-style: normal;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.readiness-step__action {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  color: var(--app-primary);
  font-size: 12px;
  line-height: 1.4;
  text-align: right;
  overflow-wrap: anywhere;
}

@media (max-width: 720px) {
  .readiness-progress-panel {
    padding: 16px;
  }

  .readiness-progress-panel__head {
    display: grid;
    align-items: stretch;
  }

  .readiness-progress-panel__meter {
    width: 100%;
    text-align: left;
  }

  .readiness-step {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
  }

  .readiness-step__action {
    grid-column: 2;
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
