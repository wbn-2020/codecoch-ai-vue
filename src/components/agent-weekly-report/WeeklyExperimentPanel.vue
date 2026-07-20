<template>
  <section class="weekly-panel experiment-panel" data-testid="weekly-experiment-panel">
    <header class="weekly-panel__header">
      <div>
        <h2>待验证假设与策略实验</h2>
        <p>每条建议只改变一个主变量；它们是观察方案，不是策略优劣或因果结论。</p>
      </div>
    </header>

    <div v-if="factOnly" class="experiment-boundary">
      <strong>暂不生成策略假设</strong>
      <p>先按事实区和计划草案中的手动行动补齐样本，再进入单变量验证。</p>
    </div>
    <template v-else>
      <div v-if="hypotheses.length" class="experiment-group">
        <h3>待验证假设</h3>
        <article v-for="(item, index) in hypotheses" :key="item.hypothesisId || index" class="experiment-row">
          <div class="experiment-row__head">
            <strong>{{ safeText(item.statement, '待验证假设') }}</strong>
            <el-tag effect="plain">{{ getWeeklyReportHypothesisStatusLabel(item.status) }}</el-tag>
          </div>
          <div class="experiment-meta">
            <span v-if="item.primaryVariable">本轮只调整：{{ getWeeklyReportVariableLabel(item.primaryVariable) }}</span>
            <span v-if="item.minimumSample != null">最低样本：{{ item.minimumSample }}</span>
            <span v-if="item.observationDays != null">观察期：{{ item.observationDays }} 天</span>
          </div>
          <p v-if="item.fixedVariables.length">保持不变：{{ fixedVariableText(item.fixedVariables) }}</p>
          <p v-if="item.successMetric">观察指标：{{ getWeeklyReportMetricLabel(item.successMetric) }}</p>
          <p v-if="item.stopCondition">停止条件：{{ safeText(item.stopCondition, '样本边界变化时暂停观察。') }}</p>
        </article>
      </div>

      <div v-if="suggestions.length" class="experiment-group">
        <h3>下一轮实验建议</h3>
        <article v-for="(item, index) in suggestions" :key="item.suggestionId || index" class="experiment-row">
          <div class="experiment-row__head">
            <strong>{{ safeText(item.title, '策略实验建议') }}</strong>
            <el-tag effect="plain" :type="confidenceType(item.confidenceLevel)">
              {{ confidenceLabel(item.confidenceLevel) }}
            </el-tag>
          </div>
          <p>{{ suggestionDescription(item) }}</p>
          <div class="experiment-meta">
            <span v-if="item.primaryVariable">本轮只调整：{{ getWeeklyReportVariableLabel(item.primaryVariable) }}</span>
            <span v-if="item.targetSample != null">目标样本：{{ item.targetSample }}</span>
            <span v-if="item.observationDays != null">观察期：{{ item.observationDays }} 天</span>
          </div>
          <p v-if="item.fixedVariables.length">保持不变：{{ fixedVariableText(item.fixedVariables) }}</p>
          <p v-if="item.successMetric">观察指标：{{ getWeeklyReportMetricLabel(item.successMetric) }}</p>
          <p v-if="item.stopCondition">停止条件：{{ safeText(item.stopCondition, '样本边界变化时暂停观察。') }}</p>
        </article>
      </div>

      <p v-if="!hypotheses.length && !suggestions.length" class="weekly-panel__empty">
        当前没有满足边界条件的假设或策略实验。
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
import {
  getWeeklyReportConfidencePresentation,
  getWeeklyReportFixedVariableLabels,
  getWeeklyReportHypothesisStatusLabel,
  getWeeklyReportMetricLabel,
  getWeeklyReportUserText,
  getWeeklyReportVariableLabel
} from '@/features/agent-weekly-report'
import type {
  WeeklyExperimentSuggestion,
  WeeklyReportHypothesis
} from '@/types/agentWeeklyReport'

defineProps<{
  hypotheses: WeeklyReportHypothesis[]
  suggestions: WeeklyExperimentSuggestion[]
  factOnly?: boolean
}>()

const confidenceLabel = (value?: string) => getWeeklyReportConfidencePresentation(value).label
const confidenceType = (value?: string) => getWeeklyReportConfidencePresentation(value).tagType
const safeText = (value: unknown, fallback: string) => getWeeklyReportUserText(value, fallback)
const fixedVariableText = (values: string[]) => getWeeklyReportFixedVariableLabels(values).join('、')
const suggestionDescription = (item: WeeklyExperimentSuggestion) =>
  getWeeklyReportUserText(item.hypothesis, '')
  || getWeeklyReportUserText(item.expectedSignal, '')
  || '暂无实验说明。'
</script>

<style scoped lang="scss">
.weekly-panel {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.46);
}

.weekly-panel__header h2,
.weekly-panel__header p,
.weekly-panel__empty,
.experiment-boundary strong,
.experiment-boundary p {
  margin: 0;
}

.weekly-panel__header h2 {
  font-size: 18px;
}

.weekly-panel__header p,
.weekly-panel__empty,
.experiment-boundary p,
.experiment-row p {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.weekly-panel__header p {
  max-width: 72ch;
  margin-top: 6px;
  font-size: 13px;
}

.experiment-boundary {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

.experiment-boundary p {
  margin-top: 5px;
  font-size: 13px;
}

.experiment-group {
  margin-top: 16px;
}

.experiment-group + .experiment-group {
  margin-top: 22px;
}

.experiment-group > h3 {
  margin: 0;
  color: #93c5fd;
  font-size: 13px;
}

.experiment-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--app-border);
}

.experiment-row:last-child {
  border-bottom: 0;
}

.experiment-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.experiment-row__head strong {
  max-width: 75ch;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.experiment-row p {
  max-width: 82ch;
  margin: 8px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.experiment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 10px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.weekly-panel__empty {
  margin-top: 16px;
}

@media (max-width: 760px) {
  .weekly-panel {
    padding: 16px;
  }

  .experiment-row__head {
    flex-direction: column;
  }
}
</style>
