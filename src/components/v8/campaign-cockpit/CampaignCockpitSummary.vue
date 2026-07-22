<template>
  <section class="cockpit-summary" aria-labelledby="cockpit-summary-title">
    <div class="cockpit-summary__intro">
      <div>
        <span class="summary-kicker">周期驾驶舱</span>
        <h1 id="cockpit-summary-title">{{ campaign?.name || `求职周期 #${campaign?.id || '--'}` }}</h1>
        <p>{{ campaign?.goal || '还没有填写周期目标。驾驶舱会先按已记录事实汇总。' }}</p>
      </div>
      <el-tag effect="plain" :type="status.type">{{ status.label }}</el-tag>
    </div>

    <div class="cockpit-summary__facts">
      <div>
        <span>活跃机会</span>
        <strong>{{ capacity.active }}/{{ capacity.maximum }}</strong>
      </div>
      <div>
        <span>本周投递</span>
        <strong>{{ capacity.applications }}/{{ capacity.target }}</strong>
      </div>
      <div>
        <span>剩余时间</span>
        <strong>{{ capacity.remaining }} 分钟</strong>
      </div>
      <div>
        <span>已逾期事项</span>
        <strong>{{ deadlines.overdue }}</strong>
      </div>
      <div>
        <span>未来 7 天</span>
        <strong>{{ deadlines.upcoming }}</strong>
      </div>
      <div>
        <span>数据截点</span>
        <strong>{{ cockpit?.dataCutoffAt || '待确认' }}</strong>
      </div>
    </div>

    <el-alert
      v-if="cockpit?.warnings?.length"
      type="warning"
      show-icon
      :closable="false"
      title="部分来源需要确认"
      :description="cockpit.warnings.join(' ')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { CampaignCockpitCampaign, CampaignCockpitVO } from '@/types/v8/campaign'

const props = defineProps<{
  campaign?: CampaignCockpitCampaign | null
  cockpit?: CampaignCockpitVO | null
}>()

const status = computed(() => {
  const values: Record<string, { label: string; type: 'success' | 'info' | 'warning' | 'danger' }> = {
    DRAFT: { label: '草稿', type: 'info' },
    ACTIVE: { label: '进行中', type: 'success' },
    PAUSED: { label: '已暂停', type: 'warning' },
    COMPLETED: { label: '已完成', type: 'info' },
    ARCHIVED: { label: '已归档', type: 'info' }
  }
  return values[String(props.campaign?.status || '').toUpperCase()] || values.DRAFT
})

const capacity = computed(() => ({
  active: props.cockpit?.capacitySummary?.activeOpportunityCount ?? props.campaign?.activeApplicationCount ?? '--',
  maximum: props.cockpit?.capacitySummary?.maxActiveOpportunities ?? props.cockpit?.operatingProfile?.maxActiveOpportunities ?? '--',
  applications: props.cockpit?.capacitySummary?.weeklyApplications ?? '--',
  target: props.cockpit?.capacitySummary?.weeklyApplicationTarget ?? props.cockpit?.operatingProfile?.weeklyApplicationTarget ?? '--',
  remaining: props.cockpit?.capacitySummary?.remainingMinutes ?? '--'
}))

const deadlines = computed(() => ({
  overdue: props.cockpit?.deadlineSummary?.overdueCount ?? 0,
  upcoming: (props.cockpit?.deadlineSummary?.dueTodayCount ?? 0)
    + (props.cockpit?.deadlineSummary?.dueWithinSevenDaysCount ?? 0)
}))
</script>

<style scoped lang="scss">
.cockpit-summary {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface, #151c27);
}

.cockpit-summary__intro,
.cockpit-summary__facts {
  display: flex;
  gap: 18px;
}

.cockpit-summary__intro {
  align-items: flex-start;
  justify-content: space-between;
}

.summary-kicker {
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
}

.cockpit-summary h1 {
  margin: 5px 0 0;
  color: var(--app-text);
  font-size: 26px;
  line-height: 1.2;
  text-wrap: balance;
}

.cockpit-summary p {
  max-width: 70ch;
  margin: 8px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.cockpit-summary__facts {
  flex-wrap: wrap;
  border-top: 1px solid var(--app-border);
  padding-top: 16px;
}

.cockpit-summary__facts > div {
  display: grid;
  gap: 4px;
  min-width: 140px;
}

.cockpit-summary__facts span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.cockpit-summary__facts strong {
  color: var(--app-text);
  font-size: 18px;
}

@media (max-width: 680px) {
  .cockpit-summary__intro {
    flex-direction: column;
  }

  .cockpit-summary h1 {
    font-size: 22px;
  }
}
</style>
