<template>
  <div class="dashboard-page">
    <section class="dashboard-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow">
          <Sparkles :size="16" />
          <span>AI Java Interview Workspace</span>
        </div>
        <h1>欢迎回来，{{ displayName }}</h1>
        <p>
          这里展示当前账号的真实简历、面试、学习计划与今日任务数据；接口异常时保留入口和空状态，不使用伪造数据。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="go('/interviews/create')">
            <PlayCircle :size="18" />
            开始 AI 模拟面试
          </el-button>
          <el-button size="large" @click="go('/resumes')">
            <FileText :size="18" />
            进入简历中心
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="panel-header">
          <span>Dashboard Overview</span>
          <span class="status-pill status-pill--info">真实用户数据</span>
        </div>
        <div class="terminal-card">
          <div class="terminal-dots" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <code>
            <span>$ codecoach dashboard --user=current</span>
            <span>generatedAt: {{ formatDateTime(overview?.generatedAt) }}</span>
            <span>resumeCount: {{ overview?.resumeCount ?? 0 }}</span>
            <span>interviewCount: {{ overview?.interviewCount ?? 0 }}</span>
            <span>todayTasks: {{ overview?.todayCompletedTaskCount ?? 0 }}/{{ overview?.todayTaskCount ?? 0 }}</span>
          </code>
        </div>
      </div>
    </section>

    <section v-if="overviewError" class="dashboard-alert">
      <AlertTriangle :size="18" />
      <span>工作台概览接口异常，当前页面不会回退到假数据。</span>
      <el-button text @click="fetchOverview">重试</el-button>
    </section>

    <section class="metric-grid dashboard-metrics" v-loading="overviewLoading">
      <button
        v-for="item in metrics"
        :key="item.label"
        class="metric-card metric-card--interactive"
        type="button"
        :disabled="item.disabled"
        @click="item.path && go(item.path)"
      >
        <span class="metric-card__icon" :class="item.tone">
          <component :is="item.icon" :size="20" />
        </span>
        <span class="metric-card__label">{{ item.label }}</span>
        <strong class="metric-card__value">{{ item.value }}</strong>
        <span class="metric-card__hint">{{ item.hint }}</span>
      </button>
    </section>

    <section class="dashboard-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">Quick Actions</p>
          <h2>核心训练入口</h2>
        </div>
        <span class="section-note">入口状态来自 dashboard entryStatuses</span>
      </div>

      <div class="action-grid">
        <button v-for="item in actionCards" :key="item.title" class="action-card" type="button" @click="go(item.path)">
          <span class="action-card__icon" :class="item.tone">
            <component :is="item.icon" :size="22" />
          </span>
          <span class="action-card__content">
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
          </span>
          <span class="status-pill">{{ item.badge }}</span>
        </button>
      </div>
    </section>

    <div class="dashboard-main-grid">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Resume</p>
            <h2>最近简历状态</h2>
          </div>
          <el-button text @click="go('/resumes')">查看简历</el-button>
        </div>

        <div class="info-list">
          <article class="info-item">
            <FileText :size="18" />
            <div>
              <strong>最近解析</strong>
              <span>{{ resumeParseText }}</span>
              <small>{{ formatDateTime(overview?.recentResumeParse?.updatedAt) }}</small>
            </div>
          </article>
          <article class="info-item">
            <BrainCircuit :size="18" />
            <div>
              <strong>最近优化</strong>
              <span>{{ resumeOptimizeText }}</span>
              <small>{{ formatDateTime(overview?.recentResumeOptimize?.updatedAt) }}</small>
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Study Plan</p>
            <h2>学习计划与今日任务</h2>
          </div>
          <el-button text @click="go('/study-plans')">查看计划</el-button>
        </div>

        <div class="study-summary">
          <div>
            <span>今日任务</span>
            <strong>{{ overview?.todayCompletedTaskCount ?? 0 }}/{{ overview?.todayTaskCount ?? 0 }}</strong>
          </div>
          <div>
            <span>计划总数</span>
            <strong>{{ overview?.studyPlanCount ?? 0 }}</strong>
          </div>
        </div>
        <div v-if="overview?.activeStudyPlan" class="active-plan" @click="go(`/study-plans?planId=${overview.activeStudyPlan.planId}`)">
          <strong>{{ overview.activeStudyPlan.planTitle || `学习计划 #${overview.activeStudyPlan.planId}` }}</strong>
          <span>{{ overview.activeStudyPlan.doneTaskCount || 0 }}/{{ overview.activeStudyPlan.totalTaskCount || 0 }} · {{ overview.activeStudyPlan.progressPercent || 0 }}%</span>
        </div>
        <el-empty v-else description="暂无进行中的学习计划" />
      </section>
    </div>

    <div class="dashboard-main-grid">
      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Recent Interview</p>
            <h2>最近面试 / 报告</h2>
          </div>
          <el-button text @click="go('/interviews/history')">查看历史</el-button>
        </div>

        <div class="info-list">
          <button
            v-if="overview?.recentInterview"
            class="info-item info-item--button"
            type="button"
            @click="go(`/interviews/${overview.recentInterview.interviewId}`)"
          >
            <Clock3 :size="18" />
            <div>
              <strong>{{ overview.recentInterview.title || '未命名面试' }}</strong>
              <span>{{ formatStatus(overview.recentInterview.status) }} · 报告 {{ formatStatus(overview.recentInterview.reportStatus) }}</span>
              <small>{{ formatDateTime(overview.recentInterview.updatedAt) }}</small>
            </div>
          </button>
          <el-empty v-else description="暂无最近面试记录" />

          <button
            v-if="overview?.recentReport"
            class="info-item info-item--button"
            type="button"
            @click="go(`/interviews/${overview.recentReport.interviewId}/report`)"
          >
            <History :size="18" />
            <div>
              <strong>最近报告</strong>
              <span>{{ formatStatus(overview.recentReport.status) }} · {{ overview.recentReport.totalScore ?? '--' }} 分</span>
              <small>{{ formatDateTime(overview.recentReport.generatedAt) }}</small>
            </div>
          </button>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Entry Status</p>
            <h2>推荐入口状态</h2>
          </div>
        </div>

        <div class="entry-list">
          <article v-for="item in entryStatuses" :key="item.key" class="entry-item">
            <Route :size="18" />
            <div>
              <strong>{{ entryLabel(item.key) }}</strong>
              <span>{{ entryStatusText(item.status) }}</span>
              <small>{{ item.reason || '-' }}</small>
            </div>
          </article>
          <el-empty v-if="!entryStatuses.length" description="概览接口未返回推荐入口状态" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  BookOpenCheck,
  BrainCircuit,
  Clock3,
  FileText,
  History,
  PlayCircle,
  RefreshCcw,
  Route,
  Sparkles,
  Star,
  Target
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { getUserDashboardOverviewApi } from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'
import type { UserDashboardEntryStatusVO, UserDashboardOverviewVO } from '@/types/dashboard'

interface MetricItem {
  label: string
  value: string | number
  hint: string
  icon: Component
  tone: string
  path?: string
  disabled?: boolean
}

const router = useRouter()
const authStore = useAuthStore()
const overviewLoading = ref(false)
const overviewError = ref(false)
const overview = ref<UserDashboardOverviewVO | null>(null)

const displayName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户')
const entryStatuses = computed(() => overview.value?.entryStatuses || [])

const metrics = computed<MetricItem[]>(() => [
  {
    label: '简历数量',
    value: overview.value?.resumeCount ?? 0,
    hint: '来自用户 dashboard 概览',
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    label: '面试总数',
    value: overview.value?.interviewCount ?? 0,
    hint: '仅统计当前用户',
    icon: Target,
    tone: 'tone-blue',
    path: '/interviews/history'
  },
  {
    label: '学习计划',
    value: overview.value?.studyPlanCount ?? 0,
    hint: '来自 study_plan',
    icon: Route,
    tone: 'tone-purple',
    path: '/study-plans'
  },
  {
    label: '今日任务',
    value: `${overview.value?.todayCompletedTaskCount ?? 0}/${overview.value?.todayTaskCount ?? 0}`,
    hint: '按 plannedDate=今日统计',
    icon: BookOpenCheck,
    tone: 'tone-green',
    path: '/study-plans'
  },
  {
    label: '最近报告分',
    value: overview.value?.recentReport?.totalScore ?? '--',
    hint: overview.value?.recentReport ? '来自最近报告' : '暂无报告',
    icon: BrainCircuit,
    tone: 'tone-purple',
    disabled: !overview.value?.recentReport
  },
  {
    label: '最近解析',
    value: overview.value?.recentResumeParse?.parseStatus || '--',
    hint: overview.value?.recentResumeParse?.fileName || '暂无解析记录',
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/resumes'
  }
])

const actionCards = computed(() => [
  {
    title: '开始 AI 模拟面试',
    desc: '进入真实创建面试流程',
    icon: PlayCircle,
    tone: 'tone-blue',
    path: '/interviews/create',
    badge: entryStatusText(findEntryStatus('interview')?.status)
  },
  {
    title: '简历中心 / 优化入口',
    desc: resumeOptimizeText.value,
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes',
    badge: entryStatusText(findEntryStatus('resume')?.status)
  },
  {
    title: '题库练习',
    desc: '按真实题库接口进行刷题训练',
    icon: BookOpenCheck,
    tone: 'tone-purple',
    path: '/questions',
    badge: '可用'
  },
  {
    title: '错题复盘',
    desc: '查看真实错题记录',
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/questions/wrong-records',
    badge: '可用'
  },
  {
    title: '收藏题目',
    desc: '沉淀高频重点题',
    icon: Star,
    tone: 'tone-green',
    path: '/questions/favorites',
    badge: '可用'
  },
  {
    title: '学习计划',
    desc: activePlanText.value,
    icon: Route,
    tone: 'tone-purple',
    path: '/study-plans',
    badge: entryStatusText(findEntryStatus('studyPlan')?.status)
  }
])

const resumeParseText = computed(() => {
  const item = overview.value?.recentResumeParse
  if (!item) return '暂无简历解析记录'
  return `${item.fileName || '未命名文件'} · ${item.parseStatus || 'UNKNOWN'}`
})

const resumeOptimizeText = computed(() => {
  const item = overview.value?.recentResumeOptimize
  if (!item) return '暂无最近优化记录'
  return `最近优化状态：${item.optimizeStatus || 'UNKNOWN'}`
})

const activePlanText = computed(() => {
  const plan = overview.value?.activeStudyPlan
  if (!plan) return '暂无 active 计划，可从报告生成'
  return `${plan.planTitle || `学习计划 #${plan.planId}`} · ${plan.progressPercent || 0}%`
})

const findEntryStatus = (key: string) => entryStatuses.value.find((item) => item.key === key)

const go = (path: string) => {
  router.push(path)
}

const formatStatus = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    TODO: '待处理',
    AVAILABLE: '可用',
    CONTINUE: '可继续',
    NOT_STARTED: '未开始',
    IN_PROGRESS: '进行中',
    WAITING_ANSWER: '待作答',
    AI_EVALUATING: 'AI 评分中',
    REPORT_GENERATING: '报告生成中',
    GENERATED: '已生成',
    COMPLETED: '已完成',
    FINISHED: '已完成',
    FAILED: '失败'
  }
  return map[value] || status || '未知'
}

const entryStatusText = (status?: string) => formatStatus(status || 'TODO')

const entryLabel = (key: string) => {
  const map: Record<string, string> = {
    resume: '简历入口',
    interview: '面试入口',
    studyPlan: '学习计划入口'
  }
  return map[key] || key
}

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const fetchOverview = async () => {
  overviewLoading.value = true
  overviewError.value = false
  try {
    overview.value = await getUserDashboardOverviewApi()
  } catch {
    overview.value = null
    overviewError.value = true
  } finally {
    overviewLoading.value = false
  }
}

onMounted(fetchOverview)
</script>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-hero,
.dashboard-section,
.dashboard-alert {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.64)),
    rgba(15, 23, 42, 0.76);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.dashboard-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 24px;
  overflow: hidden;
  padding: 28px;
}

.hero-copy h1 {
  margin: 14px 0 0;
  color: #f8fafc;
  font-size: 42px;
  font-weight: 800;
  line-height: 1.12;
}

.hero-copy p {
  max-width: 680px;
  margin: 18px 0 0;
  color: #cbd5e1;
  font-size: 15px;
  line-height: 1.8;
}

.hero-eyebrow,
.section-kicker,
.metric-card__icon,
.action-card__icon,
.info-item svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.hero-eyebrow {
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  background: rgba(2, 6, 23, 0.54);
}

.panel-header,
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel-header {
  color: var(--app-text-muted);
  font-size: 12px;
}

.terminal-card {
  min-height: 180px;
  padding: 16px;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.72);
}

.terminal-dots {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
}

.terminal-dots span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.42);
}

.terminal-dots span:first-child {
  background: #f87171;
}

.terminal-dots span:nth-child(2) {
  background: #fbbf24;
}

.terminal-dots span:nth-child(3) {
  background: #34d399;
}

.terminal-card code {
  display: grid;
  gap: 10px;
  color: #a7f3d0;
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: normal;
}

.dashboard-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: #fed7aa;
}

.dashboard-metrics {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.metric-card--interactive {
  display: flex;
  min-height: 166px;
  flex-direction: column;
  align-items: flex-start;
  border: 1px solid var(--app-border);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.metric-card--interactive:disabled {
  cursor: not-allowed;
}

.metric-card__icon,
.action-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.metric-card__label {
  margin-top: 16px;
}

.metric-card__hint {
  margin-top: auto;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.dashboard-section {
  padding: 20px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 4px 0 0;
  color: #f8fafc;
  font-size: 18px;
}

.section-kicker {
  margin: 0;
  color: var(--cc-ai-cyan);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.section-note {
  color: var(--app-text-muted);
  font-size: 12px;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.action-card,
.info-item,
.entry-item,
.active-plan {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.58);
  color: var(--app-text);
}

.action-card {
  min-height: 118px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
}

.action-card__content {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 6px;
}

.action-card__content strong,
.info-item strong,
.entry-item strong,
.active-plan strong {
  color: #f8fafc;
}

.action-card__content span,
.info-item span,
.entry-item span,
.active-plan span {
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.status-pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #cbd5e1;
  font-size: 12px;
  white-space: nowrap;
}

.status-pill--info {
  border-color: rgba(34, 211, 238, 0.28);
  background: rgba(6, 182, 212, 0.12);
  color: #67e8f9;
}

.dashboard-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 1fr);
  gap: 18px;
}

.info-list,
.entry-list {
  display: grid;
  gap: 10px;
}

.info-item,
.entry-item,
.active-plan {
  padding: 14px;
}

.info-item--button,
.active-plan {
  text-align: left;
  cursor: pointer;
}

.info-item div,
.entry-item div,
.active-plan {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.info-item small,
.entry-item small {
  color: var(--app-text-muted);
  font-size: 12px;
}

.study-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}

.study-summary div {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
}

.study-summary span {
  display: block;
  color: var(--app-text-muted);
  font-size: 12px;
}

.study-summary strong {
  display: block;
  margin-top: 6px;
  color: #f8fafc;
  font-size: 24px;
}

.tone-blue {
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
}

.tone-purple {
  background: rgba(139, 92, 246, 0.14);
  color: #c4b5fd;
}

.tone-cyan {
  background: rgba(6, 182, 212, 0.14);
  color: #67e8f9;
}

.tone-amber {
  background: rgba(245, 158, 11, 0.14);
  color: #fcd34d;
}

.tone-green {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

@media (max-width: 1280px) {
  .dashboard-metrics,
  .action-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .dashboard-hero,
  .dashboard-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .dashboard-hero,
  .dashboard-section {
    padding: 16px;
  }

  .dashboard-metrics,
  .action-grid,
  .study-summary {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .section-heading,
  .dashboard-alert {
    flex-direction: column;
  }
}
</style>
