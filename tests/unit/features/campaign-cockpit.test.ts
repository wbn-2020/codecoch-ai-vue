import { describe, expect, it } from 'vitest'

import {
  getCampaignCoverageLabels,
  normalizeOperatingProfile
} from '@/features/campaign-cockpit'
import {
  buildCampaignActionDecisionDTO,
  sortCampaignActions
} from '@/features/campaign-cockpit/action-decisions'
import {
  normalizeCampaignScenarioInput,
  scenarioActionCount,
  validateCampaignScenarioInput
} from '@/features/campaign-cockpit/scenario'

describe('campaign cockpit rules', () => {
  it('normalizes an unconfigured profile and coverage counts', () => {
    expect(normalizeOperatingProfile(9, {
      timezone: '',
      focusRoles: ['Java', '', '平台']
    })).toMatchObject({
      campaignId: 9,
      configured: false,
      weeklyApplicationTarget: 5,
      timezone: 'Asia/Shanghai',
      focusRoles: ['Java', '平台']
    })

    expect(getCampaignCoverageLabels({
      included: ['APPLICATION', 'OFFER'],
      unavailable: ['RESEARCH'],
      failed: ['CONTACT']
    })).toEqual({ included: 2, unavailable: 1, failed: 1 })
  })

  it('sorts actions deterministically and binds decisions to the source hash', () => {
    const actions = [
      {
        semanticKey: 'later',
        sourceHash: 'hash-b',
        actionType: 'APPLICATION_STALE',
        title: '检查停滞机会',
        priority: 'LOW',
        dueAt: '2026-07-25'
      },
      {
        semanticKey: 'critical',
        sourceHash: 'hash-a',
        actionType: 'OFFER_DEADLINE',
        title: '核对 Offer',
        priority: 'CRITICAL',
        dueAt: '2026-07-24'
      }
    ]

    expect(sortCampaignActions(actions)[0].semanticKey).toBe('critical')
    expect(buildCampaignActionDecisionDTO(actions[1], 'DISMISSED', 'decision-key')).toEqual({
      semanticKey: 'critical',
      sourceHash: 'hash-a',
      decisionStatus: 'DISMISSED',
      snoozedUntil: undefined,
      reason: undefined,
      idempotencyKey: 'decision-key'
    })
  })

  it('normalizes scenario inputs and preserves selected/deferred counts', () => {
    const input = normalizeCampaignScenarioInput({
      availableMinutes: 90.9,
      focusMode: 'DEADLINE_FIRST',
      maxApplications: 3.8,
      includeLowConfidence: true
    })

    expect(input).toEqual({
      availableMinutes: 90,
      focusMode: 'DEADLINE_FIRST',
      maxApplications: 3,
      includeLowConfidence: true
    })
    expect(validateCampaignScenarioInput(input)).toEqual([])
    expect(scenarioActionCount({
      selectedActions: [{ semanticKey: 'a', sourceHash: 'h', actionType: 'OFFER_DEADLINE', title: 'A' }],
      deferredActions: [{ semanticKey: 'b', sourceHash: 'h2', actionType: 'APPLICATION_STALE', title: 'B' }],
      totalEstimatedMinutes: 45,
      capacityRemainingMinutes: 45
    })).toEqual({ selected: 1, deferred: 1, totalMinutes: 45, remainingMinutes: 45 })
  })
})
