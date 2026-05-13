<template>
  <main class="error-page">
    <section class="error-card">
      <h1>404</h1>
      <p>你访问的页面不存在，可能路径已调整或尚未进入 V1 当前阶段。</p>
      <el-button type="primary" @click="router.push('/dashboard')">返回工作台</el-button>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
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
    font-size: 56px;
  }

  p {
    margin: 12px 0 24px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}
</style>
