export type AiResultFeedbackType =
  | 'HELPFUL'
  | 'NOT_HELPFUL'
  | 'INACCURATE'
  | 'NOT_MY_EXPERIENCE'
  | 'HALLUCINATION'
  | 'IRRELEVANT'
  | 'OUTDATED'
  | 'OTHER'
  | string

export interface AiResultFeedbackCreateDTO {
  scene: string
  bizType?: string
  bizId?: number
  aiCallLogId?: number
  feedbackType: AiResultFeedbackType
  rating?: number
  comment?: string
  pagePath?: string
}

export interface AiResultFeedbackVO extends AiResultFeedbackCreateDTO {
  id: number
  userId?: number
  createdAt?: string
}

export interface AiResultFeedbackStatsVO {
  totalFeedbackCount?: number
  inaccurateCount?: number
  hallucinationCount?: number
  notMyExperienceCount?: number
  negativeFeedbackCount?: number
  negativeFeedbackRate?: number
  typeDistribution?: Array<{
    feedbackType?: string
    count?: number
  }>
}
