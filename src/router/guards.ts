import type { RouteLocationNormalized, Router } from 'vue-router'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { firstAccessibleAdminPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { getToken } from '@/utils/token'

const isAuthFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID
}

const isFeatureEnabled = (featureFlag: string) => {
  if (featureFlag === 'v4Preview') return appConfig.enableV4Preview
  return true
}

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

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const title = to.meta.title ? `${String(to.meta.title)} - ${appConfig.title}` : appConfig.title
    document.title = title

    const isPublic = Boolean(to.meta.public)
    const isAuthPage = to.path === '/login' || to.path === '/register'

    const localToken = getToken()

    if (!authStore.isLoggedIn && localToken) {
      authStore.setToken(localToken)
    }

    if (authStore.isLoggedIn && !localToken) {
      authStore.clearAuth()
    }

    if (isPublic) {
      if (isAuthPage && authStore.isLoggedIn) {
        try {
          await authStore.verifyToken()
          return '/dashboard'
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

    if (!authStore.isLoggedIn) {
      return {
        path: '/login',
        query: {
          redirect: to.fullPath
        }
      }
    }

    if (!authStore.tokenVerified || !authStore.userInfo || authStore.roles.length === 0) {
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

    if (to.matched.some((record) => record.meta.requiresAdmin) && !authStore.canAccessAdmin) {
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

    const requiredPermissions = to.matched.flatMap((record) => {
      const permissions = record.meta.requiredPermissions
      return Array.isArray(permissions) ? permissions.map(String) : []
    })
    if (requiredPermissions.length > 0 && !authStore.hasAnyPermission(requiredPermissions)) {
      return forbiddenRoute(to, 'missingPermission', {
        requiredPermissions,
        userPermissions: authStore.permissions.slice(0, 20)
      })
    }

    return true
  })
}
