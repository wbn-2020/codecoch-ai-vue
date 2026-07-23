export type V7Capability =
  | 'CAMPAIGN_WORKSPACE'
  | 'REAL_INTERVIEW'
  | 'OFFER'
  | 'CONTACT_ACTIVITY'
  | 'RESEARCH'
  | 'CAMPAIGN_REVIEW'
  | 'EXTERNAL_PLAN_SOURCE'
  | string

export type V7SectionKey =
  | 'overview'
  | 'timeline'
  | 'materials'
  | 'next-steps'
  | 'interview'
  | 'offer'
  | 'contacts'
  | 'research'

export type CareerCampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | string

export interface CareerCampaignVO {
  id: number
  name?: string
  goal?: string
  status?: CareerCampaignStatus
  startedAt?: string
  completedAt?: string
  timezone?: string
  applicationCount?: number
  activeApplicationCount?: number
  archivedAt?: string
  lockVersion?: number
  allowedTransitions?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface CareerCampaignApplicationVO {
  id: number
  companyName?: string
  jobTitle?: string
  status?: string
  campaignId?: number | null
  note?: string
}

export interface CareerCampaignCreateDTO {
  name: string
  goal?: string
}

export interface CareerCampaignUpdateDTO extends CareerCampaignCreateDTO {
  expectedLockVersion?: number
  idempotencyKey?: string
  note?: string
}

export interface CareerCampaignActionDTO {
  expectedLockVersion: number
  idempotencyKey: string
  note?: string
}

export interface CareerCampaignCompleteDTO extends CareerCampaignActionDTO {
  retainOpenApplications?: boolean
}

export interface CareerCampaignApplicationDTO {
  applicationId: number
}

export interface CareerCampaignReviewVO {
  reviewId?: number
  snapshotId?: number
  campaignId?: number
  snapshotVersion?: number
  scene?: string
  reportStatus?: string
  confidenceLevel?: string
  fallback?: boolean
  fallbackReason?: string
  summary?: string
  dataCutoffAt?: string
  facts?: CareerCampaignReviewFactVO[]
  coverage?: string[]
  limits?: string[]
  signals?: string[]
  nextCycleActions?: CareerCampaignReviewSeedVO[]
  experimentCandidates?: CareerCampaignReviewSeedVO[]
  memoryCandidates?: CareerMemoryCandidateVO[]
  evidenceUsageCount?: number
  outcomeSampleCount?: number
  usageSourceHash?: string
}

export interface CareerCampaignReviewGenerateDTO {
  campaignId: number
  idempotencyKey: string
  requestId?: string
}

export interface CareerCampaignReviewFactDTO {
  key: string
  label?: string
  value?: unknown
  sourceRef?: string
}

export interface CareerCampaignReviewFactVO {
  key?: string
  label?: string
  value?: unknown
  sourceRef?: string
}

export interface CareerCampaignReviewSeedDTO {
  semanticKey: string
  title?: string
  description?: string
  sourceRef?: string
  confidenceLevel?: string
  validityDays?: number
  causalClaim?: boolean
}

export interface CareerCampaignReviewSourceDTO {
  sourceType: string
  sourceId?: number
  sourceVersion?: number
  sourceTime?: string
  sourceUpdatedAt?: string
  sourceHash?: string
}

export interface CareerCampaignReviewSeedVO {
  candidateId?: number
  semanticKey?: string
  title?: string
  description?: string
  sourceRef?: string
  confidenceLevel?: string
  validityDays?: number
  status?: string
  effective?: boolean
}

export interface CareerMemoryCandidateVO {
  id?: number
  candidateId?: number
  candidateKey?: string
  title?: string
  content?: string
  sourceSummary?: string
  confidenceLevel?: string
  expiresAt?: string
  status?: 'CANDIDATE' | 'CONFIRMED' | 'DISABLED' | 'EXPIRED' | string
  confirmedAt?: string
  candidateScopeType?: string
  candidateScopeKey?: string
  candidateType?: string
  usageSourceHash?: string
  evidenceCount?: number
  sampleCount?: number
  limits?: string[]
  unknowns?: string[]
  decisionCode?: 'KEEP' | 'EDIT' | 'CONTINUE' | 'REJECT' | string
  decisionAt?: string
  promotedMemoryId?: number
  memoryDraftId?: number
  fallback?: boolean
  stale?: boolean
}

export interface ApplicationWorkspaceVO {
  application?: ApplicationWorkspaceApplication
  campaign?: CareerCampaignVO | null
  allowedTransitions?: string[]
  capabilities?: V7Capability[] | Record<string, boolean | string | null | undefined>
  timeline?: WorkspaceTimelineEvent[]
  calendar?: unknown[]
  materials?: WorkspaceMaterial[]
  sections?: Partial<Record<V7SectionKey, WorkspaceSectionPayload>>
  nextSteps?: WorkspaceNextStep[] | string[]
  coverage?: WorkspaceCoverage | Record<string, WorkspaceCoverageItem>
  warnings?: string[]
  evidenceUsageCount?: number
  outcomeSampleCount?: number
  evidenceUsageSourceHash?: string
  lockVersion?: number
  generatedAt?: string
}

export interface ApplicationWorkspaceApplication {
  id: number
  campaignId?: number | null
  companyName?: string
  jobTitle?: string
  source?: string
  status?: string
  stageChangedAt?: string
  priorityLevel?: string
  opportunityOutcome?: string
  appliedAt?: string
  nextFollowUpAt?: string
  note?: string
  targetJobId?: number
  resumeVersionId?: number
  resumeVersionName?: string
  matchReportId?: number
  lockVersion?: number
}

export interface WorkspaceCoverage {
  included?: string[]
  unavailable?: string[]
  failed?: string[]
  warnings?: string[]
}

export interface WorkspaceCoverageItem {
  owner?: string
  available?: boolean
  itemCount?: number
  truncated?: boolean
}

export interface WorkspaceSectionPayload {
  data?: unknown
  loading?: boolean
  error?: string
  available?: boolean
}

export interface WorkspaceTimelineEvent {
  id: number | string
  eventType?: string
  eventTime?: string
  title?: string
  summary?: string
  source?: string
  status?: string
}

export interface WorkspaceMaterial {
  id: number | string
  type?: string
  title?: string
  label?: string
  status?: string
  href?: string
  sourceRef?: string
}

export interface WorkspaceNextStep {
  id: number | string
  title?: string
  description?: string
  dueAt?: string
  priority?: string
  source?: string
  requiresConfirmation?: boolean
}

export interface InterviewRoundVO {
  id: number | string
  roundType?: string
  status?: string
  scheduledAt?: string
  scheduledStartsAtUtc?: string
  timezone?: string
  location?: string
  calendarEventId?: number
  preparationStatus?: string
  preparationStale?: boolean
  resultSummary?: string
  reviewSummary?: string
  nextStep?: string
  nextActions?: string[]
}

export interface InterviewProcessVO {
  id?: number
  rounds?: InterviewRoundVO[]
  timezone?: string
  warnings?: string[]
}

export type CareerOfferStatus =
  | 'DRAFT'
  | 'RECEIVED'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'WITHDRAWN'
  | string

export interface CareerOfferVersionVO {
  id: number | string
  versionNo?: number
  currency?: string
  baseSalary?: number | string | null
  annualBaseSalary?: number | string | null
  totalCompensation?: number | string | null
  bonus?: number | string | null
  annualBonus?: number | string | null
  deadlineAt?: string
  decisionDeadline?: string
  location?: string
  workMode?: string
  startDate?: string
  notes?: string
  note?: string
  createdAt?: string
}

export interface CareerOfferVO {
  id: number | string
  title?: string
  companyName?: string
  status?: CareerOfferStatus
  currentVersionId?: number | string
  decisionDeadline?: string
  currentVersion?: CareerOfferVersionVO | null
  versions?: CareerOfferVersionVO[]
  lockVersion?: number
}

export interface CareerOfferComparison {
  currency?: string
  offers: CareerOfferVO[]
  warnings: string[]
  comparable: boolean
  missingValueOfferIds: Array<number | string>
}

export interface CareerContactVO {
  id: number | string
  displayName?: string
  role?: string
  roleType?: string
  channelType?: string
  maskedContactHint?: string
  relationshipSummary?: string
  nextFollowUpAt?: string
}

export interface CareerActivityVO {
  id: number | string
  type?: string
  activityType?: string
  happenedAt?: string
  occurredAt?: string
  summary?: string
  nextFollowUpAt?: string
  status?: string
}

export interface CareerCommunicationDraftVO {
  subject?: string
  body?: string
  factsUsed?: string[]
  warnings?: string[]
  confidenceLevel?: string
  fallback?: boolean
  confidence?: string
}

export interface CareerResearchSourceVO {
  id: number | string
  sourceType?: string
  title?: string
  url?: string
  officialUrl?: string
  collectedAt?: string
  active?: boolean
  status?: string
  contentHash?: string
  currentVersion?: CareerResearchSourceVersionVO | null
}

export interface CareerResearchSourceVersionVO {
  id?: number | string
  sourceId?: number | string
  versionToken?: string
  contentHash?: string
  contentSummary?: string
  capturedAt?: string
  createdAt?: string
}

export interface CareerResearchSnapshotVO {
  id?: number | string
  facts?: string[]
  research?: {
    facts?: Array<string | { statement?: string; sourceVersionIds?: number[] }>
    unknowns?: string[]
    sourceLimits?: string[]
    questionsToVerify?: string[]
    preparationFocus?: string[]
    riskSignals?: string[]
    confidenceLevel?: string
  } | null
  unknowns?: string[]
  sourceLimits?: string[]
  questionsToVerify?: string[]
  preparationFocus?: string[]
  riskSignals?: string[]
  sourceRefs?: string[]
  sourceVersionIds?: Array<number | string>
  confidenceLevel?: string
  fallback?: boolean
  fallbackReason?: string
  generatedAt?: string
}

export interface V7StatusTransitionDTO {
  targetStatus: string
  expectedLockVersion: number
  idempotencyKey: string
  note?: string
}

export interface V7StatusTransitionVO {
  application: ApplicationWorkspaceApplication
  allowedTransitions: string[]
}

export interface V7ExternalPlanIntent {
  sourceItemKey?: string
  title: string
  description?: string
  planDate?: string
  weekday?: string
  estimatedMinutes?: number
  priority?: string
  confidenceLevel?: string
  fallback?: boolean
}

export interface V7ExternalPlanPreviewDTO {
  sourceType: string
  sourceId?: number | string
  sourceVersion?: number
  sourceContextHash?: string
  targetJobId?: number
  targetDate?: string
  intents: V7ExternalPlanIntent[]
  idempotencyKey: string
}

export interface V7ExternalPlanPreviewVO {
  changeSetId: number
  status?: string
  previewVersion?: number
  previewHash?: string
  expiresAt?: string
  confirmable?: boolean
  resultSource?: string
  fallback?: boolean
  summary?: Record<string, unknown>
  items?: Record<string, unknown>[]
  warnings?: string[]
  blockers?: string[]
  failureMessage?: string
}

export interface V7ExternalPlanConfirmDTO {
  previewVersion?: number
  previewHash?: string
  acknowledgedWarningCodes: string[]
  idempotencyKey: string
}
