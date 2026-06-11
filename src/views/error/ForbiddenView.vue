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
          <strong>{{ requiredPermissions.join('、') }}</strong>
        </div>
        <div v-if="missingPermissions.length">
          <span>缺少权限</span>
          <strong>{{ missingPermissions.join('、') }}</strong>
        </div>
        <div v-if="requiredRoles.length">
          <span>需要角色</span>
          <strong>{{ requiredRoles.join('、') }}</strong>
        </div>
        <div v-if="missingRoles.length">
          <span>缺少角色</span>
          <strong>{{ missingRoles.join('、') }}</strong>
        </div>
        <div v-if="userRoles.length || userPermissions.length">
          <span>当前账号</span>
          <small>
            角色：{{ userRoles.length ? userRoles.join('、') : '角色待确认' }}；
            权限：{{ userPermissions.length ? userPermissions.join('、') : '权限待确认' }}
          </small>
        </div>
        <div>
          <span>处理结果</span>
          <small>{{ resolutionText }}</small>
        </div>
      </div>

      <div class="error-actions">
        <el-button type="primary" @click="router.push('/dashboard')">返回今日计划</el-button>
        <el-button v-if="authStore.canAccessAdmin" @click="router.push('/admin')">管理首页</el-button>
        <el-button v-else-if="isAdminAccessFailure" type="warning" plain @click="reloginAsAdmin">
          重新登录管理员账号
        </el-button>
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

const targetPath = computed(() => String(route.query.target || ''))
const queryList = (name: string) => {
  const value = route.query[name]
  const raw = Array.isArray(value) ? value.join(',') : String(value || '')
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const requiredPermissions = computed(() => queryList('requiredPermissions'))
const requiredRoles = computed(() => queryList('requiredRoles'))
const userPermissions = computed(() => queryList('userPermissions'))
const userRoles = computed(() => queryList('userRoles'))
const missingPermissions = computed(() =>
  requiredPermissions.value.filter((permission) => !userPermissions.value.includes(permission))
)
const missingRoles = computed(() =>
  requiredRoles.value.filter((role) => !userRoles.value.includes(role))
)
const isAdminAccessFailure = computed(() =>
  String(route.query.reason || '') === 'requiresAdmin' || targetPath.value.startsWith('/admin')
)

const reasonText = computed(() => {
  const reason = String(route.query.reason || '')
  if (reason === 'requiresAdmin') return '当前账号没有管理端访问角色。'
  if (reason === 'noAdminMenu') return '当前账号没有任何可进入的管理菜单。'
  if (reason === 'missingRole') return '当前账号缺少访问该页面所需角色。'
  if (reason === 'missingPermission') return '当前账号缺少访问该页面所需权限。'
  if (reason === 'apiForbidden') return '当前账号无权执行该操作，已停止本次提交。'
  if (reason === 'featureDisabled') return '该功能当前未开放，已停止本次访问。'
  return '当前账号没有访问该页面的权限。'
})

const resolutionText = computed(() => {
  if (isAdminAccessFailure.value && !authStore.canAccessAdmin) {
    return '当前操作未执行。如果刚切换过普通用户，请重新登录管理员账号后继续访问。'
  }
  if (missingPermissions.value.length || missingRoles.value.length) {
    return '当前操作未执行。请联系管理员补充分配缺少的角色或权限后重试。'
  }
  return '当前操作未执行。如需开通访问范围，请联系管理员处理。'
})

const reloginAsAdmin = () => {
  const redirect = targetPath.value && targetPath.value.startsWith('/admin') ? targetPath.value : '/admin'
  authStore.clearAuth()
  router.push({ path: '/login', query: { redirect } })
}
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
