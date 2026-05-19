<template>
  <V3FoundationShell
    title="差距学习计划"
    eyebrow="Gap Driven Plan"
    description="从能力画像或匹配报告短板生成学习计划，复用现有 V2 学习计划列表和任务状态能力。"
    status-label="生成闭环待实现"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="Route"
    state-title="差距生成表单待接入"
    state-description="后续必须先读取真实 profileId 和 gapItemIds，再调用 generate-from-gap；本页不制造短板选项。"
  />
</template>

<script setup lang="ts">
import { Route } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = [
  'POST /study-plans/generate-from-gap',
  'POST /study-plans/generate-from-match-report',
  'GET /study-plans/source-types',
  'GET /study-plans/{id}/skill-relations'
]

const scopeItems = [
  '后续提供差距选择、周期、每日时长和生成结果',
  '生成后跳转现有 /study-plans 真实学习计划页',
  '本阶段不绕过已有学习计划接口'
]

const actions: V3FoundationAction[] = [
  { label: '现有学习计划', to: '/study-plans' },
  { label: '题目推荐', to: '/questions/recommendations', type: 'primary' }
]
</script>
