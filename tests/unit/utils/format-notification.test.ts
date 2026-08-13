import { describe, expect, it } from 'vitest'

import { formatNotificationType } from '@/utils/format'

describe('formatNotificationType', () => {
  it('maps known notification types to business labels', () => {
    expect(formatNotificationType('REPORT_DONE')).toBe('报告完成')
  })

  it('does not expose unknown internal notification enums', () => {
    expect(formatNotificationType('APPLICATION_FOLLOW_UP_REMINDER')).toBe('投递跟进提醒')
    expect(formatNotificationType('future.internal.event')).toBe('系统通知')
  })
})
