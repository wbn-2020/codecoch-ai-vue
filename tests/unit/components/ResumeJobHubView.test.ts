import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import ResumeJobHubView from '@/views/resume/ResumeJobHubView.vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() })
}))

vi.mock('@/api/jobTarget', () => ({
  getCurrentJobTargetApi: vi.fn(() => new Promise(() => undefined)),
  getJobTargetsApi: vi.fn(() => new Promise(() => undefined))
}))

vi.mock('@/api/resume', () => ({
  getResumeDetailApi: vi.fn(),
  getResumesApi: vi.fn(() => new Promise(() => undefined))
}))

vi.mock('@/api/resumeJobMatch', () => ({
  getLatestResumeJobMatchReportApi: vi.fn()
}))

vi.mock('@/api/skillProfile', () => ({
  getSkillProfileOverviewApi: vi.fn()
}))

const stubs = {
  'el-alert': true,
  'el-button': {
    template: '<button><slot /></button>'
  },
  'el-progress': true,
  'el-tag': {
    template: '<span><slot /></span>'
  },
  AppState: {
    props: ['title'],
    template: '<div>{{ title }}<slot /></div>'
  },
  GitCompareArrows: true,
  ResumeDocumentPreview: true
}

describe('ResumeJobHubView', () => {
  it('renders the empty state while current job data is still loading', async () => {
    const wrapper = mount(ResumeJobHubView, {
      global: {
        directives: {
          loading: () => undefined
        },
        stubs
      }
    })

    await flushPromises()

    expect(wrapper.find('.resume-job-hub').exists(), wrapper.html()).toBe(true)
    expect(wrapper.text()).toContain('还没有岗位关键词覆盖结果')
  })
})
