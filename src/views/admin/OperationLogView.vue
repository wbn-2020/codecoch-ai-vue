<template>
  <PendingIntegrationPanel
    title="操作日志"
    eyebrow="Operation Audit"
    description="操作日志字段、筛选参数和审计范围需以后端真实日志模型为准。当前页面不展示空表格，避免把字段错配误判为无日志。"
    :api-items="[
      'GET /admin/operation-logs',
      'GET /admin/logs/operations'
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
