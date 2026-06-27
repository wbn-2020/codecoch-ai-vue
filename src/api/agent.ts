import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  ActivationHandoffVO,
  AgentCoachActionDTO,
  AgentCoachActionVO,
  AgentRunDetailVO,
  AgentFeedbackDTO,
  AgentFeedbackVO,
  AgentMetricAckVO,
  AgentMetricEventDTO,
  AgentTaskCompleteDTO,
  AgentTaskQueryDTO,
  AgentTaskSkipDTO,
  AgentTaskVO,
  AgentTodayTaskQuery,
  AgentTodayTaskVO,
  DailyPlanGenerateDTO,
  DailyPlanVO
} from '@/types/agent'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

const normalizeActivationHandoffs = (handoffs?: ActivationHandoffVO[] | null) =>
  Array.isArray(handoffs) ? handoffs.filter(Boolean) : []

const normalizeTask = (task: AgentTaskVO): AgentTaskVO => {
  const agentRunId = task.agentRunId ?? task.runId ?? null
  const normalizedSourceId = task.sourceId == null ? null : Number(task.sourceId)
  const status = String(task.status || 'TODO').toUpperCase()
  return {
    ...task,
    agentRunId,
    runId: task.runId ?? agentRunId,
    sourceId: normalizedSourceId == null || Number.isFinite(normalizedSourceId) ? normalizedSourceId : task.sourceId,
    trustStatus: task.trustStatus ? String(task.trustStatus).toUpperCase() : task.trustStatus,
    reviewSource: task.reviewSource ? String(task.reviewSource).toUpperCase() : task.reviewSource,
    reviewNextActions: Array.isArray(task.reviewNextActions) ? task.reviewNextActions.filter(Boolean) : [],
    estimatedEffortMinutes: task.estimatedEffortMinutes ?? task.estimatedMinutes ?? null,
    actionType: task.actionType ?? null,
    activationHandoffs: normalizeActivationHandoffs(task.activationHandoffs),
    fallback: Boolean(task.fallback),
    status
  }
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

export const getAgentTasksApi = (params?: AgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/agent/tasks', { params: compactQueryParams(toAgentTaskQueryParams(params)) })
    .then((result) => normalizePageResult(result, params, normalizeTask))
}

export const completeAgentTaskApi = (id: number, data?: AgentTaskCompleteDTO) => {
  return request
    .post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/complete`, data || {})
    .then(normalizeTask)
}

export const startAgentTaskApi = (id: number) => {
  return request.post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/start`).then(normalizeTask)
}

export const skipAgentTaskApi = (id: number, data?: AgentTaskSkipDTO) => {
  return request
    .post<AgentTaskVO, AgentTaskVO>(`/agent/tasks/${id}/skip`, data || {})
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
