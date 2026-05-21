import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import { normalizePageResult } from '@/utils/page'
import type {
  AdminAnalyticsDictionaryQuery,
  AdminAnalyticsJobLogVO,
  AdminAnalyticsJobQuery,
  AdminAnalyticsMetricDefinitionVO,
  AdminAgentOverviewVO,
  AdminAgentTaskStatsVO,
  AdminAiOverviewVO,
  AnalyticsRangeQuery,
  MetricPointVO,
  PersonalAgentOverviewVO,
  PromptRegressionCaseVO,
  PromptRegressionQuery,
  PromptRegressionResultVO,
  PromptRegressionRunDTO,
  TrendPointVO
} from '@/types/analytics'

const normalizeMetricList = (items?: MetricPointVO[]): MetricPointVO[] =>
  (items || []).map((item) => ({
    name: item.name || 'UNKNOWN',
    value: Number(item.value || 0)
  }))

const normalizeTrendList = (items?: TrendPointVO[]): TrendPointVO[] =>
  (items || []).map((item) => ({
    ...item,
    generatedCount: Number(item.generatedCount || 0),
    completedCount: Number(item.completedCount || 0),
    skippedCount: Number(item.skippedCount || 0),
    estimatedMinutes: Number(item.estimatedMinutes || 0),
    completedMinutes: Number(item.completedMinutes || 0),
    runCount: Number(item.runCount || 0),
    successRunCount: Number(item.successRunCount || 0),
    failedRunCount: Number(item.failedRunCount || 0)
  }))

const normalizePersonalOverview = (data: Partial<PersonalAgentOverviewVO> = {}): PersonalAgentOverviewVO => ({
  todayTaskCount: Number(data.todayTaskCount || 0),
  todayDoneCount: Number(data.todayDoneCount || 0),
  todaySkippedCount: Number(data.todaySkippedCount || 0),
  todayEstimatedMinutes: Number(data.todayEstimatedMinutes || 0),
  last7DaysTaskCount: Number(data.last7DaysTaskCount || 0),
  last7DaysDoneCount: Number(data.last7DaysDoneCount || 0),
  last7DaysCompletionRate: Number(data.last7DaysCompletionRate || 0),
  totalAgentPlanCount: Number(data.totalAgentPlanCount || 0),
  agentGeneratedTaskCount: Number(data.agentGeneratedTaskCount || 0),
  taskCompletionRate: Number(data.taskCompletionRate || 0),
  agentSuccessRate: Number(data.agentSuccessRate || 0),
  avgAgentDurationMs: Number(data.avgAgentDurationMs || 0)
})

const normalizeAdminAgentOverview = (data: Partial<AdminAgentOverviewVO> = {}): AdminAgentOverviewVO => ({
  totalAgentRuns: Number(data.totalAgentRuns || 0),
  successAgentRuns: Number(data.successAgentRuns || 0),
  failedAgentRuns: Number(data.failedAgentRuns || 0),
  agentSuccessRate: Number(data.agentSuccessRate || 0),
  avgDurationMs: Number(data.avgDurationMs || 0),
  totalAgentTasks: Number(data.totalAgentTasks || 0),
  doneTaskCount: Number(data.doneTaskCount || 0),
  skippedTaskCount: Number(data.skippedTaskCount || 0),
  taskCompletionRate: Number(data.taskCompletionRate || 0)
})

const normalizeAdminTaskStats = (data: Partial<AdminAgentTaskStatsVO> = {}): AdminAgentTaskStatsVO => ({
  totalAgentTasks: Number(data.totalAgentTasks || 0),
  doneTaskCount: Number(data.doneTaskCount || 0),
  skippedTaskCount: Number(data.skippedTaskCount || 0),
  taskCompletionRate: Number(data.taskCompletionRate || 0),
  taskTypeDistribution: normalizeMetricList(data.taskTypeDistribution),
  priorityDistribution: normalizeMetricList(data.priorityDistribution)
})

const normalizeAdminAiOverview = (data: Partial<AdminAiOverviewVO> = {}): AdminAiOverviewVO => ({
  totalAiCalls: Number(data.totalAiCalls || 0),
  successAiCalls: Number(data.successAiCalls || 0),
  failedAiCalls: Number(data.failedAiCalls || 0),
  aiSuccessRate: Number(data.aiSuccessRate || 0),
  avgElapsedMs: Number(data.avgElapsedMs || 0),
  totalInputTokens: Number(data.totalInputTokens || 0),
  totalOutputTokens: Number(data.totalOutputTokens || 0),
  totalTokens: Number(data.totalTokens || 0)
})

export const getPersonalAgentOverviewApi = () =>
  request
    .get<PersonalAgentOverviewVO, PersonalAgentOverviewVO>('/analytics/personal/agent-overview')
    .then(normalizePersonalOverview)

export const getPersonalTaskTrendApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<TrendPointVO[], TrendPointVO[]>('/analytics/personal/task-trend', { params })
    .then(normalizeTrendList)

export const getPersonalSkillDistributionApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<MetricPointVO[], MetricPointVO[]>('/analytics/personal/skill-distribution', { params })
    .then(normalizeMetricList)

export const getAdminAgentOverviewApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<AdminAgentOverviewVO, AdminAgentOverviewVO>('/admin/analytics/agent/overview', { params })
    .then(normalizeAdminAgentOverview)

export const getAdminAgentTrendApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<TrendPointVO[], TrendPointVO[]>('/admin/analytics/agent/trend', { params })
    .then(normalizeTrendList)

export const getAdminAgentTasksApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<AdminAgentTaskStatsVO, AdminAgentTaskStatsVO>('/admin/analytics/agent/tasks', { params })
    .then(normalizeAdminTaskStats)

export const getAdminAiOverviewApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<AdminAiOverviewVO, AdminAiOverviewVO>('/admin/analytics/ai/overview', { params })
    .then(normalizeAdminAiOverview)

export const getAdminAiFailuresApi = (params?: AnalyticsRangeQuery) =>
  request
    .get<MetricPointVO[], MetricPointVO[]>('/admin/analytics/ai/failures', { params })
    .then(normalizeMetricList)

export const getAdminAnalyticsMetricsApi = (params?: AdminAnalyticsDictionaryQuery) => {
  const requestParams = {
    category: params?.category || undefined,
    enabled: params?.enabled === '' ? undefined : params?.enabled
  }
  return request
    .get<PageResult<AdminAnalyticsMetricDefinitionVO> | AdminAnalyticsMetricDefinitionVO[], PageResult<AdminAnalyticsMetricDefinitionVO> | AdminAnalyticsMetricDefinitionVO[]>(
      '/admin/analytics/metrics',
      { params: requestParams }
    )
    .then((result) => normalizePageResult(result, params))
}

export const getAdminAnalyticsJobsApi = (params?: AdminAnalyticsJobQuery) =>
  request
    .get<PageResult<AdminAnalyticsJobLogVO>, PageResult<AdminAnalyticsJobLogVO>>(
      '/admin/analytics/jobs',
      { params }
    )
    .then((result) => normalizePageResult(result, params))

export const rerunAdminAnalyticsJobApi = (id: number) =>
  request.post<AdminAnalyticsJobLogVO, AdminAnalyticsJobLogVO>(`/admin/analytics/jobs/${id}/rerun`)

export const getPromptRegressionCasesApi = (params?: PromptRegressionQuery) =>
  request
    .get<PageResult<PromptRegressionCaseVO> | PromptRegressionCaseVO[], PageResult<PromptRegressionCaseVO> | PromptRegressionCaseVO[]>(
      '/admin/agent/prompt-regression/cases',
      { params }
    )
    .then((result) => normalizePageResult(result, params))

export const getPromptRegressionResultsApi = (params?: PromptRegressionQuery) =>
  request
    .get<PageResult<PromptRegressionResultVO> | PromptRegressionResultVO[], PageResult<PromptRegressionResultVO> | PromptRegressionResultVO[]>(
      '/admin/agent/prompt-regression/results',
      { params }
    )
    .then((result) => normalizePageResult(result, params))

export const runPromptRegressionApi = (data?: PromptRegressionRunDTO) =>
  request.post<PromptRegressionResultVO, PromptRegressionResultVO>(
    `/admin/agent/prompt-regression/cases/${data?.caseId}/run`,
    { promptVersionId: data?.promptVersionId }
  )
