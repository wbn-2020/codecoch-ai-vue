import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import type { ApiResult, RequestErrorPayload } from '@/types/api'
import { clearLocalAuth, getToken } from '@/utils/token'

const request = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: appConfig.requestTimeout
})

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
      clearLocalAuth()
      if (window.location.pathname !== '/login') {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?redirect=${redirect}`
      }
      return Promise.reject(result)
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
    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default request
