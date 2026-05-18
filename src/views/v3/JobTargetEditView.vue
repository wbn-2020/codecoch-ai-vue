<template>
  <V3FoundationShell
    :title="pageTitle"
    eyebrow="Job Target Form"
    description="用于创建或编辑目标岗位、公司、级别和 JD 原文。本阶段只提供页面壳与真实保存接口说明。"
    status-label="表单待实现"
    :api-items="apiItems"
    :scope-items="scopeItems"
    :actions="actions"
    :icon="FilePenLine"
    state-title="岗位表单待接入"
    :state-description="stateDescription"
  />
</template>

<script setup lang="ts">
import { FilePenLine } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import V3FoundationShell from './components/V3FoundationShell.vue'
import type { V3FoundationAction } from './foundation'

const route = useRoute()
const isEdit = computed(() => Boolean(route.params.id))
const pageTitle = computed(() => (isEdit.value ? '编辑岗位目标' : '创建岗位目标'))
const stateDescription = computed(() =>
  isEdit.value
    ? `后续将读取 GET /job-targets/${route.params.id} 并提交 PUT /job-targets/${route.params.id}。`
    : '后续将通过 POST /job-targets 保存真实岗位目标和 JD 原文。'
)

const apiItems = ['POST /job-targets', 'GET /job-targets/{id}', 'PUT /job-targets/{id}']

const scopeItems = [
  '保留岗位基础字段和 JD 原文的表单承载位',
  '后续补充表单校验、保存后跳转和错误状态',
  '本阶段不提交任何默认 JD 或示例岗位'
]

const actions: V3FoundationAction[] = [
  { label: '返回岗位列表', to: '/job-targets' },
  { label: 'V3 驾驶舱', to: '/dashboard/v3', type: 'primary' }
]
</script>
