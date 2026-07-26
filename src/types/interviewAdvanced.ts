import type { InterviewReportTrustStatus, ReportStatus } from './interview'

export interface InterviewReportAdvancedMeta {
  reportId?: number
  interviewId?: number
  targetJobId?: number
  rubricVersion?: string
  trustStatus?: InterviewReportTrustStatus
  fallback: boolean
  remediationAvailable: boolean
  strongRemediationAvailable: boolean
  strongRemediationUnavailableReason?: string
  comparisonAvailable?: boolean
  comparisonUnavailableReason?: string
  sourceRequirementIds: number[]
  practicePurpose?: string
  remediationStrength?: string
  remediationCreated: boolean
  remediationId?: number
  remediationTargetSessionId?: number
  remediationStatus?: string
}

export interface InterviewRemediationCreateDTO {
  sourceReportId: number
  sourceRequirementIds: number[]
  practicePurpose: string
  strongRemediation: boolean
  idempotencyKey: string
}

export interface InterviewReplayCreateDTO {
  idempotencyKey: string
}

export interface InterviewReplayVO {
  id?: number
  sourceSessionId?: number
  sourceReportId?: number
  targetSessionId?: number
  targetJobId?: number
  scenarioVersionId?: number
  rubricVersion?: string
  status?: string
  idempotentReplay: boolean
  interview?: InterviewRemediationInterviewVO
}

export interface InterviewRemediationInterviewVO {
  id?: number
  interviewId?: number
  title?: string
  status?: string
  reportStatus?: string
}

export interface InterviewRemediationVO {
  id?: number
  sourceReportId?: number
  sourceSessionId?: number
  targetSessionId?: number
  targetJobId?: number
  sourceRequirementIds: number[]
  practicePurpose?: string
  remediationStrength?: string
  rubricVersion?: string
  status?: string
  idempotentReplay: boolean
  interview?: InterviewRemediationInterviewVO
}

export interface InterviewRemediationOptionVO {
  optionKey: string
  reasonType: string
  title: string
  description?: string
  evidence?: string
  sourceRequirementIds: number[]
  practicePurpose: string
  strongRemediation: boolean
}

export interface InterviewRemediationOptionsVO {
  interviewId?: number
  sourceReportId?: number
  targetJobId?: number
  rubricVersion?: string
  trustStatus?: InterviewReportTrustStatus
  options: InterviewRemediationOptionVO[]
}

export interface InterviewComparisonCreateDTO {
  reportIds: number[]
  idempotencyKey: string
}

export interface InterviewComparisonReasonVO {
  code: string
  message: string
}

export interface InterviewComparisonPointVO {
  reportId?: number
  score?: number
  deltaFromPrevious?: number
}

export interface InterviewComparisonRoundVO {
  reportId?: number
  sessionId?: number
  totalScore?: number
  generatedAt?: string
  trustStatus?: InterviewReportTrustStatus
  sampleInsufficient: boolean
  rubricVersion?: string
  normalizationSource?: string
  unavailableReasons?: InterviewComparisonReasonVO[]
  warnings?: InterviewComparisonReasonVO[]
  rubricScores: Record<string, number>
}

export interface InterviewDimensionComparisonVO {
  dimension: string
  firstScore?: number
  latestScore?: number
  delta?: number
  points: InterviewComparisonPointVO[]
}

export interface InterviewRequirementImprovementVO {
  requirementId?: number
  requirementName?: string
  firstStatus?: string
  latestStatus?: string
  improvement?: string
  evidence?: string
}

export interface InterviewComparisonVO {
  id?: number
  contractVersion?: string
  legacySnapshotNormalized?: boolean
  comparable: boolean
  targetJobId?: number
  rubricVersion?: string
  reportIds: number[]
  firstTotalScore?: number
  latestTotalScore?: number
  totalScoreDelta?: number
  unavailableReasons: InterviewComparisonReasonVO[]
  warnings: InterviewComparisonReasonVO[]
  rounds: InterviewComparisonRoundVO[]
  dimensions: InterviewDimensionComparisonVO[]
  requirementImprovements: InterviewRequirementImprovementVO[]
  idempotentReplay: boolean
  createdAt?: string
}

export interface InterviewHistoryComparisonCandidate {
  interviewId: number
  reportId?: number
  targetJobId?: number
  title: string
  targetPosition?: string
  reportStatus?: ReportStatus
  generatedAt?: string
  comparisonAvailable?: boolean
  comparisonUnavailableReason?: string
}

export interface InterviewComparisonSelectionValidation {
  valid: boolean
  reason: string
  targetJobId?: number
}
