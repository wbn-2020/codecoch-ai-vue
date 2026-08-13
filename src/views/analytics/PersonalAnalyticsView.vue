<template>
  <div class="page-shell analytics-page">
    <section class="analytics-hero">
      <div>
        <div class="analytics-eyebrow">
          <LineChart :size="16" />
          <span>训练分析</span>
        </div>
        <h1>个人训练分析</h1>
        <p>汇总每日任务、完成率、已完成任务预计分钟和重点技能分布，帮助你看清最近一段时间的准备节奏。</p>
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

      <AppState
        v-if="isInitialLoading"
        type="loading"
        title="正在生成训练分析"
        description="正在汇总任务趋势、训练时长和技能证据。"
      />

      <template v-else>
      <section class="analytics-metric-grid">
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
              <span>按日期展示生成、完成、跳过和已完成任务预计分钟，不代表实际训练耗时</span>
            </div>
          </div>
          <AppState
            v-if="trendError"
            type="error"
            title="任务趋势暂时不可用"
            :description="trendError"
          >
            <div class="empty-actions">
              <el-button type="primary" @click="loadPage">重新加载</el-button>
            </div>
          </AppState>
          <div v-else-if="!trend.length" class="empty-inline">
            <AppState
              type="empty"
              :title="trendEmptyState.title"
              :description="trendEmptyState.description"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goTodayPlan">去今日计划</el-button>
              </div>
            </AppState>
          </div>
          <div v-else ref="trendChartRef" class="analytics-chart"></div>
        </div>
      </section>

      <section class="content-card analytics-insight-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">变化说明</p>
              <h2>本周期训练解读</h2>
              <span>只根据已返回的任务记录说明完成情况，不推断未采集的原因。</span>
            </div>
          </div>
          <AppState
            v-if="!trend.length"
            type="empty"
            title="暂无可解释的趋势变化"
            description="有任务记录后，这里会说明完成量、跳过量和已完成任务预计分钟的变化。"
          >
            <div class="empty-actions">
              <el-button type="primary" @click="goTodayPlan">安排今日任务</el-button>
            </div>
          </AppState>
          <div v-else class="analytics-insight-grid">
            <article v-for="item in trendInsights" :key="item.label">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </div>
          <div v-if="trend.length" class="analytics-insight-action">
            <div>
              <strong>{{ trendNextAction.title }}</strong>
              <p>{{ trendNextAction.description }}</p>
            </div>
            <el-button type="primary" @click="router.push(trendNextAction.path)">{{ trendNextAction.label }}</el-button>
          </div>
        </div>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">技能</p>
              <h2>重点训练技能</h2>
              <span>仅统计已完成且带有明确技能标签的任务 Top 分布</span>
            </div>
          </div>
          <div class="skill-bars">
            <div v-for="item in skillDistribution" :key="item.name" class="skill-bar-row">
              <span>{{ item.name }}</span>
              <div class="skill-bar-track"><i :style="{ width: barWidth(item.value) }"></i></div>
              <strong>{{ item.value }}</strong>
            </div>
            <AppState
              v-if="skillError"
              type="error"
              title="技能分布暂时不可用"
              :description="skillError"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="loadPage">重新加载</el-button>
              </div>
            </AppState>
            <AppState
              v-else-if="!skillDistribution.length"
              type="empty"
              :title="skillEmptyState.title"
              :description="skillEmptyState.description"
            >
              <div class="empty-actions">
                <el-button type="primary" @click="goQuestionTraining">进入题库训练</el-button>
              </div>
            </AppState>
          </div>
        </div>
      </section>
      </template>
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
const hasLoadedPage = ref(false)
const router = useRouter()
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const rangeDays = ref(7)
const overview = ref<PersonalAgentOverviewVO>()
const trend = ref<TrendPointVO[]>([])
const skillDistribution = ref<MetricPointVO[]>([])
const overviewError = ref('')
const trendError = ref('')
const skillError = ref('')
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

const hasRecentTaskSample = computed(() => (overview.value?.last7DaysTaskCount || 0) > 0)
const hasAgentPlanSample = computed(() =>
  (overview.value?.totalAgentPlanCount || 0) > 0 || (overview.value?.agentGeneratedTaskCount || 0) > 0
)
const isInitialLoading = computed(() => loading.value && !hasLoadedPage.value)

const metrics = computed(() => {
  if (!overview.value) {
    return [
      { key: 'today', label: '今日任务', value: '暂不可用', hint: overviewError.value || '训练总览暂时不可用', icon: Target, tone: 'tone-blue' },
      { key: 'minutes', label: '今日预计耗时', value: '暂不可用', hint: overviewError.value || '训练总览暂时不可用', icon: Timer, tone: 'tone-cyan' },
      { key: 'week', label: '近 7 天完成率', value: '待生成', hint: overviewError.value || '尚未取得可用训练样本', icon: CheckCircle2, tone: 'tone-green' },
      { key: 'agent', label: '计划执行情况', value: '待生成', hint: overviewError.value || '尚未取得可用计划样本', icon: Sparkles, tone: 'tone-violet' }
    ]
  }

  const todayTaskCount = overview.value.todayTaskCount || 0
  return [
    {
      key: 'today',
      label: '今日任务',
      value: todayTaskCount,
      hint: todayTaskCount
        ? `完成 ${overview.value.todayDoneCount || 0} / 跳过 ${overview.value.todaySkippedCount || 0}`
        : '今天没有安排训练任务',
      icon: Target,
      tone: 'tone-blue'
    },
    {
      key: 'minutes',
      label: '今日预计耗时',
      value: formatMinutes(overview.value.todayEstimatedMinutes),
      hint: todayTaskCount ? '来自今日训练任务' : '当前没有需要安排的训练时长',
      icon: Timer,
      tone: 'tone-cyan'
    },
    {
      key: 'week',
      label: '近 7 天完成率',
      value: hasRecentTaskSample.value ? `${overview.value.last7DaysCompletionRate || 0}%` : '待生成',
      hint: hasRecentTaskSample.value
        ? `${overview.value.last7DaysDoneCount || 0}/${overview.value.last7DaysTaskCount || 0} 个任务`
        : '近 7 天尚无可分析的训练样本',
      icon: CheckCircle2,
      tone: 'tone-green'
    },
    {
      key: 'agent',
      label: '计划执行情况',
      value: hasAgentPlanSample.value ? `${overview.value.agentSuccessRate || 0}%` : '待生成',
      hint: hasAgentPlanSample.value
        ? formatWaitSeconds(overview.value.avgAgentDurationMs)
        : '尚无可分析的计划执行样本',
      icon: Sparkles,
      tone: 'tone-violet'
    }
  ]
})

const maxSkillValue = computed(() => Math.max(...skillDistribution.value.map((item) => item.value || 0), 1))
const partialErrorMessage = computed(() =>
  partialErrors.value.length ? `部分分析数据暂时不可用：${partialErrors.value.join('；')}` : ''
)
const trendEmptyState = computed(() => hasRecentTaskSample.value
  ? {
      title: '所选周期没有训练记录',
      description: '该时间范围内没有生成或完成的训练任务，当前为空是正常结果。'
    }
  : {
      title: '尚无可分析的训练样本',
      description: '完成今日任务或题库练习后，这里会按日期展示生成、完成和耗时。'
    })
const skillEmptyState = computed(() => hasRecentTaskSample.value
  ? {
      title: '暂无可归因的技能样本',
      description: '已有训练记录，但尚未关联到技能标签；完成带标签的练习后会在这里汇总。'
    }
  : {
      title: '尚无技能证据',
      description: '完成带技能标签的练习、错题复盘或模拟面试后，这里会汇总重点技能。'
    })

const trendTotals = computed(() => trend.value.reduce((total, item) => ({
  generated: total.generated + Math.max(0, item.generatedCount || 0),
  completed: total.completed + Math.max(0, item.completedCount || 0),
  skipped: total.skipped + Math.max(0, item.skippedCount || 0),
  completedMinutes: total.completedMinutes + Math.max(0, item.completedMinutes || 0)
}), { generated: 0, completed: 0, skipped: 0, completedMinutes: 0 }))

const trendInsights = computed(() => {
  const totals = trendTotals.value
  const completionBase = totals.completed + totals.skipped
  const completionRate = completionBase > 0
    ? `${Math.round((totals.completed / completionBase) * 100)}%`
    : '暂无结算任务'
  return [
    {
      label: '已完成任务',
      value: `${totals.completed} 项`,
      description: totals.completed
        ? `这些任务的预计用时合计为 ${formatMinutes(totals.completedMinutes)}，不代表实际训练耗时。`
        : '本周期尚未记录完成任务。'
    },
    {
      label: '已跳过任务',
      value: `${totals.skipped} 项`,
      description: totals.skipped
        ? '跳过会保留在趋势中，便于回到任务页重新安排。'
        : '本周期没有已记录的跳过任务。'
    },
    {
      label: '已结算完成率',
      value: completionRate,
      description: completionBase
        ? `按 ${totals.completed} 项完成和 ${totals.skipped} 项跳过计算。`
        : '只有完成或跳过后才计算此比例。'
    }
  ]
})

const trendNextAction = computed(() => {
  const totals = trendTotals.value
  if (totals.skipped > 0) {
    return {
      title: '优先处理已跳过的训练',
      description: '本周期存在已跳过任务，先回到今日任务重新安排，避免重复生成新的待办。',
      label: '查看今日任务',
      path: '/agent/today'
    }
  }
  if (totals.completed === 0) {
    return {
      title: '完成第一项可执行任务',
      description: '趋势已开始记录，但还没有完成事实；先完成当前任务再观察变化。',
      label: '进入今日任务',
      path: '/agent/today'
    }
  }
  return {
    title: '继续巩固重点技能',
    description: '完成记录已建立，可结合下方技能分布选择下一组带标签训练。',
    label: '查看推荐题',
    path: '/questions/recommendations'
  }
})

const barWidth = (value?: number) => `${Math.max(6, ((value || 0) / maxSkillValue.value) * 100)}%`

const goTodayPlan = () => router.push('/agent/today')
const goQuestionTraining = () => router.push('/questions/recommendations')

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
    color: ['#17b26a', '#a3e635', '#f79009', '#7c5cfc'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e4eae5',
      textStyle: { color: '#15211b' }
    },
    legend: { top: 0, right: 8, textStyle: { color: '#5f6e66' } },
    grid: {
      left: 12,
      right: 16,
      top: 38,
      bottom: 8,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel'
    },
    xAxis: {
      type: 'category',
      data: trend.value.map((item) => item.date),
      axisLabel: { color: '#68766e' },
      axisLine: { lineStyle: { color: '#d5ddd6' } }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#eef2ee' } },
      axisLabel: { color: '#68766e' },
      axisLine: { lineStyle: { color: '#d5ddd6' } }
    },
    series: [
      { name: '生成', type: 'line', smooth: true, data: trend.value.map((item) => item.generatedCount || 0) },
      { name: '完成', type: 'line', smooth: true, data: trend.value.map((item) => item.completedCount || 0) },
      { name: '跳过', type: 'line', smooth: true, data: trend.value.map((item) => item.skippedCount || 0) },
      { name: '已完成任务预计分钟', type: 'bar', data: trend.value.map((item) => item.completedMinutes || 0) }
    ]
  })
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  overviewError.value = ''
  trendError.value = ''
  skillError.value = ''
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
      overviewError.value = getErrorMessage(overviewResult.reason)
      partialErrors.value.push(`训练总览加载失败：${overviewError.value}`)
    }

    if (trendResult.status === 'fulfilled') {
      trend.value = trendResult.value
    } else {
      trend.value = []
      trendError.value = getErrorMessage(trendResult.reason)
      partialErrors.value.push(`任务趋势加载失败：${trendError.value}`)
    }

    if (skillResult.status === 'fulfilled') {
      skillDistribution.value = skillResult.value
    } else {
      skillDistribution.value = []
      skillError.value = getErrorMessage(skillResult.reason)
      partialErrors.value.push(`技能分布加载失败：${skillError.value}`)
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
    overviewError.value = ''
    trendError.value = ''
    skillError.value = ''
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
    hasLoadedPage.value = true
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
  padding: 18px 20px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: var(--user-surface);
  box-shadow: none;
}

.analytics-eyebrow,
.analytics-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.analytics-eyebrow {
  color: var(--user-primary);
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
  min-height: 92px;
  padding: 16px;
  border: 1.5px solid var(--user-border);
  border-radius: 16px;
  background: var(--user-surface);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 12px;
  border-radius: 8px;
}

.tone-blue { color: var(--arena-grn-d, var(--user-primary)); background: var(--arena-grn-soft, var(--user-primary-soft)); }
.tone-cyan { color: var(--arena-amber, var(--user-warning)); background: var(--arena-amber-soft, var(--user-warning-soft)); }
.tone-green { color: var(--arena-grn-d, var(--user-success-text)); background: var(--arena-grn-soft, var(--user-success-soft)); }
.tone-violet { color: var(--arena-vio, var(--user-ai)); background: var(--arena-vio-soft, var(--user-ai-soft)); }

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

.analytics-insight-card {
  border-color: color-mix(in srgb, var(--user-primary) 18%, var(--user-border));
}

.analytics-insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.analytics-insight-grid article {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.analytics-insight-grid span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.analytics-insight-grid strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
}

.analytics-insight-grid p,
.analytics-insight-action p {
  margin: 8px 0 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.analytics-insight-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--user-border);
}

.analytics-insight-action strong {
  display: block;
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
  background: var(--user-surface-muted);
}

.skill-bar-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--user-primary);
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

  .analytics-insight-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .analytics-metric-grid,
  .skill-bar-row {
    grid-template-columns: 1fr;
  }

  .analytics-insight-action {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
