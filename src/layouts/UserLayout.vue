<template>
  <div class="jobcoach-layout" :class="{ 'is-arena-page': usesArenaShell }">
    <div v-if="usesArenaShell" class="arena-frame">
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
          'is-immersive': isImmersivePage
        }"
      >
        <div v-if="appConfig.demoReadOnly" class="demo-readonly-banner">
          当前为体验模式，页面可浏览，暂不保存新增、修改或删除等更改。
        </div>
        <RouteErrorBoundary fallback-path="/dashboard">
          <RouterView />
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
      <RouteErrorBoundary fallback-path="/dashboard">
        <RouterView />
      </RouteErrorBoundary>
    </main>

    <XpGainToast />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import XpGainToast from '@/components/game/XpGainToast.vue'
import ArenaTopNav from '@/components/layout/ArenaTopNav.vue'
import { appConfig } from '@/config'
import { useGameProfileStore } from '@/features/game-profile'
import { resolveAdminEntryPath } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
const tagsStore = useTagsViewStore()

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())
const adminEntryPath = computed(() => resolveAdminEntryPath(authStore))
const isImmersivePage = computed(() => Boolean(route.meta?.immersive))
const usesArenaShell = computed(() => !isImmersivePage.value)

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

onMounted(() => {
  document.body.classList.add('is-user-layout-active')
})

onBeforeUnmount(() => {
  document.body.classList.remove('is-user-layout-active')
  document.body.classList.remove('arena-overlay-theme')
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
  overflow-x: clip;
  background: var(--user-bg);
  color: var(--user-text);
}

.jobcoach-layout.is-arena-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  color-scheme: light;
  background:
    radial-gradient(900px 480px at 90% -5%, rgba(163, 230, 53, 0.2), transparent 60%),
    radial-gradient(800px 480px at -5% 100%, rgba(23, 178, 106, 0.14), transparent 60%),
    var(--arena-bg);
}

.arena-frame {
  position: relative;
  width: min(calc(100% - 28px), 1180px);
  min-height: 820px;
  margin: 0 auto;
  align-self: center;
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(900px 480px at 90% -5%, rgba(163, 230, 53, 0.2), transparent 60%),
    radial-gradient(800px 480px at -5% 100%, rgba(23, 178, 106, 0.14), transparent 60%),
    var(--arena-bg);
  box-shadow: 0 24px 60px rgba(21, 33, 27, 0.18);
}

.jobcoach-main {
  width: min(100%, 1440px);
  min-width: 0;
  min-height: calc(100vh - 64px);
  margin: 0 auto;
  padding: 14px 24px 28px;
  overflow-x: clip;

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
    // of the `.arena` root. Give those routes the same Direction D reading
    // column as the prototype pages so legacy dashboard roots do not touch the
    // frame edge or expand into the old cockpit canvas.
    > :deep(.page-shell:not(.arena):not(.interview-room)),
    > :deep(.user-page-shell:not(.arena):not(.interview-room)) {
      box-sizing: border-box;
      width: min(100%, 1060px);
      min-width: 0;
      margin: 0 auto;
      padding: 28px 34px 46px;
    }

    // A few history and comparison views use a verified wider desktop grid.
    // Preserve their own content measure instead of compressing them into the
    // default extension-page column.
    > :deep(.page-shell.page-shell--wide) {
      width: min(100%, 1240px);
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

  .jobcoach-main {
    min-height: calc(100vh - 58px);
    padding: 12px 12px calc(var(--user-mobile-nav-height) + var(--user-mobile-nav-gap) + 78px + env(safe-area-inset-bottom, 0px));

    &.is-arena-main {
      min-height: calc(100vh - 54px);
      padding: 0;
    }
  }
}
</style>
