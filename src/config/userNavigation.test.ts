import { describe, expect, it } from 'vitest'

import {
  resolveUserNavigationGroup,
  resolveUserNavigationItem,
  userNavigationGroups
} from './userNavigation'

describe('user navigation route matching', () => {
  it('uses a named dynamic route match before a broad path prefix', () => {
    const result = resolveUserNavigationItem({
      name: 'ResumeEdit',
      path: '/resumes/42/edit'
    })

    expect(result).toMatchObject({
      group: { key: 'prepare' },
      item: { key: 'resume-workbench' }
    })
  })

  it('uses the longest path prefix when a route name is unavailable', () => {
    const result = resolveUserNavigationItem({
      path: '/interviews/42/report'
    })

    expect(result).toMatchObject({
      group: { key: 'interview' },
      item: { key: 'interview-history' }
    })
  })

  it('does not select a navigation group for unrelated routes', () => {
    expect(resolveUserNavigationGroup(
      { path: '/profile' },
      userNavigationGroups
    )).toBeNull()
  })
})
