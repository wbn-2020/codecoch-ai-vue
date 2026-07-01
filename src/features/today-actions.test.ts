import { describe, expect, it } from 'vitest'

import { buildTodayActions } from './today-actions'
import type { NotificationVO } from '@/api/notification'
import type { JobApplicationStatsVO } from '@/api/v4'
import type { AgentTaskVO } from '@/types/agent'

type ActionableNotificationVO = NotificationVO & {
  bizType?: string
  bizId?: number | string
  actionUrl?: string
  fallbackPath?: string
  fallbackLabel?: string
  planDate?: string
}

const agentTask = (partial: Partial<AgentTaskVO>): AgentTaskVO => ({
  id: 1,
  title: '完成今日题目练习',
  status: 'TODO',
  actionUrl: '/agent/today',
  ...partial
})

const notification = (partial: Partial<ActionableNotificationVO>): ActionableNotificationVO => ({
  id: 1,
  title: '通知',
  type: 'SYSTEM',
  isRead: 0,
  createdAt: '2026-06-30 09:00:00',
  ...partial
})

describe('today action aggregation', () => {
  it('prioritizes application follow-up, agent tasks and notification actions', () => {
    const stats: JobApplicationStatsVO = {
      overdueFollowUpCount: 2,
      dueTodayFollowUpCount: 1
    }

    const actions = buildTodayActions({
      applicationStats: stats,
      agentTasks: [agentTask({ id: 12, title: '复盘错题', actionUrl: '/agent/today?taskId=12' })],
      notifications: [
        notification({
          id: 7,
          type: 'INTERVIEW_REPORT_READY',
          bizType: 'INTERVIEW_REPORT',
          bizId: 99,
          title: '报告完成'
        })
      ],
      readinessAction: {
        title: '补齐简历',
        description: '先上传简历',
        reason: '缺少简历',
        path: '/resumes',
        label: '去简历'
      }
    })

    expect(actions.map((item) => item.key)).toEqual([
      'application-follow-up-overdue',
      'application-follow-up-due-today',
      'agent-task-12',
      'notification-7'
    ])
    expect(actions[3]).toMatchObject({ source: 'notification', notificationId: 7, unread: true })
    expect(actions).toHaveLength(4)
  })

  it('deduplicates agent reminders and application notifications against stronger sources', () => {
    const actions = buildTodayActions({
      applicationStats: { overdueFollowUpCount: 1, dueTodayFollowUpCount: 0 },
      agentTasks: [agentTask({ id: 12, title: '继续 Agent 任务' })],
      notifications: [
        notification({ id: 1, type: 'AGENT_REMINDER', bizType: 'AGENT_TASK', bizId: 12, title: 'Agent 提醒' }),
        notification({ id: 2, type: 'APPLICATION_FOLLOW_UP_REMINDER', bizType: 'JOB_APPLICATION', actionUrl: '/applications?followUp=overdue' })
      ]
    })

    expect(actions.map((item) => item.key)).toEqual(['application-follow-up-overdue', 'agent-task-12'])
  })

  it('skips resolved notification actions', () => {
    const actions = buildTodayActions({
      notifications: [
        notification({
          id: 21,
          type: 'APPLICATION_FOLLOW_UP_REMINDER',
          bizType: 'JOB_APPLICATION',
          bizId: 501,
          resolvedStatus: 1
        }),
        notification({
          id: 22,
          type: 'INTERVIEW_REPORT_READY',
          bizType: 'INTERVIEW_REPORT',
          bizId: 9
        })
      ]
    })

    expect(actions.map((item) => item.key)).toEqual(['notification-22'])
  })

  it('uses readiness only when no urgent actions exist', () => {
    const readinessAction = {
      title: '查看求职驾驶舱',
      description: '补齐上下文',
      reason: '缺少完整上下文',
      path: '/dashboard/v3',
      label: '查看'
    } as const

    expect(buildTodayActions({ readinessAction })).toMatchObject([
      { key: 'readiness-next-action', source: 'readiness' }
    ])

    expect(buildTodayActions({
      agentTasks: [agentTask({ id: 2 })],
      readinessAction
    }).some((item) => item.source === 'readiness')).toBe(false)
  })

  it('limits dashboard actions to the most important five items', () => {
    const actions = buildTodayActions({
      applicationStats: { overdueFollowUpCount: 1, dueTodayFollowUpCount: 1 },
      agentTasks: [
        agentTask({ id: 1, title: 'Agent task 1' }),
        agentTask({ id: 2, title: 'Agent task 2' }),
        agentTask({ id: 3, title: 'Agent task 3' }),
        agentTask({ id: 4, title: 'Agent task 4' })
      ],
      notifications: [
        notification({ id: 10, type: 'INTERVIEW_REPORT_READY', bizType: 'INTERVIEW_REPORT', bizId: 1, title: 'Report 1' }),
        notification({ id: 11, type: 'SYSTEM', title: 'System notice', fallbackPath: '/notifications' })
      ]
    })

    expect(actions).toHaveLength(5)
    expect(actions.map((item) => item.key)).toEqual([
      'application-follow-up-overdue',
      'application-follow-up-due-today',
      'agent-task-1',
      'agent-task-2',
      'agent-task-3'
    ])
  })

  it('treats failed sources as empty input and keeps available actions', () => {
    expect(buildTodayActions({})).toEqual([])

    const actions = buildTodayActions({
      agentTasks: undefined,
      applicationStats: null,
      notifications: undefined,
      readinessAction: {
        title: '生成今日计划',
        description: '从默认入口继续推进',
        reason: '其他来源暂时不可用',
        path: '/agent/today',
        label: '打开今日计划'
      }
    })

    expect(actions).toMatchObject([
      { key: 'readiness-next-action', source: 'readiness', actionPath: '/agent/today' }
    ])
  })

  it('falls back unsafe agent action paths to today agent page', () => {
    const actions = buildTodayActions({
      agentTasks: [
        agentTask({ id: 12, title: 'Review report', actionUrl: '//evil.example' }),
        agentTask({ id: 13, title: 'Unknown path', actionUrl: '/not-exists' }),
        agentTask({ id: 14, title: 'Preview path', actionUrl: '/applications' })
      ]
    }, {
      notificationResolver: {
        enableV4Preview: false,
        knownPaths: ['/agent/today']
      }
    })

    expect(actions.map((item) => item.actionPath)).toEqual([
      '/agent/today',
      '/agent/today',
      '/agent/today'
    ])
  })
})
