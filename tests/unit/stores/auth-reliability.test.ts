import { beforeEach, describe, expect, it, vi } from 'vitest'

const authApi = vi.hoisted(() => ({
  getCurrentUserApi: vi.fn(),
  loginApi: vi.fn(),
  logoutApi: vi.fn(),
  registerApi: vi.fn()
}))

vi.mock('@/api/auth', () => authApi)

vi.mock('@/composables/useRequestCache', () => ({
  clearAllRequestCache: vi.fn()
}))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const loadStore = async () => {
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const token = await import('@/utils/token')
  const { useAuthStore } = await import('@/stores/auth')
  return {
    store: useAuthStore(),
    token
  }
}

describe('auth store reliability', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    Object.values(authApi).forEach((mock) => mock.mockReset())
  })

  it('does not let an old current-user response overwrite a newer login', async () => {
    const { store, token } = await loadStore()
    store.setToken('old-token', { newSession: true })

    const oldCurrentUser = deferred<any>()
    authApi.getCurrentUserApi.mockReturnValueOnce(oldCurrentUser.promise)
    const oldRequest = store.fetchCurrentUser()

    authApi.loginApi.mockResolvedValueOnce({
      token: 'new-token',
      userInfo: {
        id: 2,
        userId: 2,
        username: 'new-user',
        roles: ['USER'],
        permissions: ['resume:view']
      }
    })
    await store.login({ username: 'new-user', password: 'secret1' })

    oldCurrentUser.resolve({
      id: 1,
      userId: 1,
      username: 'old-user',
      roles: ['ADMIN'],
      permissions: ['admin:user:list']
    })
    await oldRequest

    expect(token.getToken()).toBe('new-token')
    expect(store.userInfo?.username).toBe('new-user')
    expect(store.roles).toEqual(['USER'])
    expect(store.permissions).toEqual(['resume:view'])
  })

  it('keeps persistent storage untouched for a memory-only clear event', async () => {
    const { store, token } = await loadStore()
    store.setToken('current-token', { newSession: true })
    store.setUserInfo({
      id: 7,
      userId: 7,
      username: 'stored-user',
      roles: ['USER'],
      permissions: []
    })
    const sessionId = token.getAuthSessionId()

    store.clearAuth({ persist: false })

    expect(store.isLoggedIn).toBe(false)
    expect(token.getToken()).toBe('current-token')
    expect(token.getAuthSessionId()).toBe(sessionId)
    expect(localStorage.getItem('codecoachai_user_info')).not.toBeNull()
  })

  it('does not clear a valid token when current-user is forbidden', async () => {
    const { store, token } = await loadStore()
    store.setToken('current-token', { newSession: true })
    authApi.getCurrentUserApi.mockRejectedValueOnce({
      code: 41003,
      response: { status: 403 }
    })

    await expect(store.fetchCurrentUser()).rejects.toMatchObject({ code: 41003 })

    expect(store.isLoggedIn).toBe(true)
    expect(token.getToken()).toBe('current-token')
  })

  it('retries a transient current-user failure once before failing verification', async () => {
    vi.useFakeTimers()
    try {
      const { store } = await loadStore()
      store.setToken('current-token', { newSession: true })
      authApi.getCurrentUserApi
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce({
          id: 7,
          userId: 7,
          username: 'verified-user',
          roles: ['USER'],
          permissions: []
        })

      const request = store.fetchCurrentUser()
      await vi.advanceTimersByTimeAsync(350)

      await expect(request).resolves.toMatchObject({ username: 'verified-user' })
      expect(authApi.getCurrentUserApi).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('clears the invalidated session after logout completes', async () => {
    const { store, token } = await loadStore()
    store.setToken('logout-token', { newSession: true })
    authApi.logoutApi.mockResolvedValueOnce(null)

    await store.logout()

    expect(store.isLoggedIn).toBe(false)
    expect(store.token).toBe('')
    expect(token.getToken()).toBe('')
    expect(token.getAuthSessionId()).toBe('')
  })

  it('does not clear a newer login that replaces the logout session in flight', async () => {
    const { store, token } = await loadStore()
    store.setToken('logout-token', { newSession: true })
    const pendingLogout = deferred<null>()
    authApi.logoutApi.mockReturnValueOnce(pendingLogout.promise)

    const logoutPromise = store.logout()
    expect(store.isLoggedIn).toBe(false)
    expect(store.authSessionId).toMatch(/^invalidated:/)

    store.setToken('new-login-token', { newSession: true })
    store.setUserInfo({
      id: 9,
      userId: 9,
      username: 'new-login',
      roles: ['ADMIN'],
      permissions: ['admin:user:list']
    })
    store.tokenVerified = true
    pendingLogout.resolve(null)
    await logoutPromise

    expect(store.isLoggedIn).toBe(true)
    expect(store.token).toBe('new-login-token')
    expect(store.userInfo?.username).toBe('new-login')
    expect(token.getToken()).toBe('new-login-token')
    expect(token.getAuthSessionId()).toMatch(/^session:/)
  })

  it('advances the local generation when another tab replaces the session', async () => {
    const { store, token } = await loadStore()
    store.setToken('old-token', { newSession: true })
    const oldGeneration = token.captureAuthSession().generation

    localStorage.setItem('codecoachai_auth_session', 'session:external-tab')
    localStorage.setItem('codecoachai_token', 'external-token')
    store.syncFromStorage()

    expect(store.token).toBe('external-token')
    expect(store.authSessionId).toBe('session:external-tab')
    expect(store.tokenVerified).toBe(false)
    expect(token.captureAuthSession().generation).toBeGreaterThan(oldGeneration)
  })

  it('uses the verification TTL unless focus revalidation explicitly forces a check', async () => {
    const { store } = await loadStore()
    store.setToken('current-token', { newSession: true })
    authApi.getCurrentUserApi.mockResolvedValue({
      id: 7,
      userId: 7,
      username: 'verified-user',
      roles: ['USER'],
      permissions: []
    })

    await store.verifyToken()
    await store.verifyToken()
    await store.verifyToken({ force: true })

    expect(authApi.getCurrentUserApi).toHaveBeenCalledTimes(2)
  })
})
