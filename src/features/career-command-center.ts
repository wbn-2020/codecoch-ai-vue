import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import type {
  EvidenceSourceVO,
  ExplainableSuggestionVO,
  SuggestionQualityGateVO,
  SuggestionResultSource,
  SuggestionTraceVO,
  SuggestionTrustStatus
} from '@/types/suggestion'
import { getSuggestionSourceTypeLabel } from '@/types/suggestion'
import {
  fromAgentTask,
  isEffectiveEvidenceSource
} from '@/utils/suggestionAdapter'

export type CareerActionStatus = 'TODO' | 'DOING' | 'DONE' | 'SKIPPED' | 'EXPIRED' | 'BLOCKED' | (string & {})
export type CareerActionPriority = 'HIGH' | 'MEDIUM' | 'LOW' | (string & {})

export interface ActionSourceLinkVO {
  sourceType: string
  sourceId?: number | string | null
  sourceTitle?: string
  sourceSummary?: string
  actionUrl?: string
  trustStatus?: SuggestionTrustStatus
}

export interface CareerActionItemVO {
  id: string
  title: string
  description?: string
  reason?: string
  actionType: string
  status: CareerActionStatus
  priority: CareerActionPriority
  estimatedMinutes?: number
  sourceType: string
  sourceId?: number | string | null
  sourceLinks?: ActionSourceLinkVO[]
  suggestionId?: string
  evidenceSources?: EvidenceSourceVO[]
  trace?: SuggestionTraceVO
  qualityGate?: SuggestionQualityGateVO
  resultSource?: SuggestionResultSource
  fallback?: boolean
  actionUrl?: string
  dedupeKey?: string
  dueAt?: string
  startedAt?: string
  completedAt?: string
  skippedAt?: string
  skipReason?: string
  blockedReason?: string
  pagePath?: string
}

export interface ActionQueueSummaryVO {
  total: number
  todoCount: number
  doingCount: number
  doneCount: number
  skippedCount: number
  expiredCount: number
  blockedCount: number
  estimatedTotalMinutes: number
  todayKeyActionLimit: 3
}

export interface CareerRiskSignalVO {
  id: string
  riskType: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | (string & {})
  title: string
  description: string
  recommendedActionId?: string
}

export interface CareerArtifactVO {
  id: string
  artifactType: string
  title: string
  summary?: string
  sourceType: string
  sourceId?: number | string | null
  generatedAt?: string
  actionUrl?: string
  trustStatus?: SuggestionTrustStatus
}

export interface BuildCareerRiskSignalInput {
  hasResume: boolean
  hasTargetJob: boolean
  hasTodayPlan: boolean
  hasTrustedReport: boolean
  hasUntrustedRecentReport: boolean
  pageErrorCount: number
}

export interface BuildCareerRecentArtifactsInput {
  latestMatch?: Record<string, unknown> | null
  recentReport?: Record<string, unknown> | null
  dailyPlan?: DailyPlanVO | null
}

const normalizeCode = (value?: unknown) => String(value || '').trim().toUpperCase()
const optionalTrustStatus = (value?: unknown): SuggestionTrustStatus | undefined => {
  const status = normalizeCode(value)
  return status ? status as SuggestionTrustStatus : undefined
}

const normalizeActionStatus = (value?: unknown): CareerActionStatus => {
  const status = normalizeCode(value)
  if (status === 'PENDING') return 'TODO'
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'DONE'
  return (status || 'TODO') as CareerActionStatus
}

const normalizePriority = (value?: unknown, fallback?: boolean): CareerActionPriority => {
  if (fallback) return 'LOW'
  const priority = normalizeCode(value)
  if (priority === 'HIGH' || priority === 'MEDIUM' || priority === 'LOW') return priority
  return 'MEDIUM'
}

const priorityWeight = (priority?: string) => {
  const value = normalizeCode(priority)
  if (value === 'HIGH') return 3
  if (value === 'MEDIUM') return 2
  if (value === 'LOW') return 1
  return 0
}

const statusWeight = (status?: string) => {
  const value = normalizeCode(status)
  if (value === 'DOING') return 4
  if (value === 'TODO') return 3
  if (value === 'BLOCKED') return 2
  if (value === 'EXPIRED') return 1
  return 0
}

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

const hasEffectiveEvidence = (action: CareerActionItemVO) =>
  Boolean(action.evidenceSources?.some((source) => isEffectiveEvidenceSource(source)))

const qualityStrength = (qualityGate?: SuggestionQualityGateVO) => normalizeCode(qualityGate?.suggestionStrength)

const isDegradedByTrustedResult = (action: CareerActionItemVO) => {
  const resultSource = normalizeCode(action.resultSource)
  const trustStatus = normalizeCode(action.sourceLinks?.[0]?.trustStatus)
  const strength = qualityStrength(action.qualityGate)
  if (action.fallback || resultSource === 'MOCK' || resultSource === 'FALLBACK') return true
  if (['MOCK', 'FALLBACK', 'LOW_SAMPLE', 'WEAK'].includes(strength)) return true
  if (['FALLBACK', 'DISABLED', 'STALE', 'UNKNOWN'].includes(trustStatus)) return true
  if (action.qualityGate?.gateStatus === 'BLOCKED') return true
  return false
}

export const isCareerActionClosed = (action?: CareerActionItemVO | null) =>
  ['DONE', 'SKIPPED'].includes(normalizeCode(action?.status))

export const canPromoteCareerAction = (action?: CareerActionItemVO | null) => {
  if (!action) return false
  const status = normalizeCode(action.status)
  if (!['TODO', 'DOING'].includes(status)) return false
  if (isDegradedByTrustedResult(action)) return false
  if (normalizeCode(action.priority) === 'LOW') return false
  return hasEffectiveEvidence(action)
}

export const getCareerActionSourceLabel = (action?: CareerActionItemVO | null) => {
  if (!action) return '来源待确认'
  const firstSource = action.evidenceSources?.[0] || action.sourceLinks?.[0]
  return getSuggestionSourceTypeLabel(firstSource?.sourceType || action.sourceType)
}

export const getCareerActionTrustBoundary = (action?: CareerActionItemVO | null) => {
  if (!action) return '来源状态待确认'
  const resultSource = normalizeCode(action.resultSource)
  const strength = qualityStrength(action.qualityGate)
  if (resultSource === 'MOCK') return '演示数据，不作为真实判断'
  if (action.fallback || resultSource === 'FALLBACK' || strength === 'FALLBACK') return '当前只能给出保守建议'
  if (strength === 'LOW_SAMPLE') return '样本不足，只作为观察'
  if (strength === 'WEAK') return '弱观察，不作为强推荐'
  if (action.qualityGate?.gateStatus === 'BLOCKED') return '暂时无法判断，需要补充资料'
  if (!hasEffectiveEvidence(action)) return '缺少当前有效证据'
  if (strength === 'STRONG') return '证据和追踪信息较完整'
  return '可执行，建议完成后回流复盘'
}

export const toCareerActionItemFromAgentTask = (task: AgentTaskVO): CareerActionItemVO => {
  const suggestion = fromAgentTask(task)
  const fallback = Boolean(suggestion.fallback || suggestion.mock)
  const actionType = firstText(task.actionType, task.taskType, suggestion.nextAction?.actionType, 'AGENT_TASK') || 'AGENT_TASK'
  const evidenceSources = suggestion.evidenceSources || []
  const sourceLink: ActionSourceLinkVO = {
    sourceType: 'AGENT_TASK',
    sourceId: task.id,
    sourceTitle: suggestion.title || task.title || 'Agent 今日任务',
    sourceSummary: firstText(suggestion.reason, task.reason, task.evidenceSummary, task.reviewSummary),
    actionUrl: firstText(suggestion.nextAction?.path, suggestion.nextAction?.actionUrl, task.actionUrl),
    trustStatus: suggestion.trustStatus
  }

  return {
    id: `agent-task:${task.id}`,
    title: suggestion.title || '今日训练任务',
    description: suggestion.content || task.description || task.reviewSummary || '根据当前求职准备状态生成的行动。',
    reason: suggestion.reason || task.reason || task.evidenceSummary || task.reviewSummary || '来自 Agent 今日计划',
    actionType,
    status: normalizeActionStatus(task.status),
    priority: normalizePriority(task.priority, fallback),
    estimatedMinutes: Number(task.estimatedMinutes || task.estimatedEffortMinutes) || undefined,
    sourceType: 'AGENT_TASK',
    sourceId: task.id,
    sourceLinks: [sourceLink],
    suggestionId: suggestion.id,
    evidenceSources,
    trace: suggestion.trace,
    qualityGate: suggestion.qualityGate,
    resultSource: suggestion.resultSource,
    fallback,
    actionUrl: suggestion.nextAction?.path || suggestion.nextAction?.actionUrl || task.actionUrl || '/agent/today',
    dedupeKey: `agent-task:${task.id}`,
    dueAt: task.dueDate,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    skippedAt: task.skippedAt,
    skipReason: task.skipReason,
    pagePath: '/dashboard'
  }
}

export const buildCareerActionQueue = (tasks: AgentTaskVO[] = []) => {
  const seen = new Set<string>()
  return tasks
    .map(toCareerActionItemFromAgentTask)
    .filter((action) => {
      const key = action.dedupeKey || action.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((left, right) => {
      const leftPromoted = canPromoteCareerAction(left) ? 1 : 0
      const rightPromoted = canPromoteCareerAction(right) ? 1 : 0
      if (leftPromoted !== rightPromoted) return rightPromoted - leftPromoted
      const statusDelta = statusWeight(right.status) - statusWeight(left.status)
      if (statusDelta) return statusDelta
      const priorityDelta = priorityWeight(right.priority) - priorityWeight(left.priority)
      if (priorityDelta) return priorityDelta
      return (right.estimatedMinutes || 0) - (left.estimatedMinutes || 0)
    })
}

export const buildActionQueueSummary = (actions: CareerActionItemVO[]): ActionQueueSummaryVO => ({
  total: actions.length,
  todoCount: actions.filter((action) => normalizeCode(action.status) === 'TODO').length,
  doingCount: actions.filter((action) => normalizeCode(action.status) === 'DOING').length,
  doneCount: actions.filter((action) => normalizeCode(action.status) === 'DONE').length,
  skippedCount: actions.filter((action) => normalizeCode(action.status) === 'SKIPPED').length,
  expiredCount: actions.filter((action) => normalizeCode(action.status) === 'EXPIRED').length,
  blockedCount: actions.filter((action) => normalizeCode(action.status) === 'BLOCKED').length,
  estimatedTotalMinutes: actions
    .filter((action) => !isCareerActionClosed(action))
    .reduce((sum, action) => sum + (action.estimatedMinutes || 0), 0),
  todayKeyActionLimit: 3
})

export const buildTrustedSuggestionSummaries = (
  suggestions: ExplainableSuggestionVO[] = [],
  actions: CareerActionItemVO[] = []
) => {
  const fromSuggestions = suggestions.map((suggestion) => ({
    id: suggestion.id,
    title: suggestion.title || '可信建议',
    sourceLabel: getSuggestionSourceTypeLabel(suggestion.evidenceSources?.[0]?.sourceType || suggestion.bizType),
    boundary: getCareerActionTrustBoundary({
      id: suggestion.id,
      title: suggestion.title || '可信建议',
      actionType: suggestion.nextAction?.actionType || 'NEXT_ACTION',
      status: 'TODO',
      priority: suggestion.qualityGate?.suggestionStrength === 'STRONG' ? 'HIGH' : 'MEDIUM',
      sourceType: suggestion.bizType,
      evidenceSources: suggestion.evidenceSources,
      qualityGate: suggestion.qualityGate,
      resultSource: suggestion.resultSource,
      fallback: suggestion.fallback
    })
  }))

  const fromActions = actions.slice(0, 3).map((action) => ({
    id: action.id,
    title: action.title,
    sourceLabel: getCareerActionSourceLabel(action),
    boundary: getCareerActionTrustBoundary(action)
  }))

  return [...fromSuggestions, ...fromActions].slice(0, 3)
}

export const buildCareerRiskSignals = (input: BuildCareerRiskSignalInput): CareerRiskSignalVO[] => {
  const signals: CareerRiskSignalVO[] = []
  if (!input.hasResume) {
    signals.push({
      id: 'risk:resume-missing',
      riskType: 'NEEDS_EVIDENCE',
      severity: 'HIGH',
      title: '缺少简历资料',
      description: '先补一份可匹配简历，后续行动才有项目经历证据。'
    })
  }
  if (!input.hasTargetJob) {
    signals.push({
      id: 'risk:target-job-missing',
      riskType: 'NEEDS_TARGET',
      severity: 'HIGH',
      title: '目标岗位待确认',
      description: '未选择岗位时，训练动作只能保持通用，不能作为强推荐。'
    })
  }
  if (!input.hasTodayPlan) {
    signals.push({
      id: 'risk:agent-plan-missing',
      riskType: 'NEEDS_PLAN',
      severity: 'MEDIUM',
      title: '今日计划待生成',
      description: '可以先生成今日计划，或从题库和模拟面试入口继续推进。'
    })
  }
  if (input.hasUntrustedRecentReport) {
    signals.push({
      id: 'risk:report-review-required',
      riskType: 'NEEDS_REVIEW',
      severity: 'MEDIUM',
      title: '最近报告需要复核',
      description: '失败、降级或待复核报告不会进入今日强推荐。'
    })
  }
  if (input.pageErrorCount > 0) {
    signals.push({
      id: 'risk:partial-data-failed',
      riskType: 'DEGRADED',
      severity: 'LOW',
      title: '部分数据暂不可用',
      description: '已保留可执行入口，暂不根据缺失数据生成强判断。'
    })
  }
  return signals.slice(0, 4)
}

export const buildCareerRecentArtifacts = (input: BuildCareerRecentArtifactsInput): CareerArtifactVO[] => {
  const artifacts: CareerArtifactVO[] = []
  const latestMatch = input.latestMatch || null
  const recentReport = input.recentReport || null

  if (latestMatch) {
    const reportId = latestMatch.reportId ?? latestMatch.id
    artifacts.push({
      id: `artifact:resume-match:${reportId || 'latest'}`,
      artifactType: 'RESUME_MATCH',
      title: '最新 JD 匹配报告',
      summary: firstText(latestMatch.summary, latestMatch.evidenceSummary, '用于回到简历和岗位匹配结果。'),
      sourceType: 'RESUME_MATCH',
      sourceId: typeof reportId === 'number' || typeof reportId === 'string' ? reportId : null,
      actionUrl: reportId ? `/resume-match/${reportId}` : '/resume-match',
      trustStatus: optionalTrustStatus(latestMatch.trustStatus)
    })
  }

  if (recentReport) {
    const interviewId = recentReport.interviewId ?? recentReport.sessionId ?? recentReport.id
    artifacts.push({
      id: `artifact:interview-report:${interviewId || 'latest'}`,
      artifactType: 'INTERVIEW_REPORT',
      title: '最新面试报告',
      summary: firstText(recentReport.summary, recentReport.evidenceSummary, '用于回到面试报告和训练建议。'),
      sourceType: 'INTERVIEW_REPORT',
      sourceId: typeof interviewId === 'number' || typeof interviewId === 'string' ? interviewId : null,
      actionUrl: interviewId ? `/interviews/${interviewId}/report` : '/interviews/history',
      trustStatus: optionalTrustStatus(recentReport.trustStatus)
    })
  }

  if (input.dailyPlan?.runId || input.dailyPlan?.tasks?.length) {
    artifacts.push({
      id: `artifact:agent-plan:${input.dailyPlan.runId || input.dailyPlan.planDate || 'today'}`,
      artifactType: 'AGENT_RUN',
      title: '今日 Agent 计划',
      summary: input.dailyPlan.summary || '用于继续今日任务和完成回流。',
      sourceType: 'AGENT_RUN',
      sourceId: input.dailyPlan.runId ?? null,
      actionUrl: '/agent/today',
      trustStatus: input.dailyPlan.fallback ? 'FALLBACK' : 'PARTIAL'
    })
  }

  return artifacts.slice(0, 3)
}
