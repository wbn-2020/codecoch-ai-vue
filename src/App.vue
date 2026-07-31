<template>
  <main v-if="authBoundaryBlocked" class="app-route-loading">
    <section class="app-route-loading__panel">
      <span class="app-route-loading__mark">C</span>
      <strong>CodeCoachAI 正在切换账号</strong>
      <p>正在卸载上一会话的数据并重新确认访问权限...</p>
    </section>
  </main>
  <RouterView v-else v-slot="{ Component }">
    <Suspense v-if="Component">
      <component :is="Component" />
      <template #fallback>
        <main class="app-route-loading">
          <section class="app-route-loading__panel">
            <span class="app-route-loading__mark">C</span>
            <strong>CodeCoachAI 正在加载</strong>
            <p>正在确认登录状态和页面资源...</p>
          </section>
        </main>
      </template>
    </Suspense>
  </RouterView>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginVO } from '@/types/auth'
import { AUTH_CLEARED_EVENT, AUTH_REFRESHED_EVENT } from '@/utils/authEvents'
import { useAuthStore } from '@/stores/auth'
import {
  buildSafeRedirectTarget,
  sanitizeLocalRedirectPath
} from '@/utils/routeSecurity'
import { AUTH_SESSION_STORAGE_KEY } from '@/utils/token'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const authBoundaryBlocked = ref(false)
let authTransitionGeneration = 0
const authStorageKeys = new Set<string>([
  STORAGE_KEYS.token,
  STORAGE_KEYS.userInfo,
  STORAGE_KEYS.roles,
  STORAGE_KEYS.permissions,
  AUTH_SESSION_STORAGE_KEY
])

const handleAuthRefreshed = (event: Event) => {
  const detail = (event as CustomEvent<LoginVO>).detail
  if (detail?.token) {
    authStore.applyRefreshResult(detail)
  }
}

const currentProtectedRedirect = () => {
  if (!route.meta.public) {
    return buildSafeRedirectTarget(route.path, route.query)
  }
  if (
    route.path === '/auth-unavailable'
    && String(route.query.reason || '') === 'session-changed'
  ) {
    return sanitizeLocalRedirectPath(route.query.redirect) || ''
  }
  return ''
}

const loginTarget = (redirect: string): RouteLocationRaw => ({
  path: '/login',
  ...(redirect ? { query: { redirect } } : {})
})

const replaceAtAuthBoundary = async (
  target: RouteLocationRaw,
  transitionGeneration: number,
  blockProtectedRoute: boolean
) => {
  if (blockProtectedRoute) {
    authBoundaryBlocked.value = true
  }
  try {
    await router.replace(target)
  } finally {
    if (transitionGeneration === authTransitionGeneration) {
      authBoundaryBlocked.value = false
    }
  }
}

const handleAuthSessionTransition = async (
  redirect: string,
  wasProtectedRoute: boolean
) => {
  const transitionGeneration = ++authTransitionGeneration

  if (!authStore.isLoggedIn) {
    if (!wasProtectedRoute) return
    await replaceAtAuthBoundary(
      loginTarget(redirect),
      transitionGeneration,
      true
    )
    return
  }

  if (!wasProtectedRoute) return

  await replaceAtAuthBoundary(
    {
      path: '/auth-unavailable',
      query: {
        reason: 'session-changed',
        redirect
      }
    },
    transitionGeneration,
    true
  )
  if (transitionGeneration !== authTransitionGeneration) return

  try {
    const verifiedUser = await authStore.verifyToken({ force: true })
    authStore.syncFromStorage()
    if (transitionGeneration !== authTransitionGeneration) return
    if (!authStore.isLoggedIn) {
      await router.replace(loginTarget(redirect))
      return
    }
    if (!verifiedUser || !authStore.tokenVerified) {
      authStore.markAuthStale()
      return
    }
    await router.replace(redirect || '/')
  } catch {
    authStore.syncFromStorage()
    if (transitionGeneration !== authTransitionGeneration) return
    if (!authStore.isLoggedIn) {
      await router.replace(loginTarget(redirect))
    } else {
      authStore.markAuthStale()
    }
  }
}

const handleAuthCleared = () => {
  const redirect = currentProtectedRedirect()
  const wasProtectedRoute = Boolean(redirect)
  authStore.clearAuth({ persist: false })
  void handleAuthSessionTransition(redirect, wasProtectedRoute)
}

const handleAuthStorageChange = (event: StorageEvent) => {
  if (event.key && !authStorageKeys.has(event.key)) return

  const previousToken = authStore.token
  const previousSessionId = authStore.authSessionId
  const redirect = currentProtectedRedirect()
  const wasProtectedRoute = Boolean(redirect)
  authStore.syncFromStorage()
  if (
    previousToken === authStore.token
    && previousSessionId === authStore.authSessionId
  ) {
    return
  }
  void handleAuthSessionTransition(redirect, wasProtectedRoute)
}

const revalidateFocusedSession = () => {
  if (authBoundaryBlocked.value) return
  authStore.syncFromStorage()
  if (!authStore.isLoggedIn) return
  void authStore.verifyToken().catch(() => {
    if (authStore.isLoggedIn) {
      authStore.markAuthStale()
    }
  })
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    revalidateFocusedSession()
  }
}

onMounted(() => {
  window.addEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed)
  window.addEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
  window.addEventListener('storage', handleAuthStorageChange)
  window.addEventListener('focus', revalidateFocusedSession)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  authTransitionGeneration += 1
  authBoundaryBlocked.value = false
  window.removeEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed)
  window.removeEventListener(AUTH_CLEARED_EVENT, handleAuthCleared)
  window.removeEventListener('storage', handleAuthStorageChange)
  window.removeEventListener('focus', revalidateFocusedSession)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<style scoped lang="scss">
.app-route-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(37 99 235 / 10%), transparent 42%),
    linear-gradient(315deg, rgb(15 118 110 / 10%), transparent 38%),
    var(--app-bg);
}

.app-route-loading__panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(100%, 360px);
  padding: 32px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);
  text-align: center;

  strong {
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    font-size: 14px;
  }
}

.app-route-loading__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--app-primary);
  color: #fff;
  font-weight: 700;
}
</style>
