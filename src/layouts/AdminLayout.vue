<template>
  <el-container class="app-layout admin-layout" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <el-aside class="app-layout__aside">
      <div class="app-layout__brand">
        <div class="brand-mark">A</div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <strong>CodeCoachAI</strong>
          <span>AI 内容治理中心</span>
        </div>
      </div>
      <AdminSidebar :collapsed="appStore.sidebarCollapsed" />
    </el-aside>

    <el-container class="app-layout__content">
      <el-header class="app-layout__header">
        <div class="header-left">
          <button class="icon-button" type="button" aria-label="Toggle sidebar" @click="appStore.toggleSidebar()">
            <PanelLeftOpen v-if="appStore.sidebarCollapsed" :size="18" />
            <PanelLeftClose v-else :size="18" />
          </button>
          <AppBreadcrumb />
        </div>

        <div class="app-layout__header-actions">
          <div class="command-search" aria-hidden="true">
            <Search :size="15" />
            <span>Search admin console</span>
          </div>
          <el-button class="user-entry" text @click="router.push('/dashboard')">
            <MonitorUp :size="15" />
            用户端
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
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <TagsView />

      <el-main class="app-layout__main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { MonitorUp, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-vue-next'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import TagsView from '@/components/layout/TagsView.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useTagsViewStore } from '@/stores/tagsView'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()
const tagsStore = useTagsViewStore()

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || '管理员'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())

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
    linear-gradient(135deg, rgba(6, 182, 212, 0.08), transparent 26rem),
    linear-gradient(180deg, rgba(15, 23, 42, 0.7), rgba(2, 6, 23, 0.98));
}

.app-layout__aside {
  width: var(--app-sidebar-width);
  overflow-x: hidden;
  border-right: 1px solid var(--app-border);
  background: rgba(2, 6, 23, 0.9);
  transition: width 0.2s ease;
}

.admin-layout.is-collapsed {
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
  justify-content: flex-start;
  gap: 12px;
  height: var(--app-header-height);
  padding: 0 16px;
  border-bottom: 1px solid var(--app-border);
  white-space: nowrap;

  span {
    display: block;
    margin-top: 2px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.brand-mark {
  display: inline-flex;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--cc-ai-cyan), var(--cc-ai-blue));
  color: #fff;
  font-weight: 700;
}

.brand-text {
  min-width: 0;
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
    border-color: rgba(6, 182, 212, 0.5);
    background: rgba(6, 182, 212, 0.12);
  }
}

.app-layout__header-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 12px;
}

.command-search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 210px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--app-border);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.62);
  color: var(--app-text-muted);
  font-size: 12px;
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.user-trigger {
  gap: 8px;
  padding: 4px 8px;
  border-radius: 999px;

  &:hover {
    background: rgba(6, 182, 212, 0.12);
  }
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
  .admin-layout.is-collapsed .app-layout__aside {
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
