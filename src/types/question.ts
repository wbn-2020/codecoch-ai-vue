import type { PageQuery } from './api'

export interface QuestionQuery extends PageQuery {
  keyword?: string
  categoryId?: number
  tagId?: number
  difficulty?: string
}

export interface QuestionSummaryVO {
  id: number
  title: string
  difficulty?: string
  categoryName?: string
}
