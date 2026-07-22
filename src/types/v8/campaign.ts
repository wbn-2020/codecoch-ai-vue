export type V8CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED' | string

export type CampaignFocusMode = 'DEADLINE_FIRST' | 'HIGH_PRIORITY_FIRST' | 'BALANCED'

export type CampaignActionDecisionStatus =
  | 'SNOOZED'
  | 'DISMISSED'
  | 'REOPENED'
  | 'PLAN_PREVIEWED'
  | string

export type CampaignActionType =
  | 'FOLLOW_UP_OVERDUE'
  | 'FOLLOW_UP_DUE_SOON'
  | 'INTERVIEW_PREP_MISSING'
  | 'INTERVIEW_REVIEW_MISSING'
  | 'OFFER_DEADLINE'
  | 'APPLICATION_STALE'
  | 'MATERIAL_COVERAGE_LOW'
  | 'RESEARCH_COVERAGE_LOW'
  | 'CONTACT_FOLLOW_UP_DUE'
  | 'PLAN_CAPACITY_OVERLOAD'
  | string

export type CampaignArchiveExportStatus = 'GENERATING' | 'READY' | 'FAILED' | string

export interface CampaignOperatingProfile {
  id?: number
  campaignId: number
  configured: boolean
  weeklyApplicationTarget: number
  weeklyTimeBudgetMinutes: number
  maxActiveOpportunities: number
  staleAfterDays: number
  defaultFollowUpDays: number
  focusRoles: string[]
  focusLocations: string[]
  focusChannels: string[]
  timezone: string
  lockVersion?: number
  updatedAt?: string
}

export interface CampaignOperatingProfileUpdateDTO {
  weeklyApplicationTarget: number
  weeklyTimeBudgetMinutes: number
  maxActiveOpportunities: number
  staleAfterDays: number
  defaultFollowUpDays: number
  focusRoles: string[]
  focusLocations: string[]
  focusChannels: string[]
  timezone: string
  expectedLockVersion?: number
  idempotencyKey: string
}

export interface CampaignCockpitCampaign {
  id: number
  name?: string
  title?: string
  goal?: string
  status?: V8CampaignStatus
  applicationCount?: number
  activeApplicationCount?: number
  startedAt?: string
  completedAt?: string
  archivedAt?: string
  startDate?: string
  endDate?: string
  createdAt?: string
  updatedAt?: string
  lockVersion?: number
}

export interface CampaignCockpitApplication {
  id: number
  applicationId?: number
  companyName?: string
  jobTitle?: string
  status?: string
  stage?: string
  priorityLevel?: string
  opportunityOutcome?: string
  nextFollowUpAt?: string
  nextDeadlineAt?: string
  active?: boolean
  stale?: boolean
  actionUrl?: string
  lastEventSummary?: string
  lastEventAt?: string
  createdAt?: string
  updatedAt?: string
  stageUpdatedAt?: string
  interviewAt?: string
  offerDeadlineAt?: string
  contactFollowUpAt?: string
}

export interface CampaignEvidenceRef {
  sourceType?: string
  sourceId?: number
  sourceVersion?: number
  sourceHash?: string
  applicationId?: number
  campaignId?: number
  observedAt?: string
  fieldPath?: string
  summary?: string
}

export interface CampaignActionDecision {
  id?: number
  semanticKey: string
  sourceHash: string
  actionType: CampaignActionType
  title: string
  description?: string
  priority?: string
  priorityReasons?: string[]
  dueAt?: string
  estimatedMinutes?: number
  applicationId?: number
  relatedBizType?: string
  relatedBizId?: number | string
  evidenceRefs?: CampaignEvidenceRef[]
  actionUrl?: string
  confidenceLevel?: string
  fallback?: boolean
  decisionStatus?: CampaignActionDecisionStatus
  snoozedUntil?: string
  reason?: string
}

export interface CampaignActionDecisionDTO {
  semanticKey: string
  sourceHash: string
  decisionStatus: CampaignActionDecisionStatus
  snoozedUntil?: string
  reason?: string
  idempotencyKey: string
}

export interface CampaignActionDecisionRecord {
  id?: number
  campaignId?: number
  semanticKey: string
  sourceHash: string
  actionType?: CampaignActionType
  decisionStatus?: CampaignActionDecisionStatus
  snoozedUntil?: string
  reason?: string
  decidedAt?: string
}

export interface CampaignPulseSummary {
  snapshotId?: number
  snapshotVersion?: number
  summary?: string
  facts?: string[]
  changes?: string[]
  driftReasons?: string[]
  focusAreas?: string[]
  limits?: string[]
  confidenceLevel?: string
  fallback?: boolean
  generatedAt?: string
  dataCutoffAt?: string
}

export interface CampaignPulseNarrative extends CampaignPulseSummary {
  actionSelections?: string[]
  focusAreas?: string[]
  fallbackReason?: string
  aiCallLogId?: number
}

export interface CampaignPulseSnapshot extends CampaignPulseSummary {
  pulseId?: number
  snapshotId?: number
  campaignId: number
  inputHash?: string
  generationFingerprint?: string
  metrics?: Record<string, unknown>
  driftSignals?: string[]
  actionSeeds?: CampaignActionDecision[]
  sources?: CampaignEvidenceRef[]
  narrative?: CampaignPulseNarrative
  createdAt?: string
}

export interface CampaignPulseHistoryVO {
  campaignId?: number
  snapshots?: CampaignPulseSnapshot[]
}

export interface CampaignCoverageSummary {
  included?: string[]
  unavailable?: string[]
  failed?: string[]
  warnings?: string[]
}

export interface CampaignCoverageSection {
  available?: boolean
  truncated?: boolean
  itemCount?: number
  warning?: string
}

export interface CampaignCapacitySummary {
  availableMinutes?: number
  usedMinutes?: number
  weeklyBudgetMinutes?: number
  openActionMinutes?: number
  remainingMinutes?: number
  activeOpportunityCount?: number
  maxActiveOpportunities?: number
  weeklyApplicationTarget?: number
  weeklyApplications?: number
  overloaded?: boolean
}

export interface CampaignCockpitVO {
  campaign?: CampaignCockpitCampaign
  operatingProfile?: CampaignOperatingProfile
  pulseSummary?: CampaignPulseSummary
  stageDistribution?: Record<string, number>
  deadlineSummary?: {
    overdueCount?: number
    dueTodayCount?: number
    dueWithinSevenDaysCount?: number
  }
  coverageSummary?: CampaignCoverageSummary
  applications?: CampaignCockpitApplication[]
  actionQueue?: CampaignActionDecision[]
  capacitySummary?: CampaignCapacitySummary
  coverage?: CampaignCoverageSummary | Record<string, CampaignCoverageSection>
  warnings?: string[]
  limits?: string[]
  dataCutoffAt?: string
  confidenceLevel?: string
  fallback?: boolean
}

export interface CampaignPulseGenerateDTO {
  campaignId: number
  requestId?: string
  idempotencyKey: string
}

export interface CampaignScenarioPreviewDTO {
  availableMinutes: number
  focusMode: CampaignFocusMode
  maxApplications: number
  includeLowConfidence: boolean
}

export interface CampaignScenarioPreviewVO {
  selectedActions?: CampaignActionDecision[]
  deferredActions?: CampaignActionDecision[]
  totalEstimatedMinutes?: number
  capacityRemainingMinutes?: number
  tradeoffs?: string[]
  limits?: string[]
  sourceHash?: string
}

export interface CampaignPulsePlanPreviewDTO {
  idempotencyKey: string
  maxTotalMinutes?: number
  selectedSemanticKeys?: string[]
}

export interface CampaignArchiveExportCreateDTO {
  dataCutoffAt?: string
  exportFormat: string
  retryFailed?: boolean
  idempotencyKey: string
}

export interface CampaignArchiveExportVO {
  id: number
  campaignId?: number
  dataCutoffAt?: string
  exportFormat?: string
  status?: CampaignArchiveExportStatus
  sourceHash?: string
  manifestHash?: string
  fileId?: number
  fileSize?: number
  errorCode?: string
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
  downloadAvailable?: boolean
}
