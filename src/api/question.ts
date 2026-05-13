import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  QuestionAnswerDTO,
  QuestionAnswerResultVO,
  QuestionCreateDTO,
  QuestionDetailVO,
  QuestionQueryDTO,
  QuestionVO,
  UpdateMasteryDTO,
  UpdateMasteryVO,
  WrongQuestionQueryDTO,
  WrongQuestionVO,
  FavoriteQuestionVO
} from '@/types/question'

export const getQuestionsApi = (params: QuestionQueryDTO) => {
  return request.get<PageResult<QuestionVO>, PageResult<QuestionVO>>('/questions', { params })
}

export const getQuestionDetailApi = (id: number) => {
  return request.get<QuestionDetailVO, QuestionDetailVO>(`/questions/${id}`)
}

export const submitQuestionAnswerApi = (id: number, data: QuestionAnswerDTO) => {
  return request.post<QuestionAnswerResultVO, QuestionAnswerResultVO>(`/questions/${id}/answers`, data)
}

export const favoriteQuestionApi = (id: number) => {
  return request.post<null, null>(`/questions/${id}/favorite`)
}

export const unfavoriteQuestionApi = (id: number) => {
  return request.delete<null, null>(`/questions/${id}/favorite`)
}

export const getFavoriteQuestionsApi = (params: QuestionQueryDTO) => {
  return request.get<PageResult<FavoriteQuestionVO>, PageResult<FavoriteQuestionVO>>(
    '/questions/favorites',
    { params }
  )
}

export const getWrongQuestionsApi = (params: WrongQuestionQueryDTO) => {
  return request.get<PageResult<WrongQuestionVO>, PageResult<WrongQuestionVO>>(
    '/questions/wrong-records',
    { params }
  )
}

export const updateQuestionMasteryApi = (id: number, data: UpdateMasteryDTO) => {
  return request.put<UpdateMasteryVO, UpdateMasteryVO>(`/questions/${id}/mastery`, data)
}

export const getAdminQuestionsApi = (params: AdminQuestionQueryDTO) => {
  return request.get<PageResult<AdminQuestionVO>, PageResult<AdminQuestionVO>>('/admin/questions', {
    params
  })
}

export const createAdminQuestionApi = (data: QuestionCreateDTO) => {
  return request.post<AdminQuestionVO, AdminQuestionVO>('/admin/questions', data)
}

export const updateAdminQuestionApi = (id: number, data: QuestionCreateDTO) => {
  return request.put<AdminQuestionVO, AdminQuestionVO>(`/admin/questions/${id}`, data)
}

export const updateAdminQuestionStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/questions/${id}/status`, { status })
}

export const deleteAdminQuestionApi = (id: number) => {
  return request.delete<null, null>(`/admin/questions/${id}`)
}
