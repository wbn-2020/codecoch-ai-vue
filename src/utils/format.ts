import type { SelectOption } from '@/types/common'

const padDatePart = (value: number): string => String(value).padStart(2, '0')

export const formatDateTime = (value?: string | number | null): string => {
  if (!value) return '-'

  const normalized = String(value).trim()
  const localDateTime = normalized.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}:\d{2})/)
  if (localDateTime) {
    return `${localDateTime[1]} ${localDateTime[2]}`
  }

  const date = new Date(normalized)
  if (!Number.isNaN(date.getTime())) {
    return formatLocalDateTime(date)
  }

  return normalized
    .replace('T', ' ')
    .replace(/\.\d+(?=Z|[+-]\d{2}:?\d{2}$|$)/, '')
    .replace(/([+-]\d{2}:?\d{2}|Z)$/, '')
}

export const notificationTypeLabels: Record<string, string> = {
  SYSTEM: '系统通知',
  ANNOUNCEMENT: '系统公告',
  REPORT_DONE: '报告完成',
  TASK_DONE: '任务完成',
  TASK_FAILED: '任务失败',
  TASK_REMIND: '任务提醒',
  PLAN_READY: '计划已生成',
  PARSE_DONE: '解析完成',
  REVIEW_RESULT: '审核结果',
  SECURITY: '安全提醒',
  AI_REVIEW: 'AI 审核',
  STUDY_PLAN: '学习计划'
}

export const formatNotificationType = (type?: string | null): string => {
  if (!type) return '通知'
  return notificationTypeLabels[type] || type
}

export const formatLocalDate = (value: Date = new Date()): string => {
  const year = value.getFullYear()
  const month = padDatePart(value.getMonth() + 1)
  const day = padDatePart(value.getDate())
  return `${year}-${month}-${day}`
}

export const formatLocalDateTime = (value: Date = new Date()): string => {
  const hours = padDatePart(value.getHours())
  const minutes = padDatePart(value.getMinutes())
  const seconds = padDatePart(value.getSeconds())
  return `${formatLocalDate(value)} ${hours}:${minutes}:${seconds}`
}

export const formatBoolean = (value?: boolean | number | null): string => {
  if (value === true || value === 1) return '是'
  if (value === false || value === 0) return '否'
  return '-'
}

export const getOptionLabel = (options: SelectOption[], value?: string | number | null): string => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  return options.find((option) => option.value === value)?.label || String(value)
}

export const getStatusType = (status?: number) => (status === 1 ? 'success' : 'info')

export const getFallbackArray = <T>(value: T[] | undefined | null): T[] => {
  return Array.isArray(value) ? value : []
}
