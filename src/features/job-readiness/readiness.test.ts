import { describe, expect, it } from 'vitest'

import { buildReadinessResult, describeAgentTaskEvidence, resolveSafeActionPath } from './readiness'

describe('buildReadinessResult', () => {
  it('builds a complete readiness path from V3 overview and skill overview', () => {
    const result = buildReadinessResult({
      v3Overview: {
        resumeCount: 1,
        interviewCount: 0,
        studyPlanCount: 0,
        todayTaskCount: 2,
        todayCompletedTaskCount: 0,
        entryStatuses: [],
        currentTargetJob: {
          id: 10,
          targetJobId: 10,
          jobTitle: 'Java 后端工程师',
          parseStatus: 'SUCCESS'
        },
        latestMatch: {
          matchReportId: 20,
          reportId: 20,
          targetJobId: 10,
          summary: '匹配度良好'
        }
      },
      skillOverview: {
        empty: false,
        profileId: 30,
        targetJobId: 10,
        profileName: 'Java 后端能力画像',
        overallScore: 72,
        gapCount: 2
      }
    })

    expect(result.source).toBe('full')
    expect(result.doneCount).toBe(6)
    expect(result.completionPercent).toBe(100)
    expect(result.nextAction.path).toBe('/agent/today')
    expect(result.nextAction.label).toBe('进入今日任务')
  })

  it('uses a clear fallback when only user dashboard data is available', () => {
    const result = buildReadinessResult({
      userOverview: {
        resumeCount: 1,
        interviewCount: 0,
        studyPlanCount: 0,
        todayTaskCount: 0,
        todayCompletedTaskCount: 0,
        entryStatuses: []
      }
    })

    expect(result.source).toBe('dashboard-partial')
    expect(result.sourceNotice).toContain('缺少岗位和匹配上下文')
    expect(result.steps.find((step) => step.key === 'resume')?.done).toBe(true)
    expect(result.nextAction.path).toBe('/dashboard/v3')
  })

  it('treats the agent page as an execution context when only tasks are available', () => {
    const result = buildReadinessResult({
      todayTasks: {
        total: 1,
        doneCount: 0,
        todoCount: 1,
        tasks: []
      }
    })

    expect(result.source).toBe('agent-execution')
    expect(result.sourceNotice).toContain('完整求职准备进度')
    expect(result.nextAction.path).toBe('/agent/today')
  })

  it('honors an explicit agent execution source hint before data loads', () => {
    const result = buildReadinessResult({
      sourceHint: 'agent-execution'
    })

    expect(result.source).toBe('agent-execution')
    expect(result.nextAction.path).toBe('/agent/today')
    expect(result.nextAction.title).toBe('生成今日任务')
  })

  it('keeps the skill profile step pending when overview is empty', () => {
    const result = buildReadinessResult({
      v3Overview: {
        resumeCount: 1,
        interviewCount: 0,
        studyPlanCount: 0,
        todayTaskCount: 0,
        todayCompletedTaskCount: 0,
        entryStatuses: [],
        currentTargetJob: {
          targetJobId: 10,
          parseStatus: 'SUCCESS'
        },
        latestMatch: {
          matchReportId: 20
        }
      },
      skillOverview: {
        empty: true
      }
    })

    const skillStep = result.steps.find((step) => step.key === 'skill-profile')
    expect(skillStep?.done).toBe(false)
    expect(skillStep?.status).toBe('current')
    expect(result.nextAction.path).toEqual({ path: '/skill-profile', query: { targetJobId: 10 } })
  })
})

describe('resolveSafeActionPath', () => {
  it('falls back when action path is missing', () => {
    expect(resolveSafeActionPath(undefined, { enableV4Preview: false }).path).toBe('/agent/today')
  })

  it('rewrites /tools to a usable path', () => {
    expect(resolveSafeActionPath('/tools', { enableV4Preview: true }).path).toBe('/knowledge')
    expect(resolveSafeActionPath('/tools', { enableV4Preview: false }).path).toBe('/agent/today')
  })

  it('blocks V4 preview paths when preview is disabled', () => {
    const result = resolveSafeActionPath('/applications', { enableV4Preview: false })
    expect(result.path).toBe('/agent/today')
    expect(result.unavailableReason).toContain('预览')
  })

  it('blocks dynamic V4 preview resume version paths when preview is disabled', () => {
    const result = resolveSafeActionPath('/resumes/1/versions', { enableV4Preview: false })

    expect(result.path).toBe('/agent/today')
    expect(result.unavailableReason).toContain('预览')
  })

  it('blocks unknown absolute paths when known paths are provided', () => {
    const result = resolveSafeActionPath('/not-exists', {
      enableV4Preview: true,
      knownPaths: ['/agent/today']
    })

    expect(result.path).toBe('/agent/today')
    expect(result.unavailableReason).toContain('不存在')
  })

  it('allows child routes for known path prefixes', () => {
    const result = resolveSafeActionPath('/questions/123', {
      enableV4Preview: true,
      knownPaths: ['/questions']
    })

    expect(result).toEqual({ path: '/questions/123' })
  })

  it('keeps query strings on known routes', () => {
    const result = resolveSafeActionPath('/questions/practice?source=agent#today', {
      enableV4Preview: true,
      knownPaths: ['/questions/practice']
    })

    expect(result).toEqual({ path: '/questions/practice?source=agent#today' })
  })
})

describe('describeAgentTaskEvidence', () => {
  it('turns task metadata into readable evidence', () => {
    const evidence = describeAgentTaskEvidence(
      {
        id: 1,
        taskType: 'QUESTION_PRACTICE',
        title: '练习 Java 并发',
        reason: '岗位要求并发经验',
        relatedSkillName: 'Java 并发',
        relatedBizType: 'TARGET_JOB',
        relatedBizId: 10,
        actionUrl: '/questions/practice'
      },
      { enableV4Preview: false }
    )

    expect(evidence.sourceLabel).toBe('来自目标岗位')
    expect(evidence.skillLabel).toBe('Java 并发')
    expect(evidence.bizLabel).toContain('10')
    expect(evidence.actionLabel).toBe('去刷题练习')
    expect(evidence.safePath).toBe('/questions/practice')
  })

  it('keeps unavailable reasons from safe action resolution', () => {
    const evidence = describeAgentTaskEvidence(
      {
        id: 2,
        taskType: 'REPORT_REVIEW',
        relatedBizType: 'MATCH_REPORT',
        relatedBizId: 20,
        actionUrl: '/applications'
      },
      { enableV4Preview: false }
    )

    expect(evidence.sourceLabel).toBe('来自匹配报告')
    expect(evidence.safePath).toBe('/agent/today')
    expect(evidence.unavailableReason).toContain('预览')
  })
})
