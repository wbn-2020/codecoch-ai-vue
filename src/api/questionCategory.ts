import request from '@/utils/request'
import type { QuestionCategoryDTO, QuestionCategoryVO } from '@/types/question'

type BackendQuestionCategoryVO = Partial<QuestionCategoryVO> & {
  categoryName?: string
  categoryCode?: string
  remark?: string
  createTime?: string
  updateTime?: string
}

const normalizeQuestionCategory = (item: BackendQuestionCategoryVO): QuestionCategoryVO => ({
  id: Number(item.id || 0),
  name: item.name || item.categoryName || '',
  code: item.code || item.categoryCode || '',
  parentId: item.parentId ?? 0,
  sort: item.sort ?? 0,
  status: item.status ?? 1,
  description: item.description || item.remark || '',
  createdAt: item.createdAt || item.createTime,
  updatedAt: item.updatedAt || item.updateTime
})

const normalizeCategoryList = (list: BackendQuestionCategoryVO[] = []) =>
  list
    .map(normalizeQuestionCategory)
    .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)

const toBackendCategoryDTO = (data: QuestionCategoryDTO) => ({
  categoryName: data.name,
  categoryCode: data.code,
  parentId: data.parentId && data.parentId > 0 ? data.parentId : undefined,
  sort: data.sort,
  status: data.status,
  remark: data.description
})

export const getQuestionCategoriesApi = (params?: { status?: number | ''; keyword?: string }) => {
  return request
    .get<BackendQuestionCategoryVO[], BackendQuestionCategoryVO[]>('/admin/question-categories', {
      params
    })
    .then(normalizeCategoryList)
}

export const createQuestionCategoryApi = (data: QuestionCategoryDTO) => {
  return request
    .post<BackendQuestionCategoryVO, BackendQuestionCategoryVO>(
      '/admin/question-categories',
      toBackendCategoryDTO(data)
    )
    .then(normalizeQuestionCategory)
}

export const updateQuestionCategoryApi = (id: number, data: QuestionCategoryDTO) => {
  return request
    .put<BackendQuestionCategoryVO, BackendQuestionCategoryVO>(
      `/admin/question-categories/${id}`,
      toBackendCategoryDTO(data)
    )
    .then(normalizeQuestionCategory)
}

export const deleteQuestionCategoryApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-categories/${id}`)
}
