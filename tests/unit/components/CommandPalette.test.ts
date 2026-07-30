import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import CommandPalette from '@/components/layout/CommandPalette.vue'

const push = vi.fn()

vi.mock('@/config', () => ({
  appConfig: {
    enableV9EvidenceLearning: false
  }
}))

vi.mock('@/router/adminAccess', () => ({
  canAccessAdminPermissions: () => false
}))

vi.mock('@/router/routes', () => ({
  routes: []
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    canAccessAdmin: false
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push
  })
}))

afterEach(() => {
  document.body.innerHTML = ''
  push.mockReset()
})

describe('CommandPalette', () => {
  it('registers Ctrl+K while the panel is closed', () => {
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      props: {
        modelValue: false,
        scope: 'user'
      }
    })

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))

    expect(wrapper.emitted('update:modelValue')).toEqual([[true]])
    wrapper.unmount()
  })

  it('focuses the search input when opened', async () => {
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      props: {
        modelValue: false,
        scope: 'user'
      }
    })

    await wrapper.setProps({ modelValue: true })
    await nextTick()

    expect(document.activeElement).toBe(document.querySelector('.command-palette__search input'))
    wrapper.unmount()
  })
})
