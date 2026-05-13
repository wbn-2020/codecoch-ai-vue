import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AiCallLogQueryDTO,
  AiCallLogVO,
  PromptTemplateDTO,
  PromptTemplateQueryDTO,
  PromptTemplateVO
} from '@/types/ai'

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

export const getAdminAiLogsApi = (params: AiCallLogQueryDTO) => {
  return request.get<PageResult<AiCallLogVO>, PageResult<AiCallLogVO>>('/admin/ai/logs', {
    params
  })
}

export const getAdminAiLogDetailApi = (id: number) => {
  return request.get<AiCallLogVO, AiCallLogVO>(`/admin/ai/logs/${id}`)
}
