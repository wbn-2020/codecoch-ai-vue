<template>
  <V3FoundationShell
    title="岗位目标"
    eyebrow="Job Targets"
    description="目标岗位 / JD 是 V3 主链路入口。这里先建立列表页骨架、真实 API 封装和后续 CRUD 页入口，不渲染假岗位列表。"
    status-label="V3-C 待完整联调"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="Crosshair"
    state-title="岗位列表业务区待实现"
    state-description="后续 V3-FE-2 将调用 GET /job-targets 展示真实列表、解析状态和当前主目标。"
  />
</template>

<script setup lang="ts">
import { Crosshair } from 'lucide-vue-next'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const apiItems = [
  'GET /job-targets',
  'GET /job-targets/current',
  'POST /job-targets/{id}/set-current',
  'DELETE /job-targets/{id}'
]

const scopeItems = [
  '保留岗位目标列表真实入口',
  '后续展示当前目标标识、解析状态和操作按钮',
  '本阶段不实现完整 CRUD，也不伪造岗位数据'
]

const actions: V3FoundationAction[] = [
  { label: '新建岗位目标', to: '/job-targets/create', type: 'primary' },
  { label: 'V3 驾驶舱', to: '/dashboard/v3' }
]
</script>
