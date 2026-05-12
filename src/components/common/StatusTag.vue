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
  return props.status ? String(props.status) : '-'
})

const type = computed(() => {
  const value = String(props.status)
  if (['1', 'true', 'COMPLETED', 'GENERATED', 'CORRECT', 'MASTERED', 'SUCCESS'].includes(value)) {
    return 'success'
  }
  if (['FAILED', 'WRONG', '0', 'false'].includes(value)) {
    return 'danger'
  }
  if (['IN_PROGRESS', 'GENERATING', 'PARTIAL_CORRECT', 'VAGUE'].includes(value)) {
    return 'warning'
  }
  return 'info'
})
</script>
