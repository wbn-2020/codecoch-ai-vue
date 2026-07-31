import { describe, expect, it } from 'vitest'

import type { NotificationVO } from '@/api/notification'
import { resolveNotificationAction } from '@/features/notifications'

const notification = (item: Partial<NotificationVO>): NotificationVO => ({
  id: 1,
  title: '通知',
  type: 'SYSTEM',
  isRead: 0,
  createdAt: '2026-07-18 09:00:00',
  ...item
})

describe('notification action safety', () => {
  it('rejects unknown local actionUrl and falls back to a registered business route', () => {
    const result = resolveNotificationAction(notification({
      type: 'AGENT_REMINDER',
      bizType: 'AGENT_TASK',
      bizId: 'run-42',
      actionUrl: '/agent/unregistered-route?bizId=run-42',
      fallbackPath: '/agent/today'
    }), { enableV4Preview: true })

    expect(result).toMatchObject({
      kind: 'route',
      path: '/agent/tasks?bizType=agent.daily-plan.generate&bizId=run-42',
      actionPath: '/agent/tasks?bizType=agent.daily-plan.generate&bizId=run-42',
      source: 'biz',
      unavailableReason: '通知目标路径不存在或未开放。'
    })
    expect(result.path).not.toBe('/agent/unregistered-route?bizId=run-42')
    expect(result.blockedPath).toBeUndefined()
  })

  it('keeps external actionUrl blocked and uses the safe fallback route', () => {
    const result = resolveNotificationAction(notification({
      type: 'SYSTEM',
      actionUrl: 'https://example.com/phishing',
      fallbackPath: '/dashboard'
    }), { enableV4Preview: true })

    expect(result).toMatchObject({
      kind: 'route',
      path: '/dashboard',
      source: 'fallback',
      blockedPath: 'https://example.com/phishing'
    })
    expect(result.unavailableReason).toContain('actionUrl')
  })
})
