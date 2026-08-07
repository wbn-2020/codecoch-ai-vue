import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PortfolioDemoView from '@/views/portfolio-demo/PortfolioDemoView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const warningMessage = vi.hoisted(() => vi.fn())
const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: warningMessage
  }
}))

vi.mock('@/utils/request', () => ({
  default: requestMock
}))

const stubs = {
  'el-button': {
    props: ['disabled'],
    emits: ['click'],
    template: '<button class="el-button-stub" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  'el-tag': {
    template: '<span class="el-tag-stub"><slot /></span>'
  }
}

const mountView = async () => {
  const wrapper = mount(PortfolioDemoView, {
    global: {
      stubs
    }
  })
  await flushPromises()
  return wrapper
}

const findActionButton = (wrapper: Awaited<ReturnType<typeof mountView>>, label: string) => {
  const button = wrapper.findAll('.action-row .el-button-stub').find((item) =>
    item.text().includes(label) ||
    item.attributes('aria-label') === label ||
    item.attributes('title') === label
  )
  expect(button, `expected action button ${label} to exist`).toBeTruthy()
  return button!
}

describe('PortfolioDemoView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
  })

  it('renders the static rehearsal workbench and deferred rehearsal materials', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('演示线 · 收口前排练')
    expect(wrapper.text()).toContain('作品集排练工作台')
    expect(wrapper.text()).toContain('路线节拍')
    expect(wrapper.text()).toContain('排练护栏')
    expect(wrapper.text()).toContain('当前页面未接入会话持久化')
    expect(wrapper.text()).toContain('精简提词')
    expect(wrapper.text()).toContain('0/8')
    expect(wrapper.findAll('.route-tabs [role="tab"]')).toHaveLength(3)
    expect(wrapper.findAll('.beat-strip [role="tab"]')).toHaveLength(5)

    await wrapper.find('button.text-button').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.detail-node-list button')).toHaveLength(8)
    expect(wrapper.text()).toContain('完整提词与节点')

    await wrapper.findAll('.detail-tabs button')[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('静态健康检查')
    expect(wrapper.text()).toContain('演示健康检查')

    await wrapper.findAll('.detail-tabs button')[2].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Phase 5.5 handoff')
    expect(wrapper.text()).toContain('V5 非人工验收收口矩阵')
  })

  it('switches rehearsal routes and resets the visible route progress', async () => {
    const wrapper = await mountView()
    const tabs = wrapper.findAll('.route-tabs [role="tab"]')

    expect(tabs).toHaveLength(3)
    await tabs[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('0/6')
    expect(wrapper.findAll('.beat-strip [role="tab"]')).toHaveLength(5)
    expect(wrapper.find('.route-tabs [role="tab"][aria-selected="true"]').text()).toBe(tabs[1].text())
  })

  it('marks the current node and advances without using backend storyline APIs', async () => {
    const wrapper = await mountView()

    await findActionButton(wrapper, '标记当前节点').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1/8')
    expect(wrapper.findAll('.beat-strip .is-complete')).toHaveLength(1)

    await findActionButton(wrapper, '下一个节点').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1/8')
    expect(wrapper.findAll('.beat-strip .is-complete')).toHaveLength(1)
    expect(wrapper.find('.current-card .section-label').text()).toContain('第 2 段')
    expect(wrapper.find('.beat-strip [aria-selected="true"]').text()).toContain('JD 匹配')
  })

  it('keeps the technical route on five explicit beats', async () => {
    const wrapper = await mountView()
    const tabs = wrapper.findAll('.route-tabs [role="tab"]')

    await tabs[2].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('0/6')
    expect(wrapper.findAll('.beat-strip [role="tab"]')).toHaveLength(5)
    expect(wrapper.find('.beat-strip [aria-selected="true"]').text()).toContain('演示边界')

    await wrapper.findAll('.beat-strip [role="tab"]')[4].trigger('click')
    await flushPromises()

    expect(wrapper.find('.beat-strip [aria-selected="true"]').text()).toContain('异步与指标')
  })

  it('opens the current node through the portfolio demo safe route resolver', async () => {
    const wrapper = await mountView()

    await findActionButton(wrapper, '打开当前页面').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/job-targets?demoFlag=true')
    expect(warningMessage).not.toHaveBeenCalled()
    expect(requestMock.get).not.toHaveBeenCalled()
    expect(requestMock.post).not.toHaveBeenCalled()
  })
})
