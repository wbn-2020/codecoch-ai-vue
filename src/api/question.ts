import type { AxiosRequestConfig } from 'axios'

import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  AdminQuestionQueryDTO,
  AdminQuestionVO,
  AiQuestionGenerateRequestDTO,
  AiQuestionGenerateResultVO,
  AiQuestionGenerateSseEvent,
  AiQuestionGenerateSseEventType,
  AiQuestionGenerateSseParams,
  BatchQuestionReviewApproveDTO,
  BatchQuestionReviewRejectDTO,
  BatchQuestionReviewResultVO,
  FavoriteQuestionVO,
  PracticeRecordQueryDTO,
  PracticeRecordVO,
  PracticeSubmitDTO,
  QuestionAnswerDTO,
  QuestionAnswerResultVO,
  QuestionCreateDTO,
  QuestionDetailVO,
  QuestionDuplicateCheckDTO,
  QuestionDuplicateCheckResultVO,
  QuestionDuplicateEvalCaseQueryDTO,
  QuestionDuplicateEvalCaseSaveDTO,
  QuestionDuplicateEvalCaseVO,
  QuestionDuplicateEvalRunRequestDTO,
  QuestionDuplicateEvalRunVO,
  QuestionDuplicateEvaluationDTO,
  QuestionDuplicateEvaluationVO,
  QuestionDuplicateFeedbackStatsVO,
  QuestionDuplicateIgnoreDTO,
  QuestionDuplicateMergeDTO,
  QuestionDuplicateReviewDetailVO,
  QuestionDuplicateReviewListVO,
  QuestionDuplicateReviewQueryDTO,
  QuestionDuplicateThresholdSweepDTO,
  QuestionDuplicateThresholdSweepVO,
  QuestionImportResultVO,
  QuestionQueryDTO,
  QuestionRelationCreateDTO,
  QuestionRelationVO,
  QuestionReviewApproveDTO,
  QuestionReviewDetailVO,
  QuestionReviewListVO,
  QuestionReviewQueryDTO,
  QuestionReviewRejectDTO,
  QuestionTagVO,
  QuestionVO,
  UpdateMasteryDTO,
  UpdateMasteryVO,
  WrongQuestionQueryDTO,
  WrongQuestionVO
} from '@/types/question'
import {
  type BackendAdminQuestionVO,
  type BackendQuestionDetailVO,
  type BackendQuestionTag,
  type BackendQuestionVO,
  normalizeAdminQuestion,
  normalizeAdminQuestionPage,
  normalizeFavoritePage,
  normalizeQuestionDetail,
  normalizeUserQuestionPage,
  normalizeWrongPage
} from '@/utils/normalizers/question'
import { buildSseUrl, streamSse } from '@/utils/sse'

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

export const getWrongQuestionsApi = (params: WrongQuestionQueryDTO, config: AxiosRequestConfig = {}) => {
  return request
    .get<
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>,
      PageResult<Omit<WrongQuestionVO, 'tags'> & { tags?: BackendQuestionTag[]; tagIds?: number[]; tagNames?: string[] }>
    >('/questions/wrong-records', { ...config, params })
    .then(normalizeWrongPage)
}

export const updateQuestionMasteryApi = (id: number, data: UpdateMasteryDTO) => {
  return request.put<UpdateMasteryVO, UpdateMasteryVO>(`/questions/${id}/mastery`, data)
}

const compactQuery = <T extends object>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  ) as Partial<T>

export const getAdminQuestionsApi = (params: AdminQuestionQueryDTO) => {
  return request
    .get<PageResult<BackendAdminQuestionVO>, PageResult<BackendAdminQuestionVO>>('/admin/questions', {
      params: compactQuery(params)
    })
    .then(normalizeAdminQuestionPage)
}

export const getAdminQuestionDetailApi = (id: number) => {
  return request
    .get<BackendAdminQuestionVO, BackendAdminQuestionVO>(`/admin/questions/${id}`)
    .then(normalizeAdminQuestion)
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

export const importAdminQuestionsApi = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<QuestionImportResultVO, QuestionImportResultVO>('/admin/questions/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const exportAdminQuestionsApi = (params: AdminQuestionQueryDTO) => {
  return request.get<Blob, Blob>('/admin/questions/export/excel', {
    params,
    responseType: 'blob'
  })
}

export const downloadQuestionImportTemplate = () => {
  return request.get<Blob, Blob>('/admin/questions/export/excel', {
    responseType: 'blob'
  })
}

export const submitQuestionAnswerReviewApi = (questionId: number, data: PracticeSubmitDTO) => {
  return request.post<PracticeRecordVO, PracticeRecordVO>(
    `/questions/${questionId}/answer-review`,
    data
  )
}

export const getQuestionAnswerReviewDetailApi = (recordId: number) => {
  return request.get<PracticeRecordVO, PracticeRecordVO>(`/questions/answer-reviews/${recordId}`)
}

export const getQuestionAnswerReviewsApi = (
  questionId: number,
  params: Omit<PracticeRecordQueryDTO, 'questionId'>
) => {
  return request.get<PageResult<PracticeRecordVO>, PageResult<PracticeRecordVO>>(
    `/questions/${questionId}/answer-reviews`,
    { params }
  )
}

export const generateAiQuestionsApi = (data: AiQuestionGenerateRequestDTO) => {
  return request.post<AiQuestionGenerateResultVO, AiQuestionGenerateResultVO>(
    '/admin/ai/questions/generate',
    data
  )
}

const toAiQuestionGenerateSseQuery = (params: AiQuestionGenerateSseParams) => ({
  targetPosition: params.targetPosition || '',
  technologyStack: params.technologyStack || '',
  knowledgePoint: params.knowledgePoint || '',
  questionType: params.questionType || '',
  difficulty: params.difficulty || '',
  experienceYears: params.experienceYears != null ? String(params.experienceYears) : '',
  count: params.count != null ? String(params.count) : '',
  extraRequirements: params.extraRequirements || ''
})

export const streamAiQuestionGenerateApi = (
  params: AiQuestionGenerateSseParams,
  handlers: {
    onEvent?: (event: AiQuestionGenerateSseEventType | string, data?: AiQuestionGenerateSseEvent) => void
    onError?: (error: Error, hasStarted: boolean) => void
    onDone?: () => void
  },
  signal?: AbortSignal
) => {
  return streamSse<AiQuestionGenerateSseEvent>({
    url: buildSseUrl('/ai/sse/admin/questions/generate', toAiQuestionGenerateSseQuery(params)),
    signal,
    handlers
  })
}

export const getQuestionReviewsApi = (params: QuestionReviewQueryDTO) => {
  return request.get<PageResult<QuestionReviewListVO>, PageResult<QuestionReviewListVO>>(
    '/admin/question-reviews',
    { params: compactQuery(params) }
  )
}

export const getQuestionReviewDetailApi = (id: number) => {
  return request.get<QuestionReviewDetailVO, QuestionReviewDetailVO>(`/admin/question-reviews/${id}`)
}

export const approveQuestionReviewApi = (id: number, data?: QuestionReviewApproveDTO) => {
  return request.post<QuestionReviewDetailVO, QuestionReviewDetailVO>(
    `/admin/question-reviews/${id}/approve`,
    data
  )
}

export const rejectQuestionReviewApi = (id: number, data: QuestionReviewRejectDTO) => {
  return request.post<QuestionReviewDetailVO, QuestionReviewDetailVO>(
    `/admin/question-reviews/${id}/reject`,
    data
  )
}

export const cancelQuestionReviewApi = (id: number, data?: Partial<QuestionReviewRejectDTO>) => {
  return request.post<QuestionReviewDetailVO, QuestionReviewDetailVO>(
    `/admin/question-reviews/${id}/cancel`,
    data
  )
}

export const batchApproveQuestionReviewsApi = (data: BatchQuestionReviewApproveDTO) => {
  return request.post<BatchQuestionReviewResultVO, BatchQuestionReviewResultVO>(
    '/admin/question-reviews/batch-approve',
    data
  )
}

export const batchRejectQuestionReviewsApi = (data: BatchQuestionReviewRejectDTO) => {
  return request.post<BatchQuestionReviewResultVO, BatchQuestionReviewResultVO>(
    '/admin/question-reviews/batch-reject',
    data
  )
}

export const checkQuestionDuplicateApi = (data: QuestionDuplicateCheckDTO) => {
  return request.post<QuestionDuplicateCheckResultVO, QuestionDuplicateCheckResultVO>(
    '/admin/questions/check-duplicate',
    data
  )
}

export interface QuestionEmbeddingRebuildResult {
  updated: number
  vectorEnabled: boolean
  vectorUpdated: number
  requested?: number
  matched?: number
  retried?: number
  vectorDeleted?: number
  failedBatches?: number
  errors?: string[]
}

export interface QuestionDuplicateEvaluationSummary {
  sampleCount?: number
  evaluatedCount?: number
  passedCount?: number
  failedCount?: number
  missingQuestionCount?: number
  accuracyRate?: number
  generatedAt?: string
}

export interface QuestionEmbeddingStatsResult {
  vectorEnabled?: boolean
  total?: number
  failed?: number
  statusCounts?: Array<{ status?: string; count?: number }>
  dimensionCounts?: Array<{ dimension?: number; count?: number }>
  modelCounts?: Array<{ model?: string; count?: number }>
  lastIndexedAt?: string
  lastFailedAt?: string
  averageTextChars?: number
  collection?: {
    collectionName?: string
    exists?: boolean
    status?: string
    pointCount?: number
    vectorSize?: number
    distance?: string
    errorMessage?: string
  }
}

export const rebuildQuestionEmbeddingApi = (limit?: number) => {
  return request.post<QuestionEmbeddingRebuildResult, QuestionEmbeddingRebuildResult>(
    '/admin/questions/embedding/rebuild',
    limit ? { limit } : {}
  )
}

export const getQuestionEmbeddingStatsApi = () => {
  return request.get<QuestionEmbeddingStatsResult, QuestionEmbeddingStatsResult>('/admin/questions/embedding/stats')
}

export const retryFailedQuestionEmbeddingApi = (limit?: number) => {
  return request.post<QuestionEmbeddingRebuildResult, QuestionEmbeddingRebuildResult>(
    '/admin/questions/embedding/retry-failed',
    limit ? { limit } : {}
  )
}

export const getQuestionDuplicateReviewsApi = (params: QuestionDuplicateReviewQueryDTO) => {
  return request.get<PageResult<QuestionDuplicateReviewListVO>, PageResult<QuestionDuplicateReviewListVO>>(
    '/admin/question-duplicate-reviews',
    { params }
  )
}

export const getQuestionDuplicateReviewDetailApi = (id: number) => {
  return request.get<QuestionDuplicateReviewDetailVO, QuestionDuplicateReviewDetailVO>(
    `/admin/question-duplicate-reviews/${id}`
  )
}

export const getQuestionDuplicateFeedbackStatsApi = () => {
  return request.get<QuestionDuplicateFeedbackStatsVO, QuestionDuplicateFeedbackStatsVO>(
    '/admin/question-duplicate-reviews/feedback-stats'
  )
}

export const evaluateQuestionDuplicateApi = (data: QuestionDuplicateEvaluationDTO) => {
  return request.post<QuestionDuplicateEvaluationVO, QuestionDuplicateEvaluationVO>(
    '/admin/question-duplicate-reviews/evaluate',
    data
  )
}

export const getQuestionDuplicateEvalCasesApi = (params: QuestionDuplicateEvalCaseQueryDTO) => {
  return request.get<PageResult<QuestionDuplicateEvalCaseVO>, PageResult<QuestionDuplicateEvalCaseVO>>(
    '/admin/question-duplicate-reviews/eval/cases',
    { params }
  )
}

export const saveQuestionDuplicateEvalCaseApi = (data: QuestionDuplicateEvalCaseSaveDTO) => {
  return request.post<QuestionDuplicateEvalCaseVO, QuestionDuplicateEvalCaseVO>(
    '/admin/question-duplicate-reviews/eval/cases',
    data
  )
}

export const deleteQuestionDuplicateEvalCaseApi = (id: number) => {
  return request.delete<null, null>(`/admin/question-duplicate-reviews/eval/cases/${id}`)
}

export const runQuestionDuplicateEvalApi = (data?: QuestionDuplicateEvalRunRequestDTO) => {
  return request.post<QuestionDuplicateEvalRunVO, QuestionDuplicateEvalRunVO>(
    '/admin/question-duplicate-reviews/eval/runs',
    data || {}
  )
}

export const sweepQuestionDuplicateThresholdApi = (data?: QuestionDuplicateThresholdSweepDTO) => {
  return request.post<QuestionDuplicateThresholdSweepVO, QuestionDuplicateThresholdSweepVO>(
    '/admin/question-duplicate-reviews/eval/runs/threshold-sweep',
    data || {}
  )
}

export const getQuestionDuplicateEvalRunsApi = (params?: { pageNo?: number; pageSize?: number }) => {
  return request.get<PageResult<QuestionDuplicateEvalRunVO>, PageResult<QuestionDuplicateEvalRunVO>>(
    '/admin/question-duplicate-reviews/eval/runs',
    { params }
  )
}


export const getQuestionDuplicateEvalRunApi = (id: number) => {
  return request.get<QuestionDuplicateEvalRunVO, QuestionDuplicateEvalRunVO>(`/admin/question-duplicate-reviews/eval/runs/${id}`)
}
export const mergeQuestionDuplicateReviewApi = (id: number, data?: QuestionDuplicateMergeDTO) => {
  return request.post<QuestionDuplicateReviewDetailVO, QuestionDuplicateReviewDetailVO>(
    `/admin/question-duplicate-reviews/${id}/merge`,
    data
  )
}

export const ignoreQuestionDuplicateReviewApi = (id: number, data?: QuestionDuplicateIgnoreDTO) => {
  return request.post<QuestionDuplicateReviewDetailVO, QuestionDuplicateReviewDetailVO>(
    `/admin/question-duplicate-reviews/${id}/ignore`,
    data
  )
}

export interface BatchQuestionDuplicateResultVO {
  requestedCount: number
  successCount: number
  failureCount: number
  failures: Array<{ id: number; reason: string }>
}

export const batchMergeQuestionDuplicateReviewApi = (data: {
  ids: number[]
  relationType?: string
  reason?: string
}) => {
  return request.post<BatchQuestionDuplicateResultVO, BatchQuestionDuplicateResultVO>(
    '/admin/question-duplicate-reviews/batch-merge',
    data
  )
}

export const batchIgnoreQuestionDuplicateReviewApi = (data: { ids: number[]; ignoredReason?: string }) => {
  return request.post<BatchQuestionDuplicateResultVO, BatchQuestionDuplicateResultVO>(
    '/admin/question-duplicate-reviews/batch-ignore',
    data
  )
}

export const getQuestionRelationsApi = (questionId: number) => {
  return request.get<QuestionRelationVO[], QuestionRelationVO[]>(
    `/admin/questions/${questionId}/relations`
  )
}

export const createQuestionRelationApi = (
  questionId: number,
  data: QuestionRelationCreateDTO
) => {
  return request.post<QuestionRelationVO, QuestionRelationVO>(
    `/admin/questions/${questionId}/relations`,
    data
  )
}

export const deleteQuestionRelationApi = (questionId: number, relationId: number) => {
  return request.delete<null, null>(`/admin/questions/${questionId}/relations/${relationId}`)
}
