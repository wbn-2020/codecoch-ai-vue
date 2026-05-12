import type { SelectOption } from '@/types/common'

export const formatDateTime = (value?: string | null): string => value || '-'

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
