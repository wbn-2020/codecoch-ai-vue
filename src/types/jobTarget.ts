import type { PageQuery } from './api'

export type TargetJobParseStatus = 'NOT_PARSED' | 'PARSING' | 'PARSED' | 'FAILED' | string

export interface TargetJobQueryDTO extends PageQuery {
  keyword?: string
  status?: number
  current?: boolean
}

export interface TargetJobSaveDTO {
  jobTitle: string
  companyName?: string
  jobLevel?: string
  jdText: string
  jdSource?: string
}

export interface JobDescriptionParseDTO {
  forceRefresh?: boolean
  userTargetDirection?: string
}

export interface TargetJobVO {
  id: number
  userId?: number
  jobTitle: string
  companyName?: string
  jobLevel?: string
  jdText?: string
  jdSource?: string
  currentFlag?: number
  status?: number
  parseStatus?: TargetJobParseStatus
  parseErrorMessage?: string
  analysisSummary?: string
  requiredSkills?: unknown
  interviewFocusPoints?: unknown
  createdAt?: string
  updatedAt?: string
}

export interface JobDescriptionAnalysisVO {
  id: number
  targetJobId: number
  userId?: number
  jobTitle?: string
  companyName?: string
  jobLevel?: string
  responsibilities?: unknown
  requiredSkills?: unknown
  bonusSkills?: unknown
  techStackKeywords?: unknown
  businessKeywords?: unknown
  experienceRequirement?: string
  projectExperienceRequirement?: string
  interviewFocusPoints?: unknown
  skillWeights?: unknown
  summary?: string
  rawResult?: unknown
  aiCallLogId?: number
  parseStatus?: TargetJobParseStatus
  parseErrorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export type JobTargetParseSseEventType =
  | 'start'
  | 'delta'
  | 'metadata'
  | 'progress'
  | 'result'
  | 'done'
  | 'error'
  | string

export interface JobTargetParseSseEvent {
  requestId?: string
  workflow?: string
  bizId?: number
  aiCallLogId?: number
  message?: string
  content?: string
  stage?: string
  code?: string
  result?: JobDescriptionAnalysisVO
  metadata?: Record<string, unknown>
  [key: string]: unknown
}
