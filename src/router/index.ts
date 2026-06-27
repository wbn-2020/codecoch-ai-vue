import { createRouter, createWebHistory } from 'vue-router'

import { setupRouterGuards } from './guards'
import { routes } from './routes'
import { buildSafeRedirectFromLocation, buildSafeRedirectTarget } from '@/utils/routeSecurity'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return {
      top: 0
    }
  }
})

setupRouterGuards(router)

const ROUTE_RELOAD_ONCE_KEY = 'codecoachai:route-reload-once'
const routeAssetErrorPattern = /Unable to preload CSS|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk failed/i
const routeFallbackBase = import.meta.env.BASE_URL || '/'

const routeAssetRedirectTarget = (to?: { path?: string; query?: Record<string, unknown> }) => {
  if (to?.path) return buildSafeRedirectTarget(to.path, to.query || {}, '/dashboard')
  return buildSafeRedirectFromLocation(window.location.pathname, window.location.search) || '/dashboard'
}

const routeFallbackHref = (redirect: string) => {
  const params = new URLSearchParams({ reason: 'routeAssetLoad', redirect })
  const base = routeFallbackBase.endsWith('/') ? routeFallbackBase : `${routeFallbackBase}/`
  return `${base}auth-unavailable?${params.toString()}`
}

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error || '')
  if (!routeAssetErrorPattern.test(message)) return
  if (sessionStorage.getItem(ROUTE_RELOAD_ONCE_KEY)) {
    const redirect = routeAssetRedirectTarget(to)
    router.replace({
      path: '/auth-unavailable',
      query: {
        reason: 'routeAssetLoad',
        redirect
      }
    }).catch(() => {
      window.location.href = routeFallbackHref(redirect)
    })
    return
  }
  sessionStorage.setItem(ROUTE_RELOAD_ONCE_KEY, '1')
  window.location.reload()
})

router.afterEach(() => {
  sessionStorage.removeItem(ROUTE_RELOAD_ONCE_KEY)
})

export default router
