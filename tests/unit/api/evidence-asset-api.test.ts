import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: request
}))

import {
  confirmEvidenceUsageResultApi,
  correctEvidenceUsageResultApi,
  createEvidenceUsageResultApi,
  createEvidenceUsageApi,
  getEvidenceAssetResultsApi,
  getEvidenceAssetsOverviewApi,
  getEvidenceAssetUsagesApi,
  normalizeEvidenceEnvelope,
  normalizeEvidenceOverview,
  normalizeEvidenceUsage,
  normalizeEvidenceUsageResult
} from '@/api/evidenceAsset'

describe('evidence asset api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    request.get.mockResolvedValue({})
    request.post.mockResolvedValue({})
  })

  it('normalizes overview, usage and result envelopes without losing trust metadata', async () => {
    request.get
      .mockResolvedValueOnce({
        assetCount: 3,
        usageCount: 2,
        resultCount: 1,
        readiness: [{
          assetType: 'PROJECT_EVIDENCE',
          totalCount: 2,
          readinessStatus: 'PARTIAL'
        }],
        dataCutoffAt: '2026-07-22T10:00:00',
        sourceSetHash: 'source-set-9',
        confidenceLevel: 'LOW',
        fallback: true,
        warnings: ['当前样本不足。'],
        unknowns: ['招聘方决策原因未知。'],
        limits: ['不得比较版本优劣。'],
        sources: [{
          sourceType: 'PROJECT_EVIDENCE',
          sourceId: 7,
          sourceSummary: '项目证据脱敏摘要'
        }]
      })
      .mockResolvedValueOnce({
        records: [{
          id: 11,
          assetType: 'PROJECT_EVIDENCE',
          assetId: 7,
          stale: 1,
          sources: [{ sourceType: 'PROJECT_EVIDENCE', sourceId: 7 }]
        }],
        total: 1,
        pageNo: 1,
        pageSize: 20
      })
      .mockResolvedValueOnce({
        items: [{
          id: 21,
          usageId: 11,
          eventId: '5',
          lockVersion: '7',
          knownFacts: '收到回复\n进入一面',
          unknowns: '最终决策原因',
          limits: ['单一样本不能归因']
        }]
      })

    const overview = await getEvidenceAssetsOverviewApi()
    const usages = await getEvidenceAssetUsagesApi({ applicationId: 5 })
    const results = await getEvidenceAssetResultsApi({ usageId: 11 })

    expect(overview.overview).toMatchObject({
      assetCount: 3,
      usageCount: 2,
      outcomeSampleCount: 1
    })
    expect(overview).toMatchObject({
      dataCutoffAt: '2026-07-22T10:00:00',
      sourceSetHash: 'source-set-9',
      confidenceLevel: 'LOW',
      fallback: true,
      warnings: ['当前样本不足。'],
      unknowns: ['招聘方决策原因未知。'],
      limits: ['不得比较版本优劣。']
    })
    expect(overview.sources[0]).toMatchObject({
      sourceType: 'PROJECT_EVIDENCE',
      sourceId: 7,
      summary: '项目证据脱敏摘要'
    })
    expect(usages.items[0]).toMatchObject({ id: 11, stale: true })
    expect(results.items[0]).toMatchObject({
      eventId: 5,
      lockVersion: 7,
      knownFacts: ['收到回复', '进入一面'],
      unknowns: ['最终决策原因'],
      limits: ['单一样本不能归因']
    })
    expect(request.get).toHaveBeenNthCalledWith(2, '/evidence-assets/usages', {
      params: { applicationId: 5 }
    })
  })

  it('uses the narrow usage and result write endpoints with client idempotency metadata', async () => {
    request.post
      .mockResolvedValueOnce({ id: 11, assetType: 'PROJECT_EVIDENCE', assetId: 7 })
      .mockResolvedValueOnce({ id: 21, usageId: 11, outcomeCode: 'REPLIED' })
      .mockResolvedValueOnce({ id: 21, usageId: 11, status: 'CONFIRMED' })

    await createEvidenceUsageApi(5, {
      assetType: 'PROJECT_EVIDENCE',
      assetId: 7,
      assetVersion: '2',
      usageScene: 'APPLICATION_SUBMISSION',
      idempotencyKey: 'usage-5-7-v2'
    })
    await createEvidenceUsageResultApi(11, {
      eventType: 'APPLICATION_EVENT',
      eventId: 5,
      outcomeCode: 'REPLIED',
      knownFacts: ['收到招聘方回复'],
      unknowns: ['是否进入面试未知'],
      idempotencyKey: 'result-11'
    })
    await confirmEvidenceUsageResultApi(21, {
      expectedLockVersion: 1,
      idempotencyKey: 'confirm-21'
    })

    expect(request.post).toHaveBeenNthCalledWith(1, '/applications/5/evidence-usages', {
      assetType: 'PROJECT_EVIDENCE',
      assetId: 7,
      assetVersion: '2',
      usageScene: 'APPLICATION_SUBMISSION',
      idempotencyKey: 'usage-5-7-v2'
    })
    expect(request.post).toHaveBeenNthCalledWith(2, '/evidence-usages/11/results', {
      eventType: 'APPLICATION_EVENT',
      eventId: 5,
      outcomeCode: 'REPLIED',
      knownFacts: ['收到招聘方回复'],
      unknowns: ['是否进入面试未知'],
      idempotencyKey: 'result-11'
    })
    expect(request.post).toHaveBeenNthCalledWith(3, '/evidence-usage-results/21/confirm', {
      expectedLockVersion: 1,
      idempotencyKey: 'confirm-21'
    })
  })

  it('preserves explicit empty correction fields in the narrow result command', async () => {
    request.post.mockResolvedValueOnce({
      id: 21,
      usageId: 11,
      status: 'CORRECTED'
    })

    await correctEvidenceUsageResultApi(21, {
      expectedLockVersion: 7,
      outcomeCode: 'UNKNOWN',
      knownFacts: [],
      externalFeedbackText: '',
      userInterpretationText: '',
      unknowns: [],
      limits: [],
      reason: '用户更正结果反馈',
      idempotencyKey: 'result-correct-21'
    })

    expect(request.post).toHaveBeenCalledWith('/evidence-usage-results/21/correct', {
      expectedLockVersion: 7,
      outcomeCode: 'UNKNOWN',
      knownFacts: [],
      externalFeedbackText: '',
      userInterpretationText: '',
      unknowns: [],
      limits: [],
      reason: '用户更正结果反馈',
      idempotencyKey: 'result-correct-21'
    })
  })

  it('drops forbidden or unknown fields from every evidence write payload', async () => {
    await createEvidenceUsageApi(5, {
      assetType: 'PROJECT_EVIDENCE',
      assetId: 7,
      assetVersion: '2',
      usageScene: 'APPLICATION_SUBMISSION',
      idempotencyKey: 'usage-5-7-v2',
      userId: 99,
      sourceHash: 'must-not-send'
    } as any)
    await createEvidenceUsageResultApi(11, {
      eventType: 'APPLICATION_EVENT',
      eventId: 5,
      outcomeCode: 'UNKNOWN',
      knownFacts: [],
      idempotencyKey: 'result-11',
      contentHash: 'must-not-send'
    } as any)
    await confirmEvidenceUsageResultApi(21, {
      expectedLockVersion: 1,
      idempotencyKey: 'confirm-21',
      userId: 99
    } as any)

    expect(request.post.mock.calls[0][1]).not.toHaveProperty('userId')
    expect(request.post.mock.calls[0][1]).not.toHaveProperty('sourceHash')
    expect(request.post.mock.calls[1][1]).not.toHaveProperty('contentHash')
    expect(request.post.mock.calls[2][1]).not.toHaveProperty('userId')
  })

  it('keeps missing identity and count fields missing, and parses string booleans safely', () => {
    const envelope = normalizeEvidenceEnvelope(
      {
        items: [{
          id: '11',
          stale: 'false',
          fallback: 'false'
        }]
      },
      normalizeEvidenceUsage
    )
    const usage = envelope.items[0]

    expect(envelope.total).toBeUndefined()
    expect(usage).toMatchObject({
      id: 11,
      stale: false,
      fallback: false
    })
    expect(usage.assetType).toBeUndefined()
    expect(usage.assetId).toBeUndefined()

    const overview = normalizeEvidenceOverview({
      readiness: [{ label: '项目证据' }]
    })
    expect(overview.overview.assetCount).toBeUndefined()
    expect(overview.overview.readiness[0]?.assetType).toBeUndefined()
    expect(overview.overview.readiness[0]?.totalCount).toBeUndefined()
    expect(overview.confidenceLevel).toBe('UNKNOWN')

    const result = normalizeEvidenceUsageResult({})
    expect(result.confidenceLevel).toBe('UNKNOWN')
    expect(result.stale).toBeUndefined()

    expect(normalizeEvidenceUsage({ stale: '   ', fallback: '' })).toMatchObject({
      stale: undefined,
      fallback: undefined
    })
  })

  it('keeps result feedback fields separate while preserving coverage unknowns and false fallback', () => {
    const result = normalizeEvidenceUsageResult({
      id: '21',
      usageId: '11',
      knownFacts: '收到回复',
      externalFeedbackText: '招聘方回复',
      userInterpretationText: '可能与项目证据有关',
      unknownsFromCoverage: ['是否进入下一轮未知'],
      limitsFromCoverage: ['单一样本不能归因'],
      fallback: 'false',
      sourceType: 'APPLICATION_EVENT',
      sourceId: 5
    })

    expect(result).toMatchObject({
      id: 21,
      usageId: 11,
      knownFacts: ['收到回复'],
      unknowns: ['是否进入下一轮未知'],
      limits: ['单一样本不能归因'],
      fallback: false
    })
    expect(result.externalFeedbackText).not.toBe(result.userInterpretationText)
    expect(result.sources).toEqual([{
      sourceType: 'APPLICATION_EVENT',
      sourceId: 5,
      sourceVersion: undefined,
      sourceHash: undefined
    }])
  })
})
