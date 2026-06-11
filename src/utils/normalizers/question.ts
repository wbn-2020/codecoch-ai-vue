import type {
  AdminQuestionVO,
  FavoriteQuestionVO,
  QuestionDetailVO,
  QuestionTagVO,
  QuestionVO,
  WrongQuestionVO
} from '@/types/question'
import type { PageResult } from '@/types/api'
import { normalizePageResult } from '@/utils/page'

// ============================================================
// 后端 tag 字段兼容层
// 后端可能返回 tags: QuestionTagVO[] | string[] | number[]
// 也可能返回 tagIds + tagNames 分离字段
// 统一归一化为 QuestionTagVO[]
// ============================================================

export type BackendQuestionTag = QuestionTagVO | string | number | null | undefined

export type BackendQuestionVO = Omit<QuestionVO, 'tags'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
}

export type BackendQuestionDetailVO = Omit<QuestionDetailVO, 'tags' | 'referenceAnswer'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
  answer?: string
  referenceAnswer?: string
}

export type BackendAdminQuestionVO = Omit<AdminQuestionVO, 'tags' | 'groupTitle'> & {
  tags?: BackendQuestionTag[]
  tagIds?: number[]
  tagNames?: string[]
  groupName?: string
  groupTitle?: string
  answer?: string
  referenceAnswer?: string
}

export const normalizeTagName = (tag: BackendQuestionTag): string => {
  if (!tag) return ''
  if (typeof tag === 'string') return tag
  if (typeof tag === 'number') return String(tag)
  return tag.name || tag.tagName || ''
}

export const normalizeTags = (
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

export const normalizeUserQuestion = (item: BackendQuestionVO): QuestionVO => ({
  ...item,
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

export const normalizeUserQuestionPage = (
  result: PageResult<BackendQuestionVO> | BackendQuestionVO[],
  params?: { pageNo?: number; pageNum?: number; pageSize?: number }
): PageResult<QuestionVO> =>
  normalizePageResult(result, params, normalizeUserQuestion)

export const normalizeFavoritePage = (
  result: PageResult<Omit<FavoriteQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
): PageResult<FavoriteQuestionVO> =>
  normalizePageResult(result, undefined, (item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
  }))

export const normalizeWrongPage = (
  result: PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
): PageResult<WrongQuestionVO> =>
  normalizePageResult(result, undefined, (item) => ({
    ...item,
    tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
  }))

export const normalizeQuestionDetail = (item: BackendQuestionDetailVO): QuestionDetailVO => ({
  ...item,
  referenceAnswer: item.referenceAnswer || item.answer || '',
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

export const normalizeAdminQuestion = (item: BackendAdminQuestionVO): AdminQuestionVO => ({
  ...item,
  groupTitle: item.groupTitle || item.groupName || '',
  referenceAnswer: item.referenceAnswer || item.answer || '',
  tags: normalizeTags(item.tags, item.tagIds, item.tagNames)
})

export const normalizeAdminQuestionPage = (
  result: PageResult<BackendAdminQuestionVO> | BackendAdminQuestionVO[],
  params?: { pageNo?: number; pageNum?: number; pageSize?: number }
): PageResult<AdminQuestionVO> => normalizePageResult(result, params, normalizeAdminQuestion)
