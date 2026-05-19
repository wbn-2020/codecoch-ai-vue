<template>
  <PendingIntegrationPanel
    title="薄弱知识点分析"
    eyebrow="Weakness Analysis"
    description="薄弱点分析需要统一错题、练习和面试报告数据结构。当前隐藏图表，避免接口字段未对齐时留下空白图。"
    :api-items="[
      'GET /questions/weakness-analysis',
      'GET /skill-profiles/overview',
      'GET /skill-profiles/by-job-target/{jobTargetId}'
    ]"
    :safe-links="[
      { label: '错题本', to: '/questions/wrong-records', type: 'primary' },
      { label: '能力画像', to: '/skill-profile' }
    ]"
  />
</template>

<script setup lang="ts">
import PendingIntegrationPanel from '@/components/common/PendingIntegrationPanel.vue'
</script>
