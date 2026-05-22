<template>
  <div class="page-shell analytics-page">
    <section class="analytics-hero">
      <div>
        <div class="analytics-eyebrow">
          <LineChart :size="16" />
          <span>V4 Analytics</span>
        </div>
        <h1>个人训练分析</h1>
        <p>汇总 JobCoachAgent 任务、完成率、训练耗时和重点技能分布，帮助你看清最近一段时间的准备节奏。</p>
      </div>
      <div class="analytics-actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="分析数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <section class="analytics-metric-grid" v-loading="loading">
        <article v-for="item in metrics" :key="item.key" class="analytics-metric-card">
          <div class="metric-icon" :class="item.tone">
            <component :is="item.icon" :size="18" />
          </div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Trend</p>
              <h2>任务完成趋势</h2>
              <span>按日期展示生成、完成、跳过和训练耗时</span>
            </div>
          </div>
          <div v-if="!trend.length && !loading" class="empty-inline">
            <el-empty description="暂无任务趋势数据" />
          </div>
          <div v-else ref="trendChartRef" class="analytics-chart"></div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Skills</p>
              <h2>重点训练技能</h2>
              <span>来自 Agent 任务关联技能 Top 分布</span>
            </div>
          </div>
          <div class="skill-bars">
            <div v-for="item in skillDistribution" :key="item.name" class="skill-bar-row">
              <span>{{ item.name }}</span>
              <div class="skill-bar-track"><i :style="{ width: barWidth(item.value) }"></i></div>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!skillDistribution.length && !loading" description="暂无技能分布数据" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Clock3, LineChart, RefreshCw, Sparkles, Target, Timer } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getPersonalAgentOverviewApi,
  getPersonalSkillDistributionApi,
  getPersonalTaskTrendApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { MetricPointVO, PersonalAgentOverviewVO, TrendPointVO } from '@/types/analytics'
import echarts, { type ECharts } from '@/utils/echarts'

const loading = ref(false)
const errorMessage = ref('')
const rangeDays = ref(7)
const overview = ref<PersonalAgentOverviewVO>()
const trend = ref<TrendPointVO[]>([])
const skillDistribution = ref<MetricPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 }
]

const metrics = computed(() => [
  { key: 'today', label: '今日任务', value: overview.value?.todayTaskCount || 0, hint: `完成 ${overview.value?.todayDoneCount || 0} / 跳过 ${overview.value?.todaySkippedCount || 0}`, icon: Target, tone: 'tone-blue' },
  { key: 'minutes', label: '今日预计耗时', value: `${overview.value?.todayEstimatedMinutes || 0}m`, hint: '来自今日 Agent 任务', icon: Timer, tone: 'tone-cyan' },
  { key: 'week', label: '近 7 天完成率', value: `${overview.value?.last7DaysCompletionRate || 0}%`, hint: `${overview.value?.last7DaysDoneCount || 0}/${overview.value?.last7DaysTaskCount || 0} 个任务`, icon: CheckCircle2, tone: 'tone-green' },
  { key: 'agent', label: 'Agent 成功率', value: `${overview.value?.agentSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgAgentDurationMs || 0}ms`, icon: Sparkles, tone: 'tone-violet' }
])

const maxSkillValue = computed(() => Math.max(...skillDistribution.value.map((item) => item.value || 0), 1))

const barWidth = (value?: number) => `${Math.max(6, ((value || 0) / maxSkillValue.value) * 100)}%`

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const renderTrendChart = async () => {
  await nextTick()
  disposeChart()
  if (!trendChartRef.value || !trend.value.length) return
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    color: ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 8, textStyle: { color: '#94a3b8' } },
    grid: { left: 12, right: 16, top: 38, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: trend.value.map((item) => item.date), axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.14)' } }, axisLabel: { color: '#94a3b8' } },
    series: [
      { name: '生成', type: 'line', smooth: true, data: trend.value.map((item) => item.generatedCount || 0) },
      { name: '完成', type: 'line', smooth: true, data: trend.value.map((item) => item.completedCount || 0) },
      { name: '跳过', type: 'line', smooth: true, data: trend.value.map((item) => item.skippedCount || 0) },
      { name: '完成耗时', type: 'bar', data: trend.value.map((item) => item.completedMinutes || 0) }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewData, trendData, skillData] = await Promise.all([
      getPersonalAgentOverviewApi(),
      getPersonalTaskTrendApi(params),
      getPersonalSkillDistributionApi(params)
    ])
    overview.value = overviewData
    trend.value = trendData
    skillDistribution.value = skillData
    await renderTrendChart()
  } catch (error) {
    overview.value = undefined
    trend.value = []
    skillDistribution.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const resizeChart = () => trendChart?.resize()

onMounted(async () => {
  await loadPage()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.analytics-hero,
.section-head,
.analytics-actions {
  display: flex;
  gap: 16px;
}

.analytics-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.analytics-eyebrow,
.analytics-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.analytics-eyebrow {
  color: #67e8f9;
  font-size: 13px;
  font-weight: 700;
}

.analytics-hero h1,
.section-head h2 {
  margin: 0;
}

.analytics-hero h1 {
  margin-top: 10px;
  font-size: 28px;
}

.analytics-hero p,
.section-head span {
  max-width: 720px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.analytics-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.analytics-metric-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 12px;
  border-radius: 10px;
}

.tone-blue { color: #93c5fd; background: rgba(59, 130, 246, 0.16); }
.tone-cyan { color: #67e8f9; background: rgba(6, 182, 212, 0.16); }
.tone-green { color: #86efac; background: rgba(34, 197, 94, 0.14); }
.tone-violet { color: #c4b5fd; background: rgba(139, 92, 246, 0.16); }

.analytics-metric-card span,
.analytics-metric-card small,
.section-kicker {
  color: var(--app-text-muted);
  font-size: 13px;
}

.analytics-metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 26px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  text-transform: uppercase;
}

.analytics-chart {
  width: 100%;
  height: 320px;
  margin-top: 16px;
}

.empty-inline {
  padding: 24px 0;
}

.skill-bars {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.skill-bar-row {
  display: grid;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr) 56px;
  align-items: center;
  gap: 12px;
}

.skill-bar-row span,
.skill-bar-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-bar-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
}

.skill-bar-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #22d3ee, #60a5fa);
}

@media (max-width: 900px) {
  .analytics-hero,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .analytics-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .analytics-metric-grid,
  .skill-bar-row {
    grid-template-columns: 1fr;
  }
}
</style>
