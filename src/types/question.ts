import type { PageQuery } from './api'

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | string
export type QuestionType = 'SHORT_ANSWER' | 'SCENARIO' | 'CODING' | string
export type MasteryStatus = 'MASTERED' | 'VAGUE' | 'UNKNOWN' | string
export type AnswerResult = 'CORRECT' | 'PARTIAL_CORRECT' | 'WRONG' | string
export type PracticeReviewStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | string
export type PracticeSource = 'QUESTION_BANK' | string

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

export interface PracticeSubmitDTO {
  answerContent: string
  answerDurationSeconds?: number
  source?: PracticeSource
}

export interface PracticeRecordQueryDTO extends PageQuery {
  questionId?: number
  reviewStatus?: PracticeReviewStatus | ''
}

export interface PracticeRecordVO {
  id: number
  userId?: number
  questionId: number
  questionTitle?: string
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  knowledgePoint?: string
  answerContent?: string
  userAnswer?: string
  answerDurationSeconds?: number
  source?: PracticeSource
  reviewStatus?: PracticeReviewStatus
  score?: number
  level?: string
  masteryStatus?: MasteryStatus
  summary?: string
  aiComment?: string
  suggestions?: string[] | string
  knowledgePoints?: string[] | string
  strengths?: string[] | string
  weaknesses?: string[] | string
  improvementSuggestions?: string[] | string
  referenceComparison?: string
  knowledgeGaps?: string[] | string
  suggestedFollowUps?: string[] | string
  referenceAnswer?: string
  referenceAnswerSnapshot?: string
  questionSnapshotJson?: string
  reviewJson?: string
  aiCallLogId?: number
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
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

export interface QuestionImportErrorVO {
  rowIndex?: number
  title?: string
  reason?: string
}

export interface QuestionImportResultVO {
  batchId?: number
  totalCount?: number
  successCount?: number
  failCount?: number
  duplicateCount?: number
  duplicateReasonCounts?: Record<string, number>
  errors?: QuestionImportErrorVO[]
}
export interface AdminQuestionQueryDTO extends PageQuery {
  keyword?: string
  questionId?: number
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
  | 'HARD_TITLE_HASH'
  | 'HARD_CONTENT_HASH'
  | 'TITLE_EXACT'
  | 'TITLE_NORMALIZED_EQUAL'
  | 'TITLE_SIMILAR'
  | 'CONTENT_SIMILAR'
  | 'SEMANTIC_SIMILAR'
  | 'MANUAL'
  | string
export type QuestionRelationType =
  | 'SAME_INTENT'
  | 'RELATED'
  | 'FOLLOW_UP'
  | 'ADVANCED'
  | 'PREREQUISITE'
  | 'COMPARE'
  | string

export interface QuestionRelationVO {
  id: number
  sourceQuestionId: number
  targetQuestionId: number
  relationType?: QuestionRelationType
  relationStatus?: string
  reason?: string
  similarityScore?: number
  createdBy?: number
  createdAt?: string
  sourceQuestion?: QuestionSummaryVO
  targetQuestion?: QuestionSummaryVO
}

export interface QuestionRelationCreateDTO {
  targetQuestionId: number
  relationType?: QuestionRelationType | ''
  reason?: string
}

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

export type AiQuestionGenerateSseEventType = 'start' | 'progress' | 'result' | 'done' | 'error'

export interface AiQuestionGenerateSseParams {
  targetPosition?: string
  technologyStack?: string
  knowledgePoint?: string
  questionType?: QuestionType | ''
  difficulty?: QuestionDifficulty | ''
  experienceYears?: number
  count?: number
  extraRequirements?: string
}

export interface AiQuestionGenerateSseEvent {
  requestId?: string
  type?: AiQuestionGenerateSseEventType | string
  message?: string
  batchId?: string
  reviewIds?: number[]
  aiCallLogId?: number
  count?: number
  successCount?: number
  stage?: string
  code?: string
  content?: string
  index?: number
  result?: AiQuestionGenerateResultVO | Record<string, unknown>
  metadata?: Record<string, unknown>
  [key: string]: unknown
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
  scoreBand?: '' | 'STRONG' | 'REVIEW'
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

export interface QuestionDuplicateScorePartVO {
  code?: string
  label?: string
  score?: number
}

export interface QuestionDuplicateFeedbackBucketVO {
  label?: string
  minScore?: number
  maxScore?: number
  totalCount?: number
  pendingCount?: number
  confirmedCount?: number
  ignoredCount?: number
  confirmationRate?: number
  ignoreRate?: number
}

export interface QuestionDuplicateFeedbackStatsVO {
  totalCount?: number
  pendingCount?: number
  confirmedCount?: number
  ignoredCount?: number
  resolvedCount?: number
  confirmationRate?: number
  ignoreRate?: number
  sampleCoverageRate?: number
  averageSimilarityScore?: number
  statusCounts?: Record<string, number>
  matchTypeCounts?: Record<string, number>
  scoreBandCounts?: Record<string, number>
  scoreBuckets?: QuestionDuplicateFeedbackBucketVO[]
  thresholdRecommendation?: string
  warningItems?: string[]
  generatedAt?: string
}

export interface QuestionDuplicateEvaluationSampleDTO {
  caseId?: string
  sourceQuestionId?: number
  targetQuestionId?: number
  expected?: 'DUPLICATE' | 'REVIEW' | 'NOT_DUPLICATE' | string
  note?: string
}

export interface QuestionDuplicateEvaluationDTO {
  samples?: QuestionDuplicateEvaluationSampleDTO[]
}

export interface QuestionDuplicateEvaluationItemVO {
  caseId?: string
  sourceQuestionId?: number
  targetQuestionId?: number
  expected?: string
  predicted?: string
  passed?: boolean
  matchType?: string
  score?: number
  scoreBand?: string
  scoreParts?: QuestionDuplicateScorePartVO[]
  reason?: string
  note?: string
}

export interface QuestionDuplicateEvaluationVO {
  sampleCount?: number
  evaluatedCount?: number
  passedCount?: number
  failedCount?: number
  missingQuestionCount?: number
  accuracyRate?: number
  items?: QuestionDuplicateEvaluationItemVO[]
  generatedAt?: string
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
  scoreBand?: string
  scoreParts?: QuestionDuplicateScorePartVO[]
  vectorScore?: number
  textScore?: number
  finalScore?: number
  sourceGroupId?: number
  targetGroupId?: number
  sourceCategoryId?: number
  targetCategoryId?: number
  sourceQuestionType?: QuestionType | string
  targetQuestionType?: QuestionType | string
  sourceDifficulty?: QuestionDifficulty | string
  targetDifficulty?: QuestionDifficulty | string
  sameCategory?: boolean | null
  sameQuestionType?: boolean | null
  sameDifficulty?: boolean | null
  relationId?: number
  reviewedBy?: number
  reviewedAt?: string
  createdAt?: string
}
export interface QuestionDuplicateEvalCaseQueryDTO extends PageQuery {
  keyword?: string
  expected?: 'DUPLICATE' | 'REVIEW' | 'NOT_DUPLICATE' | string
  enabled?: number
}

export interface QuestionDuplicateEvalCaseSaveDTO {
  id?: number
  caseId?: string
  sourceQuestionId?: number
  targetQuestionId?: number
  expected?: 'DUPLICATE' | 'REVIEW' | 'NOT_DUPLICATE' | string
  note?: string
  enabled?: number
}

export interface QuestionDuplicateEvalRunRequestDTO {
  caseIds?: number[]
  onlyEnabled?: boolean
  limit?: number
}

export interface QuestionDuplicateEvalCaseVO {
  id: number
  caseId?: string
  sourceQuestionId?: number
  targetQuestionId?: number
  sourceTitle?: string
  targetTitle?: string
  expected?: string
  note?: string
  enabled?: number
  createdBy?: number
  createdAt?: string
  updatedAt?: string
}

export interface QuestionDuplicateEvalRunResultVO extends QuestionDuplicateEvaluationItemVO {
  id?: number
  evalCaseId?: number
  createdAt?: string
}

export interface QuestionDuplicateEvalRunVO {
  id: number
  runNo?: string
  status?: string
  sampleCount?: number
  evaluatedCount?: number
  passedCount?: number
  failedCount?: number
  missingQuestionCount?: number
  accuracyRate?: number
  startedAt?: string
  finishedAt?: string
  createdBy?: number
  errorMessage?: string
  results?: QuestionDuplicateEvalRunResultVO[]
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
  scoreDetailJson?: string
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
