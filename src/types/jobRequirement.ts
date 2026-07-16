import type { PageResult } from '@/types/api'

export type JobRequirementStatus = 'COVERED' | 'WEAK' | 'MISSING' | 'UNVERIFIED' | 'CONFLICT' | string

export interface JobRequirementEvidenceVO {
  id?: number
  evidenceType?: string
  evidenceId?: string | number
  evidenceSubId?: string | number
  title?: string
  excerpt?: string
  resultSource?: string
  score?: number
  matchStatus?: JobRequirementStatus
  matchScore?: number
  confidenceLevel?: string
  confidence?: string
  matchReason?: string
  sourceType?: string
  confirmed?: boolean | number
  fallback?: boolean
  occurredAt?: string
}

export interface JobRequirementActionVO {
  actionCode?: string
  path?: string
  actionType?: string
  title?: string
  description?: string
  actionUrl?: string
  priority?: number
}

export interface JobRequirementItemVO {
  requirementId: number
  requirementType: string
  requirementKey?: string
  title: string
  description?: string
  skillName?: string
  skillCategory?: string
  requiredLevel?: string
  weight?: number
  priority?: number
  status: JobRequirementStatus
  confidence?: string
  evidences: JobRequirementEvidenceVO[]
  gaps: string[]
  nextActions: JobRequirementActionVO[]
}

export interface JobRequirementGroupVO {
  requirementType: string
  title?: string
  items: JobRequirementItemVO[]
}

export interface JobRequirementMatrixSummaryVO {
  total: number
  covered: number
  weak: number
  missing: number
  unverified: number
  conflict?: number
  coveragePercent?: number
  confidence?: string
  sampleInsufficient?: boolean
}

export interface JobRequirementMatrixVO {
  targetJobId: number
  jdAnalysisId?: number
  generatedAt?: string
  summary: JobRequirementMatrixSummaryVO
  groups: JobRequirementGroupVO[]
  requirements?: Array<{
    requirementId?: number
    requirementKey?: string
    requirementType?: string
    requirementName?: string
    priority?: string | number
    weight?: number
    requirementConfidence?: string
    requirementFallback?: boolean
    coverageLevel?: string
    evidences?: Array<{
      id?: number
      evidenceType?: string
      evidenceId?: number
      evidenceSubId?: number
      title?: string
      excerpt?: string
      resultSource?: string
      score?: number
      occurredAt?: string
      projectEvidenceId?: number
      projectSkillEvidenceId?: number
      projectTitle?: string
      skillName?: string
      matchType?: string
      coverageLevel?: string
      confidenceLevel?: string
      confidence?: string
      sourceType?: string
      confirmed?: boolean
      fallback?: boolean
      evidenceText?: string
      matchReason?: string
    }>
    nextActions?: JobRequirementActionVO[]
  }>
  requirementCount?: number
  strongCount?: number
  weakCount?: number
  missingCount?: number
  warnings: string[]
  traceId?: string
}

export interface JobReadinessDimensionVO {
  dimension: string
  title?: string
  score?: number
  level?: string
  confidence?: string
  confidenceLevel?: string
  fallback?: boolean
  sampleCount?: number
  evidenceCount?: number
  coveredRequirementCount?: number
  missingRequirementCount?: number
  sampleInsufficient?: boolean
  reason?: string
  warnings?: string[]
}

export interface JobReadinessSnapshotVO {
  id?: number
  targetJobId: number
  jdAnalysisId?: number
  snapshotHash?: string
  overallScore?: number
  overallLevel?: string
  readinessScore?: number
  readinessLevel?: string
  confidence?: string
  confidenceLevel?: string
  fallback?: boolean
  sampleCount?: number
  sampleInsufficient?: boolean
  algorithmVersion?: string
  policyVersion?: string
  requirementCount?: number
  strongCount?: number
  weakCount?: number
  missingCount?: number
  mustRequirementCount?: number
  mustMissingCount?: number
  summary?: unknown
  matrix?: unknown
  generatedAt?: string
  createdAt?: string
  dimensions: JobReadinessDimensionVO[]
  warnings: string[]
  traceId?: string
}

export interface JobReadinessSnapshotDetailVO extends JobReadinessSnapshotVO {
  id: number
}

export interface JobReadinessHistoryPageQuery {
  pageNo?: number
  pageSize?: number
}

export type JobReadinessHistoryPageResult = PageResult<JobReadinessSnapshotVO>
