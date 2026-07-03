import request from '@/utils/request'
import type { AiResultFeedbackCreateDTO, AiResultFeedbackStatsVO, AiResultFeedbackVO } from '@/types/aiFeedback'
import { compactQueryParams } from '@/utils/page'

export const submitAiResultFeedbackApi = (data: AiResultFeedbackCreateDTO) => {
  return request.post<AiResultFeedbackVO, AiResultFeedbackVO>('/ai/feedback', data)
}

export const getAdminAiResultFeedbackStatsApi = (params?: { days?: number }) => {
  return request.get<AiResultFeedbackStatsVO, AiResultFeedbackStatsVO>('/admin/ai/feedback/stats', {
    params: compactQueryParams(params)
  })
}
