import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { appConfig } from '@/config'
import { clearAllRequestCache } from '@/composables/useRequestCache'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ApiResponseEnvelope, ApiResult, RequestErrorPayload } from '@/types/api'
import type { LoginVO } from '@/types/auth'
import {
  ADMIN_MOBILE_READONLY_BLOCK_MESSAGE,
  isAdminMobileReadonlyViewport
} from '@/utils/adminMobileReadonly'
import { emitAuthCleared, emitAuthRefreshed } from '@/utils/authEvents'
import { emitRequestError } from '@/utils/errorEvents'
import { toFriendlyMessage } from '@/utils/error'
import { showUserMessage } from '@/utils/userMessage'
import { buildSafeRedirectFromLocation, sanitizeDiagnosticUrl } from '@/utils/routeSecurity'
import { redactSensitiveText } from '@/utils/sensitiveText'
import {
  captureAuthSession,
  clearLocalAuth,
  clearLocalAuthIfCurrent,
  isAuthSessionCurrent,
  replaceAuthSessionTokenIfCurrent,
  type AuthSessionSnapshot
} from '@/utils/token'
import { storage } from '@/utils/storage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    preserveEnvelope?: boolean
    silentError?: boolean
  }

  export interface InternalAxiosRequestConfig {
    preserveEnvelope?: boolean
    silentError?: boolean
    _authSessionBound?: boolean
    _authSessionGeneration?: number
    _authSessionId?: string
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface ApiCodeError extends Error {
  code?: number
  config?: InternalAxiosRequestConfig
  localBlocked?: boolean
  staleAuthSession?: boolean
}

interface RefreshState {
  generation: number
  sessionId: string
  token: string
  promise: Promise<string>
}

const DEMO_READ_ONLY_ALLOW_METHODS = new Set(['get', 'head', 'options'])
const DEMO_READ_ONLY_WRITE_WHITELIST = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/logout',
  '/portfolio-demo/load',
  '/portfolio-demo/reset'
]
const ADMIN_MOBILE_READ_ONLY_WRITE_WHITELIST = [
  '/auth/login',
  '/auth/refresh-token',
  '/auth/logout'
]

const request = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

const normalizeTraceId = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  const traceId = value.trim()
  return traceId || undefined
}

const responseHeaderTraceId = (response: AxiosResponse | undefined) => {
  const headers = response?.headers
  if (!headers) return undefined

  if (typeof headers.get === 'function') {
    const traceId = normalizeTraceId(headers.get('X-Trace-Id'))
    if (traceId) return traceId
  }

  const entry = Object.entries(headers).find(([name]) =>
    name.toLowerCase() === 'x-trace-id')
  return normalizeTraceId(entry?.[1])
}

const responseTraceId = (
  bodyTraceId: unknown,
  response: AxiosResponse | undefined
) => normalizeTraceId(bodyTraceId) ?? responseHeaderTraceId(response)

const handleTokenExpired = (expectedSession?: AuthSessionSnapshot) => {
  const cleared = expectedSession
    ? clearLocalAuthIfCurrent(expectedSession)
    : (clearLocalAuth(), true)
  if (!cleared) return false

  emitAuthCleared()
  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(buildSafeRedirectFromLocation(window.location.pathname, window.location.search))
    window.location.href = `/login?redirect=${redirect}`
  }
  return true
}

const getErrorCode = (error: unknown) => {
  const code = (error as { code?: number })?.code
  if (typeof code === 'number') return code
  const responseCode = (error as AxiosError<RequestErrorPayload>)?.response?.data?.code
  return typeof responseCode === 'number' ? responseCode : undefined
}

const isAuthFailureCode = (code?: number) =>
  code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID

const isHttpAuthFailure = (error: unknown) => {
  const status = (error as AxiosError)?.response?.status
  return status === 401 || status === 403
}

const isRefreshAuthFailure = (error: unknown) =>
  isAuthFailureCode(getErrorCode(error))
  || getErrorCode(error) === HTTP_STATUS_CODE.FORBIDDEN
  || isHttpAuthFailure(error)

const createApiCodeError = (message: string, code?: number) => {
  const error = new Error(message) as ApiCodeError
  error.code = code
  return error
}

const createStaleAuthSessionError = () => {
  const error = createApiCodeError('登录状态已发生变化，已忽略旧会话响应。')
  error.staleAuthSession = true
  return error
}

const isStaleAuthSessionError = (error: unknown) =>
  Boolean((error as ApiCodeError)?.staleAuthSession)

const isRequestAuthSessionCurrent = (config?: InternalAxiosRequestConfig) => {
  if (
    config?._authSessionGeneration === undefined
    || config._authSessionId === undefined
  ) {
    return true
  }
  const currentSession = captureAuthSession()
  return config._authSessionGeneration === currentSession.generation
    && config._authSessionId === currentSession.sessionId
}

const createLocalBlockedError = (message: string, config: InternalAxiosRequestConfig) => {
  const error = createApiCodeError(message, HTTP_STATUS_CODE.FORBIDDEN)
  error.config = config
  error.localBlocked = true
  return error
}

const requestPathOnly = (url: string) => {
  try {
    return new URL(url, 'http://codecoachai.local').pathname
  } catch {
    return url.split(/[?#]/)[0]
  }
}

const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password'
])

const shouldAttemptTokenRefresh = (config?: InternalAxiosRequestConfig) =>
  Boolean(config && !AUTH_REFRESH_EXCLUDED_PATHS.has(requestPathOnly(String(config.url || ''))))

const normalizeFieldName = (value: string) => value.replace(/[_-]/g, '').toLowerCase()

const adminRawFieldNames = (path: string) => {
  const fields = new Set<string>()
  if (path.startsWith('/admin/ai/')) {
    [
      'apiKey',
      'requestPrompt',
      'requestParams',
      'requestBody',
      'responseContent',
      'responseBody',
      'promptContent',
      'templateContent',
      'systemPrompt',
      'userPromptTemplate',
      'inputVariablesJson',
      'modelParamsJson',
      'variablesJson',
      'content'
    ].forEach((field) => fields.add(normalizeFieldName(field)))
  }
  if (path.startsWith('/admin/agent/runs')) {
    [
      'inputSnapshot',
      'inputSnapshotJson',
      'output',
      'outputJson',
      'rawOutputText'
    ].forEach((field) => fields.add(normalizeFieldName(field)))
  }
  if (path.startsWith('/admin/tasks') || path.startsWith('/admin/async-tasks')) {
    ['payload', 'result'].forEach((field) => fields.add(normalizeFieldName(field)))
  }
  if (path.startsWith('/admin/operation-logs')) {
    ['requestArgs', 'response'].forEach((field) => fields.add(normalizeFieldName(field)))
  }
  if (path.startsWith('/admin/logs/slow-sql')) {
    fields.add(normalizeFieldName('sqlText'))
  }
  if (path.startsWith('/admin/login-logs')) {
    ['ip', 'ipAddress', 'userAgent', 'clientInfo']
      .forEach((field) => fields.add(normalizeFieldName(field)))
  }
  return fields
}

const stripAdminRawFields = (
  value: unknown,
  blockedFields: Set<string>,
  seen = new WeakMap<object, unknown>()
): unknown => {
  if (!value || typeof value !== 'object') return value
  if (typeof Blob !== 'undefined' && value instanceof Blob) return value
  if (value instanceof Date) return value
  if (seen.has(value)) return seen.get(value)

  if (Array.isArray(value)) {
    const safeItems: unknown[] = []
    seen.set(value, safeItems)
    value.forEach((item) => safeItems.push(stripAdminRawFields(item, blockedFields, seen)))
    return safeItems
  }

  const safeRecord: Record<string, unknown> = {}
  seen.set(value, safeRecord)
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    const normalizedKey = normalizeFieldName(key)
    if (blockedFields.has(normalizedKey)) return
    safeRecord[key] = normalizedKey === 'rawfieldsincluded'
      ? false
      : stripAdminRawFields(item, blockedFields, seen)
  })
  return safeRecord
}

const sanitizeAdminResponseData = (
  value: unknown,
  config?: InternalAxiosRequestConfig
) => {
  const path = requestPathOnly(String(config?.url || ''))
  if (!path.startsWith('/admin/') || /\/raw\/?$/.test(path)) return value
  const blockedFields = adminRawFieldNames(path)
  if (blockedFields.size === 0) return value
  return stripAdminRawFields(value, blockedFields)
}

export const isDemoReadOnlyWriteWhitelisted = (url?: string) => {
  const path = requestPathOnly(String(url || ''))
  return DEMO_READ_ONLY_WRITE_WHITELIST.includes(path)
}

const isDemoReadOnlyWrite = (config: InternalAxiosRequestConfig) => {
  if (!appConfig.demoReadOnly) return false
  const method = String(config.method || 'get').toLowerCase()
  if (DEMO_READ_ONLY_ALLOW_METHODS.has(method)) return false
  return !isDemoReadOnlyWriteWhitelisted(String(config.url || ''))
}

const isAdminMobileReadOnlyWrite = (config: InternalAxiosRequestConfig) => {
  if (!isAdminMobileReadonlyViewport()) return false
  const method = String(config.method || 'get').toLowerCase()
  if (DEMO_READ_ONLY_ALLOW_METHODS.has(method)) return false
  const url = String(config.url || '')
  return !ADMIN_MOBILE_READ_ONLY_WRITE_WHITELIST.some((path) => url.includes(path))
}

const emitResponseDiagnostic = (
  config: InternalAxiosRequestConfig | undefined,
  payload: {
    status?: number
    code?: number
    message?: string
    traceId?: string
  }
) => {
  emitRequestError({
    method: String(config?.method || 'GET').toUpperCase(),
    url: sanitizeDiagnosticUrl(config?.url),
    status: payload.status,
    code: payload.code,
    message: redactSensitiveText(toFriendlyMessage(payload.message, '请求失败，请稍后重试。')),
    traceId: payload.traceId
  })
}

const emitLocalBlockDiagnostic = (config: InternalAxiosRequestConfig, message: string) => {
  emitResponseDiagnostic(config, {
    status: 403,
    code: HTTP_STATUS_CODE.FORBIDDEN,
    message
  })
}

const toAuthItems = (value?: unknown): unknown[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return value ? [value] : []
}

const pickAuthCode = (value: unknown, objectKeys: string[]) => {
  const raw = typeof value === 'string'
    ? value
    : typeof value === 'object' && value
      ? objectKeys.map((key) => (value as Record<string, unknown>)[key]).find((item) => typeof item === 'string')
      : null
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

const normalizeRoles = (...items: Array<unknown>) =>
  Array.from(new Set(items.flatMap(toAuthItems)
    .map((item) => pickAuthCode(item, ['roleCode', 'role_code', 'roleName', 'role_name', 'authority', 'code', 'name']))
    .filter(Boolean)
    .map((item) => String(item).replace(/^ROLE_/i, '').toUpperCase())))

const normalizePermissions = (...items: Array<unknown>) =>
  Array.from(new Set(items.flatMap(toAuthItems)
    .map((item) => pickAuthCode(item, ['permissionCode', 'permission_code', 'permCode', 'perm_code', 'authority', 'code', 'name']))
    .filter(Boolean)
    .map(String)))

const persistRefreshResult = (
  result: LoginVO,
  expectedSession: AuthSessionSnapshot
) => {
  if (!replaceAuthSessionTokenIfCurrent(expectedSession, result.token)) {
    return false
  }
  clearAllRequestCache()

  const userInfo = result.userInfo
    ? {
        ...result.userInfo,
        roles: normalizeRoles(result.userInfo.roles, result.roles, result.userInfo, result),
        permissions: normalizePermissions(result.userInfo.permissions, result.permissions, result.userInfo, result)
      }
    : null

  if (userInfo) {
    storage.set(STORAGE_KEYS.userInfo, userInfo)
    storage.set(STORAGE_KEYS.roles, userInfo.roles)
    storage.set(STORAGE_KEYS.permissions, userInfo.permissions || [])
  } else {
    storage.remove(STORAGE_KEYS.userInfo)
    const roles = normalizeRoles(result.roles, result)
    const permissions = normalizePermissions(result.permissions, result)
    if (roles.length > 0 || permissions.length > 0) {
      storage.set(STORAGE_KEYS.roles, roles)
      storage.set(STORAGE_KEYS.permissions, permissions)
    } else {
      storage.remove(STORAGE_KEYS.userInfo)
      storage.remove(STORAGE_KEYS.roles)
      storage.remove(STORAGE_KEYS.permissions)
    }
  }
  return true
}

const responseContentType = (response: AxiosResponse) => {
  const headers = response.headers
  if (typeof headers?.get === 'function') {
    return String(headers.get('Content-Type') || '')
  }
  const entry = Object.entries(headers || {}).find(([name]) =>
    name.toLowerCase() === 'content-type')
  return String(entry?.[1] || '')
}

const parseBlobErrorEnvelope = async (response: AxiosResponse): Promise<ApiResult | null> => {
  if (!(response.data instanceof Blob)) return null

  const contentType = responseContentType(response) || response.data.type
  if (!contentType.toLowerCase().includes('json')) return null

  try {
    const payload = JSON.parse(await response.data.text()) as ApiResult
    if (
      payload
      && typeof payload === 'object'
      && typeof payload.code === 'number'
      && payload.code !== HTTP_STATUS_CODE.SUCCESS
    ) {
      return payload
    }
  } catch {
    // A malformed JSON blob remains a normal file response.
  }
  return null
}

const refreshClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

let refreshState: RefreshState | null = null

const refreshToken = async () => {
  const session = captureAuthSession()

  if (
    !refreshState
    || refreshState.generation !== session.generation
    || refreshState.sessionId !== session.sessionId
    || refreshState.token !== session.token
  ) {
    let state: RefreshState
    const promise = refreshClient
      .post<ApiResult<LoginVO>>('/auth/refresh-token', null, {
        headers: session.token
          ? { Authorization: `Bearer ${session.token}` }
          : undefined
      })
      .then((response) => {
        if (!isAuthSessionCurrent(session)) {
          throw createStaleAuthSessionError()
        }
        const result = response.data
        if (result.code !== HTTP_STATUS_CODE.SUCCESS || !result.data?.token) {
          throw createApiCodeError(result.message || '登录状态刷新失败，请重新登录。', result.code)
        }
        if (!persistRefreshResult(result.data, session)) {
          throw createStaleAuthSessionError()
        }
        emitAuthRefreshed(result.data)
        return result.data.token
      })
      .catch((error) => {
        if (
          !isStaleAuthSessionError(error)
          && isRefreshAuthFailure(error)
          && isAuthSessionCurrent(session)
        ) {
          handleTokenExpired(session)
        }
        throw error
      })
      .finally(() => {
        if (refreshState === state) {
          refreshState = null
        }
      })
    state = {
      generation: session.generation,
      sessionId: session.sessionId,
      token: session.token,
      promise
    }
    refreshState = state
  }

  return refreshState.promise
}

export const refreshAccessToken = () => refreshToken()

const retryAfterRefresh = async (config?: RetryableRequestConfig) => {
  const currentSession = captureAuthSession()
  if (!isRequestAuthSessionCurrent(config)) {
    return Promise.reject(createStaleAuthSessionError())
  }

  if (!config || config._retry) {
    handleTokenExpired(currentSession)
    return Promise.reject(createApiCodeError('登录状态已失效，请重新登录。', HTTP_STATUS_CODE.TOKEN_INVALID))
  }

  config._retry = true

  try {
    const token = await refreshToken()
    const refreshedSession = captureAuthSession()
    config.headers.Authorization = `Bearer ${token}`
    config._authSessionBound = true
    config._authSessionGeneration = refreshedSession.generation
    config._authSessionId = refreshedSession.sessionId
    return request(config)
  } catch (error) {
    return Promise.reject(error)
  }
}

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isDemoReadOnlyWrite(config)) {
    const message = '当前为体验模式，暂不保存本次更改。'
    emitLocalBlockDiagnostic(config, message)
    showUserMessage.warning(message, { throttleMs: 2500 })
    return Promise.reject(createLocalBlockedError(message, config))
  }

  if (isAdminMobileReadOnlyWrite(config)) {
    const message = ADMIN_MOBILE_READONLY_BLOCK_MESSAGE
    emitLocalBlockDiagnostic(config, message)
    showUserMessage.warning(message, { groupingKey: 'admin-mobile-readonly', throttleMs: 2500 })
    return Promise.reject(createLocalBlockedError(message, config))
  }

  const session = captureAuthSession()
  config._authSessionBound = Boolean(session.token)
  config._authSessionGeneration = session.generation
  config._authSessionId = session.sessionId

  if (session.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }

  return config
})

const unwrapResponse = async (response: AxiosResponse<ApiResult>) => {
    const config = response.config as RetryableRequestConfig
    if (!isRequestAuthSessionCurrent(config)) {
      return Promise.reject(createStaleAuthSessionError())
    }

    const blobErrorEnvelope = await parseBlobErrorEnvelope(response)
    const result = sanitizeAdminResponseData(
      blobErrorEnvelope || response.data,
      config
    ) as ApiResult
    const silentError = config.silentError

    if (!result || typeof result.code !== 'number') {
      if (config.preserveEnvelope) {
        return Promise.reject(new Error(
          'preserveEnvelope requires a Result response envelope'
        ))
      }
      return result
    }

    if (result.code === HTTP_STATUS_CODE.SUCCESS) {
      if (config.preserveEnvelope) {
        return {
          ...result,
          traceId: responseTraceId(result.traceId, response)
        }
      }
      return result.data
    }

    if (
      result.code === HTTP_STATUS_CODE.UNAUTHENTICATED ||
      result.code === HTTP_STATUS_CODE.TOKEN_INVALID
    ) {
      if (shouldAttemptTokenRefresh(config)) {
        return retryAfterRefresh(config)
      }
      if (!silentError) {
        emitResponseDiagnostic(config, {
          code: result.code,
          message: result.message,
          traceId: responseTraceId(result.traceId, response)
        })
        showUserMessage.error(toFriendlyMessage(result.message, '登录失败，请检查账号信息后重试。'))
      }
      return Promise.reject(result)
    }

    if (result.code === HTTP_STATUS_CODE.FORBIDDEN) {
      if (!silentError) {
        emitResponseDiagnostic(response.config as InternalAxiosRequestConfig, {
          code: result.code,
          message: result.message,
          traceId: responseTraceId(result.traceId, response)
        })
      }
      if (!silentError) {
        showUserMessage.error(toFriendlyMessage(result.message, '当前账号无权执行该操作，操作未提交。'))
      }
      return Promise.reject(result)
    }

    if (!silentError) {
      emitResponseDiagnostic(response.config as InternalAxiosRequestConfig, {
        code: result.code,
        message: result.message,
        traceId: responseTraceId(result.traceId, response)
      })
      showUserMessage.error(toFriendlyMessage(result.message, '请求失败，请稍后重试'))
    }
    return Promise.reject(result)
}

const handleResponseError = async (error: AxiosError<RequestErrorPayload | Blob>) => {
    if ((error as ApiCodeError).localBlocked) {
      return Promise.reject(error)
    }

    const config = error.config as RetryableRequestConfig | undefined
    if (!isRequestAuthSessionCurrent(config)) {
      return Promise.reject(createStaleAuthSessionError())
    }

    const decodedBlobPayload = error.response
      ? await parseBlobErrorEnvelope(error.response)
      : null
    const responsePayload = sanitizeAdminResponseData(
      decodedBlobPayload || (
        error.response?.data instanceof Blob
          ? undefined
          : error.response?.data
      ),
      config
    ) as RequestErrorPayload | undefined

    // HTTP 层面的 401（非业务 code）
    if (error.response?.status === 401) {
      if (shouldAttemptTokenRefresh(config)) {
        return retryAfterRefresh(config)
      }
      const message = toFriendlyMessage(
        responsePayload?.message || error.message,
        '登录失败，请检查账号信息后重试。'
      )
      if (!config?.silentError) {
        emitResponseDiagnostic(config, {
          status: error.response.status,
          code: responsePayload?.code || HTTP_STATUS_CODE.UNAUTHENTICATED,
          message,
          traceId: responseTraceId(responsePayload?.traceId, error.response)
        })
        showUserMessage.error(message)
      }
      return Promise.reject(responsePayload || error)
    }

    const silentError = config?.silentError

    if (error.response?.status === 403) {
      const message = toFriendlyMessage(
        responsePayload?.message || error.message,
        '当前账号无权执行该操作，操作未提交。'
      )
      if (!silentError) {
        emitResponseDiagnostic(config, {
          status: error.response.status,
          code: responsePayload?.code || HTTP_STATUS_CODE.FORBIDDEN,
          message,
          traceId: responseTraceId(responsePayload?.traceId, error.response)
        })
        showUserMessage.error(message)
      }
      return Promise.reject(responsePayload || error)
    }

    const message = toFriendlyMessage(
      responsePayload?.message || error.message,
      '\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
    )
    if (!silentError) {
      emitResponseDiagnostic(config, {
        status: error.response?.status,
        code: responsePayload?.code,
        message,
        traceId: responseTraceId(responsePayload?.traceId, error.response)
      })
      showUserMessage.error(message)
    }
    return Promise.reject(decodedBlobPayload || error)
}

interface UnwrappedResponseInterceptor {
  use(
    onFulfilled: (response: AxiosResponse<ApiResult>) => unknown,
    onRejected: (error: AxiosError<RequestErrorPayload | Blob>) => unknown
  ): number
}

const responseInterceptor = request.interceptors.response as unknown as
  UnwrappedResponseInterceptor
responseInterceptor.use(unwrapResponse, handleResponseError)

export const requestWithMeta = <TResponse, TRequest = unknown>(
  config: AxiosRequestConfig<TRequest>
): Promise<ApiResponseEnvelope<TResponse>> =>
  request.request<ApiResult<TResponse>, ApiResponseEnvelope<TResponse>, TRequest>({
    ...config,
    preserveEnvelope: true
  })

export default request
