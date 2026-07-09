import type { EvidenceSourceVO, ExplainableSuggestionVO, SuggestionTraceVO } from './suggestion'

export type ApplicationPackageReadinessLevel =
  | 'READY'
  | 'NEEDS_RESUME'
  | 'NEEDS_EVIDENCE'
  | 'NEEDS_TRAINING'
  | 'BLOCKED'
  | string

export type ApplicationPackageStatus = 'DRAFT' | 'READY' | 'APPLIED' | 'ARCHIVED'
export type ApplicationPackageChecklistStatus = 'PASS' | 'WARN' | 'BLOCKED' | 'PENDING' | string
export type ApplicationPackageRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKED' | string
export type ApplicationPackageActionType =
  | 'CREATE_APPLICATION_RECORD'
  | 'LINK_APPLICATION'
  | 'UPDATE_RESUME_VERSION'
  | 'ADD_PROJECT_EVIDENCE'
  | 'PRACTICE_INTERVIEW'
  | 'SET_FOLLOW_UP'
  | string

export interface ApplicationPackageJobContextVO {
  targetJobId?: number
  jdAnalysisId?: number
  companyName?: string
  jobTitle?: string
  jobLevel?: string
  jdSource?: string
  jdSummary?: string
  requiredSkills?: string[]
  sourceUrl?: string
}

export interface ApplicationPackageRecommendedResumeVO {
  resumeId?: number
  resumeTitle?: string
  resumeVersionId?: number
  resumeVersionNo?: number
  resumeVersionName?: string
  versionNo?: number
  versionName?: string
  currentFlag?: number
  reason?: string
  evidenceSummary?: string
  updatedAt?: string
}

export interface ApplicationPackageMatchResultVO {
  matchReportId?: number
  overallScore?: number
  techStackScore?: number
  projectExperienceScore?: number
  businessFitScore?: number
  communicationScore?: number
  status?: string
  trustStatus?: string
  summary?: string
  strengths?: string[]
  gaps?: string[]
  interviewTopics?: string[]
  fallback?: boolean
  degraded?: boolean
  schemaWarningCount?: number
}

export interface ApplicationPackageProjectEvidenceSummaryVO {
  id?: number
  title?: string
  role?: string
  techStack?: string
  completenessScore?: number
  completenessStatus?: string
  missingFields?: string[]
}

export interface ApplicationPackageProjectEvidenceCoverageVO {
  coveredRequirements?: string[]
  insufficientRequirements?: string[]
  suggestedFields?: string[]
  selectedEvidence?: ApplicationPackageProjectEvidenceSummaryVO[]
}

export interface ApplicationPackageEvidenceCoverageItemVO {
  requirement?: string
  status?: ApplicationPackageChecklistStatus
  evidenceIds?: number[]
  evidenceTitles?: string[]
  coverageSummary?: string
  gap?: string
  suggestedSupplement?: string
}

export interface ApplicationPackageChecklistItemVO {
  key?: string
  title?: string
  label?: string
  status?: ApplicationPackageChecklistStatus
  statusSource?: 'BACKEND' | 'DERIVED_FROM_PASSED_SEVERITY'
  passed?: boolean
  reason?: string
  severity?: string
  actionType?: string
  actionUrl?: string
  description?: string
  actionLabel?: string
  actionPath?: string
  evidenceSources?: EvidenceSourceVO[]
  evidenceSourceIds?: Array<string | number>
}

export interface CareerRiskSignalVO {
  key?: string
  title: string
  level: ApplicationPackageRiskLevel
  description?: string
  mitigation?: string
  evidenceSources?: EvidenceSourceVO[]
  evidenceSourceIds?: Array<string | number>
}

export interface CareerActionItemVO {
  id?: string | number
  actionCode?: string
  actionType?: ApplicationPackageActionType
  title: string
  description?: string
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | string
  status?: 'PENDING' | 'DONE' | 'SKIPPED' | string
  actionUrl?: string
  actionPath?: string
  sourceType?: string
  sourceId?: string | number
  evidenceSources?: EvidenceSourceVO[]
  evidenceSourceIds?: Array<string | number>
}

export interface ApplicationPackageActionExecuteDTO {
  source?: string
  note?: string
  status?: string
  appliedAt?: string
  nextFollowUpAt?: string
  payload?: Record<string, unknown>
}

export interface ApplicationPackageActionExecuteVO {
  applicationPackageId?: string
  packageId?: string | number
  actionCode?: string
  actionType?: ApplicationPackageActionType
  status?: 'SUCCESS' | 'PENDING' | 'SKIPPED' | 'FAILED' | 'EXECUTED' | 'CONTRACT_READY' | string
  message?: string
  actionUrl?: string
  actionPath?: string
  targetUrl?: string
  targetPath?: string
  applicationId?: number
  relatedBizType?: string
  relatedBizId?: number
  payload?: Record<string, unknown>
  package?: JobApplicationPackageVO
  packageDetail?: JobApplicationPackageVO
}

export interface ApplicationPackageInterviewContextVO {
  interviewQuestionGroupId?: number
  targetJobId?: number
  resumeVersionId?: number
  matchReportId?: number
  projectEvidenceIds?: number[]
  focusAreas?: string[]
  preparationSummary?: string
  entryUrl?: string
  topics?: string[]
  createParams?: Record<string, unknown>
}

export interface JobApplicationPackageVO {
  id: string
  packageNo?: string
  snapshotVersion?: number
  userId?: number
  targetJobId?: number
  jobApplicationId?: number
  jdAnalysisId?: number
  recommendedResumeVersionId?: number
  matchReportId?: number
  projectEvidenceIds?: number[]
  interviewQuestionGroupId?: number
  readinessLevel: ApplicationPackageReadinessLevel
  readinessScore?: number
  readinessReason?: string
  packageStatus?: ApplicationPackageStatus
  companyName?: string
  jobTitle?: string
  resultSource?: string
  fallback?: boolean
  degraded?: boolean
  degradedReason?: string
  contextPackageCount?: number
  contextVersionNo?: number
  latestContextPackageId?: number | string
  latestContextPackageNo?: string
  latestContextPackage?: boolean
  generatedAt?: string
  job?: ApplicationPackageJobContextVO
  recommendedResume?: ApplicationPackageRecommendedResumeVO
  matchResult?: ApplicationPackageMatchResultVO
  matchSummary?: ApplicationPackageMatchResultVO
  evidenceCoverage?: ApplicationPackageEvidenceCoverageItemVO[]
  projectEvidenceCoverage?: ApplicationPackageProjectEvidenceCoverageVO
  checklist?: ApplicationPackageChecklistItemVO[]
  riskSignals?: CareerRiskSignalVO[]
  actions?: CareerActionItemVO[]
  suggestions?: ExplainableSuggestionVO[]
  evidenceSources?: EvidenceSourceVO[]
  interviewContext?: ApplicationPackageInterviewContextVO
  interviewPreparation?: ApplicationPackageInterviewContextVO
  trace?: SuggestionTraceVO
  refreshedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface JobApplicationPackageListItemVO {
  id: number | string
  packageNo?: string
  targetJobId?: number
  jdAnalysisId?: number
  recommendedResumeVersionId?: number
  matchReportId?: number
  jobApplicationId?: number
  companyName?: string
  jobTitle?: string
  readinessLevel?: ApplicationPackageReadinessLevel
  readinessScore?: number
  readinessReason?: string
  packageStatus?: ApplicationPackageStatus
  resultSource?: string
  fallback?: boolean
  traceId?: string
  snapshotVersion?: number
  contextPackageCount?: number
  contextVersionNo?: number
  latestContextPackageId?: number | string
  latestContextPackageNo?: string
  latestContextPackage?: boolean
  refreshedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface ApplicationPackageListParams {
  pageNo?: number
  pageSize?: number
  status?: ApplicationPackageStatus
  keyword?: string
}

export interface ApplicationPackagePreviewParams {
  targetJobId?: number
  jdAnalysisId?: number
  resumeVersionId?: number
  matchReportId?: number
  projectEvidenceIds?: number[]
}

export interface ApplicationPackageCreateDTO extends ApplicationPackagePreviewParams {
  source?: string
}

export interface ApplicationPackageCreateApplicationDTO {
  targetJobId?: number
  jdAnalysisId?: number
  resumeVersionId?: number
  matchReportId?: number
  projectEvidenceIds?: number[]
  companyName?: string
  jobTitle?: string
  source?: string
  status?: string
  appliedAt?: string
  nextFollowUpAt?: string
  note?: string
}
