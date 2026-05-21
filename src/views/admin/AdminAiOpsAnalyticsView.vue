<template>
  <div class="page-shell admin-console-page ai-ops-page">
    <section class="admin-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <Bot :size="16" />
          <span>AI Ops Analytics</span>
        </div>
        <h1 class="admin-hero__title">AI Ops 基础看板</h1>
        <p class="admin-hero__desc">聚合 AI 调用成功率、耗时、Token 使用量和失败原因，支撑 V4 的 Agent 可观测能力。</p>
      </div>
      <div class="admin-hero__actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="AI Ops 数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <div class="admin-insight-grid" v-loading="loading">
        <article v-for="item in metrics" :key="item.key" class="admin-insight-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </div>

      <div class="admin-dashboard-grid ai-ops-grid">
        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>调用结构</h2>
              <p>成功与失败调用占比。</p>
            </div>
            <el-tag type="success" effect="plain">ai_call_log</el-tag>
          </div>
          <div ref="successChartRef" class="analytics-chart"></div>
        </section>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <div>
              <h2>失败原因 Top</h2>
              <p>按错误消息前缀聚合，便于定位 Prompt、模型或网络问题。</p>
            </div>
          </div>
          <div class="failure-list">
            <div v-for="item in failures" :key="item.name" class="failure-row">
              <span>{{ item.name }}</span>
              <strong>{{ item.value }}</strong>
            </div>
            <el-empty v-if="!failures.length && !loading" description="暂无失败调用数据" />
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { Bot, RefreshCw } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import { getAdminAiFailuresApi, getAdminAiOverviewApi } from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { AdminAiOverviewVO, MetricPointVO } from '@/types/analytics'

const loading = ref(false)
const errorMessage = ref('')
const rangeDays = ref(7)
const overview = ref<AdminAiOverviewVO>()
const failures = ref<MetricPointVO[]>([])
const successChartRef = ref<HTMLElement>()
let successChart: echarts.ECharts | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'calls', label: 'AI 调用总数', value: overview.value?.totalAiCalls || 0, hint: `成功 ${overview.value?.successAiCalls || 0} / 失败 ${overview.value?.failedAiCalls || 0}` },
  { key: 'rate', label: '调用成功率', value: `${overview.value?.aiSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgElapsedMs || 0}ms` },
  { key: 'input', label: '输入 Token', value: overview.value?.totalInputTokens || 0, hint: 'prompt tokens' },
  { key: 'output', label: '输出 Token', value: overview.value?.totalOutputTokens || 0, hint: `总计 ${overview.value?.totalTokens || 0}` }
])

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '接口请求失败')
  }
  return '接口请求失败'
}

const disposeChart = () => {
  successChart?.dispose()
  successChart = null
}

const renderChart = async () => {
  await nextTick()
  disposeChart()
  if (!successChartRef.value || !overview.value) return
  successChart = echarts.init(successChartRef.value)
  successChart.setOption({
    color: ['#34d399', '#f87171'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#94a3b8' } },
    series: [
      {
        name: 'AI 调用',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '43%'],
        data: [
          { name: '成功', value: overview.value.successAiCalls || 0 },
          { name: '失败', value: overview.value.failedAiCalls || 0 }
        ]
      }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = { days: rangeDays.value }
    const [overviewData, failureData] = await Promise.all([
      getAdminAiOverviewApi(params),
      getAdminAiFailuresApi(params)
    ])
    overview.value = overviewData
    failures.value = failureData
    await renderChart()
  } catch (error) {
    overview.value = undefined
    failures.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const resizeChart = () => successChart?.resize()

onMounted(async () => {
  await loadPage()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.ai-ops-grid {
  grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr);
}

.analytics-chart {
  width: 100%;
  height: 320px;
  padding: 0 20px 20px;
}

.failure-list {
  display: grid;
  gap: 10px;
  padding: 18px 20px 20px;
}

.failure-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 70px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.56);
}

.failure-row span {
  overflow: hidden;
  color: var(--app-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.failure-row strong {
  text-align: right;
}

@media (max-width: 900px) {
  .ai-ops-grid {
    grid-template-columns: 1fr;
  }
}
</style>
