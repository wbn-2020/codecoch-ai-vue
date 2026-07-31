import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: request
}))

import {
  decideEvidenceLearningCandidateApi,
  getEvidenceLearningCandidateApi,
  getEvidenceLearningCandidatesApi,
  normalizeEvidenceLearningCandidate
} from '@/api/evidenceLearning'

describe('evidence learning api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes candidate metadata and keeps LOW, fallback and source references', async () => {
    request.get.mockResolvedValueOnce({
      candidates: [{
        candidateId: 19,
        candidateKey: 'project-evidence-reuse',
        title: '继续观察项目证据复用',
        status: 'PENDING_CONFIRMATION',
        confidenceLevel: 'LOW',
        fallback: true,
        confirmed: 'false',
        requiresUserConfirmation: 'true',
        memoryEnabled: 'false',
        decisionOptions: ['KEEP', 'EDIT', 'CONTINUE', 'REJECT'],
        editDeepLink: '/evidence-assets?tab=usages&candidateId=19',
        limits: ['当前只有 4 条可比较投递。'],
        sources: [{ sourceType: 'EVIDENCE_USAGE', sourceId: 7 }]
      }],
      confidenceLevel: 'LOW',
      fallback: true,
      warnings: ['只允许事实展示。']
    })

    const result = await getEvidenceLearningCandidatesApi({ campaignId: 3 })

    expect(request.get).toHaveBeenCalledWith('/evidence-assets/candidates', {
      params: { campaignId: 3 }
    })
    expect(result.items[0]).toMatchObject({
      id: 19,
      candidateId: 19,
      semanticKey: 'project-evidence-reuse',
      confidenceLevel: 'LOW',
      fallback: true,
      confirmed: false,
      requiresUserConfirmation: true,
      memoryEnabled: false,
      editPath: '/evidence-assets?tab=usages&candidateId=19',
      limits: ['当前只有 4 条可比较投递。'],
      availableDecisions: ['KEEP', 'EDIT', 'CONTINUE', 'REJECT']
    })
    expect(result.items[0].sourceRefs).toEqual([{ sourceType: 'EVIDENCE_USAGE', sourceId: 7 }])
  })

  it('uses the AI candidate detail and four-state decision endpoints', async () => {
    request.get.mockResolvedValueOnce({ id: 19, status: 'PENDING_CONFIRMATION' })
    request.post.mockResolvedValueOnce({
      id: 19,
      decisionCode: 'CONTINUE',
      status: 'PENDING_CONFIRMATION'
    })

    await getEvidenceLearningCandidateApi(19)
    const result = await decideEvidenceLearningCandidateApi(19, {
      decisionCode: 'CONTINUE',
      idempotencyKey: 'candidate-19-continue'
    })

    expect(request.get).toHaveBeenCalledWith('/agent/evidence-learning/candidates/19')
    expect(request.post).toHaveBeenCalledWith(
      '/agent/evidence-learning/candidates/19/decisions',
      {
        decisionCode: 'CONTINUE',
        idempotencyKey: 'candidate-19-continue'
      }
    )
    expect(result.decisionCode).toBe('CONTINUE')
  })

  it('does not turn missing ids into zero and keeps missing capabilities fail-closed', () => {
    const candidate = normalizeEvidenceLearningCandidate({
      title: '待确认观察',
      fallback: 'false',
      stale: '',
      confirmed: '',
      requiresUserConfirmation: ''
    })

    expect(candidate.id).toBeUndefined()
    expect(candidate.candidateId).toBeUndefined()
    expect(candidate.fallback).toBe(false)
    expect(candidate.stale).toBeUndefined()
    expect(candidate.confirmed).toBeUndefined()
    expect(candidate.requiresUserConfirmation).toBeUndefined()
    expect(candidate.availableDecisions).toEqual([])
  })

  it('sends only the explicit candidate decision command fields', async () => {
    request.post.mockResolvedValueOnce({ id: 19, status: 'PENDING_CONFIRMATION' })

    await decideEvidenceLearningCandidateApi(19, {
      decisionCode: 'KEEP',
      idempotencyKey: 'candidate-19-keep',
      userId: 99,
      sourceHash: 'must-not-send'
    } as any)

    expect(request.post).toHaveBeenCalledWith(
      '/agent/evidence-learning/candidates/19/decisions',
      {
        decisionCode: 'KEEP',
        idempotencyKey: 'candidate-19-keep'
      }
    )
  })
})
