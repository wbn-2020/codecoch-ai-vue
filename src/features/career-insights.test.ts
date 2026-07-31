import { describe, expect, it } from 'vitest'

import {
  buildCareerInsightDisplay,
  normalizeCareerInsightOverview,
  resolveCareerActionRoute,
  toDashboardCareerInsightItems,
  toRecommendedActionItems
} from './career-insights'
import type { CareerInsightOverviewVO } from '@/types/analytics'

describe('career insight helpers', () => {
  it('normalizes nullable overview payloads into stable empty sections', () => {
    const overview = normalizeCareerInsightOverview(null)

    expect(overview.rangeDays).toBe(30)
    expect(overview.funnel.applicationCount).toBe(0)
    expect(overview.applicationQuality.totalApplications).toBe(0)
    expect(overview.resumeVersionEffect.versions).toEqual([])
    expect(overview.interviewWeaknesses.topWeaknesses).toEqual([])
    expect(overview.recommendedActions).toEqual([])
    expect(overview.dataWarnings.length).toBeGreaterThan(0)
  })

  it('adds sample guidance without overstating resume version results', () => {
    const overview = {
      rangeDays: 7,
      funnel: { applicationCount: 2, interviewApplicationCount: 1 },
      applicationQuality: { totalApplications: 2 },
      resumeVersionEffect: {
        versionUsedCount: 2,
        versions: [
          {
            resumeVersionId: 10,
            versionNo: 2,
            versionName: 'Backend V2',
            applicationCount: 2,
            interviewCount: 1,
            sampleLevel: 'LOW',
            insightLabel: '效果最好'
          }
        ]
      },
      interviewWeaknesses: { interviewCount: 1, reportCount: 0, topWeaknesses: [] }
    } satisfies Partial<CareerInsightOverviewVO>

    const display = buildCareerInsightDisplay(overview, { enableV4Preview: true })

    expect(display.sampleTips.some((tip) => tip.includes('投递样本'))).toBe(true)
    expect(display.sampleTips.some((tip) => tip.includes('面试报告'))).toBe(true)
    expect(display.resumeVersions[0].sampleText).toBe('样本不足')
    expect(display.resumeVersions[0].insightText).toContain('继续观察')
  })

  it('builds funnel and quality display metrics from normalized values', () => {
    const display = buildCareerInsightDisplay(
      {
        rangeDays: 30,
        funnel: {
          agentTaskDoneCount: 6,
          applicationCount: 8,
          followedUpApplicationCount: 5,
          interviewApplicationCount: 2,
          offerApplicationCount: 1,
          interviewRate: 0.25,
          offerRate: 0.125
        },
        applicationQuality: {
          totalApplications: 8,
          withResumeVersionCount: 6,
          withFollowUpCount: 5,
          overdueFollowUpCount: 2,
          staleApplicationCount: 1,
          noEventApplicationCount: 1,
          resumeVersionCoverageRate: 0.75,
          followUpCoverageRate: 0.625
        }
      },
      { enableV4Preview: true }
    )

    expect(display.funnelMetrics.find((item) => item.key === 'applications')?.value).toBe('8')
    expect(display.funnelMetrics.find((item) => item.key === 'interviews')?.hint).toContain('25%')
    expect(display.qualityMetrics.find((item) => item.key === 'resume-version-coverage')?.value).toBe('75%')
    expect(display.qualityMetrics.find((item) => item.key === 'overdue-follow-up')?.value).toBe('2')
  })

  it('keeps recommended actions inside safe routes and falls back V4 application paths', () => {
    const applicationRoute = resolveCareerActionRoute('/knowledge?tab=docs', {
      enableV4Preview: false
    })
    const unsafeRoute = resolveCareerActionRoute('https://example.com/jobs', {
      enableV4Preview: true
    })

    expect(applicationRoute).toMatchObject({
      path: '/agent/today',
      blockedPath: '/knowledge?tab=docs'
    })
    expect(applicationRoute.unavailableReason).toContain('V4')
    expect(unsafeRoute.path).toBe('/agent/today')

    const items = toRecommendedActionItems(
      [
        {
          id: 'follow-up',
          type: 'APPLICATION_FOLLOW_UP',
          title: '补齐逾期跟进',
          description: '2 条投递已经超过跟进时间。',
          priority: 'HIGH',
          evidence: '逾期 2 条',
          actionLabel: '处理跟进',
          actionPath: '/knowledge?tab=docs'
        }
      ],
      { enableV4Preview: false }
    )

    expect(items[0]).toMatchObject({
      key: 'follow-up',
      priority: 'high',
      actionPath: '/agent/today'
    })
    expect(items[0].unavailableReason).toContain('V4')
  })

  it('limits dashboard actions and avoids repeating today action buckets', () => {
    const items = toDashboardCareerInsightItems(
      [
        {
          id: 'overdue-follow-up',
          type: 'APPLICATION_FOLLOW_UP',
          title: '补齐逾期跟进',
          description: '2 条投递已经超过跟进时间。',
          priority: 'HIGH',
          evidence: '逾期 2 条',
          actionLabel: '处理跟进',
          actionPath: '/applications?followUp=overdue'
        },
        {
          id: 'weakness',
          type: 'INTERVIEW_WEAKNESS',
          title: '练习 Redis 场景题',
          description: '最近报告多次提到缓存一致性。',
          priority: 'HIGH',
          evidence: '2 次报告',
          actionLabel: '去练习',
          actionPath: '/weakness-analysis'
        },
        {
          id: 'resume',
          type: 'RESUME_VERSION',
          title: '整理简历版本',
          description: '部分投递没有绑定简历版本。',
          priority: 'NORMAL',
          evidence: '3 条未绑定',
          actionLabel: '查看简历',
          actionPath: '/resumes'
        },
        {
          id: 'agent',
          type: 'AGENT_TASK',
          title: '压缩今日任务',
          description: '先完成最高优先级任务。',
          priority: 'LOW',
          evidence: '今日任务未完成',
          actionLabel: '进入今日任务',
          actionPath: '/agent/today'
        }
      ],
      {
        enableV4Preview: true,
        maxItems: 3,
        existingDedupeKeys: ['application-follow-up:overdue']
      }
    )

    expect(items).toHaveLength(3)
    expect(items.map((item) => item.key)).toEqual(['weakness', 'resume', 'agent'])
    expect(items.some((item) => item.key === 'overdue-follow-up')).toBe(false)
  })
})
