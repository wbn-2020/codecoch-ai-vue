<template>
  <V3FoundationShell
    title="JD 分析"
    eyebrow="JD Analysis"
    description="展示 JD 解析状态、结构化技能要求、职责与面试重点。本阶段只保留真实解析接口说明，不伪造 AI 解析结果。"
    status-label="解析展示待联调"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="ScanSearch"
    state-title="JD 解析结果待接入"
    :state-description="`目标岗位 ID：${route.params.id || '--'}。后续使用 REST 解析与结果查询兜底展示真实结果。`"
  />
</template>

<script setup lang="ts">
import { ScanSearch } from 'lucide-vue-next'
import { useRoute } from 'vue-router'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const route = useRoute()

const apiItems = [
  'POST /job-targets/{id}/parse',
  'GET /job-targets/{id}/analysis',
  'GET /job-targets/{id}'
]

const scopeItems = [
  '后续展示 responsibilities、requiredSkills、bonusSkills 和 interviewFocusPoints',
  '解析失败时展示 parseErrorMessage，不吞掉后端错误',
  'SSE 未确认前不做伪流式输出'
]

const actions: V3FoundationAction[] = [
  { label: '岗位列表', to: '/job-targets' },
  { label: '简历匹配入口', to: '/resume-match', type: 'primary' }
]
</script>
