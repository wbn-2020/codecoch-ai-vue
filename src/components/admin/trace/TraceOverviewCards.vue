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
          <h2>Module status</h2>
          <p>Failed modules are shown as partial result. Their counts stay unavailable instead of being treated as zero.</p>
        </div>
        <el-tag :type="overview?.partialResult ? 'warning' : 'success'" effect="plain">
          {{ overview?.partialResult ? 'partial result' : 'complete' }}
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
  { key: 'sample', label: 'Samples', value: displayNumber(props.overview?.sampleCount), hint: 'Aggregated safe nodes' },
  { key: 'trace', label: 'Traces', value: displayNumber(props.overview?.traceIds?.length), hint: 'Multiple traces are not forced into one' },
  { key: 'ai', label: 'AI calls', value: displayNumber(props.overview?.aiCallCount), hint: 'From existing AI logs' },
  { key: 'agent', label: 'Agent runs', value: displayNumber(props.overview?.agentRunCount), hint: 'From existing Agent Run API' },
  { key: 'weekPlan', label: 'Week plans', value: displayNumber(props.overview?.agentWeekPlanCount), hint: 'Persisted coach plans' },
  { key: 'weekPlanItem', label: 'Plan items', value: displayNumber(props.overview?.agentWeekPlanItemCount), hint: 'Traceable plan actions' },
  { key: 'task', label: 'Async tasks', value: displayNumber(props.overview?.asyncTaskCount), hint: 'By trace, message, or biz pair' },
  { key: 'voice', label: 'Voice inputs', value: displayNumber(props.overview?.interviewVoiceCount), hint: 'Interview voice submissions' },
  { key: 'failed', label: 'Failures', value: displayNumber(props.overview?.failedCount), hint: props.overview?.partialResult ? 'Partial result; not full sample' : 'Failed node count' },
  { key: 'fallback', label: 'Fallback', value: displayNumber(props.overview?.fallbackCount), hint: 'Observed fallback samples' },
  { key: 'latency', label: 'Max latency', value: displayNumber(props.overview?.maxElapsedMs, props.overview?.maxElapsedMs == null ? '' : ' ms'), hint: 'Only from available modules' },
  { key: 'tokens', label: 'Tokens', value: displayNumber(props.overview?.totalTokens), hint: 'Summed from visible metadata' },
  { key: 'sensitive', label: 'Sensitive source', value: props.overview?.rawFieldsAvailable ? 'available' : props.loading ? '--' : 'not recorded', hint: 'Availability and permission only' }
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
  return `${item.count} records`
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
