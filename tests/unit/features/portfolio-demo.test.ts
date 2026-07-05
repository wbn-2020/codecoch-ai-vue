import { describe, expect, it } from 'vitest'

import {
  buildPortfolioDemoCoverage,
  hasCompleteDemoMarkers,
  portfolioDemoKnownPaths,
  requiredOpsDemoSteps,
  requiredUserDemoSteps,
  resolvePortfolioDemoRoute,
  safeStoryRoutes
} from '@/features/portfolio-demo'
import { resolveAppRoutePath } from '@/features/route-safety'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

const completeStory = (): PortfolioDemoStorylineVO => ({
  status: {
    loaded: true,
    datasetKey: 'portfolio-3b-v1',
    datasetName: 'CodeCoachAI 作品集演示',
    status: 'LOADED',
    version: 'v1',
    demoData: true,
    readOnly: true,
    loadedAt: '2026-07-05T10:00:00'
  },
  steps: [
    {
      key: 'target-job',
      title: '目标岗位',
      route: '/job-targets?demoFlag=true',
      entityType: 'TARGET_JOB',
      evidenceSummary: '基于脱敏岗位描述摘要提取岗位能力要求。',
      demoData: true
    },
    {
      key: 'jd-match',
      title: 'JD 匹配报告',
      route: '/resume-match?demoFlag=true',
      entityType: 'RESUME_MATCH',
      evidenceSummary: '绑定简历版本快照与目标 JD，展示匹配缺口。',
      demoData: true
    },
    {
      key: 'project-evidence',
      title: '项目证据',
      route: '/project-evidence?demoFlag=true',
      entityType: 'PROJECT_EVIDENCE',
      evidenceSummary: '项目证据以摘要、能力标签和 JD 覆盖关系呈现。',
      demoData: true
    },
    {
      key: 'interview-training',
      title: '面试训练室',
      route: '/interviews/create?demoFlag=true',
      entityType: 'INTERVIEW_TRAINING',
      evidenceSummary: '根据 JD 与项目证据生成追问方向。',
      demoData: true
    },
    {
      key: 'interview-report',
      title: '面试报告',
      route: '/interviews/history?demoFlag=true',
      entityType: 'INTERVIEW_REPORT',
      evidenceSummary: 'Rubric 评分基于问答样本、岗位描述摘要和项目证据。',
      demoData: true
    },
    {
      key: 'ability-map',
      title: '能力图谱',
      route: '/ability-map?demoFlag=true',
      entityType: 'ABILITY_PROFILE',
      evidenceSummary: '能力状态来自匹配报告、面试报告和训练记录。',
      demoData: true
    },
    {
      key: 'job-experiment-review',
      title: '求职实验复盘',
      route: '/job-experiments/9/review?demoFlag=true',
      entityType: 'JOB_EXPERIMENT',
      evidenceSummary: '样本数不足时只给弱建议和下一轮策略。',
      demoData: true
    },
    {
      key: 'agent-today',
      title: 'Agent 今日任务',
      route: '/agent/today?demoFlag=true',
      entityType: 'AGENT_TASK',
      evidenceSummary: '任务承接来自实验复盘、匹配缺口和面试反馈。',
      demoData: true
    }
  ],
  opsSteps: [
    {
      key: 'agent-runs',
      title: 'Agent 运行记录',
      route: '/admin/agent/runs?demoFlag=true',
      entityType: 'AGENT_RUN',
      evidenceSummary: '展示任务生成的运行状态、traceId、失败原因和降级结果。',
      demoData: true
    },
    {
      key: 'prompt-template',
      title: 'Prompt 模板',
      route: '/admin/ai/prompts?demoFlag=true',
      entityType: 'PROMPT_TEMPLATE',
      evidenceSummary: '展示关键 Prompt 的版本、适用场景和摘要化上下文策略。',
      demoData: true
    },
    {
      key: 'prompt-regression',
      title: 'Prompt 回归',
      route: '/admin/ai/prompt-regression?demoFlag=true',
      entityType: 'PROMPT_REGRESSION',
      evidenceSummary: '通过固定样例验证 Prompt 变更。',
      demoData: true
    },
    {
      key: 'ai-call-logs',
      title: 'AI 服务记录',
      route: '/admin/ai/logs?demoFlag=true',
      entityType: 'AI_CALL_LOG',
      evidenceSummary: '日志仅保留摘要、traceId、Prompt 版本、模型、状态和错误原因。',
      demoData: true
    },
    {
      key: 'async-tasks',
      title: '异步任务中心',
      route: '/admin/async-tasks?demoFlag=true',
      entityType: 'ASYNC_TASK',
      evidenceSummary: '展示任务排队、执行、失败重试和 traceId 闭环。',
      demoData: true
    },
    {
      key: 'metrics-dictionary',
      title: '指标字典',
      route: '/admin/analytics/metrics?demoFlag=true',
      entityType: 'METRIC_DICTIONARY',
      evidenceSummary: '说明成功率、耗时、反馈采纳等指标口径。',
      demoData: true
    },
    {
      key: 'ai-ops-dashboard',
      title: 'AI 运营看板',
      route: '/admin/analytics/ai?demoFlag=true',
      entityType: 'AI_OPS',
      evidenceSummary: '聚合 AI 调用成功率、耗时、Token 成本、失败原因和用户反馈。',
      demoData: true
    }
  ]
})

describe('portfolio demo phase one contract', () => {
  it('defines the required 8 user route nodes and 7 ops route nodes', () => {
    expect(requiredUserDemoSteps.map((step) => step.key)).toEqual([
      'target-job',
      'jd-match',
      'project-evidence',
      'interview-training',
      'interview-report',
      'ability-map',
      'job-experiment-review',
      'agent-today'
    ])

    expect(requiredOpsDemoSteps.map((step) => step.key)).toEqual([
      'agent-runs',
      'prompt-template',
      'prompt-regression',
      'ai-call-logs',
      'async-tasks',
      'metrics-dictionary',
      'ai-ops-dashboard'
    ])
  })

  it('reports complete coverage only when every node has evidence, demo marker and a safe route', () => {
    const story = completeStory()
    const coverage = buildPortfolioDemoCoverage(story)

    expect(coverage.total).toBe(15)
    expect(coverage.covered).toBe(15)
    expect(coverage.ready).toBe(true)
    expect(coverage.missingKeys).toEqual([])
    expect(coverage.missingTitleKeys).toEqual([])
    expect(coverage.missingStatusKeys).toEqual([])
    expect(coverage.invalidRoutes).toEqual([])
    expect(hasCompleteDemoMarkers(story)).toBe(true)
    expect(safeStoryRoutes(story)).toHaveLength(15)
  })

  it('surfaces missing phase-one nodes and incomplete node metadata', () => {
    const story = completeStory()
    story.steps = story.steps.filter((step) => step.key !== 'interview-training')
    story.opsSteps[0] = {
      ...story.opsSteps[0],
      title: '',
      evidenceSummary: '',
      demoData: false,
      route: '/admin/not-a-demo-route'
    }

    const coverage = buildPortfolioDemoCoverage(story)

    expect(coverage.ready).toBe(false)
    expect(coverage.covered).toBe(13)
    expect(coverage.missingKeys).toEqual(['interview-training'])
    expect(coverage.missingTitleKeys).toEqual(['agent-runs'])
    expect(coverage.missingEvidenceKeys).toEqual(['agent-runs'])
    expect(coverage.missingDemoMarkerKeys).toEqual(['agent-runs'])
    expect(coverage.invalidRoutes).toEqual([
      {
        key: 'agent-runs',
        route: '/admin/not-a-demo-route',
        reason: '目标路径不存在或未开放，已回落到可用入口。'
      }
    ])
  })

  it('treats a required route with MISSING status as incomplete even when it has a fallback path', () => {
    const story = completeStory()
    story.steps[6] = {
      ...story.steps[6],
      status: 'MISSING',
      route: '/job-experiments?demoFlag=true'
    }

    const coverage = buildPortfolioDemoCoverage(story)

    expect(coverage.ready).toBe(false)
    expect(coverage.covered).toBe(14)
    expect(coverage.missingStatusKeys).toEqual(['job-experiment-review'])
  })

  it('uses a portfolio-demo allowlist instead of allowing every admin child path', () => {
    expect(
      resolveAppRoutePath('/admin/agent/runs?demoFlag=true', {
        fallbackPath: '/portfolio-demo',
        knownPaths: portfolioDemoKnownPaths,
        enableV4Preview: true
      }).path
    ).toBe('/admin/agent/runs?demoFlag=true')

    expect(
      resolveAppRoutePath('/admin/not-real?demoFlag=true', {
        fallbackPath: '/portfolio-demo',
        knownPaths: portfolioDemoKnownPaths,
        enableV4Preview: true
      })
    ).toMatchObject({
      path: '/portfolio-demo',
      blockedPath: '/admin/not-real?demoFlag=true'
    })
  })

  it('blocks known business paths that do not carry the demo flag', () => {
    expect(safeStoryRoutes({
      ...completeStory(),
      steps: [
        {
          key: 'job-experiment-review',
          title: '求职实验复盘',
          route: '/job-experiments/9/review',
          entityType: 'JOB_EXPERIMENT',
          evidenceSummary: '缺少 demoFlag 的深链不能作为演示路线。',
          demoData: true
        }
      ],
      opsSteps: []
    })).toEqual([])
  })

  it('requires demoFlag to be an explicit query parameter', () => {
    expect(resolvePortfolioDemoRoute('/job-targets?source=demoFlag=true')).toMatchObject({
      path: '/portfolio-demo',
      blockedPath: '/job-targets?source=demoFlag=true'
    })

    expect(resolvePortfolioDemoRoute('/job-targets#demoFlag=true')).toMatchObject({
      path: '/portfolio-demo',
      blockedPath: '/job-targets#demoFlag=true'
    })

    expect(resolvePortfolioDemoRoute('/job-targets?demoFlag=true&utm=demo')).toMatchObject({
      path: '/job-targets?demoFlag=true&utm=demo'
    })
  })
})
