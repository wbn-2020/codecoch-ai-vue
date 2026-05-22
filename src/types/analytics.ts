export interface MetricPointVO {
  name: string
  value: number
}

export interface TrendPointVO {
  date: string
  generatedCount?: number
  completedCount?: number
  skippedCount?: number
  estimatedMinutes?: number
  completedMinutes?: number
  runCount?: number
  successRunCount?: number
  failedRunCount?: number
}

export interface PersonalAgentOverviewVO {
  todayTaskCount: number
  todayDoneCount: number
  todaySkippedCount: number
  todayEstimatedMinutes: number
  last7DaysTaskCount: number
  last7DaysDoneCount: number
  last7DaysCompletionRate: number
  totalAgentPlanCount: number
  agentGeneratedTaskCount: number
  taskCompletionRate: number
  agentSuccessRate: number
  avgAgentDurationMs: number
}

export interface AdminAgentOverviewVO {
  totalAgentRuns: number
  successAgentRuns: number
  failedAgentRuns: number
  agentSuccessRate: number
  avgDurationMs: number
  totalAgentTasks: number
  doneTaskCount: number
  skippedTaskCount: number
  taskCompletionRate: number
}

export interface AdminAgentTaskStatsVO {
  totalAgentTasks: number
  doneTaskCount: number
  skippedTaskCount: number
  taskCompletionRate: number
  taskTypeDistribution: MetricPointVO[]
  priorityDistribution: MetricPointVO[]
}

export interface AdminAiOverviewVO {
  totalAiCalls: number
  successAiCalls: number
  failedAiCalls: number
  aiSuccessRate: number
  avgElapsedMs: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
}

export interface AnalyticsRangeQuery {
  days?: number
}

export interface AdminAnalyticsMetricDefinitionVO {
  id: number
  metricCode?: string
  metricName?: string
  category?: string
  definition?: string
  dataSource?: string
  refreshFrequency?: string
  enabled?: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminAnalyticsMetricSaveDTO {
  id?: number
  metricCode?: string
  metricName?: string
  category?: string
  definition?: string
  dataSource?: string
  refreshFrequency?: string
  enabled?: number
}

export interface AdminAnalyticsJobLogVO {
  id: number
  jobCode?: string
  jobName?: string
  status?: string
  statDate?: string
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  errorMessage?: string
  outputJson?: string
  createdAt?: string
  updatedAt?: string
}

export interface AnalyticsJobRunDTO {
  jobCode?: string
  jobName?: string
  statDate?: string
  userIds?: number[]
  targetJobId?: number
  taskCount?: number
  maxTotalMinutes?: number
}

export interface AgentFeedbackStatsVO {
  totalFeedbackCount?: number
  adoptedCount?: number
  ignoredCount?: number
  likedCount?: number
  dislikedCount?: number
  adoptionRate?: number
  typeDistribution?: Array<{
    feedbackType?: string
    count?: number
  }>
}

export interface AdminAnalyticsOverviewVO {
  agent?: AdminAgentOverviewVO
  ai?: AdminAiOverviewVO
  feedback?: AgentFeedbackStatsVO
}

export interface AdminAnalyticsTrainingVO {
  taskStats?: AdminAgentTaskStatsVO
  agentTrend?: TrendPointVO[]
}

export interface AdminAnalyticsDictionaryQuery {
  pageNo?: number
  pageNum?: number
  pageSize?: number
  category?: string
  keyword?: string
  enabled?: number | ''
}

export interface AdminAnalyticsJobQuery {
  pageNo?: number
  pageNum?: number
  pageSize?: number
  jobCode?: string
  status?: string
  startDate?: string
  endDate?: string
}

export interface PromptRegressionCaseVO {
  id: number
  caseName?: string
  promptType?: string
  inputJson?: string
  expectedSchemaJson?: string
  enabled?: number
  createdAt?: string
  updatedAt?: string
}

export interface PromptRegressionCaseSaveDTO {
  id?: number
  caseName?: string
  promptType?: string
  inputJson?: string
  expectedSchemaJson?: string
  enabled?: number
}

export interface PromptRegressionResultVO {
  id: number
  caseId?: number
  promptVersionId?: number
  status?: string
  outputJson?: string
  score?: number
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface PromptRegressionQuery {
  pageNo?: number
  pageNum?: number
  pageSize?: number
  caseId?: number
  promptType?: string
  enabled?: number | ''
}

export interface PromptRegressionRunDTO {
  caseId?: number
  promptVersionId?: number
}
