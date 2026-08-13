import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const currentRoute = vi.hoisted(() => ({ fullPath: '/dashboard' }))
const router = vi.hoisted(() => ({
  push: vi.fn()
}))

vi.mock('vue-router', () => ({
  useRoute: () => currentRoute,
  useRouter: () => router
}))

import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'

const mountBoundary = (loading = false) => mount(RouteErrorBoundary, {
  props: {
    loading
  },
  global: {
    stubs: {
      AppState: {
        template: '<section><slot /></section>'
      },
      ElButton: {
        emits: ['click'],
        template: '<button @click="$emit(\'click\')"><slot /></button>'
      }
    }
  }
})

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    currentRoute.fullPath = '/dashboard'
    router.push.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a content-region skeleton while a route is loading', () => {
    const wrapper = mountBoundary(true)

    expect(wrapper.find('[data-test="route-loading-skeleton"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('正在加载页面内容')
  })

  it('explains a slow route after two seconds and offers a retry after ten seconds', async () => {
    const wrapper = mountBoundary(true)

    await vi.advanceTimersByTimeAsync(2_000)
    await nextTick()
    expect(wrapper.text()).toContain('页面资源仍在加载')
    expect(wrapper.text()).not.toContain('重新加载页面')

    await vi.advanceTimersByTimeAsync(8_000)
    await nextTick()
    expect(wrapper.text()).toContain('重新加载页面')
  })

  it('remounts routed content when retrying after a render failure', async () => {
    const mounts = ref(0)
    const RoutedPage = defineComponent({
      setup() {
        mounts.value += 1
        return () => h('div', { 'data-test': 'routed-page' }, `mount ${mounts.value}`)
      }
    })
    const wrapper = mount(RouteErrorBoundary, {
      slots: {
        default: RoutedPage
      }
    })

    expect(mounts.value).toBe(1)

    ;(wrapper.vm as unknown as { retry: (reason: 'error') => void }).retry('error')
    await flushPromises()

    expect(mounts.value).toBe(2)
    expect(wrapper.find('[data-test="routed-page"]').text()).toBe('mount 2')
  })
})
