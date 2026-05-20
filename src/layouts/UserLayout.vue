<template>
  <el-container class="app-layout user-layout" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <el-aside class="app-layout__aside">
      <div class="app-layout__brand">
        <div class="brand-mark">C</div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <strong>CodeCoachAI</strong>
          <span>AI Java 面试训练台</span>
        </div>
      </div>

      <UserSidebar :collapsed="appStore.sidebarCollapsed" />

      <div v-show="!appStore.sidebarCollapsed" class="sidebar-status">
        <span class="status-dot"></span>
        <span>AI Workspace</span>
      </div>
    </el-aside>

    <el-container class="app-layout__content">
      <el-header class="app-layout__header">
        <div class="header-left">
          <button class="icon-button" type="button" aria-label="Toggle sidebar" @click="appStore.toggleSidebar()">
            <PanelLeftClose v-if="!appStore.sidebarCollapsed" :size="18" />
            <PanelLeftOpen v-else :size="18" />
          </button>
          <AppBreadcrumb root-path="/dashboard" root-title="工作台" />
        </div>

        <div class="app-layout__header-actions">
          <div class="command-search" aria-hidden="true">
            <Search :size="15" />
            <span>Search workspace</span>
          </div>
          <el-tooltip :content="notificationTooltip" placement="bottom">
            <button class="icon-button icon-button--ghost notification-bell" type="button" aria-label="通知中心" @click="router.push('/notifications')">
              <Bell :size="16" />
              <span v-if="unreadAvailable && unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </button>
          </el-tooltip>
          <el-button v-if="authStore.isAdmin" class="admin-entry" text @click="router.push('/admin')">
            <Shield :size="15" />
            管理端
          </el-button>
          <el-dropdown trigger="click" @command="handleCommand">
            <button class="user-trigger" type="button">
              <el-avatar :size="30" :src="authStore.userInfo?.avatarUrl || ''">
                {{ avatarText }}
              </el-avatar>
              <span>{{ displayName }}</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <TagsView scope="user" />

      <el-main class="app-layout__main">
        <RouteErrorBoundary fallback-path="/dashboard">
          <RouterView />
        </RouteErrorBoundary>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { Bell, PanelLeftClose, PanelLeftOpen, Search, Shield } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getUnreadCountApi } from '@/api/notification'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import RouteErrorBoundary from '@/components/common/RouteErrorBoundary.vue'
import TagsView from '@/components/layout/TagsView.vue'
import UserSidebar from '@/components/layout/UserSidebar.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const tagsStore = useTagsViewStore()

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())

const unreadCount = ref(0)
const unreadAvailable = ref(true)
const notificationTooltip = computed(() => unreadAvailable.value ? '通知中心' : '通知中心（未读数暂不可用）')
const fetchUnreadCount = async () => {
  try {
    const result = await getUnreadCountApi()
    unreadCount.value = result.total || 0
    unreadAvailable.value = true
  } catch {
    unreadAvailable.value = false
  }
}

onMounted(fetchUnreadCount)

watch(
  () => route.fullPath,
  () => tagsStore.addVisitedView(route),
  { immediate: true }
)

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
</script>

<style scoped lang="scss">
.app-layout {
  min-height: 100vh;
  background:
    linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent 28rem),
    linear-gradient(180deg, rgba(15, 23, 42, 0.62), rgba(2, 6, 23, 0.96));
}

.app-layout__aside {
  width: var(--app-sidebar-width);
  overflow-x: hidden;
  border-right: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.88);
  transition: width 0.2s ease;
}

.user-layout.is-collapsed {
  .app-layout__aside {
    width: 72px;
  }

  .app-layout__brand {
    justify-content: center;
    padding-inline: 0;
  }
}

.app-layout__content {
  min-width: 0;
}

.app-layout__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--app-header-height);
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
  white-space: nowrap;

  span {
    display: block;
    margin-top: 2px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.brand-text {
  min-width: 0;
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--app-primary);
  color: #fff;
  font-weight: 700;
}

.app-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--app-header-height);
  border-bottom: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(18px);
}

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.app-layout__header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
}

.icon-button,
.user-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}

.notification-bell {
  position: relative;
}

.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--el-color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}

.icon-button {
  width: 36px;
  height: 36px;
  border-color: var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(99, 102, 241, 0.14);
  }

  &--ghost {
    background: transparent;
    color: var(--app-text-muted);
  }

  &--ghost:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  &--ghost:disabled:hover {
    border-color: var(--app-border);
    background: transparent;
  }
}

.user-trigger {
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;

  &:hover {
    background: rgba(99, 102, 241, 0.12);
  }
}

.command-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 190px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: var(--app-text-muted);
  font-size: 12px;
}

.admin-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sidebar-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 14px 16px 0;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.64);
  color: var(--app-text-muted);
  font-size: 12px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--cc-success);
  box-shadow: 0 0 14px rgba(34, 197, 94, 0.72);
}

.app-layout__main {
  min-width: 0;
  min-height: calc(100vh - var(--app-header-height) - 38px);
  padding: 24px;
  overflow: auto;
}

:deep(.layout-menu) {
  border-right: 0;
}

@media (max-width: 760px) {
  .app-layout {
    display: block;
  }

  .app-layout__aside,
  .user-layout.is-collapsed .app-layout__aside {
    width: 100%;
    border-right: 0;
  }

  :deep(.layout-menu) {
    display: flex;
    overflow-x: auto;
  }

  :deep(.el-menu-item) {
    flex: 0 0 auto;
  }

  .app-layout__main {
    padding: 16px;
  }

  .command-search {
    display: none;
  }
}
</style>
