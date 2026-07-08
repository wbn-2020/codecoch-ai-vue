import { HTTP_STATUS_CODE } from '@/constants/http'
import { getErrorMessage } from '@/utils/error'

type ApiErrorLike = {
  status?: number
  code?: number
  message?: unknown
  response?: {
    status?: number
    data?: {
      code?: number
      message?: unknown
      msg?: unknown
    }
  }
}

const numeric = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

export const getHttpStatus = (error: unknown): number | undefined => {
  const value = error as ApiErrorLike
  const status = numeric(value?.response?.status) ?? numeric(value?.status)
  return status && status >= 100 && status <= 599 ? status : undefined
}

export const getBusinessCode = (error: unknown): number | undefined => {
  const value = error as ApiErrorLike
  return numeric(value?.response?.data?.code) ?? numeric(value?.code)
}

export const isAuthOrForbiddenError = (error: unknown) => {
  const status = getHttpStatus(error)
  if (status === 401 || status === 403) return true
  const code = getBusinessCode(error)
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED
    || code === HTTP_STATUS_CODE.TOKEN_INVALID
    || code === HTTP_STATUS_CODE.FORBIDDEN
}

export const isBackendUnavailableForFallback = (error: unknown) => {
  if (isAuthOrForbiddenError(error)) return false
  const status = getHttpStatus(error)
  if (status) return status === 404 || status === 501 || status === 503 || status >= 500
  const code = getBusinessCode(error)
  if (code) return code >= 50000
  return true
}

export const getApiErrorMessage = getErrorMessage
