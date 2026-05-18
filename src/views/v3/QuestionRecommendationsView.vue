<template>
  <V3FoundationShell
    title="推荐题目"
    eyebrow="Question Recommendations"
    description="按能力短板、匹配报告或学习计划生成推荐题目批次。页面路由保留文档规划入口，API 封装以后端真实批次接口为准。"
    status-label="推荐批次待展示"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="ListChecks"
    state-title="题目推荐列表待接入"
    state-description="文档规划的 /questions/recommendations/by-* 未在后端确认；当前真实接口为 /question-recommendations/**。"
  />
</template>

<script setup lang="ts">
import { ListChecks } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = [
  'POST /question-recommendations/generate-from-gap',
  'POST /question-recommendations/generate-from-match-report',
  'POST /question-recommendations/generate-from-study-plan',
  'GET /question-recommendations/batches',
  'GET /question-recommendations/batches/{batchId}/items'
]

const scopeItems = [
  '后续只展示真实推荐批次和真实题目 ID',
  '点击题目时跳转现有 /questions/:id 详情',
  '不伪造推荐原因或题目内容'
]

const actions: V3FoundationAction[] = [
  { label: '题库', to: '/questions' },
  { label: '目标岗位面试', to: { path: '/interviews/create', query: { source: 'job-target' } }, type: 'primary' }
]
</script>
