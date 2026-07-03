<template>
  <div class="page-shell analytics-page">
    <section class="analytics-hero">
      <div>
        <div class="analytics-eyebrow">
          <LineChart :size="16" />
          <span>训练分析</span>
        </div>
        <h1>个人训练分析</h1>
        <p>汇总每日任务、完成率、训练耗时和重点技能分布，帮助你看清最近一段时间的准备节奏。</p>
      </div>
      <div class="analytics-actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="分析数据加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <el-alert
        v-if="partialErrorMessage"
        class="partial-alert"
        type="warning"
        :title="partialErrorMessage"
        :closable="false"
        show-icon
      />

      <section class="analytics-metric-grid" v-loading="loading">
        <article v-for="item in metrics" :key="item.key" class="analytics-metric-card">
          <div class="metric-icon" :class="item.tone">
            <component :is="item.icon" :size="18" />
          </div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.hint }}</small>
        </article>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">趋势</p>
              <h2>任务完成趋势</h2>
              <span>按日期展示生成、完成、跳过和训练耗时</span>
            </div>
          </div>
          <div v-if="!trend.length && !loading" class="empty-inline">
            <AppState
              type="empty"
              title="还没有训练趋势"
              description="完成今日任务或题库练习后，这里会按日期展示生成、完成和耗时。"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goTodayPlan">去今日计划</el-button>
                <el-button @click="goQuestionTraining">练一组题</el-button>
              </div>
            </AppState>
          </div>
          <div v-else ref="trendChartRef" class="analytics-chart"></div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">技能</p>
              <h2>重点训练技能</h2>
              <span>来自训练任务关联技能 Top 分布</span>
            </div>
          </div>
          <div class="skill-bars">
            <div v-for="item in skillDistribution" :key="item.name" class="skill-bar-row">
              <span>{{ item.name }}</span>
              <div class="skill-bar-track"><i :style="{ width: barWidth(item.value) }"></i></div>
              <strong>{{ item.value }}</strong>
            </div>
            <AppState
              v-if="!skillDistribution.length && !loading"
              type="empty"
              title="还没有技能分布"
              description="完成带技能标签的练习、错题复盘或模拟面试后，这里会汇总重点技能。"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goQuestionTraining">进入题库训练</el-button>
                <el-button @click="goInterviewCreate">创建模拟面试</el-button>
              </div>
            </AppState>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, Clock3, LineChart, RefreshCw, Sparkles, Target, Timer } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPersonalAgentOverviewApi,
  getPersonalSkillDistributionApi,
  getPersonalTaskTrendApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import type { MetricPointVO, PersonalAgentOverviewVO, TrendPointVO } from '@/types/analytics'
import type { ECharts } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

const loading = ref(false)
const router = useRouter()
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const rangeDays = ref(7)
const overview = ref<PersonalAgentOverviewVO>()
const trend = ref<TrendPointVO[]>([])
const skillDistribution = ref<MetricPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null
let analyticsMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 }
]

const formatMinutes = (minutes?: number) => `${Math.max(0, minutes || 0)} 分钟`

const formatWaitSeconds = (durationMs?: number) => {
  const seconds = Math.max(1, Math.round((durationMs || 0) / 1000))
  return `平均等待约 ${seconds} 秒`
}

const analyticsLoadErrorText = '分析数据暂时加载失败，请稍后重试。'

const metrics = computed(() => [
  { key: 'today', label: '今日任务', value: overview.value?.todayTaskCount || 0, hint: `完成 ${overview.value?.todayDoneCount || 0} / 跳过 ${overview.value?.todaySkippedCount || 0}`, icon: Target, tone: 'tone-blue' },
  { key: 'minutes', label: '今日预计耗时', value: formatMinutes(overview.value?.todayEstimatedMinutes), hint: '来自今日训练任务', icon: Timer, tone: 'tone-cyan' },
  { key: 'week', label: '近 7 天完成率', value: `${overview.value?.last7DaysCompletionRate || 0}%`, hint: `${overview.value?.last7DaysDoneCount || 0}/${overview.value?.last7DaysTaskCount || 0} 个任务`, icon: CheckCircle2, tone: 'tone-green' },
  { key: 'agent', label: '今日计划成功率', value: `${overview.value?.agentSuccessRate || 0}%`, hint: formatWaitSeconds(overview.value?.avgAgentDurationMs), icon: Sparkles, tone: 'tone-violet' }
])

const maxSkillValue = computed(() => Math.max(...skillDistribution.value.map((item) => item.value || 0), 1))
const partialErrorMessage = computed(() =>
  partialErrors.value.length ? `部分分析数据暂时不可用：${partialErrors.value.join('；')}` : ''
)

const barWidth = (value?: number) => `${Math.max(6, ((value || 0) / maxSkillValue.value) * 100)}%`

const goTodayPlan = () => router.push('/agent/today')
const goQuestionTraining = () => router.push('/questions/recommendations')
const goInterviewCreate = () => router.push('/interviews/create')

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, analyticsLoadErrorText)
  }
  return analyticsLoadErrorText
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const loadEcharts = () => {
  if (!echartsModulePromise) {
    echartsModulePromise = import('@/utils/echarts')
  }
  return echartsModulePromise
}

const renderTrendChart = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  disposeChart()
  if (!analyticsMounted) return
  if (!trendChartRef.value || !trend.value.length) return
  const echarts = await loadEcharts()
  if (!analyticsMounted || renderSeq !== chartRenderSeq || !trendChartRef.value || !trend.value.length) {
    return
  }
  trendChart = echarts.default.init(trendChartRef.value)
  trendChart.setOption({
    color: ['#60a5fa', '#34d399', '#f59e0b', '#a78bfa'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 8, textStyle: { color: '#94a3b8' } },
    grid: { left: 12, right: 16, top: 38, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: trend.value.map((item) => item.date), axisLabel: { color: '#94a3b8' } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.14)' } }, axisLabel: { color: '#94a3b8' } },
    series: [
      { name: '生成', type: 'line', smooth: true, data: trend.value.map((item) => item.generatedCount || 0) },
      { name: '完成', type: 'line', smooth: true, data: trend.value.map((item) => item.completedCount || 0) },
      { name: '跳过', type: 'line', smooth: true, data: trend.value.map((item) => item.skippedCount || 0) },
      { name: '完成耗时', type: 'bar', data: trend.value.map((item) => item.completedMinutes || 0) }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  try {
    const params = { days: rangeDays.value }
    const [overviewResult, trendResult, skillResult] = await Promise.allSettled([
      getPersonalAgentOverviewApi(),
      getPersonalTaskTrendApi(params),
      getPersonalSkillDistributionApi(params)
    ])

    if (overviewResult.status === 'fulfilled') {
      overview.value = overviewResult.value
    } else {
      overview.value = undefined
      partialErrors.value.push(`训练总览加载失败：${getErrorMessage(overviewResult.reason)}`)
    }

    if (trendResult.status === 'fulfilled') {
      trend.value = trendResult.value
    } else {
      trend.value = []
      partialErrors.value.push(`任务趋势加载失败：${getErrorMessage(trendResult.reason)}`)
    }

    if (skillResult.status === 'fulfilled') {
      skillDistribution.value = skillResult.value
    } else {
      skillDistribution.value = []
      partialErrors.value.push(`技能分布加载失败：${getErrorMessage(skillResult.reason)}`)
    }

    if (partialErrors.value.length === 3) {
      errorMessage.value = partialErrorMessage.value || '分析数据加载失败。'
      partialErrors.value = []
    }
    await renderTrendChart()
  } catch (error) {
    overview.value = undefined
    trend.value = []
    skillDistribution.value = []
    partialErrors.value = []
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const resizeChart = () => trendChart?.resize()

onMounted(async () => {
  analyticsMounted = true
  window.addEventListener('resize', resizeChart)
  await loadPage()
})

onBeforeUnmount(() => {
  analyticsMounted = false
  chartRenderSeq += 1
  window.removeEventListener('resize', resizeChart)
  disposeChart()
})
</script>

<style scoped lang="scss">
.analytics-hero,
.section-head,
.analytics-actions {
  display: flex;
  gap: 16px;
}

.analytics-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(34, 197, 94, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.analytics-eyebrow,
.analytics-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.analytics-eyebrow {
  color: #67e8f9;
  font-size: 13px;
  font-weight: 700;
}

.analytics-hero h1,
.section-head h2 {
  margin: 0;
}

.analytics-hero h1 {
  margin-top: 10px;
  font-size: 28px;
}

.analytics-hero p,
.section-head span {
  max-width: 720px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.analytics-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.partial-alert {
  margin: -4px 0 2px;
}

.analytics-metric-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 12px;
  border-radius: 10px;
}

.tone-blue { color: #93c5fd; background: rgba(59, 130, 246, 0.16); }
.tone-cyan { color: #67e8f9; background: rgba(6, 182, 212, 0.16); }
.tone-green { color: #86efac; background: rgba(34, 197, 94, 0.14); }
.tone-violet { color: #c4b5fd; background: rgba(139, 92, 246, 0.16); }

.analytics-metric-card span,
.analytics-metric-card small,
.section-kicker {
  color: var(--app-text-muted);
  font-size: 13px;
}

.analytics-metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 26px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  text-transform: uppercase;
}

.analytics-chart {
  width: 100%;
  height: 320px;
  margin-top: 16px;
}

.empty-inline {
  padding: 24px 0;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.skill-bars {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.skill-bar-row {
  display: grid;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr) 56px;
  align-items: center;
  gap: 12px;
}

.skill-bar-row span,
.skill-bar-row strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-bar-track {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
}

.skill-bar-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #22d3ee, #60a5fa);
}

@media (max-width: 900px) {
  .analytics-hero,
  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .analytics-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .analytics-metric-grid,
  .skill-bar-row {
    grid-template-columns: 1fr;
  }
}
</style>
