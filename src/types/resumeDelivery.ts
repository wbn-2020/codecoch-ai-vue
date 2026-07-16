export type ResumeSuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'UNDONE' | 'UNKNOWN'
export type ResumeSuggestionDecisionType = 'ACCEPT' | 'REJECT' | 'UNDO'
export type ResumeSuggestionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
export type ResumeAuditEvidenceStatus = 'VERIFIED' | 'PARTIAL' | 'RISK' | 'UNSUPPORTED' | 'UNKNOWN'
export type ResumeArtifactStatus = 'GENERATING' | 'READY' | 'FAILED' | 'UNKNOWN'
export type ResumeExportFormat = 'PDF' | 'DOCX'

export interface ResumeSuggestionDecisionVO {
  id?: number
  decisionType?: string
  fromStatus?: string
  toStatus?: string
  decisionVersion?: number
  resultResumeVersionId?: number
  idempotencyKey?: string
  note?: string
  createdAt?: string
}

export interface ResumeSuggestionVO {
  id: number
  resumeId?: number
  sourceResumeVersionId: number
  sourceType?: string
  sourceId?: number
  sourceVersion?: string
  sectionKey: string
  sectionId?: string
  fieldPath?: string
  anchorStart: number
  anchorEnd: number
  anchorTextHash?: string
  originalText: string
  suggestedText: string
  acceptedText?: string
  evidenceReferences: Array<Record<string, unknown>>
  riskLevel: ResumeSuggestionRiskLevel
  rationale?: string
  status: ResumeSuggestionStatus
  decisionVersion?: number
  appliedResumeVersionId?: number
  undoResumeVersionId?: number
  decidedAt?: string
  createdAt?: string
  decisions: ResumeSuggestionDecisionVO[]
}

export interface ResumeSuggestionCreateDTO {
  sourceResumeVersionId: number
  sourceType?: string
  sourceId?: number
  sourceVersion?: string
  sectionKey: string
  sectionId?: string
  fieldPath?: string
  anchorStart: number
  anchorEnd: number
  originalText: string
  suggestedText: string
  evidenceReferences?: Array<Record<string, unknown>>
  riskLevel?: Exclude<ResumeSuggestionRiskLevel, 'UNKNOWN'>
  rationale?: string
}

export interface ResumeSuggestionBatchAcceptDTO {
  suggestionIds: number[]
  idempotencyKey: string
  note?: string
}

export interface ResumeSuggestionDecisionDTO {
  decisionType: ResumeSuggestionDecisionType
  idempotencyKey: string
  note?: string
  editedText?: string
}

export interface ResumeClaimAuditFindingVO {
  id?: number
  sectionKey?: string
  claimIndex?: number
  claimType?: string
  claimText?: string
  claimHash?: string
  quantities: string[]
  evidenceStatus: ResumeAuditEvidenceStatus
  evidenceRefs: Array<Record<string, unknown>>
  reason?: string
}

export interface ResumeClaimAuditVO {
  id: number
  resumeId?: number
  resumeVersionId: number
  sourceHash?: string
  auditVersion?: string
  status: string
  claimCount: number
  verifiedCount: number
  partialCount: number
  unsupportedCount: number
  riskCount: number
  errorMessage?: string
  completedAt?: string
  createdAt?: string
  findings: ResumeClaimAuditFindingVO[]
}

export interface ResumeAtsTemplateVO {
  id?: number
  templateCode: string
  templateVersion: number
  templateName: string
  layoutType?: string
  definition?: Record<string, unknown>
  definitionHash?: string
  status?: string
}

export interface ResumeArtifactVO {
  id: number
  artifactType: string
  sourceResumeId?: number
  sourceResumeVersionId?: number
  sourceApplicationPackageId?: number
  sourceHash?: string
  templateCode?: string
  templateVersion?: number
  fileName: string
  mimeType?: string
  fileSize?: number
  sha256?: string
  status: ResumeArtifactStatus
  manifest?: Record<string, unknown>
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface ResumeExportVO {
  id: number
  resumeId?: number
  resumeVersionId: number
  sourceHash?: string
  templateId?: number
  templateCode?: string
  templateVersion?: number
  exportFormat: ResumeExportFormat
  status: ResumeArtifactStatus
  contentHash?: string
  errorMessage?: string
  artifact?: ResumeArtifactVO
  createdAt?: string
}

export interface ResumeExportCreateDTO {
  resumeVersionId: number
  templateCode?: string
  templateVersion?: number
  format: ResumeExportFormat
}

export interface ResumeArtifactPackageCreateDTO {
  resumeVersionId: number
  applicationPackageId?: number
  templateCode?: string
  templateVersion?: number
}

export interface ResumeDeliveryDraft {
  title?: string
  realName?: string
  email?: string
  phone?: string
  targetPosition?: string
  summary?: string
  skillStack?: string
  workExperience?: string
  educationExperience?: string
  projects?: Array<Record<string, unknown>>
}

export interface ResumeSuggestionView extends ResumeSuggestionVO {
  stale: boolean
  staleReason?: string
  canAccept: boolean
  canReject: boolean
  canUndo: boolean
}
