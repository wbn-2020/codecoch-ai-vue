<template>
  <el-tag :type="type" effect="plain">{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status?: string | number | boolean | null
  map?: Record<string, string>
}>()

const label = computed(() => {
  if (props.map && props.status !== undefined && props.status !== null) {
    return props.map[String(props.status)] || String(props.status)
  }

  if (props.status === 1 || props.status === true) return '启用'
  if (props.status === 0 || props.status === false) return '禁用'
  const builtinMap: Record<string, string> = {
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    WAITING_ANSWER: '等待作答',
    AI_EVALUATING: 'AI 评分中',
    REPORT_GENERATING: '报告生成中',
    COMPLETED: '已完成',
    CANCELED: '已取消',
    FAILED: '失败',
    NOT_GENERATED: '未生成',
    GENERATING: '生成中',
    GENERATED: '已生成',
    SUCCESS: '成功',
    CORRECT: '正确',
    PARTIAL_CORRECT: '部分正确',
    WRONG: '错误',
    MASTERED: '已掌握',
    VAGUE: '模糊',
    UNKNOWN: '未掌握'
  }
  if (props.status !== undefined && props.status !== null && builtinMap[String(props.status)]) {
    return builtinMap[String(props.status)]
  }
  return props.status ? String(props.status) : '-'
})

const type = computed(() => {
  const value = String(props.status)
  if (['1', 'true', 'COMPLETED', 'GENERATED', 'CORRECT', 'MASTERED', 'SUCCESS'].includes(value)) {
    return 'success'
  }
  if (['FAILED', 'WRONG', 'CANCELED', '0', 'false'].includes(value)) {
    return 'danger'
  }
  if (['IN_PROGRESS', 'WAITING_ANSWER', 'AI_EVALUATING', 'REPORT_GENERATING', 'GENERATING', 'PARTIAL_CORRECT', 'VAGUE'].includes(value)) {
    return 'warning'
  }
  return 'info'
})
</script>
