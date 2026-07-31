import { describe, expect, it, vi } from 'vitest'

import type { JobApplicationEventVO } from '@/api/v4'
import {
  buildApplicationEventReviewGenerateRequest,
  buildApplicationEventReviewSeed,
  createApplicationEventReviewSingleFlight,
  getApplicationEventLegacyReview,
  getApplicationEventStructuredReview,
  saveApplicationEventWithOptionalReview
} from '@/features/applications'

describe('application event AI review', () => {
  it('builds structured seeds for rejection, no-response, and interview review scenarios', () => {
    const application = {
      id: 8,
      companyName: 'Acme',
      jobTitle: 'Backend Engineer',
      latestEventId: 30,
      latestEventType: 'INTERVIEW_COMPLETED',
      latestEventSummary: '完成技术面试'
    }

    const rejection = buildApplicationEventReviewSeed(application, 'REJECTION')
    const noResponse = buildApplicationEventReviewSeed(application, 'NO_RESPONSE')
    const interview = buildApplicationEventReviewSeed(application, 'INTERVIEW_COMPLETED')

    expect(rejection.observedFacts).toContain('已收到明确拒信或淘汰结果。')
    expect(noResponse.observedFacts).toContain('截至当前仍未收到明确反馈。')
    expect(interview.nextExperimentInputs).toContain('安排一次针对性复练')
    expect(rejection.assumptions.join('')).toContain('不足以判断真实淘汰原因')
    expect(rejection.observedFacts.join('')).not.toContain('真实淘汰原因')
  })

  it('prefers structuredReview while retaining legacy top-level fields separately', () => {
    const event = {
      id: 12,
      reviewJson: JSON.stringify({
        source: 'interview-report',
        assumptions: ['可能是表达问题'],
        reportId: 55,
        structuredReview: {
          schemaVersion: 'APPLICATION_EVENT_REVIEW_V1',
          scenario: 'INTERVIEW_COMPLETED',
          eventScope: 'SIMULATION',
          userInput: {
            owner: 'USER',
            observedFacts: [{ id: 'U1', content: '没有讲清补偿流程', owner: 'USER' }]
          },
          systemFacts: [{ id: 'S1', content: '系统记录面试已完成', owner: 'SYSTEM' }],
          analysis: {
            owner: 'AI',
            summary: '只能对表达过程做有限复盘。',
            limits: ['不能代表真实招聘结果。'],
            signals: [{
              content: '异常链路表达值得复练。',
              factRefs: ['U1'],
              confidenceLevel: 'MEDIUM',
              owner: 'AI'
            }],
            adjustments: ['只调整一个变量。'],
            nextActions: ['重新讲述一次案例。']
          },
          generation: {
            owner: 'SYSTEM',
            status: 'SUCCEEDED',
            fallback: false,
            confidenceLevel: 'MEDIUM',
            confidenceBasis: ['存在用户直接观察。']
          }
        }
      })
    }

    const structured = getApplicationEventStructuredReview(event)
    const legacy = getApplicationEventLegacyReview(event)

    expect(structured?.analysis.summary).toContain('有限复盘')
    expect(structured?.analysis.signals[0]?.factRefs).toEqual(['U1'])
    expect(legacy).toEqual({
      source: 'interview-report',
      assumptions: ['可能是表达问题'],
      reportId: 55
    })
  })

  it('reads the strongly typed structuredReview field from JobApplicationEventVO', () => {
    const event: JobApplicationEventVO = {
      id: 13,
      structuredReview: {
        schemaVersion: 'APPLICATION_EVENT_REVIEW_V1',
        scenario: 'NO_RESPONSE',
        eventScope: 'REAL_JOB',
        userInput: {
          owner: 'USER',
          observedFacts: [{ id: 'U1', content: '仍未收到明确反馈', owner: 'USER' }]
        },
        systemFacts: [],
        analysis: {
          owner: 'AI',
          summary: '当前只能确认尚无明确反馈。',
          limits: ['沉默不等于拒绝。'],
          signals: [],
          adjustments: ['降低跟进频率。'],
          nextActions: ['设置一次停止条件。']
        },
        generation: {
          owner: 'SYSTEM',
          status: 'SUCCEEDED',
          fallback: false,
          confidenceLevel: 'LOW',
          confidenceBasis: ['缺少招聘方明确反馈。']
        }
      }
    }

    expect(getApplicationEventStructuredReview(event)?.analysis.summary)
      .toBe('当前只能确认尚无明确反馈。')
  })

  it('keeps the saved event when review generation fails', async () => {
    const savedEvent = { id: 42, eventType: 'REJECTION' }
    const saveEvent = vi.fn().mockResolvedValue(savedEvent)
    const generateReview = vi.fn().mockRejectedValue(new Error('network timeout'))

    const result = await saveApplicationEventWithOptionalReview({
      saveEvent,
      generateReview
    })

    expect(saveEvent).toHaveBeenCalledTimes(1)
    expect(generateReview).toHaveBeenCalledWith(savedEvent)
    expect(result.event).toBe(savedEvent)
    expect(result.review).toBeUndefined()
    expect(result.reviewError).toBeInstanceOf(Error)
  })

  it('deduplicates concurrent generation and marks forced regeneration explicitly', async () => {
    const gate = createApplicationEventReviewSingleFlight()
    let resolveRequest: (value: string) => void = () => undefined
    const task = vi.fn(() => new Promise<string>((resolve) => {
      resolveRequest = resolve
    }))

    const first = gate.run(42, task)
    const second = gate.run(42, task)

    expect(task).toHaveBeenCalledTimes(1)
    expect(gate.isRunning(42)).toBe(true)
    resolveRequest('done')
    await expect(first).resolves.toBe('done')
    await expect(second).resolves.toBe('done')
    expect(gate.isRunning(42)).toBe(false)

    const request = buildApplicationEventReviewGenerateRequest(
      {
        observedFacts: '事实一\n事实一\n事实二',
        externalFeedback: '明确反馈',
        selfReflection: '我的反思'
      },
      { force: true, requestId: 'review-request-42' }
    )

    expect(request).toEqual({
      observedFacts: ['事实一', '事实二'],
      externalFeedback: '明确反馈',
      selfReflection: '我的反思',
      force: true,
      requestId: 'review-request-42'
    })
  })
})
