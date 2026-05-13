import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  FinishInterviewVO,
  InterviewAnswerDTO,
  InterviewAnswerResultVO,
  InterviewCreateDTO,
  InterviewCurrentVO,
  InterviewDetailVO,
  InterviewListVO,
  InterviewQueryDTO,
  InterviewReportVO,
  InterviewSessionVO,
  RetryReportVO
} from '@/types/interview'

export const createInterviewApi = (data: InterviewCreateDTO) => {
  return request.post<InterviewSessionVO, InterviewSessionVO>('/interviews', data)
}

export const startInterviewApi = (id: number) => {
  return request.post<InterviewCurrentVO, InterviewCurrentVO>(`/interviews/${id}/start`)
}

export const getCurrentInterviewQuestionApi = (id: number) => {
  return request.get<InterviewCurrentVO, InterviewCurrentVO>(`/interviews/${id}/current`)
}

export const submitInterviewAnswerApi = (id: number, data: InterviewAnswerDTO) => {
  return request.post<InterviewAnswerResultVO, InterviewAnswerResultVO>(
    `/interviews/${id}/answer`,
    data
  )
}

export const finishInterviewApi = (id: number) => {
  return request.post<FinishInterviewVO, FinishInterviewVO>(`/interviews/${id}/finish`)
}

export const retryInterviewReportApi = (id: number) => {
  return request.post<RetryReportVO, RetryReportVO>(`/interviews/${id}/report/retry`)
}

export const getInterviewsApi = (params?: InterviewQueryDTO) => {
  return request.get<PageResult<InterviewListVO>, PageResult<InterviewListVO>>('/interviews', {
    params
  })
}

export const getInterviewDetailApi = (id: number) => {
  return request.get<InterviewDetailVO, InterviewDetailVO>(`/interviews/${id}`)
}

export const getInterviewReportApi = (id: number) => {
  return request.get<InterviewReportVO, InterviewReportVO>(`/interviews/${id}/report`)
}
