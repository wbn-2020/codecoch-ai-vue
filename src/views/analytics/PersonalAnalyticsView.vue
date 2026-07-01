<template>
  <div class="page-shell analytics-page">
    <section class="analytics-hero">
      <div>
        <div class="analytics-eyebrow">
          <LineChart :size="16" />
          <span>求职洞察</span>
        </div>
        <h1>个人求职洞察</h1>
        <p>把投递、跟进、简历版本、面试弱项和训练任务放在同一张复盘视图里，优先看最近最值得改进的动作。</p>
      </div>
      <div class="analytics-actions">
        <el-segmented v-model="rangeDays" :options="rangeOptions" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
      </div>
    </section>

    <section class="insight-summary-grid" v-loading="loading">
      <article class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">行动</p>
              <h2>本周推荐动作</h2>
              <span>{{ careerRangeLabel }}，按优先级展示 1 到 3 个可执行动作</span>
            </div>
          </div>

          <AppState
            v-if="careerInsightError"
            type="empty"
            title="求职洞察暂不可用"
            :description="careerInsightError"
          >
            <el-button @click="loadPage">重新加载洞察</el-button>
          </AppState>
          <div v-else-if="careerDisplay.recommendedActions.length" class="action-list">
            <div v-for="action in careerDisplay.recommendedActions" :key="action.key" class="action-row">
              <div>
                <el-tag size="small" :type="priorityTagType(action.priority)">{{ priorityLabel(action.priority) }}</el-tag>
                <strong>{{ action.title }}</strong>
                <p>{{ action.description }}</p>
                <small>{{ action.evidence }}</small>
                <small v-if="action.unavailableReason" class="muted-warning">{{ action.unavailableReason }}</small>
              </div>
              <el-button type="primary" plain @click="go(action.actionPath)">{{ action.actionLabel }}</el-button>
            </div>
          </div>
          <el-empty v-else description="继续记录投递、跟进和面试后，这里会生成行动建议" />
        </div>
      </article>

      <article class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">提示</p>
              <h2>样本与降级状态</h2>
              <span>{{ generatedAtText }}</span>
            </div>
          </div>
          <ul class="sample-tip-list">
            <li v-for="tip in careerDisplay.sampleTips" :key="tip">{{ tip }}</li>
          </ul>
          <el-empty v-if="!careerDisplay.sampleTips.length && !careerInsightError" description="当前样本状态正常" />
        </div>
      </article>
    </section>

    <section class="content-card" v-loading="loading">
      <div class="content-card__body">
        <div class="section-head">
          <div>
            <p class="section-kicker">漏斗</p>
            <h2>求职进展漏斗</h2>
            <span>从准备执行、投递、跟进、面试到 Offer 的阶段性进展</span>
          </div>
        </div>
        <div v-if="careerInsightError" class="degraded-inline">career-insights 接口失败，漏斗洞察已降级，训练分析仍可查看。</div>
        <div v-else class="insight-metric-grid">
          <article v-for="item in careerDisplay.funnelMetrics" :key="item.key" class="insight-metric" :class="`metric-${item.tone}`">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        </div>
      </div>
    </section>

    <section class="content-card" v-loading="loading">
      <div class="content-card__body">
        <div class="section-head">
          <div>
            <p class="section-kicker">质量</p>
            <h2>投递质量</h2>
            <span>关注简历版本覆盖、跟进覆盖和长期无事件风险</span>
          </div>
        </div>
        <div v-if="!careerInsightError" class="insight-metric-grid compact">
          <article v-for="item in careerDisplay.qualityMetrics" :key="item.key" class="insight-metric" :class="`metric-${item.tone}`">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        </div>
        <div v-if="!careerInsightError && careerDisplay.qualityWarnings.length" class="warning-list">
          <div v-for="warning in careerDisplay.qualityWarnings" :key="warning.key" class="warning-row">
            <el-tag size="small" :type="warning.severity">{{ warning.title }}</el-tag>
            <p>{{ warning.description }}</p>
            <small>{{ warning.evidence }}</small>
            <el-button text type="primary" @click="go(warning.actionPath)">{{ warning.actionLabel }}</el-button>
          </div>
        </div>
        <el-empty v-if="!careerInsightError && !careerDisplay.qualityWarnings.length" description="暂无投递质量风险" />
      </div>
    </section>

    <section class="analytics-two-column" v-loading="loading">
      <article class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">简历</p>
              <h2>简历版本效果</h2>
              <span>只展示可观察信号，样本少时不做胜率排名</span>
            </div>
          </div>
          <div v-if="careerDisplay.resumeVersions.length && !careerInsightError" class="version-list">
            <div v-for="version in careerDisplay.resumeVersions" :key="version.key" class="version-row">
              <div>
                <strong>{{ version.title }}</strong>
                <p>{{ version.insightText }}</p>
                <small>{{ version.sampleText }}</small>
              </div>
              <div class="version-stats">
                <span>{{ version.applicationCount }} 投递</span>
                <span>{{ version.interviewCount }} 面试</span>
                <span>{{ version.offerCount }} Offer</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无简历版本效果数据" />
        </div>
      </article>

      <article class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">面试</p>
              <h2>面试弱项</h2>
              <span>来自最近面试报告的高频弱项摘要</span>
            </div>
          </div>
          <div v-if="careerDisplay.weaknessItems.length && !careerInsightError" class="weakness-list">
            <div v-for="weakness in careerDisplay.weaknessItems" :key="weakness.key" class="weakness-row">
              <div>
                <strong>{{ weakness.title }}</strong>
                <p>{{ weakness.category }} · {{ weakness.count }} 次出现</p>
                <small>{{ weakness.evidence }}</small>
                <small v-if="weakness.unavailableReason" class="muted-warning">{{ weakness.unavailableReason }}</small>
              </div>
              <el-button plain @click="go(weakness.actionPath)">去练习</el-button>
            </div>
          </div>
          <el-empty v-else description="完成一次模拟面试后会生成弱项洞察" />
        </div>
      </article>
    </section>

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
            <p class="section-kicker">训练趋势</p>
            <h2>任务完成趋势</h2>
            <span>按日期展示生成、完成、跳过和训练耗时</span>
          </div>
        </div>
        <AppState
          v-if="trainingErrorMessage"
          type="error"
          title="训练分析加载失败"
          :description="trainingErrorMessage"
        >
          <el-button type="primary" @click="loadPage">重试</el-button>
        </AppState>
        <div v-else-if="!trend.length && !loading" class="empty-inline">
          <el-empty description="暂无任务趋势数据" />
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
          <el-empty v-if="!skillDistribution.length && !loading && !trainingErrorMessage" description="暂无技能分布数据" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { CheckCircle2, LineChart, RefreshCw, Sparkles, Target, Timer } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPersonalAgentOverviewApi,
  getPersonalCareerInsightsApi,
  getPersonalSkillDistributionApi,
  getPersonalTaskTrendApi
} from '@/api/analytics'
import AppState from '@/components/common/AppState.vue'
import { appConfig } from '@/config'
import { buildCareerInsightDisplay, type CareerActionPriority } from '@/features/career-insights'
import type { CareerInsightOverviewVO, MetricPointVO, PersonalAgentOverviewVO, TrendPointVO } from '@/types/analytics'
import echarts, { type ECharts } from '@/utils/echarts'
import { toFriendlyMessage } from '@/utils/error'

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'

const router = useRouter()
const loading = ref(false)
const trainingErrorMessage = ref('')
const careerInsightError = ref('')
const rangeDays = ref(30)
const overview = ref<PersonalAgentOverviewVO>()
const careerInsights = ref<CareerInsightOverviewVO | null>(null)
const trend = ref<TrendPointVO[]>([])
const skillDistribution = ref<MetricPointVO[]>([])
const trendChartRef = ref<HTMLElement>()
let trendChart: ECharts | null = null

const rangeOptions = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 }
]

const metrics = computed(() => [
  { key: 'today', label: '今日任务', value: overview.value?.todayTaskCount || 0, hint: `完成 ${overview.value?.todayDoneCount || 0} / 跳过 ${overview.value?.todaySkippedCount || 0}`, icon: Target, tone: 'tone-blue' },
  { key: 'minutes', label: '今日预计耗时', value: `${overview.value?.todayEstimatedMinutes || 0}m`, hint: '来自今日训练任务', icon: Timer, tone: 'tone-cyan' },
  { key: 'week', label: '近 7 天完成率', value: `${overview.value?.last7DaysCompletionRate || 0}%`, hint: `${overview.value?.last7DaysDoneCount || 0}/${overview.value?.last7DaysTaskCount || 0} 个任务`, icon: CheckCircle2, tone: 'tone-green' },
  { key: 'agent', label: '计划生成成功率', value: `${overview.value?.agentSuccessRate || 0}%`, hint: `平均耗时 ${overview.value?.avgAgentDurationMs || 0}ms`, icon: Sparkles, tone: 'tone-violet' }
])

const careerDisplay = computed(() =>
  buildCareerInsightDisplay(careerInsights.value || null, { enableV4Preview: appConfig.enableV4Preview })
)

const insightRangeDays = computed(() => careerInsights.value?.rangeDays || rangeDays.value)
const careerRangeLabel = computed(() => `近 ${insightRangeDays.value} 天`)

const generatedAtText = computed(() => {
  if (careerInsightError.value) return '求职洞察接口已降级'
  return careerInsights.value?.generatedAt ? `生成于 ${careerInsights.value.generatedAt}` : '等待更多求职数据'
})

const maxSkillValue = computed(() => Math.max(...skillDistribution.value.map((item) => item.value || 0), 1))

const barWidth = (value?: number) => `${Math.max(6, ((value || 0) / maxSkillValue.value) * 100)}%`

const priorityLabel = (priority: CareerActionPriority) => {
  if (priority === 'urgent') return '紧急'
  if (priority === 'high') return '高优先级'
  if (priority === 'low') return '低优先级'
  return '建议'
}

const priorityTagType = (priority: CareerActionPriority): TagType => {
  if (priority === 'urgent' || priority === 'high') return 'danger'
  if (priority === 'low') return 'info'
  return 'warning'
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return toFriendlyMessage((error as { message?: unknown }).message, '接口请求失败，请稍后重试。')
  }
  return '接口请求失败，请稍后重试。'
}

const disposeChart = () => {
  trendChart?.dispose()
  trendChart = null
}

const renderTrendChart = async () => {
  await nextTick()
  disposeChart()
  if (!trendChartRef.value || !trend.value.length) return
  trendChart = echarts.init(trendChartRef.value)
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
  trainingErrorMessage.value = ''
  careerInsightError.value = ''
  const params = { days: rangeDays.value }

  const [trainingResult, careerResult] = await Promise.allSettled([
    Promise.all([
      getPersonalAgentOverviewApi(),
      getPersonalTaskTrendApi(params),
      getPersonalSkillDistributionApi(params)
    ]),
    getPersonalCareerInsightsApi(params)
  ])

  if (trainingResult.status === 'fulfilled') {
    const [overviewData, trendData, skillData] = trainingResult.value
    overview.value = overviewData
    trend.value = trendData
    skillDistribution.value = skillData
  } else {
    overview.value = undefined
    trend.value = []
    skillDistribution.value = []
    trainingErrorMessage.value = getErrorMessage(trainingResult.reason)
  }

  if (careerResult.status === 'fulfilled') {
    careerInsights.value = careerResult.value
  } else {
    careerInsights.value = null
    careerInsightError.value = getErrorMessage(careerResult.reason)
  }

  loading.value = false
  await renderTrendChart()
}

const resizeChart = () => trendChart?.resize()

const go = (path: string) => {
  router.push(path || '/agent/today')
}

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

.insight-summary-grid,
.analytics-two-column {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.8fr);
  gap: 14px;
}

.analytics-metric-grid,
.insight-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.insight-metric-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-top: 18px;
}

.insight-metric-grid.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.analytics-metric-card,
.insight-metric {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.insight-metric {
  min-height: 126px;
}

.insight-metric span,
.insight-metric small,
.analytics-metric-card span,
.analytics-metric-card small,
.section-kicker {
  color: var(--app-text-muted);
  font-size: 13px;
}

.insight-metric strong,
.analytics-metric-card strong {
  display: block;
  margin: 8px 0 4px;
  font-size: 26px;
}

.metric-primary { border-color: rgba(96, 165, 250, 0.38); }
.metric-success { border-color: rgba(52, 211, 153, 0.38); }
.metric-warning { border-color: rgba(245, 158, 11, 0.38); }
.metric-danger { border-color: rgba(248, 113, 113, 0.38); }
.metric-info { border-color: rgba(103, 232, 249, 0.26); }

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

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  text-transform: uppercase;
}

.action-list,
.warning-list,
.version-list,
.weakness-list,
.sample-tip-list {
  display: grid;
  gap: 12px;
  margin: 18px 0 0;
  padding: 0;
}

.sample-tip-list {
  padding-left: 18px;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.action-row,
.warning-row,
.version-row,
.weakness-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.action-row strong,
.version-row strong,
.weakness-row strong {
  display: block;
  margin-top: 8px;
}

.action-row p,
.warning-row p,
.version-row p,
.weakness-row p {
  margin: 6px 0;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.action-row small,
.warning-row small,
.version-row small,
.weakness-row small {
  display: block;
  color: var(--app-text-muted);
}

.muted-warning {
  color: #fbbf24 !important;
}

.version-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  min-width: 160px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.degraded-inline {
  margin-top: 18px;
  padding: 12px 14px;
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 8px;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.08);
}

.analytics-chart {
  width: 100%;
  height: 320px;
  margin-top: 16px;
}

.empty-inline {
  padding: 24px 0;
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

@media (max-width: 1100px) {
  .insight-metric-grid,
  .insight-metric-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .analytics-hero,
  .section-head,
  .action-row,
  .version-row,
  .weakness-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .insight-summary-grid,
  .analytics-two-column,
  .analytics-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .version-stats {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .insight-summary-grid,
  .analytics-two-column,
  .analytics-metric-grid,
  .insight-metric-grid,
  .insight-metric-grid.compact,
  .skill-bar-row {
    grid-template-columns: 1fr;
  }
}
</style>
