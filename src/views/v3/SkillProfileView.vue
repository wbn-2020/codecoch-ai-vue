<template>
  <V3FoundationShell
    title="能力画像"
    eyebrow="Skill Profile"
    description="基于匹配报告生成技能差距画像，为学习计划、题目推荐和模拟面试提供统一输入。"
    status-label="V3-F 待完整联调"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="Radar"
    state-title="能力画像待接入"
    state-description="后续读取 GET /skill-profiles/overview 和 GET /skill-profiles/by-job-target/{targetJobId}，无数据时不渲染空图表。"
  />
</template>

<script setup lang="ts">
import { Radar } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = [
  'POST /skill-profiles/generate',
  'GET /skill-profiles/overview',
  'GET /skill-profiles/by-job-target/{targetJobId}',
  'GET /skill-profiles',
  'POST /skill-profiles/refresh'
]

const scopeItems = [
  '后续展示 radarData、topGaps、nextActions',
  '从真实匹配报告生成画像，不使用演示雷达数据',
  '作为学习计划和题目推荐入口的数据来源'
]

const actions: V3FoundationAction[] = [
  { label: '简历匹配', to: '/resume-match' },
  { label: '生成差距计划', to: '/study-plans/from-gap', type: 'primary' }
]
</script>
