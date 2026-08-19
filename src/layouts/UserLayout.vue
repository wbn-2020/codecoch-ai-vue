<template>
  <div
    class="jobcoach-layout"
    :class="{
      'is-arena-page': usesArenaShell,
      'is-resume-workbench-page': isResumeWorkbench
    }"
  >
    <div
      v-if="usesArenaShell"
      class="arena-frame"
      :class="{ 'is-resume-workbench-frame': isResumeWorkbench }"
    >
      <ArenaTopNav
        v-if="!isImmersivePage"
        :display-name="displayName"
        :avatar-text="avatarText"
        :avatar-url="authStore.userInfo?.avatarUrl || ''"
        :can-access-admin="Boolean(adminEntryPath)"
        @go-admin="goAdmin"
        @user-command="handleCommand"
      />

      <main
        class="jobcoach-main"
        :class="{
          'is-arena-main': usesArenaShell,
          'is-immersive': isImmersivePage,
          'is-resume-workbench-main': isResumeWorkbench
        }"
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
    </div>

    <main
      v-else
      class="jobcoach-main"
      :class="{
        'is-arena-main': usesArenaShell,
        'is-immersive': isImmersivePage
      }"
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

    <XpGainToast />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, type Ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import XpGainToast from '@/components/game/XpGainToast.vue'
import ArenaTopNav from '@/components/layout/ArenaTopNav.vue'
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
const usesArenaShell = computed(() => !isImmersivePage.value)
const isResumeWorkbench = computed(() => route.meta?.layoutMode === 'resume-workbench')
const requestError = ref<RequestErrorDiagnostic | null>(null)

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

watch(usesArenaShell, (enabled) => {
  document.body.classList.toggle('arena-overlay-theme', enabled)
}, { immediate: true })

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
  document.body.classList.remove('arena-overlay-theme')
  window.removeEventListener(REQUEST_ERROR_EVENT, handleRequestError)
})
</script>

<style scoped lang="scss">
.jobcoach-layout {
  // Direction D is a document-flow shell. A legacy global selector can otherwise
  // turn it into an inline flex container and place the navigation beside content.
  display: block;
  width: 100%;
  min-height: 100vh;
  min-width: 0;
  background: var(--user-bg);
  color: var(--user-text);
}

.jobcoach-layout.is-arena-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  color-scheme: light;
  background: var(--arena-bg);
}

.arena-frame {
  position: relative;
  width: min(calc(100% - 32px), 1680px);
  min-height: 820px;
  margin: 0 auto;
  align-self: center;
  border-radius: 10px;
  background: var(--arena-bg);
  box-shadow: 0 10px 28px rgba(21, 33, 27, 0.14);
}

.arena-frame.is-resume-workbench-frame {
  width: min(calc(100% - 16px), 1600px);
  min-height: 100dvh;
  border-radius: 12px;
  background: var(--user-bg);
  box-shadow: 0 10px 28px rgba(21, 33, 27, 0.14);
}

.jobcoach-main {
  width: min(100%, 1440px);
  min-width: 0;
  min-height: calc(100vh - 64px);
  margin: 0 auto;
  padding: 14px 24px 28px;

  &.is-arena-main {
    width: 100%;
    min-height: calc(820px - 62px);
    padding: 0;

    // Legacy user styles compact `.page-shell` roots into a dashboard grid.
    // Direction D pages own their flow and width, so restore the root display;
    // each page keeps its prototype-specific max-width.
    > :deep(.arena.page-shell) {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    // Most extended user pages still keep their business-specific roots instead
    // of the `.arena` root. Preserve a broad desktop task area while keeping
    // enough page padding for scan-friendly content at 1920px.
    > :deep(.page-shell:not(.arena):not(.interview-room)),
    > :deep(.user-page-shell:not(.arena):not(.interview-room)) {
      box-sizing: border-box;
      width: min(100%, 1440px);
      min-width: 0;
      margin: 0 auto;
      padding: 28px 32px 46px;
    }

    // A few history and comparison views use a verified wider desktop grid.
    // Preserve their own content measure instead of compressing them into the
    // default extension-page column.
    > :deep(.page-shell.page-shell--wide) {
      width: min(100%, 1600px);
    }

    @media (max-width: 720px) {
      :deep(.arena:not(.arena-room)) {
        padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
      }

      > :deep(.page-shell:not(.arena):not(.interview-room)),
      > :deep(.user-page-shell:not(.arena):not(.interview-room)) {
        min-width: 0;
        padding: 18px 14px calc(84px + env(safe-area-inset-bottom, 0px));
      }
    }
  }

  &.is-immersive {
    width: 100%;
    min-height: 100vh;
    padding: 0;
  }

  &.is-resume-workbench-main {
    min-height: calc(100dvh - 62px);
  }
}

.demo-readonly-banner {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: var(--user-radius-sm);
  background: var(--user-warning-soft);
  color: #fde68a;
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

.jobcoach-layout.is-arena-page .demo-readonly-banner {
  color: #b4560a;
}

@media (max-width: 720px) {
  .jobcoach-layout {
    --user-mobile-top-height: 58px;
    --user-mobile-nav-height: 60px;
    --user-mobile-nav-gap: 8px;
  }

  .arena-frame {
    width: 100%;
    min-height: 100vh;
    border-radius: 0;
    box-shadow: none;
  }

  .arena-frame.is-resume-workbench-frame {
    width: 100%;
    min-height: 100dvh;
    border-radius: 0;
  }

  .jobcoach-main {
    min-height: calc(100vh - 58px);
    padding: 12px 12px calc(var(--user-mobile-nav-height) + var(--user-mobile-nav-gap) + 78px + env(safe-area-inset-bottom, 0px));

    &.is-arena-main {
      min-height: calc(100vh - 54px);
      padding: 0;
    }
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
