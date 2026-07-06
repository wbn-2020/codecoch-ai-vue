import type { AgentTaskVO } from '@/types/agent'
import type { EvidenceSourceVO, SuggestionQualityGateVO } from '@/types/suggestion'
import type { AgentLoopAction, AgentLoopDegradationReason, AgentLoopDiagnostics, AgentLoopPlanStrength } from './types'

const normalizeCode = (value?: string | null) => String(value || '').trim().toUpperCase()

const PRIORITY_RANK: Record<string, number> = {
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10
}

const STRENGTH_RANK: Record<AgentLoopPlanStrength, number> = {
  STRONG: 60,
  NORMAL: 50,
  WEAK: 30,
  LOW_SAMPLE: 20,
  FALLBACK: 10,
  MOCK: 10,
  BLOCKED: 0
}

const WEAK_STRENGTHS = new Set(['WEAK', 'LOW_SAMPLE', 'FALLBACK', 'MOCK', 'BLOCKED'])

const CLOSED_STATUSES = new Set(['DONE', 'SKIPPED', 'CANCELED', 'CANCELLED'])

const traceAvailable = (task: AgentTaskVO): boolean =>
  Boolean(task.traceId || task.aiCallLogId || task.agentRunId || task.runId)

const sourceUnavailableReason = (source?: EvidenceSourceVO | null): AgentLoopDegradationReason | '' => {
  if (!source) return ''
  const trustStatus = normalizeCode(source.trustStatus)
  const metadata = source.metadata || {}
  if (metadata.deleted === true) return 'source_deleted'
  if (metadata.enabled === false || metadata.active === false || trustStatus === 'DISABLED') return 'source_disabled'
  if (metadata.stale === true || trustStatus === 'STALE') return 'source_stale'
  if (!normalizeCode(source.sourceType) || trustStatus === 'UNKNOWN') return 'source_unknown'
  return ''
}

const unique = <T>(items: T[]): T[] => Array.from(new Set(items.filter(Boolean)))

const normalizeStrength = (
  qualityGate?: SuggestionQualityGateVO | null,
  reasons: AgentLoopDegradationReason[] = []
): AgentLoopPlanStrength => {
  if (reasons.includes('mock')) return 'MOCK'
  if (reasons.includes('fallback')) return 'FALLBACK'
  if (reasons.includes('low_sample')) return 'LOW_SAMPLE'
  if (reasons.includes('quality_blocked')) return 'BLOCKED'
  const strength = normalizeCode(qualityGate?.suggestionStrength)
  if (strength === 'STRONG' || strength === 'NORMAL' || strength === 'WEAK' || strength === 'FALLBACK' || strength === 'MOCK' || strength === 'LOW_SAMPLE') {
    return strength
  }
  return 'NORMAL'
}

export const deriveTaskLoopDiagnostics = (task: AgentTaskVO): AgentLoopDiagnostics => {
  const qualityGate = task.qualityGate || undefined
  const evidenceSources = Array.isArray(task.evidenceSources) ? task.evidenceSources.filter(Boolean) : []
  const gateStatus = normalizeCode(qualityGate?.gateStatus)
  const resultSource = normalizeCode(task.resultSource ?? task.reviewSource)
  const trustStatus = normalizeCode(task.trustStatus)
  const reasons: AgentLoopDegradationReason[] = []

  if (task.fallback || trustStatus === 'FALLBACK' || resultSource === 'FALLBACK') reasons.push('fallback')
  if (task.mock || resultSource === 'MOCK') reasons.push('mock')
  if (qualityGate?.suggestionStrength === 'LOW_SAMPLE' || (qualityGate?.sampleSize != null && qualityGate.minSampleSize != null && qualityGate.sampleSize < qualityGate.minSampleSize)) {
    reasons.push('low_sample')
  }
  if (!traceAvailable(task)) reasons.push('trace_missing')
  if (gateStatus === 'BLOCKED') reasons.push('quality_blocked')
  reasons.push(...evidenceSources.map(sourceUnavailableReason).filter(Boolean) as AgentLoopDegradationReason[])
  if (!evidenceSources.length && !task.evidenceSummary && !task.reason) reasons.push('source_unknown')

  const degradationReasons = unique(reasons)
  let planStrength = normalizeStrength(qualityGate, degradationReasons)
  if (degradationReasons.some((reason) => reason.startsWith('source_') || reason === 'trace_missing') && planStrength === 'STRONG') {
    planStrength = 'NORMAL'
  }
  if (degradationReasons.includes('source_unknown') && planStrength === 'NORMAL') {
    planStrength = 'WEAK'
  }

  return {
    planStrength,
    canPromoteToKeyAction: !degradationReasons.length && !WEAK_STRENGTHS.has(planStrength),
    degradationReasons,
    qualityGate,
    evidenceSources
  }
}

const taskDedupeKey = (task: AgentTaskVO): string =>
  [
    normalizeCode(task.taskType || task.sourceType || task.relatedBizType),
    normalizeCode(task.relatedSkillCode || task.relatedSkillName || task.targetJobTitle || task.title)
  ].filter(Boolean).join(':') || `task:${task.id}`

const repeatedSkipCount = (task: AgentTaskVO, historyTasks: AgentTaskVO[]): number => {
  const key = taskDedupeKey(task)
  return historyTasks.filter((item) => item.id !== task.id && normalizeCode(item.status) === 'SKIPPED' && taskDedupeKey(item) === key).length
}

const evidenceSummaries = (task: AgentTaskVO): string[] => {
  const fromSources = (task.evidenceSources || [])
    .map((source) => source.evidenceSummary || source.sourceSummary || source.summary || source.sourceTitle || source.title)
    .filter(Boolean) as string[]
  return unique([task.evidenceSummary, task.reason, ...fromSources].filter(Boolean) as string[]).slice(0, 3)
}

const sourceLabel = (task: AgentTaskVO): string =>
  task.sourceType || task.relatedBizType || task.taskType || (task.agentRunId || task.runId ? 'AGENT_RUN' : 'AGENT_TASK')

const adjustmentHints = (diagnostics: AgentLoopDiagnostics, skips: number): string[] => {
  const hints: string[] = []
  if (skips >= 2) hints.push('split_or_downgrade_repeated_skip')
  if (diagnostics.degradationReasons.includes('low_sample')) hints.push('collect_more_samples')
  if (diagnostics.degradationReasons.includes('trace_missing')) hints.push('review_trace_before_promoting')
  if (diagnostics.degradationReasons.some((reason) => reason.startsWith('source_'))) hints.push('refresh_or_replace_source')
  if (diagnostics.degradationReasons.includes('fallback') || diagnostics.degradationReasons.includes('mock')) hints.push('keep_as_weak_reminder')
  return unique(hints)
}

const toLoopAction = (task: AgentTaskVO, historyTasks: AgentTaskVO[] = []): AgentLoopAction => {
  const diagnostics = deriveTaskLoopDiagnostics(task)
  const skips = repeatedSkipCount(task, historyTasks)
  return {
    task,
    taskId: task.id,
    title: task.title || task.relatedSkillName || task.targetJobTitle || `Task ${task.id}`,
    status: normalizeCode(task.status) || 'TODO',
    priority: normalizeCode(task.priority) || 'MEDIUM',
    sourceLabel: sourceLabel(task),
    evidenceSummaries: evidenceSummaries(task),
    qualityGate: diagnostics.qualityGate,
    planStrength: diagnostics.planStrength,
    degradationReasons: diagnostics.degradationReasons,
    adjustmentHints: adjustmentHints(diagnostics, skips),
    repeatedSkipCount: skips,
    canPromoteToKeyAction: diagnostics.canPromoteToKeyAction
  }
}

const actionRank = (action: AgentLoopAction): number =>
  (action.canPromoteToKeyAction ? 1000 : 0) +
  (STRENGTH_RANK[action.planStrength] || 0) +
  (PRIORITY_RANK[action.priority] || 0) -
  action.repeatedSkipCount * 8

export const buildAgentLoopActions = (
  tasks: AgentTaskVO[] = [],
  options: { historyTasks?: AgentTaskVO[] } = {}
): AgentLoopAction[] => {
  const historyTasks = options.historyTasks || tasks
  return tasks
    .filter((task) => task?.id != null)
    .map((task) => toLoopAction(task, historyTasks))
    .sort((left, right) => actionRank(right) - actionRank(left) || left.taskId - right.taskId)
}

export const selectKeyAgentActions = (
  tasks: AgentTaskVO[] = [],
  options: { limit?: number; historyTasks?: AgentTaskVO[] } = {}
): AgentLoopAction[] => {
  const limit = Math.min(Math.max(options.limit ?? 3, 1), 3)
  return buildAgentLoopActions(tasks, options)
    .filter((action) => action.canPromoteToKeyAction && !CLOSED_STATUSES.has(action.status))
    .slice(0, limit)
}
