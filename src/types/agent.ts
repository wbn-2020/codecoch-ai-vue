import type { PageQuery } from '@/types/api'

export type AgentTaskType =
  | 'QUESTION_PRACTICE'
  | 'WRONG_QUESTION_REVIEW'
  | 'INTERVIEW'
  | 'RESUME_OPTIMIZE'
  | 'STUDY_TASK'
  | 'REPORT_REVIEW'
  | 'SKILL_REVIEW'
  | string

export type AgentTaskPriority = 'HIGH' | 'MEDIUM' | 'LOW' | string
export type AgentTaskStatus = 'TODO' | 'DOING' | 'DONE' | 'SKIPPED' | 'EXPIRED' | string
export type AgentRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELED' | string
export type AgentTriggerType = 'MANUAL' | 'AUTO' | string

export interface AgentSkillRefVO {
  code?: string
  name?: string
}

export interface AgentTaskVO {
  id: number
  agentRunId?: number
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
  relatedSkillCode?: string
  relatedSkillName?: string
  relatedBizType?: string
  relatedBizId?: number
  actionUrl?: string
  status?: AgentTaskStatus
  skipReason?: string
  dueDate?: string
  startedAt?: string
  completedAt?: string
  skippedAt?: string
  createdAt?: string
}

export interface DailyPlanVO {
  runId?: number | null
  targetJobId?: number
  targetJobTitle?: string
  date?: string
  summary?: string | null
  status?: AgentRunStatus
  errorCode?: string | null
  errorMessage?: string | null
  durationMs?: number
  focusSkills?: AgentSkillRefVO[]
  tasks?: AgentTaskVO[]
  empty?: boolean
  emptyMessage?: string
  startedAt?: string
  finishedAt?: string
  createdAt?: string
}

export interface DailyPlanGenerateDTO {
  targetJobId?: number
  date?: string
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

export interface AgentFeedbackDTO {
  agentTaskId?: number
  agentRunId?: number
  feedbackType: 'HELPFUL' | 'NOT_HELPFUL' | 'TOO_HARD' | 'TOO_EASY' | 'IRRELEVANT' | string
  comment?: string
}

export interface AgentFeedbackVO extends AgentFeedbackDTO {
  id: number
  userId?: number
  createdAt?: string
  updatedAt?: string
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
  tokenInput?: number
  tokenOutput?: number
  durationMs?: number
  inputSnapshot?: Record<string, unknown> | unknown[] | string | null
  output?: Record<string, unknown> | unknown[] | string | null
  rawOutputText?: string | null
  errorCode?: string | null
  errorMessage?: string | null
  tasks?: AgentTaskVO[]
  startedAt?: string
  finishedAt?: string
  createdAt?: string
}

export interface AdminAgentRunQueryDTO extends PageQuery {
  userId?: number
  agentType?: string
  status?: AgentRunStatus | ''
  triggerType?: AgentTriggerType | ''
  startTime?: string
  endTime?: string
}

export interface AdminAgentTaskQueryDTO extends AgentTaskQueryDTO {
  userId?: number
}
