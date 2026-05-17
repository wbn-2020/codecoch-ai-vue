import type { PageQuery } from './api'

export type AiScene =
  | 'INTERVIEW_QUESTION_GENERATE'
  | 'PROJECT_DEEP_DIVE_QUESTION'
  | 'INTERVIEW_ANSWER_EVALUATE'
  | 'INTERVIEW_FOLLOW_UP_GENERATE'
  | 'INTERVIEW_REPORT_GENERATE'
  | string

export type PromptTemplateVersionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISABLED'

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

export interface PromptTemplateDetailVO extends PromptTemplateVO {
  activeVersion?: PromptTemplateVersionVO
}

export interface PromptTemplateDTO {
  scene: AiScene
  name: string
  content: string
  status: number
  description?: string
}

export interface PromptTemplateVersionVO {
  id: number
  templateId: number
  scene: AiScene
  versionCode: string
  versionName?: string
  content: string
  variablesJson?: string
  modelParamsJson?: string
  status: PromptTemplateVersionStatus | string
  isActive: number
  createdBy?: number
  activatedBy?: number
  activatedAt?: string
  changeLog?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreatePromptTemplateVersionDTO {
  versionCode: string
  content: string
  versionName?: string
  variablesJson?: string
  modelParamsJson?: string
  status?: PromptTemplateVersionStatus
  changeLog?: string
}

export interface PromptTemplateVersionQuery extends PageQuery {
  status?: PromptTemplateVersionStatus | ''
  isActive?: number | ''
}

export interface ActivatePromptTemplateVersionDTO {
  changeLog?: string
}

export interface PromptVersionRollbackDTO {
  changeLog?: string
}

export interface DisablePromptTemplateVersionDTO {
  changeLog?: string
}

export interface TestPromptTemplateVersionDTO {
  inputVariables?: Record<string, string>
  callAi?: boolean
}

export interface TestPromptTemplateVersionVO {
  versionId: number
  templateId: number
  scene: AiScene
  versionCode: string
  renderedPrompt: string
  inputVariables?: Record<string, string>
  aiResponse?: string
  aiCallLogId?: number
  mockMode?: boolean
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

export interface PromptCallLogQueryDTO extends PageQuery {
  success?: boolean | ''
  scene?: AiScene | ''
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
  promptTemplateVersionId?: number
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
  costTimeMs?: number
  duration?: number
  promptTokens?: number
  completionTokens?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  createdAt?: string
}
