import type { PageQuery } from './api'

export type AiScene =
  | 'INTERVIEW_QUESTION_GENERATE'
  | 'PROJECT_DEEP_DIVE_QUESTION'
  | 'INTERVIEW_ANSWER_EVALUATE'
  | 'INTERVIEW_FOLLOW_UP_GENERATE'
  | 'INTERVIEW_REPORT_GENERATE'
  | string

export interface PromptTemplateQueryDTO extends PageQuery {
  keyword?: string
  scene?: AiScene | ''
  status?: number | ''
}

export interface PromptTemplateVO {
  id: number
  promptName: string
  name?: string
  templateCode: string
  promptType: AiScene
  scene?: AiScene
  templateContent?: string
  content?: string
  systemPrompt?: string
  userPromptTemplate?: string
  variables?: string
  variableDesc?: string
  version?: string
  status: number
  description?: string
  createdAt?: string
  updatedAt?: string
  updateTime?: string
}

export interface PromptTemplateDTO {
  scene: AiScene
  name: string
  content: string
  status: number
  description?: string
}

export interface AiCallLogQueryDTO extends PageQuery {
  userId?: number
  interviewId?: number
  scene?: AiScene | ''
  callType?: AiScene | ''
  status?: number | ''
  modelName?: string
  businessId?: string
  startTime?: string
  endTime?: string
}

export interface AiCallLogVO {
  id: number
  userId?: number
  interviewId?: number
  stageId?: number
  messageId?: number
  scene?: AiScene
  callType: AiScene
  status: string | number
  provider?: string
  modelName?: string
  promptTemplateId?: number
  promptVersion?: string
  requestPrompt?: string
  requestParams?: string
  promptContent?: string
  responseContent?: string
  businessId?: string
  elapsedMs?: number
  errorMessage?: string
  failReason?: string
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  createdAt?: string
}
