<template>
  <el-tag :type="type" effect="plain">{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status?: string | number | boolean | null
  map?: Record<string, string | { label: string; type?: TagType }>
  toneMap?: Record<string, TagType>
}>()

type TagType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

const statusValue = computed(() =>
  props.status === undefined || props.status === null ? '' : String(props.status)
)

const label = computed(() => {
  const value = statusValue.value
  const mapped = props.map?.[value]
  if (typeof mapped === 'string') return mapped
  if (mapped?.label) return mapped.label
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
    UNKNOWN: '状态待确认',
    TODO: '待处理',
    DOING: '处理中',
    DONE: '已完成',
    SKIPPED: '已跳过',
    EXPIRED: '已过期',
    PENDING: '排队中',
    PROCESSING: '处理中',
    RUNNING: '运行中',
    READY: '已就绪',
    DISABLED: '已禁用',
    ENABLED: '已启用'
  }
  if (value && builtinMap[value]) return builtinMap[value]
  return value ? '状态待确认' : '-'
})

const type = computed(() => {
  const value = statusValue.value
  const mapped = props.map?.[value]
  if (typeof mapped === 'object' && mapped?.type) return mapped.type
  if (props.toneMap?.[value]) return props.toneMap[value]
  if (['1', 'true', 'COMPLETED', 'GENERATED', 'CORRECT', 'MASTERED', 'SUCCESS', 'DONE', 'READY', 'ENABLED'].includes(value)) {
    return 'success'
  }
  if (['FAILED', 'WRONG', 'CANCELED', 'EXPIRED', '0', 'false', 'DISABLED'].includes(value)) {
    return 'danger'
  }
  if (['IN_PROGRESS', 'WAITING_ANSWER', 'AI_EVALUATING', 'REPORT_GENERATING', 'GENERATING', 'PARTIAL_CORRECT', 'VAGUE', 'DOING', 'PROCESSING', 'RUNNING'].includes(value)) {
    return 'warning'
  }
  return 'info'
})
</script>
