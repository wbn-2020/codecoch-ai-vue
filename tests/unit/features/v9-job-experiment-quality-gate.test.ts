import { describe, expect, it } from 'vitest'

import {
  buildExperimentQualityGate,
  buildExperimentSampleBoundary
} from '@/features/job-experiment'
import type { JobSearchExperimentMetricsVO } from '@/types/jobExperiment'

const metrics = (
  applicationCount: number,
  interviewCompletedCount: number
): JobSearchExperimentMetricsVO => ({
  applicationCount,
  feedbackCount: 0,
  interviewInviteCount: 0,
  interviewCompletedCount,
  offerCount: 0,
  rejectedCount: 0,
  resumeVersionCount: 0,
  targetJobCount: 0,
  projectEvidenceCount: 0,
  agentTaskCount: 0,
  sampleCount: applicationCount,
  confidenceLevel: applicationCount < 15 ? 'LOW' : interviewCompletedCount < 3 ? 'MEDIUM' : 'HIGH',
  sampleInsufficient: true,
  facts: []
})

describe('V9 experiment quality gate', () => {
  it('blocks only the fact-only range below five applications', () => {
    const boundary = buildExperimentSampleBoundary(metrics(4, 0))
    const gate = buildExperimentQualityGate(boundary)

    expect(boundary.sampleInsufficient).toBe(true)
    expect(gate).toMatchObject({
      gateStatus: 'BLOCKED',
      suggestionStrength: 'WEAK',
      sampleSize: 4,
      minSampleSize: 5
    })
  })

  it('keeps five to fourteen applications as a warning with weak observations', () => {
    const boundary = buildExperimentSampleBoundary(metrics(8, 0))
    const gate = buildExperimentQualityGate(boundary)

    expect(boundary.sampleInsufficient).toBe(false)
    expect(gate).toMatchObject({
      gateStatus: 'WARN',
      suggestionStrength: 'WEAK',
      sampleSize: 8,
      minSampleSize: 15
    })
  })

  it('keeps the interview boundary as WARN after fifteen applications', () => {
    const boundary = buildExperimentSampleBoundary(metrics(15, 2))
    const gate = buildExperimentQualityGate(boundary)

    expect(boundary.sampleInsufficient).toBe(false)
    expect(gate.gateStatus).toBe('WARN')
    expect(gate.reasons).toContain('完成面试少于 3 次，不判断面试能力趋势')
  })

  it('passes only after both application and interview thresholds are met', () => {
    const boundary = buildExperimentSampleBoundary(metrics(15, 3))
    const gate = buildExperimentQualityGate(boundary)

    expect(boundary.sampleInsufficient).toBe(false)
    expect(gate).toMatchObject({
      gateStatus: 'PASS',
      suggestionStrength: 'NORMAL'
    })
  })
})
