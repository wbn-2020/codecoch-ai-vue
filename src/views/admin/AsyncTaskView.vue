<template>
  <PendingIntegrationPanel
    title="异步任务管理"
    eyebrow="Async Task Management"
    description="异步任务列表、重试、取消和死信处理需要以后端任务中心真实接口为准。当前隐藏重试和取消操作，避免误触耗时任务或 AI 成本。"
    :api-items="[
      'GET /admin/tasks',
      'GET /admin/tasks/{id}',
      'POST /admin/tasks/{id}/retry',
      'POST /admin/tasks/{id}/cancel'
    ]"
    :safe-links="[
      { label: '管理首页', to: '/admin', type: 'primary' },
      { label: 'AI 调用日志', to: '/admin/ai/logs' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
