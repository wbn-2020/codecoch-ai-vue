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
          统计数据来自管理概览接口，按当前数据库实时聚合；接口异常时仅展示异常与空状态，不回退到假数据。
        </p>
        <div class="dashboard-hero__notice">
          <Database :size="16" />
          <span>{{ dashboard?.dataSourceDesc || 'GET /admin/dashboard/overview' }}</span>
          <span class="notice-divider"></span>
          <Clock3 :size="16" />
          <span>生成时间：{{ formatDateTime(dashboard?.generatedAt) }}</span>
        </div>
      </div>
      <div class="admin-hero__actions">
        <el-button v-for="item in primaryLinks" :key="item.path" type="primary" plain @click="router.push(item.path)">
          <component :is="item.icon" :size="15" />
          {{ item.label }}
        </el-button>
      </div>
    </section>

    <el-alert
      v-if="overviewError"
      class="dashboard-alert"
      title="统计接口异常"
      description="GET /admin/dashboard/overview 请求失败，当前页面不会回退到伪造数据。"
      type="error"
      show-icon
      :closable="false"
    />

    <div class="admin-metric-grid" v-loading="loading">
      <article v-for="item in metrics" :key="item.key" class="admin-metric-card dashboard-metric-card">
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
          <h2>近 7 日真实趋势</h2>
          <p>趋势来自后端 trendStats，空数据按 0 展示。</p>
        </div>
        <el-tag type="success" effect="plain">真实接口</el-tag>
      </div>

      <div v-if="!trendStats.length && !loading" class="dashboard-empty">
        <LineChart :size="18" />
        <span>统计接口未返回趋势数据</span>
      </div>
      <div v-else class="dashboard-chart-grid">
        <article class="dashboard-chart-card dashboard-chart-card--wide">
          <div class="dashboard-card-title">
            <div>
              <h3>面试 / 简历 / 学习计划趋势</h3>
              <p>interviewCount、resumeUploadCount、studyPlanGeneratedCount</p>
            </div>
          </div>
          <div ref="businessTrendRef" class="dashboard-chart"></div>
        </article>
        <article class="dashboard-chart-card dashboard-chart-card--wide">
          <div class="dashboard-card-title">
            <div>
              <h3>AI 调用与失败趋势</h3>
              <p>aiCallCount、aiCallFailedCount、questionReviewGeneratedCount</p>
            </div>
          </div>
          <div ref="aiTrendRef" class="dashboard-chart"></div>
        </article>
      </div>
    </section>

    <div class="admin-dashboard-grid dashboard-lower-grid">
      <section class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <h2>待处理事项</h2>
            <p>全部待办来自 pendingItems，unsupported/unknown 状态按原样展示。</p>
          </div>
          <el-tag type="success" effect="plain">真实待办</el-tag>
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
              <small>{{ item.reason || item.sourceTable || 'runtime database' }}</small>
            </div>
            <strong>{{ item.count ?? 0 }}</strong>
          </button>
          <el-empty v-if="!pendingItems.length && !loading" description="统计接口未返回待处理事项" />
        </div>
      </section>

      <section class="admin-panel">
        <div class="admin-panel__header">
          <div>
            <h2>系统状态</h2>
            <p>状态来自 systemStatus。UNKNOWN / unsupported 不会被伪装为正常。</p>
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
              <small>{{ item.reason || item.source || '-' }}</small>
            </div>
          </div>
          <el-empty v-if="!services.length && !loading" description="统计接口未返回系统状态" />
        </div>
      </section>
    </div>

    <section class="admin-panel">
      <div class="admin-panel__header">
        <div>
          <h2>快捷入口</h2>
          <p>全部入口指向当前已存在的管理端路由。</p>
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
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
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
import type {
  AdminDashboardOverviewVO,
  AdminDashboardPendingItemVO,
  AdminDashboardServiceStatusVO,
  AdminDashboardTrendStatVO
} from '@/types/dashboard'

const router = useRouter()
const loading = ref(false)
const overviewError = ref(false)
const dashboard = ref<AdminDashboardOverviewVO | null>(null)
const businessTrendRef = ref<HTMLElement>()
const aiTrendRef = ref<HTMLElement>()
const charts: echarts.ECharts[] = []

const primaryLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: ScrollText },
  { label: '文件治理', path: '/admin/files', icon: FileText }
]

const quickLinks = [
  { label: '题目管理', path: '/admin/questions', icon: ListTree, desc: '维护 Java 面试题库' },
  { label: '题目审核', path: '/admin/question-reviews', icon: ClipboardList, desc: '处理 AI 生成题审核池' },
  { label: '去重审核', path: '/admin/question-duplicate-reviews', icon: Tags, desc: '处理疑似重复题' },
  { label: 'Prompt 管理', path: '/admin/ai/prompts', icon: MessageSquareCode, desc: '治理 AI 提示词版本' },
  { label: 'AI 调用日志', path: '/admin/ai/logs', icon: Bot, desc: '排查失败调用' },
  { label: '系统配置', path: '/admin/system/configs', icon: Settings, desc: '维护运行参数' }
]

const summaryCards = computed(() => dashboard.value?.summaryCards || [])
const trendStats = computed(() => dashboard.value?.trendStats || [])
const pendingItems = computed(() => dashboard.value?.pendingItems || [])
const systemStatus = computed(() => dashboard.value?.systemStatus)
const services = computed(() => systemStatus.value?.services || [])

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
  pendingQuestionReviews: '/admin/question-reviews',
  duplicateQuestionReviews: '/admin/question-duplicate-reviews',
  promptVersions: '/admin/ai/prompts',
  failedAiCalls: '/admin/ai/logs',
  failedResumeParses: '/admin/files'
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
      hint: item.sourceTable ? `来源：${item.sourceTable}` : '来源：管理概览接口',
      icon: meta.icon,
      tone: meta.tone
    }
  })
)

const baseChartTextStyle = {
  color: '#94a3b8',
  fontFamily: 'Inter, "Microsoft YaHei", sans-serif'
}

const numberList = (key: keyof AdminDashboardTrendStatVO) =>
  trendStats.value.map((item) => Number(item[key] || 0))

const buildLineOption = (legendData: string[], series: echarts.SeriesOption[]): echarts.EChartsOption => ({
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
  if (!value) return '--'
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
    UNKNOWN: '未知 / 暂不支持',
    SUPPORTED: '已支持'
  }
  return map[value] || status || '未知 / 暂不支持'
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
    overview: '概览接口',
    database: '数据库',
    'codecoachai-gateway': 'Gateway',
    'codecoachai-auth': 'Auth 服务',
    'codecoachai-user': 'User 服务',
    'codecoachai-resume': 'Resume 服务',
    'codecoachai-interview': 'Interview 服务',
    'codecoachai-question': 'Question 服务',
    'codecoachai-ai': 'AI 服务',
    'codecoachai-file': 'File 服务'
  }
  return map[value] || value
}

const pendingLabel = (item: AdminDashboardPendingItemVO) => pendingLabels[item.key] || item.label || item.key

const goPending = (item: AdminDashboardPendingItemVO) => {
  const path = pendingRoutes[item.key]
  if (path) router.push(path)
}

const resizeCharts = () => charts.forEach((chart) => chart.resize())

watch(trendStats, renderCharts, { deep: true })

onMounted(async () => {
  await fetchOverview()
  await renderCharts()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
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
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  }

  .dashboard-work-list {
    gap: 10px;
  }

  .dashboard-work-item {
    align-items: flex-start;
    width: 100%;
    border: 0;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
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
    align-items: flex-start;
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

  .dashboard-status-item span,
  .dashboard-status-item small {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  .dashboard-status-item strong {
    display: block;
    margin: 4px 0;
    font-size: 14px;
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
    grid-template-columns: repeat(6, minmax(0, 1fr));
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
    .dashboard-link-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-chart {
      height: 220px;
    }
  }
}
</style>
