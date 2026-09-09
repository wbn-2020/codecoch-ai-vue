import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import UserSidebar from '@/components/layout/UserSidebar.vue'

const appConfig = vi.hoisted(() => ({
  enableV4PreviewAccess: true,
  enableV4ExperimentalRoutes: false,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableV6WeeklyReport: false,
  enableV9EvidenceLearning: false
}))
const routePath = ref('/dashboard')

vi.mock('@/config', () => ({ appConfig }))

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get path() {
      return routePath.value
    },
    get fullPath() {
      return routePath.value
    }
  })
}))

const mountSidebar = () => mount(UserSidebar, {
  global: {
    stubs: {
      RouterLink: {
        props: ['to'],
        template: '<a :data-index="to"><slot /></a>'
      }
    }
  }
})

describe('UserSidebar P0 six-entry navigation', () => {
  beforeEach(() => {
    appConfig.enableV6WeeklyReport = false
    appConfig.enableV9EvidenceLearning = false
    routePath.value = '/dashboard'
  })

  it('renders exactly the six P0 primary groups', () => {
    const wrapper = mountSidebar()

    expect(wrapper.text()).toContain('今日')
    expect(wrapper.text()).toContain('求职')
    expect(wrapper.text()).toContain('资料')
    expect(wrapper.text()).toContain('面试')
    expect(wrapper.text()).toContain('训练')
    expect(wrapper.text()).toContain('准备度')
  })

  it('never exposes removed P0 destinations even with feature flags enabled', () => {
    appConfig.enableV6WeeklyReport = true
    appConfig.enableV9EvidenceLearning = true
    const wrapper = mountSidebar()

    expect(wrapper.find('[data-index="/agent/weekly-reports"]').exists()).toBe(false)
    expect(wrapper.find('[data-index="/evidence-assets"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('求职周报')
    expect(wrapper.text()).not.toContain('证据使用')
  })

  it('highlights the owning group and item for the current route', () => {
    routePath.value = '/questions/recommendations'
    const wrapper = mountSidebar()

    // accordion：子菜单只在当前组展开时渲染，组行本身标记 is-active
    expect(wrapper.get('[data-index="/questions/recommendations"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-index="/questions/recommendations"]').text()).toContain('训练')
  })
})
