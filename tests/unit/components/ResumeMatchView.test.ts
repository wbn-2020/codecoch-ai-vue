import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { new: '1' } }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

vi.mock('@/api/jobTarget', () => ({
  getCurrentJobTargetApi: vi.fn(async () => null),
  getJobTargetsApi: vi.fn(async () => [])
}))

vi.mock('@/api/resume', () => ({
  getResumesApi: vi.fn(async () => ({ records: [] }))
}))

vi.mock('@/api/resumeJobMatch', () => ({
  createResumeJobMatchReportApi: vi.fn(),
  streamCreateResumeJobMatchReportApi: vi.fn(),
  getResumeJobMatchReportsApi: vi.fn(async () => ({
    records: [{
      reportId: 9,
      resumeId: 7,
      targetJobId: 3,
      status: 'SUCCESS',
      trustStatus: 'TRUSTED',
      fallback: false,
      schemaWarningCount: 0,
      overallScore: 99,
      jobTitle: '高级 Java 工程师'
    }]
  }))
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}))

import ResumeMatchView from '@/views/v3/ResumeMatchView.vue'

describe('ResumeMatchView trusted history semantics', () => {
  it('uses professional match-analysis copy without level or emoji framing', async () => {
    const wrapper = mount(ResumeMatchView, {
      global: {
        directives: { loading: () => undefined },
        stubs: {
          AppState: true,
          'el-alert': true,
          'el-button': { template: '<button><slot /></button>' },
          'el-checkbox': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-select': { template: '<div><slot /></div>' }
        }
      }
    })

    await flushPromises()

    expect(wrapper.text()).toContain('岗位匹配 · 新建分析')
    expect(wrapper.text()).toContain('为这份岗位做一次匹配分析')
    expect(wrapper.text()).not.toContain('第 3 关')
    expect(wrapper.text()).not.toContain('🔍')
    expect(wrapper.html()).not.toContain('短板结算页')

    wrapper.unmount()
  })

  it('labels a successful legacy-enum report as pending review instead of showing its score', async () => {
    const wrapper = mount(ResumeMatchView, {
      global: {
        directives: { loading: () => undefined },
        stubs: {
          AppState: true,
          'el-alert': true,
          'el-button': { template: '<button><slot /></button>' },
          'el-checkbox': true,
          'el-form': { template: '<form><slot /></form>' },
          'el-form-item': { template: '<div><slot /></div>' },
          'el-option': true,
          'el-select': { template: '<div><slot /></div>' }
        }
      }
    })

    await flushPromises()

    const history = wrapper.get('.match-history__list')
    expect(history.text()).toContain('待复核')
    expect(history.text()).not.toContain('99')

    wrapper.unmount()
  })
})
