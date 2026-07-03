import { describe, expect, it } from 'vitest'

import {
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
      'JOB_APPLICATION',
      'PROJECT_EVIDENCE'
    ])
  })
})
