<template>
  <PendingIntegrationPanel
    title="面试报告管理"
    eyebrow="Report Management"
    description="报告重试会触发异步 AI 任务，必须等待后端任务接口、权限和重试策略确认。当前隐藏报告重试按钮。"
    :api-items="[
      'GET /admin/interview-reports',
      'GET /admin/interview-reports/{id}',
      'POST /admin/interview-reports/{id}/retry'
    ]"
    :safe-links="[
      { label: 'AI 调用日志', to: '/admin/ai/logs', type: 'primary' },
      { label: '面试历史', to: '/interviews/history' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
