import type { PageQuery } from './api'

export interface ResumeQueryDTO extends PageQuery {
  keyword?: string
}

export interface ResumeVO {
  id: number
  resumeName: string
  title?: string
  realName?: string
  targetPosition?: string
  skills?: string
  skillStack?: string
  summary?: string
  workExperience?: string
  educationExperience?: string
  isDefault: number
  status: number
  projectCount?: number
  updatedAt?: string
  createdAt?: string
}

export interface ResumeProjectVO {
  id?: number
  projectId: number
  resumeId?: number
  projectName: string
  projectTime?: string
  projectPeriod?: string
  projectBackground?: string
  description?: string
  techStack?: string
  role?: string
  responsibility?: string
  coreFeatures?: string
  highlights?: string
  technicalChallenges?: string
  technicalDifficulties?: string
  optimizationResult?: string
  optimizationResults?: string
  extraInfo?: string
  sort?: number
  sortOrder?: number
  createdAt?: string
  updatedAt?: string
}

export interface ResumeDetailVO {
  id: number
  title?: string
  realName?: string
  email?: string
  phone?: string
  summary?: string
  resumeName: string
  targetPosition?: string
  skills?: string
  skillStack?: string
  workSummary?: string
  workExperience?: string
  education?: string
  educationExperience?: string
  isDefault: number
  status: number
  projects?: ResumeProjectVO[]
  createdAt?: string
  updatedAt?: string
}

export interface ResumeCreateDTO {
  resumeName: string
  title?: string
  realName?: string
  email?: string
  phone?: string
  summary?: string
  targetPosition?: string
  skills: string
  skillStack?: string
  workSummary?: string
  workExperience?: string
  education?: string
  educationExperience?: string
  isDefault?: number
}

export type ResumeUpdateDTO = ResumeCreateDTO

export interface ResumeProjectDTO {
  projectName: string
  projectTime?: string
  projectPeriod?: string
  projectBackground?: string
  description?: string
  techStack?: string
  role?: string
  responsibility?: string
  coreFeatures?: string
  highlights?: string
  technicalChallenges?: string
  technicalDifficulties?: string
  optimizationResult?: string
  optimizationResults?: string
  extraInfo?: string
  sort?: number
  sortOrder?: number
}

export interface SetDefaultResumeVO {
  id: number
  isDefault: number
  updatedAt: string
}

export type ResumeParseStatus = 'PENDING' | 'PARSING' | 'SUCCESS' | 'FAILED' | 'WAIT_CONFIRM'

export type ResumeOptimizeStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED'

export type ResumeJsonValue = string | number | boolean | null | unknown[] | Record<string, unknown>

export interface ResumeUploadVO {
  fileId: number
  analysisRecordId: number
  resumeId?: number | null
  parseStatus: ResumeParseStatus
  originalFilename?: string
  fileSize?: number
  fileExt?: string
  message?: string
}

export interface ResumeParseStatusVO {
  analysisRecordId: number
  resumeId?: number | null
  fileId?: number
  parseStatus: ResumeParseStatus
  errorMessage?: string
  message?: string
  updatedAt?: string
}

export interface ResumeAnalysisResultVO {
  analysisRecordId: number
  fileId?: number
  resumeId?: number | null
  parseStatus: ResumeParseStatus
  errorMessage?: string
  structuredJson?: Record<string, ResumeJsonValue> | null
  rawTextSummary?: string
  updatedAt?: string
}

export interface ResumeConfirmAnalysisVO {
  analysisRecordId: number
  resumeId: number
  parseStatus: ResumeParseStatus
  resume: ResumeDetailVO
}

export interface ResumeOptimizeRequestDTO {
  targetPosition?: string
  experienceYears?: number
  industryDirection?: string
  selectedProjectIds?: number[]
}

export interface ResumeRewriteSuggestion {
  section?: string
  projectName?: string
  before?: string
  after?: string
  reason?: string
  fabricationRisk?: boolean
}

export interface ResumeOptimizeResultJson {
  overallScore?: number
  overallComment?: string
  targetPositionMatch?: Record<string, unknown>
  sectionScores?: Record<string, number>
  problems?: Array<Record<string, unknown>>
  rewriteSuggestions?: ResumeRewriteSuggestion[]
  riskWarnings?: Array<Record<string, unknown>>
  possibleInterviewQuestions?: Array<Record<string, unknown>>
  nextActions?: string[]
  [key: string]: unknown
}

export interface ResumeOptimizeSubmitVO {
  optimizeRecordId: number
  resumeId: number
  optimizeStatus: ResumeOptimizeStatus
  resultJson?: ResumeOptimizeResultJson | null
  errorMessage?: string
}

export interface ResumeOptimizeRecordVO {
  optimizeRecordId: number
  resumeId: number
  targetPosition?: string
  experienceYears?: number
  industryDirection?: string
  optimizeStatus: ResumeOptimizeStatus
  summary?: string
  overallComment?: string
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface ResumeOptimizeDetailVO extends ResumeOptimizeRecordVO {
  resultJson?: ResumeOptimizeResultJson | null
}
