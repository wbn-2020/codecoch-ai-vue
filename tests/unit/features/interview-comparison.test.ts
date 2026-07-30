import { describe, expect, it, vi } from 'vitest'

import {
  extractRemediationRequirementIds,
  normalizeInterviewComparison,
  normalizeInterviewRemediation,
  normalizeInterviewRemediationOptions,
  normalizeInterviewReplayEligibility,
  normalizeInterviewReportAdvanced,
  storeInterviewComparison,
  validateInterviewComparisonSelection
} from '@/features/interview-comparison'

describe('interview advanced normalization', () => {
  it('keeps missing trust and availability fields conservative', () => {
    const report = normalizeInterviewReportAdvanced({
      id: 12,
      interviewId: 30,
      trustStatus: 'FALLBACK',
      fallback: true
    })

    expect(report).toMatchObject({
      reportId: 12,
      interviewId: 30,
      fallback: true,
      remediationAvailable: false,
      strongRemediationAvailable: false,
      sourceRequirementIds: []
    })
    expect(report.comparisonAvailable).toBeUndefined()
    expect(report.replayEligibility).toEqual({ state: 'UNKNOWN' })
  })

  it('normalizes replay eligibility independently from comparison availability', () => {
    const eligible = normalizeInterviewReportAdvanced({
      id: 12,
      interviewId: 30,
      comparisonAvailable: false,
      replayEligibility: {
        state: 'ELIGIBLE',
        policyVersion: 'REPLAY_V2'
      }
    })
    const ineligible = normalizeInterviewReportAdvanced({
      id: 13,
      interviewId: 31,
      comparisonAvailable: true,
      replayEligibilityState: 'INELIGIBLE',
      replayReasonCode: 'SAMPLE_INSUFFICIENT',
      replayReasonMessage: '样本不足',
      replayQualityGate: {
        passed: false,
        actual: 2,
        required: 3
      }
    })

    expect(eligible.replayEligibility).toEqual({
      state: 'ELIGIBLE',
      policyVersion: 'REPLAY_V2'
    })
    expect(ineligible.replayEligibility).toEqual({
      state: 'INELIGIBLE',
      reasonCode: 'SAMPLE_INSUFFICIENT',
      reasonMessage: '样本不足',
      qualityGate: {
        passed: false,
        actual: 2,
        required: 3
      }
    })
  })

  it('normalizes the flat replay-options response contract', () => {
    expect(normalizeInterviewReplayEligibility({
      state: 'ELIGIBLE',
      replayAvailable: true,
      policyVersion: 'REPLAY_ELIGIBILITY_V2'
    })).toEqual({
      state: 'ELIGIBLE',
      policyVersion: 'REPLAY_ELIGIBILITY_V2'
    })

    expect(normalizeInterviewReplayEligibility({
      replayAvailable: false,
      reasonCode: 'REPORT_NOT_GENERATED',
      reasonMessage: '源面试报告尚未生成'
    })).toEqual({
      state: 'INELIGIBLE',
      reasonCode: 'REPORT_NOT_GENERATED',
      reasonMessage: '源面试报告尚未生成'
    })
  })

  it('resolves remediation target session from nested interview data', () => {
    const remediation = normalizeInterviewRemediation({
      id: 9,
      sourceReportId: 12,
      sourceRequirementIds: [4, 4, 7],
      idempotentReplay: true,
      interview: {
        id: 88,
        title: '复练：Java 后端'
      }
    })

    expect(remediation.targetSessionId).toBe(88)
    expect(remediation.sourceRequirementIds).toEqual([4, 7])
    expect(remediation.idempotentReplay).toBe(true)
  })

  it('normalizes backend remediation options conservatively', () => {
    const result = normalizeInterviewRemediationOptions({
      interviewId: 42,
      sourceReportId: 88,
      trustStatus: 'VERIFIED',
      options: [
        {
          optionKey: 'FAILED_QUESTION-1',
          reasonType: 'FAILED_QUESTION',
          title: '缓存更新失败如何补偿',
          practicePurpose: '补充失败补偿和监控闭环',
          sourceRequirementIds: [7, 7],
          strongRemediation: true
        },
        {
          title: '缺少必要字段'
        }
      ]
    })

    expect(result.options).toHaveLength(1)
    expect(result.options[0]).toMatchObject({
      optionKey: 'FAILED_QUESTION-1',
      sourceRequirementIds: [7],
      strongRemediation: true
    })
  })
})

describe('interview comparison normalization', () => {
  it('preserves backend reasons and refuses to promote incomplete data to comparable', () => {
    const comparison = normalizeInterviewComparison({
      comparable: true,
      reportIds: [11, 12],
      unavailableReasons: [
        { code: 'RUBRIC_VERSION_MISMATCH', message: '量表版本不同' }
      ],
      rounds: [
        { reportId: 11, rubricScores: { TECHNICAL_DEPTH: 3 } },
        { reportId: 12, rubricScores: { TECHNICAL_DEPTH: 4 } }
      ]
    })

    expect(comparison.comparable).toBe(false)
    expect(comparison.unavailableReasons[0]).toEqual({
      code: 'RUBRIC_VERSION_MISMATCH',
      message: '所选报告使用了不同的评分量表版本。'
    })
  })

  it('normalizes rounds, dimensions, sample warnings and optional requirement improvements', () => {
    const comparison = normalizeInterviewComparison({
      contractVersion: 'INTERVIEW_COMPARISON_V2',
      legacySnapshotNormalized: true,
      comparable: true,
      reportIds: ['11', 12],
      firstTotalScore: 70,
      latestTotalScore: 82,
      totalScoreDelta: 12,
      warnings: [
        { code: 'SAMPLE_INSUFFICIENT_REPORT', message: '部分报告样本不足' }
      ],
      rounds: [
        {
          reportId: 11,
          totalScore: 70,
          sampleInsufficient: true,
          rubricVersion: 'LEGACY_STAGE_SCORES_V1:abc',
          normalizationSource: 'LEGACY_STAGE_SCORES',
          warnings: [{
            code: 'RUBRIC_VERSION_NORMALIZED',
            message: 'The known fallback dimension contract was normalized to the canonical version.'
          }],
          rubricScores: { TECHNICAL_DEPTH: 3 }
        },
        {
          reportId: 12,
          totalScore: 82,
          rubricScores: { TECHNICAL_DEPTH: 4 }
        }
      ],
      dimensions: [
        {
          dimension: 'TECHNICAL_DEPTH',
          firstScore: 3,
          latestScore: 4,
          delta: 1,
          points: [
            { reportId: 11, score: 3 },
            { reportId: 12, score: 4, deltaFromPrevious: 1 }
          ]
        }
      ],
      requirementImprovements: [
        {
          requirementId: 6,
          requirementName: '并发编程',
          firstStatus: 'WEAK',
          latestStatus: 'COVERED',
          evidence: '第二轮回答给出了锁竞争处理方案'
        }
      ]
    })

    expect(comparison.comparable).toBe(true)
    expect(comparison.contractVersion).toBe('INTERVIEW_COMPARISON_V2')
    expect(comparison.legacySnapshotNormalized).toBe(true)
    expect(comparison.rounds[0]?.sampleInsufficient).toBe(true)
    expect(comparison.rounds[0]?.rubricVersion).toBe('LEGACY_STAGE_SCORES_V1:abc')
    expect(comparison.rounds[0]?.normalizationSource).toBe('LEGACY_STAGE_SCORES')
    expect(comparison.rounds[0]?.warnings[0]?.message).toBe('已将已知的历史评分维度合同规范化为统一量表版本。')
    expect(comparison.dimensions[0]?.points[1]?.deltaFromPrevious).toBe(1)
    expect(comparison.requirementImprovements[0]?.latestStatus).toBe('COVERED')
  })

  it('localizes controlled backend comparison reasons without hiding the trust result', () => {
    const comparison = normalizeInterviewComparison({
      comparable: false,
      reportIds: [11, 12],
      unavailableReasons: [{
        code: 'REPORT_UNTRUSTED',
        message: 'Report scoring data is fallback, incomplete, or untrusted'
      }],
      warnings: [{
        code: 'RUBRIC_VERSION_INFERRED',
        message: 'A compatibility rubric identity was derived from the exact legacy stage dimension contract.'
      }],
      rounds: [
        { reportId: 11, rubricScores: {} },
        { reportId: 12, rubricScores: {} }
      ]
    })

    expect(comparison.comparable).toBe(false)
    expect(comparison.unavailableReasons[0]?.message).toBe(
      '报告评分为降级、数据不完整或可信度不足，暂不生成趋势结论。'
    )
    expect(comparison.warnings[0]?.message).toBe(
      '历史报告未保存量表标识，已按原有评分维度生成兼容量表版本。'
    )
  })

  it('uses the persisted comparison id without browser session storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')

    const key = storeInterviewComparison(normalizeInterviewComparison({
      id: 900,
      comparable: false,
      reportIds: [11, 12],
      unavailableReasons: [{ code: 'RUBRIC_DATA_MISSING', message: '缺少评分维度' }]
    }))

    expect(key).toBe('900')
    expect(setItem).not.toHaveBeenCalled()
  })
})

describe('interview comparison selection', () => {
  const base = {
    reportStatus: 'GENERATED',
    title: 'Java 面试',
    targetJobId: 100
  }

  it('only accepts two to ten generated reports from the same target job', () => {
    expect(validateInterviewComparisonSelection([
      { ...base, interviewId: 1 },
      { ...base, interviewId: 2 }
    ])).toEqual({
      valid: true,
      reason: '',
      targetJobId: 100
    })

    expect(validateInterviewComparisonSelection([
      { ...base, interviewId: 1 },
      { ...base, interviewId: 2, targetJobId: 101 }
    ])).toMatchObject({
      valid: false,
      reason: '请选择同一目标岗位下的面试记录。'
    })
  })

  it.each(['GENERATED', 'COMPLETED', 'SUCCESS'])(
    'accepts the %s successful report status',
    (reportStatus) => {
      expect(validateInterviewComparisonSelection([
        { ...base, interviewId: 1, reportStatus },
        { ...base, interviewId: 2, reportStatus }
      ])).toMatchObject({
        valid: true,
        targetJobId: 100
      })
    }
  )

  it.each(['GENERATING', 'FAILED', ''])(
    'rejects the %s non-successful report status',
    (reportStatus) => {
      expect(validateInterviewComparisonSelection([
        { ...base, interviewId: 1, reportStatus },
        { ...base, interviewId: 2 }
      ])).toMatchObject({
        valid: false,
        reason: '只能比较报告已成功生成的面试。'
      })
    }
  )

  it('extracts only weak, missing or conflicting job requirements for remediation', () => {
    expect(extractRemediationRequirementIds({
      requirements: [
        { requirementId: 1, coverageLevel: 'COVERED' },
        { requirementId: 2, coverageLevel: 'WEAK' },
        { requirementId: 3, coverageLevel: 'MISSING' },
        { requirementId: 4, coverageLevel: 'CONFLICT' }
      ],
      groups: [
        {
          items: [
            { requirementId: 3, status: 'MISSING' },
            { requirementId: 5, status: 'UNVERIFIED' }
          ]
        }
      ]
    })).toEqual([3, 4, 2])
  })
})
