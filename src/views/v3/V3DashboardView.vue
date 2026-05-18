<template>
  <V3FoundationShell
    title="V3 求职驾驶舱"
    eyebrow="V3 Dashboard"
    description="聚合当前目标岗位、简历匹配、能力画像、学习计划和题目推荐的 V3 总入口。本阶段只建立路由和入口，等待后端 V3 聚合接口接入。"
    status-label="待后端聚合接口"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="LayoutDashboard"
    state-title="驾驶舱数据待接入"
    state-description="文档规划为 GET /dashboard/v3/overview，当前后端只确认 GET /dashboard/overview，本页不使用模拟指标。"
  />
</template>

<script setup lang="ts">
import { LayoutDashboard } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = ['规划接口：GET /dashboard/v3/overview', '当前可用：GET /dashboard/overview']

const scopeItems = [
  '展示 V3 求职闭环入口，不拼接假概览数据',
  '后续接入当前目标、匹配度、能力雷达和下一步行动',
  '无数据时引导到真实岗位目标创建入口'
]

const actions: V3FoundationAction[] = [
  { label: '创建岗位目标', to: '/job-targets/create', type: 'primary' },
  { label: '查看岗位目标', to: '/job-targets' }
]
</script>
