import { describe, expect, it } from 'vitest'

import {
  confidenceLabel,
  confidenceTagType,
  normalizeInterviewReportSections,
  rubricLabel
} from './interview-report'

describe('interview report feature', () => {
  it('normalizes rubric scores and keeps sample-insufficient warnings explicit', () => {
    const sections = normalizeInterviewReportSections({
      rubricScores: [
        {
          dimension: 'TECHNICAL_DEPTH',
          score: 3,
          comment: '回答能覆盖主流程',
          sampleInsufficient: true
        },
        null,
        'bad'
      ] as unknown as never[]
    })

    expect(sections.rubricScores).toHaveLength(1)
    expect(sections.rubricScores[0]).toMatchObject({
      dimension: 'TECHNICAL_DEPTH',
      score: 3,
      sampleInsufficient: true,
      sampleWarning: '样本不足，仅作为候选判断'
    })
    expect(rubricLabel(sections.rubricScores[0].dimension)).toBe('技术深度')
  })

  it('normalizes follow-up tree replay entries without accepting malformed values', () => {
    const sections = normalizeInterviewReportSections({
      followUpTree: [
        {
          followUpMessageId: 12,
          answerSummary: '只说明了缓存命中，没有说明一致性',
          exposedRisk: '风险意识不足'
        },
        undefined
      ] as unknown as never[]
    })

    expect(sections.followUpTree).toEqual([
      {
        followUpMessageId: 12,
        answerSummary: '只说明了缓存命中，没有说明一致性',
        exposedRisk: '风险意识不足',
        followUpIntent: 'FOLLOW_UP'
      }
    ])
  })

  it('normalizes advice evidence confidence and sample warnings', () => {
    const sections = normalizeInterviewReportSections({
      adviceEvidence: [
        {
          title: '补强风险边界',
          confidence: 'medium',
          sampleInsufficient: true,
          evidenceSources: [{ sourceType: 'ANSWER', sourceSummary: '追问未覆盖降级策略' }]
        }
      ]
    })

    expect(confidenceLabel(sections.adviceEvidence[0].confidence)).toBe('中置信度')
    expect(confidenceTagType(sections.adviceEvidence[0].confidence)).toBe('warning')
    expect(sections.adviceEvidence[0].sampleWarning).toBe('样本不足，不能作为强结论')
  })
})
