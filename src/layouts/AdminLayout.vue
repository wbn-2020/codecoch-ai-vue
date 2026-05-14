<template>
  <el-container class="app-layout admin-layout" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <el-aside class="app-layout__aside">
      <div class="app-layout__brand">
        <div class="brand-mark">A</div>
        <div v-show="!appStore.sidebarCollapsed" class="brand-text">
          <strong>CodeCoachAI</strong>
          <span>后台管理</span>
        </div>
      </div>
      <AdminSidebar :collapsed="appStore.sidebarCollapsed" />
    </el-aside>

    <el-container>
      <el-header class="app-layout__header">
        <div class="header-left">
          <el-button class="collapse-button" text @click="appStore.toggleSidebar()">
            <el-icon>
              <Expand v-if="appStore.sidebarCollapsed" />
              <Fold v-else />
            </el-icon>
          </el-button>
          <AppBreadcrumb />
        </div>
        <div class="app-layout__header-actions">
          <el-button text @click="router.push('/dashboard')">用户端</el-button>
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
import { Expand, Fold } from '@element-plus/icons-vue'
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBreadcrumb from '@/components/layout/AppBreadcrumb.vue'
import AdminSidebar from '@/components/layout/AdminSidebar.vue'
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
}

.app-layout__aside {
  width: var(--app-sidebar-width);
  overflow-x: hidden;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface);
  transition: width 0.2s ease;
}

.admin-layout.is-collapsed {
  .app-layout__aside {
    width: 64px;
  }
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
  background: #0f766e;
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
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(12px);
}

.header-left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.collapse-button {
  width: 34px;
  height: 34px;
  padding: 0;
  font-size: 18px;
}

.app-layout__header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
}

.app-layout__main {
  padding: 24px;
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
}
</style>
