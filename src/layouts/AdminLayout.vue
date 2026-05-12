<template>
  <el-container class="app-layout admin-layout">
    <el-aside class="app-layout__aside">
      <div class="app-layout__brand">
        <div class="brand-mark">A</div>
        <div>
          <strong>CodeCoachAI</strong>
          <span>后台管理</span>
        </div>
      </div>
      <AdminSidebar />
    </el-aside>

    <el-container>
      <el-header class="app-layout__header">
        <div class="app-layout__header-title">{{ route.meta.title || '管理首页' }}</div>
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

      <el-main class="app-layout__main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AdminSidebar from '@/components/layout/AdminSidebar.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const displayName = computed(
  () => authStore.userInfo?.nickname || authStore.userInfo?.username || '管理员'
)
const avatarText = computed(() => displayName.value.slice(0, 1).toUpperCase())

const handleCommand = async (command: string) => {
  if (command === 'profile') {
    await router.push('/profile')
    return
  }

  if (command === 'logout') {
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
  border-right: 1px solid var(--app-border);
  background: var(--app-surface);
}

.app-layout__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--app-header-height);
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);

  span {
    display: block;
    margin-top: 2px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #0f766e;
  color: #fff;
  font-weight: 700;
}

.app-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--app-header-height);
  border-bottom: 1px solid var(--app-border);
  background: rgb(255 255 255 / 88%);
  backdrop-filter: blur(12px);
}

.app-layout__header-title {
  font-weight: 700;
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

  .app-layout__aside {
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
