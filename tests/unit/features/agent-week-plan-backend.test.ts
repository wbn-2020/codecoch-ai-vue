import { describe, expect, it } from 'vitest'

import { buildAgentWeekPlanFromBackend } from '@/features/agent-week-plan-backend'

describe('agent week plan backend adapter', () => {
  it('hides backend audit identifiers and English fallback copy from user-facing actions', () => {
    const plan = buildAgentWeekPlanFromBackend({
      planDate: '2026-07-15',
      weekStartDate: '2026-07-13',
      weekEndDate: '2026-07-19',
      items: [{
        id: 9,
        agentTaskId: 42,
        layer: 'WEEK',
        title: 'Agent task #42 QUESTION_PRACTICE',
        description: 'Derived from TARGET_JOB status and safe source metadata.',
        reason: 'Derived from TARGET_JOB signal.',
        actionType: 'QUESTION_PRACTICE',
        relatedBizType: 'TARGET_JOB',
        evidence: ['task=42', 'run=10', 'trace=agent-run-10', 'titleHash=not-user-facing', 'source=TARGET_JOB'],
        confidenceLevel: 'HIGH'
      }]
    })

    const action = plan.week.actions[0]

    expect(action.title).toBe('刷题练习任务')
    expect(action.description).toBe('依据已关联的目标岗位和已记录信息生成。')
    expect(action.reason).toBe('依据已关联的目标岗位信号生成。')
    expect(action.sourceTitle).toBe('目标岗位')
    expect(action.evidence).toEqual(['目标岗位'])
  })

  it('does not render stale tasks from outside the returned plan window', () => {
    const plan = buildAgentWeekPlanFromBackend({
      planDate: '2026-07-13',
      weekStartDate: '2026-07-13',
      weekEndDate: '2026-07-19',
      items: [{
        id: 9,
        layer: 'WEEK',
        title: 'Agent task #42 QUESTION_PRACTICE',
        actionType: 'QUESTION_PRACTICE',
        plannedDate: '2026-06-14',
        evidence: ['source=TARGET_JOB']
      }]
    })

    expect(plan.week.actions).toHaveLength(1)
    expect(plan.week.actions[0]?.fallback).toBe(true)
  })
})
