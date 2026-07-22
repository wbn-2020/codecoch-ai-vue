import { describe, expect, it } from 'vitest'

import { buildTodayActions } from '@/features/today-actions'

describe('today notification actions', () => {
  it('keeps the notification id and uses the registered route after an unknown actionUrl', () => {
    const actions = buildTodayActions({
      notifications: [{
        id: 71,
        title: '继续训练',
        content: '打开任务中心继续执行',
        type: 'AGENT_REMINDER',
        bizType: 'AGENT_TASK',
        bizId: 'run-42',
        actionUrl: '/agent/unregistered-route?bizId=run-42',
        fallbackPath: '/agent/today',
        isRead: 0
      }]
    }, {
      notificationResolver: {
        enableV4Preview: true
      }
    })

    expect(actions).toMatchObject([{
      key: 'notification-71',
      source: 'notification',
      notificationId: 71,
      unread: true,
      actionPath: '/agent/tasks?bizType=agent.daily-plan.generate&bizId=run-42'
    }])
  })

  it('does not surface resolved notifications as homepage actions', () => {
    const actions = buildTodayActions({
      notifications: [{
        id: 72,
        title: '已处理提醒',
        type: 'AGENT_REMINDER',
        bizType: 'AGENT_TASK',
        bizId: 'run-43',
        isRead: 0,
        resolvedStatus: 'RESOLVED'
      }]
    })

    expect(actions).toEqual([])
  })
})
