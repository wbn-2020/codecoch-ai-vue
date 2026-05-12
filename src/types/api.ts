export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
  traceId?: string
}

export interface PageQuery {
  pageNo?: number
  pageSize?: number
}

export interface PageResult<T> {
  records: T[]
  total: number
  pageNo: number
  pageSize: number
  pages: number
}

export interface RequestErrorPayload {
  code?: number
  message?: string
  traceId?: string
}
