import type { Router } from 'vue-router'

import { appConfig } from '@/config'
import { useAuthStore } from '@/stores/auth'
import { getToken } from '@/utils/token'

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const title = to.meta.title ? `${String(to.meta.title)} - ${appConfig.title}` : appConfig.title
    document.title = title

    const isPublic = Boolean(to.meta.public)
    const isAuthPage = to.path === '/login' || to.path === '/register'

    if (authStore.isLoggedIn && !getToken()) {
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
      } catch {
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
