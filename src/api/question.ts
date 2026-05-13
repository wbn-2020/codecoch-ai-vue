import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  FavoriteQuestionVO,
  QuestionAnswerDTO,
  QuestionAnswerResultVO,
  QuestionCreateDTO,
  QuestionDetailVO,
  QuestionQueryDTO,
  QuestionTagVO,
  QuestionVO,
  UpdateMasteryDTO,
  UpdateMasteryVO,
  WrongQuestionQueryDTO,
  WrongQuestionVO
} from '@/types/question'

type BackendQuestionTag = QuestionTagVO | string | number | null | undefined

const hashTagName = (name: string): number => {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash) + 1
}

type BackendQuestionVO = Omit<QuestionVO, 'tags'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
}

type BackendQuestionDetailVO = Omit<QuestionDetailVO, 'tags' | 'referenceAnswer'> & {
  tags?: BackendQuestionTag[]
  answer?: string
  referenceAnswer?: string
}

type BackendAdminQuestionVO = Omit<AdminQuestionVO, 'tags' | 'groupTitle'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  groupName?: string
  groupTitle?: string
}

const normalizeTagName = (tag: BackendQuestionTag): string => {
  if (!tag) return ''
  if (typeof tag === 'string') return tag
  if (typeof tag === 'number') return String(tag)
  return tag.name || ''
}

const normalizeTags = (tags: BackendQuestionTag[] = [], tagIds?: number[]): QuestionTagVO[] => {
  const normalized = tags
    .map((tag, index) => {
      if (!tag) return null
      if (typeof tag === 'string') {
        return {
          id: Number(tagIds?.[index] || hashTagName(tag)),
          name: tag,
          status: 1
        } as QuestionTagVO
      }
      if (typeof tag === 'number') {
        return {
          id: tag,
          name: String(tag),
          status: 1
        } as QuestionTagVO
      }

      return {
        id: Number(tag.id || tagIds?.[index] || hashTagName(tag.name || normalizeTagName(tag) || `${index + 1}`)),
        name: tag.name || normalizeTagName(tag),
        code: tag.code,
        status: tag.status ?? 1,
        description: tag.description,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      } as QuestionTagVO
    })
    .filter((item): item is QuestionTagVO => Boolean(item?.id && item?.name))

  const map = new Map<string, QuestionTagVO>()
  normalized.forEach((tag) => {
    if (!map.has(tag.name)) {
      map.set(tag.name, tag)
    }
  })
  return Array.from(map.values())
}

const normalizeUserQuestion = (item: BackendQuestionVO): QuestionVO => ({
  ...item,
  tags: normalizeTags(item.tags, item.tagIds)
})

const normalizeUserQuestionPage = (result: PageResult<BackendQuestionVO>): PageResult<QuestionVO> => ({
  ...result,
  records: (result.records || []).map(normalizeUserQuestion)
})

const normalizeFavoritePage = (
  result: PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>
): PageResult<FavoriteQuestionVO> => ({
  ...result,
  records: (result.records || []).map((item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds)
  }))
})

const normalizeWrongPage = (
  result: PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>
): PageResult<WrongQuestionVO> => ({
  ...result,
  records: (result.records || []).map((item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds)
  }))
})

const normalizeQuestionDetail = (item: BackendQuestionDetailVO): QuestionDetailVO => ({
  ...item,
  referenceAnswer: item.referenceAnswer || item.answer || '',
  tags: normalizeTags(item.tags)
})

const normalizeAdminQuestion = (item: BackendAdminQuestionVO): AdminQuestionVO => ({
  ...item,
  groupTitle: item.groupTitle || item.groupName || '',
  tags: normalizeTags(item.tags, item.tagIds)
})

const normalizeAdminQuestionPage = (
  result: PageResult<BackendAdminQuestionVO>
): PageResult<AdminQuestionVO> => ({
  ...result,
  records: (result.records || []).map(normalizeAdminQuestion)
})

export const getQuestionsApi = (params: QuestionQueryDTO) => {
  return request
    .get<PageResult<BackendQuestionVO>, PageResult<BackendQuestionVO>>('/questions', { params })
    .then(normalizeUserQuestionPage)
}

export const getQuestionDetailApi = (id: number) => {
  return request
    .get<BackendQuestionDetailVO, BackendQuestionDetailVO>(`/questions/${id}`)
    .then(normalizeQuestionDetail)
}

export const submitQuestionAnswerApi = (id: number, data: QuestionAnswerDTO) => {
  const payload = {
    answerContent: data.answerContent || data.userAnswer,
    masteryStatus: data.masteryStatus
  }
  return request.post<QuestionAnswerResultVO, QuestionAnswerResultVO>(
    `/questions/${id}/answers`,
    payload
  )
}

export const favoriteQuestionApi = (id: number) => {
  return request.post<null, null>(`/questions/${id}/favorite`)
}

export const unfavoriteQuestionApi = (id: number) => {
  return request.delete<null, null>(`/questions/${id}/favorite`)
}

export const getFavoriteQuestionsApi = (params: QuestionQueryDTO) => {
  return request
    .get<
      PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>,
      PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>
    >('/questions/favorites', { params })
    .then(normalizeFavoritePage)
}

export const getWrongQuestionsApi = (params: WrongQuestionQueryDTO) => {
  return request
    .get<
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>,
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[] }>
    >('/questions/wrong-records', { params })
    .then(normalizeWrongPage)
}

export const updateQuestionMasteryApi = (id: number, data: UpdateMasteryDTO) => {
  return request.put<UpdateMasteryVO, UpdateMasteryVO>(`/questions/${id}/mastery`, data)
}

export const getAdminQuestionsApi = (params: AdminQuestionQueryDTO) => {
  return request
    .get<PageResult<BackendAdminQuestionVO>, PageResult<BackendAdminQuestionVO>>('/admin/questions', {
      params
    })
    .then(normalizeAdminQuestionPage)
}

export const createAdminQuestionApi = (data: QuestionCreateDTO) => {
  return request
    .post<BackendAdminQuestionVO, BackendAdminQuestionVO>('/admin/questions', data)
    .then(normalizeAdminQuestion)
}

export const updateAdminQuestionApi = (id: number, data: QuestionCreateDTO) => {
  return request
    .put<BackendAdminQuestionVO, BackendAdminQuestionVO>(`/admin/questions/${id}`, data)
    .then(normalizeAdminQuestion)
}

export const updateAdminQuestionStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/questions/${id}/status`, { status })
}

export const deleteAdminQuestionApi = (id: number) => {
  return request.delete<null, null>(`/admin/questions/${id}`)
}
