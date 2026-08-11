import { describe, expect, it } from 'vitest'

import {
  getVisibleUserNavigationGroups,
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

describe('userNavigation', () => {
  it('defines job-search-oriented information architecture groups', () => {
    expect(userNavigationGroups.map((group) => group.label)).toEqual([
      '今日',
      '简历准备',
      '岗位匹配',
      '面试训练',
      '模拟面试',
      '投递管理',
      '求职资料',
      '成长分析'
    ])
  })

  it('keeps applications as a first-class navigation group outside compact overflow', () => {
    const applicationsGroup = userNavigationGroups.find((group) => group.key === 'progress')

    expect(applicationsGroup?.label).toBe('投递管理')
    expect(applicationsGroup?.compactOverflow).toBeUndefined()
    expect(applicationsGroup?.items.map((item) => item.path)).toContain('/applications')
  })

  it('keeps feature-gated destinations out of the visible navigation', () => {
    const groups = getVisibleUserNavigationGroups({
      ...allFeatures,
      v4Growth: false,
      v4Knowledge: false,
      v6WeeklyReport: false,
      v9EvidenceLearning: false
    })
    const paths = groups.flatMap((group) => group.items.map((item) => item.path))

    expect(paths).not.toContain('/agent/reviews')
    expect(paths).not.toContain('/agent/weekly-reports')
    expect(paths).not.toContain('/agent/memory')
    expect(paths).not.toContain('/knowledge')
    expect(paths).not.toContain('/evidence-assets')
    expect(paths).toContain('/applications')
    expect(paths).toContain('/project-evidence')
  })

  it('uses route name before exact path when ownership signals conflict', () => {
    const resolved = resolveUserNavigationItem({
      name: 'AgentWeeklyReports',
      path: '/agent/today'
    })

    expect(resolved?.group.key).toBe('progress')
    expect(resolved?.item.key).toBe('weekly-reports')
  })

  it('uses an exact path before a broader matching prefix', () => {
    const resolved = resolveUserNavigationItem({
      path: '/resumes/manage'
    })

    expect(resolved?.group.key).toBe('prepare')
    expect(resolved?.item.key).toBe('resume-management')
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

  it('keeps compatibility routes owned without changing their paths', () => {
    expect(resolveUserNavigationGroup({ name: 'RecordsTools', path: '/tools' })?.key).toBe('resources')
    expect(resolveUserNavigationGroup({ name: 'ResumeEdit', path: '/resumes/42/edit' })?.key).toBe('prepare')
    expect(resolveUserNavigationGroup({ name: 'ApplicationWorkspace', path: '/applications/42' })?.key).toBe('progress')
  })
})
