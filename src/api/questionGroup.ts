import request from '@/utils/request'
import type { QuestionGroupDTO, QuestionGroupVO } from '@/types/question'

type BackendQuestionGroupVO = Partial<QuestionGroupVO> & {
  groupName?: string
  canonicalTitle?: string
  mainKnowledgePoint?: string
  questionTotal?: number
  createTime?: string
  updateTime?: string
}

const normalizeQuestionGroup = (item: BackendQuestionGroupVO): QuestionGroupVO => ({
  id: Number(item.id || 0),
  name: item.name || item.groupName || item.canonicalTitle || '',
  canonicalAnswer: item.canonicalAnswer || '',
  description: item.description || '',
  categoryId: item.categoryId,
  knowledgePoint: item.knowledgePoint || item.mainKnowledgePoint || '',
  difficulty: item.difficulty || 'MEDIUM',
  status: item.status ?? 1,
  questionCount: item.questionCount ?? item.questionTotal ?? 0,
  questionIds: item.questionIds || [],
  createdAt: item.createdAt || item.createTime,
  updatedAt: item.updatedAt || item.updateTime
})

const normalizeGroupList = (list: BackendQuestionGroupVO[] = []) =>
  list
    .map(normalizeQuestionGroup)
    .filter((item) => Number.isFinite(item.id) && item.id > 0 && item.name)

const toBackendGroupDTO = (data: QuestionGroupDTO) => ({
  groupName: data.name,
  categoryId: data.categoryId,
  description: data.description,
  status: data.status
})

export const getQuestionGroupsApi = (params?: {
  keyword?: string
  categoryId?: number
  status?: number | ''
}) => {
  return request
    .get<BackendQuestionGroupVO[], BackendQuestionGroupVO[]>('/admin/question-groups', { params })
    .then(normalizeGroupList)
}

export const createQuestionGroupApi = (data: QuestionGroupDTO) => {
  return request
    .post<BackendQuestionGroupVO, BackendQuestionGroupVO>(
      '/admin/question-groups',
      toBackendGroupDTO(data)
    )
    .then(normalizeQuestionGroup)
}

export const updateQuestionGroupApi = (id: number, data: QuestionGroupDTO) => {
  return request
    .put<BackendQuestionGroupVO, BackendQuestionGroupVO>(
      `/admin/question-groups/${id}`,
      toBackendGroupDTO(data)
    )
    .then(normalizeQuestionGroup)
}

export const deleteQuestionGroupApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-groups/${id}`)
}
