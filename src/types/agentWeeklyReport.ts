export type AgentWeeklyReportConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'FACT_ONLY'
export type WeeklyReportConsistencyLevel = 'COMPLETE' | 'PARTIAL' | 'BEST_EFFORT'
export type WeeklyReportSourceStatus = 'INCLUDED' | 'EXCLUDED' | 'UNAVAILABLE' | 'TRUNCATED'
export type WeeklyReportWindowStatus = 'IN_PROGRESS' | 'COMPLETED' | 'HISTORICAL'
export type WeeklyReportHypothesisStatus = 'TO_VALIDATE'
export type WeeklyPlanDraftStatus = 'DRAFT' | 'PREVIEWED' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED'

export interface AgentWeeklyReportGenerateRequest {
  weekStartDate?: string
  targetJobId?: number
  timezone?: string
  forceRefresh?: boolean
  requestId?: string
  idempotencyKey?: string
}

export interface AgentWeeklyReportQuery {
  weekStartDate?: string
  fromWeekStart?: string
  toWeekStart?: string
  targetJobId?: number
  timezone?: string
  limit?: number
}

export interface AgentWeeklyReportRefreshRequest {
  requestId?: string
  idempotencyKey?: string
}

export interface WeeklyReportRange {
  weekStartDate?: string
  weekEndDate?: string
  rangeStartUtc?: string
  rangeEndUtc?: string
  sourceCutoffAt?: string
  timezone?: string
  windowStatus?: WeeklyReportWindowStatus | string
}

export interface WeeklySourceCoverageItem {
  sourceType?: string
  sourceId?: number
  sourceTime?: string
  sourceUpdatedAt?: string
  scopeKey?: string
  inclusionStatus?: WeeklyReportSourceStatus | string
  excludeReason?: string
  sourceHash?: string
  safeSummary?: string
  metadata: Record<string, unknown>
}

export interface WeeklyReportCoverage {
  includedCounts: Record<string, number>
  excludedCounts: Record<string, number>
  unavailableCounts: Record<string, number>
  sources: WeeklySourceCoverageItem[]
  truncated: boolean
  warnings: string[]
  consistencyLevel: WeeklyReportConsistencyLevel | string
}

export interface WeeklyReportFact {
  factId?: string
  factType?: string
  label?: string
  value?: unknown
  unit?: string
  scope?: string
  timeWindow?: string
  sourceRefs: string[]
  calculationVersion?: string
}

export interface WeeklyReportSignal {
  signalId?: string
  signalType?: string
  direction?: string
  title?: string
  description?: string
  metric: Record<string, unknown>
  confidenceLevel?: AgentWeeklyReportConfidenceLevel | string
  sampleBoundary: Record<string, unknown>
  scope?: string
  comparedScope?: string
  sourceRefs: string[]
  blockedConclusions: string[]
}

export interface WeeklyReportHypothesis {
  hypothesisId?: string
  statement?: string
  primaryVariable?: string
  fixedVariables: string[]
  expectedSignal?: string
  successMetric?: string
  minimumSample?: number
  observationDays?: number
  stopCondition?: string
  confidenceLevel?: AgentWeeklyReportConfidenceLevel | string
  basedOnSignalIds: string[]
  sourceRefs: string[]
  status: WeeklyReportHypothesisStatus | string
}

export interface WeeklyExperimentSuggestion {
  suggestionId?: string
  semanticKey?: string
  title?: string
  hypothesis?: string
  primaryVariable?: string
  fixedVariables: string[]
  eligibleSegments: Array<Record<string, unknown>>
  expectedSignal?: string
  successMetric?: string
  targetSample?: number
  minimumSample?: number
  observationDays?: number
  stopCondition?: string
  confidenceLevel?: AgentWeeklyReportConfidenceLevel | string
  basedOnSignalIds: string[]
  sourceRefs: string[]
  status: WeeklyReportHypothesisStatus | string
  metadata: Record<string, unknown>
}

export interface WeeklyPlanDraftItem {
  semanticKey?: string
  targetDate?: string
  actionType?: string
  title?: string
  description?: string
  reason?: string
  sourceWeeklyReportSnapshotId?: string
  sourceHypothesisId?: string
  estimatedMinutes?: number
  priority?: string
  conflictCheckRequired: boolean
  userDecision?: string
  requiresUserConfirmation: boolean
}

export interface WeeklyPlanDraft {
  available: boolean
  sourceSnapshotId?: string
  targetWeekStart?: string
  unavailableReason?: string
  items: WeeklyPlanDraftItem[]
  stageFivePreviewRoute?: string
  status?: WeeklyPlanDraftStatus | string
}

export interface WeeklyReportSnapshotVersion {
  snapshotId?: number
  snapshotVersion?: number
  reportStatus?: string
  confidenceLevel?: AgentWeeklyReportConfidenceLevel | string
  resultSource?: string
  fallback: boolean
  sourceCutoffAt?: string
  generatedAt?: string
  current: boolean
}

export interface AgentWeeklyReport {
  id?: number
  snapshotId?: number
  targetJobId?: number
  targetScopeKey?: string
  weekStartDate?: string
  weekEndDate?: string
  timezone?: string
  reportStatus?: string
  snapshotVersion?: number
  operationResult?: string
  summary?: string
  confidenceLevel: AgentWeeklyReportConfidenceLevel
  fallback: boolean
  fallbackReason?: string
  resultSource?: string
  traceId?: string
  aiCallLogId?: number
  range?: WeeklyReportRange
  coverage: WeeklyReportCoverage
  facts: WeeklyReportFact[]
  signals: WeeklyReportSignal[]
  hypotheses: WeeklyReportHypothesis[]
  experimentSuggestions: WeeklyExperimentSuggestion[]
  planDraft: WeeklyPlanDraft
  snapshotHistory: WeeklyReportSnapshotVersion[]
  sourceCutoffAt?: string
  generatedAt?: string
  refreshedAt?: string
  createdAt?: string
  updatedAt?: string
}

export interface WeeklyReportCoverageGroup {
  sourceType: string
  label: string
  includedCount: number
  excludedCount: number
  unavailableCount: number
  status: WeeklyReportSourceStatus
  reasons: string[]
}

export interface WeeklyReportDisplayPolicy {
  factOnly: boolean
  showSignals: boolean
  showHypotheses: boolean
  showExperiments: boolean
  showPlanDraft: boolean
  sourceLimited: boolean
}

export interface WeeklyPlanPreviewItem {
  semanticKey?: string
  actionType?: string
  title?: string
  description?: string
  reason?: string
  plannedDate?: string
  estimatedMinutes?: number
  priority?: string
  sourceHypothesisId?: string
  requiresUserConfirmation: true
}

export interface WeeklyPlanPreviewPayload {
  sourceType: 'AGENT_WEEKLY_REPORT'
  sourceId?: number
  sourceSnapshotId?: number | string
  sourceSnapshotVersion?: number
  targetWeekStart?: string
  targetJobId?: number
  timezone?: string
  items: WeeklyPlanPreviewItem[]
  idempotencyKey: string
}
