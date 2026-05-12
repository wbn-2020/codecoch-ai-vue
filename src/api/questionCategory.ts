import request from '@/utils/request'
import type { QuestionCategoryDTO, QuestionCategoryVO } from '@/types/question'

export const getQuestionCategoriesApi = (params?: { status?: number | ''; keyword?: string }) => {
  return request.get<QuestionCategoryVO[], QuestionCategoryVO[]>('/admin/question-categories', {
    params
  })
}

export const createQuestionCategoryApi = (data: QuestionCategoryDTO) => {
  return request.post<QuestionCategoryVO, QuestionCategoryVO>('/admin/question-categories', data)
}

export const updateQuestionCategoryApi = (id: number, data: QuestionCategoryDTO) => {
  return request.put<QuestionCategoryVO, QuestionCategoryVO>(`/admin/question-categories/${id}`, data)
}

export const updateQuestionCategoryStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/question-categories/${id}/status`, { status })
}

export const deleteQuestionCategoryApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-categories/${id}`)
}
