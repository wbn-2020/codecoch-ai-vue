<template>
  <section class="cockpit-section action-queue" aria-labelledby="campaign-action-queue-title">
    <header class="cockpit-section__header">
      <div>
        <span class="section-kicker">行动队列</span>
        <h2 id="campaign-action-queue-title">当前最值得处理的周期行动</h2>
        <p>忽略只针对当前事实版本；来源变化后，行动可以重新出现。</p>
      </div>
      <el-tag effect="plain">{{ openActions.length }} 项待处理</el-tag>
    </header>

    <el-alert
      v-if="error"
      type="warning"
      show-icon
      :closable="false"
      title="行动队列暂时不可用"
      :description="error"
    />
    <AppState
      v-else-if="!loading && !sortedActions.length"
      type="empty"
      title="当前没有待处理行动"
      description="已有周期事实会继续被观察，新的截止事项或跟进风险出现后会重新进入队列。"
    />
    <div v-else v-loading="loading" class="action-list">
      <article v-for="action in sortedActions" :key="action.semanticKey" class="action-row">
        <div class="action-row__main">
          <div class="action-row__title">
            <strong>{{ action.title }}</strong>
            <el-tag size="small" effect="plain" :type="priorityType(action.priority)">
              {{ action.priority || '待确认' }}
            </el-tag>
          </div>
          <span>{{ actionTypeLabel(action.actionType) }} · {{ action.dueAt || '无明确截止' }}</span>
          <p>{{ action.description || '暂无行动说明。' }}</p>
          <small v-if="action.priorityReasons?.length">{{ action.priorityReasons.join('；') }}</small>
          <small v-if="action.fallback || action.confidenceLevel === 'LOW'">该行动的来源或置信度有限，请先核对事实。</small>
        </div>
        <div class="action-row__actions">
          <el-button v-if="action.actionUrl" link type="primary" @click="emit('open', action)">
            查看机会
          </el-button>
          <el-button
            v-if="isOpen(action)"
            link
            type="warning"
            :disabled="disabled"
            @click="emit('decide', { action, status: 'SNOOZED' })"
          >
            稍后处理
          </el-button>
          <el-button
            v-if="isOpen(action)"
            link
            type="info"
            :disabled="disabled"
            @click="emit('decide', { action, status: 'DISMISSED' })"
          >
            忽略当前事实
          </el-button>
          <el-button
            v-else
            link
            type="primary"
            :disabled="disabled"
            @click="emit('decide', { action, status: 'REOPENED' })"
          >
            恢复
          </el-button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import AppState from '@/components/common/AppState.vue'
import {
  campaignActionPriorityType,
  campaignActionTypeLabel,
  isCampaignActionOpen,
  sortCampaignActions
} from '@/features/campaign-cockpit/action-decisions'
import type { CampaignActionDecision, CampaignActionDecisionStatus } from '@/types/v8/campaign'

const props = withDefaults(defineProps<{
  actions?: CampaignActionDecision[]
  loading?: boolean
  disabled?: boolean
  error?: string
}>(), {
  actions: () => [],
  loading: false,
  disabled: false,
  error: ''
})

const emit = defineEmits<{
  decide: [value: { action: CampaignActionDecision; status: CampaignActionDecisionStatus }]
  open: [action: CampaignActionDecision]
}>()

const sortedActions = computed(() => sortCampaignActions(props.actions))
const openActions = computed(() => sortedActions.value.filter(isCampaignActionOpen))
const actionTypeLabel = campaignActionTypeLabel
const priorityType = campaignActionPriorityType
const isOpen = isCampaignActionOpen
</script>

<style scoped lang="scss">
.cockpit-section {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.cockpit-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cockpit-section__header h2 {
  margin: 4px 0 0;
  color: var(--app-text);
  font-size: 18px;
}

.cockpit-section__header p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.section-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.action-list {
  display: grid;
  gap: 10px;
}

.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 0;
  border-top: 1px solid var(--app-border);
}

.action-row__main {
  min-width: 0;
}

.action-row__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.action-row__title strong {
  color: var(--app-text);
}

.action-row__main > span,
.action-row__main small {
  display: block;
  margin-top: 5px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.action-row__main p {
  margin: 7px 0 0;
  color: var(--app-text);
  line-height: 1.55;
}

.action-row__actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

@media (max-width: 760px) {
  .cockpit-section__header,
  .action-row {
    flex-direction: column;
  }

  .action-row__actions {
    justify-content: flex-start;
  }
}
</style>
