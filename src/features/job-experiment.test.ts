import { describe, expect, it } from 'vitest'

import {
  buildJobExperimentEvidenceCoverage,
  confidenceLabel,
  jobExperimentRelationOptions,
  shouldKeepConclusionWeak
} from './job-experiment'

describe('job experiment presentation helpers', () => {
  it('labels low-confidence sample warnings as weak evidence', () => {
    expect(confidenceLabel('LOW')).toBe('低置信度')
    expect(shouldKeepConclusionWeak({
      applicationCount: 4,
      interviewCompletedCount: 0,
      sampleInsufficient: true,
      sampleWarning: '当前样本不足，不能判断简历版本是否优于其他版本。'
    })).toBe(true)
  })

  it('only exposes relation types that the backend can verify today', () => {
    expect(jobExperimentRelationOptions.map((item) => item.value)).toEqual([
      'RESUME_VERSION',
      'TARGET_JOB',
      'JD_ANALYSIS',
      'MATCH_REPORT',
      'JOB_APPLICATION',
      'PROJECT_EVIDENCE'
    ])
  })

  it('builds evidence coverage from supported relation types only', () => {
    const coverage = buildJobExperimentEvidenceCoverage([
      { relationType: 'RESUME_VERSION' },
      { relationType: 'MATCH_REPORT' },
      { relationType: 'UNKNOWN_SOURCE' }
    ])

    expect(coverage.total).toBe(6)
    expect(coverage.covered).toBe(2)
    expect(coverage.items.find((item) => item.type === 'MATCH_REPORT')?.covered).toBe(true)
    expect(coverage.items.map((item) => item.type)).not.toContain('UNKNOWN_SOURCE')
  })

  it('does not downgrade high confidence experiments just because they include a cautionary sample warning', () => {
    expect(shouldKeepConclusionWeak({
      applicationCount: 12,
      interviewCompletedCount: 3,
      confidenceLevel: 'HIGH',
      sampleInsufficient: false,
      sampleWarning: '样本可用于高置信复盘，但仍需说明岗位、渠道、时间窗口等影响因素。'
    })).toBe(false)
  })
})
