import { describe, expect, it } from 'vitest'

import {
  buildOfferComparison,
  canConfirmMemoryCandidate,
  canArchiveCareerCampaign,
  canTransitionApplicationStatus,
  classifyV7GetError,
  getAllowedApplicationStatusTransitions,
  getWorkspacePartialFailures,
  getWorkspaceTabs,
  maskContactHint,
  resolveV7Capabilities
} from '@/features/career-campaign/v7'

describe('v7 career workspace rules', () => {
  it('always keeps phase-two tabs and adds later tabs only for available capabilities', () => {
    const tabs = getWorkspaceTabs({
      realInterview: true,
      OFFER: 'AVAILABLE',
      contact_activity: false,
      research: 'ENABLED'
    })

    expect(tabs.map((item) => item.label)).toEqual([
      '概览',
      '时间线',
      '材料',
      '下一步',
      '面试',
      'Offer',
      '研究'
    ])
    expect(resolveV7Capabilities(['offer', 'contact-activity'])).toEqual(
      new Set(['OFFER', 'CONTACT_ACTIVITY'])
    )
  })

  it('reports partial source failures instead of treating them as empty success', () => {
    expect(getWorkspacePartialFailures({
      coverage: {
        unavailable: ['INTERVIEW_REPORT'],
        failed: ['MATCH_REPORT']
      },
      sections: {
        research: { error: '研究快照读取失败' }
      }
    })).toEqual(['MATCH_REPORT', 'INTERVIEW_REPORT', 'research'])
  })

  it('enforces lifecycle transitions and explicit memory confirmation', () => {
    expect(canTransitionApplicationStatus('APPLIED', 'INTERVIEWING', ['INTERVIEWING', 'OFFER'])).toBe(true)
    expect(canTransitionApplicationStatus('APPLIED', 'SAVED', ['INTERVIEWING', 'OFFER'])).toBe(false)
    expect(canTransitionApplicationStatus('APPLIED', 'INTERVIEWING')).toBe(false)
    expect(getAllowedApplicationStatusTransitions('APPLIED', ['offer', 'OFFER', 'closed']))
      .toEqual(['OFFER', 'CLOSED'])
    expect(canConfirmMemoryCandidate({ id: 3, status: 'CANDIDATE' })).toBe(true)
    expect(canConfirmMemoryCandidate({ id: 3, status: 'CONFIRMED' })).toBe(false)
  })

  it('only exposes campaign archive when the backend explicitly allows it', () => {
    expect(canArchiveCareerCampaign('COMPLETED', ['ARCHIVED'])).toBe(true)
    expect(canArchiveCareerCampaign('COMPLETED', [])).toBe(false)
    expect(canArchiveCareerCampaign('ACTIVE', ['ARCHIVED'])).toBe(false)
  })

  it('classifies Axios business errors without letting string error codes hide the response code', () => {
    expect(classifyV7GetError({
      code: 'ERR_BAD_REQUEST',
      response: { status: 400, data: { code: 40400 } }
    })).toBe('not-found')
    expect(classifyV7GetError({ response: { status: 403, data: { code: 41003 } } }))
      .toBe('forbidden')
    expect(classifyV7GetError({ code: 'ERR_NETWORK', message: 'Network Error' }))
      .toBe('network')
  })

  it('masks contact hints and blocks cross-currency offer scoring', () => {
    expect(maskContactHint('candidate@example.com')).toBe('c***@example.com')
    expect(maskContactHint('13812345678')).toBe('138****78')

    const comparison = buildOfferComparison([
      {
        id: 1,
        status: 'RECEIVED',
        currentVersion: { id: 11, currency: 'CNY', totalCompensation: '500000' }
      },
      {
        id: 2,
        status: 'RECEIVED',
        currentVersion: { id: 22, currency: 'USD', totalCompensation: null }
      }
    ])

    expect(comparison.comparable).toBe(false)
    expect(comparison.warnings).toContain('存在多个币种，首期不进行跨币种总分比较。')
    expect(comparison.warnings).toContain('部分 Offer 缺少可比较金额，仅展示条款和截止时间。')
  })
})
