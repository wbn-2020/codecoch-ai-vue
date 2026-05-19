import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import type { ApiResult, RequestErrorPayload } from '@/types/api'
import { clearLocalAuth, getToken, setToken } from '@/utils/token'

interface RefreshTokenResult {
  token?: string
}

const request = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

// ============================================================
// Token 自动续期：Promise 锁队列
// 当第一个 401 触发 refresh 时，后续并发 401 请求排队等待，
// refresh 成功后统一重放，失败则全部 reject 并跳登录页。
// ============================================================
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []
let refreshFailSubscribers: Array<(error: unknown) => void> = []

const subscribeTokenRefresh = (resolve: (token: string) => void, reject: (error: unknown) => void) => {
  refreshSubscribers.push(resolve)
  refreshFailSubscribers.push(reject)
}

const onRefreshSuccess = (newToken: string) => {
  refreshSubscribers.forEach((cb) => cb(newToken))
  refreshSubscribers = []
  refreshFailSubscribers = []
}

const onRefreshFail = (error: unknown) => {
  refreshFailSubscribers.forEach((cb) => cb(error))
  refreshSubscribers = []
  refreshFailSubscribers = []
}

const doRefreshToken = async (): Promise<string> => {
  // 使用独立 axios 实例避免被拦截器循环拦截
  const res = await axios.post(
    `${appConfig.apiBaseUrl}/auth/refresh-token`,
    null,
    {
      headers: { Authorization: `Bearer ${getToken()}` },
      timeout: 15000
    }
  )
  const result = res.data as ApiResult<RefreshTokenResult>
  if (result && result.code === HTTP_STATUS_CODE.SUCCESS && result.data?.token) {
    return result.data.token as string
  }
  throw new Error(result?.message || 'Token 刷新失败')
}

const handleTokenExpired = () => {
  clearLocalAuth()
  if (window.location.pathname !== '/login') {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
  }
}

request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

request.interceptors.response.use(
  (response) => {
    const result = response.data as ApiResult

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
      const originalConfig = response.config

      // 如果是 refresh-token 接口本身返回 401，直接跳登录
      if (originalConfig.url?.includes('/auth/refresh-token')) {
        handleTokenExpired()
        return Promise.reject(result)
      }

      // 第一个 401：发起 refresh
      if (!isRefreshing) {
        isRefreshing = true
        doRefreshToken()
          .then((newToken) => {
            setToken(newToken)
            isRefreshing = false
            onRefreshSuccess(newToken)
          })
          .catch((error) => {
            isRefreshing = false
            onRefreshFail(error)
            handleTokenExpired()
          })
      }

      // 当前请求排队等待 refresh 结果，然后重放
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (newToken: string) => {
            originalConfig.headers.Authorization = `Bearer ${newToken}`
            resolve(request(originalConfig))
          },
          (error: unknown) => {
            reject(error)
          }
        )
      })
    }

    if (result.code === HTTP_STATUS_CODE.FORBIDDEN) {
      ElMessage.error(result.message || '无访问权限')
      if (window.location.pathname !== '/403') {
        window.location.href = '/403'
      }
      return Promise.reject(result)
    }

    ElMessage.error(result.message || '请求失败，请稍后重试')
    return Promise.reject(result)
  },
  (error: AxiosError<RequestErrorPayload>) => {
    // HTTP 层面的 401（非业务 code）
    if (error.response?.status === 401) {
      const originalConfig = error.config

      if (!originalConfig || originalConfig.url?.includes('/auth/refresh-token')) {
        handleTokenExpired()
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        isRefreshing = true
        doRefreshToken()
          .then((newToken) => {
            setToken(newToken)
            isRefreshing = false
            onRefreshSuccess(newToken)
          })
          .catch((refreshError) => {
            isRefreshing = false
            onRefreshFail(refreshError)
            handleTokenExpired()
          })
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(
          (newToken: string) => {
            originalConfig.headers.Authorization = `Bearer ${newToken}`
            resolve(request(originalConfig))
          },
          (refreshError: unknown) => {
            reject(refreshError)
          }
        )
      })
    }

    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request
