import request from '@/utils/request'
import type { QuestionTagDTO, QuestionTagVO } from '@/types/question'

type BackendQuestionTagVO = Partial<QuestionTagVO> & {
  tagName?: string
  tagCode?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

const normalizeQuestionTag = (item: BackendQuestionTagVO): QuestionTagVO => ({
  id: Number(item.id || 0),
  name: item.name || item.tagName || '',
  code: item.code || item.tagCode || '',
  status: item.status ?? 1,
  description: item.description || item.remark || '',
  createdAt: item.createdAt || item.createTime,
  updatedAt: item.updatedAt || item.updateTime
})

const normalizeTagList = (list: BackendQuestionTagVO[] = []) =>
  list
    .map(normalizeQuestionTag)
    .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)

const toBackendTagDTO = (data: QuestionTagDTO) => ({
  name: data.name,
  tagName: data.name,
  code: data.code,
  tagCode: data.code,
  status: data.status,
  description: data.description,
  remark: data.description
})

export const getQuestionTagsApi = (params?: { status?: number | ''; keyword?: string }) => {
  return request
    .get<BackendQuestionTagVO[], BackendQuestionTagVO[]>('/admin/question-tags', { params })
    .then(normalizeTagList)
}

export const createQuestionTagApi = (data: QuestionTagDTO) => {
  return request
    .post<BackendQuestionTagVO, BackendQuestionTagVO>('/admin/question-tags', toBackendTagDTO(data))
    .then(normalizeQuestionTag)
}

export const updateQuestionTagApi = (id: number, data: QuestionTagDTO) => {
  return request
    .put<BackendQuestionTagVO, BackendQuestionTagVO>(
      `/admin/question-tags/${id}`,
      toBackendTagDTO(data)
    )
    .then(normalizeQuestionTag)
}

export const updateQuestionTagStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/question-tags/${id}/status`, { status })
}

export const deleteQuestionTagApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-tags/${id}`)
}
