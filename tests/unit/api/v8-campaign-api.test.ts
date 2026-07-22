import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: { get, post, put }
}))

import {
  createCampaignArchiveExportV8Api,
  createCampaignPulsePlanPreviewV8Api,
  downloadCampaignArchiveExportV8Api,
  generateCampaignPulseV8Api,
  getCampaignActionDecisionsV8Api,
  getCampaignArchiveExportsV8Api,
  getCampaignCockpitV8Api,
  getCampaignOperatingProfileV8Api,
  getCampaignPulseHistoryV8Api,
  getCampaignPulseV8Api,
  previewCampaignScenarioV8Api,
  saveCampaignActionDecisionV8Api,
  updateCampaignOperatingProfileV8Api
} from '@/api/v8Campaign'

describe('v8 campaign api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue({})
    post.mockResolvedValue({})
    put.mockResolvedValue({})
  })

  it('uses the V8 profile, cockpit, decision, pulse and scenario endpoints', async () => {
    get
      .mockResolvedValueOnce({ campaignId: 3 })
      .mockResolvedValueOnce({ campaign: { id: 3 } })
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({
        campaignId: 3,
        facts: { activeApplications: 2 },
        changes: ['规则变化'],
        narrative: {
          summary: '中文周期摘要',
          facts: ['当前有 2 个活跃机会。'],
          driftReasons: ['当前仅描述弱信号。'],
          limits: ['低样本。']
        },
        createdAt: '2026-07-22T12:00:00'
      })
      .mockResolvedValueOnce({
        campaignId: 3,
        snapshots: [{
          campaignId: 3,
          narrative: { summary: '历史摘要' }
        }]
      })

    await getCampaignOperatingProfileV8Api(3)
    await getCampaignCockpitV8Api(3)
    await getCampaignActionDecisionsV8Api(3)
    const pulse = await getCampaignPulseV8Api(3)
    const history = await getCampaignPulseHistoryV8Api(3)
    await updateCampaignOperatingProfileV8Api(3, {
      weeklyApplicationTarget: 5,
      weeklyTimeBudgetMinutes: 300,
      maxActiveOpportunities: 8,
      staleAfterDays: 7,
      defaultFollowUpDays: 5,
      focusRoles: [],
      focusLocations: [],
      focusChannels: [],
      timezone: 'Asia/Shanghai',
      idempotencyKey: 'profile-3'
    })
    await saveCampaignActionDecisionV8Api(3, {
      semanticKey: 'follow-up-7',
      sourceHash: 'hash-7',
      decisionStatus: 'DISMISSED',
      idempotencyKey: 'decision-7'
    })
    await generateCampaignPulseV8Api({ campaignId: 3, idempotencyKey: 'pulse-3' })
    await createCampaignPulsePlanPreviewV8Api(9, {
      idempotencyKey: 'pulse-plan-9',
      selectedSemanticKeys: ['follow-up-7'],
      maxTotalMinutes: 120
    })
    await previewCampaignScenarioV8Api(3, {
      availableMinutes: 180,
      focusMode: 'BALANCED',
      maxApplications: 5,
      includeLowConfidence: false
    })

    expect(get).toHaveBeenNthCalledWith(1, '/career-campaigns/3/operating-profile')
    expect(get).toHaveBeenNthCalledWith(2, '/agent/career-campaign-cockpits/3')
    expect(get).toHaveBeenNthCalledWith(3, '/agent/career-campaign-cockpits/3/action-decisions')
    expect(get).toHaveBeenNthCalledWith(4, '/agent/career-campaign-pulses/campaigns/3')
    expect(get).toHaveBeenNthCalledWith(5, '/agent/career-campaign-pulses/campaigns/3/history')
    expect(put).toHaveBeenCalledWith('/career-campaigns/3/operating-profile', expect.any(Object))
    expect(post).toHaveBeenCalledWith('/agent/career-campaign-cockpits/3/action-decisions', expect.any(Object))
    expect(post).toHaveBeenCalledWith('/agent/career-campaign-pulses/generate', expect.any(Object))
    expect(post).toHaveBeenCalledWith('/agent/career-campaign-pulses/9/plan-preview', {
      idempotencyKey: 'pulse-plan-9',
      selectedSemanticKeys: ['follow-up-7'],
      maxTotalMinutes: 120
    })
    expect(post).toHaveBeenCalledWith('/agent/career-campaign-cockpits/3/scenarios/preview', expect.any(Object))
    expect(pulse?.summary).toBe('中文周期摘要')
    expect(pulse?.facts).toEqual(['当前有 2 个活跃机会。'])
    expect(pulse?.generatedAt).toBe('2026-07-22T12:00:00')
    expect(history).toHaveLength(1)
    expect(history[0]?.summary).toBe('历史摘要')
  })

  it('uses archive export list, create and blob download endpoints', async () => {
    get.mockResolvedValueOnce([])
    post.mockResolvedValueOnce({ id: 19, status: 'GENERATING' })
    get.mockResolvedValueOnce(new Blob(['archive']))

    await getCampaignArchiveExportsV8Api(3)
    await createCampaignArchiveExportV8Api(3, {
      exportFormat: 'ZIP',
      idempotencyKey: 'archive-3'
    })
    await downloadCampaignArchiveExportV8Api(19)

    expect(get).toHaveBeenNthCalledWith(1, '/career-campaigns/3/archive-exports')
    expect(post).toHaveBeenCalledWith('/career-campaigns/3/archive-exports', {
      exportFormat: 'ZIP',
      idempotencyKey: 'archive-3'
    })
    expect(get).toHaveBeenNthCalledWith(2, '/career-campaign-archive-exports/19/download', {
      responseType: 'blob'
    })
  })
})
