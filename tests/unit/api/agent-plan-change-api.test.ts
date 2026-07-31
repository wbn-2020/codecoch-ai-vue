import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get,
    post
  }
}))

import {
  confirmAgentPlanChangeSetApi,
  createAgentPlanChangePreviewApi,
  decideAgentReviewPlanSuggestionsApi,
  getAgentPlanChangeSetApi,
  getAgentPlanChangeSetsApi,
  getAgentReviewPlanSuggestionsApi
} from '@/api/agentPlanChange'

describe('agent plan change api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    get.mockResolvedValue([])
    post.mockResolvedValue({})
  })

  it('uses the deployed suggestion, preview, change-set, and confirm contracts', async () => {
    await getAgentReviewPlanSuggestionsApi(88, { silentError: true })
    await decideAgentReviewPlanSuggestionsApi(88, {
      requestId: 'decision-request',
      idempotencyKey: 'decision-key-123',
      expectedReviewVersion: 2,
      decisions: [{
        suggestionId: 301,
        decision: 'ACCEPTED',
        expectedDecisionVersion: 1
      }]
    }, { silentError: true })
    await createAgentPlanChangePreviewApi(88, {
      requestId: 'preview-request',
      idempotencyKey: 'preview-key-123',
      expectedReviewVersion: 2,
      acceptedSuggestionIds: [301],
      targetDate: '2026-07-19',
      maxTotalMinutes: 120
    }, { silentError: true })
    await getAgentPlanChangeSetApi(501, { silentError: true })
    await confirmAgentPlanChangeSetApi(501, {
      requestId: 'confirm-request',
      idempotencyKey: 'confirm-key-123',
      previewVersion: 1,
      previewHash: 'preview-hash',
      acknowledgedWarningCodes: ['LOW_CONFIDENCE_REVIEW']
    }, { silentError: true })

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/agent/reviews/88/plan-suggestions',
      { silentError: true }
    )
    expect(post).toHaveBeenNthCalledWith(
      1,
      '/agent/reviews/88/plan-suggestions/decisions',
      expect.objectContaining({
        expectedReviewVersion: 2,
        decisions: [expect.objectContaining({ suggestionId: 301, decision: 'ACCEPTED' })]
      }),
      { silentError: true }
    )
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/agent/reviews/88/plan-change-previews',
      expect.objectContaining({
        acceptedSuggestionIds: [301],
        targetDate: '2026-07-19',
        maxTotalMinutes: 120
      }),
      { silentError: true }
    )
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/agent/plan-change-sets/501',
      { silentError: true }
    )
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/agent/plan-change-sets/501/confirm',
      expect.objectContaining({
        previewVersion: 1,
        previewHash: 'preview-hash',
        acknowledgedWarningCodes: ['LOW_CONFIDENCE_REVIEW']
      }),
      { silentError: true }
    )
  })

  it('serializes today status filters as the backend comma-separated query', async () => {
    await getAgentPlanChangeSetsApi({
      targetDate: '2026-07-18',
      status: ['CONFIRMED_WAITING_PLAN', 'APPLIED', 'APPLY_FAILED']
    }, { silentError: true })

    expect(get).toHaveBeenCalledWith(
      '/agent/plan-change-sets',
      {
        silentError: true,
        params: {
          targetDate: '2026-07-18',
          status: 'CONFIRMED_WAITING_PLAN,APPLIED,APPLY_FAILED'
        }
      }
    )
  })
})
