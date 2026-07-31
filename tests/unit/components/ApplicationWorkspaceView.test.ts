import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

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

const routerState = vi.hoisted(() => ({ route: null as any }))
const ui = vi.hoisted(() => ({
  confirm: vi.fn(),
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn()
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

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  routerState.route = reactive({ params: { id: '7' } })
  return {
    useRoute: () => routerState.route,
    useRouter: () => ({ push: vi.fn() })
  }
})

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: ui.warning,
    success: ui.success,
    error: ui.error
  },
  ElMessageBox: {
    confirm: ui.confirm
  }
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
    routerState.route.params.id = '7'
    ui.confirm.mockResolvedValue(undefined)
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
      allowedTransitions: ['INTERVIEWING', 'OFFER'],
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
    expect(wrapper.get('[data-testid="contacts-partial-failure"]').text())
      .toContain('联系人或活动来源暂时不可用')
  })

  it('shows research partial failure while preserving successful sources', async () => {
    api.getResearchSources.mockResolvedValue([{
      id: 9,
      title: '公司官网',
      sourceType: 'OFFICIAL',
      active: true
    }])
    api.getResearchSnapshot.mockRejectedValue(new Error('snapshot unavailable'))

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
    setupState.activeTab = 'research'
    await flushPromises()

    expect(wrapper.text()).toContain('公司官网')
    expect(wrapper.get('[data-testid="research-partial-failure"]').text())
      .toContain('研究来源或快照暂时不可用')
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

  it('does not apply a stale status response after the route switches to another opportunity', async () => {
    let resolveTransition!: (value: unknown) => void
    api.getWorkspace.mockImplementation(async (id: number) => ({
      application: {
        id,
        companyName: id === 7 ? '旧公司' : '新公司',
        jobTitle: '后端工程师',
        status: 'APPLIED',
        lockVersion: id === 7 ? 2 : 4
      },
      capabilities: ['OFFER'],
      allowedTransitions: ['INTERVIEWING'],
      coverage: { included: ['APPLICATION'] },
      nextSteps: []
    }))
    api.transitionStatus.mockReturnValue(new Promise((resolve) => {
      resolveTransition = resolve
    }))

    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.nextStatus = 'INTERVIEWING'
    const transitionRequest = setupState.confirmStatusTransition()
    await flushPromises()

    expect(api.transitionStatus).toHaveBeenCalledWith(7, {
      targetStatus: 'INTERVIEWING',
      expectedLockVersion: 2,
      idempotencyKey: 'application-status:7:2:INTERVIEWING',
      note: undefined
    })

    routerState.route.params.id = '8'
    await flushPromises()
    expect(api.getWorkspace).toHaveBeenLastCalledWith(8)

    resolveTransition({
      application: { id: 7, status: 'INTERVIEWING', lockVersion: 3 },
      allowedTransitions: ['OFFER']
    })
    await transitionRequest
    await flushPromises()

    expect(setupState.workspace.application.id).toBe(8)
    expect(wrapper.text()).toContain('新公司 · 后端工程师')
    expect(wrapper.text()).not.toContain('机会状态已更新。')
  })

  it('clears loading and shows an error for an invalid opportunity id', async () => {
    routerState.route.params.id = 'invalid'

    const wrapper = mount(ApplicationWorkspaceView, {
      global: {
        stubs,
        directives: { loading: () => undefined }
      }
    })
    await flushPromises()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    expect(api.getWorkspace).not.toHaveBeenCalled()
    expect(setupState.loading).toBe(false)
    expect(wrapper.text()).toContain('机会编号无效')
  })

  it('blocks status writes when the backend did not return a lock version', async () => {
    api.getWorkspace.mockResolvedValueOnce({
      application: {
        id: 7,
        companyName: '缺版本公司',
        jobTitle: '后端工程师',
        status: 'APPLIED'
      },
      capabilities: ['OFFER'],
      allowedTransitions: ['INTERVIEWING'],
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

    const statusButton = wrapper.findAll('button')
      .find((button) => button.text().includes('更新状态'))
    expect(statusButton?.attributes('disabled')).toBeDefined()

    const setupState = (wrapper.vm as unknown as {
      $: { setupState: Record<string, any> }
    }).$.setupState
    setupState.openStatusDialog()
    expect(ui.warning).toHaveBeenCalledWith('当前机会版本信息缺失，请刷新后重试。')
  })
})
