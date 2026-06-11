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
          汇总题库、简历、面试、AI 运行和系统运行状态，帮助运营人员快速定位待处理事项。
        </p>
        <div class="dashboard-hero__notice">
          <Database :size="16" />
          <span>{{ dashboardSourceText }}</span>
          <span class="notice-divider"></span>
          <Clock3 :size="16" />
          <span>生成时间：{{ dashboardGeneratedAtText }}</span>
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
      :description="overviewErrorDescription"
      type="error"
      show-icon
      :closable="false"
    >
      <template #default>
        <el-button text type="primary" :loading="loading" @click="fetchOverview">重试</el-button>
      </template>
    </el-alert>

    <div class="admin-metric-grid" v-loading="loading">
      <AppState
        v-if="!metrics.length && !loading"
        class="dashboard-grid-state"
        :type="overviewEmptyType"
        :title="overviewEmptyTitle"
        :description="overviewEmptyDescription"
      >
        <el-button type="primary" plain :loading="loading" @click="fetchOverview">重新加载</el-button>
      </AppState>
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
          <strong class="admin-metric-card__value">{{ item.displayValue }}</strong>
          <span class="admin-metric-card__hint">{{ item.hint }}</span>
        </div>
      </article>
    </div>

    <section class="admin-panel dashboard-mobile-watch-panel">
      <div class="admin-panel__header dashboard-watch-header">
        <div>
          <h2>移动值班速览</h2>
          <p>只读查看告警、失败任务和 AI 异常；重试、禁用、删除等写操作请切到桌面端处理。</p>
        </div>
        <el-tag type="warning" effect="plain">只读巡检</el-tag>
      </div>
      <div class="dashboard-watch-grid">
        <button
          v-for="item in mobileWatchItems"
          :key="item.key"
          class="dashboard-watch-item"
          type="button"
          @click="router.push(item.path)"
        >
          <span class="dashboard-watch-item__icon" :class="item.tone">
            <component :is="item.icon" :size="18" />
          </span>
          <span class="dashboard-watch-item__main">
            <strong>{{ item.label }}</strong>
            <small>{{ item.hint }}</small>
          </span>
          <span class="dashboard-watch-item__count">{{ item.displayValue }}</span>
        </button>
        <AppState
          v-if="!mobileWatchItems.length && !loading"
          :type="overviewEmptyType"
          :title="mobileWatchEmptyTitle"
          :description="mobileWatchEmptyDescription"
        >
          <el-button v-if="overviewError" type="primary" plain :loading="loading" @click="fetchOverview">重新加载</el-button>
        </AppState>
      </div>
    </section>

    <section class="admin-panel dashboard-screen-panel">
      <div class="admin-panel__header dashboard-panel-header">
        <div>
          <h2>近 7 日趋势</h2>
          <p>观察面试、简历、学习计划和 AI 运行的近期变化。</p>
        </div>
        <el-tag type="success" effect="plain">已更新</el-tag>
      </div>

      <AppState
        v-if="!trendStats.length && !loading"
        class="dashboard-empty-state"
        :type="trendEmptyType"
        :title="trendEmptyTitle"
        :description="trendEmptyDescription"
      >
        <el-button v-if="overviewError" type="primary" plain :loading="loading" @click="fetchOverview">重新加载</el-button>
      </AppState>
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
              <h3>AI 运行与失败趋势</h3>
              <p>AI 运行、失败运行和题目审核生成数量</p>
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
              v-for="item in visiblePendingItems"
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
            <AppState
              v-if="!visiblePendingItems.length && !loading"
              :type="pendingEmptyType"
              :title="pendingEmptyTitle"
              :description="pendingEmptyDescription"
            >
              <el-button v-if="overviewError" type="primary" plain :loading="loading" @click="fetchOverview">重新加载</el-button>
            </AppState>
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
            <AppState
              v-if="!quickLinkItems.length && !loading"
              type="disabled"
              title="暂无可访问的快捷入口"
              description="当前账号缺少后台快捷入口权限。请联系管理员分配用户、题库、AI 运行记录、任务或系统配置相关权限。"
            />
          </div>
        </section>
      </div>

      <section class="admin-panel dashboard-status-panel" :style="statusPanelStyle">
        <div class="admin-panel__header">
          <div>
            <h2>系统状态</h2>
            <p>展示数据库和关键服务的最近探测结果。</p>
          </div>
          <el-tag :type="dashboardStatusTagType" effect="plain">
            {{ dashboardStatusText }}
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
          <AppState
            v-if="!services.length && !loading"
            :type="serviceEmptyType"
            :title="serviceEmptyTitle"
            :description="serviceEmptyDescription"
          >
            <el-button type="primary" plain :loading="loading" @click="fetchOverview">重新加载</el-button>
            <el-button plain @click="router.push('/admin/ops/overview')">打开运维监控</el-button>
          </AppState>
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
  Timer,
  Tags,
  Bell,
  Gauge,
  Users
} from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { getAdminDashboardOverviewApi } from '@/api/dashboard'
import AppState from '@/components/common/AppState.vue'
import { canAccessAdminPermissions } from '@/router/adminAccess'
import { useAuthStore } from '@/stores/auth'
import type {
  AdminDashboardOverviewVO,
  AdminDashboardPendingItemVO,
  AdminDashboardServiceStatusVO,
  AdminDashboardTrendStatVO
} from '@/types/dashboard'
import type { ECharts, EChartsOption, SeriesOption } from '@/utils/echarts'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const overviewError = ref(false)
const overviewErrorMessage = ref('')
const overviewErrorTraceId = ref('')
const dashboard = ref<AdminDashboardOverviewVO | null>(null)
const businessTrendRef = ref<HTMLElement>()
const aiTrendRef = ref<HTMLElement>()
const dashboardLeftStackRef = ref<HTMLElement>()
const statusPanelHeight = ref<number>()
const charts: ECharts[] = []
let dashboardLayoutObserver: ResizeObserver | null = null
let dashboardMounted = false
let chartRenderSeq = 0
let echartsModulePromise: Promise<typeof import('@/utils/echarts')> | null = null

const primaryLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, permissions: ['admin:question:list'] },
  { label: '提示词管理', path: '/admin/ai/prompts', icon: MessageSquareCode, permissions: ['admin:ai:prompt:list'] },
  { label: 'AI 运行记录', path: '/admin/ai/logs', icon: ScrollText, permissions: ['admin:ai:log:list'] },
  { label: '文件治理', path: '/admin/files', icon: FileText, permissions: ['admin:file:list'] },
  { label: '失败任务', path: '/admin/async-tasks?status=FAILED', icon: Timer, permissions: ['admin:task:list'] }
]

const quickLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, desc: '维护 Java 面试题库', permissions: ['admin:question:list'] },
  { label: '题目审核', path: '/admin/question-reviews', icon: ClipboardList, desc: '处理 AI 生成题审核池', permissions: ['admin:question:review'] },
  { label: '去重审核', path: '/admin/question-duplicate-reviews', icon: Tags, desc: '处理疑似重复题', permissions: ['admin:question:dedupe'] },
  { label: '简历解析失败', path: '/admin/files?parseStatus=FAILED', icon: FileText, desc: '定位解析失败文件和失败原因', permissions: ['admin:file:list'] },
  { label: '提示词管理', path: '/admin/ai/prompts', icon: MessageSquareCode, desc: '治理 AI 提示词版本', permissions: ['admin:ai:prompt:list'] },
  { label: 'AI 运行记录', path: '/admin/ai/logs?status=FAILED', icon: Bot, desc: '排查失败运行', permissions: ['admin:ai:log:list'] },
  { label: '异步任务中心', path: '/admin/async-tasks?status=FAILED', icon: Timer, desc: '定位失败和死信任务', permissions: ['admin:task:list'] },
  { label: '慢 SQL Top', path: '/admin/slow-sql-logs', icon: Gauge, desc: '排查最近慢查询', permissions: ['admin:audit:slow-sql-log'] },
  { label: '生成效果分析', path: '/admin/analytics/agent', icon: LineChart, desc: '查看智能教练成功率和反馈', permissions: ['admin:analytics:agent'] },
  { label: '通知管理', path: '/admin/notices', icon: Bell, desc: '检查广播和用户通知', permissions: ['admin:notice:list'] },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings, desc: '维护运行参数', permissions: ['admin:system:config:list'] }
]

const summaryCards = computed(() => dashboard.value?.summaryCards || [])
const trendStats = computed(() => dashboard.value?.trendStats || [])
const pendingItems = computed(() => dashboard.value?.pendingItems || [])
const systemStatus = computed(() => dashboard.value?.systemStatus)
const services = computed(() =>
  (systemStatus.value?.services || []).filter((item) => String(item.status || '').toUpperCase() !== 'UNSUPPORTED')
)
const overviewEmptyType = computed(() => overviewError.value ? 'error' : 'empty')
const dashboardSourceText = computed(() => {
  if (overviewError.value) return '管理概览加载失败'
  return dashboard.value?.dataSourceDesc || '管理概览已更新'
})
const dashboardGeneratedAtText = computed(() => {
  if (overviewError.value) return '等待重新加载'
  return formatDateTime(dashboard.value?.generatedAt)
})
const overviewErrorDescription = computed(() => {
  const message = overviewErrorMessage.value || '暂时无法获取统计概览，请稍后重试或检查服务状态。'
  const trace = overviewErrorTraceId.value ? `诊断信息：${overviewErrorTraceId.value}` : '诊断信息已记录到后台诊断抽屉。'
  return `${message} ${trace}`
})
const overviewEmptyTitle = computed(() => overviewError.value ? '管理指标加载失败' : '暂无管理指标')
const overviewEmptyDescription = computed(() =>
  overviewError.value
    ? '本次没有拿到管理首页统计卡片，当前不能判断用户、简历、面试、AI 运行或失败任务是否真的为空。请重新加载后再做运营判断。'
    : '管理首页暂未返回统计卡片。可刷新概览，或进入用户、题库、AI 运行记录和任务中心分别核对。'
)
const mobileWatchEmptyTitle = computed(() => overviewError.value ? '移动巡检数据加载失败' : '暂无移动巡检入口')
const mobileWatchEmptyDescription = computed(() =>
  overviewError.value
    ? '本次没有拿到告警和失败任务数量，移动端只读巡检不应把 0 当作正常。请重新加载，或到桌面端打开对应诊断页核对。'
    : '当前账号没有可只读巡检的告警或任务入口。可联系管理员分配运维、AI 运行记录或异步任务查看权限。'
)
const trendEmptyType = computed(() => overviewError.value ? 'error' : 'empty')
const trendEmptyTitle = computed(() => overviewError.value ? '趋势数据加载失败' : '暂无趋势数据')
const trendEmptyDescription = computed(() =>
  overviewError.value
    ? '近 7 日趋势暂未返回，本次不能判断是没有运行记录，还是统计概览加载失败。请重新加载后再查看。'
    : '近 7 日暂未返回趋势点。可刷新概览，或分别查看面试、简历、学习计划和 AI 运行记录。'
)
const pendingEmptyType = computed(() => overviewError.value ? 'error' : 'empty')
const pendingEmptyTitle = computed(() => overviewError.value ? '待处理事项加载失败' : '当前没有待处理事项')
const pendingEmptyDescription = computed(() =>
  overviewError.value
    ? '题目审核、失败任务、AI 异常和通知发布数量暂未返回，本次不能判断是否真的没有待处理事项。请重新加载或进入对应诊断页核对。'
    : '题目审核、失败任务、AI 异常和通知发布等事项暂时为空。可刷新概览或进入对应诊断页继续排查。'
)
const serviceEmptyType = computed(() => overviewError.value ? 'error' : 'empty')
const serviceEmptyTitle = computed(() => overviewError.value ? '系统状态加载失败' : '暂无系统状态数据')
const serviceEmptyDescription = computed(() =>
  overviewError.value
    ? '系统状态检查暂未返回，当前不能把数据库或关键服务判断为正常。请重新加载，或到运维监控页查看更细的服务健康和失败任务。'
    : '系统状态检查暂未返回可展示服务。可刷新概览，或到运维监控页查看更细的服务健康和失败任务。'
)
const dashboardStatusText = computed(() => overviewError.value ? '加载失败' : statusText(systemStatus.value?.status))
const dashboardStatusTagType = computed(() => overviewError.value ? 'danger' : statusTagType(systemStatus.value?.status))
const statusPanelStyle = computed(() => statusPanelHeight.value ? { height: statusPanelHeight.value + 'px' } : undefined)
const canOpenAdminLink = (permissions: string[]) => canAccessAdminPermissions(permissions, authStore)
const primaryLinkItems = computed(() => primaryLinks.filter((item) => canOpenAdminLink(item.permissions)))
const quickLinkItems = computed(() => quickLinks.filter((item) => canOpenAdminLink(item.permissions)))

const cardMeta: Record<string, { label: string; icon: any; tone: string }> = {
  users: { label: '用户数', icon: Users, tone: 'tone-blue' },
  resumes: { label: '简历数', icon: FileText, tone: 'tone-cyan' },
  interviews: { label: '面试数', icon: ShieldCheck, tone: 'tone-green' },
  studyPlans: { label: '学习计划数', icon: ClipboardList, tone: 'tone-violet' },
  aiCalls: { label: 'AI 运行数', icon: Bot, tone: 'tone-violet' },
  todayAiCalls: { label: '今日 AI 运行', icon: LineChart, tone: 'tone-blue' },
  failedAiCalls: { label: '失败 AI 运行', icon: Bot, tone: 'tone-red' },
  pendingQuestionReviews: { label: '待审 AI 题', icon: ListTree, tone: 'tone-red' },
  failedResumeParses: { label: '解析失败简历', icon: FileText, tone: 'tone-red' },
  failedAsyncTasks: { label: '失败任务', icon: Timer, tone: 'tone-red' },
  agentSuccessRate: { label: '生成成功率', icon: LineChart, tone: 'tone-green' },
  slowSqlWarnings: { label: '慢 SQL 告警', icon: Gauge, tone: 'tone-red' },
  notificationFailures: { label: '通知发送失败', icon: Bell, tone: 'tone-red' }
}

const pendingRoutes: Record<string, { path: string; permissions: string[] }> = {
  pendingQuestionReviews: { path: '/admin/question-reviews?reviewStatus=PENDING', permissions: ['admin:question:review'] },
  duplicateQuestionReviews: { path: '/admin/question-duplicate-reviews?reviewStatus=PENDING', permissions: ['admin:question:dedupe'] },
  promptVersions: { path: '/admin/ai/prompts', permissions: ['admin:ai:prompt:list'] },
  failedAiCalls: { path: '/admin/ai/logs?status=FAILED', permissions: ['admin:ai:log:list'] },
  failedResumeParses: { path: '/admin/files?parseStatus=FAILED', permissions: ['admin:file:list'] },
  failedAsyncTasks: { path: '/admin/async-tasks?status=FAILED', permissions: ['admin:task:list'] },
  failedAgentRuns: { path: '/admin/agent/runs?status=FAILED', permissions: ['admin:agent:run:list'] },
  slowSqlWarnings: { path: '/admin/slow-sql-logs', permissions: ['admin:audit:slow-sql-log'] },
  notificationFailures: { path: '/admin/notices?sendStatus=FAILED', permissions: ['admin:notice:list'] }
}

const cardHintMap: Record<string, string> = {
  pendingQuestionReviews: '题目审核池待处理数量',
  aiCalls: '累计 AI 运行记录',
  todayAiCalls: '今日 AI 运行记录',
  failedAiCalls: '需要排查的 AI 运行失败记录',
  failedResumeParses: '待处理的简历解析失败记录',
  failedAsyncTasks: '需要排查或重试的异步任务',
  agentSuccessRate: '近 7 日智能教练成功 / 成功+失败',
  slowSqlWarnings: '近 7 日慢 SQL 捕获数量',
  notificationFailures: '通知写入或投递失败记录'
}

const pendingLabels: Record<string, string> = {
  pendingQuestionReviews: '待审核 AI 生成题',
  duplicateQuestionReviews: '疑似重复题',
  promptVersions: '提示词待发布 / 未激活版本',
  failedAiCalls: 'AI 运行失败',
  failedResumeParses: '简历解析失败',
  failedAsyncTasks: '异步任务失败',
  failedAgentRuns: '生成运行失败',
  slowSqlWarnings: '慢 SQL 告警',
  notificationFailures: '通知发送失败'
}

const cardValueSuffix: Record<string, string> = {
  agentSuccessRate: '%'
}

const mobileWatchDefinitions = [
  {
    key: 'failedAiCalls',
    label: 'AI 运行失败',
    path: '/admin/ai/logs?status=FAILED',
    icon: Bot,
    hint: '查看失败场景、模型、关联记录和追踪号',
    tone: 'tone-red',
    permissions: ['admin:ai:log:list']
  },
  {
    key: 'failedAsyncTasks',
    label: '失败任务',
    path: '/admin/async-tasks?status=FAILED',
    icon: Timer,
    hint: '定位任务编号、追踪号、关联功能和失败原因',
    tone: 'tone-red',
    permissions: ['admin:task:list']
  },
  {
    key: 'failedResumeParses',
    label: '简历解析失败',
    path: '/admin/files?parseStatus=FAILED',
    icon: FileText,
    hint: '查看失败文件、关联简历、解析记录和失败原因',
    tone: 'tone-red',
    permissions: ['admin:file:list']
  },
  {
    key: 'failedAgentRuns',
    label: '生成运行失败',
    path: '/admin/agent/runs?status=FAILED',
    icon: LineChart,
    hint: '排查近 7 日智能教练失败运行和任务明细',
    tone: 'tone-amber',
    permissions: ['admin:agent:run:list']
  },
  {
    key: 'slowSqlWarnings',
    label: '慢 SQL 告警',
    path: '/admin/slow-sql-logs',
    icon: Gauge,
    hint: '查看最近慢查询、Mapper 和耗时',
    tone: 'tone-amber',
    permissions: ['admin:audit:slow-sql-log']
  },
  {
    key: 'notificationFailures',
    label: '通知发送失败',
    path: '/admin/notices?sendStatus=FAILED',
    icon: Bell,
    hint: '检查通知投递失败和错误信息',
    tone: 'tone-red',
    permissions: ['admin:notice:list']
  }
]

const lookupDashboardCount = (key: string) => {
  const card = summaryCards.value.find((item) => item.key === key)
  if (card) return Number(card.value || 0)
  const pending = pendingItems.value.find((item) => item.key === key)
  return Number(pending?.count || 0)
}

const getAllowedPendingRoute = (key: string) => {
  const route = pendingRoutes[key]
  if (!route || !canOpenAdminLink(route.permissions)) return ''
  return route.path
}

const metrics = computed(() =>
  summaryCards.value.map((item) => {
    const meta = cardMeta[item.key] || { label: item.label || item.key, icon: LineChart, tone: 'tone-blue' }
    const value = item.value ?? 0
    return {
      key: item.key,
      label: meta.label,
      value,
      displayValue: `${value}${cardValueSuffix[item.key] || ''}`,
      hint: cardHintMap[item.key] || item.label || '管理首页统计',
      icon: meta.icon,
      tone: meta.tone,
      path: getAllowedPendingRoute(item.key)
    }
  })
)

const visiblePendingItems = computed(() =>
  pendingItems.value.filter((item) => !pendingRoutes[item.key] || Boolean(getAllowedPendingRoute(item.key)))
)

const mobileWatchItems = computed(() => {
  if (overviewError.value && !dashboard.value) return []
  return mobileWatchDefinitions
    .filter((item) => canOpenAdminLink(item.permissions))
    .map((item) => {
      const value = lookupDashboardCount(item.key)
      return {
        ...item,
        value,
        displayValue: `${value}${cardValueSuffix[item.key] || ''}`
      }
    })
})

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

const loadEcharts = () => {
  echartsModulePromise ||= import('@/utils/echarts')
  return echartsModulePromise
}

const renderCharts = async () => {
  const renderSeq = ++chartRenderSeq
  await nextTick()
  disposeCharts()
  if (!trendStats.value.length) return
  const { default: echarts } = await loadEcharts()
  if (!dashboardMounted || renderSeq !== chartRenderSeq) return
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
        ['AI 运行', 'AI 失败', '题目审核生成'],
        [
          { name: 'AI 运行', type: 'line', smooth: true, data: numberList('aiCallCount') },
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
  overviewErrorMessage.value = ''
  overviewErrorTraceId.value = ''
  try {
    dashboard.value = await getAdminDashboardOverviewApi()
  } catch (error) {
    dashboard.value = null
    overviewError.value = true
    overviewErrorMessage.value = getErrorMessage(error, '管理首页数据暂时加载失败，请稍后重试。')
    overviewErrorTraceId.value = getTraceId(error)
  } finally {
    loading.value = false
  }
}

const getTraceId = (error: unknown) => {
  if (!error || typeof error !== 'object') return ''
  const payload = error as { traceId?: unknown; response?: { data?: { traceId?: unknown } } }
  const traceId = payload.traceId || payload.response?.data?.traceId
  return typeof traceId === 'string' && traceId.trim() ? traceId.trim() : ''
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
    DEGRADED: '能力受限',
    DOWN: '不可用',
    UNKNOWN: '未配置监控源',
    UNSUPPORTED: '未纳入监控',
    SUPPORTED: '已支持'
  }
  return map[value] || '状态待确认'
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
    'codecoachai-gateway': '网关服务',
    'codecoachai-auth': '认证服务',
    'codecoachai-user': '用户服务',
    'codecoachai-resume': '简历服务',
    'codecoachai-interview': '面试服务',
    'codecoachai-question': '题库服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-task': '任务服务',
    'codecoachai-file': '文件服务'
  }
  return map[value] || '服务待确认'
}

const pendingLabel = (item: AdminDashboardPendingItemVO) => pendingLabels[item.key] || item.label || '待处理事项'

const pendingSourceLabel = (item: AdminDashboardPendingItemVO) => {
  if (item.reason) return item.reason
  if (item.sourceTable) return `来源：${item.sourceTable}`
  return '来源：运行数据库'
}

const serviceReasonLabel = (item: AdminDashboardServiceStatusVO) => {
  if (item.reason) return item.reason
  if (item.source) return item.source
  const value = String(item.status || '').toUpperCase()
  if (value === 'UNKNOWN') return '该服务暂未返回监控源或最近探测结果'
  if (value === 'UNSUPPORTED') return '该服务当前未纳入运行态探测，不计入核心健康状态'
  return '最近一次状态检查'
}

const goPending = (item: AdminDashboardPendingItemVO) => {
  const path = getAllowedPendingRoute(item.key)
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
  dashboardMounted = true
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
  dashboardMounted = false
  chartRenderSeq++
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

  .dashboard-grid-state,
  .dashboard-empty-state,
  .dashboard-watch-grid > :deep(.app-state),
  .dashboard-work-list > :deep(.app-state),
  .dashboard-status-list > :deep(.app-state) {
    grid-column: 1 / -1;
  }

  .dashboard-empty-state {
    margin: 0 20px 20px;
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

  .dashboard-mobile-watch-panel {
    margin-bottom: 16px;
  }

  .dashboard-watch-header {
    align-items: center;
  }

  .dashboard-watch-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 12px;
    padding: 0 20px 20px;
  }

  .dashboard-watch-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 88px;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.14);
    border-radius: 8px;
    background: rgba(15, 23, 42, 0.56);
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background 0.18s ease,
      transform 0.18s ease;
  }

  .dashboard-watch-item:hover {
    transform: translateY(-1px);
    border-color: rgba(96, 165, 250, 0.34);
    background: rgba(30, 41, 59, 0.68);
  }

  .dashboard-watch-item__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;

    &.tone-red {
      background: rgba(239, 68, 68, 0.14);
      color: #fca5a5;
    }

    &.tone-amber {
      background: rgba(245, 158, 11, 0.14);
      color: #fcd34d;
    }
  }

  .dashboard-watch-item__main {
    min-width: 0;

    strong,
    small {
      display: block;
    }

    strong {
      font-size: 14px;
      line-height: 1.35;
    }

    small {
      margin-top: 4px;
      color: var(--app-text-muted);
      font-size: 12px;
      line-height: 1.45;
    }
  }

  .dashboard-watch-item__count {
    min-width: 34px;
    color: #fbbf24;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    text-align: right;
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

    .dashboard-watch-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
    .dashboard-link-grid,
    .dashboard-watch-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-watch-grid {
      gap: 10px;
      padding: 0 14px 14px;
    }

    .dashboard-watch-item {
      min-height: 74px;
      padding: 10px;
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
