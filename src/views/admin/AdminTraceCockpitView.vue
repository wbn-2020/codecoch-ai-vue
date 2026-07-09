<template>
  <div class="page-shell admin-console-page trace-cockpit-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">V5 Phase 2 / 后端聚合</div>
        <h1 class="admin-hero__title">TraceCockpit</h1>
        <p class="admin-hero__desc">
          优先展示后端聚合的 AI 调用、Agent 运行/任务、异步任务、投递包、面试和报告链路；敏感原文仍保留在受权限与审计保护的原始访问流程中。
        </p>
      </div>
    </section>

    <TraceSearchPanel
      v-model="query"
      :loading="loading"
      @search="handleSearch"
      @reset="handleReset"
    />

    <el-alert
      v-if="errorMessage"
      type="error"
      show-icon
      :closable="false"
      class="trace-cockpit-page__alert"
      :title="errorMessage"
    />

    <TraceSensitiveAccessNotice />

    <el-alert
      v-if="result?.dataSource"
      :type="result.dataSource === 'BACKEND_AGGREGATED' ? 'success' : 'warning'"
      show-icon
      :closable="false"
      class="trace-cockpit-page__alert"
      :title="result.dataSource === 'BACKEND_AGGREGATED' ? '来源：后端聚合结果' : '来源：前端降级汇总'"
      :description="result.fallbackReason"
    />

    <TraceOverviewCards
      :overview="result?.overview"
      :module-statuses="result?.moduleStatuses || []"
      :loading="loading"
    />

    <section class="trace-cockpit-page__main">
      <TraceTimeline
        :nodes="result?.timeline.nodes || []"
        :loading="loading"
        :partial-result="result?.overview.partialResult"
        @select-node="openNode"
        @open-link="openLink"
      />

      <TraceGovernanceSuggestions
        :suggestions="result?.suggestions || []"
        @open-link="openLink"
        @preview="previewSuggestion"
      />
    </section>

    <section v-if="result?.risks.length" class="admin-panel trace-cockpit-page__risks">
      <div class="admin-panel__header">
        <div>
          <h2>风险提示</h2>
          <p>这些风险只来自当前样本，用于辅助排查，不代表系统已经做出自动修复决策。</p>
        </div>
      </div>
      <div class="trace-risk-list">
        <article v-for="risk in result.risks" :key="risk.id" class="trace-risk-list__item">
          <div>
            <strong>{{ risk.title }}</strong>
            <small>{{ risk.type }} / {{ risk.level }}</small>
          </div>
          <p>{{ risk.description }}</p>
          <el-button v-if="risk.link" link type="primary" @click="openLink(risk.link)">打开来源</el-button>
        </article>
      </div>
    </section>

    <TraceNodeDrawer
      v-model="drawerVisible"
      :node="selectedNode"
      @open-link="openLink"
      @closed="selectedNode = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue, type RouteLocationRaw } from 'vue-router'
import {
  buildAdminTraceUrl,
  getTraceCockpitResultApi,
  normalizeTraceQuery
} from '@/api/adminTraceCockpit'
import TraceGovernanceSuggestions from '@/components/admin/trace/TraceGovernanceSuggestions.vue'
import TraceNodeDrawer from '@/components/admin/trace/TraceNodeDrawer.vue'
import TraceOverviewCards from '@/components/admin/trace/TraceOverviewCards.vue'
import TraceSearchPanel from '@/components/admin/trace/TraceSearchPanel.vue'
import TraceSensitiveAccessNotice from '@/components/admin/trace/TraceSensitiveAccessNotice.vue'
import TraceTimeline from '@/components/admin/trace/TraceTimeline.vue'
import type {
  TraceCockpitQuery,
  TraceCockpitResult,
  TraceGovernanceSuggestion,
  TraceLookupType,
  TraceNode
} from '@/types/adminTraceCockpit'

const route = useRoute()
const router = useRouter()

const query = ref<TraceCockpitQuery>({ lookupType: 'auto' })
const result = ref<TraceCockpitResult | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const selectedNode = ref<TraceNode | null>(null)
const drawerVisible = ref(false)

const supportedLookupTypes: TraceLookupType[] = [
  'auto',
  'traceId',
  'requestId',
  'businessId',
  'biz',
  'userTime',
  'agentRunId',
  'asyncTaskId',
  'messageId'
]

const firstQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined) => {
  if (Array.isArray(value)) return value[0] || ''
  return value || ''
}

const numberQueryValue = (value: LocationQueryValue | LocationQueryValue[] | undefined) => {
  const rawValue = firstQueryValue(value)
  if (!rawValue) return undefined
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

const stringQueryValue = (queryValue: LocationQuery, key: keyof TraceCockpitQuery) =>
  String(firstQueryValue(queryValue[key as string]) || '').trim() || undefined

const routeQueryToTraceQuery = (routeQuery: LocationQuery): TraceCockpitQuery => {
  const lookupType = String(firstQueryValue(routeQuery.lookupType) || 'auto') as TraceLookupType
  return normalizeTraceQuery({
    lookupType: supportedLookupTypes.includes(lookupType) ? lookupType : 'auto',
    keyword: stringQueryValue(routeQuery, 'keyword'),
    traceId: stringQueryValue(routeQuery, 'traceId'),
    requestId: stringQueryValue(routeQuery, 'requestId'),
    businessId: stringQueryValue(routeQuery, 'businessId'),
    bizType: stringQueryValue(routeQuery, 'bizType'),
    bizId: stringQueryValue(routeQuery, 'bizId'),
    userId: numberQueryValue(routeQuery.userId),
    agentRunId: numberQueryValue(routeQuery.agentRunId || routeQuery.runId),
    asyncTaskId: numberQueryValue(routeQuery.asyncTaskId || routeQuery.taskId),
    messageId: stringQueryValue(routeQuery, 'messageId'),
    scene: stringQueryValue(routeQuery, 'scene'),
    startTime: stringQueryValue(routeQuery, 'startTime'),
    endTime: stringQueryValue(routeQuery, 'endTime')
  })
}

const hasSearchValue = computed(() => {
  const { lookupType, ...rest } = query.value
  return lookupType !== 'auto' || Object.values(rest).some((value) => value !== undefined && value !== null && String(value).trim() !== '')
})

const runSearch = async (nextQuery: TraceCockpitQuery, replaceUrl = true) => {
  const normalized = normalizeTraceQuery(nextQuery)
  query.value = normalized
  if (!hasSearchValue.value) {
    result.value = null
    errorMessage.value = ''
    return
  }

  if (replaceUrl) {
    await router.replace(buildAdminTraceUrl(normalized))
  }

  loading.value = true
  errorMessage.value = ''
  selectedNode.value = null
  drawerVisible.value = false
  try {
    result.value = await getTraceCockpitResultApi(normalized)
  } catch (error) {
    result.value = null
    errorMessage.value = String((error as Error)?.message || error || '链路查询失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

const handleSearch = (nextQuery: TraceCockpitQuery) => {
  void runSearch(nextQuery)
}

const handleReset = () => {
  query.value = { lookupType: 'auto' }
  result.value = null
  errorMessage.value = ''
  selectedNode.value = null
  drawerVisible.value = false
  void router.replace({ path: '/admin/trace-cockpit', query: {} })
}

const openNode = (node: TraceNode) => {
  selectedNode.value = node
  drawerVisible.value = true
}

const openLink = (to: RouteLocationRaw) => {
  void router.push(to)
}

const previewSuggestion = (suggestion: TraceGovernanceSuggestion) => {
  void ElMessageBox.alert(suggestion.reason, suggestion.title, {
    confirmButtonText: '知道了',
    type: suggestion.riskLevel === 'HIGH' || suggestion.riskLevel === 'MEDIUM' ? 'warning' : 'info'
  })
}

watch(
  () => route.query,
  (routeQuery) => {
    const nextQuery = routeQueryToTraceQuery(routeQuery)
    query.value = nextQuery
    if (Object.keys(routeQuery).length > 0) {
      void runSearch(nextQuery, false)
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
.trace-cockpit-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.trace-cockpit-page__alert {
  margin-top: -4px;
}

.trace-cockpit-page__main {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  gap: 16px;
}

.trace-risk-list {
  display: grid;
  gap: 10px;
}

.trace-risk-list__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 14px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);

  small {
    display: block;
    margin-top: 4px;
    color: var(--el-text-color-secondary);
  }

  p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--el-text-color-regular);
  }
}

@media (max-width: 980px) {
  .trace-cockpit-page__main {
    grid-template-columns: 1fr;
  }
}
</style>
