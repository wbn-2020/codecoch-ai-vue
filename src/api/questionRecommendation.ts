import request from '@/utils/request'
import type { PageResult } from '@/types/api'
import {
  QUESTION_RECOMMENDATION_SOURCE_TYPE,
  type QuestionRecommendationBatchDetailVO,
  type QuestionRecommendationBatchListVO,
  type QuestionRecommendationGenerateFromGapDTO,
  type QuestionRecommendationGenerateFromMatchReportDTO,
  type QuestionRecommendationGenerateFromStudyPlanDTO,
  type QuestionRecommendationGenerateVO,
  type QuestionRecommendationItemVO,
  type QuestionRecommendationQueryDTO,
  type QuestionRecommendationSourceTypeVO
} from '@/types/questionRecommendation'
import { compactQueryParams, normalizePageResult } from '@/utils/page'

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

export const submitQuestionRecommendationsFromGapApi = (
  data: QuestionRecommendationGenerateFromGapDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/submit-from-gap',
    data
  )
}

export const submitQuestionRecommendationsFromMatchReportApi = (
  data: QuestionRecommendationGenerateFromMatchReportDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/submit-from-match-report',
    data
  )
}

export const submitQuestionRecommendationsFromStudyPlanApi = (
  data: QuestionRecommendationGenerateFromStudyPlanDTO
) => {
  return request.post<QuestionRecommendationGenerateVO, QuestionRecommendationGenerateVO>(
    '/question-recommendations/submit-from-study-plan',
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
    >('/question-recommendations/batches', { params: compactQueryParams(params) })
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

const getLatestBatchItems = async (params: QuestionRecommendationQueryDTO) => {
  const page = await getQuestionRecommendationBatchesApi({
    ...params,
    pageNo: 1,
    pageSize: 1
  })
  const batch = page.records?.[0]
  return batch ? getQuestionRecommendationBatchItemsApi(batch.batchId) : []
}

export const getQuestionRecommendationItemsFromGapBatchApi = (params: {
  skillProfileId: number
  gapItemIds?: number[]
}) => getLatestBatchItems({
  skillProfileId: params.skillProfileId,
  sourceType: QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP
})

export const getQuestionRecommendationItemsFromMatchReportBatchApi = (matchReportId: number) => getLatestBatchItems({
  matchReportId,
  sourceType: QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH
})

export const getQuestionRecommendationItemsFromStudyPlanBatchApi = (studyPlanId: number) => getLatestBatchItems({
  studyPlanId,
  sourceType: QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN
})
