import { describe, expect, it } from 'vitest'

import { formatDateInTimezone } from '@/utils/format'

describe('formatDateInTimezone', () => {
  it('formats the business date in China Standard Time across a UTC boundary', () => {
    const lateNightUtc = new Date('2026-08-06T16:30:00.000Z')

    expect(formatDateInTimezone(lateNightUtc, 'Asia/Shanghai')).toBe('2026-08-07')
  })

  it('falls back to the local date when the timezone is invalid', () => {
    const value = new Date(2026, 7, 7, 12, 0, 0)

    expect(formatDateInTimezone(value, 'Invalid/Timezone')).toBe('2026-08-07')
  })
})
