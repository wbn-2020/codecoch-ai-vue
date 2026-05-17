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
  tagId?: number
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
  experienceLevel?: string
  tags?: QuestionTagVO[]
  tagIds?: number[]
  tagNames?: string[]
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
  referenceAnswer?: string
  analysis?: string
  category?: QuestionCategoryVO
  categoryId?: number
  categoryName?: string
  tags?: QuestionTagVO[] | string[]
  tagIds?: number[]
  tagNames?: string[]
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  experienceLevel?: string
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
  referenceAnswer?: string
  analysis?: string
  categoryId?: number
  categoryName?: string
  groupId?: number
  groupTitle?: string
  groupName?: string
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  experienceLevel?: string
  isHighFrequency?: boolean | number
  status: number
  tags?: QuestionTagVO[] | string[]
  tagIds?: number[]
  createdAt?: string
  updatedAt?: string
}

export interface QuestionCreateDTO {
  title: string
  content: string
  referenceAnswer: string
  answer?: string
  analysis?: string
  categoryId?: number
  groupId?: number
  difficulty: QuestionDifficulty
  questionType?: QuestionType
  experienceLevel?: string
  isHighFrequency?: boolean | number
  tagIds?: number[]
  status?: number
}

export type QuestionUpdateDTO = QuestionCreateDTO

export type QuestionReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | string
export type QuestionDuplicateReviewStatus = 'PENDING' | 'CONFIRMED' | 'IGNORED' | string
export type QuestionDuplicateMatchType =
  | 'TITLE_EXACT'
  | 'TITLE_NORMALIZED_EQUAL'
  | 'TITLE_SIMILAR'
  | 'CONTENT_SIMILAR'
  | 'MANUAL'
  | string
export type QuestionRelationType =
  | 'SAME_INTENT'
  | 'RELATED'
  | 'FOLLOW_UP'
  | 'ADVANCED'
  | 'PREREQUISITE'
  | 'COMPARE'

export interface AiQuestionGenerateRequestDTO {
  targetPosition?: string
  technologyStack?: string
  knowledgePoint?: string
  questionType?: QuestionType | ''
  difficulty?: QuestionDifficulty | ''
  experienceYears?: number
  count?: number
  generateReferenceAnswer?: boolean
  generateFollowUps?: boolean
  generateTagSuggestions?: boolean
  generateCategorySuggestion?: boolean
  extraRequirements?: string
}

export interface AiQuestionGenerateResultVO {
  batchId?: string
  count?: number
  successCount?: number
  generatedCount?: number
  reviewIds?: number[]
  aiCallLogId?: number
  message?: string
  failedReason?: string
}

export interface QuestionReviewQueryDTO extends PageQuery {
  reviewStatus?: QuestionReviewStatus | ''
  technologyStack?: string
  knowledgePoint?: string
  questionType?: QuestionType | ''
  difficulty?: QuestionDifficulty | ''
  keyword?: string
  batchId?: string
}

export interface QuestionReviewListVO {
  id: number
  batchId?: string
  reviewStatus: QuestionReviewStatus
  aiCallLogId?: number
  targetPosition?: string
  technologyStack?: string
  knowledgePoint?: string
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  experienceYears?: number
  questionTitle?: string
  categoryId?: number
  groupId?: number
  approvedQuestionId?: number
  reviewerId?: number
  reviewedAt?: string
  createdAt?: string
}

export interface QuestionReviewDetailVO extends QuestionReviewListVO {
  createdBy?: number
  rawAiResultJson?: string
  questionContent?: string
  referenceAnswer?: string
  analysis?: string
  followUpQuestionsJson?: string
  tagSuggestionsJson?: string
  categorySuggestion?: string
  groupSuggestion?: string
  tagIdsJson?: string
  editedContentJson?: string
  rejectReason?: string
  updatedAt?: string
}

export interface QuestionReviewApproveDTO {
  title?: string
  content?: string
  referenceAnswer?: string
  analysis?: string
  difficulty?: QuestionDifficulty
  questionType?: QuestionType
  categoryId?: number
  groupId?: number
  tagIds?: number[]
  status?: number
  isHighFrequency?: number
  experienceLevel?: string
  editedReason?: string
}

export interface QuestionReviewRejectDTO {
  rejectReason: string
}

export interface BatchQuestionReviewApproveDTO {
  reviewIds: number[]
  approveData?: QuestionReviewApproveDTO
}

export interface BatchQuestionReviewRejectDTO {
  reviewIds: number[]
  rejectReason: string
}

export interface BatchQuestionReviewFailureVO {
  reviewId: number
  reason?: string
}

export interface BatchQuestionReviewResultVO {
  total: number
  successCount: number
  failureCount: number
  successIds?: number[]
  failures?: BatchQuestionReviewFailureVO[]
}

export interface QuestionDuplicateReviewQueryDTO extends PageQuery {
  questionId?: number
  reviewStatus?: QuestionDuplicateReviewStatus | ''
  matchType?: QuestionDuplicateMatchType | ''
  keyword?: string
}

export interface QuestionDuplicateCheckDTO {
  questionId?: number
  questionIds?: number[]
}

export interface QuestionDuplicateCheckResultVO {
  checkedCount?: number
  createdCount?: number
  reviewIds?: number[]
}

export interface QuestionDuplicateReviewListVO {
  id: number
  sourceQuestionId?: number
  sourceTitle?: string
  targetQuestionId?: number
  targetTitle?: string
  reviewStatus: QuestionDuplicateReviewStatus
  matchType?: QuestionDuplicateMatchType
  similarityScore?: number
  matchReason?: string
  sourceGroupId?: number
  targetGroupId?: number
  relationId?: number
  reviewedBy?: number
  reviewedAt?: string
  createdAt?: string
}

export interface QuestionSummaryVO {
  id: number
  title?: string
  content?: string
  categoryId?: number
  groupId?: number
  groupName?: string
  difficulty?: QuestionDifficulty
  questionType?: QuestionType
  status?: number
}

export interface QuestionDuplicateReviewDetailVO extends QuestionDuplicateReviewListVO {
  sourceTitleSnapshot?: string
  targetTitleSnapshot?: string
  sourceContentSnapshot?: string
  targetContentSnapshot?: string
  createdBy?: number
  ignoredReason?: string
  updatedAt?: string
  sourceQuestion?: QuestionSummaryVO
  targetQuestion?: QuestionSummaryVO
}

export interface QuestionDuplicateMergeDTO {
  relationType?: QuestionRelationType
  reason?: string
}

export interface QuestionDuplicateIgnoreDTO {
  ignoredReason?: string
}

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
  difficulty?: QuestionDifficulty
  description?: string
  status?: number
  questionIds?: number[]
}
