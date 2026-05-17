<template>
  <div class="page-shell admin-console-page admin-dashboard-page">
    <section class="admin-hero dashboard-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ShieldCheck :size="16" />
          <span>Admin AI Governance</span>
        </div>
        <h1 class="admin-hero__title">AI 内容治理中心</h1>
        <p class="admin-hero__desc">
          管理题库、Prompt、AI 调用日志、系统配置和运营数据。核心指标优先读取真实概览接口；
          趋势、分布和复杂大屏区域当前为演示数据 / 待接入真实统计接口。
        </p>
        <div class="dashboard-hero__notice">
          <Database :size="16" />
          <span>真实概览接口：/admin/system/overview</span>
          <span class="notice-divider"></span>
          <LineChart :size="16" />
          <span>演示图表占位：待接入真实统计接口</span>
        </div>
      </div>
      <div class="admin-hero__actions">
        <el-button
          v-for="item in primaryLinks"
          :key="item.path"
          type="primary"
          plain
          @click="router.push(item.path)"
        >
          <component :is="item.icon" :size="15" />
          {{ item.label }}
        </el-button>
      </div>
    </section>

    <div class="admin-metric-grid" v-loading="loading">
      <article v-for="item in metrics" :key="item.label" class="admin-metric-card dashboard-metric-card">
        <div class="admin-metric-card__icon" :class="item.tone">
          <component :is="item.icon" :size="18" />
        </div>
        <div>
          <p class="admin-metric-card__label">{{ item.label }}</p>
          <strong class="admin-metric-card__value">{{ formatMetric(item.value) }}</strong>
          <span class="admin-metric-card__hint">{{ item.hint }}</span>
        </div>
      </article>
    </div>

    <section class="admin-panel dashboard-screen-panel">
      <div class="admin-panel__header dashboard-panel-header">
        <div>
          <h2>后续统计接入预览</h2>
          <p>本区域不代表真实运营数据，仅保留少量演示图表预览信息组织方式；真实核心指标只来自概览接口。</p>
        </div>
        <el-tag type="warning" effect="plain">演示数据 / 待接入真实统计接口</el-tag>
      </div>

      <div class="dashboard-demo-banner">
        <AlertTriangle :size="16" />
        <span>以下趋势、分布、待办均为演示占位，不用于运营判断；上线前需接入真实统计接口后再展示真实数值。</span>
      </div>

      <div class="dashboard-chart-grid">
        <article
          v-for="item in chartCards.slice(0, 2)"
          :key="item.title"
          class="dashboard-chart-card"
          :class="{ 'dashboard-chart-card--wide': item.wide }"
        >
          <div class="dashboard-card-title">
            <div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.desc }}</p>
            </div>
            <el-tag size="small" type="warning" effect="plain">演示数据</el-tag>
          </div>
          <div :ref="item.setRef" class="dashboard-chart"></div>
          <div class="dashboard-demo-note">
            <AlertTriangle :size="14" />
            <span>演示数据，待接入真实统计接口</span>
          </div>
        </article>
      </div>

      <div class="dashboard-demo-backlog">
        <span>待接入真实统计后再开放：</span>
        <el-tag v-for="item in chartCards.slice(2)" :key="item.title" size="small" effect="plain">
          {{ item.title }}
        </el-tag>
      </div>
    </section>

    <div class="admin-dashboard-grid dashboard-lower-grid">
      <section class="admin-panel">
        <div class="admin-panel__header">
        <div>
          <h2>待处理事项</h2>
          <p>AI 题目审核和重复题来自真实治理接口，其余聚合待办等待后端统计接口。</p>
        </div>
          <el-tag type="success" effect="plain">部分真实统计</el-tag>
      </div>
      <div class="admin-work-list dashboard-work-list">
          <div v-for="item in pendingItems" :key="item.label" class="admin-work-item dashboard-work-item">
            <div>
              <span>{{ item.label }}</span>
              <small>{{ item.note }}</small>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <h2>系统状态区</h2>
            <p>不写死服务健康状态，当前仅展示后台概览接口连接状态。</p>
          </div>
          <el-tag :type="overviewStatus.type" effect="plain">{{ overviewStatus.label }}</el-tag>
        </div>
        <div class="dashboard-status-list">
          <div class="dashboard-status-item">
            <Server :size="18" />
            <div>
              <span>后台概览接口</span>
              <strong>{{ overviewStatus.text }}</strong>
            </div>
          </div>
          <div class="dashboard-status-item">
            <Activity :size="18" />
            <div>
              <span>系统状态监控</span>
              <strong>待接入</strong>
            </div>
          </div>
          <div class="dashboard-status-item">
            <Gauge :size="18" />
            <div>
              <span>服务健康检查</span>
              <strong>待接入</strong>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>快捷入口</h2>
          <p>全部入口指向 routes.ts 中已存在的管理端路由，不新增路由。</p>
        </div>
      </div>
      <div class="admin-link-grid dashboard-link-grid">
        <button
          v-for="item in quickLinks"
          :key="item.path"
          class="admin-link-card"
          type="button"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
          <small>{{ item.desc }}</small>
          <ArrowRight :size="14" class="dashboard-link-arrow" />
        </button>
      </div>
    </section>

    <el-alert
      v-if="overviewError"
      title="系统运营概览接口暂不可用，核心指标区已保留为空状态。"
      type="warning"
      show-icon
      :closable="false"
    />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  LineChart,
  ListTree,
  MessageSquareCode,
  PieChart,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  Tags,
  Users
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getQuestionDuplicateReviewsApi, getQuestionReviewsApi } from '@/api/question'
import { getAdminSystemOverviewApi } from '@/api/system'
import type { AdminOverviewVO } from '@/types/system'

const router = useRouter()
const loading = ref(false)
const overviewReady = ref(false)
const overviewError = ref(false)
const pendingReviewCount = ref<number | null>(null)
const pendingDuplicateCount = ref<number | null>(null)
const overview = ref<AdminOverviewVO>({
  userCount: 0,
  questionCount: 0,
  resumeCount: 0,
  interviewCount: 0,
  completedInterviewCount: 0,
  aiCallCount: 0,
  aiCallFailedCount: 0,
  promptCount: 0,
  todayInterviewCount: 0,
  todayAiCallCount: 0
})

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoInterviewTrend = [
  { day: 'D-6', value: 18 },
  { day: 'D-5', value: 24 },
  { day: 'D-4', value: 22 },
  { day: 'D-3', value: 31 },
  { day: 'D-2', value: 28 },
  { day: 'D-1', value: 36 },
  { day: 'Today', value: 33 }
]

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoAiCallTrend = [
  { day: 'D-6', success: 92, failed: 5 },
  { day: 'D-5', success: 118, failed: 8 },
  { day: 'D-4', success: 104, failed: 6 },
  { day: 'D-3', success: 136, failed: 9 },
  { day: 'D-2', success: 151, failed: 11 },
  { day: 'D-1', success: 169, failed: 7 },
  { day: 'Today', success: 142, failed: 10 }
]

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoQuestionCategoryDistribution = [
  { name: 'JVM', value: 28 },
  { name: '并发', value: 24 },
  { name: 'MySQL', value: 21 },
  { name: 'Spring', value: 18 },
  { name: 'Redis', value: 12 }
]

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoAiCallStatusDistribution = [
  { name: '成功', value: 86 },
  { name: '失败', value: 14 }
]

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoTokenTrend = [
  { day: 'D-6', value: 32 },
  { day: 'D-5', value: 41 },
  { day: 'D-4', value: 38 },
  { day: 'D-3', value: 52 },
  { day: 'D-2', value: 57 },
  { day: 'D-1', value: 61 },
  { day: 'Today', value: 49 }
]

// TODO: replace demo data with real analytics API after V2 statistics endpoint is ready.
const demoModelDistribution = [
  { name: 'gpt-4o-mini', value: 46 },
  { name: 'deepseek-chat', value: 30 },
  { name: 'qwen-plus', value: 16 },
  { name: 'other', value: 8 }
]

const pendingItems = computed(() => [
  {
    label: '待审核 AI 生成题',
    value: pendingReviewCount.value ?? '加载中',
    note: '来自 /admin/question-reviews?reviewStatus=PENDING'
  },
  {
    label: '疑似重复题',
    value: pendingDuplicateCount.value ?? '加载中',
    note: '来自 /admin/question-duplicate-reviews?reviewStatus=PENDING'
  },
  { label: 'Prompt 版本待发布', value: '待接入', note: '待接入版本发布统计接口' },
  { label: 'AI 调用失败排查', value: '待接入', note: '待接入聚合告警接口' },
  { label: '简历解析失败', value: '待接入', note: '待接入解析失败统计接口' }
])

const primaryLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: ScrollText },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings }
]

const quickLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, desc: '维护 Java 面试题库' },
  { label: '分类管理', path: '/admin/question-categories', icon: ClipboardList, desc: '治理知识域结构' },
  { label: '标签管理', path: '/admin/question-tags', icon: Tags, desc: '维护检索标签' },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode, desc: '治理 AI 提示词' },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: Bot, desc: '排查调用链路' },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings, desc: '维护运行参数' }
]

const metrics = computed(() => [
  { label: '用户数', value: overview.value.userCount, hint: '来自系统概览接口', icon: Users, tone: 'tone-blue' },
  { label: '题目数', value: overview.value.questionCount, hint: '来自系统概览接口', icon: ListTree, tone: 'tone-violet' },
  { label: '简历数', value: overview.value.resumeCount, hint: '来自系统概览接口', icon: FileText, tone: 'tone-cyan' },
  { label: '面试数', value: overview.value.interviewCount, hint: '来自系统概览接口', icon: ShieldCheck, tone: 'tone-green' },
  { label: 'AI 调用数', value: overview.value.aiCallCount, hint: '来自系统概览接口', icon: Bot, tone: 'tone-violet' },
  { label: 'Prompt 数', value: overview.value.promptCount, hint: '来自系统概览接口', icon: MessageSquareCode, tone: 'tone-blue' },
  { label: 'AI 调用失败数', value: overview.value.aiCallFailedCount, hint: '来自系统概览接口', icon: ScrollText, tone: 'tone-red' }
])

const overviewStatus = computed(() => {
  if (loading.value) {
    return { label: '连接中', text: '概览接口连接中', type: 'info' as const }
  }
  if (overviewReady.value) {
    return { label: '概览接口可用', text: '概览接口可用', type: 'success' as const }
  }
  if (overviewError.value) {
    return { label: '接口异常', text: '概览接口请求失败', type: 'danger' as const }
  }
  return { label: '待检测', text: '等待概览接口返回', type: 'info' as const }
})

const interviewTrendRef = ref<HTMLElement>()
const aiCallTrendRef = ref<HTMLElement>()
const categoryRef = ref<HTMLElement>()
const statusRef = ref<HTMLElement>()
const tokenRef = ref<HTMLElement>()
const modelRef = ref<HTMLElement>()
const charts: echarts.ECharts[] = []

const chartCards = [
  {
    title: '近 7 日面试趋势',
    desc: '演示面试发起量走势',
    wide: true,
    setRef: (el: unknown) => {
      interviewTrendRef.value = el as HTMLElement | undefined
    }
  },
  {
    title: 'AI 调用趋势',
    desc: '演示成功 / 失败调用走势',
    wide: true,
    setRef: (el: unknown) => {
      aiCallTrendRef.value = el as HTMLElement | undefined
    }
  },
  {
    title: '题目分类分布',
    desc: '演示分类占比',
    wide: false,
    setRef: (el: unknown) => {
      categoryRef.value = el as HTMLElement | undefined
    }
  },
  {
    title: 'AI 调用成功 / 失败分布',
    desc: '演示状态占比',
    wide: false,
    setRef: (el: unknown) => {
      statusRef.value = el as HTMLElement | undefined
    }
  },
  {
    title: 'Token 消耗趋势',
    desc: '演示 Token 消耗走势',
    wide: true,
    setRef: (el: unknown) => {
      tokenRef.value = el as HTMLElement | undefined
    }
  },
  {
    title: '模型调用分布',
    desc: '演示模型调用占比',
    wide: false,
    setRef: (el: unknown) => {
      modelRef.value = el as HTMLElement | undefined
    }
  }
]

const baseChartTextStyle = {
  color: '#94a3b8',
  fontFamily: 'Inter, "Microsoft YaHei", sans-serif'
}

const buildLineOption = (
  xAxisData: string[],
  series: echarts.SeriesOption[],
  legendData?: string[]
): echarts.EChartsOption => ({
  backgroundColor: 'transparent',
  color: ['#60a5fa', '#f87171', '#a78bfa'],
  tooltip: { trigger: 'axis' },
  legend: legendData
    ? {
        data: legendData,
        right: 8,
        top: 0,
        textStyle: baseChartTextStyle
      }
    : undefined,
  grid: { left: 10, right: 14, top: legendData ? 34 : 18, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: xAxisData,
    boundaryGap: false,
    axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.2)' } },
    axisLabel: baseChartTextStyle
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
    axisLabel: baseChartTextStyle
  },
  series
})

const buildPieOption = (data: { name: string; value: number }[]): echarts.EChartsOption => ({
  backgroundColor: 'transparent',
  color: ['#60a5fa', '#a78bfa', '#22d3ee', '#34d399', '#fbbf24', '#f87171'],
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    left: 'center',
    textStyle: baseChartTextStyle
  },
  series: [
    {
      type: 'pie',
      radius: ['44%', '68%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { color: '#cbd5e1' },
      data
    }
  ]
})

const initChart = (el: HTMLElement | undefined, option: echarts.EChartsOption) => {
  if (!el) return
  const chart = echarts.init(el)
  chart.setOption(option)
  charts.push(chart)
}

const initCharts = async () => {
  await nextTick()
  initChart(
    interviewTrendRef.value,
    buildLineOption(
      demoInterviewTrend.map((item) => item.day),
      [
        {
          name: '面试场次',
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(96, 165, 250, 0.14)' },
          data: demoInterviewTrend.map((item) => item.value)
        }
      ],
      ['面试场次']
    )
  )
  initChart(
    aiCallTrendRef.value,
    buildLineOption(
      demoAiCallTrend.map((item) => item.day),
      [
        { name: '成功调用', type: 'line', smooth: true, data: demoAiCallTrend.map((item) => item.success) },
        { name: '失败调用', type: 'line', smooth: true, data: demoAiCallTrend.map((item) => item.failed) }
      ],
      ['成功调用', '失败调用']
    )
  )
  initChart(categoryRef.value, buildPieOption(demoQuestionCategoryDistribution))
  initChart(statusRef.value, buildPieOption(demoAiCallStatusDistribution))
  initChart(
    tokenRef.value,
    buildLineOption(
      demoTokenTrend.map((item) => item.day),
      [
        {
          name: 'Token 消耗',
          type: 'bar',
          barWidth: 18,
          itemStyle: { borderRadius: [8, 8, 0, 0] },
          data: demoTokenTrend.map((item) => item.value)
        }
      ],
      ['Token 消耗']
    )
  )
  initChart(modelRef.value, buildPieOption(demoModelDistribution))
}

const resizeCharts = () => charts.forEach((chart) => chart.resize())

const formatMetric = (value: number) => (overviewReady.value ? value : '--')

const fetchOverview = async () => {
  loading.value = true
  overviewError.value = false
  try {
    overview.value = await getAdminSystemOverviewApi()
    overviewReady.value = true
  } catch {
    overviewReady.value = false
    overviewError.value = true
  } finally {
    loading.value = false
  }
}

const fetchPendingItems = async () => {
  try {
    const [reviewResult, duplicateResult] = await Promise.all([
      getQuestionReviewsApi({ reviewStatus: 'PENDING', pageNo: 1, pageSize: 1 }),
      getQuestionDuplicateReviewsApi({ reviewStatus: 'PENDING', pageNo: 1, pageSize: 1 })
    ])
    pendingReviewCount.value = reviewResult.total || 0
    pendingDuplicateCount.value = duplicateResult.total || 0
  } catch {
    pendingReviewCount.value = null
    pendingDuplicateCount.value = null
  }
}

onMounted(async () => {
  await Promise.all([fetchOverview(), fetchPendingItems(), initCharts()])
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  charts.forEach((chart) => chart.dispose())
})
</script>

<style scoped lang="scss">
.admin-dashboard-page {
  .dashboard-hero {
    align-items: stretch;
  }

  .dashboard-hero__notice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    width: fit-content;
    margin-top: 16px;
    padding: 9px 12px;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.48);
    color: #cbd5e1;
    font-size: 12px;
  }

  .notice-divider {
    width: 1px;
    height: 14px;
    background: rgba(148, 163, 184, 0.22);
  }

  .dashboard-metric-card {
    min-height: 132px;
  }

  .admin-metric-card__icon.tone-blue {
    background: rgba(59, 130, 246, 0.16);
    color: #93c5fd;
  }

  .admin-metric-card__icon.tone-violet {
    background: rgba(139, 92, 246, 0.16);
    color: #c4b5fd;
  }

  .admin-metric-card__icon.tone-cyan {
    background: rgba(6, 182, 212, 0.16);
    color: #67e8f9;
  }

  .admin-metric-card__icon.tone-green {
    background: rgba(34, 197, 94, 0.14);
    color: #86efac;
  }

  .admin-metric-card__icon.tone-red {
    background: rgba(239, 68, 68, 0.14);
    color: #fca5a5;
  }

  .dashboard-screen-panel {
    background:
      linear-gradient(135deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.72)),
      var(--app-surface);
  }

  .dashboard-panel-header {
    align-items: center;
  }

  .dashboard-chart-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    padding: 12px 20px 16px;
  }

  .dashboard-demo-banner,
  .dashboard-demo-backlog {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 20px;
    border: 1px solid rgba(245, 158, 11, 0.22);
    background: rgba(120, 53, 15, 0.18);
    color: #fcd34d;
    font-size: 12px;
  }

  .dashboard-demo-banner {
    margin-top: 16px;
    padding: 10px 12px;
    border-radius: 12px;
  }

  .dashboard-demo-backlog {
    flex-wrap: wrap;
    margin-bottom: 20px;
    padding: 12px;
    border-radius: 12px;
  }

  .dashboard-chart-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: var(--app-radius);
    background: rgba(2, 6, 23, 0.34);
    transition:
      border-color 0.18s ease,
      background 0.18s ease;
  }

  .dashboard-chart-card:hover {
    border-color: rgba(129, 140, 248, 0.38);
    background: rgba(15, 23, 42, 0.54);
  }

  .dashboard-chart-card--wide {
    grid-column: span 2;
  }

  .dashboard-card-title {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .dashboard-card-title h3 {
    margin: 0;
    font-size: 15px;
  }

  .dashboard-card-title p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .dashboard-chart {
    width: 100%;
    height: 240px;
    margin-top: 10px;
  }

  .dashboard-demo-note {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 10px;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
    color: #fbbf24;
    font-size: 12px;
  }

  .dashboard-lower-grid {
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  }

  .dashboard-work-list {
    gap: 10px;
  }

  .dashboard-work-item {
    align-items: flex-start;
  }

  .dashboard-work-item small {
    display: block;
    margin-top: 5px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .dashboard-work-item strong {
    color: #fbbf24;
    font-size: 18px;
  }

  .dashboard-status-list {
    display: grid;
    gap: 12px;
    padding: 18px 20px 20px;
  }

  .dashboard-status-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.56);
  }

  .dashboard-status-item svg {
    flex: 0 0 auto;
    color: #93c5fd;
  }

  .dashboard-status-item span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .dashboard-status-item strong {
    display: block;
    margin-top: 4px;
    color: var(--app-text);
    font-size: 14px;
  }

  .dashboard-link-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .dashboard-link-arrow {
    color: var(--app-text-muted);
  }
}

@media (max-width: 1200px) {
  .admin-dashboard-page {
    .dashboard-chart-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-link-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 760px) {
  .admin-dashboard-page {
    .dashboard-hero__notice {
      border-radius: 14px;
    }

    .notice-divider {
      display: none;
    }

    .dashboard-chart-grid,
    .dashboard-lower-grid,
    .dashboard-link-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-chart-card--wide {
      grid-column: span 1;
    }

    .dashboard-chart {
      height: 220px;
    }
  }
}
</style>
