import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authStore = vi.hoisted(() => ({
  applyRefreshResult: vi.fn(),
  authSessionId: 'session:old',
  clearAuth: vi.fn(),
  isLoggedIn: true,
  markAuthStale: vi.fn(),
  syncFromStorage: vi.fn(),
  token: 'old-token',
  tokenVerified: true,
  verifyToken: vi.fn()
}))

const currentRoute = vi.hoisted(() => ({
  meta: {} as Record<string, unknown>,
  path: '/dashboard',
  query: {} as Record<string, unknown>
}))

const router = vi.hoisted(() => ({
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
import { STORAGE_KEYS } from '@/constants/storage'
import { AUTH_CLEARED_EVENT } from '@/utils/authEvents'

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

const mountApp = () => mount(App, {
  global: {
    stubs: {
      RouterView: {
        template: '<div data-test="protected-route" />'
      }
    }
  }
})

describe('App auth synchronization', () => {
  beforeEach(() => {
    authStore.applyRefreshResult.mockReset()
    authStore.authSessionId = 'session:old'
    authStore.clearAuth.mockReset()
    authStore.isLoggedIn = true
    authStore.markAuthStale.mockReset()
    authStore.syncFromStorage.mockReset()
    authStore.token = 'old-token'
    authStore.tokenVerified = true
    authStore.verifyToken.mockReset()
    authStore.verifyToken.mockResolvedValue({ id: 1 })
    currentRoute.meta = {}
    currentRoute.path = '/dashboard'
    currentRoute.query = {}
    router.replace.mockReset()
    router.replace.mockResolvedValue(undefined)
  })

  it('unmounts protected content immediately while cross-tab logout redirects', async () => {
    const pendingNavigation = deferred<void>()
    router.replace.mockReturnValueOnce(pendingNavigation.promise)
    authStore.syncFromStorage.mockImplementationOnce(() => {
      authStore.authSessionId = ''
      authStore.isLoggedIn = false
      authStore.token = ''
      authStore.tokenVerified = false
    })
    const wrapper = mountApp()

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.token,
      newValue: null
    }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="protected-route"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('正在切换账号')
    expect(router.replace).toHaveBeenCalledWith({
      path: '/login',
      query: {
        redirect: '/dashboard'
      }
    })

    pendingNavigation.resolve()
    await flushPromises()
    wrapper.unmount()
  })

  it('uses a public boundary and revalidates once before returning after account switch', async () => {
    authStore.syncFromStorage.mockImplementationOnce(() => {
      authStore.authSessionId = 'session:new'
      authStore.isLoggedIn = true
      authStore.token = 'new-token'
      authStore.tokenVerified = false
    })
    authStore.verifyToken.mockImplementationOnce(async () => {
      authStore.tokenVerified = true
      return { id: 2 }
    })
    const wrapper = mountApp()

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.token,
      newValue: 'new-token'
    }))
    await flushPromises()

    expect(router.replace).toHaveBeenNthCalledWith(1, {
      path: '/auth-unavailable',
      query: {
        reason: 'session-changed',
        redirect: '/dashboard'
      }
    })
    expect(authStore.verifyToken).toHaveBeenCalledWith({ force: true })
    expect(router.replace).toHaveBeenNthCalledWith(2, '/dashboard')
    wrapper.unmount()
  })

  it('restarts boundary verification when session and token storage events arrive separately', async () => {
    const firstVerification = deferred<any>()
    authStore.syncFromStorage
      .mockImplementationOnce(() => {
        authStore.authSessionId = 'session:new'
        authStore.tokenVerified = false
      })
      .mockImplementationOnce(() => {
        authStore.token = 'new-token'
        authStore.tokenVerified = false
      })
    authStore.verifyToken
      .mockReturnValueOnce(firstVerification.promise)
      .mockImplementationOnce(async () => {
        authStore.tokenVerified = true
        return { id: 2 }
      })
    router.replace.mockImplementation(async (target) => {
      if (
        typeof target === 'object'
        && target.path === '/auth-unavailable'
      ) {
        currentRoute.meta = { public: true }
        currentRoute.path = '/auth-unavailable'
        currentRoute.query = target.query as Record<string, unknown>
      }
    })
    const wrapper = mountApp()

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'codecoachai_auth_session',
      newValue: 'session:new'
    }))
    await flushPromises()
    expect(authStore.verifyToken).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.token,
      newValue: 'new-token'
    }))
    await flushPromises()
    firstVerification.resolve({ id: 1 })
    await flushPromises()

    expect(authStore.verifyToken).toHaveBeenCalledTimes(2)
    expect(router.replace).toHaveBeenLastCalledWith('/dashboard')
    wrapper.unmount()
  })

  it('handles same-tab auth clear as a memory-only clear before leaving the page', async () => {
    authStore.clearAuth.mockImplementationOnce(() => {
      authStore.authSessionId = ''
      authStore.isLoggedIn = false
      authStore.token = ''
      authStore.tokenVerified = false
    })
    const wrapper = mountApp()

    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT))
    await flushPromises()

    expect(authStore.clearAuth).toHaveBeenCalledWith({ persist: false })
    expect(router.replace).toHaveBeenCalledWith({
      path: '/login',
      query: {
        redirect: '/dashboard'
      }
    })
    wrapper.unmount()
  })

  it('uses TTL-aware verification on focus instead of forcing duplicate requests', async () => {
    const wrapper = mountApp()

    window.dispatchEvent(new Event('focus'))
    await flushPromises()

    expect(authStore.syncFromStorage).toHaveBeenCalledTimes(1)
    expect(authStore.verifyToken).toHaveBeenCalledWith()
    wrapper.unmount()
  })
})
