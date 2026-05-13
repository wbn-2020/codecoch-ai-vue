import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AiCallLogQueryDTO,
  AiCallLogVO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVO
} from '@/types/ai'

type BackendAiCallLogVO = Omit<AiCallLogVO, 'status'> & {
  status: string | number
  scene?: AiCallLogVO['callType']
  costMillis?: number
  requestBody?: string
  responseBody?: string
}

const normalizeAiCallLog = (log: BackendAiCallLogVO): AiCallLogVO => ({
  ...log,
  callType: log.callType || log.scene || '',
  status: log.status === 1 ? 'SUCCESS' : log.status === 0 ? 'FAILED' : String(log.status),
  latencyMs: log.latencyMs ?? log.costMillis,
  requestParams: log.requestParams ?? log.requestBody,
  responseContent: log.responseContent ?? log.responseBody
})

const normalizeAiLogPage = (result: PageResult<BackendAiCallLogVO>): PageResult<AiCallLogVO> => ({
  ...result,
  records: (result.records || []).map(normalizeAiCallLog)
})

export const getAdminAiPromptsApi = (params: PromptTemplateQueryDTO) => {
  return request.get<PageResult<PromptTemplateVO>, PageResult<PromptTemplateVO>>(
    '/admin/ai/prompts',
    { params }
  )
}

export const getAdminAiPromptDetailApi = (id: number) => {
  return request.get<PromptTemplateVO, PromptTemplateVO>(`/admin/ai/prompts/${id}`)
}

export const createAdminAiPromptApi = (data: PromptTemplateDTO) => {
  return request.post<PromptTemplateVO, PromptTemplateVO>('/admin/ai/prompts', data)
}

export const updateAdminAiPromptApi = (id: number, data: PromptTemplateDTO) => {
  return request.put<PromptTemplateVO, PromptTemplateVO>(`/admin/ai/prompts/${id}`, data)
}

export const updateAdminAiPromptStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/ai/prompts/${id}/status`, { status })
}

export const getAdminAiLogsApi = async (params: AiCallLogQueryDTO) => {
  const result = await request.get<PageResult<BackendAiCallLogVO>, PageResult<BackendAiCallLogVO>>(
    '/admin/ai/logs',
    {
      params
    }
  )
  return normalizeAiLogPage(result)
}

export const getAdminAiLogDetailApi = async (id: number) => {
  const result = await request.get<BackendAiCallLogVO, BackendAiCallLogVO>(`/admin/ai/logs/${id}`)
  return normalizeAiCallLog(result)
}
