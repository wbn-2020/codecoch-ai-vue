import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminAiResultFeedbackQueryDTO,
  AiResultFeedbackCreateDTO,
  AiResultFeedbackStatsVO,
  AiResultFeedbackVO
} from '@/types/aiFeedback'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

export const submitAiResultFeedbackApi = (data: AiResultFeedbackCreateDTO) => {
  return request.post<AiResultFeedbackVO, AiResultFeedbackVO>('/ai/feedback', data)
}

export const getAdminAiResultFeedbackStatsApi = (params?: { days?: number }) => {
  return request.get<AiResultFeedbackStatsVO, AiResultFeedbackStatsVO>('/admin/ai/feedback/stats', {
    params: compactQueryParams(params)
  })
}

export const getAdminAiResultFeedbackListApi = (params?: AdminAiResultFeedbackQueryDTO) => {
  return request
    .get<PageResult<AiResultFeedbackVO>, PageResult<AiResultFeedbackVO>>('/admin/ai/feedback', {
      params: compactQueryParams(params)
    })
    .then((result) => normalizePageResult(result, params))
}
