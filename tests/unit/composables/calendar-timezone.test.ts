import { describe, expect, it } from 'vitest'

import {
  formatCalendarEventLocalTime,
  normalizeCalendarTimezone
} from '@/composables/useCalendarTimezone'

describe('calendar timezone helpers', () => {
  it('keeps backend LocalDateTime values in the event timezone without applying a second offset', () => {
    expect(
      formatCalendarEventLocalTime('2026-07-20T10:00:00', 'Asia/Shanghai')
    ).toBe('2026-07-20 10:00 · Asia/Shanghai')
  })

  it('falls back from an invalid timezone', () => {
    expect(normalizeCalendarTimezone('invalid/timezone', 'Asia/Shanghai')).toBe('Asia/Shanghai')
  })
})
