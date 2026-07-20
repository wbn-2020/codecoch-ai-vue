import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import UserSidebar from '@/components/layout/UserSidebar.vue'

const appConfig = vi.hoisted(() => ({
  enableV4PreviewAccess: true,
  enableV4ExperimentalRoutes: false,
  enableV4GrowthPreview: true,
  enableV4KnowledgePreview: false,
  enableV6WeeklyReport: false
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
      'el-menu': {
        props: ['defaultActive'],
        template: '<nav class="el-menu-stub" :data-default-active="defaultActive"><slot /></nav>'
      },
      'el-sub-menu': {
        props: ['index'],
        template: '<section :data-section="index"><slot name="title" /><slot /></section>'
      },
      'el-menu-item': {
        props: ['index'],
        template: '<button type="button" :data-index="index"><slot /><slot name="title" /></button>'
      },
      'el-icon': {
        template: '<i><slot /></i>'
      }
    }
  }
})

describe('UserSidebar weekly report entry', () => {
  beforeEach(() => {
    appConfig.enableV6WeeklyReport = false
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
    expect(wrapper.get('.el-menu-stub').attributes('data-default-active')).toBe('/agent/weekly-reports')
  })
})
