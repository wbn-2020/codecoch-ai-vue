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

    if (isAuthPage && authStore.isLoggedIn) {
      return '/dashboard'
    }

    if (isPublic) {
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

    if (!authStore.userInfo || authStore.roles.length === 0) {
      try {
        await authStore.fetchCurrentUser()
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
