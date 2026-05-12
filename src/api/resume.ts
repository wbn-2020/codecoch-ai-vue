import request from '@/utils/request'
import type { ResumeSummaryVO } from '@/types/resume'

// Reserved for the next stage. Stage 1 placeholder pages do not call this API.
export const getResumesApi = () => {
  return request.get<ResumeSummaryVO[], ResumeSummaryVO[]>('/resumes')
}
