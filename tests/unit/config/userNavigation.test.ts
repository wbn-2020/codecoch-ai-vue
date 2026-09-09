import { describe, expect, it } from 'vitest'

import {
  getAllUserNavigationGroups,
  getVisibleUserNavigationGroups,
  mobilePrimaryNavigationKeys,
  PRIMARY_NAVIGATION_KEYS,
  resolveUserNavigationGroup,
  resolveUserNavigationItem,
  userNavigationGroups,
  type UserNavigationFeatureState
} from '@/config/userNavigation'

const allFeatures: UserNavigationFeatureState = {
  v4Preview: true,
  v4Growth: true,
  v4Knowledge: true,
  v6WeeklyReport: true,
  v9EvidenceLearning: true
}

describe('userNavigation P0 six-entry IA', () => {
  it('exposes exactly the six P0 primary groups in product order', () => {
    const visible = getVisibleUserNavigationGroups(allFeatures)

    expect(visible.map((group) => group.key)).toEqual(PRIMARY_NAVIGATION_KEYS)
    expect(visible.map((group) => group.label)).toEqual([
      '今日',
      '求职',
      '资料',
      '面试',
      '训练',
      '准备度'
    ])
  })

  it('keeps prepare/matching as non-primary logic groups for module tabs only', () => {
    const visibleKeys = getVisibleUserNavigationGroups(allFeatures).map((group) => group.key)

    expect(visibleKeys).not.toContain('prepare')
    expect(visibleKeys).not.toContain('matching')

    const allKeys = userNavigationGroups.map((group) => group.key)
    expect(allKeys).toContain('prepare')
    expect(allKeys).toContain('matching')
  })

  it('covers the P0 primary destinations in the visible navigation', () => {
    const paths = getVisibleUserNavigationGroups(allFeatures)
      .flatMap((group) => group.items.map((item) => item.path))

    expect(paths).toContain('/dashboard')
    expect(paths).toContain('/job-targets')
    expect(paths).toContain('/resume-match')
    expect(paths).toContain('/applications')
    expect(paths).toContain('/career-calendar')
    expect(paths).toContain('/resumes/workbench')
    expect(paths).toContain('/project-evidence')
    expect(paths).toContain('/interviews/create')
    expect(paths).toContain('/interviews/history')
    expect(paths).toContain('/questions/recommendations')
    expect(paths).toContain('/questions/wrong-records')
    expect(paths).toContain('/study-plans')
    expect(paths).toContain('/ability-map')
    expect(paths).toContain('/skill-profile')
    expect(paths).toContain('/weakness-analysis')
  })

  it('keeps removed P0 destinations out of the visible navigation regardless of feature flags', () => {
    const paths = getVisibleUserNavigationGroups(allFeatures)
      .flatMap((group) => group.items.map((item) => item.path))

    expect(paths).not.toContain('/agent/tasks')
    expect(paths).not.toContain('/agent/reviews')
    expect(paths).not.toContain('/agent/weekly-reports')
    expect(paths).not.toContain('/agent/memory')
    expect(paths).not.toContain('/knowledge')
    expect(paths).not.toContain('/evidence-assets')
    expect(paths).not.toContain('/portfolio-demo')
    expect(paths).not.toContain('/job-experiments')
    expect(paths).not.toContain('/arena/leaderboard')
    expect(paths).not.toContain('/arena/battle')
    expect(paths).not.toContain('/tools')
    expect(paths).not.toContain('/daily-tasks')
    expect(paths).not.toContain('/questions/favorites')
    expect(paths).not.toContain('/analytics/personal')
    expect(paths).not.toContain('/resume-versions')
    expect(paths).not.toContain('/application-packages')
    expect(paths).not.toContain('/onboarding')
  })

  it('keeps mobile primary navigation within the P0 set', () => {
    mobilePrimaryNavigationKeys.forEach((key) => {
      expect(PRIMARY_NAVIGATION_KEYS).toContain(key)
    })
  })
})

describe('userNavigation route matching', () => {
  it('uses route name before exact path when ownership signals conflict', () => {
    const resolved = resolveUserNavigationItem({
      name: 'InterviewRoom',
      path: '/questions'
    })

    expect(resolved?.group.key).toBe('interview')
    expect(resolved?.item.key).toBe('interview-history')
  })

  it('uses an exact path before a broader matching prefix', () => {
    const resolved = resolveUserNavigationItem({
      path: '/resumes/manage'
    })

    expect(resolved?.group.key).toBe('resources')
    expect(resolved?.item.key).toBe('resume-management')
  })

  it('routes the resume workbench to an editable resume instead of the preparation guide', () => {
    expect(resolveUserNavigationItem({ name: 'ResumeJobHub', path: '/resumes' })?.item.key)
      .not.toBe('resume-workbench')
    expect(resolveUserNavigationItem({ name: 'ResumeEdit', path: '/resumes/42/edit' })?.item.key)
      .toBe('resume-workbench')
  })

  it('does not select a navigation group for unrelated routes', () => {
    expect(resolveUserNavigationGroup(
      { path: '/profile' },
      userNavigationGroups
    )).toBeNull()
  })

  it('keeps compatibility routes owned without changing their paths', () => {
    expect(resolveUserNavigationGroup({ name: 'ResumeEdit', path: '/resumes/42/edit' })?.key).toBe('resources')
    expect(resolveUserNavigationGroup({ name: 'ApplicationWorkspace', path: '/applications/42' })?.key).toBe('progress')
    expect(resolveUserNavigationGroup({ name: 'WeaknessAnalysis', path: '/weakness-analysis' })?.key).toBe('growth')
  })

  it('uses the longest matching prefix when no route name or exact path is available', () => {
    const resolved = resolveUserNavigationItem(
      { path: '/workspace/detail' },
      [
        {
          key: 'today',
          label: '今日',
          mobileLabel: '今日',
          description: '',
          path: '/workspace',
          icon: userNavigationGroups[0].icon,
          items: [
            {
              key: 'broad',
              label: 'Broad',
              description: '',
              path: '/workspace',
              icon: userNavigationGroups[0].icon,
              prefixes: ['/workspace']
            }
          ]
        },
        {
          key: 'progress',
          label: '进度',
          mobileLabel: '进度',
          description: '',
          path: '/workspace/detail',
          icon: userNavigationGroups[0].icon,
          items: [
            {
              key: 'specific',
              label: 'Specific',
              description: '',
              path: '/workspace/detail',
              icon: userNavigationGroups[0].icon,
              prefixes: ['/workspace/detail']
            }
          ]
        }
      ]
    )

    expect(resolved?.group.key).toBe('progress')
    expect(resolved?.item.key).toBe('specific')
  })
})

describe('userNavigation module tabs compatibility', () => {
  it('still exposes all logic groups for in-page module tabs', () => {
    const all = getAllUserNavigationGroups(allFeatures)
    const keys = all.map((group) => group.key)

    expect(keys).toEqual(expect.arrayContaining(['prepare', 'matching', 'train', 'resources']))
  })
})
