import type { PageQuery } from '@/types/api'

export interface JobSearchExperimentQueryDTO extends PageQuery {
  keyword?: string
  status?: string
  demoFlag?: boolean
}

export interface JobSearchExperimentSaveDTO {
  title: string
  goal?: string
  targetDirection?: string
  startDate?: string
  endDate?: string
  status?: string
  demoFlag?: boolean
}

export type JobExperimentRelationType =
  | 'RESUME_VERSION'
  | 'TARGET_JOB'
  | 'JD_ANALYSIS'
  | 'MATCH_REPORT'
  | 'JOB_APPLICATION'
  | 'PROJECT_EVIDENCE'

export interface JobSearchExperimentRelationSaveDTO {
  relationType: JobExperimentRelationType
  relationId: number
  relationSummary?: string
  metadata?: Record<string, unknown>
}

export interface JobSearchExperimentReviewSaveDTO {
  factSummary?: string
  insightSummary?: string
  unsupportedConclusion?: string
  sampleWarning?: string
  nextAction?: string
  strategy?: Record<string, unknown>
  aiTraceId?: string
  confidenceLevel?: string
}

export interface JobSearchExperimentMetricsVO {
  applicationCount: number
  feedbackCount: number
  interviewInviteCount: number
  interviewCompletedCount: number
  offerCount: number
  rejectedCount: number
  resumeVersionCount: number
  targetJobCount: number
  projectEvidenceCount: number
  agentTaskCount: number
  sampleCount: number
  confidenceLevel: string
  sampleInsufficient: boolean
  resumeVersionSampleInsufficient?: boolean
  sampleWarning?: string
  facts: string[]
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  resumeVersionUsageCounts?: Record<string, number>
}

export interface JobSearchExperimentRelationVO {
  id: number
  experimentId: number
  relationType: JobExperimentRelationType | string
  relationId: number
  relationSummary?: string
  metadata?: Record<string, unknown>
  demoFlag?: number
  createdAt?: string
}

export interface JobSearchExperimentReviewVO {
  id: number
  experimentId: number
  factSummary?: string
  insightSummary?: string
  unsupportedConclusion?: string
  sampleWarning?: string
  nextAction?: string
  strategy?: JobSearchExperimentStrategyVO
  aiTraceId?: string
  confidenceLevel?: string
  demoFlag?: number
  createdAt?: string
  updatedAt?: string
}

export interface JobSearchExperimentEvidenceSourceVO {
  sourceType: JobExperimentRelationType | string
  sourceId: number
  sourceSummary?: string
  trustStatus?: string
  sourceUpdatedAt?: string
  metadata?: Record<string, unknown>
}

export interface JobSearchExperimentStrategyVO {
  title?: string
  content?: string
  confidenceLevel?: string
  sampleInsufficient?: boolean
  sampleWarning?: string
  actionUrl?: string
  unsupportedConclusions?: string[]
  weakObservations?: string[]
  evidenceSources?: JobSearchExperimentEvidenceSourceVO[]
}

export interface JobSearchExperimentListVO {
  id: number
  title: string
  goal?: string
  targetDirection?: string
  startDate?: string
  endDate?: string
  status: string
  sampleCount?: number
  confidenceLevel?: string
  sampleWarning?: string
  summary?: string
  nextStrategy?: string
  demoFlag?: number
  createdAt?: string
  updatedAt?: string
  metrics?: JobSearchExperimentMetricsVO
}

export interface JobSearchExperimentDetailVO extends JobSearchExperimentListVO {
  relations: JobSearchExperimentRelationVO[]
  reviews: JobSearchExperimentReviewVO[]
  latestReview?: JobSearchExperimentReviewVO
  metrics?: JobSearchExperimentMetricsVO
  strategy?: JobSearchExperimentStrategyVO
}

export interface PortfolioDemoStatusVO {
  loaded: boolean
  datasetKey: string
  datasetName: string
  status: string
  version: string
  demoUserId?: number
  demoData: boolean
  readOnly: boolean
  loadedAt?: string
  resetAt?: string
  message?: string
}

export interface PortfolioDemoStorylineStepVO {
  key: string
  title: string
  route: string
  entityType: string
  entityId?: number
  evidenceSummary?: string
  status?: string
  demoData?: boolean
}

export interface PortfolioDemoStorylineVO {
  status: PortfolioDemoStatusVO
  steps: PortfolioDemoStorylineStepVO[]
  opsSteps: PortfolioDemoStorylineStepVO[]
}
