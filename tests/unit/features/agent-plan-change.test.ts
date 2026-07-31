import { describe, expect, it, vi } from 'vitest'

import {
  canConfirmAgentPlanChange,
  createSingleFlight,
  getAgentPlanChangeErrorCode,
  getAgentPlanChangeTypeLabel,
  getAgentPlanChangeWarningCodes,
  getDefaultAgentPlanChangeTargetDate,
  groupAgentPlanChangeItems,
  isAgentPlanChangeConflictError,
  isWeakAgentPlanChangePreview
} from '@/features/agent-plan-change'
import type { AgentPlanChangePreviewVO } from '@/types/agentPlanChange'

const preview = (partial: Partial<AgentPlanChangePreviewVO> = {}): AgentPlanChangePreviewVO => ({
  changeSetId: 501,
  status: 'PREVIEW_READY',
  previewVersion: 1,
  previewHash: 'preview-hash',
  expiresAt: '2099-07-18T22:30:00',
  confirmable: true,
  warnings: [],
  blockers: [],
  items: [],
  ...partial
})

describe('agent plan change feature helpers', () => {
  it('groups all supported differences into the four user-facing categories', () => {
    const groups = groupAgentPlanChangeItems([
      { id: 1, changeType: 'ADD_TASK' },
      { id: 2, changeType: 'CARRY_OVER_TASK' },
      { id: 3, changeType: 'REMOVE_OPEN_TASK' },
      { id: 4, changeType: 'RESCHEDULE_TASK' },
      { id: 5, changeType: 'CHANGE_PRIORITY' }
    ])

    expect(groups.map((group) => [group.title, group.items.map((item) => item.id)])).toEqual([
      ['新增', [1, 2]],
      ['移除', [3]],
      ['延后', [4]],
      ['优先级', [5]]
    ])
  })

  it('requires every top-level and item warning before confirmation', () => {
    const value = preview({
      warnings: ['LOW_CONFIDENCE_REVIEW'],
      items: [{
        id: 1,
        changeType: 'RESCHEDULE_TASK',
        warnings: ['DEADLINE_RESCHEDULE']
      }]
    })

    expect(getAgentPlanChangeWarningCodes(value)).toEqual([
      'LOW_CONFIDENCE_REVIEW',
      'DEADLINE_RESCHEDULE'
    ])
    expect(canConfirmAgentPlanChange(value, ['LOW_CONFIDENCE_REVIEW'])).toBe(false)
    expect(canConfirmAgentPlanChange(value, [
      'LOW_CONFIDENCE_REVIEW',
      'DEADLINE_RESCHEDULE'
    ])).toBe(true)
  })

  it('blocks expired previews and identifies weak fallback adjustments', () => {
    const value = preview({
      expiresAt: '2026-07-18T08:00:00',
      fallback: true,
      items: [{ id: 1, confidenceLevel: 'LOW' }]
    })

    expect(canConfirmAgentPlanChange(
      value,
      [],
      new Date('2026-07-18T09:00:00').getTime()
    )).toBe(false)
    expect(isWeakAgentPlanChangePreview(value)).toBe(true)
  })

  it('defaults a current-date review to the next calendar day without producing a past target', () => {
    const now = new Date(2026, 6, 18, 12, 0, 0)

    expect(getDefaultAgentPlanChangeTargetDate('2026-07-18', now)).toBe('2026-07-19')
    expect(getDefaultAgentPlanChangeTargetDate('2026-07-17', now)).toBe('2026-07-18')
  })

  it('deduplicates concurrent confirmation calls with one active promise', async () => {
    let resolve!: (value: string) => void
    const factory = vi.fn(() => new Promise<string>((done) => {
      resolve = done
    }))
    const singleFlight = createSingleFlight<string>()

    const first = singleFlight.run(factory)
    const second = singleFlight.run(factory)

    expect(second).toBe(first)
    await Promise.resolve()
    expect(factory).toHaveBeenCalledTimes(1)
    resolve('APPLIED')
    await expect(first).resolves.toBe('APPLIED')
    expect(singleFlight.isRunning()).toBe(false)
  })

  it('recognizes 409 business conflicts and keeps unknown change labels in Chinese', () => {
    const error = {
      response: {
        status: 409,
        data: {
          message: 'PLAN_CHANGE_PREVIEW_STALE：计划基线已变化。'
        }
      }
    }

    expect(getAgentPlanChangeErrorCode(error)).toBe('PLAN_CHANGE_PREVIEW_STALE')
    expect(isAgentPlanChangeConflictError(error)).toBe(true)
    expect(getAgentPlanChangeTypeLabel('UNKNOWN_FUTURE_TYPE')).toBe('计划变更')
  })
})
