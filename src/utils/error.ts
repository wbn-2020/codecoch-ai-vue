import { ElMessage } from 'element-plus'

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const payload = error as {
      message?: unknown
      response?: {
        data?: {
          message?: unknown
          msg?: unknown
        }
      }
    }

    const responseMessage = payload.response?.data?.message || payload.response?.data?.msg
    if (typeof responseMessage === 'string' && responseMessage.trim()) {
      return responseMessage
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }
  }

  return fallback
}

export const showErrorMessage = (message?: string): void => {
  ElMessage.error(message || '请求失败，请稍后重试')
}
