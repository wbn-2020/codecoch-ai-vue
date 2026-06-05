import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminAgentRunQueryDTO,
  AdminAgentTaskQueryDTO,
  AgentRunDetailVO,
  AgentTaskVO
} from '@/types/agent'
import { normalizePageResult } from '@/utils/page'

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
    .get<PageResult<AgentRunDetailVO>, PageResult<AgentRunDetailVO>>('/admin/agent/runs', { params })
    .then((result) => normalizePageResult(result, params, normalizeRun))
}

export const getAdminAgentRunDetailApi = (id: number) => {
  return request.get<AgentRunDetailVO, AgentRunDetailVO>(`/admin/agent/runs/${id}`).then(normalizeRun)
}

export const getAdminAgentTasksApi = (params?: AdminAgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/admin/agent/tasks', { params })
    .then((result) => normalizePageResult(result, params, (task) => ({ ...task, status: task.status || 'TODO' })))
}
