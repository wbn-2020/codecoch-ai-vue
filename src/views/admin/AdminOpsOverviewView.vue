<template>
  <div class="page-shell admin-console-page ops-page">
    <section class="admin-hero ops-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Monitor :size="16" />
          <span>运维观测中心</span>
        </div>
        <h1 class="admin-hero__title">运维监控</h1>
        <p class="admin-hero__desc">
          聚合 AI 调用、Agent 运行、系统状态和失败分布。已接入服务健康探测；QPS、TPS、CPU、内存和缓存命中率等待后端指标采集后自动替换。
        </p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="运维数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <section class="ops-card-grid" v-loading="loading">
        <article v-for="group in metricGroups" :key="group.key" class="ops-card">
          <div class="ops-card__head">
            <span class="ops-card__icon" :class="group.tone">
              <component :is="group.icon" :size="22" />
            </span>
            <div>
              <h2>{{ group.title }}</h2>
              <p>{{ group.subtitle }}</p>
            </div>
          </div>
          <div class="ops-mini-grid">
            <div v-for="metric in group.metrics" :key="metric.label" class="ops-mini">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.hint }}</small>
            </div>
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel ops-panel--wide">
          <div class="ops-panel__head">
            <div>
              <h2>QPS / RPM / TPM 趋势</h2>
              <p>按天聚合 AI 调用、失败和 Agent 运行数据</p>
            </div>
            <el-tag effect="plain">近 {{ rangeDays }} 天</el-tag>
          </div>
          <div ref="trendChartRef" class="ops-chart" />
          <el-empty v-if="!trendPoints.length && !loading" description="暂无趋势数据" />
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>模型 / 失败统计</h2>
              <p>当前后端返回失败原因聚合</p>
            </div>
          </div>
          <div class="ops-model-list">
            <div v-for="item in failurePoints" :key="item.name" class="ops-model-row">
              <div>
                <strong>{{ translateFailureReason(item.name) }}</strong>
                <span>{{ item.value }} 次失败</span>
              </div>
              <el-progress :percentage="failurePercent(item.value)" :stroke-width="8" :show-text="false" />
            </div>
            <el-empty v-if="!failurePoints.length && !loading" description="暂无失败原因聚合" />
          </div>
        </article>
      </section>

      <section class="ops-main-grid">
        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>服务健康</h2>
              <p>来自管理驾驶舱系统状态</p>
            </div>
          </div>
          <div class="ops-service-list">
            <div v-for="item in services" :key="item.serviceName" class="ops-service-row">
              <span :class="`ops-dot ops-dot--${statusTone(item.status)}`"></span>
              <div>
                <strong>{{ serviceLabel(item.serviceName) }}</strong>
                <small>{{ serviceReasonLabel(item) }}</small>
              </div>
              <em :class="`status-${statusTone(item.status)}`">{{ statusText(item.status) }}</em>
            </div>
            <el-empty v-if="!services.length && !loading" description="暂无服务状态" />
          </div>
        </article>

        <article class="ops-panel">
          <div class="ops-panel__head">
            <div>
              <h2>最近聚合任务</h2>
              <p>聚合任务最近执行情况</p>
            </div>
          </div>
          <div class="ops-job-list">
            <div v-for="job in jobs" :key="job.id" class="ops-job-row">
              <div>
                <strong>{{ translateJobName(job.jobName || job.jobCode || `Job #${job.id}`) }}</strong>
                <small>{{ job.statDate || job.createdAt || '--' }}</small>
              </div>
              <el-tag :type="job.status === 'SUCCESS' ? 'success' : job.status === 'FAILED' ? 'danger' : 'warning'" effect="plain">
                {{ jobStatusLabel(job.status) }}
              </el-tag>
            </div>
            <el-empty v-if="!jobs.length && !loading" description="暂无聚合任务" />
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Activity, Gauge, Monitor, RefreshCw, Server, ShieldCheck } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getAdminAgentOverviewApi,
  getAdminAgentTrendApi,
  getAdminAiFailuresApi,
  getAdminAiOverviewApi,
  getAdminAnalyticsJobsApi
} from '@/api/analytics'
import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import AppState from '@/components/common/AppState.vue'
import type { AdminAgentOverviewVO, AdminAiOverviewVO, AdminAnalyticsJobLogVO, MetricPointVO, TrendPointVO } from '@/types/analytics'
import type { AdminDashboardOverviewVO, DashboardStatus } from '@/types/dashboard'
import { translateFailureReason, translateJobName } from '@/utils/adminDisplay'
import echarts, { type ECharts } from '@/utils/echarts'

const loading = ref(false)
const errorMessage = ref('')
const rangeDays = ref(7)
const aiOverview = ref<AdminAiOverviewVO>()
const agentOverview = ref<AdminAgentOverviewVO>()
const dashboard = ref<AdminDashboardOverviewVO>()
const trendPoints = ref<TrendPointVO[]>([])
const failurePoints = ref<MetricPointVO[]>([])
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null

const rangeOptions = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 }
]

const services = computed(() => dashboard.value?.systemStatus?.services || [])
const opsMetrics = computed(() => dashboard.value?.systemStatus?.opsMetrics)
const totalFailures = computed(() => Math.max(...failurePoints.value.map((item) => item.value || 0), 1))

const formatPercent = (value?: number) => `${Number(value || 0).toFixed(2)}%`
const formatMs = (value?: number) => `${Math.round(Number(value || 0))}ms`
const formatMetric = (value?: number, digits = 2) => Number(value ?? 0).toFixed(digits)
const formatMb = (value?: number) => `${Math.round(Number(value || 0))} MB`
const compact = (value?: number) => {
  const num = Number(value || 0)
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

const errorRate = computed(() => {
  const total = aiOverview.value?.totalAiCalls || 0
  if (!total) return 0
  return ((aiOverview.value?.failedAiCalls || 0) / total) * 100
})

const metricGroups = computed(() => [
  {
    key: 'usage',
    title: '使用统计',
    subtitle: '请求、Token 与调用',
    icon: Activity,
    tone: 'tone-blue',
    metrics: [
      { label: 'AI 调用', value: compact(aiOverview.value?.totalAiCalls), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` },
      { label: '总 Token', value: compact(aiOverview.value?.totalTokens), hint: `输入 ${compact(aiOverview.value?.totalInputTokens)}` },
      { label: 'Agent 运行', value: compact(agentOverview.value?.totalAgentRuns), hint: `成功 ${agentOverview.value?.successAgentRuns || 0}` },
      { label: 'Agent 任务', value: compact(agentOverview.value?.totalAgentTasks), hint: `完成 ${agentOverview.value?.doneTaskCount || 0}` }
    ]
  },
  {
    key: 'ops',
    title: '系统运维',
    subtitle: '实时吞吐和限流',
    icon: Gauge,
    tone: 'tone-cyan',
    metrics: [
      { label: 'QPS', value: formatMetric(opsMetrics.value?.qps), hint: '最近 1 分钟请求均值' },
      { label: 'TPS', value: formatMetric(opsMetrics.value?.tps), hint: '最近 1 分钟业务写入均值' },
      { label: 'RPM', value: compact(opsMetrics.value?.rpm || aiOverview.value?.totalAiCalls), hint: '最近 1 分钟请求数' },
      { label: 'TPM', value: compact(opsMetrics.value?.tpm || aiOverview.value?.totalTokens), hint: '最近 1 分钟 Token' }
    ]
  },
  {
    key: 'load',
    title: '系统负载',
    subtitle: '进程与主机资源',
    icon: Server,
    tone: 'tone-violet',
    metrics: [
      { label: 'CPU', value: formatPercent(opsMetrics.value?.processCpuUsage), hint: `系统 ${formatPercent(opsMetrics.value?.systemCpuUsage)}` },
      { label: '内存', value: formatMb(opsMetrics.value?.heapUsedMb), hint: `JVM ${formatPercent(opsMetrics.value?.heapUsage)} / ${formatMb(opsMetrics.value?.heapMaxMb)}` },
      { label: '服务数', value: services.value.length, hint: '来自管理驾驶舱' },
      { label: '数据库', value: statusText(services.value.find((item) => item.serviceName === 'database')?.status), hint: 'SELECT 1' }
    ]
  },
  {
    key: 'health',
    title: '缓存 + 健康',
    subtitle: '命中率、延迟和错误率',
    icon: ShieldCheck,
    tone: 'tone-green',
    metrics: [
      { label: 'AI 成功率', value: formatPercent(aiOverview.value?.aiSuccessRate), hint: `平均 ${formatMs(aiOverview.value?.avgElapsedMs)}` },
      { label: 'Agent 成功率', value: formatPercent(agentOverview.value?.agentSuccessRate), hint: `平均 ${formatMs(agentOverview.value?.avgDurationMs)}` },
      { label: '缓存命中', value: formatPercent(opsMetrics.value?.redisHitRate), hint: `hits ${compact(opsMetrics.value?.redisKeyspaceHits)} / misses ${compact(opsMetrics.value?.redisKeyspaceMisses)}` },
      { label: '错误率', value: formatPercent(errorRate.value), hint: `失败 ${aiOverview.value?.failedAiCalls || 0}` }
    ]
  }
])

const failurePercent = (value?: number) => Math.min(100, Math.max(4, ((value || 0) / totalFailures.value) * 100))

const statusText = (status?: DashboardStatus) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    HEALTHY: '正常',
    SUPPORTED: '正常',
    DEGRADED: '降级',
    DOWN: '不可用',
    UNKNOWN: '未探测到',
    UNSUPPORTED: '未接入探测'
  }
  return map[value] || String(status || '未探测到')
}

const statusTone = (status?: DashboardStatus) => {
  const value = String(status || '').toUpperCase()
  if (value === 'HEALTHY' || value === 'SUPPORTED') return 'healthy'
  if (value === 'DEGRADED') return 'degraded'
  if (value === 'DOWN' || value === 'ERROR') return 'down'
  return 'unknown'
}

const serviceLabel = (value: string) => {
  const map: Record<string, string> = {
    overview: '概览接口',
    database: '数据库',
    'codecoachai-gateway': 'Gateway',
    'codecoachai-auth': 'Auth 服务',
    'codecoachai-user': 'User 服务',
    'codecoachai-resume': 'Resume 服务',
    'codecoachai-interview': 'Interview 服务',
    'codecoachai-question': 'Question 服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-task': 'Task 服务',
    'codecoachai-file': 'File 服务'
  }
  return map[value] || value
}

const serviceReasonLabel = (item: { status?: DashboardStatus; reason?: string; source?: string }) => {
  if (item.reason) return item.reason
  if (item.source) return item.source
  const value = String(item.status || '').toUpperCase()
  if (value === 'UNKNOWN') return '本次健康探测未返回可用状态'
  if (value === 'UNSUPPORTED') return '该服务暂未接入运行态探测'
  return '来自管理驾驶舱'
}

const jobStatusLabel = (status?: string) => {
  const map: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '执行中',
    SUCCESS: '成功',
    FAILED: '失败',
    CANCELED: '已取消'
  }
  return map[String(status || 'UNKNOWN').toUpperCase()] || '未知'
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const renderChart = async () => {
  await nextTick()
  disposeChart()
  if (!trendChartRef.value || !trendPoints.value.length) return
  trendChart = echarts.init(trendChartRef.value)
  trendChart.setOption({
    backgroundColor: 'transparent',
    color: ['#60a5fa', '#22d3ee', '#a78bfa'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.94)',
      borderColor: 'rgba(148, 163, 184, 0.28)',
      textStyle: { color: '#e5edf7' }
    },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    grid: { left: 42, right: 18, top: 28, bottom: 44 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map((item) => item.date),
      axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.28)' } },
      axisLabel: { color: '#94a3b8' }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.16)', type: 'dashed' } }
    },
    series: [
      { name: '运行数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.runCount || 0) },
      { name: '成功数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.successRunCount || 0) },
      { name: '失败数', type: 'line', smooth: true, data: trendPoints.value.map((item) => item.failedRunCount || 0) }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [aiData, agentData, trendData, failureData, dashboardData, jobsPage] = await Promise.all([
      getAdminAiOverviewApi(params),
      getAdminAgentOverviewApi(params),
      getAdminAgentTrendApi(params),
      getAdminAiFailuresApi(params),
      getAdminDashboardOverviewApi(),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 })
    ])
    aiOverview.value = aiData
    agentOverview.value = agentData
    trendPoints.value = trendData
    failurePoints.value = failureData
    dashboard.value = dashboardData
    jobs.value = jobsPage.records || []
    await renderChart()
  } catch (error) {
    errorMessage.value = error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '接口请求失败')
      : '接口请求失败'
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
.ops-page {
  .ops-hero {
    background:
      linear-gradient(135deg, rgba(79, 70, 229, 0.24), rgba(14, 165, 233, 0.16)),
      rgba(15, 23, 42, 0.76);
    color: var(--app-text);
  }

  .admin-hero__desc,
  .admin-eyebrow {
    color: var(--app-text-muted);
  }

  :deep(.el-segmented) {
    --el-segmented-bg-color: rgba(15, 23, 42, 0.76);
    --el-segmented-item-selected-bg-color: rgba(99, 102, 241, 0.9);
    --el-segmented-item-selected-color: #ffffff;
    --el-border-radius-base: 8px;
    border: 1px solid rgba(148, 163, 184, 0.18);
  }

  :deep(.el-button) {
    border-color: rgba(148, 163, 184, 0.22);
    background: rgba(15, 23, 42, 0.72);
    color: var(--app-text);
  }
}

.ops-card-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.ops-card,
.ops-panel {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.74);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.18);
}

.ops-card {
  padding: 22px;
  backdrop-filter: blur(14px);
}

.ops-card__head,
.ops-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.ops-card__head {
  justify-content: flex-start;
  margin-bottom: 18px;
}

.ops-card__icon {
  display: inline-flex;
  flex: 0 0 50px;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.16);
  color: #93c5fd;
}

.tone-cyan {
  background: rgba(34, 211, 238, 0.14);
  color: #67e8f9;
}

.tone-violet {
  background: rgba(167, 139, 250, 0.15);
  color: #c4b5fd;
}

.tone-green {
  background: rgba(16, 185, 129, 0.14);
  color: #6ee7b7;
}

.ops-card h2,
.ops-panel h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 20px;
}

.ops-card p,
.ops-panel p {
  margin: 6px 0 0;
  color: var(--app-text-muted);
}

.ops-mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.ops-mini {
  min-height: 82px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.26);
}

.ops-mini span,
.ops-mini small {
  display: block;
  color: var(--app-text-muted);
}

.ops-mini strong {
  display: block;
  margin: 6px 0;
  color: var(--app-text);
  font-size: 24px;
  line-height: 1.1;
}

.ops-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 16px;
}

.ops-panel {
  min-width: 0;
  padding: 22px;
}

.ops-chart {
  width: 100%;
  height: 360px;
  margin-top: 18px;
}

.ops-model-list,
.ops-service-list,
.ops-job-list {
  display: grid;
  gap: 12px;
  max-height: 360px;
  margin-top: 18px;
  overflow: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.ops-model-row,
.ops-service-row,
.ops-job-row {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.28);
}

.ops-model-row {
  padding: 14px;
}

.ops-model-row > div,
.ops-service-row,
.ops-job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ops-model-row strong,
.ops-service-row strong,
.ops-job-row strong {
  color: var(--app-text);
}

.ops-model-row span,
.ops-service-row small,
.ops-job-row small {
  display: block;
  margin-top: 4px;
  color: var(--app-text-muted);
}

.ops-service-row,
.ops-job-row {
  padding: 12px;
}

.ops-service-row em {
  flex: 0 0 auto;
  font-style: normal;
  font-weight: 700;
}

.ops-dot {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #facc15;
}

.ops-dot--healthy {
  background: #22c55e;
}

.ops-dot--down {
  background: #ef4444;
}

.ops-dot--degraded,
.ops-dot--unknown {
  background: #facc15;
}

.status-healthy {
  color: #4ade80;
}

.status-degraded,
.status-unknown {
  color: #facc15;
}

.status-down {
  color: #f87171;
}

@media (max-width: 1280px) {
  .ops-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .ops-card-grid,
  .ops-main-grid {
    grid-template-columns: 1fr;
  }
}
</style>
