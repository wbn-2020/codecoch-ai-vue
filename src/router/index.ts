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

export default router
