import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminAgentRunDetailVO,
  AdminAgentRunQueryDTO,
  AdminAgentTaskQueryDTO,
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

const normalizeRun = (run: AdminAgentRunDetailVO): AdminAgentRunDetailVO => ({
  ...run,
  inputSnapshot: parseJsonField(run.inputSnapshot ?? run.inputSnapshotJson),
  output: parseJsonField(run.output ?? run.outputJson),
  rawOutputText: run.rawOutputText || null,
  rawAvailable: Boolean(run.rawAvailable),
  rawAccessPermission: run.rawAccessPermission || 'admin:ai:log:raw:view',
  tasks: run.tasks || []
})

const normalizeDateParam = (value?: string) => value ? value.slice(0, 10) : undefined

const toAdminAgentRunQueryParams = (params?: AdminAgentRunQueryDTO) => ({
  pageNo: params?.pageNo ?? params?.pageNum,
  pageSize: params?.pageSize,
  userId: params?.userId,
  agentType: params?.agentType,
  status: params?.status,
  triggerType: params?.triggerType,
  startDate: normalizeDateParam(params?.startDate ?? params?.startTime),
  endDate: normalizeDateParam(params?.endDate ?? params?.endTime)
})

const toAdminAgentTaskQueryParams = (params?: AdminAgentTaskQueryDTO) => ({
  pageNo: params?.pageNo ?? params?.pageNum,
  pageSize: params?.pageSize,
  userId: params?.userId,
  startDate: params?.startDate,
  endDate: params?.endDate,
  targetJobId: params?.targetJobId,
  taskType: params?.taskType,
  status: params?.status,
  priority: params?.priority
})

export const getAdminAgentRunsApi = (params?: AdminAgentRunQueryDTO) => {
  return request
    .get<PageResult<AdminAgentRunDetailVO>, PageResult<AdminAgentRunDetailVO>>('/admin/agent/runs', {
      params: compactQueryParams(toAdminAgentRunQueryParams(params))
    })
    .then((result) => normalizePageResult(result, params, normalizeRun))
}

export const getAdminAgentRunDetailApi = (id: number) => {
  return request.get<AdminAgentRunDetailVO, AdminAgentRunDetailVO>(`/admin/agent/runs/${id}`).then(normalizeRun)
}

export const getAdminAgentRunRawApi = (id: number, data: AiLogRawAccessDTO) => {
  return request.post<AdminAgentRunDetailVO, AdminAgentRunDetailVO>(`/admin/agent/runs/${id}/raw`, data).then(normalizeRun)
}

export const getAdminAgentTasksApi = (params?: AdminAgentTaskQueryDTO) => {
  return request
    .get<PageResult<AgentTaskVO>, PageResult<AgentTaskVO>>('/admin/agent/tasks', {
      params: compactQueryParams(toAdminAgentTaskQueryParams(params))
    })
    .then((result) => normalizePageResult(result, params, (task) => ({ ...task, status: task.status || 'TODO' })))
}
