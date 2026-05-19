import type { PageQuery } from './api'

export type ResumeJobMatchStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | string

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
  status: ResumeJobMatchStatus
  errorMessage?: string
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
  strengths?: unknown
  gaps?: unknown
  resumeRisks?: unknown
  optimizationSuggestions?: unknown
  recommendedLearningTopics?: unknown
  recommendedInterviewTopics?: unknown
  rawResult?: unknown
  aiCallLogId?: number
  details?: ResumeJobMatchDetailItemVO[]
}
