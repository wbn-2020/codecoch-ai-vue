/**
 * 求职日历/导入共用的时区取值。
 * 取浏览器本地时区，取不到时回退到 Asia/Shanghai，保证导出 ICS / 导入解析始终带一个有效时区。
 */
export const resolveBrowserTimezone = (): string =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'

export const normalizeCalendarTimezone = (
  timezone?: string | null,
  fallback = resolveBrowserTimezone()
) => {
  const candidate = String(timezone || '').trim()
  if (!candidate) return fallback
  try {
    new Intl.DateTimeFormat('zh-CN', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return fallback
  }
}

export const formatCalendarEventLocalTime = (
  value?: string | null,
  timezone?: string | null
) => {
  const text = String(value || '').trim()
  if (!text) return '--'
  const zone = normalizeCalendarTimezone(timezone)
  const localMatch = text.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/)
  if (localMatch && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    return `${localMatch[1]} ${localMatch[2]} · ${zone}`
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return `${text.replace('T', ' ')} · ${zone}`
  }
  return `${new Intl.DateTimeFormat('zh-CN', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)} · ${zone}`
}

export const useCalendarTimezone = () => {
  const timezone = resolveBrowserTimezone()
  return {
    timezone,
    formatEventTime: (value?: string | null, sourceTimezone?: string | null) =>
      formatCalendarEventLocalTime(value, sourceTimezone || timezone)
  }
}
