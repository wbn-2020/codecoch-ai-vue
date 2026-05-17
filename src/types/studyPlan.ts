import type { PageQuery } from './api'

export type StudyPlanStatus = 'GENERATING' | 'ACTIVE' | 'FAILED' | 'ARCHIVED' | string
export type StudyTaskStatus = 'TODO' | 'DOING' | 'DONE' | 'COMPLETED' | 'SKIPPED' | string

export interface StudyPlanGenerateDTO {
  reportId: number
  resumeId?: number
  optimizeRecordId?: number
  targetPosition?: string
  industryDirection?: string
  expectedDurationDays?: number
  extraRequirements?: string
}

export interface StudyPlanQueryDTO extends PageQuery {
  planStatus?: StudyPlanStatus | ''
}

export interface StudyTaskStatusUpdateDTO {
  taskStatus: StudyTaskStatus
}

export interface StudyPlanGenerateVO {
  planId: number
  planStatus: StudyPlanStatus
  planTitle?: string
  failureReason?: string
}

export type SseEventName = 'start' | 'chunk' | 'delta' | 'metadata' | 'done' | 'error' | string

export interface SseEventVO {
  requestId?: string
  sessionId?: number
  message?: string
  content?: string
  index?: number
  messageId?: number
  aiCallLogId?: number
  fullContent?: string
  code?: string
  result?: unknown
  metadata?: Record<string, unknown>
  [key: string]: unknown
}

export interface StudyPlanListVO {
  id: number
  reportId: number
  sessionId?: number
  sourceType?: string
  targetPosition?: string
  industryDirection?: string
  planTitle?: string
  planSummary?: string
  planStatus: StudyPlanStatus
  durationDays?: number
  totalTaskCount?: number
  doneTaskCount?: number
  progressPercent?: number
  createdAt?: string
  updatedAt?: string
}

export interface StudyPlanDetailVO extends StudyPlanListVO {
  resumeId?: number
  optimizeRecordId?: number
  aiCallLogId?: number
  failureReason?: string
  tasks?: StudyTaskVO[]
}

export interface StudyPlanDailyViewVO {
  planId: number
  planTitle?: string
  date: string
  dayIndex: number
  totalTaskCount: number
  pendingTaskCount: number
  completedTaskCount: number
  skippedTaskCount: number
  completionRate: number
  tasks: StudyTaskVO[]
}

export interface StudyTaskVO {
  id: number
  planId: number
  stageNo?: number
  stageTitle?: string
  taskOrder?: number
  knowledgePoint?: string
  taskTitle?: string
  taskDescription?: string
  taskType?: string
  priority?: string
  estimatedHours?: number
  taskStatus: StudyTaskStatus
  relatedQuestionIds?: number[]
  relatedTags?: string[]
  resources?: string[]
  createdAt?: string
  updatedAt?: string
}
