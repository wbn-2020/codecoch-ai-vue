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
  activateCareerCampaignV7Api,
  addResearchSourceVersionV7Api,
  addRoundContactV7Api,
  attachApplicationToCampaignV7Api,
  confirmExternalPlanPreviewV7Api,
  confirmOfferDecisionV7Api,
  createActivityV7Api,
  createCommunicationDraftV7Api,
  createContactV7Api,
  createExternalPlanPreviewV7Api,
  createInterviewProcessV7Api,
  createInterviewRoundV7Api,
  createOfferV7Api,
  createOfferVersionV7Api,
  createResearchSourceV7Api,
  deactivateResearchSourceV7Api,
  deleteContactV7Api,
  generateResearchSnapshotV7Api,
  getApplicationWorkspaceV7Api,
  getCareerCampaignsV7Api,
  getContactsV7Api,
  getActivitiesV7Api,
  getInterviewProcessV7Api,
  getLatestResearchSnapshotV7Api,
  getOffersV7Api,
  getResearchSourcesV7Api,
  generateCareerCampaignReviewV7Api,
  linkInterviewRoundCalendarV7Api,
  listRoundContactsV7Api,
  previewOfferDecisionV7Api,
  recordActivityV7Api,
  removeRoundContactV7Api,
  rescheduleInterviewRoundV7Api,
  transitionApplicationStatusV7Api,
  transitionInterviewRoundV7Api,
  transitionOfferV7Api,
  updateContactV7Api,
  updateInterviewRoundV7Api
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

  it('sends lock version and idempotency metadata for campaign commands', async () => {
    await activateCareerCampaignV7Api(9, {
      expectedLockVersion: 3,
      idempotencyKey: 'campaign:activate:9:3'
    })
    await attachApplicationToCampaignV7Api(9, 17, 'campaign:attach:9:17')

    expect(post).toHaveBeenNthCalledWith(1, '/career-campaigns/9/activate', {
      expectedLockVersion: 3,
      idempotencyKey: 'campaign:activate:9:3'
    })
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/career-campaigns/9/applications/17',
      undefined,
      { headers: { 'Idempotency-Key': 'campaign:attach:9:17' } }
    )
  })

  it('submits only server-owned campaign review request fields', async () => {
    await generateCareerCampaignReviewV7Api({
      campaignId: 9,
      idempotencyKey: 'campaign-review:9:2026-07-21',
      requestId: 'review-request-9'
    })

    expect(post).toHaveBeenCalledWith('/agent/career-campaign-reviews/generate', {
      campaignId: 9,
      idempotencyKey: 'campaign-review:9:2026-07-21',
      requestId: 'review-request-9'
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

  it('sends the Idempotency-Key in the header for every offer write, never in the body', async () => {
    post.mockResolvedValue({ id: 5, status: 'RECEIVED' })

    await createOfferV7Api(7, { applicationId: 7, status: 'RECEIVED' }, 'offer-create-key')
    await createOfferVersionV7Api(5, { currency: 'CNY', annualBaseSalary: 500000 }, 'offer-version-key')
    await transitionOfferV7Api(5, { targetStatus: 'ACCEPTED', userConfirmed: true }, 'offer-transition-key')

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/applications/7/offers',
      { applicationId: 7, status: 'RECEIVED' },
      { headers: { 'Idempotency-Key': 'offer-create-key' } }
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/offers/5/versions',
      { currency: 'CNY', annualBaseSalary: 500000 },
      { headers: { 'Idempotency-Key': 'offer-version-key' } }
    )
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/offers/5/transitions',
      { targetStatus: 'ACCEPTED', userConfirmed: true },
      { headers: { 'Idempotency-Key': 'offer-transition-key' } }
    )
  })

  it('routes offer decision preview and confirm through the campaign endpoints with header key', async () => {
    post.mockResolvedValue({ id: 42, status: 'PREVIEWED', lockVersion: 1 })

    await previewOfferDecisionV7Api(9, { comparisonCurrency: 'CNY' }, 'preview-key')
    await confirmOfferDecisionV7Api(9, 42, { selectedOfferId: 5, userConfirmed: true }, 'confirm-key')

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/career-campaigns/9/offer-decisions/preview',
      { comparisonCurrency: 'CNY' },
      { headers: { 'Idempotency-Key': 'preview-key' } }
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/career-campaigns/9/offer-decisions/42/confirm',
      { selectedOfferId: 5, userConfirmed: true },
      { headers: { 'Idempotency-Key': 'confirm-key' } }
    )
  })

  it('falls back to an empty preview body when no comparison options are given', async () => {
    post.mockResolvedValue({ id: 42, status: 'PREVIEWED' })

    await previewOfferDecisionV7Api(9, undefined, 'preview-empty')

    expect(post).toHaveBeenCalledWith(
      '/career-campaigns/9/offer-decisions/preview',
      {},
      { headers: { 'Idempotency-Key': 'preview-empty' } }
    )
  })

  it('sends interview writes with the idempotency key in the body, never the header', async () => {
    post.mockResolvedValue({ id: 3, rounds: [] })
    put.mockResolvedValue({ id: 8, status: 'PREPARING' })

    await createInterviewProcessV7Api(7, { idempotencyKey: 'proc-key' })
    await createInterviewRoundV7Api(3, {
      roundType: 'TECHNICAL',
      title: '一面',
      idempotencyKey: 'round-key'
    })
    await updateInterviewRoundV7Api(8, {
      title: '一面 · 技术',
      expectedLockVersion: 1,
      idempotencyKey: 'round-update-key'
    })
    await transitionInterviewRoundV7Api(8, {
      targetStatus: 'SCHEDULED',
      expectedLockVersion: 1,
      idempotencyKey: 'round-transition-key'
    })
    await rescheduleInterviewRoundV7Api(8, {
      scheduledStartsAt: '2026-08-01T10:00:00',
      scheduledEndsAt: '2026-08-01T11:00:00',
      timezone: 'Asia/Shanghai',
      expectedLockVersion: 1,
      idempotencyKey: 'round-reschedule-key'
    })
    await linkInterviewRoundCalendarV7Api(8, {
      calendarEventId: 55,
      expectedLockVersion: 1,
      idempotencyKey: 'round-link-key'
    })

    expect(post).toHaveBeenNthCalledWith(1, '/applications/7/interview-process', {
      idempotencyKey: 'proc-key'
    })
    expect(post).toHaveBeenNthCalledWith(2, '/interview-processes/3/rounds', {
      roundType: 'TECHNICAL',
      title: '一面',
      idempotencyKey: 'round-key'
    })
    expect(put).toHaveBeenCalledWith('/interview-rounds/8', {
      title: '一面 · 技术',
      expectedLockVersion: 1,
      idempotencyKey: 'round-update-key'
    })
    expect(post).toHaveBeenNthCalledWith(3, '/interview-rounds/8/transitions', {
      targetStatus: 'SCHEDULED',
      expectedLockVersion: 1,
      idempotencyKey: 'round-transition-key'
    })
    expect(post).toHaveBeenNthCalledWith(4, '/interview-rounds/8/reschedule', {
      scheduledStartsAt: '2026-08-01T10:00:00',
      scheduledEndsAt: '2026-08-01T11:00:00',
      timezone: 'Asia/Shanghai',
      expectedLockVersion: 1,
      idempotencyKey: 'round-reschedule-key'
    })
    expect(post).toHaveBeenNthCalledWith(5, '/interview-rounds/8/link-calendar-event', {
      calendarEventId: 55,
      expectedLockVersion: 1,
      idempotencyKey: 'round-link-key'
    })
  })

  it('sends research writes; only the snapshot carries an (optional) body idempotency key', async () => {
    post.mockResolvedValue({ id: 1 })

    await createResearchSourceV7Api(7, {
      sourceType: 'JOB_DESCRIPTION',
      title: 'JD',
      content: '岗位职责与要求'
    })
    await addResearchSourceVersionV7Api(20, { content: '更新后的 JD 内容' })
    await deactivateResearchSourceV7Api(20)
    await generateResearchSnapshotV7Api(7, { idempotencyKey: 'snapshot-key' })

    expect(post).toHaveBeenNthCalledWith(1, '/applications/7/research-sources', {
      sourceType: 'JOB_DESCRIPTION',
      title: 'JD',
      content: '岗位职责与要求'
    })
    expect(post).toHaveBeenNthCalledWith(2, '/research-sources/20/versions', {
      content: '更新后的 JD 内容'
    })
    expect(post).toHaveBeenNthCalledWith(3, '/research-sources/20/deactivate')
    expect(post).toHaveBeenNthCalledWith(4, '/applications/7/research-snapshots', {
      idempotencyKey: 'snapshot-key'
    })
  })

  it('generates a research snapshot with an empty body when no key is given', async () => {
    post.mockResolvedValue({ id: 1 })

    await generateResearchSnapshotV7Api(7)

    expect(post).toHaveBeenCalledWith('/applications/7/research-snapshots', {})
  })

  it('sends contact writes without idempotency; only activity save carries a body key', async () => {
    post.mockResolvedValue({ id: 1 })
    put.mockResolvedValue({ id: 1 })
    del.mockResolvedValue(undefined)

    await createContactV7Api(7, { displayName: '张三', roleType: 'HR' })
    await updateContactV7Api(15, { displayName: '张三丰', roleType: 'HR' })
    await deleteContactV7Api(15)
    await createActivityV7Api(7, {
      activityType: 'CALL',
      subject: '电话沟通',
      summary: '聊了岗位职责',
      idempotencyKey: 'activity-key'
    })
    await recordActivityV7Api(30, { idempotencyKey: 'record-key' })

    expect(post).toHaveBeenNthCalledWith(1, '/applications/7/contacts', {
      displayName: '张三',
      roleType: 'HR'
    })
    expect(put).toHaveBeenCalledWith('/career-contacts/15', {
      displayName: '张三丰',
      roleType: 'HR'
    })
    expect(del).toHaveBeenCalledWith('/career-contacts/15')
    expect(post).toHaveBeenNthCalledWith(2, '/applications/7/activities', {
      activityType: 'CALL',
      subject: '电话沟通',
      summary: '聊了岗位职责',
      idempotencyKey: 'activity-key'
    })
    expect(post).toHaveBeenNthCalledWith(3, '/career-activities/30/record', {
      idempotencyKey: 'record-key'
    })
  })

  it('sends round-contact writes with no idempotency key', async () => {
    get.mockResolvedValue([])
    post.mockResolvedValue({ id: 1 })
    del.mockResolvedValue(undefined)

    await listRoundContactsV7Api(8)
    await addRoundContactV7Api(8, { contactId: 15, relationshipType: 'INTERVIEWER' })
    await removeRoundContactV7Api(70)

    expect(get).toHaveBeenCalledWith('/interview-rounds/8/contacts')
    expect(post).toHaveBeenCalledWith('/interview-rounds/8/contacts', {
      contactId: 15,
      relationshipType: 'INTERVIEWER'
    })
    expect(del).toHaveBeenCalledWith('/interview-round-contacts/70')
  })
})
