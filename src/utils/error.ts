import { ElMessage } from 'element-plus'

export const getErrorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  return fallback
}

export const showErrorMessage = (message?: string): void => {
  ElMessage.error(message || '请求失败，请稍后重试')
}
