import { describe, expect, it, vi } from 'vitest'

import {
  defaultUserKnownPaths,
  resolveAppRoutePath
} from '@/features/route-safety'
import { routes } from '@/router/routes'

const appConfig = vi.hoisted(() => ({
  enableV4Preview: false,
  enableV4ExperimentalRoutes: false,
  enableV4PreviewAccess: true,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableAdminTraceCockpit: false,
  enableV6WeeklyReport: false
}))

vi.mock('@/config', () => ({ appConfig }))

const weeklyReportRoute = () => {
  const userRoot = routes.find((route) => route.path === '/')
  return userRoot?.children?.find((route) => route.path === 'agent/weekly-reports')
}

describe('weekly report feature gate', () => {
  it('keeps the route registered but blocks direct and safety-path access while disabled', () => {
    appConfig.enableV6WeeklyReport = false
    const route = weeklyReportRoute()

    expect(defaultUserKnownPaths).toContain('/agent/weekly-reports')
    expect(route?.name).toBe('AgentWeeklyReports')
    expect((route?.beforeEnter as () => unknown)()).toEqual({ name: 'FeatureUnavailable' })
    expect(resolveAppRoutePath('/agent/weekly-reports', {
      enableV6WeeklyReport: false
    })).toMatchObject({
      path: '/agent/today',
      blockedPath: '/agent/weekly-reports'
    })
  })

  it('allows the registered route and preserves the requested path while enabled', () => {
    appConfig.enableV6WeeklyReport = true
    const route = weeklyReportRoute()

    expect((route?.beforeEnter as () => unknown)()).toBe(true)
    expect(resolveAppRoutePath('/agent/weekly-reports?weekStartDate=2026-07-13', {
      enableV6WeeklyReport: true
    })).toEqual({
      path: '/agent/weekly-reports?weekStartDate=2026-07-13'
    })
  })
})
