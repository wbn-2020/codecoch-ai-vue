import { describe, expect, it } from 'vitest'

import type { AgentTaskVO } from '@/types/agent'
import { deriveTaskLoopDiagnostics, selectKeyAgentActions } from '@/features/agent-loop/agentLoopRules'

describe('agentLoopRules', () => {
  it('keeps fallback, mock, low-sample, stale, and trace-missing tasks out of strong key actions', () => {
    const tasks: AgentTaskVO[] = [
      {
        id: 1,
        title: 'Strong evidence task',
        status: 'TODO',
        priority: 'HIGH',
        traceId: 'trace-1',
        trustStatus: 'VERIFIED',
        evidenceSources: [{ sourceType: 'AGENT_TASK', sourceId: 1, sourceSummary: 'Created from a verified plan.', trustStatus: 'VERIFIED' }],
        qualityGate: { gateStatus: 'PASS', suggestionStrength: 'STRONG', reasons: ['verified'] }
      },
      {
        id: 2,
        title: 'Fallback task',
        status: 'TODO',
        priority: 'HIGH',
        traceId: 'trace-2',
        fallback: true,
        trustStatus: 'FALLBACK',
        qualityGate: { gateStatus: 'WARN', suggestionStrength: 'FALLBACK', reasons: ['fallback'] }
      },
      {
        id: 3,
        title: 'Trace missing task',
        status: 'TODO',
        priority: 'HIGH',
        trustStatus: 'VERIFIED',
        qualityGate: { gateStatus: 'PASS', suggestionStrength: 'STRONG', reasons: ['provided gate is stronger than trace allows'] }
      },
      {
        id: 4,
        title: 'Stale evidence task',
        status: 'TODO',
        priority: 'HIGH',
        traceId: 'trace-4',
        trustStatus: 'STALE',
        evidenceSources: [{ sourceType: 'AGENT_TASK', sourceId: 4, sourceSummary: 'Old source.', trustStatus: 'STALE' }],
        qualityGate: { gateStatus: 'WARN', suggestionStrength: 'WEAK', reasons: ['stale'] }
      }
    ]

    const actions = selectKeyAgentActions(tasks, { limit: 3 })

    expect(actions).toHaveLength(1)
    expect(actions[0].task.id).toBe(1)
    expect(actions[0].planStrength).toBe('STRONG')
    expect(deriveTaskLoopDiagnostics(tasks[1]).degradationReasons).toContain('fallback')
    expect(deriveTaskLoopDiagnostics(tasks[2]).degradationReasons).toContain('trace_missing')
    expect(deriveTaskLoopDiagnostics(tasks[3]).degradationReasons).toContain('source_stale')
  })

  it('marks repeated skips as an adjustment signal without deciding completion for the user', () => {
    const tasks: AgentTaskVO[] = [
      { id: 10, title: 'Follow up application', taskType: 'APPLICATION_FOLLOW_UP', status: 'SKIPPED', skipReason: 'Need more context' },
      { id: 11, title: 'Follow up application', taskType: 'APPLICATION_FOLLOW_UP', status: 'SKIPPED', skipReason: 'Still not ready' },
      {
        id: 12,
        title: 'Follow up application',
        taskType: 'APPLICATION_FOLLOW_UP',
        status: 'TODO',
        priority: 'MEDIUM',
        traceId: 'trace-12',
        trustStatus: 'VERIFIED',
        evidenceSummary: 'The task is still relevant, but should be smaller after repeated skips.'
      }
    ]

    const actions = selectKeyAgentActions(tasks, { limit: 3, historyTasks: tasks })

    expect(actions[0].task.id).toBe(12)
    expect(actions[0].repeatedSkipCount).toBe(2)
    expect(actions[0].adjustmentHints.join(' ')).toContain('split')
    expect(actions[0].status).toBe('TODO')
  })
})
