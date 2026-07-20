<template>
  <section
    v-if="unavailable || loading || visibleChangeSets.length"
    class="plan-change-status"
    aria-label="复盘计划变更状态"
    aria-live="polite"
  >
    <el-alert
      v-if="unavailable"
      type="warning"
      show-icon
      :closable="false"
      title="复盘调整状态暂不可用"
      description="今日任务仍按已成功加载的数据展示；当前不会从任务或周计划前端推断调整是否已经应用。"
    />

    <div v-else-if="loading && !visibleChangeSets.length" class="plan-change-status__loading">
      正在读取复盘调整状态…
    </div>

    <template v-else>
      <div class="plan-change-status__head">
        <div>
          <h2>复盘调整状态</h2>
          <p>这些状态直接来自后端变更集，不代表预览或采纳动作已经修改计划。</p>
        </div>
        <div class="plan-change-status__actions">
          <el-button size="small" text :icon="History" @click="$emit('openReview')">查看复盘</el-button>
          <el-button size="small" text :icon="RefreshCw" :loading="loading" @click="$emit('refresh')">刷新</el-button>
        </div>
      </div>

      <div class="plan-change-status__list">
        <article
          v-for="changeSet in visibleChangeSets"
          :key="changeSet.changeSetId"
          class="plan-change-status__item"
          :class="`is-${String(changeSet.status || '').toLowerCase()}`"
        >
          <div class="plan-change-status__item-main">
            <div class="plan-change-status__item-title">
              <strong>{{ statusTitle(changeSet) }}</strong>
              <el-tag
                size="small"
                :type="statusPresentation(changeSet).type"
                effect="plain"
              >
                {{ statusPresentation(changeSet).label }}
              </el-tag>
            </div>
            <p>{{ statusDescription(changeSet) }}</p>
            <small>{{ statusMeta(changeSet) }}</small>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { History, RefreshCw } from 'lucide-vue-next'
import { computed } from 'vue'

import {
  countAppliedAgentPlanChangeItems,
  getAgentPlanChangeStatusPresentation,
  getAgentPlanChangeTypeLabel,
  sortAgentPlanChangeSets
} from '@/features/agent-plan-change'
import type { AgentPlanChangePreviewVO } from '@/types/agentPlanChange'
import { formatDateTime } from '@/utils/format'

const props = withDefaults(defineProps<{
  changeSets?: AgentPlanChangePreviewVO[]
  loading?: boolean
  unavailable?: boolean
}>(), {
  changeSets: () => [],
  loading: false,
  unavailable: false
})

defineEmits<{
  refresh: []
  openReview: []
}>()

const visibleChangeSets = computed(() => sortAgentPlanChangeSets(props.changeSets).slice(0, 6))

const normalizedStatus = (changeSet: AgentPlanChangePreviewVO) =>
  String(changeSet.status || '').toUpperCase()

const statusPresentation = (changeSet: AgentPlanChangePreviewVO) =>
  getAgentPlanChangeStatusPresentation(changeSet.status)

const actualChangeCount = (changeSet: AgentPlanChangePreviewVO) => {
  const applied = countAppliedAgentPlanChangeItems(changeSet)
  if (applied) return applied
  const summary = changeSet.summary || {}
  return (summary.addCount || 0)
    + (summary.removeCount || 0)
    + (summary.rescheduleCount || 0)
    + (summary.priorityChangeCount || 0)
}

const statusTitle = (changeSet: AgentPlanChangePreviewVO) => {
  const count = actualChangeCount(changeSet)
  switch (normalizedStatus(changeSet)) {
    case 'APPLIED':
      return `已应用 ${count} 项复盘调整`
    case 'CONFIRMED_WAITING_PLAN':
      return '已确认，等待计划生成'
    case 'STALE':
      return '计划已变化，需要重新预览'
    case 'APPLY_FAILED':
      return '已确认调整应用失败，可重试'
    case 'PARTIALLY_APPLIED':
      return `部分已应用，共 ${count} 项调整`
    case 'APPLYING':
      return '正在确认写入计划'
    default:
      return statusPresentation(changeSet).label
  }
}

const statusDescription = (changeSet: AgentPlanChangePreviewVO) => {
  const status = normalizedStatus(changeSet)
  if (status === 'CONFIRMED_WAITING_PLAN') {
    return '确认记录已经保存，但目标日期尚无可写入的日计划；当前不代表任务已经创建。'
  }
  if (status === 'APPLIED') {
    return '后端已完成任务变更和周计划回流。'
  }
  if (status === 'STALE') {
    return changeSet.failureMessage || '复盘版本、任务基线或周计划快照已变化，请回到复盘页重新预览。'
  }
  if (status === 'APPLY_FAILED' || status === 'PARTIALLY_APPLIED') {
    return changeSet.failureMessage || '部分前置条件已失效，系统没有自动替换任务。'
  }
  if (status === 'APPLYING') {
    return '确认请求正在处理，请勿重复提交；刷新后会继续读取真实状态。'
  }
  return '当前状态由后端计划变更集返回。'
}

const statusMeta = (changeSet: AgentPlanChangePreviewVO) => {
  const typeLabels = Array.from(new Set(
    (changeSet.items || []).map((item) => getAgentPlanChangeTypeLabel(item.changeType))
  ))
  const time = changeSet.appliedAt
    ? `应用于 ${formatDateTime(changeSet.appliedAt)}`
    : changeSet.confirmedAt
      ? `确认于 ${formatDateTime(changeSet.confirmedAt)}`
      : '尚未确认'
  const target = changeSet.targetDate ? `目标日期 ${changeSet.targetDate}` : '目标日期待确认'
  const changes = typeLabels.length ? ` · ${typeLabels.join('、')}` : ''
  return `${target} · ${time}${changes}`
}
</script>

<style scoped lang="scss">
.plan-change-status {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--user-border, var(--app-border));
  border-radius: 8px;
  background: var(--user-surface, rgba(15, 23, 42, 0.42));
}

.plan-change-status__head,
.plan-change-status__item-title,
.plan-change-status__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plan-change-status__head {
  align-items: flex-start;
}

.plan-change-status__head h2 {
  margin: 0;
  color: var(--user-text, var(--app-text));
  font-size: 15px;
  letter-spacing: 0;
}

.plan-change-status__head p {
  max-width: 72ch;
  margin: 5px 0 0;
  color: var(--user-text-secondary, var(--app-text-muted));
  font-size: 12px;
  line-height: 1.55;
}

.plan-change-status__list {
  display: grid;
  gap: 8px;
}

.plan-change-status__item {
  padding: 10px 12px;
  border: 1px solid var(--user-border, var(--app-border));
  border-radius: 8px;
  background: transparent;
}

.plan-change-status__item.is-applied {
  border-color: rgba(34, 197, 94, 0.42);
}

.plan-change-status__item.is-apply_failed,
.plan-change-status__item.is-stale {
  border-color: rgba(245, 158, 11, 0.48);
}

.plan-change-status__item-title {
  justify-content: flex-start;
}

.plan-change-status__item strong {
  color: var(--user-text, var(--app-text));
  font-size: 13px;
}

.plan-change-status__item p,
.plan-change-status__item small {
  display: block;
  color: var(--user-text-secondary, var(--app-text-muted));
  line-height: 1.5;
}

.plan-change-status__item p {
  margin: 5px 0 0;
  font-size: 12px;
}

.plan-change-status__item small {
  margin-top: 4px;
  font-size: 11px;
}

.plan-change-status__loading {
  min-height: 40px;
  color: var(--user-text-secondary, var(--app-text-muted));
  font-size: 12px;
}

@media (max-width: 640px) {
  .plan-change-status__head {
    align-items: stretch;
    flex-direction: column;
  }

  .plan-change-status__actions {
    justify-content: flex-start;
  }
}
</style>
