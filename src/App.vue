<template>
  <RouterView v-slot="{ Component }">
    <Suspense>
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
import { onBeforeUnmount, onMounted } from 'vue'

import { STORAGE_KEYS } from '@/constants/storage'
import type { LoginVO } from '@/types/auth'
import { AUTH_REFRESHED_EVENT } from '@/utils/authEvents'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const authStorageKeys = new Set<string>([
  STORAGE_KEYS.token,
  STORAGE_KEYS.userInfo,
  STORAGE_KEYS.roles,
  STORAGE_KEYS.permissions
])

const handleAuthRefreshed = (event: Event) => {
  const detail = (event as CustomEvent<LoginVO>).detail
  if (detail?.token) {
    authStore.applyRefreshResult(detail)
  }
}

const handleAuthStorageChange = (event: StorageEvent) => {
  if (!event.key || authStorageKeys.has(event.key)) {
    authStore.syncFromStorage()
  }
}

onMounted(() => {
  window.addEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed)
  window.addEventListener('storage', handleAuthStorageChange)
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_REFRESHED_EVENT, handleAuthRefreshed)
  window.removeEventListener('storage', handleAuthStorageChange)
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
