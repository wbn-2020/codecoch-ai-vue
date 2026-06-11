<template>
  <div class="page-shell admin-console-page analytics-admin-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Activity :size="16" />
          <span>生成效果</span>
        </div>
        <h1 class="admin-hero__title">生成效果分析</h1>
        <p class="admin-hero__desc">围绕智能教练生成成功率、任务完成率和任务结构做运营观测。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="生成效果分析加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <AppState
        v-if="partialErrors.length"
        class="admin-diagnostic-state"
        type="disabled"
        title="部分生成效果数据未返回"
        :description="partialErrorDescription"
      >
        <div class="diagnostic-actions">
          <el-button type="primary" @click="loadPage">重新加载</el-button>
          <el-button @click="$router.push('/admin/agent/runs')">查看运行记录</el-button>
          <el-button @click="$router.push('/admin/agent/tasks')">查看任务明细</el-button>
        </div>
      </AppState>

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
            <p>按计划日期统计智能教练生成、成功与失败次数。</p>
          </div>
          <el-tag type="success" effect="plain">生成运行记录</el-tag>
        </div>
        <AppState
          v-if="!trend.length && !loading"
          class="admin-empty-wrap"
          :type="agentTrendEmptyType"
          :title="agentTrendEmptyTitle"
          :description="agentTrendEmptyDescription"
        >
          <div class="diagnostic-actions">
            <el-button type="primary" @click="loadPage">刷新趋势</el-button>
            <el-button @click="$router.push('/admin/agent/runs')">查看运行记录</el-button>
          </div>
        </AppState>
        <div v-else ref="trendChartRef" class="analytics-chart"></div>
      </section>

      <div class="admin-dashboard-grid analytics-lower-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>任务类型分布</h2>
              <p>观察智能教练推荐任务结构是否均衡。</p>
            </div>
          </div>
          <div v-if="taskStats.taskTypeDistribution.length" ref="typeChartRef" class="analytics-chart analytics-chart--small"></div>
          <AppState
            v-else-if="!loading"
            class="admin-empty-wrap"
            :type="taskStatsEmptyType"
            :title="taskTypeEmptyTitle"
            :description="taskTypeEmptyDescription"
          >
            <div class="diagnostic-actions">
              <el-button type="primary" @click="$router.push('/admin/agent/tasks')">查看任务明细</el-button>
              <el-button @click="loadPage">重新加载</el-button>
            </div>
          </AppState>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>优先级分布</h2>
              <p>观察高/中/低优先级任务比例。</p>
            </div>
          </div>
          <div v-if="taskStats.priorityDistribution.length" ref="priorityChartRef" class="analytics-chart analytics-chart--small"></div>
          <AppState
            v-else-if="!loading"
            class="admin-empty-wrap"
            :type="taskStatsEmptyType"
            :title="priorityEmptyTitle"
            :description="priorityEmptyDescription"
          >
            <div class="diagnostic-actions">
              <el-button type="primary" @click="$router.push('/admin/agent/tasks')">查看任务明细</el-button>
              <el-button @click="loadPage">重新加载</el-button>
            </div>
          </AppState>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getAdminAgentOverviewApi, getAdminAgentTasksApi, getAdminAgentTrendApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { AdminAgentOverviewVO, AdminAgentTaskStatsVO, MetricPointVO, TrendPointVO } from '@/types/analytics'
import type { ECharts, EChartsOption } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const rangeDays = ref(7)
const overview = ref<AdminAgentOverviewVO>()

const createEmptyTaskStats = (): AdminAgentTaskStatsVO => ({
  totalAgentTasks: 0,
  doneTaskCount: 0,
  skippedTaskCount: 0,
  taskCompletionRate: 0,
  taskTypeDistribution: [],
  priorityDistribution: []
})

const taskStats = ref<AdminAgentTaskStatsVO>(createEmptyTaskStats())
const trend = ref<TrendPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
const typeChartRef = ref<HTMLElement>()
const priorityChartRef = ref<HTMLElement>()
let charts: ECharts[] = []
let agentAnalyticsMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'runs', label: '运行次数', value: overview.value?.totalAgentRuns || 0, hint: `成功 ${overview.value?.successAgentRuns || 0} / 失败 ${overview.value?.failedAgentRuns || 0}` },
  { key: 'success', label: '运行成功率', value: `${overview.value?.agentSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgDurationMs || 0}ms` },
  { key: 'tasks', label: '任务总数', value: overview.value?.totalAgentTasks || 0, hint: `完成 ${overview.value?.doneTaskCount || 0} / 跳过 ${overview.value?.skippedTaskCount || 0}` },
  { key: 'completion', label: '任务完成率', value: `${overview.value?.taskCompletionRate || 0}%`, hint: '已完成 / 任务总数' }
])

const partialErrorDescription = computed(() =>
  `以下数据源暂未返回：${partialErrors.value.join('、')}。页面保留已加载数据，建议重新加载或进入运行/任务明细排查。`
)

const hasAgentRunSignal = computed(() => Boolean(
  (overview.value?.totalAgentRuns || 0) ||
  (overview.value?.successAgentRuns || 0) ||
  (overview.value?.failedAgentRuns || 0)
))

const hasAgentTaskSignal = computed(() => Boolean(
  (overview.value?.totalAgentTasks || 0) ||
  (taskStats.value.totalAgentTasks || 0) ||
  taskStats.value.taskTypeDistribution.length ||
  taskStats.value.priorityDistribution.length
))

const trendSourceFailed = computed(() => partialErrors.value.includes('运行趋势'))
const taskStatsSourceFailed = computed(() => partialErrors.value.includes('任务统计'))

const agentTrendEmptyTitle = computed(() =>
  trendSourceFailed.value ? '运行趋势加载失败' : '暂无运行趋势'
)

const agentTrendEmptyType = computed(() => trendSourceFailed.value ? 'error' : 'empty')

const agentTrendEmptyDescription = computed(() => {
  if (trendSourceFailed.value) {
    return '运行趋势数据暂未返回，统计卡片可能仍可用；可以重新加载，或进入生成运行记录按时间排查。'
  }
  if (hasAgentRunSignal.value) {
    return `近 ${rangeDays.value} 天没有形成趋势点，但概览中已有运行记录；建议查看运行记录确认计划日期或统计聚合是否正常。`
  }
  return `近 ${rangeDays.value} 天暂无生成运行记录。用户生成今日计划后，这里会出现运行、成功和失败趋势。`
})

const taskStatsEmptyType = computed(() => taskStatsSourceFailed.value ? 'error' : 'empty')
const taskTypeEmptyTitle = computed(() =>
  taskStatsSourceFailed.value ? '任务类型分布加载失败' : '暂无任务类型分布'
)
const priorityEmptyTitle = computed(() =>
  taskStatsSourceFailed.value ? '优先级分布加载失败' : '暂无优先级分布'
)

const taskTypeEmptyDescription = computed(() => {
  if (taskStatsSourceFailed.value) {
    return '任务统计数据暂未返回，当前无法判断是无任务还是加载失败；请重新加载或进入任务明细查看。'
  }
  return hasAgentTaskSignal.value
    ? '已有智能任务概览，但缺少任务类型分布；建议检查任务类型字段是否写入或统计聚合是否完成。'
    : '暂无智能任务。生成今日计划并保存任务后，这里会展示推荐任务结构。'
})

const priorityEmptyDescription = computed(() => {
  if (taskStatsSourceFailed.value) {
    return '任务统计数据暂未返回，当前无法判断优先级分布；请重新加载或进入任务明细查看。'
  }
  return hasAgentTaskSignal.value
    ? '已有智能任务概览，但缺少优先级分布；建议检查任务优先级字段或聚合任务输出。'
    : '暂无智能任务。生成今日计划并保存任务后，这里会展示高、中、低优先级比例。'
})

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

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const pieOption = (title: string, data: MetricPointVO[]): EChartsOption => ({
  color: ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee'],
  tooltip: { trigger: 'item' },
  legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
  series: [{ name: title, type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'], data: data.map((item) => ({ name: item.name, value: item.value })) }]
})

const renderCharts = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  disposeCharts()
  if (!agentAnalyticsMounted) return
  const hasChartData = Boolean(
    (trendChartRef.value && trend.value.length) ||
    (typeChartRef.value && taskStats.value.taskTypeDistribution.length) ||
    (priorityChartRef.value && taskStats.value.priorityDistribution.length)
  )
  if (!hasChartData) return
  const echarts = await loadEcharts()
  if (!agentAnalyticsMounted || renderSeq !== chartRenderSeq) {
    return
  }
  if (trendChartRef.value && trend.value.length) {
    const chart = echarts.default.init(trendChartRef.value)
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
    const chart = echarts.default.init(typeChartRef.value)
    chart.setOption(pieOption('任务类型', taskStats.value.taskTypeDistribution))
    charts.push(chart)
  }
  if (priorityChartRef.value && taskStats.value.priorityDistribution.length) {
    const chart = echarts.default.init(priorityChartRef.value)
    chart.setOption(pieOption('优先级', taskStats.value.priorityDistribution))
    charts.push(chart)
  }
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  try {
    const params = { days: rangeDays.value }
    const [overviewResult, trendResult, taskResult] = await Promise.allSettled([
      getAdminAgentOverviewApi(params),
      getAdminAgentTrendApi(params),
      getAdminAgentTasksApi(params)
    ])
    const results = [
      { label: '运行概览', result: overviewResult },
      { label: '运行趋势', result: trendResult },
      { label: '任务统计', result: taskResult }
    ]
    const failed = results.filter((item) => item.result.status === 'rejected')
    if (failed.length === results.length) {
      overview.value = undefined
      trend.value = []
      taskStats.value = createEmptyTaskStats()
      disposeCharts()
      errorMessage.value = getErrorMessage((failed[0].result as PromiseRejectedResult).reason)
      return
    }
    partialErrors.value = failed.map((item) => item.label)
    overview.value = overviewResult.status === 'fulfilled' ? overviewResult.value : undefined
    trend.value = trendResult.status === 'fulfilled' ? trendResult.value : []
    taskStats.value = taskResult.status === 'fulfilled' ? taskResult.value : createEmptyTaskStats()
    await renderCharts()
  } finally {
    loading.value = false
  }
}

const resizeCharts = () => charts.forEach((chart) => chart.resize())

onMounted(async () => {
  agentAnalyticsMounted = true
  window.addEventListener('resize', resizeCharts)
  await loadPage()
})

onBeforeUnmount(() => {
  agentAnalyticsMounted = false
  chartRenderSeq += 1
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

.admin-empty-wrap {
  padding: 24px 0;
}

.admin-diagnostic-state {
  margin-bottom: 18px;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

@media (max-width: 900px) {
  .analytics-lower-grid {
    grid-template-columns: 1fr;
  }
}
</style>
