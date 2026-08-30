import { describe, expect, it, vi } from 'vitest'

const appConfig = vi.hoisted(() => ({
  enableV4PreviewAccess: true,
  enableV4ExperimentalRoutes: false,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableV6WeeklyReport: false,
  enableV9EvidenceLearning: false
}))

vi.mock('@/config', () => ({ appConfig }))

import { useUserModuleTabs } from './useUserModuleTabs'

describe('useUserModuleTabs', () => {
  it('uses the shared navigation source and respects feature gates', () => {
    const progressTabs = useUserModuleTabs('progress')

    expect(progressTabs.value.map((item) => item.to)).toContain('/applications')
    expect(progressTabs.value.map((item) => item.to)).not.toContain('/agent/weekly-reports')
    expect(progressTabs.value.find((item) => item.to === '/applications')).toMatchObject({
      prefixes: ['/applications', '/career-campaigns']
    })

    appConfig.enableV6WeeklyReport = true
    const enabledProgressTabs = useUserModuleTabs('progress')
    expect(enabledProgressTabs.value.map((item) => item.to)).toContain('/agent/weekly-reports')
  })
})
