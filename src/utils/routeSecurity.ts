import type { LocationQueryRaw } from 'vue-router'

type QuerySource = Record<string, unknown>

const safeRouteQueryKeys = new Set([
  'bizid',
  'biztype',
  'caseid',
  'candidateid',
  'campaignid',
  'categoryid',
  'chunkid',
  'current',
  'date',
  'documentid',
  'experimentid',
  'from',
  'groupid',
  'hypothesisid',
  'id',
  'jdanalysisid',
  'matchreportid',
  'messageid',
  'mode',
  'page',
  'pageno',
  'pagesize',
  'planid',
  'applicationid',
  'assetid',
  'assettype',
  'packagesnapshotid',
  'profileid',
  'questionid',
  'relationid',
  'reportid',
  'resultid',
  'resumeid',
  'runid',
  'size',
  'source',
  'status',
  'tab',
  'tagid',
  'targetjobid',
  'taskid',
  'traceid',
  'type',
  'usageid',
  'variantid'
])

const sensitiveRedirectQueryKeys = new Set([
  'answer',
  'answerhint',
  'answersnapshot',
  'answertext',
  'api-key',
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'cookie',
  'credential',
  'evidencesummary',
  'evaluatepoints',
  'inputsnapshot',
  'jd',
  'jobdescription',
  'output',
  'outputjson',
  'password',
  'prompt',
  'raw',
  'rawoutput',
  'rawprompt',
  'rawresponse',
  'rawtext',
  'reason',
  'recommendreason',
  'response',
  'resume',
  'secret',
  'session',
  'snapshot',
  'token'
])

const sensitiveRedirectQueryFragments = [
  'answerhint',
  'answersnapshot',
  'authorization',
  'credential',
  'evidencesummary',
  'evaluatepoints',
  'inputsnapshot',
  'jobdescription',
  'password',
  'prompt',
  'rawoutput',
  'rawprompt',
  'rawresponse',
  'recommendreason',
  'renderedprompt',
  'response',
  'resumecontent',
  'resumesnapshot',
  'resumetext',
  'secret',
  'token'
]

export const isSensitiveRedirectQueryKey = (key: string) => {
  const normalized = key.toLowerCase()
  return sensitiveRedirectQueryKeys.has(normalized) ||
    sensitiveRedirectQueryFragments.some((fragment) => normalized.includes(fragment))
}

const isSafeRouteQueryKey = (key: string) => {
  const normalized = key.toLowerCase()
  return safeRouteQueryKeys.has(normalized) && !isSensitiveRedirectQueryKey(normalized)
}

const isSafeRouteQueryValue = (value: string) =>
  value.length <= 128 && /^[\w:.-]+$/.test(value)

export const buildSafeRouteQuery = (query: QuerySource = {}): LocationQueryRaw => {
  const safeQuery: LocationQueryRaw = {}

  Object.entries(query).forEach(([key, value]) => {
    if (!isSafeRouteQueryKey(key)) return
    const values = Array.isArray(value) ? value : [value]
    const safeValues = values
      .filter((item) => item !== undefined && item !== null && item !== '')
      .map((item) => String(item))
      .map((item) => item.trim())
      .filter((item) => Boolean(item) && isSafeRouteQueryValue(item))

    if (!safeValues.length) return
    safeQuery[key] = safeValues.length === 1 ? safeValues[0] : safeValues
  })

  return safeQuery
}

const appendQuery = (params: URLSearchParams, query: LocationQueryRaw) => {
  Object.entries(query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]
    values.forEach((item) => {
      if (item !== undefined && item !== null && item !== '') {
        params.append(key, String(item))
      }
    })
  })
}

const searchParamsToQuery = (searchParams: URLSearchParams): QuerySource => {
  const query: Record<string, string[]> = {}
  searchParams.forEach((value, key) => {
    if (!query[key]) query[key] = []
    query[key].push(value)
  })
  return query
}

const safeLocalPath = (path: unknown, fallback: string) => {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return fallback
  return path.split('?')[0].split('#')[0] || fallback
}

export const buildSafeRedirectTarget = (
  path: unknown,
  query: QuerySource = {},
  fallback = '/'
) => {
  const pathname = safeLocalPath(path, fallback)
  const params = new URLSearchParams()
  appendQuery(params, buildSafeRouteQuery(query))
  const queryString = params.toString()
  return `${pathname}${queryString ? `?${queryString}` : ''}`
}

export const buildSafeRedirectFromLocation = (pathname: string, search = '') =>
  buildSafeRedirectTarget(pathname, searchParamsToQuery(new URLSearchParams(search)))

export const sanitizeLocalRedirectPath = (
  value: unknown,
  fallback = '',
  blockedPaths = ['/login', '/register']
) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return fallback
    if (blockedPaths.includes(url.pathname)) return fallback
    return buildSafeRedirectTarget(url.pathname || fallback, searchParamsToQuery(url.searchParams), fallback)
  } catch {
    const pathname = safeLocalPath(value, fallback)
    return blockedPaths.includes(pathname) ? fallback : pathname
  }
}

export const sanitizeLocalActionPath = (value: unknown, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback
  return sanitizeLocalRedirectPath(trimmed.startsWith('/') ? trimmed : `/${trimmed}`, fallback)
}

export const sanitizeDiagnosticUrl = (value: unknown, fallback = '-') => {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin

  try {
    const url = new URL(value, origin)
    if (url.origin !== origin) return fallback
    return buildSafeRedirectTarget(url.pathname || '/', searchParamsToQuery(url.searchParams), fallback)
  } catch {
    return sanitizeLocalActionPath(value, fallback)
  }
}
