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

const normalizeRecommendationItems = (
  data:
    | QuestionRecommendationItemVO[]
    | QuestionRecommendationBatchDetailVO
    | PageResult<QuestionRecommendationItemVO>
    | null
    | undefined
) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if ('items' in data && Array.isArray(data.items)) return data.items
  if ('records' in data && Array.isArray(data.records)) return data.records
  return []
}

export const getQuestionRecommendationsByGapApi = async (params: {
  skillProfileId: number
  gapItemIds?: number[]
}) => {
  try {
    const data = await request.get<
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>,
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>
    >('/questions/recommendations/by-gap', { params })
    return normalizeRecommendationItems(data)
  } catch {
    const page = await getQuestionRecommendationBatchesApi({
      pageNo: 1,
      pageSize: 1,
      skillProfileId: params.skillProfileId,
      sourceType: 'GAP'
    })
    const batch = page.records?.[0]
    return batch ? getQuestionRecommendationBatchItemsApi(batch.batchId) : []
  }
}

export const getQuestionRecommendationsByMatchReportApi = async (matchReportId: number) => {
  try {
    const data = await request.get<
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>,
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>
    >('/questions/recommendations/by-match-report', { params: { matchReportId } })
    return normalizeRecommendationItems(data)
  } catch {
    const page = await getQuestionRecommendationBatchesApi({
      pageNo: 1,
      pageSize: 1,
      matchReportId,
      sourceType: 'MATCH_REPORT'
    })
    const batch = page.records?.[0]
    return batch ? getQuestionRecommendationBatchItemsApi(batch.batchId) : []
  }
}

export const getQuestionRecommendationsByStudyPlanApi = async (studyPlanId: number) => {
  try {
    const data = await request.get<
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>,
      QuestionRecommendationItemVO[] | QuestionRecommendationBatchDetailVO | PageResult<QuestionRecommendationItemVO>
    >('/questions/recommendations/by-study-plan', { params: { studyPlanId } })
    return normalizeRecommendationItems(data)
  } catch {
    const page = await getQuestionRecommendationBatchesApi({
      pageNo: 1,
      pageSize: 1,
      studyPlanId,
      sourceType: 'STUDY_PLAN'
    })
    const batch = page.records?.[0]
    return batch ? getQuestionRecommendationBatchItemsApi(batch.batchId) : []
  }
}
