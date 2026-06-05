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
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getAdminAgentOverviewApi, getAdminAgentTasksApi, getAdminAgentTrendApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { AdminAgentOverviewVO, AdminAgentTaskStatsVO, MetricPointVO, TrendPointVO } from '@/types/analytics'
import echarts, { type ECharts, type EChartsOption } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const errorMessage = ref('')
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
const trend = ref<TrendPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
const typeChartRef = ref<HTMLElement>()
const priorityChartRef = ref<HTMLElement>()
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
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
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
    await renderCharts()
  } catch (error) {
    overview.value = undefined
    trend.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
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

.admin-empty-wrap {
  padding: 24px 0;
}

@media (max-width: 900px) {
  .analytics-lower-grid {
    grid-template-columns: 1fr;
  }
}
</style>
