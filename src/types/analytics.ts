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

export interface VectorCollectionInfoVO {
  collectionName: string
  exists?: boolean
  status?: string
  pointCount?: number
  vectorSize?: number
  distance?: string
  errorMessage?: string
}

export interface VectorMysqlIndexStatsVO {
  tableName?: string
  idColumn?: string
  total?: number
  statusCounts?: Array<{ status?: string; count?: number }>
  modelCounts?: Array<{ model?: string; count?: number }>
  lastIndexedAt?: string
  errorMessage?: string
}

export interface VectorStoreHealthVO {
  enabled: boolean
  checks?: {
    enabled?: boolean
    collectionsPresent?: boolean
    dimensionMatched?: boolean
    deleteOutboxClear?: boolean
  }
  deleteOutbox?: {
    pending?: number
    failed?: number
    done?: number
    retryable?: number
    clear?: boolean
    errorMessage?: string
    statusCounts?: Array<{ status?: string; count?: number }>
    collectionCounts?: Array<{ collectionName?: string; status?: string; count?: number }>
  }
  mysqlIndexes?: {
    questionEmbedding?: VectorMysqlIndexStatsVO
    personalKnowledgeChunk?: VectorMysqlIndexStatsVO
  }
  config?: {
    enabled?: boolean
    provider?: string
    baseUrl?: string
    defaultLimit?: number
    requestTimeout?: string
    knowledgeCollection?: string
    knowledgeAskMinScore?: number
    knowledgeNearDuplicateThreshold?: number
    knowledgeChunkSize?: number
    knowledgeChunkOverlap?: number
  }
  embeddingMetrics?: {
    windowDays?: number
    callCount?: number
    successCount?: number
    failedCount?: number
    failureRate?: number
    averageElapsedMs?: number
    maxElapsedMs?: number
    totalTokens?: number
    lastCalledAt?: string
    modelCounts?: Array<{ model?: string; count?: number }>
    errorMessage?: string
  }
  collections: VectorCollectionInfoVO[]
}

export interface VectorDeleteRetryResultVO {
  vectorEnabled?: boolean
  requested?: number
  matched?: number
  deleted?: number
  failed?: number
  errors?: string[]
  deleteOutbox?: VectorStoreHealthVO['deleteOutbox']
}

export interface VectorFailureQuery {
  type?: 'all' | 'question' | 'knowledge' | 'deleteOutbox'
  status?: 'ALL' | 'FAILED' | 'PENDING'
  limit?: number
}

export interface VectorQuestionFailureVO {
  questionId?: number
  indexStatus?: string
  embeddingModel?: string
  embeddingDimension?: number
  indexedAt?: string
  lastError?: string
  updatedAt?: string
}

export interface VectorKnowledgeFailureVO {
  chunkId?: number
  userId?: number
  documentId?: number
  chunkIndex?: number
  indexStatus?: string
  embeddingModel?: string
  embeddingDimension?: number
  indexedAt?: string
  lastError?: string
  updatedAt?: string
}

export interface VectorDeleteOutboxFailureVO {
  collectionName?: string
  pointId?: string
  bizType?: string
  status?: string
  retryCount?: number
  lastError?: string
  updatedAt?: string
}

export interface VectorFailureDetailsVO {
  type?: string
  status?: string
  statuses?: string[]
  limit?: number
  questionFailures?: VectorQuestionFailureVO[]
  knowledgeFailures?: VectorKnowledgeFailureVO[]
  deleteOutboxFailures?: VectorDeleteOutboxFailureVO[]
  errors?: string[]
  generatedAt?: string
}

export interface VectorIndexJobVO {
  id?: number
  jobNo?: string
  jobType?: string
  scopeType?: string
  scopeId?: string
  status?: string
  requestedCount?: number
  totalCount?: number
  successCount?: number
  failedCount?: number
  vectorUpdated?: number
  vectorDeleted?: number
  startedAt?: string
  finishedAt?: string
  durationMs?: number
  lastError?: string
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface VectorIndexJobQuery {
  jobType?: string
  status?: 'ALL' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  pageNo?: number
  pageSize?: number
}

export interface QuestionDuplicateConfigVO {
  maxBatchCheckCount: number
  maxRuleCandidateCount: number
  vectorSearchLimit: number
  embeddingBatchSize: number
  titleJaccardThreshold: number
  titleLevenshteinThreshold: number
  contentSimilarityThreshold: number
  semanticSimilarityThreshold: number
  semanticReviewThreshold: number
  semanticStrongThreshold: number
  semanticVectorWeight: number
  semanticTextWeight: number
  semanticMetadataWeight?: number
  semanticTagWeight?: number
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
