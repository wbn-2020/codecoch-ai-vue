<template>
  <section class="weekly-panel facts-panel" data-testid="weekly-facts-panel">
    <header class="weekly-panel__header">
      <div>
        <h2>事实</h2>
        <p>只展示可核验的记录；样本不足时不推断原因或效果。</p>
      </div>
      <el-tag v-if="factOnly" effect="plain" type="info">仅展示事实</el-tag>
    </header>

    <div v-if="facts.length" class="fact-list">
      <article v-for="(fact, index) in facts" :key="fact.factId || index" class="fact-row">
        <div class="fact-row__main">
          <span>{{ factLabel(fact.label) }}</span>
          <strong>{{ formatWeeklyReportFactValue(fact) }}</strong>
        </div>
        <div class="fact-row__meta">
          <span v-if="fact.scope">范围：{{ getWeeklyReportScopeLabel(fact.scope) }}</span>
          <span v-if="fact.timeWindow">时间：{{ getWeeklyReportTimeWindowLabel(fact.timeWindow) }}</span>
        </div>
      </article>
    </div>
    <p v-else class="weekly-panel__empty">当前周期还没有可展示的事实记录。</p>
  </section>
</template>

<script setup lang="ts">
import {
  formatWeeklyReportFactValue,
  getWeeklyReportScopeLabel,
  getWeeklyReportTimeWindowLabel,
  getWeeklyReportUserText
} from '@/features/agent-weekly-report'
import type { WeeklyReportFact } from '@/types/agentWeeklyReport'

defineProps<{
  facts: WeeklyReportFact[]
  factOnly?: boolean
}>()

const factLabel = (value?: string) => getWeeklyReportUserText(value, '未命名事实')
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
.weekly-panel__empty {
  margin: 0;
}

.weekly-panel__header h2 {
  font-size: 18px;
}

.weekly-panel__header p,
.weekly-panel__empty {
  color: var(--app-text-muted);
  line-height: 1.6;
}

.weekly-panel__header p {
  max-width: 72ch;
  margin-top: 6px;
  font-size: 13px;
}

.fact-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  margin-top: 16px;
  border-top: 1px solid var(--app-border);
}

.fact-row {
  min-width: 0;
  padding: 14px 16px 14px 0;
  border-bottom: 1px solid var(--app-border);
}

.fact-row__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.fact-row__main span {
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.fact-row__main strong {
  max-width: 52%;
  font-size: 18px;
  line-height: 1.35;
  text-align: right;
  overflow-wrap: anywhere;
}

.fact-row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 9px;
  color: var(--app-text-muted);
  font-size: 11px;
  line-height: 1.5;
}

details {
  margin-top: 8px;
  color: var(--app-text-muted);
  font-size: 11px;
}

summary {
  cursor: pointer;
}

details p {
  margin: 6px 0 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.weekly-panel__empty {
  margin-top: 16px;
}

@media (max-width: 760px) {
  .weekly-panel {
    padding: 16px;
  }

  .fact-list {
    grid-template-columns: 1fr;
  }

  .fact-row {
    padding-right: 0;
  }
}
</style>
