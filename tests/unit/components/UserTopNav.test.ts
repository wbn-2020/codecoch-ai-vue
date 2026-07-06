import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import UserTopNav from '@/components/layout/UserTopNav.vue'

const routePath = ref('/interviews/create')
const push = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get path() {
      return routePath.value
    },
    get fullPath() {
      return routePath.value
    }
  }),
  useRouter: () => ({
    push
  })
}))

const mountNav = () => mount(UserTopNav, {
  props: {
    displayName: 'CodeCoachAI 用户',
    avatarText: 'C',
    avatarUrl: '',
    unreadCount: 0,
    unreadAvailable: true,
    notificationTooltip: '通知中心',
    canAccessAdmin: false
  },
  global: {
    stubs: {
      'el-avatar': {
        template: '<span class="el-avatar-stub"><slot /></span>'
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

describe('UserTopNav mobile navigation', () => {
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
