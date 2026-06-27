import { describe, expect, it } from 'vitest'

import type { AgentTaskVO } from '@/types/agent'
import { buildAgentTaskActionPath, validAgentTaskActionUrl } from '@/utils/agentTaskAction'

const applicationTask = (overrides: Partial<AgentTaskVO> = {}): AgentTaskVO => ({
  id: 42,
  taskType: 'APPLICATION_FOLLOW_UP',
  title: 'Follow up application',
  relatedBizType: 'JOB_APPLICATION',
  relatedBizId: 99,
  ...overrides
})

describe('agentTaskAction', () => {
  it('falls back APPLICATION_FOLLOW_UP without an actionUrl to task center, not preview-only applications', () => {
    const path = buildAgentTaskActionPath(applicationTask())

    expect(path).toContain('/agent/tasks')
    expect(path).not.toContain('/applications')
  })

  it('keeps a legal backend actionUrl for APPLICATION_FOLLOW_UP', () => {
    const path = buildAgentTaskActionPath(applicationTask({
      actionUrl: '/agent/tasks?tab=todo'
    }))

    expect(path).toContain('/agent/tasks')
    expect(path).toContain('tab=todo')
    expect(path).not.toContain('/applications')
  })

  it.each([
    '/applications',
    '/applications/99?status=FOLLOW_UP',
    'https://evil.example/phish',
    '/admin/tasks'
  ])('rejects unsafe APPLICATION_FOLLOW_UP actionUrl %s and falls back safely', (actionUrl) => {
    const task = applicationTask({ actionUrl })

    expect(validAgentTaskActionUrl(task)).toBe('')

    const path = buildAgentTaskActionPath(task)
    expect(path).toContain('/agent/tasks')
    expect(path).not.toContain('/applications')
  })
})
