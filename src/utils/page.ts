import type { PageQuery, PageResult } from '@/types/api'

type BackendPage<T> = Partial<PageResult<T>> & {
  pageNum?: number
  current?: number
  size?: number
  list?: T[]
  rows?: T[]
  items?: T[]
  content?: T[]
  results?: T[]
  resultList?: T[]
  dataList?: T[]
  pageData?: unknown
  totalCount?: number
  totalElements?: number
  totalSize?: number
  rowCount?: number
  totalPages?: number
  pageCount?: number
  count?: number
  data?: unknown
  page?: unknown
  result?: unknown
  pageInfo?: unknown
  pagination?: unknown
}

type PageLikeRecord<T> = BackendPage<T> & Record<string, unknown>

export interface NormalizePageResultOptions {
  allowArrayFallback?: boolean
}

const DIRECT_RECORD_KEYS = ['records', 'list', 'rows', 'items', 'content', 'results', 'resultList', 'dataList'] as const
const RECORD_KEYS = [...DIRECT_RECORD_KEYS, 'data', 'pageData', 'result'] as const
const WRAPPER_KEYS = ['data', 'page', 'result', 'pageInfo', 'pagination', 'payload', 'body', 'pageData'] as const
const PAGE_META_KEYS = [
  'pageNo',
  'pageNum',
  'current',
  'currentPage',
  'pageIndex',
  'number',
  'pageSize',
  'size',
  'perPage',
  'limit',
  'total',
  'totalCount',
  'totalElements',
  'totalSize',
  'rowCount',
  'count',
  'pages',
  'totalPages',
  'pageCount'
] as const

const asRecord = <T>(value: unknown): PageLikeRecord<T> | null => {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null
  return value as PageLikeRecord<T>
}

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numberValue = toNumber(value)
    if (numberValue !== undefined) return numberValue
  }
  return undefined
}

const normalizeQueryValue = (value: unknown): unknown => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map(normalizeQueryValue)
      .filter((item) => item !== '' && item !== undefined && item !== null)
  }
  return value
}

export const compactQueryParams = <T extends object>(params?: T) =>
  Object.fromEntries(
    Object.entries(params || {})
      .map(([key, value]) => [key, normalizeQueryValue(value)] as const)
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0
        return value !== '' && value !== undefined && value !== null
      })
  ) as Partial<T>

const findRecords = <T>(source: PageLikeRecord<T>, keys: ReadonlyArray<(typeof RECORD_KEYS)[number]> = RECORD_KEYS): T[] | undefined => {
  for (const key of keys) {
    const value = source[key]
    if (Array.isArray(value)) return value as T[]
  }
  return undefined
}

const hasDirectRecords = <T>(source: PageLikeRecord<T>) => Boolean(findRecords(source, DIRECT_RECORD_KEYS))

const hasPageMetadata = <T>(source: PageLikeRecord<T>) => PAGE_META_KEYS.some((key) => toNumber(source[key]) !== undefined)

const findPageContainer = <T>(source: unknown, depth = 0): PageLikeRecord<T> | null => {
  if (Array.isArray(source)) return null

  const record = asRecord<T>(source)
  if (!record) return null

  if (hasDirectRecords(record) || hasPageMetadata(record)) return record
  if (depth >= 3) return null

  for (const key of WRAPPER_KEYS) {
    const nested = record[key]
    if (!nested) continue

    if (Array.isArray(nested)) {
      if (hasPageMetadata(record)) {
        return {
          ...record,
          records: nested
        }
      }
      continue
    }

    const nestedRecord = asRecord<T>(nested)
    if (!nestedRecord) continue

    if (hasDirectRecords(nestedRecord) || hasPageMetadata(nestedRecord)) {
      return {
        ...record,
        ...nestedRecord
      }
    }

    const nestedContainer = findPageContainer<T>(nestedRecord, depth + 1)
    if (nestedContainer) {
      return {
        ...record,
        ...nestedContainer
      }
    }
  }

  return null
}

const toArrayPageResult = <T, U>(
  records: T[],
  params: PageQuery | undefined,
  mapper: (item: T) => U
): PageResult<U> => {
  const pageNo = params?.pageNo || params?.pageNum || 1
  const pageSize = params?.pageSize || records.length || 10
  return {
    records: records.map(mapper),
    total: records.length,
    pageNo,
    pageNum: pageNo,
    pageSize,
    pages: Math.max(1, Math.ceil(records.length / pageSize))
  }
}

export const normalizePageResult = <T, U = T>(
  result: BackendPage<T> | T[],
  params?: PageQuery,
  mapperOrOptions: ((item: T) => U) | NormalizePageResultOptions = (item) => item as unknown as U,
  options?: NormalizePageResultOptions
): PageResult<U> => {
  const mapper = typeof mapperOrOptions === 'function' ? mapperOrOptions : ((item: T) => item as unknown as U)
  const normalizeOptions = typeof mapperOrOptions === 'function' ? options : mapperOrOptions

  if (Array.isArray(result)) {
    if (!normalizeOptions?.allowArrayFallback) {
      throw new TypeError('normalizePageResult expected a paginated response object. Pass allowArrayFallback to accept raw array responses.')
    }
    return toArrayPageResult(result, params, mapper)
  }

  const container = findPageContainer<T>(result)
  if (!container) {
    throw new TypeError('normalizePageResult could not find a paginated response shape.')
  }

  const springPageNo = toNumber(container.number)
  const pageNo = pickNumber(
    container.pageNo,
    container.pageNum,
    container.current,
    container.currentPage,
    container.pageIndex,
    params?.pageNo,
    params?.pageNum,
    springPageNo !== undefined ? springPageNo + 1 : undefined
  ) || 1
  const pageSize = pickNumber(container.pageSize, container.size, container.perPage, container.limit, params?.pageSize) || 10
  const records = findRecords(container) || []
  const total = pickNumber(container.total, container.totalCount, container.totalElements, container.totalSize, container.rowCount, container.count) ?? records.length

  return {
    records: records.map(mapper),
    total,
    pageNo,
    pageNum: pickNumber(container.pageNum, container.pageNo, container.current, container.currentPage) || pageNo,
    pageSize,
    pages: pickNumber(container.pages, container.totalPages, container.pageCount) || Math.max(1, Math.ceil(total / pageSize))
  }
}
