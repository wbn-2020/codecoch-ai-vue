<template>
  <div class="page-shell admin-console-page ai-ops-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Bot :size="16" />
          <span>AI Ops 分析</span>
        </div>
        <h1 class="admin-hero__title">AI Ops 基础看板</h1>
        <p class="admin-hero__desc">聚合 AI 调用成功率、耗时、Token 使用量和失败原因，支撑 V4 的 Agent 可观测能力。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button v-permission="'admin:analytics:job:run'" type="primary" @click="openManualRun">运行每日计划</el-button>
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
              <span>{{ translateFailureReason(item.name) }}</span>
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
              <h2>Agent 反馈</h2>
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
              <span>{{ translateFeedbackType(item.name) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!feedbackTypes.length && !loading" description="暂无反馈类型数据" />
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>AI 结果质量反馈</h2>
              <p>用户对简历匹配、面试报告等 AI 输出的可信度反馈。</p>
            </div>
            <el-tag effect="plain">ai_result_feedback</el-tag>
          </div>
          <div class="feedback-grid">
            <article v-for="item in qualityFeedbackMetrics" :key="item.key" class="feedback-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
          <div class="failure-list">
            <div v-for="item in qualityFeedbackTypes" :key="item.name" class="failure-row">
              <span>{{ translateFeedbackType(item.name) }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!qualityFeedbackTypes.length && !loading" description="暂无 AI 结果反馈数据" />
          </div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>训练快照</h2>
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
              <small>成功 {{ item.successRunCount ?? 0 }} / 失败 {{ item.failedRunCount ?? 0 }}</small>
            </div>
            <el-empty v-if="!trainingTrend.length && !loading" description="暂无训练趋势数据" />
          </div>
        </section>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>指标字典</h2>
              <p>展示 V4 指标定义，完整编辑入口在指标字典页面。</p>
            </div>
            <el-button link type="primary" @click="$router.push('/admin/analytics/metrics')">打开</el-button>
          </div>
          <el-table :data="metricDefs" row-key="id">
            <el-table-column prop="metricCode" label="指标编码" min-width="180" show-overflow-tooltip />
            <el-table-column label="指标名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateMetricName(row.metricName) }}</template>
            </el-table-column>
            <el-table-column label="分类" width="120">
              <template #default="{ row }">{{ translateMetricCategory(row.category) }}</template>
            </el-table-column>
            <el-table-column label="启用状态" width="100">
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
              <h2>最近聚合任务</h2>
              <p>最近聚合任务，支持重跑单条日志。</p>
            </div>
            <el-button link type="primary" @click="$router.push('/admin/analytics/jobs')">打开</el-button>
          </div>
          <el-table :data="jobs" row-key="id">
            <el-table-column prop="jobCode" label="任务编码" min-width="160" show-overflow-tooltip />
            <el-table-column label="任务名称" min-width="180" show-overflow-tooltip>
              <template #default="{ row }">{{ translateJobName(row.jobName || row.jobCode) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column prop="statDate" label="统计日期" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button v-permission="'admin:analytics:job:run'" link type="primary" :loading="rerunningId === row.id" @click="rerunJob(row)">重跑</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无任务日志" />
            </template>
          </el-table>
        </section>
      </div>
    </template>

    <el-dialog v-model="manualDialogVisible" title="运行 Agent 每日计划聚合" width="620px">
      <el-form :model="manualForm" label-position="top">
        <div class="manual-grid">
          <el-form-item label="统计日期">
            <el-date-picker v-model="manualForm.statDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
          </el-form-item>
          <el-form-item label="目标岗位 ID">
            <el-input-number v-model="manualForm.targetJobId" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="任务数量">
            <el-input-number v-model="manualForm.taskCount" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
          <el-form-item label="最大总分钟数">
            <el-input-number v-model="manualForm.maxTotalMinutes" :min="1" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="用户 ID">
          <el-input v-model.trim="manualUserIds" placeholder="多个 ID 用英文逗号分隔，可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="manualDialogVisible = false">取消</el-button>
        <el-button v-permission="'admin:analytics:job:run'" type="primary" :loading="manualRunning" @click="runDailyPlan">运行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
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
import { getAdminAiResultFeedbackStatsApi } from '@/api/aiFeedback'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { PageResult } from '@/types/api'
import type { AiResultFeedbackStatsVO } from '@/types/aiFeedback'
import type {
  AdminAiOverviewVO,
  AdminAnalyticsOverviewVO,
  AdminAnalyticsJobLogVO,
  AdminAnalyticsMetricDefinitionVO,
  AdminAnalyticsTrainingVO,
  AgentFeedbackStatsVO,
  MetricPointVO,
  TrendPointVO
} from '@/types/analytics'
import {
  translateFailureReason,
  translateFeedbackType,
  translateJobName,
  translateMetricCategory,
  translateMetricName
} from '@/utils/adminDisplay'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import echarts, { type ECharts } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const errorMessage = ref('')
const rangeDays = ref(7)
const overview = ref<AdminAiOverviewVO>()
const feedback = ref<AgentFeedbackStatsVO>()
const aiResultFeedback = ref<AiResultFeedbackStatsVO>()
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
let successChart: ECharts | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'calls', label: 'AI 调用总数', value: overview.value?.totalAiCalls || 0, hint: `成功 ${overview.value?.successAiCalls || 0} / 失败 ${overview.value?.failedAiCalls || 0}` },
  { key: 'rate', label: '调用成功率', value: `${overview.value?.aiSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgElapsedMs || 0}ms` },
  { key: 'input', label: '输入 Token', value: overview.value?.totalInputTokens || 0, hint: '提示词消耗' },
  { key: 'output', label: '输出 Token', value: overview.value?.totalOutputTokens || 0, hint: `总计 ${overview.value?.totalTokens || 0}` }
])

const feedbackMetrics = computed(() => [
  { key: 'total', label: '反馈总数', value: feedback.value?.totalFeedbackCount ?? '--' },
  { key: 'adopted', label: '已采纳', value: feedback.value?.adoptedCount ?? '--' },
  { key: 'ignored', label: '已忽略', value: feedback.value?.ignoredCount ?? '--' },
  { key: 'rate', label: '采纳率', value: feedback.value?.adoptionRate == null ? '--' : `${feedback.value.adoptionRate}%` }
])

const feedbackTypes = computed(() =>
  (feedback.value?.typeDistribution || []).map((item) => ({
    name: item.feedbackType || 'UNKNOWN',
    value: Number(item.count || 0)
  }))
)

const formatRatio = (value?: number) => value == null ? '--' : `${Math.round(value * 1000) / 10}%`

const qualityFeedbackMetrics = computed(() => [
  { key: 'total', label: '结果反馈数', value: aiResultFeedback.value?.totalFeedbackCount ?? '--' },
  { key: 'negative', label: '负向反馈', value: aiResultFeedback.value?.negativeFeedbackCount ?? '--' },
  { key: 'hallucination', label: '疑似幻觉', value: aiResultFeedback.value?.hallucinationCount ?? '--' },
  { key: 'negativeRate', label: '负向反馈率', value: formatRatio(aiResultFeedback.value?.negativeFeedbackRate) }
])

const qualityFeedbackTypes = computed(() =>
  (aiResultFeedback.value?.typeDistribution || []).map((item) => ({
    name: item.feedbackType || 'UNKNOWN',
    value: Number(item.count || 0)
  }))
)

const trainingMetrics = computed(() => [
  { key: 'tasks', label: 'Agent 任务', value: trainingTaskStats.value.totalAgentTasks || 0 },
  { key: 'done', label: '已完成', value: trainingTaskStats.value.doneTaskCount || 0 },
  { key: 'skipped', label: '已跳过', value: trainingTaskStats.value.skippedTaskCount || 0 },
  { key: 'rate', label: '完成率', value: `${trainingTaskStats.value.taskCompletionRate || 0}%` }
])

const manualForm = ref({
  statDate: '',
  targetJobId: undefined as number | undefined,
  taskCount: undefined as number | undefined,
  maxTotalMinutes: undefined as number | undefined
})

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002')
  }
  return '\u63a5\u53e3\u8bf7\u6c42\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
}

const getSettledValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback

const emptyPage = <T,>(pageNo = 1, pageSize = 6): PageResult<T> => ({
  records: [],
  total: 0,
  pageNo,
  pageSize,
  pages: 0
})

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
  const params = { days: rangeDays.value }
  const emptyOverview: AdminAiOverviewVO = {
    totalAiCalls: 0,
    successAiCalls: 0,
    failedAiCalls: 0,
    aiSuccessRate: 0,
    avgElapsedMs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0
  }
  try {
    const [overviewResult, failureResult, opsResult, trainingResult, feedbackResult, aiResultFeedbackResult, metricsResult, jobsResult] = await Promise.allSettled([
      getAdminAiOverviewApi(params),
      getAdminAiFailuresApi(params),
      getAdminAnalyticsOverviewApi(params),
      getAdminAnalyticsTrainingApi(params),
      getAdminAgentFeedbackApi(params),
      getAdminAiResultFeedbackStatsApi(params),
      getAdminAnalyticsMetricsApi({ pageNo: 1, pageSize: 6 }),
      getAdminAnalyticsJobsApi({ pageNo: 1, pageSize: 6 })
    ])
    const overviewData = getSettledValue(overviewResult, emptyOverview)
    const failureData = getSettledValue(failureResult, [])
    const opsOverview = getSettledValue(opsResult, {} as AdminAnalyticsOverviewVO)
    const trainingData = getSettledValue(trainingResult, {} as AdminAnalyticsTrainingVO)
    const feedbackData = getSettledValue(feedbackResult, undefined)
    const aiResultFeedbackData = getSettledValue(aiResultFeedbackResult, undefined)
    const metricsPage = getSettledValue(metricsResult, emptyPage<AdminAnalyticsMetricDefinitionVO>())
    const jobsPage = getSettledValue(jobsResult, emptyPage<AdminAnalyticsJobLogVO>())
    overview.value = opsOverview.ai || overviewData
    feedback.value = opsOverview.feedback || feedbackData
    aiResultFeedback.value = aiResultFeedbackData
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
    const failed = [overviewResult, failureResult, opsResult, trainingResult, feedbackResult, aiResultFeedbackResult, metricsResult, jobsResult]
      .filter((result) => result.status === 'rejected')
    if (failed.length === 8) {
      errorMessage.value = getErrorMessage(failed[0].reason)
    }
    await renderChart()
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
  const userIds = parseUserIds()
  const confirmed = await confirmDangerActionPreview({
    title: '运行每日计划高风险确认',
    action: '手动运行 Agent 每日计划聚合',
    target: userIds.length ? `指定用户 ${userIds.length} 人：${userIds.join(', ')}` : '未指定用户，按后端任务规则筛选可生成计划的用户',
    impact: '可能为多个用户生成或刷新今日训练计划，并产生 AI 调用、任务日志和统计记录。',
    rollback: '前端无法自动撤销已生成计划；如误执行，需要通过任务日志和业务记录人工排查。',
    audit: '后端会记录聚合任务日志，执行人、时间、任务参数可用于追踪。',
    tips: ['确认统计日期、目标岗位和任务数量参数正确。', '确认当前不是演示只读模式或共享演示环境。'],
    confirmButtonText: '确认运行'
  })
  if (!confirmed) return
  manualRunning.value = true
  try {
    await runAdminAnalyticsDailyPlanApi({
      jobCode: 'AGENT_DAILY_PLAN',
      jobName: 'Agent 每日计划聚合',
      statDate: manualForm.value.statDate || undefined,
      userIds,
      targetJobId: manualForm.value.targetJobId,
      taskCount: manualForm.value.taskCount,
      maxTotalMinutes: manualForm.value.maxTotalMinutes
    })
    ElMessage.success('每日计划聚合任务已提交')
    manualDialogVisible.value = false
    await loadPage()
  } finally {
    manualRunning.value = false
  }
}

const rerunJob = async (row: AdminAnalyticsJobLogVO) => {
  const id = row.id
  const confirmed = await confirmDangerActionPreview({
    title: '重跑聚合任务高风险确认',
    action: `重跑聚合任务 ${translateJobName(row.jobName || row.jobCode)}`,
    target: `任务 ID：${id}；统计日期：${row.statDate || '未提供'}`,
    impact: '会重新提交该任务，可能覆盖或追加统计结果，并产生新的任务执行记录。',
    rollback: '无法由前端撤销已提交的任务；如结果异常，需要依据任务输出和操作日志人工修正。',
    audit: '重跑请求会进入聚合任务日志，可通过任务 ID 和操作时间追踪。',
    tips: ['优先确认原任务失败原因已处理。', '避免对运行中任务重复提交。'],
    confirmButtonText: '确认重跑'
  })
  if (!confirmed) return
  rerunningId.value = id
  try {
    await rerunAdminAnalyticsJobApi(id)
    ElMessage.success('重跑请求已提交')
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
