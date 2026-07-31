import { describe, expect, it } from 'vitest'

import {
  buildJobReadinessTrend,
  normalizeJobReadiness,
  normalizeJobRequirementMatrix,
  requirementStatusMeta
} from '@/features/job-requirement-matrix'

describe('job requirement matrix normalization', () => {
  it('derives conservative summary values from requirement items', () => {
    const matrix = normalizeJobRequirementMatrix({
      targetJobId: 7,
      groups: [
        {
          requirementType: 'REQUIRED_SKILL',
          items: [
            {
              requirementId: 1,
              requirementType: 'REQUIRED_SKILL',
              title: 'Java',
              status: 'COVERED',
              evidences: [],
              gaps: [],
              nextActions: []
            },
            {
              requirementId: 2,
              requirementType: 'REQUIRED_SKILL',
              title: 'Redis',
              status: 'WEAK',
              evidences: [],
              gaps: [],
              nextActions: []
            },
            {
              requirementId: 3,
              requirementType: 'REQUIRED_SKILL',
              title: 'Kafka',
              status: 'MISSING',
              evidences: [],
              gaps: [],
              nextActions: []
            }
          ]
        }
      ],
      warnings: []
    }, 7)

    expect(matrix?.summary).toMatchObject({
      total: 3,
      covered: 1,
      weak: 1,
      missing: 1,
      coveragePercent: 50
    })
  })

  it('normalizes evidence confidence consistently for grouped requirement items', () => {
    const matrix = normalizeJobRequirementMatrix({
      targetJobId: 7,
      groups: [
        {
          requirementType: 'REQUIRED_SKILL',
          items: [
            {
              requirementId: 1,
              requirementType: 'REQUIRED_SKILL',
              title: 'Java',
              status: 'COVERED',
              evidences: [
                {
                  evidenceType: 'RESUME_MATCH',
                  evidenceId: 101,
                  confidenceLevel: 'HIGH',
                  confidence: 'LOW',
                  resultSource: 'BACKEND_FACT',
                  fallback: false,
                  confirmed: true,
                  occurredAt: '2026-07-10T08:30:00Z'
                },
                {
                  evidenceType: 'INTERVIEW_REPORT',
                  evidenceId: 102,
                  confidence: 'MEDIUM',
                  resultSource: 'LEGACY_RESULT',
                  fallback: true,
                  confirmed: false,
                  occurredAt: '2026-07-11T09:45:00Z'
                }
              ],
              gaps: [],
              nextActions: []
            }
          ]
        }
      ],
      warnings: []
    }, 7)

    expect(matrix?.groups[0]?.items[0]?.evidences).toMatchObject([
      {
        confidenceLevel: 'HIGH',
        confidence: 'HIGH',
        resultSource: 'BACKEND_FACT',
        fallback: false,
        confirmed: true,
        occurredAt: '2026-07-10T08:30:00Z'
      },
      {
        confidenceLevel: 'MEDIUM',
        confidence: 'MEDIUM',
        resultSource: 'LEGACY_RESULT',
        fallback: true,
        confirmed: false,
        occurredAt: '2026-07-11T09:45:00Z'
      }
    ])
  })

  it('preserves backend-owned generic evidence and next action contracts', () => {
    const matrix = normalizeJobRequirementMatrix({
      targetJobId: 7,
      requirements: [
        {
          requirementId: 1,
          requirementType: 'REQUIRED_SKILL',
          requirementName: 'Java',
          coverageLevel: 'STRONG',
          evidences: [
            {
              evidenceType: 'RESUME_MATCH',
              evidenceId: 101,
              projectEvidenceId: 901,
              title: 'Resume match evidence',
              projectTitle: 'Legacy resume title',
              excerpt: 'Resume match excerpt',
              evidenceText: 'Legacy resume excerpt',
              confidenceLevel: 'HIGH',
              confidence: 'LOW',
              resultSource: 'BACKEND_FACT',
              fallback: false,
              confirmed: true,
              occurredAt: '2026-07-10T08:30:00Z'
            },
            {
              evidenceType: 'INTERVIEW_REPORT',
              evidenceId: 102,
              title: 'Interview report evidence',
              excerpt: 'Interview report excerpt',
              confidence: 'MEDIUM'
            },
            {
              evidenceType: 'APPLICATION_RESULT',
              evidenceId: 103,
              title: 'Application result evidence',
              excerpt: 'Application result excerpt'
            }
          ],
          nextActions: [
            {
              actionCode: 'IMPROVE_RESUME',
              title: 'Improve resume evidence',
              path: '/resumes/1'
            }
          ]
        }
      ],
      warnings: []
    }, 7)

    const requirement = matrix?.groups[0]?.items[0]
    expect(requirement?.evidences).toMatchObject([
      {
        evidenceType: 'RESUME_MATCH',
        evidenceId: 101,
        title: 'Resume match evidence',
        excerpt: 'Resume match excerpt',
        confidenceLevel: 'HIGH',
        confidence: 'HIGH',
        resultSource: 'BACKEND_FACT',
        fallback: false,
        confirmed: true,
        occurredAt: '2026-07-10T08:30:00Z'
      },
      {
        evidenceType: 'INTERVIEW_REPORT',
        evidenceId: 102,
        title: 'Interview report evidence',
        excerpt: 'Interview report excerpt',
        confidenceLevel: 'MEDIUM',
        confidence: 'MEDIUM'
      },
      {
        evidenceType: 'APPLICATION_RESULT',
        evidenceId: 103,
        title: 'Application result evidence',
        excerpt: 'Application result excerpt'
      }
    ])
    expect(requirement?.nextActions).toMatchObject([
      {
        actionCode: 'IMPROVE_RESUME',
        actionType: 'IMPROVE_RESUME',
        title: 'Improve resume evidence',
        path: '/resumes/1',
        actionUrl: '/resumes/1'
      }
    ])
  })

  it('uses project evidence aliases only when canonical evidence fields are absent', () => {
    const matrix = normalizeJobRequirementMatrix({
      targetJobId: 7,
      requirements: [
        {
          requirementId: 1,
          requirementType: 'PROJECT_EXPERIENCE',
          requirementName: 'Distributed systems',
          evidences: [
            {
              projectEvidenceId: 201,
              projectSkillEvidenceId: 202,
              projectTitle: 'Legacy project title',
              evidenceText: 'Legacy project excerpt'
            }
          ],
          nextActions: [
            {
              actionType: 'LEGACY_ACTION',
              title: 'Open legacy action',
              actionUrl: '/legacy-action'
            }
          ]
        }
      ],
      warnings: []
    }, 7)

    expect(matrix?.groups[0]?.items[0]?.evidences[0]).toMatchObject({
      evidenceType: 'PROJECT_SKILL',
      evidenceId: 202,
      evidenceSubId: 201,
      title: 'Legacy project title',
      excerpt: 'Legacy project excerpt'
    })
    expect(matrix?.groups[0]?.items[0]?.nextActions[0]).toMatchObject({
      actionCode: 'LEGACY_ACTION',
      title: 'Open legacy action',
      path: '/legacy-action'
    })
  })

  it('does not promote unknown statuses to covered', () => {
    expect(requirementStatusMeta('model-guessed')).toEqual({
      label: '待确认',
      tone: 'info'
    })
  })

  it('keeps sample-insufficient readiness conservative', () => {
    const readiness = normalizeJobReadiness({
      targetJobId: 9,
      overallScore: 92,
      sampleInsufficient: true,
      dimensions: [
        {
          dimension: 'INTERVIEW',
          score: 86,
          sampleInsufficient: true
        }
      ],
      warnings: ['only one interview']
    }, 9)

    expect(readiness?.sampleInsufficient).toBe(true)
    expect(readiness?.dimensions[0]?.sampleInsufficient).toBe(true)
  })

  it('normalizes backend readiness confidence and fallback before legacy aliases', () => {
    const readiness = normalizeJobReadiness({
      targetJobId: 9,
      readinessScore: 78,
      overallScore: 12,
      readinessLevel: 'READY',
      overallLevel: 'LEGACY',
      confidenceLevel: 'medium',
      confidence: 'low',
      fallback: false,
      dimensions: [
        {
          dimension: 'INTERVIEW',
          score: 64,
          sampleCount: 3,
          confidenceLevel: 'high',
          confidence: 'low',
          fallback: true
        },
        {
          dimension: 'RESUME',
          confidence: 'medium'
        }
      ],
      warnings: []
    }, 9)

    expect(readiness).toMatchObject({
      readinessScore: 78,
      overallScore: 78,
      readinessLevel: 'READY',
      overallLevel: 'READY',
      confidenceLevel: 'MEDIUM',
      confidence: 'MEDIUM',
      fallback: false
    })
    expect(readiness?.dimensions[0]).toMatchObject({
      sampleCount: 3,
      confidenceLevel: 'HIGH',
      confidence: 'HIGH',
      fallback: true,
      sampleInsufficient: true
    })
    expect(readiness?.dimensions[1]).toMatchObject({
      confidenceLevel: 'MEDIUM',
      confidence: 'MEDIUM',
      fallback: false
    })
  })

  it('explains readiness changes without comparing insufficient samples', () => {
    const trend = buildJobReadinessTrend([
      {
        id: 1,
        targetJobId: 9,
        overallScore: 55,
        strongCount: 2,
        missingCount: 4,
        sampleInsufficient: false,
        generatedAt: '2026-07-01T10:00:00Z',
        dimensions: [{ dimension: 'RESUME', score: 50 }],
        warnings: []
      },
      {
        id: 2,
        targetJobId: 9,
        overallScore: 68,
        strongCount: 4,
        missingCount: 2,
        sampleInsufficient: false,
        generatedAt: '2026-07-02T10:00:00Z',
        dimensions: [{ dimension: 'RESUME', score: 65 }],
        warnings: []
      }
    ])

    expect(trend.change?.scoreDelta).toBe(13)
    expect(trend.change?.reasons).toContain('新增 2 项强证据覆盖')
    expect(trend.change?.reasons).toContain('减少 2 项缺失要求')
    expect(trend.change?.reasons).toContain('简历准备提升 15 分')
  })

  it('treats fallback snapshots and dimensions as unavailable for direct score comparison', () => {
    const trend = buildJobReadinessTrend([
      {
        id: 1,
        targetJobId: 9,
        overallScore: 55,
        strongCount: 2,
        missingCount: 4,
        sampleInsufficient: false,
        fallback: false,
        generatedAt: '2026-07-01T10:00:00Z',
        dimensions: [{ dimension: 'RESUME', score: 50, fallback: false }],
        warnings: []
      },
      {
        id: 2,
        targetJobId: 9,
        overallScore: 88,
        strongCount: 4,
        missingCount: 2,
        sampleInsufficient: false,
        fallback: true,
        generatedAt: '2026-07-02T10:00:00Z',
        dimensions: [{ dimension: 'RESUME', score: 90, fallback: true }],
        warnings: []
      }
    ])

    expect(trend.points[1]).toMatchObject({
      score: undefined,
      sampleInsufficient: true
    })
    expect(trend.change?.scoreDelta).toBeUndefined()
    expect(trend.change?.reasons).not.toContain('简历准备提升 40 分')
  })
})
