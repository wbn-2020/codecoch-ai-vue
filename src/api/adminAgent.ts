import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminAgentRunQueryDTO,
  AdminAgentTaskQueryDTO,
  AgentRunDetailVO,
  AgentTaskVO
} from '@/types/agent'
import { normalizePageResult } from '@/utils/page'

export const getAdminAgentRunsApi = (params?: AdminAgentRunQueryDTO) => {
  return request
    .get<PageResult<AgentRunDetailVO>, PageResult<AgentRunDetailVO>>('/admin/agent/runs', { params })
    .then((result) => normalizePageResult(result, params, (run) => ({ ...run, tasks: run.tasks || [] })))
}

export const getAdminAgentRunDetailApi = (id: number) => {
  return request.get<AgentRunDetailVO, AgentRunDetailVO>(`/admin/agent/runs/${id}`).then((run) => ({
    ...run,
    tasks: run.tasks || []
  }))
}

export const getAdminAgentTasksApi = (params?: AdminAgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/admin/agent/tasks', { params })
    .then((result) => normalizePageResult(result, params, (task) => ({ ...task, status: task.status || 'TODO' })))
}
