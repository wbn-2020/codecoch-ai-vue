<template>
  <PendingIntegrationPanel
    title="AI 模型配置"
    eyebrow="AI Model Configuration"
    description="模型供应商、API Key、默认模型和备用模型属于高风险运行配置。当前前端仅保留规划入口，待后端管理接口和敏感字段策略确认后再开放编辑。"
    :api-items="[
      'GET /admin/ai/models',
      'POST /admin/ai/models',
      'PUT /admin/ai/models/{id}',
      'PUT /admin/ai/models/{id}/status',
      'DELETE /admin/ai/models/{id}'
    ]"
    :safe-links="[
      { label: 'Prompt 模板', to: '/admin/ai/prompts', type: 'primary' },
      { label: 'AI 调用日志', to: '/admin/ai/logs' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
