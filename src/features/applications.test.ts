import { describe, expect, it } from 'vitest'

import {
  buildApplicationEventTimeline,
  buildBackendLatestApplicationEvent,
  buildApplicationWorkbenchOverview,
  filterApplicationsByFollowUp,
  formatApplicationResumeVersionLabel,
  getApplicationEventMeta,
  getApplicationFollowUpState,
  getLatestApplicationEvent,
  hasBackendLatestEventSummary,
  hasBackendResumeVersionSummary
} from './applications'
import type { JobApplicationEventVO, JobApplicationVO } from '@/api/v4'

describe('application workbench helpers', () => {
  it('classifies missing, overdue, due today and upcoming follow-up dates', () => {
    const now = '2026-06-30 10:00:00'

    expect(getApplicationFollowUpState(undefined, now).key).toBe('missing')
    expect(getApplicationFollowUpState('2026-06-29 18:00:00', now).key).toBe('overdue')
    expect(getApplicationFollowUpState('2026-06-30 08:00:00', now).key).toBe('overdue')
    expect(getApplicationFollowUpState('2026-06-30 18:00:00', now).key).toBe('due-today')
    expect(getApplicationFollowUpState('2026-07-01 09:00:00', now).key).toBe('upcoming')
    expect(getApplicationFollowUpState('2026-06-30 18:00:00', now).dueAt).toBe('2026-06-30 18:00:00')
  })

  it('filters applications by follow-up query value', () => {
    const items: JobApplicationVO[] = [
      { id: 1, status: 'APPLIED', nextFollowUpAt: '2026-06-29 18:00:00' },
      { id: 2, status: 'APPLIED', nextFollowUpAt: '2026-06-30 18:00:00' },
      { id: 3, status: 'INTERVIEWING', nextFollowUpAt: '2026-07-01 09:00:00' },
      { id: 4, status: 'PREPARING' },
      { id: 5, status: 'REJECTED', nextFollowUpAt: '2026-06-30 08:00:00' },
      { id: 6, status: 'CLOSED' }
    ]

    expect(filterApplicationsByFollowUp(items, 'due-today', '2026-06-30 10:00:00').map((item) => item.id)).toEqual([2])
    expect(filterApplicationsByFollowUp(items, 'missing', '2026-06-30 10:00:00').map((item) => item.id)).toEqual([4])
    expect(filterApplicationsByFollowUp(items, 'all', '2026-06-30 10:00:00')).toHaveLength(6)
  })

  it('formats resume version labels without inventing unavailable fields', () => {
    expect(formatApplicationResumeVersionLabel(null)).toBe('未关联简历版本')
    expect(formatApplicationResumeVersionLabel(12)).toBe('简历版本 #12')
    expect(formatApplicationResumeVersionLabel({ resumeVersionId: 12, versionNo: 3, currentFlag: 1 })).toBe('V3（当前版本）')
    expect(formatApplicationResumeVersionLabel({ resumeVersionId: 12, versionName: '投递版' })).toBe('投递版')
  })

  it('normalizes backend stats into workbench cards', () => {
    const overview = buildApplicationWorkbenchOverview({
      total: 8,
      activeCount: 5,
      dueTodayFollowUpCount: 2,
      overdueFollowUpCount: 1,
      interviewCount: 3
    })

    expect(overview.stats.total).toBe(8)
    expect(overview.stageCards.find((item) => item.key === 'interviewing')?.value).toBe(3)
    expect(overview.followUpCards.find((item) => item.key === 'follow-up-due-today')?.value).toBe(2)
  })

  it('sorts application events into a readable latest-first timeline', () => {
    const events: JobApplicationEventVO[] = [
      { id: 1, eventType: 'NOTE', eventTime: '2026-06-29 09:00:00', summary: '补充岗位备注' },
      { id: 2, eventType: 'OFFER', eventTime: '2026-07-01 12:00:00', summary: '收到 offer' },
      { id: 3, eventType: 'FOLLOW_UP', createdAt: '2026-06-30 10:00:00', summary: 'HR 电话沟通' }
    ]

    const timeline = buildApplicationEventTimeline(events)

    expect(timeline.map((item) => item.id)).toEqual([2, 3, 1])
    expect(timeline[0].meta.label).toBe('Offer')
    expect(timeline[1].timeText).toBe('2026-06-30 10:00:00')
  })

  it('returns a graceful latest event summary for empty or unknown events', () => {
    expect(getLatestApplicationEvent([])).toBeUndefined()
    expect(getApplicationEventMeta('CUSTOM_EVENT').label).toBe('CUSTOM_EVENT')
    expect(getApplicationEventMeta('INTERVIEW_COMPLETED')).toMatchObject({
      label: '\u9762\u8bd5\u5b8c\u6210',
      tone: 'success'
    })

    const latest = getLatestApplicationEvent([
      { id: 1, eventType: 'NOTE', eventTime: '2026-06-29 09:00:00' },
      { id: 2, eventType: 'REJECTED', eventTime: '2026-06-30 11:30:00' }
    ])

    expect(latest?.id).toBe(2)
    expect(latest?.meta.label).toBe('拒绝')
    expect(latest?.summaryText).toBe('已记录拒绝事件')
  })
  it('uses explicit backend application summaries without requiring fallback fetches', () => {
    const application: JobApplicationVO = {
      id: 10,
      resumeVersionId: 20,
      resumeId: 3,
      resumeVersionNo: 4,
      resumeVersionName: 'backend-v4',
      resumeVersionCurrentFlag: 1,
      latestEventId: 90,
      latestEventType: 'INTERVIEW_COMPLETED',
      latestEventTime: '2026-06-30 18:00:00',
      latestEventSummary: 'report synced'
    }

    expect(hasBackendResumeVersionSummary(application)).toBe(true)
    expect(hasBackendLatestEventSummary(application)).toBe(true)
    expect(buildBackendLatestApplicationEvent(application)).toMatchObject({
      id: 90,
      applicationId: 10,
      normalizedType: 'INTERVIEW_COMPLETED',
      summaryText: 'report synced'
    })
  })

  it('distinguishes new-contract null summaries from old-contract missing summaries', () => {
    expect(hasBackendResumeVersionSummary({ id: 1, resumeVersionId: 20 })).toBe(false)
    expect(hasBackendLatestEventSummary({ id: 1 })).toBe(false)

    expect(hasBackendResumeVersionSummary({
      id: 1,
      resumeVersionId: 20,
      resumeVersionName: undefined
    })).toBe(true)
    expect(hasBackendLatestEventSummary({
      id: 1,
      latestEventId: undefined,
      latestEventSummary: undefined
    })).toBe(true)
    expect(buildBackendLatestApplicationEvent({ id: 1, latestEventId: undefined })).toBeUndefined()
  })
})
