import { describe, expect, it } from 'vitest'

import type { NotificationVO } from '@/api/notification'
import { normalizeNotificationType, resolveNotificationAction } from '@/features/notifications'
import { defaultUserKnownPaths } from '@/features/route-safety'
import { buildTodayActions } from '@/features/today-actions'
import { routes } from '@/router/routes'
import { resolveBrowserTimezone } from '@/composables/useCalendarTimezone'

const calendarNotification = (): NotificationVO => ({
  id: 71,
  type: 'CALENDAR_REMINDER',
  bizType: 'CAREER_CALENDAR_EVENT',
  bizId: '501',
  title: '明天的求职日程',
  content: '面试 · 后端一面（07-19 14:00）即将开始',
  actionUrl: '/career-calendar',
  fallbackPath: '/career-calendar',
  fallbackLabel: '打开求职日历',
  planDate: '2026-07-19',
  isRead: 0,
  createdAt: '2026-07-18 09:00:00'
})

describe('求职日历独立入口', () => {
  it('注册无预览开关的独立路由，并加入安全路径白名单', () => {
    const userRoot = routes.find((route) => route.path === '/')
    const route = userRoot?.children?.find((item) => item.path === 'career-calendar')

    expect(route?.name).toBe('CareerCalendar')
    expect(route?.meta?.title).toBe('求职日历')
    expect(route?.meta?.previewOnly).not.toBe(true)
    expect(route?.meta?.featureFlag).toBeUndefined()
    expect(defaultUserKnownPaths).toContain('/career-calendar')
  })

  it('把日历提醒展示为高优先级可行动通知并跳转到独立页面', () => {
    const notification = calendarNotification()

    expect(normalizeNotificationType(notification)).toMatchObject({
      category: 'calendar',
      label: '求职日历'
    })
    expect(resolveNotificationAction(notification)).toMatchObject({
      kind: 'route',
      path: '/career-calendar',
      label: '打开求职日历',
      priority: 'high'
    })

    expect(buildTodayActions({ notifications: [notification] })).toContainEqual(
      expect.objectContaining({
        source: 'notification',
        priority: 'high',
        actionLabel: '打开求职日历',
        actionPath: '/career-calendar',
        dueText: '2026-07-19'
      })
    )
  })

  it('始终提供浏览器时区或中文区默认时区', () => {
    expect(resolveBrowserTimezone()).toBeTruthy()
  })
})
