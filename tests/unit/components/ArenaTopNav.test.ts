import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import ArenaTopNav from '@/components/layout/ArenaTopNav.vue'

const appConfig = vi.hoisted(() => ({
  enableV4PreviewAccess: true,
  enableV4ExperimentalRoutes: false,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableV6WeeklyReport: false,
  enableV9EvidenceLearning: false
}))
const routeName = ref<string | undefined>('Dashboard')
const routePath = ref('/dashboard')
const routeMeta = ref<Record<string, unknown>>({ title: '今天' })
const push = vi.fn()

vi.mock('@/config', () => ({ appConfig }))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return routeName.value
    },
    get path() {
      return routePath.value
    },
    get fullPath() {
      return routePath.value
    },
    get meta() {
      return routeMeta.value
    }
  }),
  useRouter: () => ({
    push
  })
}))

const mountNav = () => mount(ArenaTopNav, {
  attachTo: document.body,
  props: {
    displayName: 'CodeCoachAI 用户',
    avatarText: 'C',
    avatarUrl: '',
    canAccessAdmin: false
  },
  global: {
    stubs: {
      'el-avatar': {
        props: ['src'],
        template: '<span class="el-avatar-stub" :data-src="src"><slot /></span>'
      },
      'el-dropdown': {
        template: '<div class="el-dropdown-stub"><slot /><slot name="dropdown" /></div>'
      },
      'el-dropdown-menu': {
        template: '<div><slot /></div>'
      },
      'el-dropdown-item': {
        props: ['command', 'divided'],
        template: '<button type="button"><slot /></button>'
      }
    }
  }
})

describe('ArenaTopNav', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
    setActivePinia(createPinia())
    routeName.value = 'Dashboard'
    routePath.value = '/dashboard'
    routeMeta.value = { title: '今天' }
    appConfig.enableV4GrowthPreview = true
    appConfig.enableV4KnowledgePreview = false
    appConfig.enableV6WeeklyReport = false
    appConfig.enableV9EvidenceLearning = false
    push.mockReset()
  })

  it('renders seven config-driven desktop groups and a compact overflow trigger', () => {
    const wrapper = mountNav()
    const labels = wrapper
      .findAll('.arena-top-nav__group:not(.arena-top-nav__overflow) > .arena-top-nav__link--primary')
      .map((item) => item.text())

    expect(labels).toEqual(['今日', '准备', '训练', '面试', '进度', '资源', '成长'])
    expect(wrapper.get('[data-nav-trigger="more"]').text()).toContain('更多')
    expect(wrapper.get('.arena-top-nav__group:first-child .arena-top-nav__link--primary').attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })

  it('routes directly from a desktop group label while keeping its submenu separately clickable', async () => {
    const wrapper = mountNav()

    await wrapper
      .findAll('.arena-top-nav__link--primary')
      .find((item) => item.text() === '进度')!
      .trigger('click')

    expect(push).toHaveBeenCalledWith('/applications')
    expect(wrapper.find('#arena-nav-menu-progress').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens a group menu and routes through its configured child entry', async () => {
    const wrapper = mountNav()

    await wrapper.get('[data-nav-trigger="progress"]').trigger('click')
    const menu = wrapper.get('#arena-nav-menu-progress')
    expect(menu.attributes('role')).toBe('menu')
    expect(menu.find('[data-nav-path="/agent/weekly-reports"]').exists()).toBe(false)

    await menu.get('[data-nav-path="/applications"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/applications')
    expect(wrapper.get('[data-nav-trigger="progress"]').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('keeps feature flag visibility aligned with the runtime configuration', async () => {
    appConfig.enableV6WeeklyReport = true
    appConfig.enableV9EvidenceLearning = true
    const wrapper = mountNav()

    await wrapper.get('[data-nav-trigger="progress"]').trigger('click')
    expect(wrapper.find('[data-nav-path="/agent/weekly-reports"]').exists()).toBe(true)

    await wrapper.get('[data-nav-trigger="resources"]').trigger('click')
    expect(wrapper.find('[data-nav-path="/evidence-assets"]').exists()).toBe(true)
    expect(wrapper.find('[data-nav-path="/knowledge"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('uses route name priority to mark the correct group active', () => {
    appConfig.enableV6WeeklyReport = true
    routeName.value = 'AgentWeeklyReports'
    routePath.value = '/agent/today'
    const wrapper = mountNav()

    expect(wrapper.get('[data-nav-trigger="progress"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-nav-trigger="today"]').classes()).not.toContain('is-active')
    expect(wrapper.get('.arena-top-nav__mobile-title').text()).toBe('求职周报')
    wrapper.unmount()
  })

  it('supports ArrowDown menu entry and Escape focus restoration', async () => {
    const wrapper = mountNav()
    const trigger = wrapper.get('[data-nav-trigger="prepare"]')
    trigger.element.focus()

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()

    const firstItem = wrapper.get('[data-nav-menu-item="prepare"]')
    expect(document.activeElement).toBe(firstItem.element)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('keeps four primary mobile entries plus an accessible more menu', async () => {
    const wrapper = mountNav()
    const bottomItems = wrapper.findAll('.arena-bottom-nav__item')

    expect(bottomItems).toHaveLength(5)
    expect(bottomItems.map((item) => item.text())).toEqual(['今日', '准备', '训练', '进度', '更多'])

    const moreTrigger = bottomItems[4]
    moreTrigger.element.focus()
    await moreTrigger.trigger('click')
    await nextTick()

    expect(wrapper.get('#arena-mobile-more-panel').attributes('role')).toBe('dialog')
    expect(wrapper.get('#arena-mobile-more-panel').attributes('aria-modal')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(wrapper.find('#arena-mobile-more-panel').exists()).toBe(false)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(moreTrigger.element)
    wrapper.unmount()
  })
})
