export type CareerAttributionOutcomeType = 'POSITIVE_RESPONSE' | 'INTERVIEW' | 'OFFER'
export type ExperimentPrimaryMetric = CareerAttributionOutcomeType

export interface CareerExperimentVariantCreate {
  variantCode: string
  name: string
  description?: string
  treatment?: Record<string, unknown>
  allocationWeight?: number
  control?: boolean
}

export interface CareerExperimentHypothesisCreate {
  legacyExperimentId?: number
  name: string
  statement: string
  primaryMetric?: ExperimentPrimaryMetric
  attributionWindowDays?: number
  minSamplePerVariant?: number
  variants?: CareerExperimentVariantCreate[]
}

export interface CareerExperimentVariantVO extends CareerExperimentVariantCreate {
  id: number
  allocationWeight: number
  control: boolean
}

export interface CareerExperimentCohortVO {
  id: number
  hypothesisId: number
  name: string
  jobFamily?: string
  channel?: string
  windowStart: string
  windowEnd: string
  outcomeType?: CareerAttributionOutcomeType
  minSamplePerVariant?: number
}

export interface CareerExperimentHypothesisVO {
  id: number
  legacyExperimentId?: number
  name: string
  statement: string
  primaryMetric: ExperimentPrimaryMetric
  status?: string
  attributionWindowDays: number
  minSamplePerVariant: number
  variants: CareerExperimentVariantVO[]
  cohorts: CareerExperimentCohortVO[]
  createdAt?: string
  updatedAt?: string
}

export interface CareerExperimentAssignmentCreate {
  applicationId: number
  variantId?: number
  assignmentKey?: string
  assignedAt?: string
  jobFamily?: string
  channel?: string
}

export interface CareerExperimentAssignmentVO {
  id: number
  hypothesisId: number
  variantId: number
  variantCode?: string
  applicationId: number
  assignmentKey?: string
  assignmentMethod?: string
  assignedAt?: string
  jobFamily?: string
  channel?: string
  timeBucket?: string
}

export interface CareerExperimentCohortCreate {
  name: string
  jobFamily?: string
  channel?: string
  windowStart: string
  windowEnd: string
  outcomeType?: CareerAttributionOutcomeType
  minSamplePerVariant?: number
}

export interface CareerExperimentVariantAttributionVO {
  variantId: number
  variantCode?: string
  control: boolean
  assignedCount: number
  matureCount: number
  commonStrataSampleCount: number
  outcomeCount: number
  rawRate?: number
  adjustedRate?: number
  adjustedLiftVsControl?: number
}

export interface CareerExperimentAttributionVO {
  snapshotId?: number
  hypothesisId: number
  cohortId: number
  asOf?: string
  method?: string
  comparable: boolean
  eligibleSampleCount: number
  immatureSampleCount: number
  excludedMissingStrataCount: number
  commonStrataCount: number
  incomparableReasons: string[]
  limitations: string[]
  variants: CareerExperimentVariantAttributionVO[]
}

export type CareerCalendarEventType =
  | 'APPLICATION'
  | 'FOLLOW_UP'
  | 'INTERVIEW'
  | 'THANK_YOU'
  | 'OFFER_DEADLINE'
  | 'REVIEW'
  | string

export interface CareerCalendarEventSave {
  applicationId?: number
  title: string
  eventType?: CareerCalendarEventType
  startsAt: string
  endsAt: string
  timezone: string
  allDay?: boolean
  location?: string
  description?: string
  status?: string
}

export interface CareerCalendarEventVO extends CareerCalendarEventSave {
  id: number
  startsAtUtc?: string
  endsAtUtc?: string
  sourceType?: string
  sourceRef?: string
  externalUid?: string
  importBatchId?: number
  createdAt?: string
  updatedAt?: string
}

export type CareerImportFormat = 'CSV' | 'ICS' | string
export type CareerDuplicatePolicy = 'SKIP' | 'CREATE'
export type CareerCsvMapping = Record<string, string>

export interface CareerImportDuplicateCandidate {
  applicationId: number
  companyName?: string
  jobTitle?: string
  appliedAt?: string
  reason?: string
}

export interface CareerImportRowVO {
  rowNumber: number
  disposition?: string
  errorCode?: string
  errorMessage?: string
  applicationId?: number
  calendarEventId?: number
  raw: Record<string, string>
  duplicateCandidates: CareerImportDuplicateCandidate[]
}

export interface CareerImportPreviewVO {
  format: CareerImportFormat
  timezone: string
  headers: string[]
  suggestedMapping: CareerCsvMapping
  supportedFields: string[]
  totalCount: number
  validCount: number
  errorCount: number
  duplicateCount: number
  rows: CareerImportRowVO[]
}

export interface CareerImportResultVO {
  batchId?: number
  format: CareerImportFormat
  status?: string
  totalCount: number
  successCount: number
  errorCount: number
  duplicateCount: number
  rows: CareerImportRowVO[]
}

export interface CareerAttributionPresentation {
  level: 'FACT' | 'WEAK_OBSERVATION' | 'INCOMPARABLE'
  title: string
  summary: string
  facts: string[]
  cautions: string[]
}
