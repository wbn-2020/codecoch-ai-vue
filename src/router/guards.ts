import type { RouteLocationNormalized, Router } from 'vue-router'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { canAccessAdminPermissions, firstAccessibleAdminPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { getToken } from '@/utils/token'

const isAuthFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID
}

type AuthStore = ReturnType<typeof useAuthStore>

let backgroundAuthRefresh: Promise<unknown> | null = null

const refreshAuthInBackground = (authStore: AuthStore) => {
  if (backgroundAuthRefresh) return

  backgroundAuthRefresh = authStore.verifyToken()
    .catch((error) => {
      if (isAuthFailure(error)) {
        authStore.clearAuth()
      }
    })
    .finally(() => {
      backgroundAuthRefresh = null
    })
}

const isFeatureEnabled = (featureFlag: string) => {
  if (featureFlag === 'v4Preview') return appConfig.enableV4Preview
  return true
}

const isPreviewRoute = (to: RouteLocationNormalized) =>
  to.matched.some((record) => record.meta.previewOnly)

const forbiddenRoute = (to: RouteLocationNormalized, reason: string, detail: Record<string, string | string[] | undefined> = {}) => ({
  path: '/403',
  query: {
    reason,
    target: to.fullPath,
    title: String(to.meta.title || ''),
    ...Object.fromEntries(
      Object.entries(detail)
        .filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))
        .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)])
    )
  }
})

const safeRedirectPath = (value: unknown) => {
  if (typeof value !== 'string') return ''
  if (!value.startsWith('/') || value.startsWith('//')) return ''
  if (value === '/login' || value === '/register') return ''
  return value
}

const defaultAuthenticatedPath = (authStore: AuthStore) =>
  authStore.canAccessAdmin ? firstAccessibleAdminPath(authStore) || '/admin' : '/dashboard'

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const title = to.meta.title ? `${String(to.meta.title)} - ${appConfig.title}` : appConfig.title
    document.title = title

    const isPublic = Boolean(to.meta.public)
    const isAuthPage = to.path === '/login' || to.path === '/register'

    const localToken = getToken()

    if (localToken && authStore.token && authStore.token !== localToken) {
      authStore.setToken(localToken)
      authStore.markAuthStale()
    } else if (!authStore.isLoggedIn && localToken) {
      authStore.setToken(localToken)
    }

    if (authStore.isLoggedIn && !localToken) {
      authStore.clearAuth()
    }

    if (isPublic) {
      if (isAuthPage && authStore.isLoggedIn) {
        try {
          await authStore.verifyToken()
          return safeRedirectPath(to.query.redirect) || defaultAuthenticatedPath(authStore)
        } catch {
          return true
        }
      }
      return true
    }

    const requiredFeatureFlags = to.matched.flatMap((record) => {
      const featureFlag = record.meta.featureFlag
      return typeof featureFlag === 'string' ? [featureFlag] : []
    })
    if (requiredFeatureFlags.some((featureFlag) => !isFeatureEnabled(featureFlag))) {
      return {
        path: '/feature-unavailable',
        query: {
          title: String(to.meta.title || ''),
          redirect: to.fullPath
        }
      }
    }

    if (isPreviewRoute(to) && !appConfig.enableV4ExperimentalRoutes) {
      return {
        path: '/feature-unavailable',
        query: {
          title: String(to.meta.title || ''),
          redirect: to.fullPath
        }
      }
    }

    if (!authStore.isLoggedIn) {
      return {
        path: '/login',
        query: {
          redirect: to.fullPath
        }
      }
    }

    const isAdminRoute = to.matched.some((record) => record.meta.requiresAdmin)
    const hasCachedUserSnapshot = Boolean(authStore.userInfo && authStore.roles.length > 0)

    if (isAdminRoute) {
      try {
        await authStore.verifyAdminSession()
      } catch (error) {
        if (isAuthFailure(error)) {
          authStore.clearAuth()
          return {
            path: '/login',
            query: {
              redirect: to.fullPath
            }
          }
        }
        authStore.markAuthStale()
        return {
          path: '/auth-unavailable',
          query: {
            redirect: to.fullPath
          }
        }
      }
    } else if (!authStore.tokenVerified || !authStore.userInfo || authStore.roles.length === 0) {
      if (!isAdminRoute && hasCachedUserSnapshot) {
        refreshAuthInBackground(authStore)
      } else {
        try {
          await authStore.verifyToken()
        } catch (error) {
          if (isAuthFailure(error)) {
            authStore.clearAuth()
            return {
              path: '/login',
              query: {
                redirect: to.fullPath
              }
            }
          }
          authStore.markAuthStale()
          return {
            path: '/auth-unavailable',
            query: {
              redirect: to.fullPath
            }
          }
        }
      }
    }

    if (isAdminRoute && !authStore.canAccessAdmin) {
      return forbiddenRoute(to, 'requiresAdmin', {
        userRoles: authStore.roles,
        userPermissions: authStore.permissions.slice(0, 20)
      })
    }

    if (to.path === '/admin') {
      const firstAdminPath = firstAccessibleAdminPath(authStore)
      if (!firstAdminPath) {
        return forbiddenRoute(to, 'noAdminMenu', {
          userRoles: authStore.roles,
          userPermissions: authStore.permissions.slice(0, 20)
        })
      }
      if (firstAdminPath !== '/admin') {
        return firstAdminPath
      }
    }

    const requiredRoles = to.matched.flatMap((record) => {
      const roles = record.meta.requiredRoles
      return Array.isArray(roles) ? roles.map(String) : []
    })
    if (requiredRoles.length > 0 && !authStore.hasAnyRole(requiredRoles)) {
      return forbiddenRoute(to, 'missingRole', {
        requiredRoles,
        userRoles: authStore.roles
      })
    }

    const missingPermissionRecord = to.matched.find((record) => {
      const permissions = record.meta.requiredPermissions
      if (!permissions) return false
      return !canAccessAdminPermissions(
        Array.isArray(permissions) ? permissions.map(String) : [String(permissions)],
        authStore
      )
    })
    if (missingPermissionRecord) {
      const permissions = missingPermissionRecord.meta.requiredPermissions
      const requiredPermissions = Array.isArray(permissions) ? permissions.map(String) : [String(permissions)]
      return forbiddenRoute(to, 'missingPermission', {
        requiredPermissions,
        userPermissions: authStore.permissions.slice(0, 20)
      })
    }

    return true
  })
}
