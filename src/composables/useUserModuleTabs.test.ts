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
    expect(progressTabs.value.map((item) => item.to)).toContain('/job-targets')
    expect(progressTabs.value.find((item) => item.to === '/applications')).toMatchObject({
      prefixes: ['/applications', '/career-campaigns']
    })

    // P0 收敛后周报已移出导航配置，feature flag 开关不再恢复该入口
    appConfig.enableV6WeeklyReport = true
    const enabledProgressTabs = useUserModuleTabs('progress')
    expect(enabledProgressTabs.value.map((item) => item.to)).not.toContain('/agent/weekly-reports')
  })

  it('resolves module tabs for primary and logic groups alike', () => {
    const trainTabs = useUserModuleTabs('train')
    expect(trainTabs.value.map((item) => item.to)).toContain('/questions/recommendations')

    // prepare 是历史逻辑组（简历入口并入资料主导航），页内 tabs 仍从该组解析
    const matchingTabs = useUserModuleTabs('matching')
    expect(matchingTabs.value.map((item) => item.to)).toContain('/job-targets')
  })
})
