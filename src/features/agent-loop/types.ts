import type { AgentReviewVO } from '@/api/v4'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import type { EvidenceSourceVO, SuggestionQualityGateVO } from '@/types/suggestion'

export type AgentLoopPlanStrength = 'STRONG' | 'NORMAL' | 'WEAK' | 'FALLBACK' | 'MOCK' | 'LOW_SAMPLE' | 'BLOCKED'

export type AgentLoopDegradationReason =
  | 'fallback'
  | 'mock'
  | 'low_sample'
  | 'trace_missing'
  | 'source_stale'
  | 'source_disabled'
  | 'source_deleted'
  | 'source_unknown'
  | 'quality_blocked'

export interface AgentLoopDiagnostics {
  planStrength: AgentLoopPlanStrength
  canPromoteToKeyAction: boolean
  degradationReasons: AgentLoopDegradationReason[]
  qualityGate?: SuggestionQualityGateVO
  evidenceSources: EvidenceSourceVO[]
}

export interface AgentLoopAction {
  task: AgentTaskVO
  taskId: number
  title: string
  status: string
  priority: string
  sourceLabel: string
  evidenceSummaries: string[]
  qualityGate?: SuggestionQualityGateVO
  planStrength: AgentLoopPlanStrength
  degradationReasons: AgentLoopDegradationReason[]
  adjustmentHints: string[]
  repeatedSkipCount: number
  canPromoteToKeyAction: boolean
}

export interface AgentReviewSections {
  facts: string[]
  limits: string[]
  drifts: string[]
  adjustments: string[]
  nextActions: string[]
}

export interface AgentLoopOverview {
  plan?: DailyPlanVO
  keyActions: AgentLoopAction[]
  allActions: AgentLoopAction[]
  latestReview?: AgentReviewVO
  reviewSections: AgentReviewSections
  nextAdjustmentSummary: string
  weekSummary: {
    total: number
    done: number
    skipped: number
    active: number
    estimatedMinutes: number
  }
  fallbackEntries: Array<{ label: string; path: string; reason: string }>
}
