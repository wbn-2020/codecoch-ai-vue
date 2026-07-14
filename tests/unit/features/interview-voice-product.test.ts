import { beforeEach, describe, expect, it } from 'vitest'

import {
  appendConfirmedVoiceTranscript,
  buildVoiceDeliveryFacts,
  buildVoiceDeliveryTimeline,
  chooseInterviewVoiceRecorderProfile,
  hasVoiceDeliveryEvidence,
  interviewScenarioCandidateCodes,
  isInterviewVoiceTaskTerminal,
  loadInterviewVoiceProductContext,
  normalizeVoiceDeliverySummary,
  normalizeInterviewScenario,
  saveInterviewVoiceProductContext
} from '@/features/interview-voice-product'

describe('interview voice product', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('normalizes published scenario stages, budgets and rubric facts', () => {
    const scenario = normalizeInterviewScenario({
      scenarioVersionId: 21,
      scenarioCode: 'SYSTEM_DESIGN',
      versionNo: 3,
      scenarioName: '系统设计面试',
      rubricVersionId: 9,
      versionStatus: 'PUBLISHED',
      script: {
        stages: [
          {
            stageCode: 'CLARIFY',
            stageName: '需求澄清',
            expectedQuestionCount: 2,
            timeBudgetMinutes: 6
          },
          {
            code: 'DESIGN',
            name: '方案设计',
            questionCount: 3,
            estimatedMinutes: 12
          }
        ],
        rubric: {
          dimensions: [
            { code: 'STRUCTURE', name: '结构', weight: 40 },
            { code: 'TRADEOFF', name: '取舍', weight: 60 }
          ]
        }
      }
    })

    expect(scenario.questionCount).toBe(5)
    expect(scenario.estimatedMinutes).toBe(18)
    expect(scenario.stages.map((item) => item.name)).toEqual(['需求澄清', '方案设计'])
    expect(scenario.rubricSummary).toContain('结构 40')
    expect(interviewScenarioCandidateCodes('system')[0]).toBe('SYSTEM_DESIGN')
    expect(interviewScenarioCandidateCodes('technical').slice(0, 3)).toEqual([
      'TECHNICAL_FOUNDATION',
      'TECHNICAL_ROUND_1',
      'TECHNICAL_ROUND_2'
    ])
  })

  it('persists pending bindings without turning them into bound state', () => {
    saveInterviewVoiceProductContext({
      sessionId: 88,
      voicePreflightReady: true,
      scenarioBindingStatus: 'PENDING',
      bindingMessage: '等待服务端确认',
      savedAt: '2026-07-11T00:00:00.000Z'
    })

    expect(loadInterviewVoiceProductContext(88)).toMatchObject({
      sessionId: 88,
      voicePreflightReady: true,
      scenarioBindingStatus: 'PENDING',
      bindingMessage: '等待服务端确认'
    })
    expect(loadInterviewVoiceProductContext(89)).toBeNull()
  })

  it('keeps transcript merging idempotent and task terminals explicit', () => {
    expect(appendConfirmedVoiceTranscript('原回答', '语音补充')).toBe('原回答\n\n语音补充')
    expect(appendConfirmedVoiceTranscript('原回答\n\n语音补充', '语音补充')).toBe('原回答\n\n语音补充')
    expect(isInterviewVoiceTaskTerminal('RUNNING')).toBe(false)
    expect(isInterviewVoiceTaskTerminal('TIMED_OUT')).toBe(true)
  })

  it('maps only supported Opus recorder MIME types to backend encodings', () => {
    const webmRecorder = {
      isTypeSupported: (mimeType: string) => mimeType === 'audio/webm;codecs=opus'
    } as typeof MediaRecorder
    const oggRecorder = {
      isTypeSupported: (mimeType: string) => mimeType === 'audio/ogg;codecs=opus'
    } as typeof MediaRecorder
    const unsupportedRecorder = {
      isTypeSupported: () => false
    } as unknown as typeof MediaRecorder

    expect(chooseInterviewVoiceRecorderProfile(webmRecorder)).toEqual({
      mimeType: 'audio/webm;codecs=opus',
      encoding: 'WEBM_OPUS'
    })
    expect(chooseInterviewVoiceRecorderProfile(oggRecorder)).toEqual({
      mimeType: 'audio/ogg;codecs=opus',
      encoding: 'OGG_OPUS'
    })
    expect(chooseInterviewVoiceRecorderProfile(unsupportedRecorder)).toBeNull()
  })

  it('does not invent pause metrics when word timestamps are unavailable', () => {
    const facts = buildVoiceDeliveryFacts({
      analysisId: 1,
      sessionId: 2,
      taskStatus: 'SUCCEEDED',
      speakingRatePerMinute: 168.4,
      fillerCount: 2,
      pauseMetricsAvailable: false,
      timestampsAvailable: false
    })

    expect(facts.find((item) => item.key === 'rate')?.value).toBe('168 字/词每分钟')
    expect(facts.find((item) => item.key === 'fillers')?.value).toBe('2 次')
    expect(facts.find((item) => item.key === 'pauses')).toMatchObject({
      value: '不可用',
      available: false
    })
    expect(facts.some((item) => item.key === 'longest-pause')).toBe(false)
  })

  it('keeps unavailable report delivery metrics explicit instead of inventing zero values', () => {
    const summary = normalizeVoiceDeliverySummary({
      session_id: 8,
      available: false,
      task_status: 'FAILED',
      missing_reason: 'VOICE_DELIVERY_ANALYSIS_FAILED'
    }, 8)

    expect(summary).toMatchObject({
      sessionId: 8,
      available: false,
      status: 'FAILED',
      missingReason: 'VOICE_DELIVERY_ANALYSIS_FAILED'
    })
    expect(summary.speakingRatePerMinute).toBeUndefined()
    expect(buildVoiceDeliveryFacts(summary)).toEqual([])
  })

  it('keeps nullable metrics unavailable and requires recorded chunks for analysis', () => {
    const summary = normalizeVoiceDeliverySummary({
      sessionId: 36,
      status: 'SUCCEEDED',
      available: false,
      audioDurationMs: null,
      wordCount: null,
      speakingRatePerMinute: null,
      fillerCount: null,
      pauseCount: null,
      averagePauseMs: null,
      longestPauseMs: null
    })

    expect(summary.audioDurationMs).toBeUndefined()
    expect(summary.wordCount).toBeUndefined()
    expect(summary.speakingRatePerMinute).toBeUndefined()
    expect(summary.fillerCount).toBeUndefined()
    expect(summary.pauseCount).toBeUndefined()
    expect(summary.averagePauseMs).toBeUndefined()
    expect(summary.longestPauseMs).toBeUndefined()
    expect(hasVoiceDeliveryEvidence(0, 0)).toBe(false)
    expect(hasVoiceDeliveryEvidence(5000, 0)).toBe(false)
    expect(hasVoiceDeliveryEvidence(0, 3)).toBe(false)
    expect(hasVoiceDeliveryEvidence(5000, 3)).toBe(true)
  })

  it('builds a bounded chronological history trend from successful persisted analyses only', () => {
    const items = Array.from({ length: 60 }, (_, index) => ({
      interviewId: index + 1,
      interviewName: `Round ${index + 1}`,
      createdAt: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T10:00:00`,
      voiceDeliverySummary: {
        sessionId: index + 1,
        analysisId: index + 101,
        available: index !== 3,
        status: index === 3 ? 'FAILED' : 'SUCCEEDED',
        speakingRatePerMinute: 120 + index,
        fillerCount: index
      }
    }))

    const trend = buildVoiceDeliveryTimeline(items)

    expect(trend).toHaveLength(50)
    expect(trend.every((item) => item.available)).toBe(true)
    expect(new Date(trend[0].occurredAt).getTime())
      .toBeLessThanOrEqual(new Date(trend.at(-1)!.occurredAt).getTime())
  })
})
