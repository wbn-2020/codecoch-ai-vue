import { createRouter, createWebHistory } from 'vue-router'

import { setupRouterGuards } from './guards'
import { routes } from './routes'

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
const routeAssetErrorPattern = /Unable to preload CSS|Failed to fetch dynamically imported module|Importing a module script failed/i

router.onError((error) => {
  const message = error instanceof Error ? error.message : String(error || '')
  if (!routeAssetErrorPattern.test(message)) return
  if (sessionStorage.getItem(ROUTE_RELOAD_ONCE_KEY)) return
  sessionStorage.setItem(ROUTE_RELOAD_ONCE_KEY, '1')
  window.location.reload()
})

router.afterEach(() => {
  sessionStorage.removeItem(ROUTE_RELOAD_ONCE_KEY)
})

export default router
