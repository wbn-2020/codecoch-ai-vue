import type { PageQuery } from './api'

export interface AdminListQuery extends PageQuery {
  keyword?: string
  status?: string | number | ''
  type?: string
  startTime?: string
  endTime?: string
  userId?: number
  roleId?: number
  username?: string
  module?: string
  action?: string
  traceId?: string
  loginType?: string
  mapperId?: string
  sqlCommandType?: string
  minCostMs?: number
}

export interface AdminLogSummaryVO {
  totalOperationLogs: number
  todayOperationLogs: number
  failedOperationLogs: number
  todayFailedOperationLogs: number
  latestOperationAt?: string
  totalLoginLogs: number
  todayLoginLogs: number
  failedLoginLogs: number
  todayFailedLoginLogs: number
  latestLoginAt?: string
}

export interface AsyncTaskVO {
  id: number
  taskId?: string
  taskType?: string
  taskName?: string
  status: string
  retryCount?: number
  maxRetryCount?: number
  deadLetter?: boolean | number
  bizId?: string
  bizType?: string
  errorMessage?: string
  payload?: string
  payloadPreview?: string
  payloadHash?: string
  result?: string
  resultPreview?: string
  resultHash?: string
  rawFieldsAvailable?: boolean
  createdAt?: string
  updatedAt?: string
  finishedAt?: string
}

export interface AdminTaskImpactPreviewVO {
  id: number
  targetType?: string
  bizType?: string
  bizId?: string
  userId?: number
  currentStatus?: string
  executable?: boolean
  impact?: string
  riskLevel?: string
  requiredPermission?: string
  requiredNote?: string
}

export interface AdminNotificationVO {
  id: number
  title: string
  content?: string
  type: string
  targetType?: string
  targetUserId?: number
  status?: string | number
  createdAt?: string
  publishedAt?: string
}

export interface NotificationSendDTO {
  title: string
  content: string
  type: string
  targetType: 'ALL' | 'USER'
  targetUserId?: number
}

export interface OperationLogVO {
  id: number
  userId?: number
  username?: string
  module?: string
  menuName?: string
  operation?: string
  action?: string
  traceId?: string
  method?: string
  requestUri?: string
  requestArgs?: string
  requestArgsPreview?: string
  requestArgsHash?: string
  response?: string
  responsePreview?: string
  responseHash?: string
  rawAvailable?: boolean
  ip?: string
  userAgentSummary?: string
  status?: string | number
  costTime?: number
  errorMessage?: string
  createdAt?: string
}

export interface LoginLogVO {
  id: number
  userId?: number
  username?: string
  ip?: string
  ipMasked?: string
  maskedIp?: string
  location?: string
  userAgent?: string
  userAgentMasked?: string
  maskedUserAgent?: string
  userAgentSummary?: string
  traceId?: string
  traceIdShort?: string
  shortTraceId?: string
  loginType?: string
  status?: string | number
  message?: string
  summary?: string
  loginSummary?: string
  preview?: string
  maskedPreview?: string
  loginTime?: string
  createdAt?: string
}

export interface SlowSqlLogVO {
  id: number
  mapperId?: string
  sqlCommandType?: string
  sqlText?: string
  sqlTextPreview?: string
  sqlTextHash?: string
  parameterSummary?: string
  parameterSummaryHash?: string
  rawAvailable?: boolean
  databaseName?: string
  costMs?: number
  thresholdMs?: number
  resultSize?: number
  createdAt?: string
}

export interface MenuVO {
  id: number
  parentId?: number
  menuName: string
  name?: string
  path?: string
  component?: string
  permission?: string
  permissionCode?: string
  icon?: string
  type?: string
  sortOrder?: number
  visible?: number
  status?: number
  children?: MenuVO[]
}

export interface RoleMenuGrantDTO {
  menuIds: number[]
}

export interface AiModelConfigVO {
  id: number
  provider: string
  modelCode?: string
  modelName: string
  displayName?: string
  apiBaseUrl?: string
  apiKeyMasked?: string
  enabled?: number
  isDefault?: number
  status?: number | string
  temperature?: number
  maxTokens?: number
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface AiModelConfigDTO {
  provider: string
  modelCode?: string
  modelName: string
  displayName?: string
  apiBaseUrl?: string
  apiKey?: string
  enabled?: number
  isDefault?: number
  temperature?: number
  maxTokens?: number
  description?: string
}

export interface AdminInterviewVO {
  interviewId: number
  userId?: number
  username?: string
  interviewName?: string
  interviewMode?: string
  targetPosition?: string
  status?: string
  reportStatus?: string
  totalScore?: number
  questionCount?: number
  createdAt?: string
  startedAt?: string
  finishedAt?: string
}

export interface AdminInterviewReportVO {
  id?: number
  reportId?: number
  interviewId: number
  userId?: number
  username?: string
  interviewName?: string
  reportStatus?: string
  totalScore?: number
  summary?: string
  failedReason?: string
  generatedAt?: string
  createdAt?: string
}
