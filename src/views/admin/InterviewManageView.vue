<template>
  <PendingIntegrationPanel
    title="面试记录管理"
    eyebrow="Interview Management"
    description="管理员查看全量面试记录需要后端提供跨用户分页、权限隔离和字段脱敏。当前仅保留规划入口，不展示未联调列表。"
    :api-items="[
      'GET /admin/interviews',
      'GET /admin/interviews/{id}',
      'GET /admin/interview-reports'
    ]"
    :safe-links="[
      { label: '面试历史', to: '/interviews/history', type: 'primary' },
      { label: '管理首页', to: '/admin' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
