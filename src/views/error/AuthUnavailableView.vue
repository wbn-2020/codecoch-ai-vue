<template>
  <main class="error-page">
    <section class="error-card">
      <h1>认证服务暂不可用</h1>
      <p>当前无法确认账号状态，请稍后重试。</p>
      <div class="actions">
        <el-button type="primary" @click="retry">重试</el-button>
        <el-button @click="router.push('/login')">重新登录</el-button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const retry = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
  router.replace(redirect)
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
  width: min(100%, 460px);
  padding: 36px;
  text-align: center;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface);
  box-shadow: var(--app-shadow);

  h1 {
    margin: 0;
    color: var(--app-primary);
    font-size: 32px;
  }

  p {
    margin: 14px 0 24px;
    color: var(--app-text-muted);
  }
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
