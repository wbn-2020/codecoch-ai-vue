import type { RouteLocationNormalized, Router } from 'vue-router'

import { appConfig } from '@/config'
import { HTTP_STATUS_CODE } from '@/constants/http'
import { isV4PreviewAccessEnabled } from '@/features/route-safety'
import { canAccessAdminPermissions, firstAccessibleAdminPath, resolveAuthenticatedEntryPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { buildSafeRedirectTarget, sanitizeLocalRedirectPath } from '@/utils/routeSecurity'
import { captureAuthSession, type AuthSessionSnapshot } from '@/utils/token'

const isAuthFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  const status = (error as { response?: { status?: number } })?.response?.status
  return code === HTTP_STATUS_CODE.UNAUTHENTICATED
    || code === HTTP_STATUS_CODE.TOKEN_INVALID
    || status === 401
}

const isForbiddenFailure = (error: unknown) => {
  const code = (error as { code?: number })?.code
  const status = (error as { response?: { status?: number } })?.response?.status
  return code === HTTP_STATUS_CODE.FORBIDDEN || status === 403
}

const isFeatureEnabled = (featureFlag: string) => {
  if (featureFlag === 'v4Preview') return isV4PreviewAccessEnabled()
  if (featureFlag === 'v4Growth') return appConfig.enableV4GrowthPreview
  if (featureFlag === 'v4Knowledge') return appConfig.enableV4KnowledgePreview
  if (featureFlag === 'adminTraceCockpit') return appConfig.enableAdminTraceCockpit
  if (featureFlag === 'v9EvidenceLearning') return appConfig.enableV9EvidenceLearning
  return true
}

const isPreviewRoute = (to: RouteLocationNormalized) =>
  to.matched.some((record) => record.meta.previewOnly)

const safeForbiddenTarget = (to: RouteLocationNormalized) => to.path || '/'
const safeRedirectTarget = (to: RouteLocationNormalized) => buildSafeRedirectTarget(to.path, to.query)
type AuthStore = ReturnType<typeof useAuthStore>

const loginRoute = (to: RouteLocationNormalized) => ({
  path: '/login',
  query: {
    redirect: safeRedirectTarget(to)
  }
})

const authUnavailableRoute = (to: RouteLocationNormalized) => ({
  path: '/auth-unavailable',
  query: {
    redirect: safeRedirectTarget(to)
  }
})

const recheckVerifiedSession = (
  authStore: AuthStore,
  to: RouteLocationNormalized,
  verifiedUser: unknown
) => {
  authStore.syncFromStorage()
  if (!authStore.isLoggedIn) {
    return loginRoute(to)
  }
  if (!verifiedUser || !authStore.tokenVerified) {
    authStore.markAuthStale()
    return authUnavailableRoute(to)
  }
  return null
}

const verificationFailureRoute = (
  authStore: AuthStore,
  to: RouteLocationNormalized,
  error: unknown,
  requestSession: AuthSessionSnapshot
) => {
  if (isAuthFailure(error)) {
    authStore.clearAuth({ expectedSession: requestSession })
  }
  authStore.syncFromStorage()
  if (!authStore.isLoggedIn) {
    return loginRoute(to)
  }
  if (isForbiddenFailure(error)) {
    return forbiddenRoute(to, 'serverForbidden')
  }
  authStore.markAuthStale()
  return authUnavailableRoute(to)
}

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

    authStore.syncFromStorage()

    if (isPublic) {
      if (isAuthPage && authStore.isLoggedIn) {
        const forceLogoutForPasswordReset =
          to.path === '/login' && String(to.query.reason || '') === 'logout-required-for-password-reset'
        if (forceLogoutForPasswordReset) {
          return true
        }

        try {
          const verifiedUser = await authStore.verifyToken()
          authStore.syncFromStorage()
          if (
            !verifiedUser
            || !authStore.isLoggedIn
            || !authStore.tokenVerified
          ) {
            return true
          }
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
      return loginRoute(to)
    }

    const isAdminRoute = to.matched.some((record) => record.meta.requiresAdmin)
    const verificationSession = captureAuthSession()
    try {
      const verifiedUser = isAdminRoute
        ? await authStore.verifyAdminSession()
        : await authStore.verifyToken()
      const sessionRoute = recheckVerifiedSession(authStore, to, verifiedUser)
      if (sessionRoute) {
        return sessionRoute
      }
    } catch (error) {
      return verificationFailureRoute(
        authStore,
        to,
        error,
        verificationSession
      )
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
