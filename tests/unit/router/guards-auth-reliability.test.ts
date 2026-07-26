import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NavigationGuard, Router } from 'vue-router'

const authStore = vi.hoisted(() => ({
  canAccessAdmin: false,
  clearAuth: vi.fn(),
  hasAnyPermission: vi.fn(),
  hasAnyRole: vi.fn(),
  isLoggedIn: true,
  markAuthStale: vi.fn(),
  permissions: [],
  roles: [],
  syncFromStorage: vi.fn(),
  tokenVerified: true,
  verifyAdminSession: vi.fn(),
  verifyToken: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/features/route-safety', () => ({
  isV4PreviewAccessEnabled: () => true
}))

import { setupRouterGuards } from '@/router/guards'

const protectedRoute = {
  hash: '',
  matched: [{
    meta: {}
  }],
  meta: {
    title: '受保护页面'
  },
  path: '/dashboard',
  query: {}
} as any

const adminRoute = {
  ...protectedRoute,
  matched: [{
    meta: {
      requiresAdmin: true
    }
  }],
  meta: {
    title: '管理页面'
  },
  path: '/admin/users'
} as any

const loginPage = {
  hash: '',
  matched: [{
    meta: {
      authPage: true,
      public: true
    }
  }],
  meta: {
    authPage: true,
    public: true,
    title: '登录'
  },
  path: '/login',
  query: {}
} as any

describe('router auth failure handling', () => {
  let guard: NavigationGuard

  beforeEach(() => {
    authStore.canAccessAdmin = false
    authStore.clearAuth.mockReset()
    authStore.hasAnyPermission.mockReset()
    authStore.hasAnyRole.mockReset()
    authStore.isLoggedIn = true
    authStore.markAuthStale.mockReset()
    authStore.syncFromStorage.mockReset()
    authStore.tokenVerified = true
    authStore.verifyAdminSession.mockReset()
    authStore.verifyToken.mockReset()

    const router = {
      beforeEach: vi.fn((registeredGuard: NavigationGuard) => {
        guard = registeredGuard
      })
    } as unknown as Router
    setupRouterGuards(router)
  })

  it('routes HTTP 403 to the forbidden page without clearing auth', async () => {
    authStore.verifyToken.mockRejectedValueOnce({
      code: 41003,
      response: { status: 403 }
    })

    const result = await guard(protectedRoute, protectedRoute, vi.fn())

    expect(result).toEqual({
      path: '/403',
      query: {
        reason: 'serverForbidden',
        target: '/dashboard',
        title: '受保护页面'
      }
    })
    expect(authStore.clearAuth).not.toHaveBeenCalled()
    expect(authStore.markAuthStale).not.toHaveBeenCalled()
  })

  it('clears auth and returns to login for HTTP 401', async () => {
    authStore.clearAuth.mockImplementationOnce(() => {
      authStore.isLoggedIn = false
      authStore.tokenVerified = false
    })
    authStore.verifyToken.mockRejectedValueOnce({
      response: { status: 401 }
    })

    const result = await guard(protectedRoute, protectedRoute, vi.fn())

    expect(result).toEqual({
      path: '/login',
      query: {
        redirect: '/dashboard'
      }
    })
    expect(authStore.clearAuth).toHaveBeenCalledTimes(1)
  })

  it('rechecks login state when an admin current-user request becomes stale', async () => {
    authStore.verifyAdminSession.mockImplementationOnce(async () => {
      authStore.isLoggedIn = false
      authStore.tokenVerified = false
      return null
    })

    const result = await guard(adminRoute, protectedRoute, vi.fn())

    expect(result).toEqual({
      path: '/login',
      query: {
        redirect: '/admin/users'
      }
    })
    expect(result).not.toMatchObject({ path: '/403' })
  })

  it('does not run admin permission checks for an unverified replacement session', async () => {
    authStore.canAccessAdmin = false
    authStore.tokenVerified = false
    authStore.verifyAdminSession.mockResolvedValueOnce(null)

    const result = await guard(adminRoute, protectedRoute, vi.fn())

    expect(result).toEqual({
      path: '/auth-unavailable',
      query: {
        redirect: '/admin/users'
      }
    })
    expect(result).not.toMatchObject({ path: '/403' })
  })

  it('keeps the login page when verification observes cross-tab logout', async () => {
    authStore.verifyToken.mockImplementationOnce(async () => {
      authStore.isLoggedIn = false
      authStore.tokenVerified = false
      return null
    })

    const result = await guard(loginPage, protectedRoute, vi.fn())

    expect(result).toBe(true)
  })
})
