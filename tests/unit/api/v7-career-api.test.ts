import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: { get, post, put, delete: del }
}))

import {
  confirmExternalPlanPreviewV7Api,
  createCommunicationDraftV7Api,
  createExternalPlanPreviewV7Api,
  getApplicationWorkspaceV7Api,
  getCareerCampaignsV7Api,
  getContactsV7Api,
  getActivitiesV7Api,
  getInterviewProcessV7Api,
  getLatestResearchSnapshotV7Api,
  getOffersV7Api,
  getResearchSourcesV7Api,
  transitionApplicationStatusV7Api
} from '@/api/v7Career'

describe('v7 career api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    get.mockResolvedValue([])
    post.mockResolvedValue({})
  })

  it('keeps campaign, workspace and status transition contracts in the isolated v7 api', async () => {
    get.mockResolvedValueOnce([]).mockResolvedValueOnce({ application: { id: 7 } })
    post.mockResolvedValueOnce({ application: { id: 7, status: 'INTERVIEWING' } })

    await getCareerCampaignsV7Api()
    await getApplicationWorkspaceV7Api(7)
    await transitionApplicationStatusV7Api(7, {
      targetStatus: 'INTERVIEWING',
      expectedLockVersion: 3,
      idempotencyKey: 'status-7-3'
    })

    expect(get).toHaveBeenNthCalledWith(1, '/career-campaigns')
    expect(get).toHaveBeenNthCalledWith(2, '/applications/7/workspace')
    expect(post).toHaveBeenCalledWith('/applications/7/status-transitions', {
      targetStatus: 'INTERVIEWING',
      expectedLockVersion: 3,
      idempotencyKey: 'status-7-3'
    })
  })

  it('normalizes backend-shaped V7 payloads before views consume them', async () => {
    get
      .mockResolvedValueOnce({
        nextSteps: ['Confirm the next follow-up'],
        timeline: [],
        materials: []
      })
      .mockResolvedValueOnce({
        rounds: [{
          id: 3,
          scheduledStartsAtUtc: '2026-07-20T09:00:00Z',
          resultSummary: 'Bring a project example.'
        }]
      })
      .mockResolvedValueOnce([{
        id: 4,
        decisionDeadline: '2026-07-21T18:00:00',
        currentVersion: {
          id: 41,
          annualBaseSalary: '500000',
          annualBonus: '50000',
          note: 'Remote after probation.'
        }
      }])
      .mockResolvedValueOnce([{
        id: 5,
        roleType: 'Hiring Manager'
      }])
      .mockResolvedValueOnce([{
        id: 6,
        activityType: 'FOLLOW_UP',
        occurredAt: '2026-07-20T10:00:00'
      }])
      .mockResolvedValueOnce([{
        id: 7,
        officialUrl: 'https://example.com/company',
        status: 'ACTIVE',
        currentVersion: {
          capturedAt: '2026-07-20T08:00:00',
          contentHash: 'source-hash'
        }
      }])
      .mockResolvedValueOnce({
        research: {
          facts: [{ statement: 'The role owns the API gateway.' }],
          unknowns: ['Team size'],
          sourceLimits: ['Only official sources were used.'],
          questionsToVerify: ['On-call rotation'],
          preparationFocus: ['Distributed systems'],
          riskSignals: ['Scope is still changing.'],
          confidenceLevel: 'MEDIUM'
        },
        fallbackReason: 'AI_RULE_FALLBACK',
        sourceVersionIds: [701]
      })

    const workspace = await getApplicationWorkspaceV7Api(7)
    const interview = await getInterviewProcessV7Api(7)
    const offers = await getOffersV7Api(7)
    const contacts = await getContactsV7Api(7)
    const activities = await getActivitiesV7Api(7)
    const sources = await getResearchSourcesV7Api(7)
    const snapshot = await getLatestResearchSnapshotV7Api(7)

    expect(workspace.nextSteps).toEqual([{
      id: 'rule-next-step-0',
      title: 'Confirm the next follow-up',
      description: 'Confirm the next follow-up',
      source: '规则聚合'
    }])
    expect(interview.rounds?.[0]).toMatchObject({
      scheduledAt: '2026-07-20T09:00:00Z',
      reviewSummary: 'Bring a project example.'
    })
    expect(offers[0].currentVersion).toMatchObject({
      baseSalary: '500000',
      bonus: '50000',
      deadlineAt: '2026-07-21T18:00:00',
      notes: 'Remote after probation.'
    })
    expect(contacts[0]).toMatchObject({ role: 'Hiring Manager' })
    expect(activities[0]).toMatchObject({
      type: 'FOLLOW_UP',
      happenedAt: '2026-07-20T10:00:00'
    })
    expect(sources[0]).toMatchObject({
      url: 'https://example.com/company',
      collectedAt: '2026-07-20T08:00:00',
      contentHash: 'source-hash',
      active: true
    })
    expect(snapshot).toMatchObject({
      facts: ['The role owns the API gateway.'],
      unknowns: ['Team size'],
      sourceLimits: ['Only official sources were used.'],
      questionsToVerify: ['On-call rotation'],
      preparationFocus: ['Distributed systems'],
      riskSignals: ['Scope is still changing.'],
      sourceRefs: ['701'],
      confidenceLevel: 'MEDIUM',
      fallback: true
    })
  })

  it('normalizes communication draft input and legacy response fields', async () => {
    post.mockResolvedValueOnce({ confidence: 'HIGH', fallback: false, body: 'Draft body' })

    const draft = await createCommunicationDraftV7Api(7, {
      purpose: 'follow-up',
      facts: ['Fact one', 'Fact two']
    })

    expect(post).toHaveBeenCalledWith('/applications/7/communication-drafts', {
      purpose: 'follow-up',
      facts: 'Fact one\nFact two'
    })
    expect(draft).toMatchObject({
      confidenceLevel: 'HIGH',
      fallback: false,
      body: 'Draft body'
    })
  })

  it('uses offer and external plan preview endpoints from the v7 design', async () => {
    get.mockResolvedValueOnce([])
    post.mockResolvedValueOnce({ changeSetId: 11, status: 'PREVIEW_READY' })
    post.mockResolvedValueOnce({ changeSetId: 11, status: 'APPLIED' })

    await getOffersV7Api(7)
    await createExternalPlanPreviewV7Api({
      sourceType: 'INTERVIEW_PREPARATION',
      sourceId: 9,
      intents: [{ title: '复习项目证据' }],
      idempotencyKey: 'preview-9'
    })
    await confirmExternalPlanPreviewV7Api(11, {
      previewVersion: 1,
      previewHash: 'hash',
      acknowledgedWarningCodes: [],
      idempotencyKey: 'confirm-11'
    })

    expect(get).toHaveBeenCalledWith('/applications/7/offers')
    expect(post).toHaveBeenNthCalledWith(1, '/agent/plan-changes/external/preview', expect.any(Object))
    expect(post).toHaveBeenNthCalledWith(2, '/agent/plan-change-sets/11/confirm', expect.any(Object))
  })
})
