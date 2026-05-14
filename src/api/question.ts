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
import { normalizePageResult } from '@/utils/page'

type BackendQuestionTag = QuestionTagVO | string | number | null | undefined

type BackendQuestionVO = Omit<QuestionVO, 'tags'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
}

type BackendQuestionDetailVO = Omit<QuestionDetailVO, 'tags' | 'referenceAnswer'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
  answer?: string
  referenceAnswer?: string
}

type BackendAdminQuestionVO = Omit<AdminQuestionVO, 'tags' | 'groupTitle'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
  groupName?: string
  groupTitle?: string
  answer?: string
  referenceAnswer?: string
}

const normalizeTagName = (tag: BackendQuestionTag): string => {
  if (!tag) return ''
  if (typeof tag === 'string') return tag
  if (typeof tag === 'number') return String(tag)
  return tag.name || tag.tagName || ''
}

const normalizeTags = (
  tags: BackendQuestionTag[] = [],
  tagIds: number[] = [],
  tagNames: string[] = []
): QuestionTagVO[] => {
  const sourceTags: BackendQuestionTag[] =
    tags.length > 0
      ? tags
      : tagNames.length > 0
        ? tagNames
        : tagIds

  const normalized = sourceTags
    .map((tag, index) => {
      if (!tag) return null
      if (typeof tag === 'string') {
        return {
          id: Number(tagIds[index] || 0),
          name: tag,
          status: 1
        } as QuestionTagVO
      }
      if (typeof tag === 'number') {
        return {
          id: tag,
          name: tagNames[index] || String(tag),
          status: 1
        } as QuestionTagVO
      }

      const id = Number(tag.id || tagIds[index] || 0)
      const name = tag.name || tag.tagName || tagNames[index] || ''
      return {
        id,
        name,
        tagName: tag.tagName,
        code: tag.code,
        status: tag.status ?? 1,
        description: tag.description,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      } as QuestionTagVO
    })
    .filter((item): item is QuestionTagVO => Boolean(item?.name))

  const map = new Map<string, QuestionTagVO>()
  normalized.forEach((tag) => {
    const key = tag.id > 0 ? `id:${tag.id}` : `name:${tag.name}`
    if (!map.has(key)) {
      map.set(key, tag)
    }
  })
  return Array.from(map.values())
}

const normalizeUserQuestion = (item: BackendQuestionVO): QuestionVO => ({
  ...item,
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

const normalizeUserQuestionPage = (result: PageResult<BackendQuestionVO>): PageResult<QuestionVO> =>
  normalizePageResult(result, undefined, normalizeUserQuestion)

const normalizeFavoritePage = (
  result: PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
): PageResult<FavoriteQuestionVO> =>
  normalizePageResult(result, undefined, (item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
  }))

const normalizeWrongPage = (
  result: PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
): PageResult<WrongQuestionVO> =>
  normalizePageResult(result, undefined, (item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
  }))

const normalizeQuestionDetail = (item: BackendQuestionDetailVO): QuestionDetailVO => ({
  ...item,
  referenceAnswer: item.referenceAnswer || item.answer || '',
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

const normalizeAdminQuestion = (item: BackendAdminQuestionVO): AdminQuestionVO => ({
  ...item,
  groupTitle: item.groupTitle || item.groupName || '',
  referenceAnswer: item.referenceAnswer || item.answer || '',
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

const normalizeAdminQuestionPage = (
  result: PageResult<BackendAdminQuestionVO>
): PageResult<AdminQuestionVO> => normalizePageResult(result, undefined, normalizeAdminQuestion)

export const getQuestionsApi = (params: QuestionQueryDTO) => {
  const { tagIds: _tagIds, ...restParams } = params
  const requestParams = {
    ...restParams,
    tagId: params.tagId
  }

  return request
    .get<PageResult<BackendQuestionVO>, PageResult<BackendQuestionVO>>('/questions', {
      params: requestParams
    })
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
  const { tagIds: _tagIds, ...restParams } = params
  const requestParams = {
    ...restParams,
    tagId: params.tagId
  }

  return request
    .get<
      PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>,
      PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
    >('/questions/favorites', { params: requestParams })
    .then(normalizeFavoritePage)
}

export const getWrongQuestionsApi = (params: WrongQuestionQueryDTO) => {
  return request
    .get<
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>,
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
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
  const payload = {
    title: data.title,
    content: data.content,
    referenceAnswer: data.referenceAnswer || data.answer,
    analysis: data.analysis,
    categoryId: data.categoryId,
    groupId: data.groupId,
    difficulty: data.difficulty,
    questionType: data.questionType,
    experienceLevel: data.experienceLevel,
    isHighFrequency: data.isHighFrequency,
    tagIds: data.tagIds,
    status: data.status
  }

  return request
    .post<BackendAdminQuestionVO, BackendAdminQuestionVO>('/admin/questions', payload)
    .then(normalizeAdminQuestion)
}

export const updateAdminQuestionApi = (id: number, data: QuestionCreateDTO) => {
  const payload = {
    title: data.title,
    content: data.content,
    referenceAnswer: data.referenceAnswer || data.answer,
    analysis: data.analysis,
    categoryId: data.categoryId,
    groupId: data.groupId,
    difficulty: data.difficulty,
    questionType: data.questionType,
    experienceLevel: data.experienceLevel,
    isHighFrequency: data.isHighFrequency,
    tagIds: data.tagIds,
    status: data.status
  }

  return request
    .put<BackendAdminQuestionVO, BackendAdminQuestionVO>(`/admin/questions/${id}`, payload)
    .then(normalizeAdminQuestion)
}

export const updateAdminQuestionStatusApi = (id: number, status: number) => {
  return request.put<null, null>(`/admin/questions/${id}/status`, { status })
}

export const deleteAdminQuestionApi = (id: number) => {
  return request.delete<null, null>(`/admin/questions/${id}`)
}
