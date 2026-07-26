import { describe, expect, it } from 'vitest'

import type { NotificationVO } from '@/api/notification'

import {
  getNotificationActionLabel,
  getNotificationDisplay,
  getNotificationPriority,
  isActionableNotification,
  isResolvedNotification,
  normalizeNotificationType,
  resolveNotificationAction,
  toNotificationTodayAction
} from './notifications'

const notice = (item: Partial<NotificationVO>): NotificationVO => ({
  id: 1,
  title: 'Reminder',
  type: 'SYSTEM',
  isRead: 0,
  createdAt: '2026-06-30 10:00:00',
  ...item
})

describe('notification domain helpers', () => {
  it('uses Agent actionUrl before biz and fallback routes', () => {
    const result = resolveNotificationAction(
      notice({
        type: 'AGENT_REMINDER',
        bizType: 'AGENT_RUN',
        bizId: 99,
        actionUrl: '/agent/today?from=reminder',
        fallbackPath: '/dashboard'
      }),
      { enableV4Preview: true }
    )

    expect(result).toMatchObject({
      kind: 'route',
      path: '/agent/today?from=reminder',
      source: 'actionUrl',
      actionable: true
    })
    expect(getNotificationActionLabel(notice({ type: 'AGENT_REMINDER' }))).toBe('进入今日任务')
    expect(isActionableNotification(notice({ type: 'AGENT_REMINDER' }))).toBe(true)
  })

  it('maps application follow-up notifications to the V4 workbench when preview is open', () => {
    const item = notice({
      type: 'APPLICATION_FOLLOW_UP_REMINDER',
      bizType: 'JOB_APPLICATION',
      bizId: 12
    })

    expect(normalizeNotificationType(item).category).toBe('application-follow-up')
    expect(getNotificationPriority(item)).toBe('urgent')
    expect(resolveNotificationAction(item, { enableV4Preview: true })).toMatchObject({
      kind: 'route',
      path: '/applications?applicationId=12',
      source: 'biz',
      actionable: true
    })
  })

  it('maps interview report history notifications without temporary action fields', () => {
    const result = resolveNotificationAction(
      notice({
        type: 'REPORT_DONE',
        relatedType: 'INTERVIEW_REPORT',
        relatedId: 88
      }),
      { enableV4Preview: true }
    )

    expect(result).toMatchObject({
      kind: 'route',
      path: '/interviews/88/report',
      source: 'biz'
    })
    expect(getNotificationActionLabel(notice({ type: 'REPORT_DONE' }))).toBe('查看面试报告')
  })

  it('rejects invalid actionUrl and still uses a safe fallback path', () => {
    const result = resolveNotificationAction(
      notice({
        type: 'SYSTEM',
        actionUrl: 'https://example.com/phishing',
        fallbackPath: '/dashboard'
      }),
      { enableV4Preview: true }
    )

    expect(result).toMatchObject({
      kind: 'route',
      path: '/dashboard',
      source: 'fallback'
    })
    expect(result.unavailableReason).toContain('actionUrl')
  })

  it('uses fallbackPath after biz mapping cannot resolve a target', () => {
    const result = resolveNotificationAction(
      notice({
        type: 'CUSTOM_NOTICE',
        bizType: 'UNKNOWN_BIZ',
        bizId: 7,
        fallbackPath: '/questions/practice'
      }),
      { enableV4Preview: true }
    )

    expect(result).toMatchObject({
      kind: 'route',
      path: '/questions/practice',
      source: 'fallback'
    })
  })

  it('falls back from V4 preview paths when preview is closed', () => {
    const application = resolveNotificationAction(
      notice({
        type: 'APPLICATION_FOLLOW_UP_REMINDER',
        actionUrl: '/knowledge?tab=docs',
        fallbackPath: '/knowledge'
      }),
      { enableV4Preview: false }
    )

    expect(application).toMatchObject({
      kind: 'route',
      path: '/agent/today',
      source: 'actionUrl'
    })
    expect(application.unavailableReason).toContain('V4')

    const resumeVersion = resolveNotificationAction(
      notice({
        type: 'SYSTEM',
        actionUrl: '/resume-versions'
      }),
      { enableV4Preview: false, previewFallbackPath: '/dashboard' }
    )

    expect(resumeVersion).toMatchObject({
      kind: 'route',
      path: '/dashboard',
      source: 'actionUrl'
    })
  })

  it('keeps old relatedType notifications actionable through historical mappings', () => {
    const result = resolveNotificationAction(
      notice({
        type: 'RESUME_MATCH',
        relatedType: 'RESUME_MATCH',
        relatedId: 30
      }),
      { enableV4Preview: true }
    )

    expect(result).toMatchObject({
      kind: 'route',
      path: '/resume-match/30',
      source: 'biz'
    })
  })

  it('builds display metadata and today action items from pure notification data', () => {
    const item = notice({
      type: 'INTERVIEW_REPORT_READY',
      bizType: 'INTERVIEW_REPORT',
      bizId: 9,
      title: 'Report ready',
      content: 'Open the report'
    })

    expect(getNotificationDisplay(item)).toMatchObject({
      category: 'interview-report',
      label: '面试报告',
      actionLabel: '查看面试报告',
      priority: 'high'
    })
    expect(toNotificationTodayAction(item, { enableV4Preview: true })).toMatchObject({
      source: 'notification',
      title: 'Report ready',
      actionPath: '/interviews/9/report'
    })
  })

  it('recognizes resolved notifications and keeps them out of today actions', () => {
    const item = notice({
      type: 'APPLICATION_FOLLOW_UP_REMINDER',
      bizType: 'JOB_APPLICATION',
      bizId: 12,
      resolvedStatus: 1,
      resolvedReason: 'JOB_APPLICATION_EVENT:88'
    })

    expect(isResolvedNotification(item)).toBe(true)
    expect(resolveNotificationAction(item, { enableV4Preview: true })).toMatchObject({
      kind: 'route',
      path: '/applications?applicationId=12'
    })
    expect(toNotificationTodayAction(item, { enableV4Preview: true })).toBeNull()
  })

  it('does not count resolved notifications as display-actionable', () => {
    const item = notice({
      type: 'APPLICATION_FOLLOW_UP_REMINDER',
      bizType: 'JOB_APPLICATION',
      bizId: 12,
      resolvedStatus: 'RESOLVED'
    })

    expect(getNotificationDisplay(item, { enableV4Preview: true }).actionable).toBe(false)
    expect(isActionableNotification(item, { enableV4Preview: true })).toBe(false)
  })
})
