<template>
  <div class="page-shell admin-console-page ai-ops-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Bot :size="16" />
          <span>AI Ops Analytics</span>
        </div>
        <h1 class="admin-hero__title">AI Ops 基础看板</h1>
        <p class="admin-hero__desc">聚合 AI 调用成功率、耗时、Token 使用量和失败原因，支撑 V4 的 Agent 可观测能力。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button v-permission="'admin:analytics:job:run'" type="primary" @click="openManualRun">Run daily plan</el-button>
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="AI Ops 数据加载失败" :description="errorMessage">
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

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>调用结构</h2>
              <p>成功与失败调用占比。</p>
            </div>
            <el-tag type="success" effect="plain">ai_call_log</el-tag>
          </div>
          <div ref="successChartRef" class="analytics-chart"></div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>失败原因 Top</h2>
              <p>按错误消息前缀聚合，便于定位 Prompt、模型或网络问题。</p>
            </div>
          </div>
          <div class="failure-list">
            <div v-for="item in failures" :key="item.name" class="failure-row">
              <span>{{ item.name }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!failures.length && !loading" description="暂无失败调用数据" />
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>Agent feedback</h2>
              <p>采用、忽略、点赞和点踩反馈聚合。</p>
            </div>
            <el-tag effect="plain">agent feedback</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in feedbackMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="failure-list">
            <div v-for="item in feedbackTypes" :key="item.name" class="failure-row">
              <span>{{ item.name }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!feedbackTypes.length && !loading" description="暂无反馈类型数据" />
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>Training snapshot</h2>
              <p>任务训练统计与 Agent 趋势摘要。</p>
            </div>
            <el-tag effect="plain">/training</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in trainingMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="trend-list">
            <div v-for="item in trainingTrend" :key="item.date" class="trend-row">
              <span>{{ item.date || '--' }}</span>
              <strong>{{ item.runCount ?? 0 }}</strong>
              <small>success {{ item.successRunCount ?? 0 }} / failed {{ item.failedRunCount ?? 0 }}</small>
            </div>
            <el-empty v-if="!trainingTrend.length && !loading" description="暂无训练趋势数据" />
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>Metric dictionary</h2>
              <p>展示 V4 指标定义，完整编辑入口在 Metric Dictionary 页面。</p>
            </div>
            <el-button link type="primary" @click="$router.push('/admin/analytics/metrics')">Open</el-button>
          </div>
          <el-table :data="metricDefs" row-key="id">
            <el-table-column prop="metricCode" label="Code" min-width="180" show-overflow-tooltip />
            <el-table-column prop="category" label="Category" width="120" />
            <el-table-column label="Enabled" width="100">
              <template #default="{ row }"><StatusTag :status="row.enabled" /></template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无指标定义" />
            </template>
          </el-table>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>Recent jobs</h2>
              <p>最近聚合任务，支持重跑单条日志。</p>
            </div>
            <el-button link type="primary" @click="$router.push('/admin/analytics/jobs')">Open</el-button>
          </div>
          <el-table :data="jobs" row-key="id">
            <el-table-column prop="jobCode" label="Job" min-width="160" show-overflow-tooltip />
            <el-table-column label="Status" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column prop="statDate" label="Date" width="120" />
            <el-table-column label="Action" width="100">
              <template #default="{ row }">
                <el-button v-permission="'admin:analytics:job:run'" link type="primary" :loading="rerunningId === row.id" @click="rerunJob(row.id)">Rerun</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无任务日志" />
            </template>
          </el-table>
        </section>
      </div>
    </template>

    <el-dialog v-model="manualDialogVisible" title="Run agent daily plan aggregation" width="620px">
      <el-form :model="manualForm" label-position="top">
        <div class="manual-grid">
          <el-form-item label="Stat date">
            <el-date-picker v-model="manualForm.statDate" type="date" value-format="YYYY-MM-DD" placeholder="Select date" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Target job ID">
            <el-input-number v-model="manualForm.targetJobId" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Task count">
            <el-input-number v-model="manualForm.taskCount" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="Max total minutes">
            <el-input-number v-model="manualForm.maxTotalMinutes" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="User IDs">
          <el-input v-model.trim="manualUserIds" placeholder="Comma separated, optional" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualDialogVisible = false">Cancel</el-button>
        <el-button v-permission="'admin:analytics:job:run'" type="primary" :loading="manualRunning" @click="runDailyPlan">Run</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bot, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getAdminAiFailuresApi,
  getAdminAiOverviewApi,
  getAdminAgentFeedbackApi,
  getAdminAnalyticsJobsApi,
  getAdminAnalyticsMetricsApi,
  getAdminAnalyticsOverviewApi,
  getAdminAnalyticsTrainingApi,
  rerunAdminAnalyticsJobApi,
  runAdminAnalyticsDailyPlanApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type {
  AdminAiOverviewVO,
  AdminAnalyticsJobLogVO,
  AdminAnalyticsMetricDefinitionVO,
  AgentFeedbackStatsVO,
  MetricPointVO,
  TrendPointVO
} from '@/types/analytics'

const loading = ref(false)
const errorMessage = ref('')
const rangeDays = ref(7)
const overview = ref<AdminAiOverviewVO>()
const feedback = ref<AgentFeedbackStatsVO>()
const trainingTaskStats = ref({ totalAgentTasks: 0, doneTaskCount: 0, skippedTaskCount: 0, taskCompletionRate: 0 })
const trainingTrend = ref<TrendPointVO[]>([])
const failures = ref<MetricPointVO[]>([])
const metricDefs = ref<AdminAnalyticsMetricDefinitionVO[]>([])
const jobs = ref<AdminAnalyticsJobLogVO[]>([])
const rerunningId = ref<number>()
const manualDialogVisible = ref(false)
const manualRunning = ref(false)
const manualUserIds = ref('')
const successChartRef = ref<HTMLElement>()
let successChart: echarts.ECharts | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'calls', label: 'AI 调用总数', value: overview.value?.totalAiCalls || 0, hint: `成功 ${overview.value?.successAiCalls || 0} / 失败 ${overview.value?.failedAiCalls || 0}` },
  { key: 'rate', label: '调用成功率', value: `${overview.value?.aiSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgElapsedMs || 0}ms` },
  { key: 'input', label: '输入 Token', value: overview.value?.totalInputTokens || 0, hint: 'prompt tokens' },
  { key: 'output', label: '输出 Token', value: overview.value?.totalOutputTokens || 0, hint: `总计 ${overview.value?.totalTokens || 0}` }
])

const feedbackMetrics = computed(() => [
  { key: 'total', label: 'Feedback total', value: feedback.value?.totalFeedbackCount ?? '--' },
  { key: 'adopted', label: 'Adopted', value: feedback.value?.adoptedCount ?? '--' },
  { key: 'ignored', label: 'Ignored', value: feedback.value?.ignoredCount ?? '--' },
  { key: 'rate', label: 'Adoption rate', value: feedback.value?.adoptionRate == null ? '--' : `${feedback.value.adoptionRate}%` }
])

const feedbackTypes = computed(() =>
  (feedback.value?.typeDistribution || []).map((item) => ({
    name: item.feedbackType || 'UNKNOWN',
    value: Number(item.count || 0)
  }))
)

const trainingMetrics = computed(() => [
  { key: 'tasks', label: 'Agent tasks', value: trainingTaskStats.value.totalAgentTasks || 0 },
  { key: 'done', label: 'Done', value: trainingTaskStats.value.doneTaskCount || 0 },
  { key: 'skipped', label: 'Skipped', value: trainingTaskStats.value.skippedTaskCount || 0 },
  { key: 'rate', label: 'Completion rate', value: `${trainingTaskStats.value.taskCompletionRate || 0}%` }
])

const manualForm = ref({
  statDate: '',
  targetJobId: undefined as number | undefined,
  taskCount: undefined as number | undefined,
  maxTotalMinutes: undefined as number | undefined
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const disposeChart = () => {
  successChart?.dispose()
  successChart = null
}

const renderChart = async () => {
  await nextTick()
  disposeChart()
  if (!successChartRef.value || !overview.value) return
  successChart = echarts.init(successChartRef.value)
  successChart.setOption({
    color: ['#34d399', '#f87171'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [
      {
        name: 'AI 调用',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '43%'],
        data: [
          { name: '成功', value: overview.value.successAiCalls || 0 },
          { name: '失败', value: overview.value.failedAiCalls || 0 }
        ]
      }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewData, failureData, opsOverview, trainingData, feedbackData, metricsPage, jobsPage] = await Promise.all([
      getAdminAiOverviewApi(params),
      getAdminAiFailuresApi(params),
      getAdminAnalyticsOverviewApi(params),
      getAdminAnalyticsTrainingApi(params),
      getAdminAgentFeedbackApi(params),
      getAdminAnalyticsMetricsApi({ pageNo: 1, pageSize: 6 }),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 })
    ])
    overview.value = opsOverview.ai || overviewData
    feedback.value = opsOverview.feedback || feedbackData
    trainingTaskStats.value = {
      totalAgentTasks: trainingData.taskStats?.totalAgentTasks || 0,
      doneTaskCount: trainingData.taskStats?.doneTaskCount || 0,
      skippedTaskCount: trainingData.taskStats?.skippedTaskCount || 0,
      taskCompletionRate: trainingData.taskStats?.taskCompletionRate || 0
    }
    trainingTrend.value = trainingData.agentTrend || []
    failures.value = failureData
    metricDefs.value = metricsPage.records || []
    jobs.value = jobsPage.records || []
    await renderChart()
  } catch (error) {
    overview.value = undefined
    feedback.value = undefined
    trainingTrend.value = []
    metricDefs.value = []
    jobs.value = []
    failures.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openManualRun = () => {
  manualForm.value = {
    statDate: '',
    targetJobId: undefined,
    taskCount: undefined,
    maxTotalMinutes: undefined
  }
  manualUserIds.value = ''
  manualDialogVisible.value = true
}

const parseUserIds = () =>
  manualUserIds.value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)

const runDailyPlan = async () => {
  manualRunning.value = true
  try {
    await runAdminAnalyticsDailyPlanApi({
      jobCode: 'AGENT_DAILY_PLAN',
      jobName: 'Agent daily plan aggregation',
      statDate: manualForm.value.statDate || undefined,
      userIds: parseUserIds(),
      targetJobId: manualForm.value.targetJobId,
      taskCount: manualForm.value.taskCount,
      maxTotalMinutes: manualForm.value.maxTotalMinutes
    })
    ElMessage.success('Daily plan job requested')
    manualDialogVisible.value = false
    await loadPage()
  } finally {
    manualRunning.value = false
  }
}

const rerunJob = async (id: number) => {
  try {
    await ElMessageBox.confirm('Confirm rerun this analytics job?', 'Rerun confirmation', { type: 'warning' })
  } catch {
    return
  }
  rerunningId.value = id
  try {
    await rerunAdminAnalyticsJobApi(id)
    ElMessage.success('Rerun requested')
    await loadPage()
  } finally {
    rerunningId.value = undefined
  }
}

const resizeChart = () => successChart?.resize()

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
.ai-ops-grid {
  grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
}

.analytics-chart {
  width: 100%;
  height: 320px;
  padding: 0 20px 20px;
}

.failure-list {
  display: grid;
  gap: 10px;
  padding: 18px 20px 20px;
}

.failure-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.56);
}

.failure-row span {
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failure-row strong {
  text-align: right;
}

.feedback-grid,
.manual-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px 20px 0;
}

.feedback-card {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.feedback-card span,
.trend-row small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.feedback-card strong {
  font-size: 22px;
}

.trend-list {
  display: grid;
  gap: 10px;
  padding: 18px 20px 20px;
}

.trend-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px minmax(120px, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

@media (max-width: 900px) {
  .ai-ops-grid {
    grid-template-columns: 1fr;
  }

  .feedback-grid,
  .manual-grid,
  .trend-row {
    grid-template-columns: 1fr;
  }
}
</style>
