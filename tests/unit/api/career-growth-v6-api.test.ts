import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/utils/request', () => ({
  default: {
    get,
    post,
    put: vi.fn(),
    delete: vi.fn()
  }
}))

import {
  generateApplicationEventAiReviewApi,
  generateCareerInterviewPreparationApi,
  getCareerCalendarEventsApi,
  getCareerInterviewPreparationApi
} from '@/api/careerGrowth'

describe('career growth v6 api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  it('preserves preparation metadata from calendar event responses', async () => {
    get.mockResolvedValue([{
      id: 9,
      title: '技术面试',
      eventType: 'TECHNICAL_INTERVIEW',
      startsAt: '2026-07-20T10:00:00',
      endsAt: '2026-07-20T11:00:00',
      timezone: 'Asia/Shanghai',
      preparationStatus: 'READY',
      preparationStale: 1,
      preparationGeneratedAt: '2026-07-18T18:00:00',
      preparationSourceHash: 'abc123'
    }])

    const events = await getCareerCalendarEventsApi()

    expect(events[0]).toEqual(expect.objectContaining({
      id: 9,
      preparationStatus: 'READY',
      preparationStale: true,
      preparationGeneratedAt: '2026-07-18T18:00:00',
      preparationSourceHash: 'abc123'
    }))
  })

  it('uses the deployed review and preparation GET/POST contracts', async () => {
    post.mockResolvedValueOnce({
      userInput: { owner: 'USER', observedFacts: [] },
      systemFacts: [],
      analysis: { owner: 'AI', limits: [], signals: [], adjustments: [], nextActions: [] },
      generation: { owner: 'SYSTEM', fallback: false, confidenceBasis: [] }
    })
    get.mockResolvedValueOnce(null)
    post.mockResolvedValueOnce({
      calendarEventId: 9,
      timeBudgetMinutes: 120,
      facts: [],
      limits: [],
      focusAreas: [],
      projectStories: [],
      practiceQuestions: [],
      checklist: [],
      schedule: [],
      nextActions: [],
      evidenceSources: [],
      fallback: true
    })

    await generateApplicationEventAiReviewApi(7, 8, {
      observedFacts: ['收到拒信'],
      force: true,
      requestId: 'review-8'
    })
    await getCareerInterviewPreparationApi(9)
    await generateCareerInterviewPreparationApi(9, {
      timeBudgetMinutes: 120,
      force: true
    })

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/applications/7/events/8/ai-review',
      {
        observedFacts: ['收到拒信'],
        force: true,
        requestId: 'review-8'
      }
    )
    expect(get).toHaveBeenCalledWith('/career-calendar/events/9/preparation')
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/career-calendar/events/9/preparation',
      { timeBudgetMinutes: 120, force: true }
    )
  })
})
