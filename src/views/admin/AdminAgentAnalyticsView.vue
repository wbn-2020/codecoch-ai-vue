<template>
  <div class="page-shell admin-console-page analytics-admin-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>Agent 分析</span>
        </div>
        <h1 class="admin-hero__title">Agent 效果分析</h1>
        <p class="admin-hero__desc">围绕 Agent 运行成功率、任务生成、完成率和任务结构做基础 BI 观测。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="Agent 分析加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <div class="admin-insight-grid" v-loading="loading">
        <article v-for="item in metrics" :key="item.key" class="admin-insight-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <section class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <h2>运行趋势</h2>
            <p>按计划日期统计 Agent 运行、成功与失败次数。</p>
          </div>
          <el-tag type="success" effect="plain">agent_run</el-tag>
        </div>
        <div v-if="!trend.length && !loading" class="admin-empty-wrap"><el-empty description="暂无运行趋势数据" /></div>
        <div v-else ref="trendChartRef" class="analytics-chart"></div>
      </section>

      <div class="admin-dashboard-grid analytics-lower-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>任务类型分布</h2>
              <p>观察 Agent 推荐任务结构是否均衡。</p>
            </div>
          </div>
          <div ref="typeChartRef" class="analytics-chart analytics-chart--small"></div>
          <el-empty v-if="!taskStats.taskTypeDistribution.length && !loading" description="暂无任务类型数据" />
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>优先级分布</h2>
              <p>观察高/中/低优先级任务比例。</p>
            </div>
          </div>
          <div ref="priorityChartRef" class="analytics-chart analytics-chart--small"></div>
          <el-empty v-if="!taskStats.priorityDistribution.length && !loading" description="暂无优先级数据" />
        </section>
      </div>

      <div class="admin-dashboard-grid analytics-lower-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>反馈概览</h2>
              <p>统计 Agent 反馈总量、有用反馈、负向反馈与采纳表现。</p>
            </div>
            <el-tag effect="plain">agent feedback</el-tag>
          </div>
          <div v-if="feedbackErrorMessage" class="admin-empty-wrap">
            <AppState type="disabled" title="反馈统计暂时不可用" :description="feedbackErrorMessage" />
          </div>
          <template v-else>
            <div v-if="hasFeedbackData" class="feedback-grid">
              <article v-for="item in feedbackMetrics" :key="item.key" class="feedback-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </article>
            </div>
            <el-empty v-else-if="!loading" description="暂无反馈统计数据" />
          </template>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>反馈类型分布</h2>
              <p>按反馈类型观察推荐结果的主要问题与正向信号。</p>
            </div>
          </div>
          <div v-if="feedbackErrorMessage" class="admin-empty-wrap">
            <el-empty description="反馈类型分布暂不可用" />
          </div>
          <template v-else>
            <div ref="feedbackChartRef" class="analytics-chart analytics-chart--small"></div>
            <el-empty v-if="!feedbackTypeDistribution.length && !loading" description="暂无反馈类型数据" />
          </template>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getAdminAgentFeedbackApi, getAdminAgentOverviewApi, getAdminAgentTasksApi, getAdminAgentTrendApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { AdminAgentOverviewVO, AdminAgentTaskStatsVO, AgentFeedbackStatsVO, MetricPointVO, TrendPointVO } from '@/types/analytics'
import { translateFeedbackType } from '@/utils/adminDisplay'
import echarts, { type ECharts, type EChartsOption } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const errorMessage = ref('')
const feedbackErrorMessage = ref('')
const rangeDays = ref(7)
const overview = ref<AdminAgentOverviewVO>()
const taskStats = ref<AdminAgentTaskStatsVO>({
  totalAgentTasks: 0,
  doneTaskCount: 0,
  skippedTaskCount: 0,
  taskCompletionRate: 0,
  taskTypeDistribution: [],
  priorityDistribution: []
})
const feedbackStats = ref<AgentFeedbackStatsVO>({
  totalFeedbackCount: 0,
  adoptedCount: 0,
  ignoredCount: 0,
  likedCount: 0,
  dislikedCount: 0,
  adoptionRate: 0,
  typeDistribution: []
})
const trend = ref<TrendPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
const typeChartRef = ref<HTMLElement>()
const priorityChartRef = ref<HTMLElement>()
const feedbackChartRef = ref<HTMLElement>()
let charts: ECharts[] = []

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'runs', label: '运行次数', value: overview.value?.totalAgentRuns || 0, hint: `成功 ${overview.value?.successAgentRuns || 0} / 失败 ${overview.value?.failedAgentRuns || 0}` },
  { key: 'success', label: '运行成功率', value: `${overview.value?.agentSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgDurationMs || 0}ms` },
  { key: 'tasks', label: '任务总数', value: overview.value?.totalAgentTasks || 0, hint: `完成 ${overview.value?.doneTaskCount || 0} / 跳过 ${overview.value?.skippedTaskCount || 0}` },
  { key: 'completion', label: '任务完成率', value: `${overview.value?.taskCompletionRate || 0}%`, hint: 'DONE / total agent_task' }
])

const feedbackTypeDistribution = computed<MetricPointVO[]>(() =>
  (feedbackStats.value.typeDistribution || []).map((item) => ({
    name: item.feedbackType || 'UNKNOWN',
    value: Number(item.count || 0)
  }))
)

const hasFeedbackData = computed(() => (feedbackStats.value.totalFeedbackCount || 0) > 0)

const formatRateLabel = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return '--'
  return `${value}%`
}

const helpfulRate = computed(() => {
  const total = Number(feedbackStats.value.totalFeedbackCount || 0)
  if (!total) return null
  return Number((((feedbackStats.value.likedCount || 0) / total) * 100).toFixed(1))
})

const helpfulRateLabel = computed(() => formatRateLabel(helpfulRate.value))

const negativeFeedbackCount = computed(() => {
  const distribution = feedbackStats.value.typeDistribution || []
  if (distribution.length) {
    return distribution.reduce((sum, item) => {
      const type = String(item.feedbackType || '').toUpperCase()
      return sum + (type === 'HELPFUL' ? 0 : Number(item.count || 0))
    }, 0)
  }
  return Math.max(0, Number(feedbackStats.value.totalFeedbackCount || 0) - Number(feedbackStats.value.likedCount || 0))
})

const negativeRate = computed(() => {
  const total = Number(feedbackStats.value.totalFeedbackCount || 0)
  if (!total) return null
  return Number(((negativeFeedbackCount.value / total) * 100).toFixed(1))
})

const negativeRateLabel = computed(() => formatRateLabel(negativeRate.value))

const adoptionRateLabel = computed(() => formatRateLabel(feedbackStats.value.adoptionRate))

const feedbackMetrics = computed(() => [
  {
    key: 'total',
    label: '反馈总数',
    value: feedbackStats.value.totalFeedbackCount || 0,
    hint: `反馈周期：近 ${rangeDays.value} 天`
  },
  {
    key: 'helpful',
    label: '有用反馈数',
    value: feedbackStats.value.likedCount || 0,
    hint: `有用率 ${helpfulRateLabel.value}`
  },
  {
    key: 'negative',
    label: '负向反馈数',
    value: negativeFeedbackCount.value,
    hint: `占比 ${negativeRateLabel.value}`
  },
  {
    key: 'adoption',
    label: '采纳率',
    value: adoptionRateLabel.value,
    hint: `已采纳 ${feedbackStats.value.adoptedCount || 0}`
  }
])

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const disposeCharts = () => {
  charts.forEach((chart) => chart.dispose())
  charts = []
}

const pieOption = (title: string, data: MetricPointVO[]): EChartsOption => ({
  color: ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee'],
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
  series: [{ name: title, type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'], data: data.map((item) => ({ name: item.name, value: item.value })) }]
})

const renderCharts = async () => {
  await nextTick()
  disposeCharts()
  if (trendChartRef.value && trend.value.length) {
    const chart = echarts.init(trendChartRef.value)
    chart.setOption({
      color: ['#60a5fa', '#34d399', '#f87171'],
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 8, textStyle: { color: '#94a3b8' } },
      grid: { left: 12, right: 16, top: 38, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: trend.value.map((item) => item.date), axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.14)' } }, axisLabel: { color: '#94a3b8' } },
      series: [
        { name: '运行', type: 'line', smooth: true, data: trend.value.map((item) => item.runCount || 0) },
        { name: '成功', type: 'line', smooth: true, data: trend.value.map((item) => item.successRunCount || 0) },
        { name: '失败', type: 'line', smooth: true, data: trend.value.map((item) => item.failedRunCount || 0) }
      ]
    })
    charts.push(chart)
  }
  if (typeChartRef.value && taskStats.value.taskTypeDistribution.length) {
    const chart = echarts.init(typeChartRef.value)
    chart.setOption(pieOption('任务类型', taskStats.value.taskTypeDistribution))
    charts.push(chart)
  }
  if (priorityChartRef.value && taskStats.value.priorityDistribution.length) {
    const chart = echarts.init(priorityChartRef.value)
    chart.setOption(pieOption('优先级', taskStats.value.priorityDistribution))
    charts.push(chart)
  }
  if (feedbackChartRef.value && feedbackTypeDistribution.value.length) {
    const chart = echarts.init(feedbackChartRef.value)
    chart.setOption(
      pieOption(
        '反馈类型',
        feedbackTypeDistribution.value.map((item) => ({
          name: translateFeedbackType(item.name),
          value: item.value
        }))
      )
    )
    charts.push(chart)
  }
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  feedbackErrorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewData, trendData, taskData] = await Promise.all([
      getAdminAgentOverviewApi(params),
      getAdminAgentTrendApi(params),
      getAdminAgentTasksApi(params)
    ])
    overview.value = overviewData
    trend.value = trendData
    taskStats.value = taskData
  } catch (error) {
    overview.value = undefined
    trend.value = []
    taskStats.value = {
      totalAgentTasks: 0,
      doneTaskCount: 0,
      skippedTaskCount: 0,
      taskCompletionRate: 0,
      taskTypeDistribution: [],
      priorityDistribution: []
    }
    errorMessage.value = getErrorMessage(error)
  }

  try {
    feedbackStats.value = await getAdminAgentFeedbackApi({ days: rangeDays.value })
  } catch (error) {
    feedbackStats.value = {
      totalFeedbackCount: 0,
      adoptedCount: 0,
      ignoredCount: 0,
      likedCount: 0,
      dislikedCount: 0,
      adoptionRate: 0,
      typeDistribution: []
    }
    feedbackErrorMessage.value = getErrorMessage(error)
  } finally {
    await renderCharts()
    loading.value = false
  }
}

const resizeCharts = () => charts.forEach((chart) => chart.resize())

onMounted(async () => {
  await loadPage()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped lang="scss">
.analytics-chart {
  width: 100%;
  height: 320px;
  padding: 0 20px 20px;
}

.analytics-chart--small {
  height: 280px;
}

.analytics-lower-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px 20px 20px;
}

.feedback-card {
  display: grid;
  gap: 6px;
  min-height: 108px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.feedback-card span,
.feedback-card small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.feedback-card strong {
  font-size: 22px;
}

.admin-empty-wrap {
  padding: 24px 0;
}

@media (max-width: 900px) {
  .analytics-lower-grid {
    grid-template-columns: 1fr;
  }

  .feedback-grid {
    grid-template-columns: 1fr;
  }
}
</style>
