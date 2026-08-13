import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dashboardResult = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
const skillResult = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/api/dashboard', () => ({
  getV3DashboardOverviewApi: vi.fn(async () => dashboardResult.value)
}))

vi.mock('@/api/skillProfile', () => ({
  getSkillProfileOverviewApi: vi.fn(async () => skillResult.value)
}))

vi.mock('@/api/notification', () => ({
  getNotificationsApi: vi.fn(async () => ({ records: [] }))
}))

import V3DashboardView from '@/views/v3/V3DashboardView.vue'

describe('V3DashboardView trusted match semantics', () => {
  beforeEach(() => {
    dashboardResult.value = {
      latestMatch: {
        reportId: 9,
        status: 'SUCCESS',
        trustStatus: 'TRUSTED',
        fallback: false,
        schemaWarningCount: 0,
        overallScore: 99,
        summary: '高匹配'
      }
    }
    skillResult.value = {
      profileId: 7,
      overallScore: 88,
      gapCount: 2,
      profileName: 'Java 画像'
    }
  })

  it('does not surface untrusted report or profile scores as dashboard conclusions', async () => {
    const wrapper = mount(V3DashboardView, {
      global: {
        directives: { loading: () => undefined },
        stubs: {
          AppState: true,
          'el-alert': true,
          'el-button': { template: '<button><slot /></button>' },
          'el-progress': true,
          'el-tag': { template: '<span><slot /></span>' }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('结果待复核')
    expect(wrapper.text()).toContain('先完成可信匹配')
    expect(wrapper.text()).not.toContain('99 分')
    expect(wrapper.text()).not.toContain('88')

    wrapper.unmount()
  })
})
