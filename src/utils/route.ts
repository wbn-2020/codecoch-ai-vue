import type { LocationQueryValue } from 'vue-router'

export const getRouteNumberParam = (value: string | string[] | undefined): number | null => {
  const rawValue = Array.isArray(value) ? value[0] : value
  const numberValue = Number(rawValue)
  return Number.isFinite(numberValue) ? numberValue : null
}

export const getRouteStringQuery = (
  value: LocationQueryValue | LocationQueryValue[] | undefined,
  fallback = ''
) => {
  if (Array.isArray(value)) {
    return value[0] || fallback
  }

  return value || fallback
}
