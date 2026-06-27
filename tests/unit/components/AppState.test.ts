import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppState from '@/components/common/AppState.vue'

describe('AppState', () => {
  it('renders provided content and slot actions', () => {
    const wrapper = mount(AppState, {
      props: {
        type: 'error',
        title: '加载失败',
        description: '请稍后重试'
      },
      slots: {
        default: '<button class="retry-action">重试</button>'
      }
    })

    expect(wrapper.classes()).toContain('app-state--error')
    expect(wrapper.text()).toContain('加载失败')
    expect(wrapper.text()).toContain('请稍后重试')
    expect(wrapper.find('.retry-action').exists()).toBe(true)
  })

  it('shows a loading icon state and fallback copy', () => {
    const wrapper = mount(AppState, {
      props: {
        type: 'loading'
      }
    })

    expect(wrapper.classes()).toContain('app-state--loading')
    expect(wrapper.find('.is-loading').exists()).toBe(true)
    expect(wrapper.find('h3').text().trim().length).toBeGreaterThan(0)
    expect(wrapper.find('p').text().trim().length).toBeGreaterThan(0)
  })
})
