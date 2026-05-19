<template>
  <V3FoundationShell
    title="简历匹配"
    eyebrow="Resume Job Match"
    description="选择真实简历和目标岗位后发起简历-JD 匹配分析。本阶段只建立匹配入口和后端报告 API 类型。"
    status-label="V3-E 待完整联调"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="GitCompareArrows"
    state-title="匹配分析表单待实现"
    state-description="后续页面必须从真实简历列表和 GET /job-targets/current 取数后再发起 POST /resume-job-match/reports。"
  />
</template>

<script setup lang="ts">
import { GitCompareArrows } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = [
  'POST /resume-job-match/reports',
  'GET /resume-job-match/reports',
  'GET /resume-job-match/latest',
  'GET /job-targets/current'
]

const scopeItems = [
  '后续只能基于真实简历和目标岗位发起分析',
  '报告生成失败展示后端 errorMessage',
  '本阶段不显示伪匹配分数'
]

const actions: V3FoundationAction[] = [
  { label: '岗位目标', to: '/job-targets' },
  { label: '能力画像', to: '/skill-profile', type: 'primary' }
]
</script>
