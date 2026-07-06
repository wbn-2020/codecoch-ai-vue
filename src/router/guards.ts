import type { RouteLocationNormalized, Router } from 'vue-router'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { isV4PreviewAccessEnabled } from '@/features/route-safety'
import { canAccessAdminPermissions, firstAccessibleAdminPath, resolveAuthenticatedEntryPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { buildSafeRedirectTarget, sanitizeLocalRedirectPath } from '@/utils/routeSecurity'
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
  if (featureFlag === 'v4Preview') return isV4PreviewAccessEnabled()
  if (featureFlag === 'v4Growth') return appConfig.enableV4GrowthPreview
  if (featureFlag === 'v4Knowledge') return appConfig.enableV4KnowledgePreview
  if (featureFlag === 'adminTraceCockpit') return appConfig.enableAdminTraceCockpit
  return true
}

const isPreviewRoute = (to: RouteLocationNormalized) =>
  to.matched.some((record) => record.meta.previewOnly)

const safeForbiddenTarget = (to: RouteLocationNormalized) => to.path || '/'
const safeRedirectTarget = (to: RouteLocationNormalized) => buildSafeRedirectTarget(to.path, to.query)

const forbiddenRoute = (to: RouteLocationNormalized, reason: string) => ({
  path: '/403',
  query: {
    reason,
    target: safeForbiddenTarget(to),
    title: String(to.meta.title || '')
  }
})

const safeRedirectPath = (value: unknown) => sanitizeLocalRedirectPath(value)

const readHashToken = (hash: string) => {
  if (!hash) return ''

  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash
  if (!normalizedHash) return ''

  const directParams = new URLSearchParams(normalizedHash)
  const directToken = directParams.get('token')
  if (directToken) {
    return directToken
  }

  const queryIndex = normalizedHash.indexOf('?')
  if (queryIndex >= 0) {
    const nestedParams = new URLSearchParams(normalizedHash.slice(queryIndex + 1))
    return nestedParams.get('token') || ''
  }

  return ''
}

const hasResetPasswordToken = (to: RouteLocationNormalized) => {
  const queryToken = typeof to.query.token === 'string' ? to.query.token.trim() : ''
  return Boolean(queryToken || readHashToken(to.hash))
}

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const authStore = useAuthStore()
    const title = to.meta.title ? `${String(to.meta.title)} - ${appConfig.title}` : appConfig.title
    document.title = title

    const isPublic = Boolean(to.meta.public)
    const isAuthPage = to.matched.some((record) => record.meta.authPage)

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
        const forceLogoutForPasswordReset =
          to.path === '/login' && String(to.query.reason || '') === 'logout-required-for-password-reset'
        if (forceLogoutForPasswordReset) {
          return true
        }

        try {
          await authStore.verifyToken()
          if (to.path === '/reset-password' && hasResetPasswordToken(to)) {
            return {
              path: '/login',
              query: {
                reason: 'logout-required-for-password-reset'
              }
            }
          }
          return safeRedirectPath(to.query.redirect) || resolveAuthenticatedEntryPath(authStore)
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
          redirect: safeRedirectTarget(to)
        }
      }
    }

    if (isPreviewRoute(to) && !isV4PreviewAccessEnabled()) {
      return {
        path: '/feature-unavailable',
        query: {
          title: String(to.meta.title || ''),
          redirect: safeRedirectTarget(to)
        }
      }
    }

    if (!authStore.isLoggedIn) {
      return {
        path: '/login',
        query: {
          redirect: safeRedirectTarget(to)
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
              redirect: safeRedirectTarget(to)
            }
          }
        }
        authStore.markAuthStale()
        return {
          path: '/auth-unavailable',
          query: {
            redirect: safeRedirectTarget(to)
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
                redirect: safeRedirectTarget(to)
              }
            }
          }
          authStore.markAuthStale()
          return {
            path: '/auth-unavailable',
            query: {
              redirect: safeRedirectTarget(to)
            }
          }
        }
      }
    }

    if (isAdminRoute && !authStore.canAccessAdmin) {
      return forbiddenRoute(to, 'requiresAdmin')
    }

    if (to.path === '/admin') {
      const firstAdminPath = firstAccessibleAdminPath(authStore)
      if (!firstAdminPath) {
        return forbiddenRoute(to, 'noAdminMenu')
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
      return forbiddenRoute(to, 'missingRole')
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
      return forbiddenRoute(to, 'missingPermission')
    }

    return true
  })
}
