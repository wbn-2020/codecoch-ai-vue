import request from '@/utils/request'
import type { InterviewSummaryVO } from '@/types/interview'

// Reserved for the next stage. Stage 1 placeholder pages do not call this API.
export const getInterviewsApi = () => {
  return request.get<InterviewSummaryVO[], InterviewSummaryVO[]>('/interviews')
}
