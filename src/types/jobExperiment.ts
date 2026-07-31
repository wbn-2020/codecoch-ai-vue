import type { PageQuery } from '@/types/api'
import type { EvidenceSourceVO, ExplainableSuggestionVO, SuggestionQualityGateVO } from '@/types/suggestion'

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
  noFeedbackCount?: number
  interviewRoundCount?: number
  interviewReportSummaryCount?: number
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
  sampleBoundary?: ExperimentSampleBoundaryVO
}

export interface ExperimentSampleBoundaryVO {
  sampleLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | string
  applicationCount?: number
  feedbackCount?: number
  interviewCompletedCount?: number
  rejectedCount?: number
  noFeedbackCount?: number
  interviewRoundCount?: number
  interviewReportSummaryCount?: number
  resumeVersionUsageCounts?: Record<string, number>
  directionSampleCounts?: Record<string, number>
  sampleInsufficient?: boolean
  sampleWarning?: string
  blockedConclusionTypes?: string[]
}

export interface JobExperimentApplicationFeedbackSummaryVO {
  applicationCount: number
  feedbackCount: number
  rejectedCount: number
  noFeedbackCount: number
  interviewRoundCount: number
  interviewCompletedCount: number
  interviewReportSummaryCount: number
  statusCounts: Record<string, number>
  resumeVersionUsageCounts: Record<string, number>
  directionSampleCounts: Record<string, number>
  facts: string[]
  interviewReportSummaries: string[]
  degraded: boolean
  degradedReason?: string
}

export interface ExperimentHypothesisVO {
  targetDirection?: string
  assumption?: string
  timeWindowStart?: string
  timeWindowEnd?: string
  expectedSignal?: string
}

export interface ExperimentWeakObservationVO {
  observationType?: string
  text: string
  evidenceCount?: number
  confidenceLevel?: string
  actionHint?: string
}

export interface ExperimentUnsupportedConclusionVO {
  conclusionType?: string
  blockedReason: string
  requiredSampleHint?: string
}

export interface ExperimentNextActionVO {
  actionType?: string
  title: string
  reason?: string
  targetRoute?: string
  actionUrl?: string
  targetRouteMissing?: boolean
  qualityGate?: SuggestionQualityGateVO | null
}

export interface JobExperimentReviewDslVO {
  facts?: string[]
  limits?: ExperimentSampleBoundaryVO
  sampleBoundary?: ExperimentSampleBoundaryVO
  weakObservations?: ExperimentWeakObservationVO[]
  unsupportedConclusions?: ExperimentUnsupportedConclusionVO[]
  hypotheses?: ExperimentHypothesisVO[]
  nextActions?: ExperimentNextActionVO[]
  actionCandidates?: ExperimentNextActionVO[]
  evidenceSources?: EvidenceSourceVO[]
  qualityGate?: SuggestionQualityGateVO | null
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
  traceId?: string
  aiCallLogId?: number | null
  resultSource?: string | null
  fallback?: boolean | null
  qualityGate?: SuggestionQualityGateVO | null
  reviewDsl?: JobExperimentReviewDslVO
  actionCandidates?: ExperimentNextActionVO[]
  trustedSuggestion?: ExplainableSuggestionVO
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
  qualityGate?: SuggestionQualityGateVO | null
  reviewDsl?: JobExperimentReviewDslVO
  nextActions?: ExperimentNextActionVO[]
  actionCandidates?: ExperimentNextActionVO[]
  resultSource?: string | null
  fallback?: boolean | null
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
  evidenceCoverage?: ExperimentEvidenceCoverageVO
  sampleBoundary?: ExperimentSampleBoundaryVO
}

export interface JobSearchExperimentDetailVO extends JobSearchExperimentListVO {
  relations: JobSearchExperimentRelationVO[]
  reviews: JobSearchExperimentReviewVO[]
  latestReview?: JobSearchExperimentReviewVO
  metrics?: JobSearchExperimentMetricsVO
  strategy?: JobSearchExperimentStrategyVO
  reviewDsl?: JobExperimentReviewDslVO
  evidenceCoverage?: ExperimentEvidenceCoverageVO
  sampleBoundary?: ExperimentSampleBoundaryVO
  trustedSuggestion?: ExplainableSuggestionVO
}

export interface ExperimentEvidenceCoverageVO {
  requiredTypes?: string[]
  coveredTypes?: string[]
  missingTypes?: string[]
  items?: JobSearchExperimentRelationVO[]
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

export interface PortfolioRehearsalSessionVO {
  activeRouteKey: string | null
  activeNodeIndex: number
  elapsedSeconds: number
  completedNodeIds: string[]
  updatedAt?: string
}

export interface PortfolioRehearsalSessionSaveDTO {
  activeRouteKey: string
  activeNodeIndex: number
  elapsedSeconds: number
  completedNodeIds: string[]
}
