import type { RouteRecordRaw } from 'vue-router'

import { routes } from '@/router/routes'
import { useAuthStore } from '@/stores/auth'

const ADMIN_ROOT = '/admin'

const isHiddenRoute = (route: RouteRecordRaw) => Boolean(route.meta?.hidden || route.redirect)

const canAccessRoute = (route: RouteRecordRaw, authStore: ReturnType<typeof useAuthStore>) => {
  const permissions = route.meta?.requiredPermissions
  if (!Array.isArray(permissions) || permissions.length === 0) {
    return true
  }
  return authStore.hasAnyPermission(permissions.map(String))
}

export const firstAccessibleAdminPath = (authStore: ReturnType<typeof useAuthStore>) => {
  const adminRoute = routes.find((route) => route.path === ADMIN_ROOT)
  const child = adminRoute?.children?.find((route) => !isHiddenRoute(route) && canAccessRoute(route, authStore))
  if (!child) {
    return null
  }
  return child.path ? `${ADMIN_ROOT}/${child.path}`.replace(/\/$/, '') : ADMIN_ROOT
}
