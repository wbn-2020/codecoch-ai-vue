import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import UserTopNav from '@/components/layout/UserTopNav.vue'

const appConfig = vi.hoisted(() => ({
  enableV4PreviewAccess: true,
  enableV4ExperimentalRoutes: false,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableV6WeeklyReport: false,
  enableV9EvidenceLearning: false
}))
const routePath = ref('/interviews/create')
const routeMeta = ref<Record<string, unknown>>({})
const push = vi.fn()

vi.mock('@/config', () => ({ appConfig }))

vi.mock('vue-router', () => ({
  useRoute: () => ({
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

const mountNav = (props: Partial<InstanceType<typeof UserTopNav>['$props']> = {}) => mount(UserTopNav, {
  props: {
    displayName: 'CodeCoachAI 用户',
    avatarText: 'C',
    avatarUrl: '',
    unreadCount: 0,
    unreadAvailable: true,
    notificationTooltip: '通知中心',
    canAccessAdmin: false,
    ...props
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
      },
      'el-tooltip': {
        template: '<span><slot /></span>'
      }
    }
  }
})

const legacySecondaryLabels = [
  '今日任务',
  'AI 任务中心',
  '记录与工具',
  '求职实验台',
  '投递管理',
  '投递包',
  '新手引导',
  '专项训练房间',
  '面试复盘记录'
]

describe('UserTopNav navigation discovery', () => {
  beforeEach(() => {
    routePath.value = '/interviews/create'
    routeMeta.value = {}
    appConfig.enableV6WeeklyReport = false
    appConfig.enableV9EvidenceLearning = false
    push.mockReset()
  })

  it('keeps the two highest-frequency destinations directly available on desktop', () => {
    const wrapper = mountNav()
    const shortcuts = wrapper.findAll('.priority-link')

    expect(shortcuts.map((item) => item.text())).toEqual(['今日任务', '投递管理'])
    expect(shortcuts.map((item) => item.attributes('aria-label'))).toEqual(['今日任务', '投递管理'])
  })

  it('opens a grouped feature navigator and preserves every former secondary destination', async () => {
    const wrapper = mountNav()

    await wrapper.get('.more-button').trigger('click')

    const panel = wrapper.get('.feature-nav-panel')
    expect(panel.attributes('aria-label')).toBe('全部功能导航')
    expect(panel.findAll('.feature-nav-group__title').map((item) => item.text())).toEqual([
      '今日推进',
      '求职资产',
      '训练复盘',
      '成长与支持'
    ])

    const labels = panel.findAll('.feature-nav-item__title').map((item) => item.text())
    legacySecondaryLabels.forEach((label) => expect(labels).toContain(label))
  })

  it('gives feature destinations icons, descriptions and current-page state', async () => {
    routePath.value = '/applications'
    const wrapper = mountNav()

    await wrapper.get('.more-button').trigger('click')

    const items = wrapper.findAll('.feature-nav-panel .feature-nav-item')
    expect(items.length).toBeGreaterThan(legacySecondaryLabels.length)
    items.forEach((item) => {
      expect(item.find('svg').exists()).toBe(true)
      expect(item.get('.feature-nav-item__desc').text().length).toBeGreaterThan(0)
    })

    const activeItem = wrapper.get('.feature-nav-panel [data-nav-path="/applications"]')
    expect(activeItem.classes()).toContain('is-active')
    expect(activeItem.attributes('aria-current')).toBe('page')
  })

  it('gates the weekly report entry and keeps its navigation state aligned when enabled', async () => {
    const disabledWrapper = mountNav()
    await disabledWrapper.get('.more-button').trigger('click')

    expect(disabledWrapper.find('[data-nav-path="/agent/weekly-reports"]').exists()).toBe(false)
    disabledWrapper.unmount()

    appConfig.enableV6WeeklyReport = true
    routePath.value = '/agent/weekly-reports'
    const enabledWrapper = mountNav()
    await enabledWrapper.get('.more-button').trigger('click')

    const weeklyLink = enabledWrapper.get('[data-nav-path="/agent/weekly-reports"]')
    expect(weeklyLink.text()).toContain('求职周报')
    expect(weeklyLink.classes()).toContain('is-active')
    expect(weeklyLink.attributes('aria-current')).toBe('page')

    const activePrimary = enabledWrapper.findAll('.nav-item').find((item) => item.text() === '能力图谱')
    expect(activePrimary?.classes()).toContain('is-active')
    expect(activePrimary?.attributes('aria-current')).toBe('page')
    expect(enabledWrapper.get('.mobile-current-section').text()).toBe('求职周报')
  })

  it('gates the V9 aggregate entry without changing the primary navigation', async () => {
    const disabledWrapper = mountNav()
    await disabledWrapper.get('.more-button').trigger('click')
    expect(disabledWrapper.find('[data-nav-path="/evidence-assets"]').exists()).toBe(false)
    disabledWrapper.unmount()

    appConfig.enableV9EvidenceLearning = true
    routePath.value = '/evidence-assets'
    const enabledWrapper = mountNav()
    await enabledWrapper.get('.more-button').trigger('click')

    const evidenceLink = enabledWrapper.get('[data-nav-path="/evidence-assets"]')
    expect(evidenceLink.text()).toContain('证据使用')
    expect(evidenceLink.classes()).toContain('is-active')
    expect(evidenceLink.attributes('aria-current')).toBe('page')
  })

  it('uses the route title for mobile pages that are outside the feature navigation', () => {
    routePath.value = '/notifications'
    routeMeta.value = { title: '通知中心' }

    const wrapper = mountNav()

    expect(wrapper.get('.mobile-current-section').text()).toBe('通知中心')
  })

  it('keeps the avatar visible while only hiding the account name responsively', () => {
    const avatarUrl = 'https://assets.example.com/avatar.png'
    const wrapper = mountNav({ avatarUrl })

    expect(wrapper.get('.el-avatar-stub').attributes('data-src')).toBe(avatarUrl)
    expect(wrapper.get('.el-avatar-stub').classes()).not.toContain('user-trigger__name')
    expect(wrapper.get('.user-trigger__name').text()).toBe('CodeCoachAI 用户')
  })

  it('shows the same grouped destinations in the responsive navigation panel', async () => {
    const wrapper = mountNav()

    await wrapper.get('.mobile-toggle').trigger('click')

    const panel = wrapper.get('#user-mobile-panel')
    expect(panel.findAll('.mobile-feature-group__title').map((item) => item.text())).toEqual([
      '今日推进',
      '求职资产',
      '训练复盘',
      '成长与支持'
    ])

    const labels = panel.findAll('.feature-nav-item__title').map((item) => item.text())
    legacySecondaryLabels.forEach((label) => expect(labels).toContain(label))

    const activePrimary = panel.get('.mobile-nav-item.is-active')
    expect(activePrimary.attributes('aria-current')).toBe('page')
  })

  it('opens all features as a modal, restores focus, and locks background interactions', async () => {
    const wrapper = mountNav()
    document.body.appendChild(wrapper.element)
    document.body.style.overflow = 'auto'
    const trigger = wrapper.get('.mobile-toggle')
    trigger.element.focus()

    await trigger.trigger('click')
    await nextTick()

    const panel = wrapper.get('#user-mobile-panel')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(panel.attributes('role')).toBe('dialog')
    expect(panel.attributes('aria-modal')).toBe('true')
    expect(panel.attributes('aria-labelledby')).toBe('user-mobile-panel-title')
    expect(wrapper.get('#user-mobile-panel-title').text()).toBe('全部功能')
    expect(document.body.style.overflow).toBe('hidden')
    expect(wrapper.get('.mobile-bottom-nav').classes()).toContain('is-modal-open')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.body.style.overflow).toBe('auto')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
    document.body.style.overflow = ''
  })

  it('does not route through the bottom navigation while the modal is open', async () => {
    const wrapper = mountNav()
    await wrapper.get('.mobile-toggle').trigger('click')
    await wrapper.get('.mobile-bottom-nav__item').trigger('click')

    expect(push).not.toHaveBeenCalled()
  })

  it('gives the account control a descriptive accessible name', () => {
    const wrapper = mountNav()

    expect(wrapper.get('.user-trigger').attributes('aria-label')).toBe('打开 CodeCoachAI 用户 的账户菜单')
  })

  it('closes the feature navigator with Escape and restores trigger focus', async () => {
    const wrapper = mountNav()
    document.body.appendChild(wrapper.element)
    const trigger = wrapper.get('.more-button')
    trigger.element.focus()

    await trigger.trigger('click')
    expect(wrapper.find('.feature-nav-panel').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('uses concise bottom labels while keeping full accessible names', () => {
    const wrapper = mountNav()
    const items = wrapper.findAll('.mobile-bottom-nav__item')

    expect(items).toHaveLength(5)
    expect(items.map((item) => item.text())).toEqual(['工作台', '题库', '面试', '简历', '能力'])
    expect(items.map((item) => item.attributes('aria-label'))).toEqual([
      '工作台',
      '题库',
      '模拟面试',
      '简历实验',
      '能力图谱'
    ])
  })
})
