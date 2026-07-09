<template>
  <section class="trace-overview">
    <div class="trace-overview__cards">
      <article v-for="item in cards" :key="item.key" class="admin-insight-card trace-overview__card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.hint }}</small>
      </article>
    </div>

    <div class="trace-overview__modules admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>模块状态</h2>
          <p>失败模块会显示为部分结果，计数保持不可用，不会被当作 0 误导判断。</p>
        </div>
        <el-tag :type="overview?.partialResult ? 'warning' : 'success'" effect="plain">
          {{ overview?.partialResult ? '部分结果' : '完整结果' }}
        </el-tag>
      </div>
      <div class="trace-overview__module-grid">
        <article v-for="item in displayedModuleStatuses" :key="item.module" class="trace-overview__module">
          <div>
            <strong>{{ item.moduleName || item.module }}</strong>
            <small>{{ item.module }}</small>
          </div>
          <el-tag :type="moduleTagType(item.status)" effect="plain">{{ item.status }}</el-tag>
          <span class="trace-overview__module-count">{{ displayModuleCount(item) }}</span>
          <p v-if="item.message || item.errorMessage">{{ item.message || item.errorMessage }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TraceCockpitOverview, TraceModuleStatus } from '@/types/adminTraceCockpit'

const props = defineProps<{
  overview?: TraceCockpitOverview | null
  moduleStatuses?: TraceModuleStatus[]
  loading?: boolean
}>()

const displayNumber = (value: number | string | null | undefined, unit = '') => {
  if (props.loading) return '--'
  if (value === undefined || value === null || value === '') return '--'
  return `${value}${unit}`
}

const cards = computed(() => [
  { key: 'sample', label: '样本节点', value: displayNumber(props.overview?.sampleCount), hint: '后端聚合后的安全节点' },
  { key: 'trace', label: 'Trace 数', value: displayNumber(props.overview?.traceIds?.length), hint: '不会强行合并多个 trace' },
  { key: 'ai', label: 'AI 调用', value: displayNumber(props.overview?.aiCallCount), hint: '来自已有 AI 日志' },
  { key: 'agent', label: 'Agent 运行', value: displayNumber(props.overview?.agentRunCount), hint: '来自现有 Agent Run 接口' },
  { key: 'weekPlan', label: '周计划', value: displayNumber(props.overview?.agentWeekPlanCount), hint: '已持久化的教练计划' },
  { key: 'weekPlanItem', label: '计划项', value: displayNumber(props.overview?.agentWeekPlanItemCount), hint: '可追踪的计划动作' },
  { key: 'task', label: '异步任务', value: displayNumber(props.overview?.asyncTaskCount), hint: '按 trace、message 或业务键关联' },
  { key: 'voice', label: '语音输入', value: displayNumber(props.overview?.interviewVoiceCount), hint: '面试语音提交记录' },
  { key: 'failed', label: '失败节点', value: displayNumber(props.overview?.failedCount), hint: props.overview?.partialResult ? '当前是部分结果，不代表完整样本' : '失败节点计数' },
  { key: 'fallback', label: '降级样本', value: displayNumber(props.overview?.fallbackCount), hint: '观察到的 fallback 样本' },
  { key: 'latency', label: '最大耗时', value: displayNumber(props.overview?.maxElapsedMs, props.overview?.maxElapsedMs == null ? '' : ' ms'), hint: '仅来自可用模块' },
  { key: 'tokens', label: 'Token 数', value: displayNumber(props.overview?.totalTokens), hint: '由可见元数据汇总' },
  { key: 'sensitive', label: '敏感原文', value: props.overview?.rawFieldsAvailable ? '可申请查看' : props.loading ? '--' : '未记录', hint: '这里只显示可用性和权限提示' }
])

const displayedModuleStatuses = computed(() => props.moduleStatuses || props.overview?.moduleStatuses || [])

const moduleTagType = (status?: string) => {
  if (status === 'LOADED') return 'success'
  if (status === 'EMPTY' || status === 'SKIPPED') return 'info'
  if (status === 'FAILED') return 'danger'
  return 'warning'
}

const displayModuleCount = (item: TraceModuleStatus) => {
  if (item.status === 'FAILED') return '--'
  if (item.count === undefined || item.count === null) return '--'
  return `${item.count} 条记录`
}
</script>

<style scoped lang="scss">
.trace-overview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-overview__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.trace-overview__card strong {
  font-size: 24px;
}

.trace-overview__module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.trace-overview__module {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.trace-overview__module small,
.trace-overview__module p {
  color: var(--el-text-color-secondary);
}

.trace-overview__module p {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 12px;
}

.trace-overview__module-count {
  grid-column: 1 / -1;
  font-weight: 700;
}
</style>
