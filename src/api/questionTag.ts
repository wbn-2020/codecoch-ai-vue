import request from '@/utils/request'
import type { QuestionTagDTO, QuestionTagVO } from '@/types/question'

export const getQuestionTagsApi = (params?: { status?: number | ''; keyword?: string }) => {
  return request.get<QuestionTagVO[], QuestionTagVO[]>('/admin/question-tags', { params })
}

export const createQuestionTagApi = (data: QuestionTagDTO) => {
  return request.post<QuestionTagVO, QuestionTagVO>('/admin/question-tags', data)
}

export const updateQuestionTagApi = (id: number, data: QuestionTagDTO) => {
  return request.put<QuestionTagVO, QuestionTagVO>(`/admin/question-tags/${id}`, data)
}

export const updateQuestionTagStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/question-tags/${id}/status`, { status })
}

export const deleteQuestionTagApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-tags/${id}`)
}
