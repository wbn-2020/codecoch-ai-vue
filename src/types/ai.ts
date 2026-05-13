import type { PageQuery } from './api'

export type AiScene =
  | 'INTERVIEW_QUESTION_GENERATE'
  | 'PROJECT_DEEP_DIVE_QUESTION'
  | 'ANSWER_EVALUATE'
  | 'INTERVIEW_FOLLOW_UP_GENERATE'
  | 'INTERVIEW_REPORT_GENERATE'
  | string

export interface PromptTemplateQueryDTO extends PageQuery {
  keyword?: string
  promptType?: AiScene | ''
  status?: number | ''
}

export interface PromptTemplateVO {
  id: number
  promptName: string
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
  promptName: string
  templateCode: string
  promptType: AiScene
  templateContent: string
  systemPrompt?: string
  userPromptTemplate?: string
  variables?: string
  version?: string
  status: number
  description?: string
}

export interface AiCallLogQueryDTO extends PageQuery {
  userId?: number
  interviewId?: number
  callType?: AiScene | ''
  status?: string
  modelName?: string
  startTime?: string
  endTime?: string
}

export interface AiCallLogVO {
  id: number
  userId?: number
  interviewId?: number
  stageId?: number
  messageId?: number
  callType: AiScene
  status: string
  provider?: string
  modelName?: string
  promptTemplateId?: number
  promptVersion?: string
  requestParams?: string
  promptContent?: string
  responseContent?: string
  errorMessage?: string
  latencyMs?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  createdAt?: string
}
