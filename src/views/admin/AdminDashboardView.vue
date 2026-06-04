<template>
  <div class="page-shell admin-console-page admin-dashboard-page">
    <section class="admin-hero dashboard-hero">
      <div class="admin-hero__content">
        <div class="admin-eyebrow">
          <ShieldCheck :size="16" />
          <span>AI 治理后台</span>
        </div>
        <h1 class="admin-hero__title">AI 内容治理中心</h1>
        <p class="admin-hero__desc">
          汇总题库、简历、面试、AI 调用和系统运行状态，帮助运营人员快速定位待处理事项。
        </p>
        <div class="dashboard-hero__notice">
          <Database :size="16" />
          <span>{{ dashboard?.dataSourceDesc || '管理概览已更新' }}</span>
          <span class="notice-divider"></span>
          <Clock3 :size="16" />
          <span>生成时间：{{ formatDateTime(dashboard?.generatedAt) }}</span>
        </div>
      </div>
      <div class="admin-hero__actions">
        <el-button v-for="item in primaryLinkItems" :key="item.path" type="primary" plain @click="router.push(item.path)">
          <component :is="item.icon" :size="15" />
          {{ item.label }}
        </el-button>
      </div>
    </section>

    <el-alert
      v-if="overviewError"
      class="dashboard-alert"
      title="管理首页数据加载失败"
      description="暂时无法获取统计概览，请稍后重试或检查服务状态。"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button text type="primary" :loading="loading" @click="fetchOverview">重试</el-button>
      </template>
    </el-alert>

    <div class="admin-metric-grid" v-loading="loading">
      <article
        v-for="item in metrics"
        :key="item.key"
        class="admin-metric-card dashboard-metric-card"
        :class="{ 'is-clickable': Boolean(item.path) }"
        @click="goMetric(item)"
      >
        <div class="admin-metric-card__icon" :class="item.tone">
          <component :is="item.icon" :size="18" />
        </div>
        <div>
          <p class="admin-metric-card__label">{{ item.label }}</p>
          <strong class="admin-metric-card__value">{{ item.value }}</strong>
          <span class="admin-metric-card__hint">{{ item.hint }}</span>
        </div>
      </article>
    </div>

    <section class="admin-panel dashboard-screen-panel">
      <div class="admin-panel__header dashboard-panel-header">
        <div>
          <h2>近 7 日趋势</h2>
          <p>观察面试、简历、学习计划和 AI 调用的近期变化。</p>
        </div>
        <el-tag type="success" effect="plain">已更新</el-tag>
      </div>

      <div v-if="!trendStats.length && !loading" class="dashboard-empty">
        <LineChart :size="18" />
        <span>暂无趋势数据</span>
      </div>
      <div v-else class="dashboard-chart-grid">
        <article class="dashboard-chart-card dashboard-chart-card--wide">
          <div class="dashboard-card-title">
            <div>
              <h3>面试 / 简历 / 学习计划趋势</h3>
              <p>面试、简历上传和学习计划生成数量</p>
            </div>
          </div>
          <div ref="businessTrendRef" class="dashboard-chart"></div>
        </article>
        <article class="dashboard-chart-card dashboard-chart-card--wide">
          <div class="dashboard-card-title">
            <div>
              <h3>AI 调用与失败趋势</h3>
              <p>AI 调用、失败调用和题目审核生成数量</p>
            </div>
          </div>
          <div ref="aiTrendRef" class="dashboard-chart"></div>
        </article>
      </div>
    </section>

    <div class="admin-dashboard-grid dashboard-lower-grid">
      <div ref="dashboardLeftStackRef" class="dashboard-left-stack">
        <section class="admin-panel dashboard-pending-panel">
          <div class="admin-panel__header">
            <div>
              <h2>待处理事项</h2>
              <p>来自当前数据库的待审核、失败和待发布事项。</p>
            </div>
            <el-tag type="success" effect="plain">待处理</el-tag>
          </div>
          <div class="admin-work-list dashboard-work-list">
            <button
              v-for="item in pendingItems"
              :key="item.key"
              class="admin-work-item dashboard-work-item"
              type="button"
              @click="goPending(item)"
            >
              <div>
                <span>{{ pendingLabel(item) }}</span>
                <small>{{ pendingSourceLabel(item) }}</small>
              </div>
              <strong>{{ item.count ?? 0 }}</strong>
            </button>
            <el-empty v-if="!pendingItems.length && !loading" description="当前没有待处理事项" />
          </div>
        </section>

        <section class="admin-panel dashboard-links-panel">
          <div class="admin-panel__header">
            <div>
              <h2>快捷入口</h2>
              <p>全部入口指向当前已存在的管理端路由。</p>
            </div>
          </div>
          <div class="admin-link-grid dashboard-link-grid">
            <button
              v-for="item in quickLinkItems"
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
            <el-empty v-if="!quickLinkItems.length && !loading" description="暂无可访问的快捷入口，请联系管理员分配权限" />
          </div>
        </section>
      </div>

      <section class="admin-panel dashboard-status-panel" :style="statusPanelStyle">
        <div class="admin-panel__header">
          <div>
            <h2>系统状态</h2>
            <p>展示数据库和关键服务的最近探测结果。</p>
          </div>
          <el-tag :type="statusTagType(systemStatus?.status)" effect="plain">
            {{ statusText(systemStatus?.status) }}
          </el-tag>
        </div>
        <div class="dashboard-status-list">
          <div v-for="item in services" :key="item.serviceName" class="dashboard-status-item">
            <Server :size="18" />
            <div>
              <span>{{ serviceLabel(item.serviceName) }}</span>
              <strong :class="`status-${statusTone(item.status)}`">{{ statusText(item.status) }}</strong>
              <small>{{ serviceReasonLabel(item) }}</small>
            </div>
          </div>
          <el-empty v-if="!services.length && !loading" description="暂无系统状态数据" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowRight,
  Bot,
  ClipboardList,
  Clock3,
  Database,
  FileText,
  LineChart,
  ListTree,
  MessageSquareCode,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  Tags,
  Users
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'
import type {
  AdminDashboardOverviewVO,
  AdminDashboardPendingItemVO,
  AdminDashboardServiceStatusVO,
  AdminDashboardTrendStatVO
} from '@/types/dashboard'
import echarts, { type ECharts, type EChartsOption, type SeriesOption } from '@/utils/echarts'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const overviewError = ref(false)
const dashboard = ref<AdminDashboardOverviewVO | null>(null)
const businessTrendRef = ref<HTMLElement>()
const aiTrendRef = ref<HTMLElement>()
const dashboardLeftStackRef = ref<HTMLElement>()
const statusPanelHeight = ref<number>()
const charts: ECharts[] = []
let dashboardLayoutObserver: ResizeObserver | null = null

const primaryLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, permissions: ['admin:question:list'] },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode, permissions: ['admin:ai:prompt:list'] },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: ScrollText, permissions: ['admin:ai:log:list'] },
  { label: '文件治理', path: '/admin/files', icon: FileText, permissions: ['admin:file:list'] }
]

const quickLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, desc: '维护 Java 面试题库', permissions: ['admin:question:list'] },
  { label: '题目审核', path: '/admin/question-reviews', icon: ClipboardList, desc: '处理 AI 生成题审核池', permissions: ['admin:question:review'] },
  { label: '去重审核', path: '/admin/question-duplicate-reviews', icon: Tags, desc: '处理疑似重复题', permissions: ['admin:question:dedupe'] },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode, desc: '治理 AI 提示词版本', permissions: ['admin:ai:prompt:list'] },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: Bot, desc: '排查失败调用', permissions: ['admin:ai:log:list'] },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings, desc: '维护运行参数', permissions: ['admin:system:config:list'] }
]

const summaryCards = computed(() => dashboard.value?.summaryCards || [])
const trendStats = computed(() => dashboard.value?.trendStats || [])
const pendingItems = computed(() => dashboard.value?.pendingItems || [])
const systemStatus = computed(() => dashboard.value?.systemStatus)
const services = computed(() =>
  (systemStatus.value?.services || []).filter((item) => String(item.status || '').toUpperCase() !== 'UNSUPPORTED')
)
const statusPanelStyle = computed(() => statusPanelHeight.value ? { height: statusPanelHeight.value + 'px' } : undefined)
const primaryLinkItems = computed(() => primaryLinks.filter((item) => authStore.hasAnyPermission(item.permissions)))
const quickLinkItems = computed(() => quickLinks.filter((item) => authStore.hasAnyPermission(item.permissions)))

const cardMeta: Record<string, { label: string; icon: any; tone: string }> = {
  users: { label: '用户数', icon: Users, tone: 'tone-blue' },
  resumes: { label: '简历数', icon: FileText, tone: 'tone-cyan' },
  interviews: { label: '面试数', icon: ShieldCheck, tone: 'tone-green' },
  studyPlans: { label: '学习计划数', icon: ClipboardList, tone: 'tone-violet' },
  aiCalls: { label: 'AI 调用数', icon: Bot, tone: 'tone-violet' },
  todayAiCalls: { label: '今日 AI 调用', icon: LineChart, tone: 'tone-blue' },
  pendingQuestionReviews: { label: '待审 AI 题', icon: ListTree, tone: 'tone-red' },
  failedResumeParses: { label: '解析失败简历', icon: FileText, tone: 'tone-red' }
}

const pendingRoutes: Record<string, string> = {
  pendingQuestionReviews: '/admin/question-reviews?reviewStatus=PENDING',
  duplicateQuestionReviews: '/admin/question-duplicate-reviews?reviewStatus=PENDING',
  promptVersions: '/admin/ai/prompts',
  failedAiCalls: '/admin/ai/logs',
  failedResumeParses: '/admin/files'
}

const cardHintMap: Record<string, string> = {
  pendingQuestionReviews: '题目审核池待处理数量',
  aiCalls: '累计 AI 调用记录',
  todayAiCalls: '今日 AI 调用记录',
  failedResumeParses: '待处理的简历解析失败记录'
}

const pendingLabels: Record<string, string> = {
  pendingQuestionReviews: '待审核 AI 生成题',
  duplicateQuestionReviews: '疑似重复题',
  promptVersions: 'Prompt 待发布 / 未激活版本',
  failedAiCalls: 'AI 调用失败',
  failedResumeParses: '简历解析失败'
}

const metrics = computed(() =>
  summaryCards.value.map((item) => {
    const meta = cardMeta[item.key] || { label: item.label || item.key, icon: LineChart, tone: 'tone-blue' }
    return {
      key: item.key,
      label: meta.label,
      value: item.value ?? 0,
      hint: cardHintMap[item.key] || item.label || '管理首页统计',
      icon: meta.icon,
      tone: meta.tone,
      path: pendingRoutes[item.key]
    }
  })
)

const baseChartTextStyle = {
  color: '#94a3b8',
  fontFamily: 'Inter, "Microsoft YaHei", sans-serif'
}

const numberList = (key: keyof AdminDashboardTrendStatVO) =>
  trendStats.value.map((item) => Number(item[key] || 0))

const buildLineOption = (legendData: string[], series: SeriesOption[]): EChartsOption => ({
  backgroundColor: 'transparent',
  color: ['#60a5fa', '#22d3ee', '#a78bfa', '#f87171'],
  tooltip: { trigger: 'axis' },
  legend: { data: legendData, right: 8, top: 0, textStyle: baseChartTextStyle },
  grid: { left: 10, right: 14, top: 34, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category',
    data: trendStats.value.map((item) => item.date),
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

const disposeCharts = () => {
  charts.splice(0).forEach((chart) => chart.dispose())
}

const renderCharts = async () => {
  await nextTick()
  disposeCharts()
  if (!trendStats.value.length) return
  if (businessTrendRef.value) {
    const chart = echarts.init(businessTrendRef.value)
    chart.setOption(
      buildLineOption(
        ['面试数', '简历上传', '学习计划'],
        [
          { name: '面试数', type: 'line', smooth: true, data: numberList('interviewCount') },
          { name: '简历上传', type: 'line', smooth: true, data: numberList('resumeUploadCount') },
          { name: '学习计划', type: 'line', smooth: true, data: numberList('studyPlanGeneratedCount') }
        ]
      )
    )
    charts.push(chart)
  }
  if (aiTrendRef.value) {
    const chart = echarts.init(aiTrendRef.value)
    chart.setOption(
      buildLineOption(
        ['AI 调用', 'AI 失败', '题目审核生成'],
        [
          { name: 'AI 调用', type: 'line', smooth: true, data: numberList('aiCallCount') },
          { name: 'AI 失败', type: 'line', smooth: true, data: numberList('aiCallFailedCount') },
          { name: '题目审核生成', type: 'line', smooth: true, data: numberList('questionReviewGeneratedCount') }
        ]
      )
    )
    charts.push(chart)
  }
}

const fetchOverview = async () => {
  loading.value = true
  overviewError.value = false
  try {
    dashboard.value = await getAdminDashboardOverviewApi()
  } catch {
    dashboard.value = null
    overviewError.value = true
  } finally {
    loading.value = false
  }
}

const formatDateTime = (value?: string) => {
  if (!value) return '暂无生成时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const statusText = (status?: string) => {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const map: Record<string, string> = {
    HEALTHY: '正常',
    DEGRADED: '降级',
    DOWN: '不可用',
    UNKNOWN: '未配置监控源',
    UNSUPPORTED: '待接入，不计入健康状态',
    SUPPORTED: '已支持'
  }
  return map[value] || status || '未配置监控源'
}

const statusTone = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'HEALTHY' || value === 'SUPPORTED') return 'healthy'
  if (value === 'DEGRADED') return 'degraded'
  if (value === 'DOWN' || value === 'ERROR') return 'down'
  return 'unknown'
}

const statusTagType = (status?: string) => {
  const tone = statusTone(status)
  if (tone === 'healthy') return 'success'
  if (tone === 'degraded' || tone === 'unknown') return 'warning'
  return 'danger'
}

const serviceLabel = (value: string) => {
  const map: Record<string, string> = {
    overview: '管理概览',
    database: '数据库',
    'codecoachai-gateway': 'Gateway 服务',
    'codecoachai-auth': 'Auth 服务',
    'codecoachai-user': 'User 服务',
    'codecoachai-resume': 'Resume 服务',
    'codecoachai-interview': 'Interview 服务',
    'codecoachai-question': 'Question 服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-task': 'Task 服务',
    'codecoachai-file': 'File 服务'
  }
  return map[value] || value
}

const pendingLabel = (item: AdminDashboardPendingItemVO) => pendingLabels[item.key] || item.label || item.key

const pendingSourceLabel = (item: AdminDashboardPendingItemVO) => {
  if (item.reason) return item.reason
  if (item.sourceTable) return `来源：${item.sourceTable}`
  return '来源：运行数据库'
}

const serviceReasonLabel = (item: AdminDashboardServiceStatusVO) => {
  if (item.reason) return item.reason
  if (item.source) return item.source
  const value = String(item.status || '').toUpperCase()
  if (value === 'UNKNOWN') return '后端未返回该服务的监控源或最近探测结果'
  if (value === 'UNSUPPORTED') return '该服务暂未配置运行态探测源，不计入核心健康状态'
  return '最近一次状态检查'
}

const goPending = (item: AdminDashboardPendingItemVO) => {
  const path = pendingRoutes[item.key]
  if (path) router.push(path)
}

const goMetric = (item: { path?: string }) => {
  if (item.path) router.push(item.path)
}

const syncDashboardPanelHeight = () => {
  const leftStack = dashboardLeftStackRef.value
  if (!leftStack || window.innerWidth <= 760) {
    statusPanelHeight.value = undefined
    return
  }
  statusPanelHeight.value = Math.ceil(leftStack.getBoundingClientRect().height)
}

const resizeCharts = () => charts.forEach((chart) => chart.resize())

const resizeDashboard = () => {
  resizeCharts()
  syncDashboardPanelHeight()
}

watch(trendStats, renderCharts, { deep: true })

onMounted(async () => {
  await fetchOverview()
  await renderCharts()
  await nextTick()
  syncDashboardPanelHeight()
  if (dashboardLeftStackRef.value) {
    dashboardLayoutObserver = new ResizeObserver(syncDashboardPanelHeight)
    dashboardLayoutObserver.observe(dashboardLeftStackRef.value)
  }
  window.addEventListener('resize', resizeDashboard)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeDashboard)
  dashboardLayoutObserver?.disconnect()
  dashboardLayoutObserver = null
  disposeCharts()
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

  .dashboard-alert {
    margin-bottom: 16px;
  }

  .dashboard-metric-card {
    min-height: 132px;

    &.is-clickable {
      cursor: pointer;
    }

    &.is-clickable:hover {
      border-color: rgba(96, 165, 250, 0.45);
      transform: translateY(-1px);
    }
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

  .dashboard-empty {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px;
    color: var(--app-text-muted);
  }

  .dashboard-chart-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    padding: 12px 20px 20px;
  }

  .dashboard-chart-card {
    min-width: 0;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: var(--app-radius);
    background: rgba(2, 6, 23, 0.34);
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
    height: 260px;
    margin-top: 10px;
  }

  .dashboard-lower-grid {
    align-items: start;
    grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.75fr);
  }

  .dashboard-left-stack {
    display: grid;
    align-self: start;
    gap: 16px;
  }

  .dashboard-status-panel {
    display: flex;
    align-self: start;
    min-height: 0;
    flex-direction: column;
  }

  .dashboard-pending-panel,
  .dashboard-links-panel {
    align-self: start;
  }

  .dashboard-pending-panel {
    min-height: 0;
  }

  .dashboard-work-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-work-item {
    align-items: flex-start;
    width: 100%;
    min-height: 86px;
    border-color: rgba(148, 163, 184, 0.13);
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;
  }

  .dashboard-work-item:hover {
    transform: translateY(-1px);
    border-color: rgba(96, 165, 250, 0.34);
    background: rgba(30, 41, 59, 0.68);
  }

  .dashboard-work-item small {
    display: block;
    margin-top: 5px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .dashboard-work-item strong {
    color: #fbbf24;
    font-size: 22px;
    line-height: 1;
  }

  .dashboard-status-list {
    display: grid;
    flex: 1;
    align-content: start;
    gap: 10px;
    min-height: 0;
    overflow: auto;
    padding: 14px 16px 16px;
    scrollbar-width: thin;
  }

  .dashboard-status-item {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 76px;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.56);
  }

  .dashboard-status-item svg {
    flex: 0 0 auto;
    color: #93c5fd;
  }

  .dashboard-status-item span,
  .dashboard-status-item small {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .dashboard-status-item strong {
    display: block;
    margin: 3px 0;
    font-size: 14px;
    line-height: 1.25;
  }

  .status-healthy {
    color: #86efac;
  }

  .status-degraded,
  .status-unknown {
    color: #fde68a;
  }

  .status-down {
    color: #fca5a5;
  }

  .dashboard-link-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dashboard-link-arrow {
    color: var(--app-text-muted);
  }
}

@media (max-width: 1200px) {
  .admin-dashboard-page {
    .dashboard-chart-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-link-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .dashboard-work-list {
      grid-template-columns: 1fr;
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

    .dashboard-lower-grid,
    .dashboard-left-stack,
    .dashboard-link-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-status-panel {
      height: auto !important;
    }

    .dashboard-chart {
      height: 220px;
    }
  }
}
</style>
