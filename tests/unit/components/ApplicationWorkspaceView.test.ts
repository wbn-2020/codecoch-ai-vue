import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getWorkspace: vi.fn(),
  getInterview: vi.fn(),
  getOffers: vi.fn(),
  getContacts: vi.fn(),
  getActivities: vi.fn(),
  getResearchSources: vi.fn(),
  getResearchSnapshot: vi.fn(),
  transitionStatus: vi.fn()
}))

vi.mock('@/api/v7Career', () => ({
  getApplicationWorkspaceV7Api: api.getWorkspace,
  getInterviewProcessV7Api: api.getInterview,
  getOffersV7Api: api.getOffers,
  getContactsV7Api: api.getContacts,
  getActivitiesV7Api: api.getActivities,
  getResearchSourcesV7Api: api.getResearchSources,
  getLatestResearchSnapshotV7Api: api.getResearchSnapshot,
  transitionApplicationStatusV7Api: api.transitionStatus
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push: vi.fn() })
}))

import { appConfig } from '@/config'
import ApplicationWorkspaceView from '@/views/v4/application-workspace/ApplicationWorkspaceView.vue'

const stubs = {
  AppState: {
    props: ['title', 'description'],
    template: '<section><h3>{{ title }}</h3><p>{{ description }}</p><slot /></section>'
  },
  'el-alert': {
    props: ['title', 'description'],
    template: '<div v-bind="$attrs"><strong>{{ title }}</strong><p>{{ description }}</p></div>'
  },
  'el-button': { template: '<button><slot /></button>' },
  'el-tag': { template: '<span><slot /></span>' },
  'el-skeleton': true,
  'el-tabs': { template: '<div><slot /></div>' },
  'el-tab-pane': {
    props: ['label', 'name'],
    template: '<section :data-tab="name"><span>{{ label }}</span><slot /></section>'
  },
  'el-dialog': { template: '<div><slot /><slot name="footer" /></div>' },
  'el-form': { template: '<form><slot /></form>' },
  'el-form-item': { template: '<label><slot /></label>' },
  'el-select': { template: '<select><slot /></select>' },
  'el-option': true,
  'el-input': true
}

describe('ApplicationWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    appConfig.enableV7RealInterview = true
    appConfig.enableV7Offer = true
    appConfig.enableV7ContactActivity = true
    appConfig.enableV7Research = true
    api.getWorkspace.mockResolvedValue({
      application: {
        id: 7,
        companyName: '示例科技',
        jobTitle: '后端工程师',
        status: 'APPLIED',
        lockVersion: 2
      },
      capabilities: ['REAL_INTERVIEW', 'OFFER', 'CONTACT_ACTIVITY', 'RESEARCH'],
      coverage: {
        included: ['APPLICATION'],
        unavailable: ['INTERVIEW_REPORT']
      },
      sections: {
        timeline: {
          data: [{ id: 1, eventType: 'APPLIED', eventTime: '2026-07-18', summary: '已投递' }]
        },
        materials: { data: [] },
        'next-steps': { data: [] }
      }
    })
    api.getInterview.mockResolvedValue({ rounds: [] })
    api.getOffers.mockResolvedValue([])
    api.getContacts.mockResolvedValue([])
    api.getActivities.mockResolvedValue([])
    api.getResearchSources.mockResolvedValue([])
    api.getResearchSnapshot.mockResolvedValue(null)
  })

  it('shows capability tabs and an explicit partial failure warning', async () => {
    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('示例科技 · 后端工程师')
    expect(wrapper.text()).toContain('概览')
    expect(wrapper.text()).toContain('面试')
    expect(wrapper.text()).toContain('Offer')
    expect(wrapper.text()).toContain('联系人')
    expect(wrapper.text()).toContain('研究')
    expect(wrapper.get('[data-testid="workspace-partial-failure"]').text()).toContain('工作区部分来源不可用')
  })

  it('loads an optional domain only when its tab becomes active', async () => {
    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()
    expect(api.getOffers).not.toHaveBeenCalled()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { activeTab: string } }
    }).$.setupState
    setupState.activeTab = 'offer'
    await flushPromises()

    expect(api.getOffers).toHaveBeenCalledWith(7)
  })

  it('shows a successful empty state without a partial-failure warning', async () => {
    api.getWorkspace.mockResolvedValueOnce({
      application: {
        id: 7,
        companyName: 'Empty Company',
        jobTitle: 'Frontend Engineer',
        status: 'APPLIED',
        lockVersion: 2
      },
      capabilities: ['OFFER'],
      coverage: { included: ['APPLICATION'] },
      nextSteps: []
    })

    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { activeTab: string } }
    }).$.setupState
    setupState.activeTab = 'offer'
    await flushPromises()

    expect(api.getOffers).toHaveBeenCalledWith(7)
    expect(wrapper.text()).toContain('还没有 Offer')
    expect(wrapper.find('[data-testid="workspace-partial-failure"]').exists()).toBe(false)
  })

  it('keeps successful optional data visible when a sibling source fails', async () => {
    api.getContacts.mockResolvedValue([{
      id: 8,
      displayName: 'Alex',
      role: 'Hiring Manager',
      channelType: 'EMAIL',
      maskedContactHint: 'a***@example.com'
    }])
    api.getActivities.mockRejectedValue(new Error('activity source unavailable'))

    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: { activeTab: string } }
    }).$.setupState
    setupState.activeTab = 'contacts'
    await flushPromises()

    expect(wrapper.text()).toContain('Alex')
    expect(wrapper.text()).toContain('还没有活动记录')
    expect((wrapper.vm as unknown as {
      $: { setupState: { sectionErrors: Record<string, string> } }
    }).$.setupState.sectionErrors.contacts).toContain('联系人或活动来源部分不可用')
  })

  it('retries the workspace request after an initial load failure', async () => {
    api.getWorkspace
      .mockRejectedValueOnce(new Error('workspace unavailable'))
      .mockResolvedValueOnce({
        application: {
          id: 7,
          companyName: 'Reloaded Company',
          jobTitle: 'Frontend Engineer',
          status: 'APPLIED',
          lockVersion: 3
        },
        capabilities: ['OFFER'],
        coverage: { included: ['APPLICATION'] },
        nextSteps: []
      })

    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    expect(wrapper.text()).toContain('机会工作区加载失败')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.getWorkspace).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Reloaded Company')
  })
})
