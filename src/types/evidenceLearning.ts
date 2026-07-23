import type {
  EvidenceConfidenceLevel,
  EvidenceCoverageVO,
  EvidenceEnvelopeVO,
  EvidenceSourceRefVO
} from './evidenceAsset'

export type EvidenceLearningDecisionCode = 'KEEP' | 'EDIT' | 'CONTINUE' | 'REJECT'
export const evidenceLearningDecisionCodes: EvidenceLearningDecisionCode[] = [
  'KEEP',
  'EDIT',
  'CONTINUE',
  'REJECT'
]
export type EvidenceLearningCandidateStatus =
  | 'WEAK_OBSERVATION'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED_BY_USER'
  | 'REJECTED'
  | 'EXPIRED'
  | string

export interface EvidenceLearningCandidateVO {
  id?: number
  candidateId?: number
  userId?: number
  candidateScopeType?: string
  candidateScopeKey?: string
  candidateType?: string
  candidateKey?: string
  semanticKey?: string
  title?: string
  content?: string
  weakObservation?: string
  usageSourceHash?: string
  evidenceCount?: number
  sampleCount?: number
  status?: EvidenceLearningCandidateStatus
  decisionCode?: EvidenceLearningDecisionCode
  decisionAt?: string
  decisionSummary?: string
  promotedMemoryId?: number
  memoryDraftId?: number
  limits?: string[]
  unknowns?: string[]
  sourceRefs?: EvidenceSourceRefVO[]
  sources?: EvidenceSourceRefVO[]
  dataCutoffAt?: string
  sourceSetHash?: string
  coverage?: EvidenceCoverageVO | string[] | string
  warnings?: string[]
  confidenceLevel?: EvidenceConfidenceLevel
  fallback?: boolean
  fallbackReason?: string
  stale?: boolean
  confirmed?: boolean
  requiresUserConfirmation?: boolean
  memoryEnabled?: boolean
  expiresAt?: string
  editPath?: string
  editDeepLink?: string
  memoryPreviewPath?: string
  availableDecisions?: EvidenceLearningDecisionCode[]
  createdAt?: string
  updatedAt?: string
}

export interface EvidenceLearningCandidateQueryDTO {
  campaignId?: number
  applicationId?: number
  usageId?: number
  status?: EvidenceLearningCandidateStatus
}

export interface EvidenceLearningDecisionDTO {
  decisionCode: EvidenceLearningDecisionCode
  editedContent?: string
  idempotencyKey: string
}

export type EvidenceLearningCandidateEnvelopeVO = EvidenceEnvelopeVO<EvidenceLearningCandidateVO>
