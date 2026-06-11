<template>
  <el-tag :type="tagType" effect="plain">{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { TargetJobParseStatus } from '@/types/jobTarget'

const props = defineProps<{
  status?: TargetJobParseStatus | number | null
}>()

const label = computed(() => {
  const map: Record<string, string> = {
    NOT_PARSED: '未解析',
    PARSING: '解析中',
    PARSED: '已解析',
    FAILED: '解析失败',
    1: '启用',
    0: '停用'
  }
  if (props.status === undefined || props.status === null || props.status === '') return '--'
  return map[String(props.status)] || '状态待确认'
})

const tagType = computed(() => {
  const value = String(props.status || '')
  if (value === 'PARSED' || value === '1') return 'success'
  if (value === 'FAILED' || value === '0') return 'danger'
  if (value === 'PARSING') return 'warning'
  return 'info'
})
</script>
