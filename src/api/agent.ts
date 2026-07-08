import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ActivationHandoffVO,
  AgentContextImpactPreviewVO,
  AgentCoachActionDTO,
  AgentCoachActionVO,
  AgentPlanAdjustmentVO,
  AgentPlanInfluenceVO,
  AgentRunDetailVO,
  AgentFeedbackDTO,
  AgentFeedbackVO,
  AgentMemoryCreateDTO,
  AgentMemoryImpactScope,
  AgentMemoryQueryDTO,
  AgentMemoryVO,
  AgentMetricAckVO,
  AgentMetricEventDTO,
  AgentTaskCompleteDTO,
  AgentTaskDeferDTO,
  AgentTaskQueryDTO,
  AgentTaskSkipDTO,
  AgentTaskVO,
  AgentTodayTaskQuery,
  AgentTodayTaskVO,
  AgentWeekPlanBackendItemVO,
  AgentWeekPlanBackendVO,
  AgentWeekPlanGenerateDTO,
  DailyPlanGenerateDTO,
  DailyPlanVO
} from '@/types/agent'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

const normalizeActivationHandoffs = (handoffs?: ActivationHandoffVO[] | null) =>
  Array.isArray(handoffs) ? handoffs.filter(Boolean) : []

type AgentMemoryWireVO = Omit<AgentMemoryVO, 'impactPreview'> & {
  impactPreview?: AgentMemoryImpactScope[]
}

const manualMemorySources = new Set(['MANUAL', 'USER_MANUAL', 'USER_NOTE'])
const candidateMemorySources = new Set(['AGENT_REVIEW', 'AGENT_FEEDBACK', 'JOB_EXPERIMENT', 'RESUME_JOB_MATCH', 'AI_SUMMARY', 'SYSTEM'])
const candidateMemoryStatuses = new Set(['CANDIDATE', 'PENDING_CONFIRMATION', 'UNCONFIRMED'])
const disabledMemoryStatuses = new Set(['DISABLED', 'REMOVED'])
const deletedMemoryStatuses = new Set(['DELETED', 'REMOVED'])
const staleMemoryStatuses = new Set(['STALE', 'EXPIRED'])
const defaultMemoryImpactScopes: AgentMemoryImpactScope[] = [
  'AGENT_TASK',
  'APPLICATION_PACKAGE',
  'INTERVIEW_TRAINING',
  'JOB_EXPERIMENT_REVIEW',
  'QUESTION_RECOMMENDATION'
]

const normalizeUpper = (value?: string | null) => String(value || '').trim().toUpperCase()

const normalizedMemoryConfidence = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return null
  const normalized = value > 1 ? value / 100 : value
  return Math.max(0, Math.min(1, normalized))
}

const isExpiredMemory = (value?: string | null) => {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp < Date.now()
}

const normalizeMemoryImpactScopes = (memory: AgentMemoryWireVO): AgentMemoryImpactScope[] => {
  const rawScopes = Array.isArray(memory.impactScopes)
    ? memory.impactScopes
    : (Array.isArray(memory.impactPreview) ? memory.impactPreview : defaultMemoryImpactScopes)
  return Array.from(new Set(rawScopes.filter(Boolean)))
}

export const normalizeAgentMemory = (memory: AgentMemoryWireVO): AgentMemoryVO => {
  const status = normalizeUpper(memory.memoryStatus)
  const sourceType = normalizeUpper(memory.sourceType)
  const enabled = memory.enabled === 1 || status === 'ENABLED' || status === 'ACTIVE' || status === 'CONFIRMED'
  const explicitDisabled = memory.enabled === 0 || disabledMemoryStatuses.has(status)
  const deleted = Boolean(memory.deletedAt) || deletedMemoryStatuses.has(status)
  const stale = Boolean(memory.stale) || staleMemoryStatuses.has(status) || isExpiredMemory(memory.expiresAt)
  const confidence = normalizedMemoryConfidence(memory.confidence)
  const lowConfidence = Boolean(memory.lowConfidence) || confidence === null || confidence < 0.6 || status === 'LOW_CONFIDENCE'
  const manual = manualMemorySources.has(sourceType)
  const confirmed = Boolean(memory.confirmedAt) || manual || status === 'ACTIVE' || status === 'CONFIRMED'
  const sourceRequiresConfirmation = candidateMemorySources.has(sourceType)
  const pendingConfirmation = candidateMemoryStatuses.has(status) || (sourceRequiresConfirmation && !confirmed) || (!manual && !confirmed)
  const canEnterAgentContext = enabled && confirmed && !pendingConfirmation && !lowConfidence && !stale && !deleted && !explicitDisabled
  const lifecycle = deleted
    ? 'deleted'
    : explicitDisabled
      ? 'disabled'
      : pendingConfirmation
        ? (status === 'PENDING_CONFIRMATION' ? 'pending-confirmation' : 'candidate')
        : stale
          ? 'stale'
          : lowConfidence
            ? 'low-confidence'
            : canEnterAgentContext
              ? 'active'
              : 'partial'
  const impactScopes = normalizeMemoryImpactScopes(memory)

  return {
    ...memory,
    sourceType: memory.sourceType || (manual ? 'MANUAL' : memory.sourceType),
    memoryStatus: (status || (pendingConfirmation ? 'PENDING_CONFIRMATION' : canEnterAgentContext ? 'ACTIVE' : 'DISABLED')),
    trustStatus: canEnterAgentContext ? 'VERIFIED' : pendingConfirmation ? 'CANDIDATE' : explicitDisabled || deleted ? 'DISABLED' : stale ? 'STALE' : 'PARTIAL',
    stale,
    lowConfidence,
    canBeEvidence: false,
    lifecycle,
    pendingConfirmation,
    canEnterAgentContext,
    impactScopes,
    impactPreview: {
      scopes: impactScopes,
      affectedActions: ['Agent 今日计划', '投递包取舍', '面试训练建议', '求职实验复盘'],
      allowsAgentContext: canEnterAgentContext,
      contextEffect: canEnterAgentContext
        ? '可作为偏好或约束进入 Agent 上下文，但不能替代作品、投递、面试等证据。'
        : '不会进入 Agent 强推荐上下文，只能用于确认、复核或治理提示。',
      disableOrDeleteFallback: '停用或删除后，Agent 应回退到近期任务、投递记录、实验结果和面试报告等证据源。',
      evidenceBoundary: '长期记忆只表达偏好、约束或复盘结论，不是能力证明。'
    },
    riskFlags: [
      ...(Array.isArray(memory.riskFlags) ? memory.riskFlags : []),
      ...(pendingConfirmation ? ['PENDING_CONFIRMATION'] : []),
      ...(lowConfidence ? ['LOW_CONFIDENCE'] : []),
      ...(stale ? ['STALE'] : []),
      ...(explicitDisabled || deleted ? ['CONTEXT_BLOCKED'] : [])
    ]
  }
}

const textField = (source: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

const normalizeTask = (task: AgentTaskVO): AgentTaskVO => {
  const rawTask = task as AgentTaskVO & Record<string, unknown>
  const agentRunId = task.agentRunId ?? task.runId ?? null
  const normalizedSourceId = task.sourceId == null ? null : Number(task.sourceId)
  const status = String(task.status || 'TODO').toUpperCase()
  const firstEvidence = Array.isArray(task.evidenceSources) ? task.evidenceSources.find(Boolean) : undefined
  return {
    ...task,
    agentRunId,
    runId: task.runId ?? agentRunId,
    sourceId: normalizedSourceId == null || Number.isFinite(normalizedSourceId) ? normalizedSourceId : task.sourceId,
    sourceTitle: task.sourceTitle || firstEvidence?.sourceTitle || firstEvidence?.title || firstEvidence?.sourceLabel || null,
    confidence: task.confidence ?? task.qualityGate?.suggestionStrength ?? null,
    trustStatus: task.trustStatus ? String(task.trustStatus).toUpperCase() : task.trustStatus,
    reviewSource: task.reviewSource ? String(task.reviewSource).toUpperCase() : task.reviewSource,
    reviewNextActions: Array.isArray(task.reviewNextActions) ? task.reviewNextActions.filter(Boolean) : [],
    estimatedEffortMinutes: task.estimatedEffortMinutes ?? task.estimatedMinutes ?? null,
    actionType: task.actionType ?? null,
    activationHandoffs: normalizeActivationHandoffs(task.activationHandoffs),
    fallback: Boolean(task.fallback),
    feedbackSummary: textField(rawTask, 'feedbackSummary', 'actionFeedbackSummary', 'latestFeedbackSummary'),
    lastFeedbackType: textField(rawTask, 'lastFeedbackType', 'feedbackType'),
    feedbackComment: textField(rawTask, 'feedbackComment', 'comment'),
    deferReason: textField(rawTask, 'deferReason'),
    status
  } as AgentTaskVO
}

const normalizeCoachAction = (action: AgentCoachActionVO): AgentCoachActionVO => ({
  ...action,
  actionType: action.actionType ? String(action.actionType).toUpperCase() : action.actionType,
  resultSource: action.resultSource ? String(action.resultSource).toUpperCase() : action.resultSource,
  reasons: Array.isArray(action.reasons) ? action.reasons.filter(Boolean).slice(0, 3) : [],
  evidenceRefs: Array.isArray(action.evidenceRefs) ? action.evidenceRefs.filter(Boolean) : []
})

const normalizeDailyPlan = (plan: DailyPlanVO): DailyPlanVO => {
  const tasks = (plan.tasks || []).map(normalizeTask)
  const status = String(plan.status || '').toUpperCase()
  const hasVisibleRun = Boolean(plan.runId && ['RUNNING', 'SUCCESS', 'FAILED'].includes(status))
  return {
    ...plan,
    date: plan.date || plan.planDate,
    planDate: plan.planDate || plan.date,
    status: status || plan.status,
    focusSkills: plan.focusSkills || [],
    tasks,
    activationHandoffs: normalizeActivationHandoffs(plan.activationHandoffs),
    empty: Boolean(plan.empty || (!plan.runId && !hasVisibleRun && !tasks.length))
  }
}

const normalizeTodayTasks = (view: AgentTodayTaskVO | AgentTaskVO[]): AgentTodayTaskVO => {
  if (Array.isArray(view)) {
    const tasks = view.map(normalizeTask)
    return {
      total: tasks.length,
      doneCount: tasks.filter((task) => task.status === 'DONE').length,
      todoCount: tasks.filter((task) => task.status === 'TODO' || task.status === 'DOING').length,
      skippedCount: tasks.filter((task) => task.status === 'SKIPPED').length,
      estimatedTotalMinutes: tasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0),
      completedMinutes: tasks
        .filter((task) => task.status === 'DONE')
        .reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0),
      tasks
    }
  }

  return {
    ...view,
    tasks: (view.tasks || []).map(normalizeTask)
  }
}

const toAgentTaskQueryParams = (params?: AgentTaskQueryDTO) => ({
  pageNo: params?.pageNo ?? params?.pageNum,
  pageSize: params?.pageSize,
  startDate: params?.startDate,
  endDate: params?.endDate,
  targetJobId: params?.targetJobId,
  taskType: params?.taskType,
  status: params?.status,
  priority: params?.priority
})

const toBackendLocalDateTime = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 19)
}

const normalizeBackendWeekPlanItem = (item: AgentWeekPlanBackendItemVO): AgentWeekPlanBackendItemVO => ({
  ...item,
  layer: item.layer ? String(item.layer).toUpperCase() : item.layer,
  actionType: item.actionType ? String(item.actionType).toUpperCase() : item.actionType,
  itemStatus: item.itemStatus ? String(item.itemStatus).toUpperCase() : item.itemStatus,
  trustStatus: item.trustStatus ? String(item.trustStatus).toUpperCase() : item.trustStatus,
  evidence: Array.isArray(item.evidence) ? item.evidence.filter(Boolean) : [],
  fallback: Boolean(item.fallback)
})

const normalizeBackendWeekPlan = (plan: AgentWeekPlanBackendVO): AgentWeekPlanBackendVO => ({
  ...plan,
  planStatus: plan.planStatus ? String(plan.planStatus).toUpperCase() : plan.planStatus,
  resultSource: plan.resultSource ? String(plan.resultSource).toUpperCase() : plan.resultSource,
  fallback: Boolean(plan.fallback),
  items: (plan.items || []).map(normalizeBackendWeekPlanItem)
})

export const generateDailyPlanApi = (data: DailyPlanGenerateDTO) => {
  return request
    .post<DailyPlanVO, DailyPlanVO>('/agent/job-coach/daily-plan/generate', data)
    .then(normalizeDailyPlan)
}

export const getLatestDailyPlanApi = (params?: Pick<DailyPlanGenerateDTO, 'targetJobId' | 'date'>) => {
  return request
    .get<DailyPlanVO, DailyPlanVO>('/agent/job-coach/daily-plan/latest', { params: compactQueryParams(params) })
    .then(normalizeDailyPlan)
}

export const getTodayAgentTasksApi = (params?: AgentTodayTaskQuery) => {
  return request
    .get<AgentTodayTaskVO | AgentTaskVO[], AgentTodayTaskVO | AgentTaskVO[]>('/agent/tasks/today', {
      params: compactQueryParams(params)
    })
    .then(normalizeTodayTasks)
}

export const getCurrentAgentWeekPlanApi = (
  params?: Pick<AgentWeekPlanGenerateDTO, 'targetJobId' | 'date'>,
  options?: { silentError?: boolean }
) => {
  return request
    .get<AgentWeekPlanBackendVO, AgentWeekPlanBackendVO>('/agent/week-plan/current', {
      params: compactQueryParams(params),
      silentError: options?.silentError
    })
    .then(normalizeBackendWeekPlan)
}

export const generateAgentWeekPlanApi = (data?: AgentWeekPlanGenerateDTO) => {
  return request
    .post<AgentWeekPlanBackendVO, AgentWeekPlanBackendVO>('/agent/week-plan/generate', data || {})
    .then(normalizeBackendWeekPlan)
}

export const refreshAgentWeekPlanApi = (id: number) => {
  return request
    .post<AgentWeekPlanBackendVO, AgentWeekPlanBackendVO>(`/agent/week-plan/${id}/refresh`)
    .then(normalizeBackendWeekPlan)
}

export const getAgentWeekPlanDetailApi = (id: number) => {
  return request
    .get<AgentWeekPlanBackendVO, AgentWeekPlanBackendVO>(`/agent/week-plan/${id}`)
    .then(normalizeBackendWeekPlan)
}

export const getAgentWeekPlanAdjustmentsApi = (id: number) =>
  request.get<AgentPlanAdjustmentVO[], AgentPlanAdjustmentVO[]>(`/agent/week-plan/${id}/adjustments`)

export const getAgentWeekPlanInfluencesApi = (id: number) =>
  request.get<AgentPlanInfluenceVO[], AgentPlanInfluenceVO[]>(`/agent/week-plan/${id}/influences`)

export const getAgentTasksApi = (params?: AgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/agent/tasks', { params: compactQueryParams(toAgentTaskQueryParams(params)) })
    .then((result) => normalizePageResult(result, params, normalizeTask))
}

export const getAgentMemoriesApi = (params?: AgentMemoryQueryDTO) => {
  return request
    .get<PageResult<AgentMemoryWireVO> | AgentMemoryWireVO[], PageResult<AgentMemoryWireVO> | AgentMemoryWireVO[]>('/agent/memories', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params, normalizeAgentMemory, { allowArrayFallback: true }))
}

export const createAgentMemoryApi = (data: AgentMemoryCreateDTO) => {
  return request
    .post<AgentMemoryWireVO, AgentMemoryWireVO>('/agent/memories', data)
    .then(normalizeAgentMemory)
}

export const getAgentMemoryImpactPreviewApi = (id: number) =>
  request.get<AgentContextImpactPreviewVO, AgentContextImpactPreviewVO>(`/agent/memories/${id}/impact-preview`)

export const confirmAgentMemoryApi = (id: number) => {
  return request
    .post<AgentMemoryWireVO, AgentMemoryWireVO>(`/agent/memories/${id}/confirm`)
    .then(normalizeAgentMemory)
}

export const enableAgentMemoryApi = (id: number) => {
  return request
    .post<AgentMemoryWireVO, AgentMemoryWireVO>(`/agent/memories/${id}/enable`)
    .then(normalizeAgentMemory)
}

export const disableAgentMemoryApi = (id: number) => {
  return request
    .post<AgentMemoryWireVO, AgentMemoryWireVO>(`/agent/memories/${id}/disable`)
    .then(normalizeAgentMemory)
}

export const deleteAgentMemoryApi = (id: number) => request.delete<void, void>(`/agent/memories/${id}`)

export const completeAgentTaskApi = (id: number, data?: AgentTaskCompleteDTO) => {
  return request
    .post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/complete`, data || {})
    .then(normalizeTask)
}

export const startAgentTaskApi = (id: number) => {
  return request.post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/start`).then(normalizeTask)
}

export const skipAgentTaskApi = (id: number, data: AgentTaskSkipDTO) => {
  return request
    .post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/skip`, data)
    .then(normalizeTask)
}

export const deferAgentTaskApi = (id: number, data: AgentTaskDeferDTO) => {
  return request
    .post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/defer`, {
      ...data,
      deferAt: toBackendLocalDateTime(data.deferAt),
      deferReason: data.deferReason.trim()
    })
    .then(normalizeTask)
}

export const restoreAgentTaskApi = (id: number) => {
  return request.post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/restore`).then(normalizeTask)
}

export const performAgentCoachActionApi = (
  data: AgentCoachActionDTO,
  options?: { signal?: AbortSignal; silentError?: boolean }
) => {
  return request
    .post<AgentCoachActionVO, AgentCoachActionVO>('/agent/coach/contextual-actions', data, {
      signal: options?.signal,
      silentError: options?.silentError
    })
    .then(normalizeCoachAction)
}

export const submitAgentFeedbackApi = (data: AgentFeedbackDTO) => {
  return request.post<AgentFeedbackVO, AgentFeedbackVO>('/agent/feedback', data)
}

export const recordAgentMetricEventApi = (
  data: AgentMetricEventDTO,
  options?: { silentError?: boolean }
) => {
  return request.post<AgentMetricAckVO, AgentMetricAckVO>('/agent/metrics/events', data, options)
}

export const getAgentRunDetailApi = (id: number) => {
  return request.get<AgentRunDetailVO & Record<string, unknown>, AgentRunDetailVO & Record<string, unknown>>(`/agent/runs/${id}`).then((run) => {
    const {
      inputSnapshot,
      inputSnapshotJson,
      output,
      outputJson,
      rawOutputText,
      rawAvailable,
      rawAccessPermission,
      ...safeRun
    } = run
    void inputSnapshot
    void inputSnapshotJson
    void output
    void outputJson
    void rawOutputText
    void rawAvailable
    void rawAccessPermission
    return {
      ...safeRun,
      tasks: (safeRun.tasks || []).map(normalizeTask)
    } as AgentRunDetailVO
  })
}
