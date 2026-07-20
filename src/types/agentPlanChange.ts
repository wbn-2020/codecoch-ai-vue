export type AgentReviewPlanDecisionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IGNORED'
  | 'SUPERSEDED'
  | string

export type AgentReviewPlanDecision = 'PENDING' | 'ACCEPTED' | 'IGNORED'

export type AgentPlanConfidenceLevel =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT'
  | string

export interface AgentReviewPlanDecisionSummaryVO {
  pendingCount?: number
  acceptedCount?: number
  ignoredCount?: number
  supersededCount?: number
}

export interface AgentReviewPlanSuggestionVO {
  id: number
  reviewId?: number
  reviewVersion?: number
  title?: string
  content?: string
  reason?: string
  intentType?: string
  targetScope?: string
  confidenceLevel?: AgentPlanConfidenceLevel
  fallback?: boolean
  decisionStatus?: AgentReviewPlanDecisionStatus
  decisionVersion?: number
  decidedAt?: string
  ignoredReason?: string
  previouslyIgnored?: boolean
  actionable?: boolean
}

export interface AgentReviewPlanSuggestionListVO {
  reviewId: number
  reviewVersion?: number
  reviewDate?: string
  sourceSnapshotHash?: string
  suggestions?: AgentReviewPlanSuggestionVO[]
  decisionSummary?: AgentReviewPlanDecisionSummaryVO
}

export interface AgentReviewPlanDecisionItemDTO {
  suggestionId: number
  decision: AgentReviewPlanDecision
  expectedDecisionVersion: number
  reason?: string
}

export interface AgentReviewPlanDecisionDTO {
  requestId?: string
  idempotencyKey: string
  expectedReviewVersion: number
  decisions: AgentReviewPlanDecisionItemDTO[]
}

export interface AgentPlanChangePreviewDTO {
  requestId?: string
  idempotencyKey: string
  expectedReviewVersion: number
  acceptedSuggestionIds: number[]
  targetDate: string
  maxTotalMinutes?: number
}

export interface AgentPlanChangeConfirmDTO {
  requestId?: string
  idempotencyKey: string
  previewVersion: number
  previewHash: string
  acknowledgedWarningCodes: string[]
}

export type AgentPlanChangeStatus =
  | 'PREVIEW_READY'
  | 'STALE'
  | 'CANCELLED'
  | 'CONFIRMED_WAITING_PLAN'
  | 'APPLYING'
  | 'APPLIED'
  | 'PARTIALLY_APPLIED'
  | 'APPLY_FAILED'
  | string

export type AgentPlanChangeType =
  | 'ADD_TASK'
  | 'CARRY_OVER_TASK'
  | 'REMOVE_OPEN_TASK'
  | 'RESCHEDULE_TASK'
  | 'CHANGE_PRIORITY'
  | string

export type AgentPlanChangeValidationStatus = 'PASS' | 'WARN' | 'BLOCKED' | string

export type AgentPlanChangeApplyStatus =
  | 'PENDING'
  | 'WAITING_PLAN'
  | 'APPLIED'
  | 'SKIPPED_DUPLICATE'
  | 'FAILED'
  | string

export interface AgentPlanTaskSnapshotDTO {
  taskId?: number
  agentRunId?: number
  targetJobId?: number
  candidateId?: string
  taskType?: string
  title?: string
  description?: string
  reason?: string
  priority?: string
  estimatedMinutes?: number
  relatedSkillCode?: string
  relatedSkillName?: string
  relatedBizType?: string
  relatedBizId?: number
  actionUrl?: string
  status?: string
  dueDate?: string
  planChangeItemId?: number
  updatedAt?: string
  deleted?: number
}

export interface AgentPlanChangeItemVO {
  id: number
  itemKey?: string
  changeType?: AgentPlanChangeType
  title?: string
  targetDate?: string
  before?: AgentPlanTaskSnapshotDTO | null
  after?: AgentPlanTaskSnapshotDTO | null
  dailyImpact?: string
  weekImpact?: string
  sourceReviewId?: number
  sourceSuggestionId?: number
  validationStatus?: AgentPlanChangeValidationStatus
  confidenceLevel?: AgentPlanConfidenceLevel
  fallback?: boolean
  applyStatus?: AgentPlanChangeApplyStatus
  warnings?: string[]
}

export interface AgentPlanChangeSummaryVO {
  addCount?: number
  removeCount?: number
  rescheduleCount?: number
  priorityChangeCount?: number
  beforeTaskCount?: number
  afterTaskCount?: number
  beforeMinutes?: number
  afterMinutes?: number
}

export interface AgentPlanChangePreviewVO {
  changeSetId: number
  reviewId?: number
  reviewVersion?: number
  targetJobId?: number | null
  targetDate?: string
  status?: AgentPlanChangeStatus
  previewVersion?: number
  previewHash?: string
  expiresAt?: string
  confirmable?: boolean
  resultSource?: string
  fallback?: boolean
  summary?: AgentPlanChangeSummaryVO
  items?: AgentPlanChangeItemVO[]
  warnings?: string[]
  blockers?: string[]
  confirmedAt?: string
  appliedAt?: string
  failureCode?: string
  failureMessage?: string
}

export interface AgentPlanChangeConfirmVO {
  changeSetId: number
  status?: AgentPlanChangeStatus
  confirmedAt?: string
  appliedAt?: string
  dailyPlanRunId?: number
  weekPlanId?: number
  weekSnapshotVersion?: number
  appliedItemCount?: number
  waitingItemCount?: number
  conflicts?: string[]
  message?: string
}

export interface AgentReviewPlanFields {
  reviewType?: string
  reviewVersion?: number
  sourceSnapshotHash?: string
  planSuggestions?: AgentReviewPlanSuggestionVO[]
  planDecisionSummary?: AgentReviewPlanDecisionSummaryVO
}

export interface AgentPlanChangeTaskOriginFields {
  planChangeItemId?: number | null
  planOriginType?: string | null
  planOriginId?: number | null
  userConfirmed?: boolean | null
}

export interface AgentPlanChangeWeekItemOriginFields {
  planChangeItemId?: number | null
  reviewConfirmed?: boolean | null
  sourceReviewId?: number | null
  reviewChangeType?: AgentPlanChangeType | null
}

export interface AgentPlanChangeRequestIdentity {
  requestId: string
  idempotencyKey: string
}

export interface AgentReviewPlanDecisionCommand {
  suggestion: AgentReviewPlanSuggestionVO
  decision: AgentReviewPlanDecision
  reason?: string
}

export interface AgentPlanChangePreviewCommand {
  acceptedSuggestionIds: number[]
  targetDate: string
  maxTotalMinutes: number
}
