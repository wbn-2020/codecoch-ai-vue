<template>
  <main class="error-page">
    <section class="error-card">
      <h1>403</h1>
      <p>{{ reasonText }}</p>

      <div class="permission-detail">
        <div v-if="targetPath">
          <span>目标页面</span>
          <strong>{{ targetPath }}</strong>
        </div>
        <div v-if="requiredPermissions.length">
          <span>需要权限</span>
          <el-tag v-for="item in requiredPermissions" :key="item" type="warning" effect="plain">{{ item }}</el-tag>
        </div>
        <div v-if="requiredRoles.length">
          <span>需要角色</span>
          <el-tag v-for="item in requiredRoles" :key="item" type="warning" effect="plain">{{ item }}</el-tag>
        </div>
        <div v-if="userRoles.length">
          <span>当前角色</span>
          <el-tag v-for="item in userRoles" :key="item" effect="plain">{{ item }}</el-tag>
        </div>
        <div v-if="userPermissions.length">
          <span>当前权限</span>
          <small>{{ userPermissions.join('、') }}</small>
        </div>
        <div v-if="apiMessage">
          <span>接口提示</span>
          <small>{{ apiMessage }}</small>
        </div>
      </div>

      <div class="error-actions">
        <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
        <el-button v-if="authStore.canAccessAdmin" @click="router.push('/admin')">管理首页</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const splitQuery = (value: unknown) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)

const targetPath = computed(() => String(route.query.target || ''))
const apiMessage = computed(() => String(route.query.message || ''))
const requiredPermissions = computed(() => splitQuery(route.query.requiredPermissions))
const requiredRoles = computed(() => splitQuery(route.query.requiredRoles))
const userRoles = computed(() => splitQuery(route.query.userRoles).length ? splitQuery(route.query.userRoles) : authStore.roles)
const userPermissions = computed(() => {
  const permissions = splitQuery(route.query.userPermissions)
  return permissions.length ? permissions : authStore.permissions.slice(0, 20)
})
const reasonText = computed(() => {
  const reason = String(route.query.reason || '')
  if (reason === 'requiresAdmin') return '当前账号没有管理端访问角色。'
  if (reason === 'noAdminMenu') return '当前账号没有任何可进入的管理菜单。'
  if (reason === 'missingRole') return '当前账号缺少访问该页面所需角色。'
  if (reason === 'missingPermission') return '当前账号缺少访问该页面所需权限。'
  if (reason === 'apiForbidden') return '接口返回无权限，当前操作未执行。'
  return '当前账号没有访问该页面的权限。'
})
</script>

<style scoped lang="scss">
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.error-card {
  width: min(100%, 720px);
  padding: 36px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);

  h1 {
    margin: 0;
    color: var(--app-primary);
    font-size: 56px;
  }

  p {
    margin: 12px 0 24px;
    color: var(--app-text-muted);
    text-align: center;
  }
}

.permission-detail {
  display: grid;
  gap: 12px;
  margin: 0 0 24px;
  text-align: left;

  div {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.34);
    padding: 12px;
    flex-wrap: wrap;
  }

  span {
    min-width: 72px;
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong,
  small {
    min-width: 0;
    color: var(--app-text);
    overflow-wrap: anywhere;
  }
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
</style>
