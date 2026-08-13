import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({
  applyRefreshResult: vi.fn(),
  authSessionId: 'session:1',
  clearAuth: vi.fn(),
  isLoggedIn: true,
  markAuthStale: vi.fn(),
  syncFromStorage: vi.fn(),
  token: 'token',
  tokenVerified: true,
  verifyToken: vi.fn()
}))

const currentRoute = vi.hoisted(() => ({
  meta: {} as Record<string, unknown>,
  path: '/dashboard',
  query: {} as Record<string, unknown>
}))

const router = vi.hoisted(() => ({
  afterEach: vi.fn(),
  beforeEach: vi.fn(),
  onError: vi.fn(),
  push: vi.fn(),
  replace: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStore
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => currentRoute,
    useRouter: () => router
  }
})

import App from '@/App.vue'

const mountApp = () => mount(App, {
  global: {
    stubs: {
      RouterView: {
        template: '<div data-test="routed-content" />'
      }
    }
  }
})

describe('App route-load recovery', () => {
  beforeEach(() => {
    router.afterEach.mockReset()
    router.beforeEach.mockReset()
    router.onError.mockReset()
    router.push.mockReset()
    router.push.mockResolvedValue(undefined)
    router.replace.mockReset()
    router.replace.mockResolvedValue(undefined)
  })

  it('keeps a root recovery UI for a failed lazy chunk and clears route loading', async () => {
    const wrapper = mountApp()
    const beforeEachHandler = router.beforeEach.mock.calls[0]?.[0] as
      | ((to: { fullPath: string }) => void)
      | undefined
    const routeErrorHandler = router.onError.mock.calls[0]?.[0] as
      | ((error: Error, to: { fullPath: string }) => void)
      | undefined

    beforeEachHandler?.({ fullPath: '/interviews/room/42' })
    routeErrorHandler?.(
      new Error('Failed to fetch dynamically imported module'),
      { fullPath: '/interviews/room/42' }
    )
    await flushPromises()

    expect(wrapper.text()).toContain('页面资源没有加载成功')
    expect(wrapper.text()).toContain('返回工作台')
    expect(wrapper.find('[data-test="routed-content"]').exists()).toBe(false)

    await wrapper.get('.app-route-error__secondary').trigger('click')
    expect(router.push).toHaveBeenCalledWith('/dashboard')
    wrapper.unmount()
  })

  it('shows a root loading fallback before a lazy route has resolved', async () => {
    const wrapper = mountApp()
    const beforeEachHandler = router.beforeEach.mock.calls[0]?.[0] as
      | ((to: { fullPath: string }) => void)
      | undefined

    beforeEachHandler?.({ fullPath: '/resumes/create' })
    await flushPromises()

    expect(wrapper.text()).toContain('正在加载页面')
    expect(wrapper.find('[data-test="routed-content"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
