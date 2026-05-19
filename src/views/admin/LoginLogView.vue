<template>
  <PendingIntegrationPanel
    title="登录日志"
    eyebrow="Login Audit"
    description="登录日志查询参数和返回字段需与后端审计模型确认。当前仅保留入口，避免接口字段未对齐时展示误导性空数据。"
    :api-items="[
      'GET /admin/login-logs',
      'GET /admin/logs/logins'
    ]"
    :safe-links="[
      { label: '用户管理', to: '/admin/users', type: 'primary' },
      { label: '管理首页', to: '/admin' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
