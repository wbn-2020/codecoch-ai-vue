import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PortfolioDemoView from '@/views/portfolio-demo/PortfolioDemoView.vue'

const routerPush = vi.hoisted(() => vi.fn())
const warningMessage = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush })
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    warning: warningMessage
  }
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
  const button = wrapper.findAll('.action-row .el-button-stub').find((item) => item.text().includes(label))
  expect(button, `expected action button ${label} to exist`).toBeTruthy()
  return button!
}

describe('PortfolioDemoView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerPush.mockResolvedValue(undefined)
  })

  it('renders the static rehearsal workbench and health sections', async () => {
    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Portfolio rehearsal')
    expect(wrapper.text()).toContain('Route script')
    expect(wrapper.text()).toContain('Demo health')
    expect(wrapper.text()).toContain('Speaker cards')
    expect(wrapper.text()).toContain('Phase 5.5 handoff')
    expect(wrapper.text()).toContain('0/8')
    expect(wrapper.findAll('.node-card')).toHaveLength(8)
  })

  it('switches rehearsal routes and resets the visible route progress', async () => {
    const wrapper = await mountView()
    const tabs = wrapper.findAll('[role="tab"]')

    expect(tabs).toHaveLength(3)
    await tabs[1].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('0/6')
    expect(wrapper.findAll('.node-card')).toHaveLength(6)
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe(tabs[1].text())
  })

  it('marks the current node and advances without using backend storyline APIs', async () => {
    const wrapper = await mountView()

    await findActionButton(wrapper, '标记当前节点').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1/8')
    expect(wrapper.findAll('.node-card.done')).toHaveLength(1)

    await findActionButton(wrapper, '下一个节点').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1/8')
    expect(wrapper.findAll('.node-card.done')).toHaveLength(1)
    expect(wrapper.findAll('.node-card')[1].classes()).toContain('current')
  })

  it('opens the current node through the portfolio demo safe route resolver', async () => {
    const wrapper = await mountView()

    await findActionButton(wrapper, '打开当前页面').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith('/job-targets?demoFlag=true')
    expect(warningMessage).not.toHaveBeenCalled()
  })
})
