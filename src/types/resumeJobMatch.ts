import type { PageQuery } from './api'

export type ResumeJobMatchStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | string
export type ResumeJobMatchTrustStatus = 'VERIFIED' | 'PARTIAL' | 'FALLBACK' | string

export interface ResumeJobMatchSchemaWarning {
  field?: string
  message?: string
  [key: string]: unknown
}

export interface ResumeJobMatchCreateDTO {
  resumeId: number
  targetJobId: number
  forceRefresh?: boolean
}

export interface ResumeJobMatchQueryDTO extends PageQuery {
  resumeId?: number
  targetJobId?: number
  status?: ResumeJobMatchStatus | ''
}

export interface ResumeJobMatchSubmitVO {
  reportId: number
  resumeId: number
  targetJobId: number
  jdAnalysisId?: number
  aiCallLogId?: number
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
  status: ResumeJobMatchStatus
  errorMessage?: string
  sourceType?: string
  sourceId?: number
  trustStatus?: ResumeJobMatchTrustStatus
  evidenceSummary?: string
  fallback?: boolean
  schemaWarnings?: ResumeJobMatchSchemaWarning[]
  schemaWarningCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeJobMatchReportListVO {
  reportId: number
  resumeId: number
  resumeTitle?: string
  targetJobId: number
  jobTitle?: string
  companyName?: string
  overallScore?: number
  techStackScore?: number
  projectExperienceScore?: number
  businessFitScore?: number
  communicationScore?: number
  status: ResumeJobMatchStatus
  summary?: string
  errorMessage?: string
  sourceType?: string
  sourceId?: number
  trustStatus?: ResumeJobMatchTrustStatus
  evidenceSummary?: string
  fallback?: boolean
  schemaWarnings?: ResumeJobMatchSchemaWarning[]
  schemaWarningCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeJobMatchDetailItemVO {
  id: number
  dimension?: string
  skillName?: string
  matchLevel?: string
  score?: number
  evidence?: string
  gapDescription?: string
  suggestion?: string
  createdAt?: string
  updatedAt?: string
}

export interface ResumeJobMatchReportDetailVO extends ResumeJobMatchReportListVO {
  userId?: number
  jdAnalysisId?: number
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
  strengths?: unknown
  gaps?: unknown
  resumeRisks?: unknown
  optimizationSuggestions?: unknown
  recommendedLearningTopics?: unknown
  recommendedInterviewTopics?: unknown
  aiCallLogId?: number
  details?: ResumeJobMatchDetailItemVO[]
}

export type ResumeJobMatchSseEventType =
  | 'start'
  | 'delta'
  | 'metadata'
  | 'progress'
  | 'result'
  | 'done'
  | 'error'
  | string

export interface ResumeJobMatchSseEvent {
  requestId?: string
  workflow?: string
  bizId?: number
  aiCallLogId?: number
  message?: string
  content?: string
  stage?: string
  code?: string
  result?: ResumeJobMatchReportDetailVO
  metadata?: Record<string, unknown>
  [key: string]: unknown
}
