import type { Router } from 'vue-router'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { firstAccessibleAdminPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { getToken } from '@/utils/token'

const isAuthFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED || code === HTTP_STATUS_CODE.TOKEN_INVALID
}

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
          if (!isAuthFailure(error)) return true
          return {
            path: '/login',
          query: {
            redirect: to.fullPath
          }
        }
      }
    }

    if (to.matched.some((record) => record.meta.requiresAdmin) && !authStore.canAccessAdmin) {
      return '/403'
    }

    if (to.path === '/admin') {
      const firstAdminPath = firstAccessibleAdminPath(authStore)
      if (!firstAdminPath) {
        return '/403'
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
      return '/403'
    }

    const requiredPermissions = to.matched.flatMap((record) => {
      const permissions = record.meta.requiredPermissions
      return Array.isArray(permissions) ? permissions.map(String) : []
    })
    if (requiredPermissions.length > 0 && !authStore.hasAnyPermission(requiredPermissions)) {
      return '/403'
    }

    return true
  })
}
