import type { Router } from 'vue-router'

import { appConfig } from '@/config'
import { useAuthStore } from '@/stores/auth'

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const title = to.meta.title ? `${String(to.meta.title)} - ${appConfig.title}` : appConfig.title
    document.title = title

    const isPublic = Boolean(to.meta.public)
    const isAuthPage = to.path === '/login' || to.path === '/register'

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

    if (!authStore.userInfo) {
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

    if (to.matched.some((record) => record.meta.requiresAdmin) && !authStore.isAdmin) {
      return '/403'
    }

    return true
  })
}
