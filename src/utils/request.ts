import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { STORAGE_KEYS } from '@/constants/storage'
import type { ApiResult, RequestErrorPayload } from '@/types/api'
import type { LoginVO } from '@/types/auth'
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
}

const DEMO_READ_ONLY_ALLOW_METHODS = new Set(['get', 'head', 'options'])
const DEMO_READ_ONLY_WRITE_WHITELIST = [
  '/auth/login',
  '/auth/refresh-token'
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

const isDemoReadOnlyWrite = (config: InternalAxiosRequestConfig) => {
  if (!appConfig.demoReadOnly) return false
  const method = String(config.method || 'get').toLowerCase()
  if (DEMO_READ_ONLY_ALLOW_METHODS.has(method)) return false
  const url = String(config.url || '')
  return !DEMO_READ_ONLY_WRITE_WHITELIST.some((path) => url.includes(path))
}

const normalizeAuthArray = <T>(items?: T[]): T[] => Array.from(new Set(items || []))

const persistRefreshResult = (result: LoginVO) => {
  setToken(result.token)

  const userInfo = result.userInfo
    ? {
        ...result.userInfo,
        roles: normalizeAuthArray(result.userInfo.roles?.length ? result.userInfo.roles : result.roles),
        permissions: normalizeAuthArray(
          result.userInfo.permissions?.length ? result.userInfo.permissions : result.permissions
        )
      }
    : null

  if (userInfo) {
    storage.set(STORAGE_KEYS.userInfo, userInfo)
    storage.set(STORAGE_KEYS.roles, userInfo.roles)
    storage.set(STORAGE_KEYS.permissions, userInfo.permissions || [])
  } else {
    storage.set(STORAGE_KEYS.roles, normalizeAuthArray(result.roles))
    storage.set(STORAGE_KEYS.permissions, normalizeAuthArray(result.permissions))
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
          throw createApiCodeError(result.message || 'refresh token failed', result.code)
        }
        persistRefreshResult(result.data)
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
    return Promise.reject(createApiCodeError('Token expired', HTTP_STATUS_CODE.TOKEN_INVALID))
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
    const message = '演示只读模式已开启，写入操作不会提交。'
    ElMessage.warning(message)
    return Promise.reject(createApiCodeError(message, HTTP_STATUS_CODE.FORBIDDEN))
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
        ElMessage.error(toFriendlyMessage(result.message, '当前账号无权执行该操作，操作未提交。'))
      }
      return Promise.reject(result)
    }

    if (!silentError) {
      ElMessage.error(toFriendlyMessage(result.message, '请求失败，请稍后重试'))
    }
    return Promise.reject(result)
}

request.interceptors.response.use(
  unwrapResponse as never,
  (error: AxiosError<RequestErrorPayload>) => {
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
      ElMessage.error(message)
    }
    return Promise.reject(error)
  }
)

export default request
