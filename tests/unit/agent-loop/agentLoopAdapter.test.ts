import { describe, expect, it } from 'vitest'

import type { AgentReviewVO } from '@/api/v4'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import { buildAgentLoopOverview, buildReviewSections } from '@/features/agent-loop/agentLoopAdapter'

const trustedTask = (id: number, overrides: Partial<AgentTaskVO> = {}): AgentTaskVO => ({
  id,
  title: `Trusted task ${id}`,
  status: 'TODO',
  priority: 'HIGH',
  traceId: `trace-${id}`,
  trustStatus: 'VERIFIED',
  evidenceSummary: 'Verified task evidence.',
  qualityGate: { gateStatus: 'PASS', suggestionStrength: 'STRONG', reasons: ['verified'] },
  ...overrides
})

describe('agentLoopAdapter', () => {
  it('connects daily plan, agent tasks, review, and next adjustment into one overview', () => {
    const plan: DailyPlanVO = {
      runId: 100,
      planDate: '2026-07-06',
      summary: 'Focus on a small set of verified actions.',
      tasks: [trustedTask(1), trustedTask(2), trustedTask(3), trustedTask(4)]
    }
    const review: AgentReviewVO = {
      id: 9,
      reviewDate: '2026-07-05',
      summary: 'Completed two tasks, skipped one broad follow-up.',
      doneCount: 2,
      skippedCount: 1,
      todoCount: 1,
      completionRate: 50,
      nextActions: ['Split the follow-up into a smaller manual check.']
    }

    const overview = buildAgentLoopOverview({ plan, todayTasks: plan.tasks, reviews: [review] })

    expect(overview.keyActions.map((item) => item.taskId)).toEqual([1, 2, 3])
    expect(overview.latestReview?.id).toBe(9)
    expect(overview.nextAdjustmentSummary).toContain('Split the follow-up')
    expect(overview.reviewSections.facts.join(' ')).toContain('2')
    expect(overview.weekSummary.total).toBe(4)
  })

  it('falls back to weak entries when all tasks are degraded instead of inventing a strong plan', () => {
    const tasks: AgentTaskVO[] = [
      trustedTask(1, { fallback: true, trustStatus: 'FALLBACK', qualityGate: { gateStatus: 'WARN', suggestionStrength: 'FALLBACK', reasons: ['fallback'] } }),
      trustedTask(2, { traceId: undefined }),
      trustedTask(3, { trustStatus: 'STALE', evidenceSources: [{ sourceType: 'AGENT_TASK', sourceId: 3, sourceSummary: 'Old source.', trustStatus: 'STALE' }] })
    ]

    const overview = buildAgentLoopOverview({ todayTasks: tasks })

    expect(overview.keyActions).toEqual([])
    expect(overview.allActions).toHaveLength(3)
    expect(overview.fallbackEntries.map((item) => item.path)).toContain('/agent/today')
    expect(overview.allActions.every((action) => action.canPromoteToKeyAction === false)).toBe(true)
  })

  it('maps a thin AgentReviewVO into facts, limits, drifts, adjustments, and next actions', () => {
    const sections = buildReviewSections({
      id: 3,
      summary: 'Skipped tasks increased, keep the next plan smaller.',
      doneCount: 1,
      skippedCount: 2,
      todoCount: 1,
      completionRate: 25,
      nextActions: ['Break repeated tasks into shorter steps.']
    })

    expect(sections.facts.join(' ')).toContain('1')
    expect(sections.limits.join(' ')).toContain('sample')
    expect(sections.drifts.join(' ')).toContain('Skipped')
    expect(sections.adjustments.join(' ')).toContain('shorter')
    expect(sections.nextActions).toEqual(['Break repeated tasks into shorter steps.'])
  })
})
