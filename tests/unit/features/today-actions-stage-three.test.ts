import { describe, expect, it } from 'vitest'

import type { NotificationVO } from '@/api/notification'
import { resolveNotificationAction } from '@/features/notifications'
import { buildTodayActions } from '@/features/today-actions'

const notification = (partial: Partial<NotificationVO>): NotificationVO => ({
  id: 1,
  title: '行动提醒',
  type: 'SYSTEM',
  isRead: 0,
  createdAt: '2026-07-18 09:00:00',
  ...partial
})

describe('stage three today action integration', () => {
  it('orders calendar reminders before ordinary Agent tasks', () => {
    const actions = buildTodayActions({
      agentTasks: [{
        id: 42,
        title: '复盘今日训练',
        status: 'TODO',
        priority: 'HIGH',
        actionUrl: '/agent/today'
      }],
      notifications: [notification({
        id: 71,
        title: '今天 14:00 的后端一面',
        type: 'CALENDAR_REMINDER',
        bizType: 'CAREER_CALENDAR_EVENT',
        bizId: '501',
        actionUrl: '/career-calendar',
        fallbackPath: '/career-calendar',
        fallbackLabel: '打开求职日历',
        planDate: '2026-07-18'
      })]
    })

    expect(actions.map((item) => item.key)).toEqual([
      'notification-71',
      'agent-task-42'
    ])
    expect(actions[0]).toMatchObject({
      actionLabel: '打开求职日历',
      actionPath: '/career-calendar',
      priority: 'high'
    })
  })

  it('deduplicates one overdue application across stats, notification, and Agent task inputs', () => {
    const actions = buildTodayActions({
      applicationStats: {
        overdueFollowUpCount: 1
      },
      agentTasks: [{
        id: 42,
        title: '处理逾期投递',
        status: 'TODO',
        priority: 'HIGH',
        actionUrl: '/applications?followUp=overdue',
        relatedBizType: 'JOB_APPLICATION',
        relatedBizId: 501
      }],
      notifications: [notification({
        id: 72,
        title: '处理逾期投递',
        type: 'APPLICATION_FOLLOW_UP_REMINDER',
        bizType: 'JOB_APPLICATION',
        bizId: 501,
        actionUrl: '/applications?followUp=overdue'
      })]
    })

    expect(actions).toEqual([
      expect.objectContaining({
        key: 'application-follow-up-overdue',
        source: 'application-follow-up'
      })
    ])
  })

  it('keeps question batch routes in the shared notification resolver', () => {
    const generated = resolveNotificationAction(notification({
      id: 81,
      type: 'TASK_DONE',
      bizType: 'QUESTION_GENERATE',
      bizId: 'batch-81',
      relatedType: 'QUESTION_GENERATE',
      relatedId: 'batch-81'
    }))
    const recommended = resolveNotificationAction(notification({
      id: 82,
      type: 'TASK_DONE',
      bizType: 'QUESTION_RECOMMENDATION_GENERATE',
      bizId: 'batch-82',
      relatedType: 'QUESTION_RECOMMENDATION_GENERATE',
      relatedId: 'batch-82'
    }))

    expect(generated).toMatchObject({
      kind: 'route',
      actionPath: '/agent/tasks?bizType=question.generate&bizId=batch-81&batchId=batch-81',
      fallbackPath: '/agent/tasks'
    })
    expect(recommended).toMatchObject({
      kind: 'route',
      actionPath: '/questions/recommendations?batchId=batch-82',
      fallbackPath: '/questions/recommendations'
    })
  })
})
