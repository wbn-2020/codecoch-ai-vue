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
        <div>
          <span>处理结果</span>
          <small>当前操作未执行。如需开通访问范围，请联系管理员处理。</small>
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

const targetPath = computed(() => String(route.query.target || ''))
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
