<template>
  <main v-if="authBoundaryBlocked" class="app-route-loading">
    <section class="app-route-loading__panel">
      <span class="app-route-loading__mark">C</span>
      <strong>CodeCoachAI 正在切换账号</strong>
      <p>正在卸载上一会话的数据并重新确认访问权限...</p>
    </section>
  </main>
  <main v-else-if="routeLoadError" class="app-route-error" role="alert">
    <section class="app-route-error__panel">
      <span class="app-route-loading__mark">C</span>
      <strong>页面资源没有加载成功</strong>
      <p>{{ routeLoadError }}</p>
      <div class="app-route-error__actions">
        <button type="button" class="app-route-error__primary" @click="reloadPage">重新加载</button>
        <button type="button" class="app-route-error__secondary" @click="goToSafePage">返回工作台</button>
      </div>
    </section>
  </main>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, readonly, ref } from 'vue'
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
const routeLoading = ref(false)
const routeLoadError = ref('')
let authTransitionGeneration = 0
let pendingRouteKey = ''
const routeAssetErrorPattern = /Unable to preload CSS|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk failed/i
const authStorageKeys = new Set<string>([
  STORAGE_KEYS.token,
  STORAGE_KEYS.userInfo,
  STORAGE_KEYS.roles,
  STORAGE_KEYS.permissions,
  AUTH_SESSION_STORAGE_KEY
])

provide('codecoachai:route-loading', readonly(routeLoading))

const stopBeforeEach = router.beforeEach?.((to) => {
  pendingRouteKey = to.fullPath
  routeLoading.value = true
})

const stopAfterEach = router.afterEach?.((to) => {
  if (to.fullPath === pendingRouteKey) {
    pendingRouteKey = ''
    routeLoading.value = false
  }
})

const stopRouteError = router.onError?.((error, to) => {
  if (!to || to.fullPath === pendingRouteKey) {
    pendingRouteKey = ''
    routeLoading.value = false
  }
  const message = error instanceof Error ? error.message : String(error || '')
  if (!routeAssetErrorPattern.test(message)) return
  routeLoadError.value = '请检查网络后重新加载页面，或先返回工作台继续使用。'
})

const reloadPage = () => {
  window.location.reload()
}

const goToSafePage = async () => {
  routeLoadError.value = ''
  await router.push('/dashboard').catch(() => {
    routeLoadError.value = '工作台暂时无法打开，请重新加载页面后再试。'
  })
}

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
  stopBeforeEach?.()
  stopAfterEach?.()
  stopRouteError?.()
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

.app-route-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--app-bg);
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

.app-route-error__panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(100%, 420px);
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
    line-height: 1.6;
  }
}

.app-route-error__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
}

.app-route-error__primary,
.app-route-error__secondary {
  min-height: 36px;
  padding: 0 14px;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
}

.app-route-error__primary {
  border: 1px solid var(--app-primary);
  background: var(--app-primary);
  color: #fff;
}

.app-route-error__secondary {
  border: 1px solid var(--app-border);
  background: var(--app-surface);
  color: var(--app-text);
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
