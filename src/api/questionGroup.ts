import request from '@/utils/request'
import type { QuestionGroupDTO, QuestionGroupVO } from '@/types/question'

export const getQuestionGroupsApi = (params?: {
  keyword?: string
  categoryId?: number
  status?: number | ''
}) => {
  return request.get<QuestionGroupVO[], QuestionGroupVO[]>('/admin/question-groups', { params })
}

export const createQuestionGroupApi = (data: QuestionGroupDTO) => {
  return request.post<QuestionGroupVO, QuestionGroupVO>('/admin/question-groups', data)
}

export const updateQuestionGroupApi = (id: number, data: QuestionGroupDTO) => {
  return request.put<QuestionGroupVO, QuestionGroupVO>(`/admin/question-groups/${id}`, data)
}

export const updateQuestionGroupStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/question-groups/${id}/status`, { status })
}

export const deleteQuestionGroupApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-groups/${id}`)
}
