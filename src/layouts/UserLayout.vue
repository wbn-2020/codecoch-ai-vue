<template>
  <div class="jobcoach-layout">
    <UserTopNav
      :display-name="displayName"
      :avatar-text="avatarText"
      :avatar-url="authStore.userInfo?.avatarUrl || ''"
      :unread-count="unreadCount"
      :unread-available="unreadAvailable"
      :notification-tooltip="notificationTooltip"
      :can-access-admin="authStore.canAccessAdmin"
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
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getUnreadCountApi } from '@/api/notification'
import { appConfig } from '@/config'
import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import UserTopNav from '@/components/layout/UserTopNav.vue'
import { firstAccessibleAdminPath } from '@/router/adminAccess'
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

const unreadCount = ref(0)
const unreadAvailable = ref(true)
const commandPaletteOpen = ref(false)
const notificationTooltip = computed(() => unreadAvailable.value ? '通知中心' : '通知中心（稍后刷新未读数）')

const goAdmin = async () => {
  await router.push(firstAccessibleAdminPath(authStore) || '/403')
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
  unreadRefreshCancelled = false
  deferNonCriticalWork(fetchUnreadCount)
  window.addEventListener(NOTIFICATION_UNREAD_CHANGED_EVENT, fetchUnreadCount)
})

onBeforeUnmount(() => {
  unreadRefreshCancelled = true
  window.removeEventListener(NOTIFICATION_UNREAD_CHANGED_EVENT, fetchUnreadCount)
})

watch(
  () => route.fullPath,
  () => tagsStore.addVisitedView(route),
  { immediate: true }
)
</script>

<style scoped lang="scss">
.jobcoach-layout {
  min-height: 100vh;
  background:
    linear-gradient(180deg, rgba(232, 241, 255, 0.95), rgba(248, 250, 252, 0.98) 360px),
    #f8fafc;
  color: #172033;
  color-scheme: light;

  --app-bg: #f8fafc;
  --app-surface: #ffffff;
  --app-surface-soft: #f8fafc;
  --app-border: #e2e8f0;
  --app-text: #172033;
  --app-text-muted: #64748b;
  --app-primary: #2563eb;
  --app-primary-soft: #dbeafe;
  --app-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
  --user-mobile-top-height: 68px;
  --user-mobile-nav-height: 0px;
  --user-mobile-nav-gap: 0px;
  --el-bg-color: #ffffff;
  --el-bg-color-overlay: #ffffff;
  --el-fill-color-blank: #ffffff;
  --el-fill-color-light: #f8fafc;
  --el-border-color: #dbe3ef;
  --el-border-color-light: #e5eaf2;
  --el-text-color-primary: #172033;
  --el-text-color-regular: #334155;
  --el-text-color-secondary: #64748b;
  --el-color-primary: #2563eb;
  --el-color-primary-light-3: #60a5fa;
  --el-color-primary-light-5: #93c5fd;
  --el-color-primary-light-7: #bfdbfe;
  --el-color-primary-light-8: #dbeafe;
  --el-color-primary-light-9: #eff6ff;
  --el-color-primary-dark-2: #1d4ed8;
  --el-mask-color: rgba(255, 255, 255, 0.72);
}

.jobcoach-main {
  width: min(100%, 1240px);
  min-height: calc(100vh - 68px);
  margin: 0 auto;
  padding: 22px 24px 42px;
}

.demo-readonly-banner {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid rgba(244, 122, 31, 0.28);
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .jobcoach-layout {
    --user-mobile-top-height: 62px;
    --user-mobile-nav-height: 72px;
    --user-mobile-nav-gap: 12px;
  }

  .jobcoach-main {
    min-height: calc(100vh - 62px);
    padding: 16px 14px calc(var(--user-mobile-nav-height) + 32px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
