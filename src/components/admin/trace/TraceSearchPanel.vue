<template>
  <section class="admin-panel trace-search-panel">
    <div class="admin-panel__header">
      <div>
        <h2>链路查询</h2>
        <p>可使用 trace、request、业务键、Agent Run、异步任务、message、场景或时间线索；查询条件会同步到 URL。</p>
      </div>
      <el-tag v-if="ambiguousKeyword" type="warning" effect="plain">线索可能歧义</el-tag>
    </div>

    <el-form :model="form" label-position="top">
      <div class="trace-search-panel__grid">
        <el-form-item label="查询类型">
          <el-select v-model="form.lookupType">
            <el-option v-for="item in lookupOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model.trim="form.keyword" clearable placeholder="traceId / requestId / messageId / 业务线索" @keyup.enter="search" />
        </el-form-item>
        <el-form-item label="traceId">
          <el-input v-model.trim="form.traceId" clearable />
        </el-form-item>
        <el-form-item label="requestId">
          <el-input v-model.trim="form.requestId" clearable />
        </el-form-item>
        <el-form-item label="businessId">
          <el-input v-model.trim="form.businessId" clearable />
        </el-form-item>
        <el-form-item label="bizType">
          <el-input v-model.trim="form.bizType" clearable placeholder="按业务任务查询时需要同时填写 bizId" />
        </el-form-item>
        <el-form-item label="bizId">
          <el-input v-model.trim="form.bizId" clearable />
        </el-form-item>
        <el-form-item label="userId">
          <el-input-number v-model="form.userId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="agentRunId">
          <el-input-number v-model="form.agentRunId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="asyncTaskId">
          <el-input-number v-model="form.asyncTaskId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="messageId">
          <el-input v-model.trim="form.messageId" clearable />
        </el-form-item>
        <el-form-item label="scene">
          <el-input v-model.trim="form.scene" clearable />
        </el-form-item>
        <el-form-item label="startTime">
          <el-date-picker v-model="form.startTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
        </el-form-item>
        <el-form-item label="endTime">
          <el-date-picker v-model="form.endTime" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
        </el-form-item>
      </div>

      <el-alert
        v-if="ambiguousKeyword"
        class="trace-search-panel__alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前关键词是数字，可能匹配多种 ID；需要精确排查时请指定查询类型。"
      />

      <div class="trace-search-panel__actions">
        <el-button type="primary" :loading="loading" @click="search">查询链路</el-button>
        <el-button :disabled="loading" @click="reset">重置</el-button>
      </div>
    </el-form>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { TraceCockpitQuery, TraceLookupType } from '@/types/adminTraceCockpit'

const props = withDefaults(defineProps<{
  modelValue: TraceCockpitQuery
  loading?: boolean
}>(), {
  loading: false
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: TraceCockpitQuery): void
  (event: 'search', value: TraceCockpitQuery): void
  (event: 'reset'): void
}>()

const lookupOptions: Array<{ label: string; value: TraceLookupType }> = [
  { label: '自动识别', value: 'auto' },
  { label: 'traceId', value: 'traceId' },
  { label: 'requestId', value: 'requestId' },
  { label: 'businessId', value: 'businessId' },
  { label: 'bizType + bizId', value: 'biz' },
  { label: 'userId + 时间', value: 'userTime' },
  { label: 'agentRunId', value: 'agentRunId' },
  { label: 'asyncTaskId', value: 'asyncTaskId' },
  { label: 'messageId', value: 'messageId' }
]

const form = reactive<TraceCockpitQuery>({ lookupType: 'auto' })

const isFilled = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== ''

const compactQuery = (value: TraceCockpitQuery) => {
  const next: TraceCockpitQuery = {}
  Object.entries(value).forEach(([key, rawValue]) => {
    if (isFilled(rawValue)) {
      next[key as keyof TraceCockpitQuery] = rawValue as never
    }
  })
  return next
}

const assignForm = (value: TraceCockpitQuery) => {
  Object.keys(form).forEach((key) => delete form[key as keyof TraceCockpitQuery])
  Object.assign(form, { lookupType: 'auto' }, value)
}

const withKeyword = (value: TraceCockpitQuery) => {
  const keyword = value.keyword?.trim()
  if (!keyword || !value.lookupType || value.lookupType === 'auto') return value
  if (value.lookupType === 'biz') return { ...value, bizId: value.bizId || keyword }
  if (value.lookupType === 'userTime') return { ...value, userId: value.userId || Number(keyword) || undefined }
  return { ...value, [value.lookupType]: value[value.lookupType as keyof TraceCockpitQuery] || keyword }
}

const search = () => {
  const query = compactQuery(withKeyword({ ...form }))
  emit('update:modelValue', query)
  emit('search', query)
}

const reset = () => {
  const next: TraceCockpitQuery = { lookupType: 'auto' }
  assignForm(next)
  emit('update:modelValue', next)
  emit('reset')
}

const ambiguousKeyword = computed(() => form.lookupType === 'auto' && /^\d+$/.test(String(form.keyword || '').trim()))

watch(
  () => props.modelValue,
  (value) => assignForm(value || { lookupType: 'auto' }),
  { immediate: true, deep: true }
)
</script>

<style scoped lang="scss">
.trace-search-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 2px 14px;

  :deep(.el-date-editor),
  :deep(.el-input-number),
  :deep(.el-select) {
    width: 100%;
  }
}

.trace-search-panel__alert {
  margin-top: 10px;
}

.trace-search-panel__actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
</style>
