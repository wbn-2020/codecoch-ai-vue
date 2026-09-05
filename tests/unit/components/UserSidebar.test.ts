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

describe('UserSidebar weekly report entry', () => {
  beforeEach(() => {
    appConfig.enableV6WeeklyReport = false
    appConfig.enableV9EvidenceLearning = false
    routePath.value = '/dashboard'
  })

  it('hides the weekly report destination while the feature is disabled', () => {
    const wrapper = mountSidebar()

    expect(wrapper.find('[data-index="/agent/weekly-reports"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('求职周报')
  })

  it('shows the destination and selects it for weekly report routes when enabled', () => {
    appConfig.enableV6WeeklyReport = true
    routePath.value = '/agent/weekly-reports'
    const wrapper = mountSidebar()

    expect(wrapper.get('[data-index="/agent/weekly-reports"]').text()).toContain('求职周报')
    expect(wrapper.get('[data-index="/agent/weekly-reports"]').classes()).toContain('is-active')
  })

  it('hides and reveals the V9 aggregate entry using the shared gate', () => {
    const disabledWrapper = mountSidebar()
    expect(disabledWrapper.find('[data-index="/evidence-assets"]').exists()).toBe(false)
    disabledWrapper.unmount()

    appConfig.enableV9EvidenceLearning = true
    routePath.value = '/evidence-assets'
    const enabledWrapper = mountSidebar()

    expect(enabledWrapper.get('[data-index="/evidence-assets"]').text()).toContain('证据使用')
    expect(enabledWrapper.get('[data-index="/evidence-assets"]').classes()).toContain('is-active')
  })
})
