<template>
  <PendingIntegrationPanel
    title="系统通知管理"
    eyebrow="Notification Management"
    description="公告发布、通知广播和下线删除属于管理端危险操作。当前仅保留入口说明，待公告与通知后端接口边界确认后再开放表单和操作按钮。"
    :api-items="[
      'GET /admin/announcements',
      'POST /admin/announcements',
      'PUT /admin/announcements/{id}',
      'POST /admin/announcements/{id}/publish',
      'POST /admin/announcements/{id}/offline',
      'POST /admin/notifications/broadcast'
    ]"
    :safe-links="[
      { label: '管理首页', to: '/admin', type: 'primary' },
      { label: '操作日志', to: '/admin/operation-logs' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
