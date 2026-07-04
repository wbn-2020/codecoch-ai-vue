<template>
  <div class="jobcoach-layout">
    <UserTopNav
      :display-name="displayName"
      :avatar-text="avatarText"
      :avatar-url="authStore.userInfo?.avatarUrl || ''"
      :unread-count="unreadCount"
      :unread-available="unreadAvailable"
      :notification-tooltip="notificationTooltip"
      :can-access-admin="Boolean(adminEntryPath)"
      @open-command="commandPaletteOpen = true"
      @go-admin="goAdmin"
      @user-command="handleCommand"
    />

    <CommandPalette v-if="commandPaletteOpen" v-model="commandPaletteOpen" scope="user" />

    <main class="jobcoach-main">
      <div v-if="appConfig.demoReadOnly" class="demo-readonly-banner">
        当前为体验模式，页面可浏览，暂不保存新增、修改或删除等更改。
      </div>
      <RouteErrorBoundary fallback-path="/dashboard">
        <RouterView />
      </RouteErrorBoundary>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getUnreadCountApi } from '@/api/notification'
import { appConfig } from '@/config'
import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import UserTopNav from '@/components/layout/UserTopNav.vue'
import { resolveAdminEntryPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'
import { NOTIFICATION_UNREAD_CHANGED_EVENT } from '@/utils/notificationEvents'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const tagsStore = useTagsViewStore()
const CommandPalette = defineAsyncComponent(() => import('@/components/layout/CommandPalette.vue'))

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
const adminEntryPath = computed(() => resolveAdminEntryPath(authStore))

const unreadCount = ref(0)
const unreadAvailable = ref(true)
const commandPaletteOpen = ref(false)
const notificationTooltip = computed(() => unreadAvailable.value ? '通知中心' : '通知中心（稍后刷新未读数）')

const goAdmin = async () => {
  try {
    await authStore.verifyAdminSession()
  } catch {
    await router.push('/auth-unavailable')
    return
  }

  const path = resolveAdminEntryPath(authStore)
  await router.push(path || '/403')
}

const fetchUnreadCount = async () => {
  try {
    const result = await getUnreadCountApi()
    unreadCount.value = result.total || 0
    unreadAvailable.value = true
  } catch {
    unreadAvailable.value = false
  }
}

let unreadRefreshCancelled = false

const deferNonCriticalWork = (callback: () => void | Promise<void>) => {
  const run = () => {
    if (!unreadRefreshCancelled) {
      void callback()
    }
  }
  const requestIdleCallback = (window as Window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout?: number }) => number
  }).requestIdleCallback

  if (requestIdleCallback) {
    requestIdleCallback(run, { timeout: 1200 })
    return
  }

  window.setTimeout(run, 250)
}

const handleCommand = async (command: string) => {
  if (command === 'profile') {
    await router.push('/profile')
    return
  }

  if (command === 'password') {
    await router.push('/password')
    return
  }

  if (command === 'logout') {
    tagsStore.clearVisitedViews()
    await authStore.logout()
    await router.push('/login')
  }
}

onMounted(() => {
  document.body.classList.add('is-user-layout-active')
  unreadRefreshCancelled = false
  deferNonCriticalWork(fetchUnreadCount)
  window.addEventListener(NOTIFICATION_UNREAD_CHANGED_EVENT, fetchUnreadCount)
})

onBeforeUnmount(() => {
  document.body.classList.remove('is-user-layout-active')
  unreadRefreshCancelled = true
  window.removeEventListener(NOTIFICATION_UNREAD_CHANGED_EVENT, fetchUnreadCount)
})

</script>

<style scoped lang="scss">
.jobcoach-layout {
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(222, 232, 246, 0.94) 0, rgba(238, 243, 248, 0.98) 320px),
    linear-gradient(135deg, rgba(29, 78, 216, 0.08), rgba(14, 116, 144, 0.05) 44%, transparent 72%),
    var(--user-bg);
  color: var(--user-text);
}

.jobcoach-main {
  width: min(100%, 1280px);
  min-height: calc(100vh - 68px);
  margin: 0 auto;
  padding: 22px 28px 42px;
}

.demo-readonly-banner {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: var(--user-radius-sm);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.42), rgba(255, 246, 230, 0.9)),
    var(--user-warning-soft);
  color: #9a3412;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: var(--user-shadow-xs);
}

@media (max-width: 720px) {
  .jobcoach-layout {
    --user-mobile-top-height: 62px;
    --user-mobile-nav-height: 72px;
    --user-mobile-nav-gap: 12px;
  }

  .jobcoach-main {
    min-height: calc(100vh - 62px);
    padding: 16px 14px calc(var(--user-mobile-nav-height) + var(--user-mobile-nav-gap) + 20px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
