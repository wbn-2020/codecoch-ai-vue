export type SuggestionScene =
  | 'AGENT_TASK_RECOMMENDATION'
  | 'JOB_EXPERIMENT_STRATEGY'
  | 'AGENT_TASK'
  | 'JOB_EXPERIMENT'
  | (string & {})

export type SuggestionBizType =
  | 'AGENT_TASK'
  | 'JOB_EXPERIMENT'
  | 'JOB_EXPERIMENT_REVIEW'
  | 'JOB_SEARCH_EXPERIMENT'
  | (string & {})

export type SuggestionResultSource = 'LLM' | 'RULE' | 'MOCK' | 'FALLBACK' | (string & {})

export type SuggestionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | (string & {})

export type SuggestionTrustStatus =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'FALLBACK'
  | 'DISABLED'
  | 'STALE'
  | (string & {})

export interface EvidenceSourceVO {
  id?: string | number
  title?: string
  label?: string
  sourceLabel?: string
  sourceTitle?: string
  sourceType?: string
  sourceId?: number | string | null
  summary?: string
  evidenceSummary?: string
  sourceSummary?: string
  sourceUpdatedAt?: string
  trustStatus?: SuggestionTrustStatus
  actionUrl?: string
  metadata?: {
    documentId?: number
    chunkId?: number
    chunkIndex?: number
    documentType?: string
    sourceRef?: string
    score?: number
    matchType?: string
    citationValid?: boolean
    answerGrounded?: boolean
    insufficientReferences?: boolean
    memoryType?: string
    confidence?: number
    enabled?: boolean
    active?: boolean
    memorySourceType?: string
    memorySourceId?: number | string | null
    deleted?: boolean
    stale?: boolean
  }
}

export interface SuggestionTraceVO {
  agentRunId?: number | null
  traceId?: string | null
  aiCallLogId?: number | null
  promptVersionId?: number | null
}

export interface SuggestionFeedbackStateVO {
  submitted?: boolean
  feedbackType?: 'HELPFUL' | 'NOT_HELPFUL' | 'TOO_HARD' | 'TOO_EASY' | 'IRRELEVANT' | (string & {}) | null
  comment?: string | null
  updatedAt?: string | null
}

export interface SuggestionNextActionVO {
  actionUrl?: string
  actionType?: string | null
  label?: string
}

export interface ExplainableSuggestionVO {
  id: string
  scene: SuggestionScene
  bizType: SuggestionBizType
  bizId?: number | string | null
  title?: string
  content?: string
  reason?: string
  confidenceLevel: SuggestionConfidenceLevel
  resultSource: SuggestionResultSource
  fallback: boolean
  evidenceSources: EvidenceSourceVO[]
  trace?: SuggestionTraceVO
  nextAction?: SuggestionNextActionVO
  sampleInsufficient?: boolean
  sampleWarning?: string
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  feedbackState?: SuggestionFeedbackStateVO
  pagePath?: string
}
