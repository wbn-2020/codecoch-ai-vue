<template>
  <V3FoundationShell
    title="匹配报告详情"
    eyebrow="Match Report"
    description="展示匹配分数、优势、短板、风险和优化建议。本阶段只保留报告详情路由，不渲染示例报告。"
    status-label="报告展示待实现"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="FileChartColumn"
    state-title="报告详情待接入"
    :state-description="`报告 ID：${route.params.id || '--'}。后续调用 GET /resume-job-match/reports/{id} 展示真实报告。`"
  />
</template>

<script setup lang="ts">
import { FileChartColumn } from 'lucide-vue-next'
import { useRoute } from 'vue-router'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const route = useRoute()

const apiItems = [
  'GET /resume-job-match/reports/{id}',
  'POST /resume-job-match/reports/{id}/regenerate',
  'POST /study-plans/generate-from-match-report'
]

const scopeItems = [
  '后续展示 overallScore、分项评分、gaps、strengths 和 suggestions',
  '空字段显示 -- 或明确空状态',
  '学习计划入口只在真实报告存在时启用'
]

const actions: V3FoundationAction[] = [
  { label: '返回匹配入口', to: '/resume-match' },
  { label: '差距学习计划', to: '/study-plans/from-gap', type: 'primary' }
]
</script>
