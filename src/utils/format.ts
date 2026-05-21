import type { SelectOption } from '@/types/common'

export const formatDateTime = (value?: string | null): string => value || '-'

const padDatePart = (value: number): string => String(value).padStart(2, '0')

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
