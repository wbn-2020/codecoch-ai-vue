import request from '@/utils/request'
import type { PageQuery, PageResult } from '@/types/api'

export interface AiPromptTemplateVO {
  id: number
  templateName: string
  templateType: string
  status: number
}

export interface AiCallLogVO {
  id: number
  bizType: string
  status: number
  createdAt?: string
}

// Admin-only placeholders for later integration. Stage 1 pages do not call them.
export const getAdminAiPromptsApi = (params: PageQuery) => {
  return request.get<PageResult<AiPromptTemplateVO>, PageResult<AiPromptTemplateVO>>(
    '/admin/ai/prompts',
    { params }
  )
}

export const getAdminAiLogsApi = (params: PageQuery) => {
  return request.get<PageResult<AiCallLogVO>, PageResult<AiCallLogVO>>('/admin/ai/logs', {
    params
  })
}
