import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AgentRunDetailVO,
  AgentFeedbackDTO,
  AgentFeedbackVO,
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

const normalizeTask = (task: AgentTaskVO): AgentTaskVO => {
  const agentRunId = task.agentRunId ?? task.runId ?? null
  const normalizedSourceId = task.sourceId == null ? null : Number(task.sourceId)
  return {
    ...task,
    agentRunId,
    runId: task.runId ?? agentRunId,
    sourceId: normalizedSourceId == null || Number.isFinite(normalizedSourceId) ? normalizedSourceId : task.sourceId,
    trustStatus: task.trustStatus ? String(task.trustStatus).toUpperCase() : task.trustStatus,
    fallback: Boolean(task.fallback),
    status: task.status || 'TODO'
  }
}

const normalizeDailyPlan = (plan: DailyPlanVO): DailyPlanVO => {
  const status = String(plan.status || '').toUpperCase()
  const hasVisibleRun = Boolean(plan.runId && ['RUNNING', 'SUCCESS', 'FAILED'].includes(status))
  return {
    ...plan,
    focusSkills: plan.focusSkills || [],
    tasks: (plan.tasks || []).map(normalizeTask),
    empty: Boolean(plan.empty || (!plan.runId && !hasVisibleRun))
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
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/agent/tasks', { params: compactQueryParams(params) })
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

export const submitAgentFeedbackApi = (data: AgentFeedbackDTO) => {
  return request.post<AgentFeedbackVO, AgentFeedbackVO>('/agent/feedback', data)
}

export const getAgentRunDetailApi = (id: number) => {
  return request.get<AgentRunDetailVO, AgentRunDetailVO>(`/agent/runs/${id}`).then((run) => ({
    ...run,
    tasks: (run.tasks || []).map(normalizeTask)
  }))
}
