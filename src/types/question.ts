import type { PageQuery } from './api'

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | string
export type QuestionType = 'SHORT_ANSWER' | 'SCENARIO' | 'CODING' | string
export type MasteryStatus = 'MASTERED' | 'VAGUE' | 'UNKNOWN' | string
export type AnswerResult = 'CORRECT' | 'PARTIAL_CORRECT' | 'WRONG' | string

export interface QuestionCategoryVO {
  id: number
  name: string
  categoryName?: string
  code?: string
  categoryCode?: string
  parentId?: number
  sort?: number
  status: number
  description?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionTagVO {
  id: number
  name: string
  tagName?: string
  code?: string
  tagCode?: string
  status: number
  description?: string
  remark?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionGroupVO {
  id: number
  name: string
  groupName?: string
  canonicalAnswer?: string
  description?: string
  categoryId?: number
  knowledgePoint?: string
  mainKnowledgePoint?: string
  difficulty: QuestionDifficulty
  status: number
  questionCount?: number
  questionIds?: number[]
  createdAt?: string
  updatedAt?: string
}

export interface QuestionQueryDTO extends PageQuery {
  keyword?: string
  categoryId?: number
  tagIds?: number[]
  difficulty?: QuestionDifficulty | ''
  masteryStatus?: MasteryStatus | ''
  favoriteOnly?: boolean
}

export interface QuestionVO {
  id: number
  title: string
  categoryId?: number
  categoryName?: string
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  tags?: QuestionTagVO[]
  favorite?: boolean
  masteryStatus?: MasteryStatus
  answered?: boolean
  status?: number
  createdAt?: string
}

export interface QuestionDetailVO {
  id: number
  title: string
  content: string
  answer?: string
  referenceAnswer?: string
  analysis?: string
  category?: QuestionCategoryVO
  categoryId?: number
  categoryName?: string
  tags?: QuestionTagVO[] | string[]
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  favorite: boolean
  masteryStatus?: MasteryStatus
  lastAnswer?: string
  lastAnswerResult?: AnswerResult
}

export interface QuestionAnswerDTO {
  userAnswer: string
  answerContent?: string
  selfResult?: AnswerResult
  masteryStatus?: MasteryStatus
}

export interface QuestionAnswerResultVO {
  recordId: number
  questionId: number
  answerResult?: AnswerResult
  referenceAnswer?: string
  analysis?: string
  masteryStatus?: MasteryStatus
  wrongRecordGenerated?: boolean
  wrong?: boolean
  answeredAt: string
}

export interface FavoriteQuestionVO {
  id?: number
  favoriteId?: number
  questionId?: number
  title: string
  categoryId?: number
  categoryName?: string
  difficulty: QuestionDifficulty
  tags?: QuestionTagVO[] | string[]
  createdAt?: string
}

export interface WrongQuestionQueryDTO extends PageQuery {
  keyword?: string
  categoryId?: number
  difficulty?: QuestionDifficulty | ''
}

export interface WrongQuestionVO {
  wrongRecordId: number
  questionId: number
  title: string
  categoryName?: string
  difficulty: QuestionDifficulty
  tags?: QuestionTagVO[]
  lastAnswer?: string
  lastAnswerResult?: AnswerResult
  wrongCount: number
  lastWrongAt?: string
  masteryStatus?: MasteryStatus
}

export interface UpdateMasteryDTO {
  masteryStatus: MasteryStatus
}

export interface UpdateMasteryVO {
  questionId: number
  masteryStatus: MasteryStatus
  updatedAt: string
}

export interface AdminQuestionQueryDTO extends PageQuery {
  keyword?: string
  categoryId?: number
  tagId?: number
  difficulty?: QuestionDifficulty | ''
  status?: number | ''
}

export interface AdminQuestionVO {
  id: number
  title: string
  content?: string
  answer?: string
  analysis?: string
  categoryId?: number
  categoryName?: string
  groupId?: number
  groupTitle?: string
  groupName?: string
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  status: number
  tags?: QuestionTagVO[] | string[]
  tagIds?: number[]
  createdAt?: string
  updatedAt?: string
}

export interface QuestionCreateDTO {
  title: string
  content: string
  answer: string
  analysis?: string
  categoryId?: number
  groupId?: number
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  tagIds?: number[]
  status?: number
}

export type QuestionUpdateDTO = QuestionCreateDTO

export interface QuestionCategoryDTO {
  name: string
  code?: string
  parentId?: number
  sort?: number
  status?: number
  description?: string
}

export interface QuestionTagDTO {
  name: string
  code?: string
  status?: number
  description?: string
}

export interface QuestionGroupDTO {
  name: string
  canonicalAnswer?: string
  categoryId?: number
  knowledgePoint?: string
  difficulty: QuestionDifficulty
  description?: string
  status?: number
  questionIds?: number[]
}
