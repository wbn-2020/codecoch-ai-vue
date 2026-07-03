import { describe, expect, it } from 'vitest'

import { hasCompleteDemoMarkers, safeStoryRoutes } from './portfolio-demo'
import type { PortfolioDemoStorylineVO } from '@/types/jobExperiment'

describe('portfolio demo helpers', () => {
  it('requires demo markers and only keeps isolated demo routes', () => {
    const story = {
      status: {
        loaded: true,
        datasetKey: 'java-backend-demo',
        datasetName: 'Java 后端演示数据',
        status: 'LOADED',
        version: '2026.07',
        demoData: true,
        readOnly: true
      },
      steps: [
        { key: 'jd', title: '目标 JD', route: '/portfolio-demo?step=jd', entityType: 'TARGET_JOB', demoData: true },
        { key: 'experiment', title: '求职实验', route: '/job-experiments/9?demoFlag=true', entityType: 'JOB_EXPERIMENT', demoData: true },
        { key: 'unsafe-experiment', title: '真实实验', route: '/job-experiments/9', entityType: 'JOB_EXPERIMENT', demoData: true }
      ],
      opsSteps: [
        { key: 'ai-ops', title: 'AI Ops', route: '/admin/analytics/ai', entityType: 'OPS', demoData: true }
      ]
    } satisfies PortfolioDemoStorylineVO

    expect(hasCompleteDemoMarkers(story)).toBe(true)
    expect(safeStoryRoutes(story)).toEqual([
      '/portfolio-demo?step=jd',
      '/job-experiments/9?demoFlag=true'
    ])
  })

  it('detects missing demo markers before rendering a portfolio story as isolated demo data', () => {
    const story = {
      status: {
        loaded: true,
        datasetKey: 'java-backend-demo',
        datasetName: 'Java 后端演示数据',
        status: 'LOADED',
        version: '2026.07',
        demoData: true,
        readOnly: true
      },
      steps: [
        { key: 'jd', title: '目标 JD', route: '/portfolio-demo?step=jd', entityType: 'TARGET_JOB' }
      ],
      opsSteps: []
    } satisfies PortfolioDemoStorylineVO

    expect(hasCompleteDemoMarkers(story)).toBe(false)
  })
})
