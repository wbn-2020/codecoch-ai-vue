<template>
  <section class="weekly-panel signals-panel" data-testid="weekly-signals-panel">
    <header class="weekly-panel__header">
      <div>
        <h2>变化信号</h2>
        <p>信号只表达当前可比范围内的方向变化，并保留样本门槛与禁止结论。</p>
      </div>
    </header>

    <div v-if="factOnly" class="signal-boundary">
      <strong>当前仅展示事实</strong>
      <p>样本或可比结果不足，渠道、简历版本和面试能力方向暂不展示。</p>
    </div>
    <div v-else-if="signals.length" class="signal-list">
      <article v-for="(signal, index) in signals" :key="signal.signalId || index" class="signal-row">
        <div class="signal-row__head">
          <div>
            <span>{{ getWeeklyReportSignalTypeLabel(signal.signalType) }}</span>
            <h3>{{ safeText(signal.title, '待验证变化信号') }}</h3>
          </div>
          <div class="signal-row__tags">
            <el-tag effect="plain">{{ getWeeklyReportDirectionLabel(signal.direction) }}</el-tag>
            <el-tag effect="plain" :type="confidenceType(signal.confidenceLevel)">
              {{ confidenceLabel(signal.confidenceLevel) }}
            </el-tag>
          </div>
        </div>
        <p class="signal-row__description">{{ safeText(signal.description, '暂无信号说明。') }}</p>
        <dl v-if="objectEntries(signal.metric).length || objectEntries(signal.sampleBoundary).length">
          <div v-for="[key, value] in objectEntries(signal.metric)" :key="`metric-${key}`">
            <dt>{{ getWeeklyReportDetailLabel(key) }}</dt>
            <dd>{{ displayValue(value) }}</dd>
          </div>
          <div v-for="[key, value] in objectEntries(signal.sampleBoundary)" :key="`boundary-${key}`">
            <dt>{{ getWeeklyReportDetailLabel(key) }}</dt>
            <dd>{{ displayValue(value) }}</dd>
          </div>
        </dl>
        <div v-if="signal.blockedConclusions.length" class="blocked-conclusions">
          <span>暂不能得出的结论</span>
          <p>{{ signal.blockedConclusions.map(blockedConclusionText).join('、') }}</p>
        </div>
      </article>
    </div>
    <p v-else class="weekly-panel__empty">当前没有满足门槛的方向信号。</p>
  </section>
</template>

<script setup lang="ts">
import {
  formatWeeklyReportDisplayValue,
  getWeeklyReportConfidencePresentation,
  getWeeklyReportDetailLabel,
  getWeeklyReportDirectionLabel,
  getWeeklyReportSignalTypeLabel,
  getWeeklyReportUserText
} from '@/features/agent-weekly-report'
import type { WeeklyReportSignal } from '@/types/agentWeeklyReport'

defineProps<{
  signals: WeeklyReportSignal[]
  factOnly?: boolean
}>()

const objectEntries = (value: Record<string, unknown>) => Object.entries(value)
const displayValue = (value: unknown) => formatWeeklyReportDisplayValue(value)
const safeText = (value: unknown, fallback: string) => getWeeklyReportUserText(value, fallback)
const blockedConclusionText = (value: string) =>
  getWeeklyReportUserText(value, '当前证据不足，暂不能形成该结论。')
const confidenceLabel = (value?: string) => getWeeklyReportConfidencePresentation(value).label
const confidenceType = (value?: string) => getWeeklyReportConfidencePresentation(value).tagType
</script>

<style scoped lang="scss">
.weekly-panel {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--arena-line, var(--app-border));
  border-radius: 14px;
  background: var(--user-surface, var(--app-surface));
}

.weekly-panel__header h2,
.weekly-panel__header p,
.weekly-panel__empty,
.signal-boundary strong,
.signal-boundary p {
  margin: 0;
}

.weekly-panel__header h2 {
  font-size: 18px;
}

.weekly-panel__header p,
.weekly-panel__empty,
.signal-boundary p,
.signal-row__description,
.blocked-conclusions p,
details {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.weekly-panel__header p {
  max-width: 72ch;
  margin-top: 6px;
  font-size: 13px;
}

.signal-boundary {
  margin-top: 16px;
  padding: 14px 0 2px;
  border-top: 1px solid var(--app-border);
}

.signal-boundary p {
  margin-top: 5px;
  font-size: 13px;
}

.signal-list {
  margin-top: 12px;
}

.signal-row {
  padding: 15px 0;
  border-bottom: 1px solid var(--app-border);
}

.signal-row:last-child {
  border-bottom: 0;
}

.signal-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.signal-row__head span {
  color: var(--app-text-muted);
  font-size: 11px;
}

.signal-row__head h3 {
  margin: 5px 0 0;
  font-size: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.signal-row__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.signal-row__description {
  max-width: 78ch;
  margin: 10px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

dl {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
}

dl div {
  min-width: 130px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--user-surface-muted, var(--app-surface-raised));
}

dt {
  color: var(--app-text-muted);
  font-size: 11px;
}

dd {
  margin: 4px 0 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.blocked-conclusions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--app-border);
}

.blocked-conclusions span {
  color: var(--user-warning-text, var(--user-warning));
  font-size: 12px;
  font-weight: 700;
}

.blocked-conclusions p {
  margin: 0;
  font-size: 12px;
  overflow-wrap: anywhere;
}

details {
  margin-top: 10px;
  font-size: 11px;
}

summary {
  cursor: pointer;
}

details p {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}

.weekly-panel__empty {
  margin-top: 16px;
}

@media (max-width: 760px) {
  .weekly-panel {
    padding: 16px;
  }

  .signal-row__head {
    flex-direction: column;
  }

  .signal-row__tags {
    justify-content: flex-start;
  }

  .blocked-conclusions {
    grid-template-columns: 1fr;
  }
}
</style>
