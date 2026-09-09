import { flushPromises, mount, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerPush = vi.hoisted(() => vi.fn())
const detailApi = vi.hoisted(() => vi.fn())
const listApi = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  params: { id: '9701708' },
  query: {} as Record<string, string>
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push: routerPush })
}))

vi.mock('@/api/projectEvidence', () => ({
  getProjectEvidenceDetailApi: detailApi,
  getProjectEvidenceListApi: listApi
}))

import ProjectEvidenceDetailView from '@/views/project-evidence/ProjectEvidenceDetailView.vue'
import ProjectEvidenceListView from '@/views/project-evidence/ProjectEvidenceListView.vue'

const notFoundWithTrace = () => ({
  response: {
    status: 404,
    data: { code: 40400, message: '项目证据不存在', traceId: 'TRACE-ABC-123' },
    headers: { get: (n: string) => (String(n).toLowerCase() === 'x-trace-id' ? 'TRACE-ABC-123' : null) }
  }
})

const notFoundWithoutTrace = () => ({
  response: {
    status: 404,
    data: { code: 40400, message: '项目证据不存在' },
    headers: { get: () => null }
  }
})

describe('ProjectEvidenceDetailView empty-state hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeState.params = { id: '9701708' }
    routeState.query = {}
    detailApi.mockReset()
    routerPush.mockClear()
  })

  const mountDetail = async () => {
    const wrapper = mount(ProjectEvidenceDetailView, {
      global: {
        directives: { loading: () => undefined },
        stubs: {
          'el-tag': { template: '<span><slot /></span>' },
          'el-tooltip': true,
          'el-tabs': true,
          'el-tab-pane': true
        }
      }
    })
    await flushPromises()
    return wrapper
  }

  it('renders the list fallback card with title/role and traceId when navigated from the list', async () => {
    routeState.query = { from: 'list', listId: '99999999', title: '测试项目A', role: '后端工程师' }
    detailApi.mockRejectedValue(notFoundWithTrace())

    const wrapper = await mountDetail()

    const card = wrapper.find('.fallback-origin-card')
    expect(card.exists()).toBe(true)
    expect(card.find('h2').text()).toBe('测试项目A')
    expect(card.find('.fallback-origin-role').text()).toBe('后端工程师')

    const stateP = wrapper.find('.app-state p')
    expect(stateP.exists()).toBe(true)
    expect(stateP.text()).toContain('追踪号')
    expect(stateP.text()).toContain('TRACE-ABC-123')
  })

  it('does NOT render the list fallback card when there is no list context', async () => {
    routeState.query = {}
    detailApi.mockRejectedValue(notFoundWithTrace())

    const wrapper = await mountDetail()

    expect(wrapper.find('.fallback-origin-card').exists()).toBe(false)
    const stateP = wrapper.find('.app-state p')
    expect(stateP.text()).toContain('追踪号')
    expect(stateP.text()).toContain('TRACE-ABC-123')
  })

  it('shows the plain 404 message (no traceId) when the backend omits the traceId', async () => {
    routeState.query = { from: 'list', listId: '99999999', title: '项目B', role: '' }
    detailApi.mockRejectedValue(notFoundWithoutTrace())

    const wrapper = await mountDetail()

    const card = wrapper.find('.fallback-origin-card')
    expect(card.exists()).toBe(true)
    expect(card.find('h2').text()).toBe('项目B')
    // role empty -> fallback copy
    expect(card.find('.fallback-origin-role').text()).toBe('未填写项目角色')
    expect(wrapper.find('.app-state p').text()).not.toContain('追踪号')
  })

  it('routes back to the list when the primary action is invoked', async () => {
    routeState.query = { from: 'list', listId: '99999999', title: '测试项目A', role: '后端工程师' }
    detailApi.mockRejectedValue(notFoundWithTrace())

    const wrapper = await mountDetail()
    const backButton = wrapper.findAll('button').find((b) => b.text().includes('返回我的项目'))
    expect(backButton).toBeTruthy()
    await backButton!.trigger('click')
    expect(routerPush).toHaveBeenCalledWith('/project-evidence')
  })
})

describe('ProjectEvidenceListView list-context handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockClear()
    listApi.mockReset()
  })

  it('passes list context via route query when opening a detail', async () => {
    listApi.mockResolvedValue({ records: [], total: 0, pageNo: 1, pageSize: 8 })
    const wrapper = shallowMount(ProjectEvidenceListView, {
      global: {
        directives: { loading: () => undefined },
        stubs: {
          'el-input': true,
          'el-select': true,
          'el-option': true,
          'el-tag': true,
          'el-pagination': true
        }
      }
    })
    await flushPromises()

    const item = { id: 42, title: '星辰项目', role: '后端工程师' } as never
    wrapper.vm.$.setupState.openDetail(item)

    expect(routerPush).toHaveBeenCalledWith({
      path: '/project-evidence/42',
      query: { from: 'list', listId: '42', title: '星辰项目', role: '后端工程师' }
    })
  })
})
