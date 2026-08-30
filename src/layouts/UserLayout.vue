<template>
  <div
    class="jobcoach-layout"
    :class="{
      'is-user-redesign': !isImmersivePage,
      'is-resume-workbench-page': isResumeWorkbench
    }"
  >
    <UserAppShell
      v-if="!isImmersivePage"
      :display-name="displayName"
      :avatar-text="avatarText"
      :avatar-url="authStore.userInfo?.avatarUrl || ''"
      :can-access-admin="Boolean(adminEntryPath)"
      @go-admin="goAdmin"
      @user-command="handleCommand"
      @open-command="commandPaletteOpen = true"
    >
      <main
        class="jobcoach-main"
        :class="{ 'is-resume-workbench-main': isResumeWorkbench }"
      >
        <div v-if="requestError" class="user-request-error" role="alert">
          <div class="user-request-error__copy">
            <strong>{{ requestError.message }}</strong>
            <span>{{ requestError.categoryLabel }}：{{ requestError.nextAction }}</span>
            <span v-if="requestError.traceId">错误编号：{{ displayTraceId(requestError.traceId) }}</span>
          </div>
          <div class="user-request-error__actions">
            <button v-if="requestError.retryable" type="button" @click="reloadCurrentPage">重试当前页</button>
            <button type="button" class="user-request-error__close" aria-label="关闭错误提示" @click="requestError = null">关闭</button>
          </div>
        </div>
        <div v-if="appConfig.demoReadOnly" class="demo-readonly-banner">
          当前为体验模式，页面可浏览，暂不保存新增、修改或删除等更改。
        </div>
        <RouteErrorBoundary
          :loading="routeLoading"
          fallback-path="/dashboard"
          @retry="handleRouteRetry"
        >
          <RouterView v-slot="{ Component }">
            <component :is="Component" v-if="Component" />
          </RouterView>
        </RouteErrorBoundary>
      </main>
    </UserAppShell>

    <main
      v-if="isImmersivePage"
      class="jobcoach-main"
      :class="{ 'is-immersive': isImmersivePage }"
    >
      <RouteErrorBoundary
        :loading="routeLoading"
        fallback-path="/dashboard"
        @retry="handleRouteRetry"
      >
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-if="Component" />
        </RouterView>
      </RouteErrorBoundary>
    </main>

    <CommandPalette v-if="!isImmersivePage" v-model="commandPaletteOpen" scope="user" />
    <XpGainToast />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, type Ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import XpGainToast from '@/components/game/XpGainToast.vue'
import CommandPalette from '@/components/layout/CommandPalette.vue'
import UserAppShell from '@/components/layout/UserAppShell.vue'
import { appConfig } from '@/config'
import { applyProductTheme, clearProductTheme } from '@/config/themePolicy'
import { useGameProfileStore } from '@/features/game-profile'
import { resolveAdminEntryPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'
import { REQUEST_ERROR_EVENT, type RequestErrorDiagnostic } from '@/utils/errorEvents'
import { showUserMessage } from '@/utils/userMessage'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
const tagsStore = useTagsViewStore()
const routeLoading = inject<Readonly<Ref<boolean>>>(
  'codecoachai:route-loading',
  ref(false)
)

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
const adminEntryPath = computed(() => resolveAdminEntryPath(authStore))
const isImmersivePage = computed(() => Boolean(route.meta?.immersive))
const isResumeWorkbench = computed(() => route.meta?.layoutMode === 'resume-workbench')
const requestError = ref<RequestErrorDiagnostic | null>(null)
const commandPaletteOpen = ref(false)

watch(
  () => authStore.userInfo?.id,
  (userId) => {
    if (userId == null) {
      gameProfile.resetSession()
      return
    }
    gameProfile.hydrate(userId)
  },
  { immediate: true }
)

watch(
  isImmersivePage,
  (immersive) => {
    document.body.classList.toggle('user-overlay-theme', !immersive)
  },
  { immediate: true }
)

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

const handleCommand = async (command: string) => {
  if (command === 'profile') {
    await router.push('/profile')
    return
  }

  if (command === 'password') {
    await router.push('/password')
    return
  }

  if (command === 'admin') {
    await goAdmin()
    return
  }

  if (command === 'logout') {
    tagsStore.clearVisitedViews()
    gameProfile.resetSession()
    await authStore.logout()
    await router.push('/login')
  }
}

const displayTraceId = (traceId?: string) => {
  const value = String(traceId || '').trim()
  if (!value) return ''
  return value.length <= 18 ? value : `${value.slice(0, 8)}...${value.slice(-6)}`
}

const handleRequestError = (event: Event) => {
  const detail = (event as CustomEvent<RequestErrorDiagnostic>).detail
  if (!detail || (detail.routePath && detail.routePath !== route.fullPath)) return
  requestError.value = detail
}

const reloadCurrentPage = () => {
  requestError.value = null
  router.go(0)
}

const handleRouteRetry = (reason: 'error' | 'loading') => {
  if (reason === 'loading') {
    window.location.reload()
  }
}

watch(
  () => route.fullPath,
  () => {
    requestError.value = null
    showUserMessage.closeTransientErrors()
  }
)

onMounted(() => {
  applyProductTheme('user')
  document.body.classList.add('is-user-layout-active')
  window.addEventListener(REQUEST_ERROR_EVENT, handleRequestError)
})

onBeforeUnmount(() => {
  clearProductTheme('user')
  document.body.classList.remove('is-user-layout-active')
  document.body.classList.remove('user-overlay-theme')
  window.removeEventListener(REQUEST_ERROR_EVENT, handleRequestError)
})
</script>

<style scoped lang="scss">
.jobcoach-layout {
  display: block;
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  background: var(--user-bg);
  color: var(--user-text);
}

.jobcoach-main {
  width: 100%;
  min-width: 0;
  min-height: calc(100dvh - 56px);
  // v21 原型 .main 的阅读列留量
  padding: 28px 32px 46px;

  > :deep(.page-shell:not(.interview-room)),
  > :deep(.user-page-shell:not(.interview-room)),
  > :deep(.arena:not(.interview-room)) {
    box-sizing: border-box;
    width: min(100%, 1440px);
    min-width: 0;
    margin: 0 auto;
  }

  > :deep(.page-shell.page-shell--wide) {
    width: min(100%, 1600px);
  }

  &.is-immersive {
    width: 100%;
    min-height: 100vh;
    padding: 0;
  }

  &.is-resume-workbench-main {
    min-height: calc(100dvh - 62px);
    padding: 0;
  }
}

// Arena 页面的最终视觉 token 由 src/styles/arena.scss 统一供给（v21 · Quiet Luxury）。
// 这里不再覆盖 --arena-* 色板与圆角，避免「带 .arena / 不带 .arena」出现两套视觉系统。

.demo-readonly-banner {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--user-warning-border, rgba(245, 158, 11, 0.34));
  border-radius: var(--user-radius-sm);
  background: var(--user-warning-soft);
  color: var(--user-warning-text, #92400e);
  font-size: 13px;
  line-height: 1.6;
  box-shadow: none;
}

.user-request-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin: 0 auto 12px;
  width: min(calc(100% - 28px), 1180px);
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--user-warning) 42%, var(--user-border));
  border-radius: 8px;
  background: var(--user-warning-soft);
  color: var(--user-text);
}

.user-request-error__copy {
  display: grid;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 13px;
    line-height: 1.4;
  }

  span {
    color: var(--user-text-muted);
    font-size: 11px;
  }
}

.user-request-error__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;

  button {
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid var(--user-primary);
    border-radius: 6px;
    background: var(--user-primary);
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
  }

  .user-request-error__close {
    border-color: var(--user-border);
    background: transparent;
    color: var(--user-text-muted);
  }
}

@media (max-width: 720px) {
  .jobcoach-layout {
    --user-mobile-top-height: 58px;
    --user-mobile-nav-height: 60px;
    --user-mobile-nav-gap: 8px;
  }

  .jobcoach-main {
    min-height: calc(100dvh - 56px);
    padding: 18px 14px calc(32px + env(safe-area-inset-bottom, 0px));
  }

  .user-request-error {
    align-items: flex-start;
    flex-direction: column;
    width: calc(100% - 24px);
    margin-bottom: 8px;
  }
}

:global(.codecoach-global-message) {
  box-sizing: border-box;
  max-width: min(calc(100vw - 24px), 560px);
}

@media (max-width: 768px) {
  :global(.codecoach-global-message) {
    margin-top: env(safe-area-inset-top, 0px);
  }
}
</style>
