<template>
  <PendingIntegrationPanel
    title="项目经历管理"
    eyebrow="Project Experience"
    description="项目经历目前属于简历子资源。独立项目库需要新的后端契约确认，当前入口只说明规划，不提供孤立 CRUD。"
    :api-items="[
      'POST /resumes/{resumeId}/projects',
      'PUT /resumes/{resumeId}/projects/{projectId}',
      'DELETE /resumes/{resumeId}/projects/{projectId}'
    ]"
    :safe-links="[
      { label: '简历列表', to: '/resumes', type: 'primary' },
      { label: '新建简历', to: '/resumes/create' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
