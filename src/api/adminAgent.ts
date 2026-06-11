import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminAgentRunQueryDTO,
  AdminAgentTaskQueryDTO,
  AgentRunDetailVO,
  AgentTaskVO
} from '@/types/agent'
import type { AiLogRawAccessDTO } from '@/types/ai'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

const parseJsonField = (value: unknown) => {
  if (typeof value !== 'string') return value ?? null
  if (!value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

const normalizeRun = (run: AgentRunDetailVO & { inputSnapshotJson?: string | null; outputJson?: string | null }) => ({
  ...run,
  inputSnapshot: parseJsonField(run.inputSnapshot ?? run.inputSnapshotJson),
  output: parseJsonField(run.output ?? run.outputJson),
  rawOutputText: run.rawOutputText || null,
  rawAvailable: Boolean(run.rawAvailable),
  rawAccessPermission: run.rawAccessPermission || 'admin:ai:log:raw:view',
  tasks: run.tasks || []
})

export const getAdminAgentRunsApi = (params?: AdminAgentRunQueryDTO) => {
  return request
    .get<PageResult<AgentRunDetailVO>, PageResult<AgentRunDetailVO>>('/admin/agent/runs', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params, normalizeRun))
}

export const getAdminAgentRunDetailApi = (id: number) => {
  return request.get<AgentRunDetailVO, AgentRunDetailVO>(`/admin/agent/runs/${id}`).then(normalizeRun)
}

export const getAdminAgentRunRawApi = (id: number, data: AiLogRawAccessDTO) => {
  return request.post<AgentRunDetailVO, AgentRunDetailVO>(`/admin/agent/runs/${id}/raw`, data).then(normalizeRun)
}

export const getAdminAgentTasksApi = (params?: AdminAgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/admin/agent/tasks', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params, (task) => ({ ...task, status: task.status || 'TODO' })))
}
