import type { PageQuery } from '@/types/api'

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
  username?: string
  traceId?: string
  aiCallLogTraceId?: string
  createdAt?: string
}

export interface AdminAiResultFeedbackQueryDTO extends PageQuery {
  userId?: number
  scene?: string
  bizType?: string
  bizId?: number
  aiCallLogId?: number
  traceId?: string
  feedbackType?: AiResultFeedbackType | ''
  startTime?: string
  endTime?: string
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
