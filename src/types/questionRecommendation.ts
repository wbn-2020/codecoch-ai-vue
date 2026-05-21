import type { PageQuery } from './api'

export type QuestionRecommendationStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | string

export const QUESTION_RECOMMENDATION_SOURCE_TYPE = {
  JD_GAP: 'JD_GAP',
  RESUME_JOB_MATCH: 'RESUME_JOB_MATCH',
  STUDY_PLAN: 'STUDY_PLAN'
} as const

export type QuestionRecommendationSourceType =
  (typeof QUESTION_RECOMMENDATION_SOURCE_TYPE)[keyof typeof QUESTION_RECOMMENDATION_SOURCE_TYPE]

export interface QuestionRecommendationGenerateFromGapDTO {
  skillProfileId: number
  gapItemIds?: number[]
  questionCount?: number
  difficultyPreference?: string
  strategy?: string
}

export interface QuestionRecommendationGenerateFromMatchReportDTO {
  matchReportId: number
  gapItemIds?: number[]
  questionCount?: number
  difficultyPreference?: string
  strategy?: string
}

export interface QuestionRecommendationGenerateFromStudyPlanDTO {
  studyPlanId: number
  gapItemIds?: number[]
  questionCount?: number
  difficultyPreference?: string
  strategy?: string
}

export interface QuestionRecommendationQueryDTO extends PageQuery {
  sourceType?: QuestionRecommendationSourceType
  status?: QuestionRecommendationStatus | ''
  jobTargetId?: number
  matchReportId?: number
  skillProfileId?: number
  studyPlanId?: number
}

export interface QuestionRecommendationGenerateVO {
  batchId: number
  status: QuestionRecommendationStatus
  questionCount?: number
  aiCallLogId?: number
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionRecommendationBatchListVO {
  batchId: number
  userId?: number
  sourceType?: QuestionRecommendationSourceType
  sourceId?: number
  jobTargetId?: number
  matchReportId?: number
  skillProfileId?: number
  studyPlanId?: number
  strategy?: string
  questionCount?: number
  status: QuestionRecommendationStatus
  aiCallLogId?: number
  errorMessage?: string
  createdAt?: string
  updatedAt?: string
}

export interface QuestionRecommendationItemVO {
  id: number
  batchId: number
  questionId?: number
  questionTitle?: string
  questionContent?: string
  questionType?: string
  difficulty?: string
  skillCode?: string
  skillName?: string
  gapSeverity?: string
  recommendReason?: string
  answerHint?: string
  evaluatePoints?: string
  sortOrder?: number
  practiceStatus?: string
  sourceType?: QuestionRecommendationSourceType
  sourceId?: number
  createdAt?: string
  updatedAt?: string
}

export interface QuestionRecommendationBatchDetailVO extends QuestionRecommendationBatchListVO {
  request?: unknown
  result?: unknown
  items?: QuestionRecommendationItemVO[]
}

export interface QuestionRecommendationSourceTypeVO {
  code: string
  description?: string
}
