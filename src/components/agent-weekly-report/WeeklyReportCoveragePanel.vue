<template>
  <section class="weekly-panel coverage-panel" data-testid="weekly-coverage-panel">
    <header class="weekly-panel__header">
      <div>
        <h2>数据范围与来源</h2>
        <p>数据按所选时间范围汇总；缺失或不完整的记录不会被当作完整结论。</p>
      </div>
      <div class="weekly-panel__tags">
        <el-tag effect="plain" :type="consistencyTagType">{{ consistencyLabel }}</el-tag>
        <el-tag v-if="coverage.truncated" type="warning" effect="plain">来源已截断</el-tag>
      </div>
    </header>

    <div class="coverage-meta">
      <div>
        <span>时区</span>
        <strong>{{ timezoneLabel }}</strong>
      </div>
      <div>
        <span>活动窗口</span>
        <strong>{{ rangeText }}</strong>
      </div>
      <div>
        <span>数据截点</span>
        <strong>{{ cutoffText }}</strong>
      </div>
    </div>

    <ul v-if="coverage.warnings.length" class="coverage-warnings">
      <li v-for="warning in coverage.warnings" :key="warning">{{ coverageMessage(warning) }}</li>
    </ul>

    <div v-if="groups.length" class="coverage-list">
      <article v-for="group in groups" :key="group.sourceType" class="coverage-row">
        <div class="coverage-row__title">
          <strong>{{ group.label }}</strong>
        </div>
        <div class="coverage-row__counts">
          <span>纳入 {{ group.includedCount }}</span>
          <span>排除 {{ group.excludedCount }}</span>
          <span v-if="group.unavailableCount">不可用 {{ group.unavailableCount }}</span>
        </div>
        <el-tag effect="plain" :type="sourceTagType(group.status)">
          {{ sourceStatusLabel(group.status) }}
        </el-tag>
        <p v-if="group.reasons.length">{{ group.reasons.map(coverageMessage).join('；') }}</p>
      </article>
    </div>
    <p v-else class="weekly-panel__empty">当前快照没有返回来源覆盖明细。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  buildWeeklyReportCoverageGroups,
  formatWeeklyReportDateTime,
  getWeeklyReportCoverageMessage,
  getWeeklyReportTimezoneLabel
} from '@/features/agent-weekly-report'
import type {
  WeeklyReportCoverage,
  WeeklyReportRange,
  WeeklyReportSourceStatus
} from '@/types/agentWeeklyReport'

const props = defineProps<{
  coverage: WeeklyReportCoverage
  range?: WeeklyReportRange
  timezone?: string
  sourceCutoffAt?: string
}>()

const groups = computed(() => buildWeeklyReportCoverageGroups(props.coverage))
const timezoneLabel = computed(() =>
  getWeeklyReportTimezoneLabel(props.timezone || props.range?.timezone)
)
const normalizedConsistency = computed(() =>
  String(props.coverage.consistencyLevel || 'BEST_EFFORT').toUpperCase()
)
const consistencyLabel = computed(() => {
  if (normalizedConsistency.value === 'COMPLETE') return '来源完整'
  if (normalizedConsistency.value === 'PARTIAL') return '部分来源'
  return '尽力聚合'
})
const consistencyTagType = computed(() => {
  if (normalizedConsistency.value === 'COMPLETE') return 'success'
  if (normalizedConsistency.value === 'PARTIAL') return 'warning'
  return 'info'
})
const rangeText = computed(() => {
  const start = props.range?.weekStartDate || '--'
  const end = props.range?.weekEndDate || '--'
  return `${start} 至 ${end}`
})
const cutoffText = computed(() =>
  formatWeeklyReportDateTime(
    props.sourceCutoffAt || props.range?.sourceCutoffAt,
    props.timezone || props.range?.timezone
  )
)
const coverageMessage = (value?: string) => getWeeklyReportCoverageMessage(value)
const sourceStatusLabel = (status: WeeklyReportSourceStatus) => {
  if (status === 'UNAVAILABLE') return '不可用'
  if (status === 'TRUNCATED') return '已截断'
  if (status === 'EXCLUDED') return '仅排除'
  return '已纳入'
}
const sourceTagType = (status: WeeklyReportSourceStatus) => {
  if (status === 'UNAVAILABLE') return 'danger'
  if (status === 'TRUNCATED') return 'warning'
  if (status === 'EXCLUDED') return 'info'
  return 'success'
}
</script>

<style scoped lang="scss">
.weekly-panel {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--arena-line, var(--app-border));
  border-radius: 14px;
  background: var(--user-surface, var(--app-surface));
}

.weekly-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.weekly-panel__header h2,
.weekly-panel__header p {
  margin: 0;
}

.weekly-panel__header h2 {
  font-size: 18px;
}

.weekly-panel__header p,
.weekly-panel__empty,
.coverage-row p {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.weekly-panel__header p {
  max-width: 72ch;
  margin-top: 6px;
  font-size: 13px;
}

.weekly-panel__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.coverage-meta {
  display: grid;
  grid-template-columns: minmax(140px, 0.75fr) minmax(220px, 1fr) minmax(240px, 1.2fr);
  margin-top: 16px;
  border-top: 1px solid var(--app-border);
  border-bottom: 1px solid var(--app-border);
}

.coverage-meta div {
  min-width: 0;
  padding: 12px 14px 12px 0;
}

.coverage-meta span,
.coverage-meta strong {
  display: block;
}

.coverage-meta span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.coverage-meta strong {
  margin-top: 5px;
  font-size: 13px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.coverage-warnings {
  display: grid;
  gap: 6px;
  margin: 14px 0 0;
  padding-left: 18px;
  color: var(--user-warning-text, var(--user-warning));
  font-size: 13px;
  line-height: 1.55;
}

.coverage-list {
  margin-top: 8px;
}

.coverage-row {
  display: grid;
  grid-template-columns: minmax(180px, 1.2fr) minmax(220px, 1fr) auto;
  gap: 12px 18px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--app-border);
}

.coverage-row:last-child {
  border-bottom: 0;
}

.coverage-row__title,
.coverage-row__title strong,
.coverage-row__title span {
  min-width: 0;
}

.coverage-row__title strong,
.coverage-row__title span {
  display: block;
  overflow-wrap: anywhere;
}

.coverage-row__title span {
  margin-top: 4px;
  color: var(--app-text-muted);
  font-size: 11px;
}

.coverage-row__counts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.coverage-row p {
  grid-column: 1 / -1;
  margin: -3px 0 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.weekly-panel__empty {
  margin: 16px 0 0;
}

@media (max-width: 760px) {
  .weekly-panel {
    padding: 16px;
  }

  .weekly-panel__header {
    flex-direction: column;
  }

  .weekly-panel__tags {
    justify-content: flex-start;
  }

  .coverage-meta,
  .coverage-row {
    grid-template-columns: 1fr;
  }

  .coverage-meta div {
    padding-right: 0;
  }
}
</style>
