<template>
  <section class="cockpit-section pulse-section" aria-labelledby="campaign-pulse-title">
    <header class="cockpit-section__header">
      <div>
        <span class="section-kicker">周期脉搏</span>
        <h2 id="campaign-pulse-title">变化、漂移与限制</h2>
        <p>脉搏只对比已记录事实和你的周期配置，不把结果缺失解释成策略失败。</p>
      </div>
      <div class="pulse-actions">
        <el-tag effect="plain" :type="confidence.type">{{ confidence.label }}</el-tag>
        <el-button type="primary" :loading="loading" :disabled="disabled" @click="emit('refresh')">
          生成最新脉搏
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="error"
      type="warning"
      show-icon
      :closable="false"
      title="周期脉搏暂时不可用"
      :description="error"
    />
    <template v-else>
      <el-alert
        v-if="pulse?.fallback"
        type="warning"
        show-icon
        :closable="false"
        title="本次脉搏使用规则降级结果"
        description="当前只展示已记录事实和规则信号，不生成因果结论。"
      />
      <div v-if="pulse" class="pulse-summary">
        <strong>{{ pulse.summary || '当前还没有周期脉搏摘要。' }}</strong>
        <span v-if="pulse.dataCutoffAt">数据截点：{{ pulse.dataCutoffAt }}</span>
      </div>
      <div class="pulse-columns">
        <div>
          <h3>已确认事实</h3>
          <ul><li v-for="item in pulse?.facts || []" :key="`fact-${item}`">{{ item }}</li></ul>
          <p v-if="!pulse?.facts?.length" class="muted">暂无新增事实。</p>
        </div>
        <div>
          <h3>变化与漂移</h3>
          <ul>
            <li v-for="item in [...(pulse?.changes || []), ...(pulse?.driftReasons || [])]" :key="`change-${item}`">
              {{ item }}
            </li>
          </ul>
          <p v-if="!pulse?.changes?.length && !pulse?.driftReasons?.length" class="muted">暂无可解释的变化。</p>
        </div>
        <div>
          <h3>限制</h3>
          <ul><li v-for="item in pulse?.limits || []" :key="`limit-${item}`">{{ item }}</li></ul>
          <p v-if="!pulse?.limits?.length" class="muted">当前没有额外限制。</p>
        </div>
      </div>
      <details v-if="history.length" class="pulse-history">
        <summary>历史快照（{{ history.length }}）</summary>
        <button
          v-for="item in history"
          :key="`${item.snapshotId || item.snapshotVersion}-${item.dataCutoffAt}`"
          type="button"
          class="pulse-history__row"
          @click="emit('select-history', item)"
        >
          <span>第 {{ item.snapshotVersion || '--' }} 版</span>
          <span>{{ item.dataCutoffAt || '截点待确认' }}</span>
          <span>{{ item.summary || '无摘要' }}</span>
        </button>
      </details>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { CampaignPulseSnapshot, CampaignPulseSummary } from '@/types/v8/campaign'

const props = withDefaults(defineProps<{
  pulse?: CampaignPulseSummary | null
  history?: CampaignPulseSnapshot[]
  loading?: boolean
  disabled?: boolean
  error?: string
}>(), {
  pulse: null,
  history: () => [],
  loading: false,
  disabled: false,
  error: ''
})

const emit = defineEmits<{
  refresh: []
  'select-history': [value: CampaignPulseSnapshot]
}>()

const confidence = computed(() => {
  const value = String(props.pulse?.confidenceLevel || '').toUpperCase()
  if (value === 'HIGH') return { label: '高置信度', type: 'success' as const }
  if (value === 'MEDIUM') return { label: '中置信度', type: 'warning' as const }
  if (value === 'LOW') return { label: '低置信度', type: 'danger' as const }
  return { label: '置信度待确认', type: 'info' as const }
})
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

.cockpit-section__header,
.pulse-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
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

.pulse-summary {
  display: grid;
  gap: 6px;
  padding-bottom: 4px;
}

.pulse-summary strong {
  color: var(--app-text);
  line-height: 1.6;
}

.pulse-summary span,
.muted {
  color: var(--app-text-muted);
  font-size: 12px;
}

.pulse-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.pulse-columns h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 14px;
}

.pulse-columns ul {
  margin: 8px 0 0;
  padding-left: 18px;
  color: var(--app-text);
  line-height: 1.6;
}

.pulse-columns .muted {
  margin: 8px 0 0;
}

.pulse-history {
  border-top: 1px solid var(--app-border);
  padding-top: 12px;
}

.pulse-history summary {
  cursor: pointer;
  color: var(--app-text);
  font-weight: 600;
}

.pulse-history__row {
  display: grid;
  grid-template-columns: 90px 160px minmax(0, 1fr);
  width: 100%;
  gap: 12px;
  margin-top: 8px;
  border: 0;
  border-bottom: 1px solid var(--app-border);
  padding: 9px 0;
  background: transparent;
  color: var(--app-text-muted);
  text-align: left;
}

@media (max-width: 760px) {
  .cockpit-section__header,
  .pulse-actions {
    flex-direction: column;
  }

  .pulse-columns {
    grid-template-columns: 1fr;
  }

  .pulse-history__row {
    grid-template-columns: 1fr;
    gap: 3px;
  }
}
</style>
