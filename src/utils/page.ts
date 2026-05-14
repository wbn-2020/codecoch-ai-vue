import type { PageQuery, PageResult } from '@/types/api'

type BackendPage<T> = Partial<PageResult<T>> & {
  pageNum?: number
  list?: T[]
  rows?: T[]
}

export const normalizePageResult = <T, U = T>(
  result: BackendPage<T> | T[],
  params?: PageQuery,
  mapper: (item: T) => U = (item) => item as unknown as U
): PageResult<U> => {
  if (Array.isArray(result)) {
    const pageNo = params?.pageNo || params?.pageNum || 1
    const pageSize = params?.pageSize || result.length || 10
    return {
      records: result.map(mapper),
      total: result.length,
      pageNo,
      pageNum: pageNo,
      pageSize,
      pages: Math.max(1, Math.ceil(result.length / pageSize))
    }
  }

  const pageNo = result.pageNo || result.pageNum || params?.pageNo || params?.pageNum || 1
  const pageSize = result.pageSize || params?.pageSize || 10
  const records = result.records || result.list || result.rows || []
  const total = result.total ?? records.length

  return {
    records: records.map(mapper),
    total,
    pageNo,
    pageNum: result.pageNum || pageNo,
    pageSize,
    pages: result.pages || Math.max(1, Math.ceil(total / pageSize))
  }
}
