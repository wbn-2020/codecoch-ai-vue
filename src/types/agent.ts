import type { PageQuery } from '@/types/api'
import type { EvidenceSourceVO, SuggestionQualityGateVO } from '@/types/suggestion'

export type AgentTaskType =
  | 'QUESTION_PRACTICE'
  | 'WRONG_QUESTION_REVIEW'
  | 'INTERVIEW'
  | 'RESUME_OPTIMIZE'
  | 'STUDY_TASK'
  | 'REPORT_REVIEW'
  | 'SKILL_REVIEW'
  | 'APPLICATION_FOLLOW_UP'
  | string

export type AgentTaskPriority = 'HIGH' | 'MEDIUM' | 'LOW' | string
export type AgentTaskStatus = 'TODO' | 'DOING' | 'DONE' | 'DEFERRED' | 'SKIPPED' | 'EXPIRED' | string
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED' | string
export type AgentTriggerType = 'MANUAL' | 'AUTO' | string
export type AgentTrustStatus = 'VERIFIED' | 'PARTIAL' | 'FALLBACK' | 'DISABLED' | 'STALE' | 'UNKNOWN' | string
export type AgentRunResultSource = 'LLM' | 'MOCK' | 'FALLBACK' | string
export type AgentCoachActionType = 'EXPLAIN_RECOMMENDATION' | 'REVIEW_COMPLETED_TASK'
export type AgentMemoryStatus =
  | 'CANDIDATE'
  | 'PENDING_CONFIRMATION'
  | 'ACTIVE'
  | 'CONFIRMED'
  | 'LOW_CONFIDENCE'
  | 'DISABLED'
  | 'DELETED'
  | 'STALE'
  | string
export type AgentMemoryLifecycle =
  | 'candidate'
  | 'pending-confirmation'
  | 'active'
  | 'low-confidence'
  | 'stale'
  | 'disabled'
  | 'deleted'
  | 'partial'
export type AgentMemoryImpactScope =
  | 'AGENT_TASK'
  | 'APPLICATION_PACKAGE'
  | 'INTERVIEW_TRAINING'
  | 'JOB_EXPERIMENT_REVIEW'
  | 'QUESTION_RECOMMENDATION'
  | 'RESUME_PROJECT_SUGGESTION'
  | string
export type AgentMetricEventCode =
  | 'task_completed'
  | 'feedback_cta_clicked'
  | 'reminder_shown'
  | 'reminder_clicked'
  | 'reminder_target_invalid'
  | 'interview_report_next_action_shown'
  | 'interview_report_next_action_clicked'
  | 'ai_coach_action_started'
  | 'ai_coach_action_succeeded'
  | 'ai_coach_action_failed'
  | 'ai_coach_action_canceled'
  | 'focus_session_started'
  | 'focus_session_finished'
  | 'focus_session_canceled'
  | string

export interface AgentSkillRefVO {
  code?: string
  name?: string
}

export type AgentActionSourceType =
  | 'application'
  | 'applicationPackage'
  | 'interviewReport'
  | 'experimentReview'
  | 'knowledgeGap'
  | 'memoryPreference'
  | 'agentTask'
  | 'agentRun'
  | 'dailyPlan'
  | 'fallback'
  | string

export type AgentActionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string

export type AgentPlanLayerKey = 'today' | 'week' | 'nextExperiment'

export interface AgentActionSourceVO {
  sourceType: AgentActionSourceType
  sourceId?: number | string | null
  sourceTitle: string
  reason: string
  evidence: string[]
  confidence: AgentActionConfidence
  fallback: boolean
}

export interface AgentPlanActionVO extends AgentActionSourceVO {
  key: string
  id?: number | string | null
  title: string
  description?: string
  status?: AgentTaskStatus | string
  priority?: AgentTaskPriority | string
  actionPath?: string
  dueText?: string
  estimatedMinutes?: number | null
}

export interface AgentPlanLayerVO {
  key: AgentPlanLayerKey
  title: string
  description: string
  actions: AgentPlanActionVO[]
  fallback: boolean
  fallbackReason?: string
}

export interface AgentWeekPlanVO {
  planDate?: string
  targetJobId?: number
  targetJobTitle?: string
  today: AgentPlanLayerVO
  week: AgentPlanLayerVO
  nextExperiment: AgentPlanLayerVO
}

export interface AgentWeekPlanBackendItemVO {
  id?: number
  weekPlanId?: number
  layer?: 'TODAY' | 'WEEK' | 'NEXT_EXPERIMENT' | string
  actionType?: string
  title?: string
  description?: string
  reason?: string
  relatedBizType?: string
  relatedBizId?: number | null
  relatedBizTitle?: string
  agentTaskId?: number | null
  priority?: AgentTaskPriority
  confidence?: number | string | null
  confidenceLevel?: AgentActionConfidence | null
  trustStatus?: AgentTrustStatus | null
  fallback?: boolean | null
  fallbackReason?: string | null
  traceId?: string | null
  snapshotVersion?: number
  sampleInsufficient?: boolean | null
  sampleWarning?: string | null
  itemStatus?: AgentTaskStatus | string
  plannedDate?: string
  dueDate?: string
  actionUrl?: string
  evidence?: string[]
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface AgentWeekPlanBackendVO {
  id?: number
  targetJobId?: number | null
  agentRunId?: number | null
  planDate?: string
  weekStartDate?: string
  weekEndDate?: string
  planStatus?: string
  summary?: string
  focusJson?: string
  traceId?: string
  resultSource?: AgentRunResultSource | 'RULE' | string
  fallback?: boolean | null
  fallbackReason?: string | null
  snapshotVersion?: number
  dataSource?: 'BACKEND_PERSISTED' | string
  generatedAt?: string
  refreshedAt?: string
  createdAt?: string
  updatedAt?: string
  items?: AgentWeekPlanBackendItemVO[]
}

export interface AgentWeekPlanGenerateDTO {
  targetJobId?: number
  date?: string
  forceRegenerate?: boolean
  requestId?: string
  idempotencyKey?: string
}

export interface AgentPlanAdjustmentVO {
  id?: number
  weekPlanId?: number
  weekPlanItemId?: number | null
  agentTaskId?: number | null
  adjustmentType?: string
  fromStatus?: string
  toStatus?: string
  reason?: string
  traceId?: string
  snapshotVersion?: number
  sourceType?: string
  sourceId?: number | null
  occurredAt?: string
  metadataJson?: string
  createdAt?: string
}

export interface AgentPlanInfluenceVO {
  id?: number
  weekPlanId?: number
  weekPlanItemId?: number | null
  sourceType?: string
  sourceId?: number | null
  sourceTitle?: string
  consumerType?: string
  consumerId?: number | null
  usageReferenceId?: number | null
  usageScene?: string
  influenceStrength?: string
  confidence?: number | string | null
  traceId?: string
  snapshotVersion?: number
  snapshotHash?: string
  fallback?: boolean | null
  createdAt?: string
}

export interface ActivationHandoffVO {
  code?: string
  stage?: string
  firstOccurrence?: boolean | null
  runId?: number | null
  taskId?: number | null
  targetJobId?: number | null
  planDate?: string | null
  occurredAt?: string | null
  requestId?: string | null
}

export interface AgentTaskVO {
  id: number
  agentRunId?: number | null
  runId?: number | null
  schemaVersion?: string | null
  traceId?: string | null
  aiCallLogId?: number | null
  promptVersionId?: number | null
  asyncTaskId?: number | null
  resultSource?: AgentRunResultSource | null
  resultSourceLabel?: string | null
  mock?: boolean | null
  errorCode?: string | null
  errorMessage?: string | null
  targetJobId?: number
  targetJobTitle?: string
  userId?: number
  username?: string
  taskType?: AgentTaskType
  title?: string
  description?: string
  reason?: string
  priority?: AgentTaskPriority
  estimatedMinutes?: number
  estimatedEffortMinutes?: number | null
  relatedSkillCode?: string
  relatedSkillName?: string
  relatedBizType?: string
  relatedBizId?: number
  actionUrl?: string
  actionType?: string | null
  sourceType?: string | null
  sourceId?: number | null
  sourceTitle?: string | null
  confidence?: AgentActionConfidence | number | null
  trustStatus?: AgentTrustStatus | null
  evidenceSummary?: string | null
  evidenceSources?: EvidenceSourceVO[]
  qualityGate?: SuggestionQualityGateVO | null
  fallback?: boolean | null
  reviewId?: number | null
  reviewSummary?: string | null
  reviewNextActions?: string[]
  reviewSource?: 'RULE' | 'LLM' | 'FALLBACK' | string | null
  reviewSourceLabel?: string | null
  reviewNote?: string | null
  status?: AgentTaskStatus
  skipReason?: string
  deferReason?: string | null
  dueDate?: string
  startedAt?: string
  completedAt?: string
  deferredAt?: string
  skippedAt?: string
  createdAt?: string
  activationHandoffs?: ActivationHandoffVO[]
}

export interface DailyPlanVO {
  runId?: number | null
  schemaVersion?: string | null
  traceId?: string | null
  aiCallLogId?: number | null
  promptVersionId?: number | null
  resultSource?: AgentRunResultSource | null
  resultSourceLabel?: string | null
  fallback?: boolean | null
  mock?: boolean | null
  evidenceSources?: EvidenceSourceVO[]
  qualityGate?: SuggestionQualityGateVO | null
  targetJobId?: number
  targetJobTitle?: string
  date?: string
  planDate?: string
  summary?: string | null
  status?: AgentRunStatus
  requestId?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  failureAction?: string | null
  failureActionLabel?: string | null
  failureSuggestion?: string | null
  durationMs?: number
  focusSkills?: AgentSkillRefVO[]
  tasks?: AgentTaskVO[]
  weekPlan?: AgentWeekPlanVO | null
  empty?: boolean
  emptyMessage?: string
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  startedAt?: string
  finishedAt?: string
  createdAt?: string
  activationHandoffs?: ActivationHandoffVO[]
}

export interface DailyPlanGenerateDTO {
  targetJobId?: number
  date?: string
  requestId?: string
  idempotencyKey?: string
  executionToken?: string
  maxTotalMinutes?: number
  taskCount?: number
  forceRegenerate?: boolean
}

export interface AgentTodayTaskQuery {
  date?: string
  targetJobId?: number
  status?: AgentTaskStatus | ''
}

export interface AgentTodayTaskVO {
  date?: string
  total?: number
  doneCount?: number
  todoCount?: number
  skippedCount?: number
  estimatedTotalMinutes?: number
  completedMinutes?: number
  tasks?: AgentTaskVO[]
}

export interface AgentTaskQueryDTO extends PageQuery {
  startDate?: string
  endDate?: string
  targetJobId?: number
  taskType?: AgentTaskType | ''
  status?: AgentTaskStatus | ''
  priority?: AgentTaskPriority | ''
}

export interface AgentTaskCompleteDTO {
  note?: string
}

export interface AgentTaskSkipDTO {
  skipReason: string
}

export interface AgentTaskDeferDTO {
  deferAt?: string
  deferReason: string
  feedbackSummary?: string
}

export interface AgentMemoryImpactPreview {
  scopes: AgentMemoryImpactScope[]
  affectedActions: string[]
  allowsAgentContext: boolean
  contextEffect: string
  disableOrDeleteFallback: string
  evidenceBoundary: string
}

export interface AgentContextImpactConsumerVO {
  consumerType?: string
  consumerId?: number
  traceId?: string
  usageScene?: string
  usageStrength?: 'WEAK' | 'MEDIUM' | 'STRONG' | string
  confidence?: number
  snapshotHash?: string
  historical?: boolean
  createdAt?: string
  summary?: string
}

export interface AgentContextImpactPreviewVO {
  sourceType?: string
  sourceId?: number
  sourceTitle?: string
  referenceCount?: number
  recentReferenceCount?: number
  affectedModules?: string[]
  affectedConsumers?: AgentContextImpactConsumerVO[]
  futureContextImpact?: boolean
  historicalOnly?: boolean
  safeToDisable?: boolean
  warnings?: string[]
  recommendedActions?: string[]
  previewSource?: 'BACKEND_REFERENCES' | 'ESTIMATED' | string
  resultSource?: 'BACKEND_REFERENCES' | 'ESTIMATED' | string
  generatedAt?: string
  fallbackReason?: string
}

export interface AgentMemoryVO {
  id: number
  memoryType?: string
  content?: string
  sourceType?: string
  sourceId?: number
  sourceSummary?: string
  confidence?: number
  enabled?: number
  memoryStatus?: AgentMemoryStatus
  trustStatus?: AgentTrustStatus
  confirmedAt?: string
  confirmedBy?: number | string
  disabledAt?: string
  disabledReason?: string
  deletedAt?: string
  expiresAt?: string
  stale?: boolean
  lowConfidence?: boolean
  canBeEvidence?: boolean
  evidenceTrustStatus?: AgentTrustStatus
  lifecycle?: AgentMemoryLifecycle
  pendingConfirmation?: boolean
  canEnterAgentContext?: boolean
  impactScopes?: AgentMemoryImpactScope[]
  impactPreview?: AgentMemoryImpactPreview
  riskFlags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface AgentMemoryQueryDTO extends PageQuery {
  memoryType?: string
  enabled?: number
}

export interface AgentMemoryCreateDTO {
  memoryType?: string
  content: string
  sourceType?: string
  sourceId?: number
  confidence?: number
}

export interface AgentCoachActionDTO {
  taskId: number
  actionType: AgentCoachActionType
  requestId?: string
  idempotencyKey?: string
}

export interface AgentCoachActionVO {
  actionType?: AgentCoachActionType | string
  taskId?: number
  summary?: string | null
  reasons?: string[]
  evidenceRefs?: string[]
  nextAction?: string | null
  requestId?: string | null
  traceId?: string | null
  idempotencyKey?: string | null
  resultSource?: AgentRunResultSource | null
  aiCallLogId?: number | null
  latencyMs?: number | null
  estimatedCost?: number | null
}

export interface AgentFeedbackDTO {
  agentTaskId?: number
  agentRunId?: number
  feedbackType: AgentFeedbackType
  comment?: string
}

export type AgentFeedbackType = 'HELPFUL' | 'NOT_HELPFUL' | 'TOO_HARD' | 'TOO_EASY' | 'IRRELEVANT' | string

export interface AgentFeedbackVO extends AgentFeedbackDTO {
  id: number
  createdAt?: string
  updatedAt?: string
}

export interface AgentMetricEventDTO {
  eventCode: AgentMetricEventCode
  idempotencyKey?: string
  taskId?: number
  runId?: number
  planDate?: string
  targetJobId?: number
  requestId?: string
  sourcePage?: string
  targetPath?: string
  notificationId?: string
  bizType?: string
  bizId?: string
  occurredAt?: string
  metadata?: Record<string, unknown>
}

export interface AgentMetricAckVO {
  eventId?: string
  eventCode?: string
  acceptedAt?: string
}

export interface AgentRunDetailVO {
  id: number
  userId?: number
  username?: string
  agentType?: string
  targetJobId?: number
  targetJobTitle?: string
  planDate?: string
  triggerType?: AgentTriggerType
  status?: AgentRunStatus
  summary?: string | null
  focusSkills?: Array<{ code?: string; name?: string }>
  promptType?: string
  promptVersionId?: number
  modelName?: string
  traceId?: string
  aiCallLogId?: number
  resultSource?: AgentRunResultSource | null
  resultSourceLabel?: string | null
  fallback?: boolean | null
  mock?: boolean | null
  tokenInput?: number
  tokenOutput?: number
  durationMs?: number
  errorCode?: string | null
  errorMessage?: string | null
  tasks?: AgentTaskVO[]
  startedAt?: string
  finishedAt?: string
  createdAt?: string
}

export interface AdminAgentRunDetailVO extends AgentRunDetailVO {
  inputSnapshot?: Record<string, unknown> | unknown[] | string | null
  inputSnapshotJson?: string | null
  output?: Record<string, unknown> | unknown[] | string | null
  outputJson?: string | null
  rawOutputText?: string | null
  rawAvailable?: boolean
  rawAccessPermission?: string
}

export interface AdminAgentRunQueryDTO extends PageQuery {
  userId?: number
  agentType?: string
  status?: AgentRunStatus | ''
  triggerType?: AgentTriggerType | ''
  traceId?: string
  aiCallLogId?: number
  startDate?: string
  endDate?: string
  startTime?: string
  endTime?: string
}

export interface AdminAgentTaskQueryDTO extends AgentTaskQueryDTO {
  userId?: number
}
