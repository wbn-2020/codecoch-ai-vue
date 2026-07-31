<template>
  <section class="weekly-panel plan-panel" data-testid="weekly-plan-draft-panel">
    <header class="weekly-panel__header">
      <div>
        <h2>下一周计划草案</h2>
        <p>草案只读，不会自动创建任务、修改周计划或确认任何建议。</p>
      </div>
      <el-tag effect="plain" type="info">只读</el-tag>
    </header>

    <div v-if="!draft.available" class="plan-unavailable" role="status">
      <strong>下一周计划预览暂不可用</strong>
      <p>{{ unavailableReason }}</p>
    </div>

    <div v-if="draft.items.length" class="plan-list">
      <article v-for="(item, index) in draft.items" :key="item.semanticKey || index" class="plan-row">
        <div class="plan-row__head">
          <div>
            <span>{{ item.targetDate || draft.targetWeekStart || '待安排日期' }}</span>
            <h3>{{ safeText(item.title, '手动行动建议') }}</h3>
          </div>
          <div class="plan-row__tags">
            <el-tag v-if="item.priority" effect="plain">{{ getWeeklyReportPriorityLabel(item.priority) }}</el-tag>
            <el-tag v-if="item.estimatedMinutes != null" effect="plain" type="info">
              {{ item.estimatedMinutes }} 分钟
            </el-tag>
          </div>
        </div>
        <p v-if="item.description">{{ safeText(item.description, '按当前记录补充下一步行动。') }}</p>
        <dl>
          <div v-if="item.actionType">
            <dt>行动类型</dt>
            <dd>{{ getWeeklyReportActionTypeLabel(item.actionType) }}</dd>
          </div>
          <div v-if="item.reason">
            <dt>建议依据</dt>
            <dd>{{ safeText(item.reason, '基于本周可核验事实与待验证方向提出。') }}</dd>
          </div>
        </dl>
      </article>
    </div>
    <p v-else class="weekly-panel__empty">当前快照没有下一周手动行动建议。</p>
    <footer v-if="draft.items.length" class="plan-actions">
      <ExternalPlanPreviewEntry
        source-type="WEEKLY_REPORT"
        :source-id="sourceId"
        :source-version="sourceVersion"
        :source-context-hash="sourceContextHash"
        :target-job-id="targetJobId"
        :target-date="draft.targetWeekStart"
        :intents="planIntents"
        :capability-available="draft.available"
        button-label="预览并加入计划"
      />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import ExternalPlanPreviewEntry from '@/components/v7/ExternalPlanPreviewEntry.vue'
import {
  getWeeklyPlanUnavailableReason,
  getWeeklyReportActionTypeLabel,
  getWeeklyReportPriorityLabel,
  getWeeklyReportUserText
} from '@/features/agent-weekly-report'
import type { WeeklyPlanDraft } from '@/types/agentWeeklyReport'

const props = defineProps<{
  draft: WeeklyPlanDraft
  sourceId?: number
  sourceVersion?: number
  sourceContextHash?: string
  targetJobId?: number
}>()

const unavailableReason = computed(() =>
  getWeeklyPlanUnavailableReason(props.draft.unavailableReason)
)
const safeText = (value: unknown, fallback: string) => getWeeklyReportUserText(value, fallback)
const planIntents = computed(() => props.draft.items.map((item, index) => ({
  sourceItemKey: item.semanticKey || `weekly-plan-${index}`,
  title: safeText(item.title, '周报行动建议'),
  description: safeText(item.description || item.reason, '基于本周事实生成的待确认行动。'),
  planDate: item.targetDate,
  estimatedMinutes: item.estimatedMinutes,
  priority: item.priority,
  confidenceLevel: 'MEDIUM',
  fallback: false
})))
</script>

<style scoped lang="scss">
.weekly-panel {
  min-width: 0;
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.46);
}

.weekly-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.weekly-panel__header h2,
.weekly-panel__header p,
.weekly-panel__empty,
.plan-unavailable strong,
.plan-unavailable p {
  margin: 0;
}

.weekly-panel__header h2 {
  font-size: 18px;
}

.weekly-panel__header p,
.weekly-panel__empty,
.plan-unavailable p,
.plan-row p,
dd {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.weekly-panel__header p {
  max-width: 72ch;
  margin-top: 6px;
  font-size: 13px;
}

.plan-unavailable {
  margin-top: 16px;
  padding: 13px 14px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.09);
}

.plan-unavailable p {
  margin-top: 5px;
  font-size: 13px;
}

.plan-list {
  margin-top: 8px;
}

.plan-row {
  padding: 15px 0;
  border-bottom: 1px solid var(--app-border);
}

.plan-row:last-child {
  border-bottom: 0;
}

.plan-row__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.plan-row__head span {
  color: var(--app-text-muted);
  font-size: 11px;
}

.plan-row__head h3 {
  margin: 5px 0 0;
  font-size: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.plan-row__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.plan-row > p {
  max-width: 82ch;
  margin: 9px 0 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
  margin: 12px 0 0;
}

dl div {
  min-width: 0;
  padding: 9px 10px;
  border-radius: 6px;
  background: rgba(2, 6, 23, 0.34);
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

.weekly-panel__empty {
  margin-top: 16px;
}

.plan-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
}

@media (max-width: 760px) {
  .weekly-panel {
    padding: 16px;
  }

  .weekly-panel__header,
  .plan-row__head {
    flex-direction: column;
  }

  .plan-row__tags {
    justify-content: flex-start;
  }
}
</style>
