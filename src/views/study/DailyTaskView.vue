<template>
  <PendingIntegrationPanel
    title="每日任务"
    eyebrow="Daily Tasks"
    description="每日任务、打卡和连续学习天数需要与学习计划任务接口确认后再开放。当前不使用前端假数据，也不把接口失败显示为暂无任务。"
    :api-items="[
      'GET /study-plans/{planId}/daily-view',
      'POST /study-tasks/{taskId}/complete',
      'POST /study-tasks/{taskId}/skip',
      'POST /study-checkins'
    ]"
    :safe-links="[
      { label: '学习计划', to: '/study-plans', type: 'primary' },
      { label: '刷题练习', to: '/questions/practice' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
