import { describe, expect, it } from 'vitest'

import { hasCompleteDemoMarkers, safeStoryRoutes } from './portfolio-demo'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

describe('portfolio demo helpers', () => {
  it('requires demo markers and keeps only routes in the portfolio demo allowlist', () => {
    const story = {
      status: {
        loaded: true,
        datasetKey: 'portfolio-3b-v1',
        datasetName: 'CodeCoachAI 作品集演示',
        status: 'LOADED',
        version: 'v1',
        demoData: true,
        readOnly: true
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
          key: 'experiment',
          title: '求职实验复盘',
          route: '/job-experiments/9/review?demoFlag=true',
          entityType: 'JOB_EXPERIMENT',
          evidenceSummary: '样本数不足时只给弱建议。',
          demoData: true
        },
        {
          key: 'unsafe-experiment',
          title: '真实实验',
          route: '/job-experiments/9',
          entityType: 'JOB_EXPERIMENT',
          evidenceSummary: '缺少 demoFlag 的深链应被拦截。',
          demoData: true
        }
      ],
      opsSteps: [
        {
          key: 'ai-ops-dashboard',
          title: 'AI 运营看板',
          route: '/admin/analytics/ai?demoFlag=true',
          entityType: 'AI_OPS',
          evidenceSummary: '聚合 AI 调用成功率、耗时、Token 成本、失败原因和用户反馈。',
          demoData: true
        }
      ]
    } satisfies PortfolioDemoStorylineVO

    expect(hasCompleteDemoMarkers(story)).toBe(true)
    expect(safeStoryRoutes(story)).toEqual([
      '/job-targets?demoFlag=true',
      '/job-experiments/9/review?demoFlag=true',
      '/admin/analytics/ai?demoFlag=true'
    ])
  })

  it('detects missing demo markers before rendering a portfolio story as isolated demo data', () => {
    const story = {
      status: {
        loaded: true,
        datasetKey: 'portfolio-3b-v1',
        datasetName: 'CodeCoachAI 作品集演示',
        status: 'LOADED',
        version: 'v1',
        demoData: true,
        readOnly: true
      },
      steps: [
        {
          key: 'target-job',
          title: '目标岗位',
          route: '/job-targets?demoFlag=true',
          entityType: 'TARGET_JOB',
          evidenceSummary: '基于脱敏岗位描述摘要提取岗位能力要求。'
        }
      ],
      opsSteps: []
    } satisfies PortfolioDemoStorylineVO

    expect(hasCompleteDemoMarkers(story)).toBe(false)
  })
})
