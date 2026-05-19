import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import type {
  QuestionRecommendationBatchDetailVO,
  QuestionRecommendationBatchListVO,
  QuestionRecommendationGenerateFromGapDTO,
  QuestionRecommendationGenerateFromMatchReportDTO,
  QuestionRecommendationGenerateFromStudyPlanDTO,
  QuestionRecommendationGenerateVO,
  QuestionRecommendationItemVO,
  QuestionRecommendationQueryDTO,
  QuestionRecommendationSourceTypeVO
} from '@/types/questionRecommendation'
import { normalizePageResult } from '@/utils/page'

export const generateQuestionRecommendationsFromGapApi = (
  data: QuestionRecommendationGenerateFromGapDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/generate-from-gap',
    data
  )
}

export const generateQuestionRecommendationsFromMatchReportApi = (
  data: QuestionRecommendationGenerateFromMatchReportDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/generate-from-match-report',
    data
  )
}

export const generateQuestionRecommendationsFromStudyPlanApi = (
  data: QuestionRecommendationGenerateFromStudyPlanDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/generate-from-study-plan',
    data
  )
}

export const getQuestionRecommendationSourceTypesApi = () => {
  return request.get<QuestionRecommendationSourceTypeVO[], QuestionRecommendationSourceTypeVO[]>(
    '/question-recommendations/source-types'
  )
}

export const getQuestionRecommendationBatchesApi = (params?: QuestionRecommendationQueryDTO) => {
  return request
    .get<
      PageResult<QuestionRecommendationBatchListVO>,
      PageResult<QuestionRecommendationBatchListVO>
    >('/question-recommendations/batches', { params })
    .then((result) => normalizePageResult(result, params))
}

export const getQuestionRecommendationBatchDetailApi = (batchId: number) => {
  return request.get<QuestionRecommendationBatchDetailVO, QuestionRecommendationBatchDetailVO>(
    `/question-recommendations/batches/${batchId}`
  )
}

export const getQuestionRecommendationBatchItemsApi = (batchId: number) => {
  return request.get<QuestionRecommendationItemVO[], QuestionRecommendationItemVO[]>(
    `/question-recommendations/batches/${batchId}/items`
  )
}
