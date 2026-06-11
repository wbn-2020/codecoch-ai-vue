import type { RouteRecordRaw } from 'vue-router'

import { routes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

const ADMIN_ROOT = '/admin'
const ADMIN_BASELINE_PERMISSIONS = new Set(['admin:system:overview'])

const isHiddenRoute = (route: RouteRecordRaw) => Boolean(route.meta?.hidden || route.redirect)

type AdminPermissionInput = string | string[] | undefined

const normalizeAdminPermissions = (permissions: AdminPermissionInput) => {
  if (Array.isArray(permissions)) return permissions.map(String).filter(Boolean)
  return permissions ? [String(permissions)] : []
}

export const canAccessAdminPermissions = (
  permissions: AdminPermissionInput,
  authStore: ReturnType<typeof useAuthStore>
) => {
  const normalizedPermissions = normalizeAdminPermissions(permissions)
  if (normalizedPermissions.length === 0) {
    return false
  }

  if (authStore.hasAnyPermission(normalizedPermissions)) {
    return true
  }

  const onlyBaselinePermissions = normalizedPermissions.every((permission) => ADMIN_BASELINE_PERMISSIONS.has(permission))
  return authStore.isAdmin && onlyBaselinePermissions
}

const canAccessRoute = (route: RouteRecordRaw, authStore: ReturnType<typeof useAuthStore>) => {
  const permissions = route.meta?.requiredPermissions
  if (!permissions) return false
  return canAccessAdminPermissions(permissions as AdminPermissionInput, authStore)
}

export const firstAccessibleAdminPath = (authStore: ReturnType<typeof useAuthStore>) => {
  const adminRoute = routes.find((route) => route.path === ADMIN_ROOT)
  const child = adminRoute?.children?.find((route) => !isHiddenRoute(route) && canAccessRoute(route, authStore))
  if (!child) {
    return null
  }
  return child.path ? `${ADMIN_ROOT}/${child.path}`.replace(/\/$/, '') : ADMIN_ROOT
}
