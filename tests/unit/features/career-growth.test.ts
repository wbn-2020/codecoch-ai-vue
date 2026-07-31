import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildAttributionPresentation,
  isCalendarEventOverdue,
  normalizeCareerAttribution,
  normalizeCareerCohort,
  normalizeCareerHypothesis,
  normalizeCareerImportPreview,
  resolveExperimentHypothesisId,
  saveExperimentHypothesisLink
} from '@/features/career-growth'

describe('career growth normalization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes hypothesis variants and keeps the legacy-to-v2 compatibility link', () => {
    const hypothesis = normalizeCareerHypothesis({
      id: '21',
      name: '简历证据实验',
      statement: '证据增强可能提高面试邀约',
      attributionWindowDays: '14',
      minSamplePerVariant: 8,
      variants: [
        { id: 1, variantCode: 'CONTROL', name: '对照组', control: true },
        { id: 2, variantCode: 'EVIDENCE', name: '证据组', allocationWeight: 2 }
      ]
    })

    expect(hypothesis.id).toBe(21)
    expect(hypothesis.variants).toHaveLength(2)
    expect(hypothesis.variants[0].control).toBe(true)
    expect(hypothesis.variants[1].allocationWeight).toBe(2)

    saveExperimentHypothesisLink(7, hypothesis.id)
    expect(resolveExperimentHypothesisId(7)).toBe(21)
    expect(resolveExperimentHypothesisId(7, '33')).toBe(33)
  })

  it('only accepts backend-supported attribution outcome types', () => {
    expect(normalizeCareerHypothesis({
      primaryMetric: 'POSITIVE_RESPONSE'
    }).primaryMetric).toBe('POSITIVE_RESPONSE')
    expect(normalizeCareerHypothesis({}).primaryMetric).toBe('INTERVIEW')
    expect(normalizeCareerHypothesis({
      primaryMetric: '   '
    }).primaryMetric).toBe('INTERVIEW')
    expect(() => normalizeCareerHypothesis({
      primaryMetric: 'FEEDBACK'
    })).toThrowError('Unsupported career attribution outcome type: FEEDBACK')

    expect(normalizeCareerCohort({
      outcomeType: 'OFFER'
    }).outcomeType).toBe('OFFER')
    expect(normalizeCareerCohort({
      outcomeType: 'ANY_STRING'
    }).outcomeType).toBeUndefined()
  })

  it('separates comparable weak observations from incomparable results', () => {
    const comparable = normalizeCareerAttribution({
      hypothesisId: 1,
      cohortId: 2,
      comparable: true,
      eligibleSampleCount: 24,
      commonStrataCount: 3,
      limitations: ['关联性分析，不构成因果证明'],
      variants: [
        { variantId: 1, variantCode: 'CONTROL', control: true, matureCount: 12, adjustedRate: 0.2 },
        { variantId: 2, variantCode: 'TEST', matureCount: 12, adjustedRate: 0.3, adjustedLiftVsControl: 0.1 }
      ]
    })
    const incomparable = normalizeCareerAttribution({
      hypothesisId: 1,
      cohortId: 3,
      comparableFlag: false,
      eligibleSampleCount: 3,
      incomparableReasons: ['LOW_SAMPLE'],
      variants: []
    })

    expect(buildAttributionPresentation(comparable).level).toBe('WEAK_OBSERVATION')
    expect(buildAttributionPresentation(comparable).summary).toContain('不代表因果')
    expect(buildAttributionPresentation(incomparable).level).toBe('INCOMPARABLE')
    expect(buildAttributionPresentation(incomparable).cautions).toContain('LOW_SAMPLE')
  })

  it('describes the persisted attribution snapshot empty state accurately', () => {
    const presentation = buildAttributionPresentation()

    expect(presentation.title).toBe('暂无归因快照')
    expect(presentation.summary).toContain('最近快照会在刷新后自动恢复')
    expect(presentation.cautions.join(' ')).not.toContain('未提供归因快照查询接口')
  })

  it('normalizes partial import rows and only marks actionable calendar events overdue', () => {
    const preview = normalizeCareerImportPreview({
      format: 'CSV',
      timezone: 'Asia/Shanghai',
      totalCount: 2,
      validCount: 1,
      errorCount: 1,
      duplicateCount: 1,
      rows: [
        {
          rowNumber: 2,
          disposition: 'DUPLICATE',
          raw: { companyName: 'Example' },
          duplicateCandidates: [{ applicationId: 9, companyName: 'Example', jobTitle: 'Engineer' }]
        }
      ]
    })

    expect(preview.rows[0].duplicateCandidates[0].applicationId).toBe(9)
    expect(preview.errorCount).toBe(1)

    const baseEvent = {
      id: 1,
      title: '跟进',
      startsAt: '2026-07-01T09:00:00',
      endsAt: '2026-07-01T10:00:00',
      timezone: 'Asia/Shanghai'
    }
    const now = new Date('2026-07-02T10:00:00')
    expect(isCalendarEventOverdue({ ...baseEvent, eventType: 'FOLLOW_UP' }, now)).toBe(true)
    expect(isCalendarEventOverdue({ ...baseEvent, eventType: 'APPLICATION' }, now)).toBe(false)
    expect(isCalendarEventOverdue({ ...baseEvent, eventType: 'FOLLOW_UP', status: 'CANCELLED' }, now)).toBe(false)
  })

  it('normalizes CSV headers and mapping metadata from import previews', () => {
    const preview = normalizeCareerImportPreview({
      format: 'CSV',
      timezone: 'Asia/Shanghai',
      headers: ['employer', 'role'],
      suggestedMapping: {
        company_name: 'employer',
        job_title: 'role'
      },
      supportedFields: ['company_name', 'job_title', 'event_start'],
      totalCount: 1,
      validCount: 1,
      errorCount: 0,
      duplicateCount: 0,
      rows: []
    })

    expect(preview.headers).toEqual(['employer', 'role'])
    expect(preview.suggestedMapping.job_title).toBe('role')
    expect(preview.supportedFields).toContain('event_start')
  })
})
