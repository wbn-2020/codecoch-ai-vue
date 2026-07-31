import type { PageQuery } from './api'

export type EvidenceConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH' | string
export type EvidenceAssetWriteType =
  | 'PROJECT_EVIDENCE'
  | 'PROJECT_SKILL_EVIDENCE'
  | 'PROJECT_STORY_GENERATION'
  | 'APPLICATION_PACKAGE_SNAPSHOT'
  | 'RESUME_VERSION'
  | 'MATCH_REPORT'
export type EvidenceAssetType =
  | EvidenceAssetWriteType
  | string
export type EvidenceUsageScene =
  | 'APPLICATION_SUBMISSION'
  | 'INTERVIEW_PREPARATION'
  | 'INTERVIEW_RESPONSE'
  | 'MATERIAL_EXPORT'
export type EvidenceUsageStatus = 'CAPTURED' | 'SUPERSEDED' | string
export type EvidenceUsageResultStatus = 'RECORDED' | 'CONFIRMED' | 'CORRECTED' | 'VOID' | string
export type EvidenceUsageOutcomeWriteCode =
  | 'NO_RESPONSE'
  | 'REPLIED'
  | 'INTERVIEW_ADVANCED'
  | 'INTERVIEW_NOT_ADVANCED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'UNKNOWN'
export type EvidenceUsageOutcomeCode =
  | EvidenceUsageOutcomeWriteCode
  | string

export interface EvidenceSourceRefVO {
  sourceType?: string
  sourceId?: number | string
  sourceVersion?: number | string
  sourceHash?: string
  userId?: number
  campaignId?: number
  applicationId?: number
  observedAt?: string
  sourceUpdatedAt?: string
  fieldPath?: string
  summary?: string
  stale?: boolean
}

export interface EvidenceCoverageVO {
  included?: string[]
  unavailable?: string[]
  failed?: string[]
  missing?: string[]
  warnings?: string[]
  [key: string]: unknown
}

export interface EvidenceEnvelopeVO<T> {
  items: T[]
  total?: number
  pageNo?: number
  pageSize?: number
  dataCutoffAt?: string
  sourceSetHash?: string
  coverage?: EvidenceCoverageVO | string[] | string
  warnings: string[]
  unknowns: string[]
  limits: string[]
  confidenceLevel: EvidenceConfidenceLevel
  fallback: boolean
  fallbackReason?: string
  sources: EvidenceSourceRefVO[]
}

export interface EvidenceAssetReadinessItemVO {
  assetType?: EvidenceAssetType
  label?: string
  totalCount?: number
  versionedCount?: number
  usedCount?: number
  resultCount?: number
  staleCount?: number
  readinessStatus?: 'READY' | 'PARTIAL' | 'MISSING' | string
  readinessReason?: string
  actionPath?: string
}

export interface EvidenceAssetOverviewVO {
  assetCount?: number
  versionedAssetCount?: number
  usageCount?: number
  outcomeSampleCount?: number
  pendingCandidateCount?: number
  readiness?: EvidenceAssetReadinessItemVO[]
}

export interface EvidenceAssetOverviewQueryDTO {
  campaignId?: number
  applicationId?: number
}

export interface EvidenceAssetOverviewEnvelopeVO extends EvidenceEnvelopeVO<EvidenceAssetReadinessItemVO> {
  overview: EvidenceAssetOverviewVO
}

export interface CareerEvidenceUsageVO {
  id?: number
  userId?: number
  campaignId?: number
  applicationId?: number
  targetJobId?: number
  assetType?: EvidenceAssetType
  assetId?: number | string
  assetVersion?: number | string
  packageSnapshotId?: number | string
  sourceHash?: string
  contentHash?: string
  usageScene?: string
  usedAt?: string
  hypothesisId?: number
  variantId?: number
  assignmentId?: number
  status?: EvidenceUsageStatus
  stale?: boolean
  staleReason?: string
  assetTitle?: string
  applicationLabel?: string
  companyName?: string
  jobTitle?: string
  resultCount?: number
  latestResultStatus?: EvidenceUsageResultStatus
  sourceRefs?: EvidenceSourceRefVO[]
  sources?: EvidenceSourceRefVO[]
  dataCutoffAt?: string
  sourceSetHash?: string
  coverage?: EvidenceCoverageVO | string[] | string
  warnings?: string[]
  unknowns?: string[]
  limits?: string[]
  confidenceLevel?: EvidenceConfidenceLevel
  fallback?: boolean
  fallbackReason?: string
  createdAt?: string
  updatedAt?: string
}

export interface CareerEvidenceUsageQueryDTO extends PageQuery {
  campaignId?: number
  applicationId?: number
  targetJobId?: number
  assetType?: EvidenceAssetType
  assetId?: number | string
  packageSnapshotId?: number | string
  usageId?: number
  experimentId?: number
  hypothesisId?: number
  status?: EvidenceUsageStatus
  stale?: boolean
}

export interface CareerEvidenceUsageCreateDTO {
  assetType: EvidenceAssetWriteType
  assetId: number
  assetVersion: string
  packageSnapshotId?: number
  usageScene: EvidenceUsageScene
  usedAt?: string
  hypothesisId?: number
  variantId?: number
  assignmentId?: number
  idempotencyKey: string
}

export interface CareerEvidenceUsageResultVO {
  id?: number
  usageId?: number
  applicationId?: number
  eventType?: string
  eventId?: number
  snapshotId?: number | string
  snapshotVersion?: number
  status?: EvidenceUsageResultStatus
  currentSnapshotId?: number
  lockVersion?: number
  outcomeCode?: EvidenceUsageOutcomeCode
  knownFacts?: string[]
  externalFeedbackText?: string
  userInterpretationText?: string
  unknowns?: string[]
  limits?: string[]
  unknownsFromCoverage?: string[]
  limitsFromCoverage?: string[]
  sourceType?: string
  sourceId?: number | string
  sourceVersion?: number | string
  sourceHash?: string
  occurredAt?: string
  confirmedAt?: string
  contentHash?: string
  confidenceLevel?: EvidenceConfidenceLevel
  fallback?: boolean
  fallbackReason?: string
  dataCutoffAt?: string
  sourceSetHash?: string
  coverage?: EvidenceCoverageVO | string[] | string
  warnings?: string[]
  stale?: boolean
  usage?: CareerEvidenceUsageVO
  sourceRefs?: EvidenceSourceRefVO[]
  sources?: EvidenceSourceRefVO[]
  createdAt?: string
  updatedAt?: string
}

export interface CareerEvidenceUsageResultQueryDTO extends PageQuery {
  campaignId?: number
  applicationId?: number
  targetJobId?: number
  experimentId?: number
  hypothesisId?: number
  usageId?: number
  resultId?: number
  assetType?: EvidenceAssetType
  assetId?: number | string
  packageSnapshotId?: number | string
  status?: EvidenceUsageResultStatus
  outcomeCode?: EvidenceUsageOutcomeCode
}

export interface CareerEvidenceUsageResultWriteDTO {
  eventType: string
  eventId: number
  outcomeCode: EvidenceUsageOutcomeWriteCode
  knownFacts?: string[]
  externalFeedbackText?: string
  userInterpretationText?: string
  unknowns?: string[]
  limits?: string[]
  occurredAt?: string
  idempotencyKey: string
}

export interface CareerEvidenceUsageResultCommandDTO {
  expectedLockVersion: number
  outcomeCode?: EvidenceUsageOutcomeWriteCode
  knownFacts?: string[]
  externalFeedbackText?: string
  userInterpretationText?: string
  unknowns?: string[]
  limits?: string[]
  occurredAt?: string
  reason?: string
  idempotencyKey: string
}
