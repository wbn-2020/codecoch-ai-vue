import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import { appConfig } from '@/config'
import { clearAllRequestCache } from '@/composables/useRequestCache'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ApiResult, RequestErrorPayload } from '@/types/api'
import type { LoginVO } from '@/types/auth'
import {
  ADMIN_MOBILE_READONLY_BLOCK_MESSAGE,
  isAdminMobileReadonlyViewport
} from '@/utils/adminMobileReadonly'
import { emitAuthRefreshed } from '@/utils/authEvents'
import { emitRequestError } from '@/utils/errorEvents'
import { toFriendlyMessage } from '@/utils/error'
import { clearLocalAuth, getToken, setToken } from '@/utils/token'
import { storage } from '@/utils/storage'

declare module 'axios' {
  export interface AxiosRequestConfig {
    silentError?: boolean
  }

  export interface InternalAxiosRequestConfig {
    silentError?: boolean
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface ApiCodeError extends Error {
  code?: number
  config?: InternalAxiosRequestConfig
  localBlocked?: boolean
}

const DEMO_READ_ONLY_ALLOW_METHODS = new Set(['get', 'head', 'options'])
const DEMO_READ_ONLY_WRITE_WHITELIST = [
  '/auth/login',
  '/auth/refresh-token'
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

const handleTokenExpired = () => {
  clearLocalAuth()
  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
  }
}

const getErrorCode = (error: unknown) => {
  const code = (error as { code?: number })?.code
  if (typeof code === 'number') return code
  const responseCode = (error as AxiosError<RequestErrorPayload>)?.response?.data?.code
  return typeof responseCode === 'number' ? responseCode : undefined
}

const isAuthFailureCode = (code?: number) =>
  code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID

const createApiCodeError = (message: string, code?: number) => {
  const error = new Error(message) as ApiCodeError
  error.code = code
  return error
}

const createLocalBlockedError = (message: string, config: InternalAxiosRequestConfig) => {
  const error = createApiCodeError(message, HTTP_STATUS_CODE.FORBIDDEN)
  error.config = config
  error.localBlocked = true
  return error
}

const isDemoReadOnlyWrite = (config: InternalAxiosRequestConfig) => {
  if (!appConfig.demoReadOnly) return false
  const method = String(config.method || 'get').toLowerCase()
  if (DEMO_READ_ONLY_ALLOW_METHODS.has(method)) return false
  const url = String(config.url || '')
  return !DEMO_READ_ONLY_WRITE_WHITELIST.some((path) => url.includes(path))
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
    url: config?.url,
    status: payload.status,
    code: payload.code,
    message: toFriendlyMessage(payload.message, '请求失败，请稍后重试。'),
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

const persistRefreshResult = (result: LoginVO) => {
  setToken(result.token)
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
}

const refreshClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

let refreshingToken: Promise<string> | null = null

const refreshToken = async () => {
  if (!refreshingToken) {
    refreshingToken = refreshClient
      .post<ApiResult<LoginVO>>('/auth/refresh-token', null, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      })
      .then((response) => {
        const result = response.data
        if (result.code !== HTTP_STATUS_CODE.SUCCESS || !result.data?.token) {
          throw createApiCodeError(result.message || '登录状态刷新失败，请重新登录。', result.code)
        }
        persistRefreshResult(result.data)
        emitAuthRefreshed(result.data)
        return result.data.token
      })
      .finally(() => {
        refreshingToken = null
      })
  }

  return refreshingToken
}

const retryAfterRefresh = async (config?: RetryableRequestConfig) => {
  if (!config || config._retry) {
    handleTokenExpired()
    return Promise.reject(createApiCodeError('登录状态已失效，请重新登录。', HTTP_STATUS_CODE.TOKEN_INVALID))
  }

  config._retry = true

  try {
    const token = await refreshToken()
    config.headers.Authorization = `Bearer ${token}`
    return request(config)
  } catch (error) {
    if (isAuthFailureCode(getErrorCode(error))) {
      handleTokenExpired()
    }
    return Promise.reject(error)
  }
}

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (isDemoReadOnlyWrite(config)) {
    const message = '当前为体验模式，暂不保存本次更改。'
    emitLocalBlockDiagnostic(config, message)
    ElMessage.warning(message)
    return Promise.reject(createLocalBlockedError(message, config))
  }

  if (isAdminMobileReadOnlyWrite(config)) {
    const message = ADMIN_MOBILE_READONLY_BLOCK_MESSAGE
    emitLocalBlockDiagnostic(config, message)
    ElMessage.warning(message)
    return Promise.reject(createLocalBlockedError(message, config))
  }

  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

const unwrapResponse = async (response: AxiosResponse<ApiResult>) => {
    const result = response.data as ApiResult
    const silentError = (response.config as RetryableRequestConfig).silentError

    if (!result || typeof result.code !== 'number') {
      return response.data
    }

    if (result.code === HTTP_STATUS_CODE.SUCCESS) {
      return result.data
    }

    if (
      result.code === HTTP_STATUS_CODE.UNAUTHENTICATED ||
      result.code === HTTP_STATUS_CODE.TOKEN_INVALID
    ) {
      return retryAfterRefresh(response.config as RetryableRequestConfig)
    }

    if (result.code === HTTP_STATUS_CODE.FORBIDDEN) {
      if (!silentError) {
        emitResponseDiagnostic(response.config as InternalAxiosRequestConfig, {
          code: result.code,
          message: result.message,
          traceId: result.traceId
        })
      }
      if (!silentError) {
        ElMessage.error(toFriendlyMessage(result.message, '当前账号无权执行该操作，操作未提交。'))
      }
      return Promise.reject(result)
    }

    if (!silentError) {
      emitResponseDiagnostic(response.config as InternalAxiosRequestConfig, {
        code: result.code,
        message: result.message,
        traceId: result.traceId
      })
      ElMessage.error(toFriendlyMessage(result.message, '请求失败，请稍后重试'))
    }
    return Promise.reject(result)
}

request.interceptors.response.use(
  unwrapResponse as never,
  (error: AxiosError<RequestErrorPayload>) => {
    if ((error as ApiCodeError).localBlocked) {
      return Promise.reject(error)
    }

    // HTTP 层面的 401（非业务 code）
    if (error.response?.status === 401) {
      return retryAfterRefresh(error.config as RetryableRequestConfig | undefined)
    }

    const silentError = (error.config as RetryableRequestConfig | undefined)?.silentError
    const message = toFriendlyMessage(
      error.response?.data?.message || error.message,
      '\u7f51\u7edc\u5f02\u5e38\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
    )
    if (!silentError) {
      emitResponseDiagnostic(error.config as InternalAxiosRequestConfig | undefined, {
        status: error.response?.status,
        code: error.response?.data?.code,
        message,
        traceId: error.response?.data?.traceId
      })
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default request
