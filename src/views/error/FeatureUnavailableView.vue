<template>
  <div class="feature-unavailable-page">
    <AppState
      type="disabled"
      title="该能力暂未开放"
      :description="description"
    >
      <div class="feature-actions">
        <el-button type="primary" @click="router.push('/agent/today')">回到今日任务</el-button>
        <el-button @click="router.push('/dashboard')">回到工作台</el-button>
      </div>
    </AppState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppState from '@/components/common/AppState.vue'

const route = useRoute()
const router = useRouter()

const description = computed(() => {
  const title = typeof route.query.title === 'string' ? route.query.title : ''
  return title
    ? `${title} 仍处于内测或灰度阶段，正式开放后会出现在导航中。`
    : '该功能仍处于内测或灰度阶段，正式开放后会出现在导航中。'
})
</script>

<style scoped lang="scss">
.feature-unavailable-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--app-bg);
}

.feature-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}
</style>
