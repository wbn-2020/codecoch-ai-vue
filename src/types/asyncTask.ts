import type { PageQuery } from './api'

export interface AsyncTaskQueryDTO extends PageQuery {
  type?: string
  bizType?: string
  bizId?: string
  status?: string
  messageId?: string
  traceId?: string
  keyword?: string
}

export interface AsyncTaskVO {
  id: number
  messageId?: string | null
  bizType?: string | null
  bizId?: string | null
  userId?: number | null
  traceId?: string | null
  status?: string | null
  retryCount?: number | null
  maxRetry?: number | null
  failureReason?: string | null
  payloadPreview?: string | null
  payloadHash?: string | null
  resultPreview?: string | null
  resultHash?: string | null
  rawFieldsAvailable?: boolean | null
  payload?: string | null
  result?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}
