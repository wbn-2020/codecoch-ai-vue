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

export const SUGGESTION_SCHEMA_VERSION = 'V4_TRUSTED_RESULT_V1' as const

export type SuggestionSchemaVersion = typeof SUGGESTION_SCHEMA_VERSION | (string & {})

export type SuggestionResultSource = 'LLM' | 'RULE' | 'MOCK' | 'FALLBACK' | 'MANUAL' | (string & {})

export type SuggestionConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | (string & {})

export type SuggestionTrustStatus =
  | 'VERIFIED'
  | 'PARTIAL'
  | 'FALLBACK'
  | 'DISABLED'
  | 'STALE'
  | 'UNKNOWN'
  | (string & {})

export type SuggestionSourceType =
  | 'TARGET_JOB'
  | 'JD_ANALYSIS'
  | 'RESUME_VERSION'
  | 'RESUME_MATCH'
  | 'RESUME_JOB_MATCH'
  | 'MATCH_REPORT'
  | 'PROJECT_EVIDENCE'
  | 'INTERVIEW_SESSION'
  | 'INTERVIEW_REPORT'
  | 'INTERVIEW_ANSWER'
  | 'ABILITY_PROFILE'
  | 'SKILL_PROFILE'
  | 'PRACTICE_RECORD'
  | 'QUESTION_RECOMMENDATION'
  | 'JOB_APPLICATION'
  | 'JOB_APPLICATION_EVENT'
  | 'JOB_EXPERIMENT'
  | 'JOB_EXPERIMENT_REVIEW'
  | 'AGENT_TASK'
  | 'AGENT_RUN'
  | 'QUESTION_PRACTICE'
  | 'WRONG_QUESTION_REVIEW'
  | 'INTERVIEW'
  | 'RESUME_OPTIMIZE'
  | 'RESUME_OPTIMIZE_RECORD'
  | 'STUDY_TASK'
  | 'REPORT_REVIEW'
  | 'SKILL_REVIEW'
  | 'KNOWLEDGE_REVIEW'
  | 'TRAINING_MATERIAL'
  | 'APPLICATION_FOLLOW_UP'
  | 'JOB_COACH_AGENT_TASK'
  | 'KNOWLEDGE_DOCUMENT'
  | 'KNOWLEDGE_CHUNK'
  | 'KNOWLEDGE_ASK'
  | 'AGENT_MEMORY'
  | 'AI_RESULT_FEEDBACK'
  | (string & {})

export const SUGGESTION_SOURCE_TYPE_LABELS: Record<string, string> = {
  TARGET_JOB: '目标岗位',
  JD_ANALYSIS: '岗位分析',
  RESUME_VERSION: '简历版本',
  RESUME_MATCH: '简历匹配报告',
  RESUME_JOB_MATCH: '简历匹配报告',
  MATCH_REPORT: '简历匹配报告',
  PROJECT_EVIDENCE: '项目证据',
  INTERVIEW_SESSION: '面试会话',
  INTERVIEW_REPORT: '面试报告',
  INTERVIEW_ANSWER: '面试回答',
  ABILITY_PROFILE: '能力画像',
  SKILL_PROFILE: '能力画像',
  PRACTICE_RECORD: '练习记录',
  QUESTION_RECOMMENDATION: '题目推荐',
  JOB_APPLICATION: '投递记录',
  JOB_APPLICATION_EVENT: '投递事件',
  JOB_EXPERIMENT: '求职实验',
  JOB_EXPERIMENT_REVIEW: '求职实验复盘',
  AGENT_TASK: 'Agent 任务',
  AGENT_RUN: 'Agent 运行',
  QUESTION_PRACTICE: '题库练习',
  WRONG_QUESTION_REVIEW: '错题复习',
  INTERVIEW: '面试会话',
  RESUME_OPTIMIZE: '简历优化记录',
  RESUME_OPTIMIZE_RECORD: '简历优化记录',
  STUDY_TASK: '学习任务',
  REPORT_REVIEW: '报告复盘',
  SKILL_REVIEW: '能力复盘',
  KNOWLEDGE_REVIEW: '知识复盘',
  TRAINING_MATERIAL: '训练素材',
  APPLICATION_FOLLOW_UP: '投递跟进',
  JOB_COACH_AGENT_TASK: 'Agent 任务',
  KNOWLEDGE_DOCUMENT: '知识资料',
  KNOWLEDGE_CHUNK: '知识片段',
  KNOWLEDGE_ASK: '知识问答',
  AGENT_MEMORY: '长期记忆',
  AI_RESULT_FEEDBACK: '用户反馈'
}

export const getSuggestionSourceTypeLabel = (sourceType?: string | null): string => {
  const normalized = String(sourceType || '').trim().toUpperCase()
  return SUGGESTION_SOURCE_TYPE_LABELS[normalized] || '其他来源'
}

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
    citationWarning?: string
    minScore?: number
    lowConfidence?: boolean
    memoryType?: string
    memoryStatus?: string
    confirmed?: boolean
    confirmedAt?: string
    disabledAt?: string
    expiresAt?: string
    activeBlockedReason?: string
    confidence?: number
    enabled?: boolean
    active?: boolean
    memorySourceType?: string
    memorySourceId?: number | string | null
    disabledReason?: string
    candidate?: boolean
    deleted?: boolean
    stale?: boolean
    [key: string]: unknown
  }
}

export interface SuggestionTraceVO {
  agentRunId?: number | null
  traceId?: string | null
  aiCallLogId?: number | null
  promptVersionId?: number | null
  asyncTaskId?: number | null
}

export interface SuggestionFeedbackStateVO {
  submitted?: boolean
  feedbackType?:
    | 'HELPFUL'
    | 'NOT_HELPFUL'
    | 'TOO_HARD'
    | 'TOO_EASY'
    | 'IRRELEVANT'
    | 'COMPLETED'
    | 'SKIPPED'
    | (string & {})
    | null
  comment?: string | null
  updatedAt?: string | null
}

export interface SuggestionNextActionVO {
  actionUrl?: string
  path?: string
  actionType?: string | null
  label?: string
}

export type SuggestionQualityGateStatus = 'PASS' | 'WARN' | 'BLOCKED' | (string & {})

export type SuggestionStrength =
  | 'STRONG'
  | 'NORMAL'
  | 'WEAK'
  | 'FALLBACK'
  | 'MOCK'
  | 'LOW_SAMPLE'
  | (string & {})

export interface SuggestionQualityGateVO {
  gateStatus: SuggestionQualityGateStatus
  suggestionStrength: SuggestionStrength
  reasons: string[]
  blockedConclusions?: string[]
  requiredEvidenceTypes?: string[]
  missingEvidenceTypes?: string[]
  sampleSize?: number | null
  minSampleSize?: number | null
}

export interface ExplainableSuggestionVO {
  id: string
  schemaVersion?: SuggestionSchemaVersion
  scene: SuggestionScene
  bizType: SuggestionBizType
  bizId?: number | string | null
  title?: string
  content?: string
  reason?: string
  confidenceLevel: SuggestionConfidenceLevel
  resultSource: SuggestionResultSource
  trustStatus?: SuggestionTrustStatus
  fallback: boolean
  degraded?: boolean
  degradedReason?: string
  mock?: boolean
  mockReason?: string
  fallbackReason?: string
  evidenceSources: EvidenceSourceVO[]
  evidences?: EvidenceSourceVO[]
  trace?: SuggestionTraceVO
  nextAction?: SuggestionNextActionVO
  nextActions?: SuggestionNextActionVO[]
  sampleInsufficient?: boolean
  sampleWarning?: string
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  qualityGate?: SuggestionQualityGateVO
  confidence?: SuggestionConfidenceLevel | number | string | null
  why?: string
  feedbackState?: SuggestionFeedbackStateVO
  pagePath?: string
}
