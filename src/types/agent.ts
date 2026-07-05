import type { PageQuery } from '@/types/api'

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
export type AgentTaskStatus = 'TODO' | 'DOING' | 'DONE' | 'SKIPPED' | 'EXPIRED' | string
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED' | string
export type AgentTriggerType = 'MANUAL' | 'AUTO' | string
export type AgentTrustStatus = 'VERIFIED' | 'PARTIAL' | 'FALLBACK' | string
export type AgentRunResultSource = 'LLM' | 'MOCK' | 'FALLBACK' | string
export type AgentCoachActionType = 'EXPLAIN_RECOMMENDATION' | 'REVIEW_COMPLETED_TASK'
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
  traceId?: string | null
  aiCallLogId?: number | null
  promptVersionId?: number | null
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
  trustStatus?: AgentTrustStatus | null
  evidenceSummary?: string | null
  fallback?: boolean | null
  reviewId?: number | null
  reviewSummary?: string | null
  reviewNextActions?: string[]
  reviewSource?: 'RULE' | 'LLM' | 'FALLBACK' | string | null
  reviewSourceLabel?: string | null
  reviewNote?: string | null
  status?: AgentTaskStatus
  skipReason?: string
  dueDate?: string
  startedAt?: string
  completedAt?: string
  skippedAt?: string
  createdAt?: string
  activationHandoffs?: ActivationHandoffVO[]
}

export interface DailyPlanVO {
  runId?: number | null
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
  skipReason?: string
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
