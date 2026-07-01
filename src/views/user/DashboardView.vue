<template>
  <div class="dashboard-page">
    <!-- Hero -->
    <section class="cc-glass dashboard-hero">
      <div class="hero-copy">
        <div class="hero-eyebrow">
          <Sparkles :size="16" />
          <span>今日重点</span>
        </div>
        <h1>欢迎回来，{{ displayName }}</h1>
        <p>
          先看今天最值得推进的准备动作，再进入简历、题库或模拟面试，不用在多个模块里自己找路。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="go('/agent/today')">
            <BookOpenCheck :size="18" />
            查看今日任务
          </el-button>
          <el-button size="large" @click="go(primaryNextAction.path)">
            <component :is="primaryNextAction.icon" :size="18" />
            {{ primaryNextAction.cta }}
          </el-button>
        </div>
      </div>

      <div class="hero-panel">
        <div class="panel-header">
          <span>今日准备概览</span>
          <span class="cc-badge cc-badge--streaming">
            <span class="cc-badge__dot"></span>
            账号概览
          </span>
        </div>
        <div class="cc-terminal">
          <div class="terminal-dots" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <code>
            <span>生成时间：{{ formatDateTime(overview?.generatedAt) }}</span>
            <span>今日任务：{{ todayDoneCount }}/{{ todayTotalCount }}</span>
            <span>默认下一步：{{ primaryNextAction.title }}</span>
            <span>错题复盘：{{ wrongQuestions.length }} 道待关注</span>
          </code>
        </div>
      </div>
    </section>

    <div v-loading="readinessLoading" class="dashboard-readiness">
      <NextActionBanner
        :action="readinessResult.nextAction"
        :notice="readinessError || readinessResult.sourceNotice"
        @open="go"
      />
      <ReadinessProgressPanel :result="readinessResult" @open="go" />
    </div>

    <!-- Error alert -->
    <section v-if="overviewError" class="cc-glass dashboard-alert">
      <AlertTriangle :size="18" />
      <span>{{ overviewErrorMessage || '工作台数据暂时加载失败，可以先使用快捷入口，或稍后重试。' }}</span>
      <el-button text @click="fetchOverview">重试</el-button>
    </section>

    <!-- Metrics -->
    <section class="metric-grid dashboard-metrics" v-loading="overviewLoading">
      <button
        v-for="item in metrics"
        :key="item.label"
        class="cc-glass metric-card metric-card--interactive"
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

    <!-- Today's Focus -->
    <section class="cc-glass dashboard-section today-focus-section" v-loading="todayActionsLoading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">今日闭环</p>
          <h2>今天先做这几件事</h2>
        </div>
        <el-button text @click="go('/notifications')">通知中心</el-button>
      </div>

      <div v-if="todayActionErrors.length" class="today-source-errors">
        <span v-for="error in todayActionErrors" :key="error">
          <AlertTriangle :size="14" />
          {{ error }}
        </span>
      </div>

      <div v-if="!todayFocusCards.length && todayActionErrors.length" class="dashboard-inline-error">
        <AlertTriangle :size="16" />
        <span>今日行动暂时无法完整生成，可以直接进入今日任务或通知中心。</span>
        <el-button text @click="refreshTodayActions">重试</el-button>
      </div>

      <div v-else class="today-focus-grid">
        <button
          v-for="item in todayFocusCards"
          :key="item.key"
          class="today-focus-card"
          type="button"
          @click="handleTodayActionClick(item)"
        >
          <span class="today-focus-card__index">{{ item.index }}</span>
          <span class="today-focus-card__content">
            <strong>{{ item.title }}</strong>
            <span>{{ item.desc }}</span>
            <small>{{ item.reason }}</small>
          </span>
          <span class="cc-badge" :class="badgeClass(item.badge)">{{ item.badge }}</span>
        </button>
      </div>
    </section>

    <!-- Career Insights -->
    <section
      v-if="careerInsightsVisible"
      class="cc-glass dashboard-section career-insight-section"
      v-loading="careerInsightsLoading"
    >
      <div class="section-heading">
        <div>
          <p class="section-kicker">本周求职洞察</p>
          <h2>最近 30 天优先改进</h2>
        </div>
        <el-button text @click="go('/analytics/personal')">查看完整洞察</el-button>
      </div>

      <div v-if="careerInsightActions.length" class="career-insight-grid">
        <button
          v-for="item in careerInsightActions"
          :key="item.key"
          class="career-insight-card"
          type="button"
          @click="go(item.actionPath)"
        >
          <span class="career-insight-card__content">
            <strong>{{ item.title }}</strong>
            <span>{{ item.description }}</span>
            <small>{{ item.evidence || item.unavailableReason || '来自最近求职数据。' }}</small>
          </span>
          <span class="cc-badge" :class="badgeClass(careerPriorityBadge(item.priority))">
            {{ careerPriorityBadge(item.priority) }}
          </span>
        </button>
      </div>
      <el-empty
        v-else
        :description="careerInsightsError || '继续记录投递和面试后，这里会生成趋势建议。'"
      />
    </section>

    <!-- Quick Actions -->
    <section class="cc-glass dashboard-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">快捷入口</p>
          <h2>核心训练入口</h2>
        </div>
        <span class="section-note">根据你的当前进度推荐</span>
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
          <span class="cc-badge" :class="badgeClass(item.badge)">{{ item.badge }}</span>
        </button>
      </div>
    </section>

    <!-- Main grid: Resume + Study Plan -->
    <div class="dashboard-main-grid">
      <section class="cc-glass dashboard-section">
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

      <section class="cc-glass dashboard-section">
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

    <!-- Main grid: Recent Interview + Wrong Questions -->
    <div class="dashboard-main-grid">
      <section class="cc-glass dashboard-section">
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

      <section class="cc-glass dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Wrong Questions</p>
            <h2>待复习错题</h2>
          </div>
          <el-button text @click="go('/questions/wrong-records')">查看全部</el-button>
        </div>

        <div v-if="wrongQuestionsLoading" v-loading="true" class="loading-placeholder"></div>
        <div v-else-if="wrongQuestionsError" class="dashboard-inline-error">
          <AlertTriangle :size="16" />
          <span>{{ wrongQuestionsError }}</span>
          <el-button text @click="fetchWrongQuestions">重试</el-button>
        </div>
        <div v-else-if="wrongQuestions.length" class="info-list">
          <button
            v-for="item in wrongQuestions"
            :key="item.wrongRecordId"
            class="info-item info-item--button"
            type="button"
            @click="go(`/questions/${item.questionId}`)"
          >
            <AlertTriangle :size="16" />
            <div>
              <strong>{{ item.title || `题目 #${item.questionId}` }}</strong>
              <span>错误次数 {{ item.wrongCount ?? 1 }} · {{ formatDateTime(item.lastWrongAt) }}</span>
            </div>
            <span class="cc-badge cc-badge--warning">待复习</span>
          </button>
        </div>
        <el-empty v-else description="暂无待复习错题" />
      </section>
    </div>

    <!-- Entry Status -->
    <section class="cc-glass dashboard-section">
      <div class="section-heading">
        <div>
          <p class="section-kicker">入口状态</p>
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
        <el-empty v-if="!entryStatuses.length" description="暂无推荐入口，完成简历或面试后会出现更多建议。" />
      </div>
    </section>
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

import { getTodayAgentTasksApi } from '@/api/agent'
import { getPersonalCareerInsightsApi } from '@/api/analytics'
import { getUserDashboardOverviewApi, getV3DashboardOverviewApi } from '@/api/dashboard'
import { getNotificationsApi, markNotificationReadApi, type NotificationVO } from '@/api/notification'
import { getWrongQuestionsApi } from '@/api/question'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import { getApplicationStatsApi, type JobApplicationStatsVO } from '@/api/v4'
import NextActionBanner from '@/components/job-readiness/NextActionBanner.vue'
import ReadinessProgressPanel from '@/components/job-readiness/ReadinessProgressPanel.vue'
import { appConfig } from '@/config'
import { buildReadinessResult } from '@/features/job-readiness/readiness'
import type { NextAction } from '@/features/job-readiness/types'
import {
  type CareerActionPriority,
  type CareerInsightOverviewVO,
  toDashboardCareerInsightItems
} from '@/features/career-insights'
import { defaultUserKnownPaths, resolveAppRoutePath } from '@/features/route-safety'
import { buildTodayActions } from '@/features/today-actions'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO } from '@/types/agent'
import type { UserDashboardEntryStatusVO, UserDashboardOverviewVO, V3DashboardOverviewVO } from '@/types/dashboard'
import type { WrongQuestionVO } from '@/types/question'
import type { SkillProfileOverviewVO } from '@/types/skillProfile'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'
import { notifyUnreadChanged } from '@/utils/notificationEvents'

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
const overviewErrorMessage = ref('')
const overview = ref<UserDashboardOverviewVO | null>(null)
const readinessLoading = ref(false)
const readinessError = ref('')
const v3Overview = ref<V3DashboardOverviewVO | null>(null)
const skillOverview = ref<SkillProfileOverviewVO | null>(null)

const wrongQuestionsLoading = ref(false)
const wrongQuestionsError = ref('')
const wrongQuestions = ref<WrongQuestionVO[]>([])
const agentTasksLoading = ref(false)
const agentTasksError = ref('')
const agentTasks = ref<AgentTaskVO[]>([])
const applicationStats = ref<JobApplicationStatsVO | null>(null)
const applicationStatsError = ref('')
const notificationsLoading = ref(false)
const notificationsError = ref('')
const notifications = ref<NotificationVO[]>([])
const careerInsightsLoading = ref(false)
const careerInsightsLoaded = ref(false)
const careerInsightsError = ref('')
const careerInsights = ref<CareerInsightOverviewVO | null>(null)

const displayName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户')
const entryStatuses = computed(() => overview.value?.entryStatuses || [])
const todayTotalCount = computed(() => agentTasks.value.length || overview.value?.todayTaskCount || 0)
const todayDoneCount = computed(() =>
  agentTasks.value.length
    ? agentTasks.value.filter((task) => task.status === 'DONE').length
    : overview.value?.todayCompletedTaskCount || 0
)
const applicationFollowUpCount = computed(() =>
  (applicationStats.value?.overdueFollowUpCount || 0) + (applicationStats.value?.dueTodayFollowUpCount || 0)
)
const applicationFollowUpPath = computed(() =>
  appConfig.enableV4Preview ? '/applications?followUp=due-today' : '/agent/today'
)
const todayActionsLoading = computed(() => agentTasksLoading.value || notificationsLoading.value)
const todayActionErrors = computed(() => [
  agentTasksError.value,
  applicationStatsError.value,
  notificationsError.value
].filter(Boolean))
const readinessResult = computed(() => buildReadinessResult({
  userOverview: overview.value,
  v3Overview: v3Overview.value,
  skillOverview: skillOverview.value,
  todayTasks: v3Overview.value
    ? {
        tasks: agentTasks.value,
        total: todayTotalCount.value,
        doneCount: todayDoneCount.value,
        todoCount: Math.max(todayTotalCount.value - todayDoneCount.value, 0)
      }
    : undefined
}))

const primaryNextAction = computed(() => {
  const firstTodo = agentTasks.value.find((task) => task.status !== 'DONE' && task.status !== 'SKIPPED')
  if (firstTodo) {
    const safeActionPath = resolveAppRoutePath(firstTodo.actionUrl, {
      fallbackPath: '/agent/today',
      enableV4Preview: appConfig.enableV4Preview,
      knownPaths: defaultUserKnownPaths
    }).path
    return {
      title: displayAgentTaskTitle(firstTodo),
      cta: '继续今日任务',
      path: safeActionPath,
      icon: BookOpenCheck
    }
  }

  if (!overview.value?.resumeCount) {
    return {
      title: '完善第一份简历',
      cta: '完善简历',
      path: '/resumes',
      icon: FileText
    }
  }

  if (!overview.value?.recentInterview) {
    return {
      title: '完成一次模拟面试',
      cta: '开始面试',
      path: '/interviews/create',
      icon: PlayCircle
    }
  }

  return {
    title: wrongQuestions.value.length ? '复盘最近错题' : '生成今日训练计划',
    cta: wrongQuestions.value.length ? '复盘错题' : '生成计划',
    path: wrongQuestions.value.length ? '/questions/wrong-records' : '/agent/today',
    icon: wrongQuestions.value.length ? RefreshCcw : BookOpenCheck
  }
})

const todayFocusCards = computed(() =>
  buildTodayActions({
    agentTasks: agentTasks.value,
    applicationStats: appConfig.enableV4Preview ? applicationStats.value : null,
    notifications: notifications.value,
    readinessAction: readinessResult.value.nextAction
  }, {
    notificationResolver: {
      enableV4Preview: appConfig.enableV4Preview
    }
  }).map((item, index) => ({
    key: item.key,
    index: index + 1,
    title: item.title,
    desc: item.description,
    reason: item.reason,
    path: item.actionPath,
    badge: item.priority === 'urgent' ? '紧急' : item.priority === 'high' ? '优先' : item.source === 'readiness' ? '下一步' : '待处理',
    source: item.source,
    notificationId: item.notificationId,
    unread: item.unread
  }))
)

const todayCareerInsightDedupeKeys = computed(() =>
  todayFocusCards.value.flatMap((item) => {
    if (item.key === 'application-follow-up-overdue') return ['application-follow-up:overdue']
    if (item.key === 'application-follow-up-due-today') return ['application-follow-up:due-today']
    if (item.source === 'readiness') return ['readiness:next-action']
    return []
  })
)

const careerInsightActions = computed(() =>
  toDashboardCareerInsightItems(careerInsights.value?.recommendedActions, {
    enableV4Preview: appConfig.enableV4Preview,
    maxItems: 3,
    existingDedupeKeys: todayCareerInsightDedupeKeys.value
  })
)

const careerInsightsVisible = computed(() =>
  careerInsightsLoading.value || careerInsightsLoaded.value || careerInsightActions.value.length > 0
)

const metrics = computed<MetricItem[]>(() => [
  {
    label: '投递跟进',
    value: applicationFollowUpCount.value,
    hint: appConfig.enableV4Preview
      ? `逾期 ${applicationStats.value?.overdueFollowUpCount || 0} · 今日 ${applicationStats.value?.dueTodayFollowUpCount || 0}`
      : 'V4 预览关闭，先进入今日任务',
    icon: Route,
    tone: 'tone-amber',
    path: applicationFollowUpPath.value,
    disabled: !appConfig.enableV4Preview && !applicationFollowUpCount.value
  },
  {
    label: '简历数量',
    value: overview.value?.resumeCount ?? 0,
    hint: '当前账号已有简历',
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    label: '面试总数',
    value: overview.value?.interviewCount ?? 0,
    hint: '你的历史面试记录',
    icon: Target,
    tone: 'tone-blue',
    path: '/interviews/history'
  },
  {
    label: '学习计划',
    value: overview.value?.studyPlanCount ?? 0,
    hint: '正在推进的计划',
    icon: Route,
    tone: 'tone-purple',
    path: '/study-plans'
  },
  {
    label: '今日任务',
    value: `${todayDoneCount.value}/${todayTotalCount.value}`,
    hint: '今天需要完成的任务',
    icon: BookOpenCheck,
    tone: 'tone-green',
    path: '/agent/today'
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
    label: '待复习错题',
    value: wrongQuestions.value.length,
    hint: '需要复习的错题数',
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/questions/wrong-records'
  }
])

const actionCards = computed(() => [
  {
    title: '今日投递跟进',
    desc: applicationStatsError.value
      ? '投递统计暂时不可用，可直接进入今日任务'
      : `逾期 ${applicationStats.value?.overdueFollowUpCount || 0} 条，今日 ${applicationStats.value?.dueTodayFollowUpCount || 0} 条`,
    icon: Route,
    tone: 'tone-amber',
    path: applicationFollowUpPath.value,
    badge: appConfig.enableV4Preview ? (applicationFollowUpCount.value > 0 ? '待跟进' : '可用') : '今日任务'
  },
  {
    title: '开始 AI 模拟面试',
    desc: '选择岗位、难度和简历后开始训练',
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
    desc: '按分类和难度进行刷题训练',
    icon: BookOpenCheck,
    tone: 'tone-purple',
    path: '/questions',
    badge: '可用'
  },
  {
    title: '错题复盘',
    desc: `${wrongQuestions.value.length} 道待复习`,
    icon: RefreshCcw,
    tone: 'tone-amber',
    path: '/questions/wrong-records',
    badge: wrongQuestions.value.length > 0 ? '待复习' : '可用'
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
  return `${item.fileName || '未命名文件'} · ${formatStatus(item.parseStatus)}`
})

const resumeOptimizeText = computed(() => {
  const item = overview.value?.recentResumeOptimize
  if (!item) return '暂无最近优化记录'
  return `最近优化状态：${formatStatus(item.optimizeStatus)}`
})

const activePlanText = computed(() => {
  const plan = overview.value?.activeStudyPlan
  if (!plan) return '暂无进行中的计划，可从面试报告或差距分析生成'
  return `${plan.planTitle || `学习计划 #${plan.planId}`} · ${plan.progressPercent || 0}%`
})

const findEntryStatus = (key: string) => entryStatuses.value.find((item) => item.key === key)

const go = (path: string | NextAction['path']) => {
  router.push(path)
}

const markNotificationActionRead = async (notificationId?: number | string) => {
  const id = Number(notificationId)
  if (!Number.isFinite(id) || id <= 0) return
  try {
    await markNotificationReadApi(id)
    notifications.value = notifications.value.map((item) =>
      item.id === id ? { ...item, isRead: 1 } : item
    )
    notifyUnreadChanged()
  } catch {
    // 跳转是主路径，已读回写失败不阻塞用户继续处理行动。
  }
}

const handleTodayActionClick = async (item: {
  path: string
  source?: string
  notificationId?: number | string
  unread?: boolean
}) => {
  if (item.source === 'notification' && item.unread) {
    await markNotificationActionRead(item.notificationId)
  }
  go(item.path)
}

const displayAgentTaskTitle = (task: AgentTaskVO) => {
  const skill = task.relatedSkillName || task.targetJobTitle || '目标能力'
  const map: Record<string, string> = {
    QUESTION_PRACTICE: `${skill} 面试题练习`,
    WRONG_QUESTION_REVIEW: `${skill} 错题复盘`,
    INTERVIEW: '目标岗位模拟面试',
    RESUME_OPTIMIZE: `${skill} 简历证据优化`,
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 个人知识复盘`
  }
  return map[task.taskType || ''] || task.title || `训练任务 #${task.id}`
}

const displayAgentTaskDescription = (task: AgentTaskVO) => {
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚证明目标技能和业务影响。',
    STUDY_TASK: '推进学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '提取可复用的项目例子和面试表达。'
  }
  return map[task.taskType || ''] || task.description || '根据你的当前准备状态生成的训练任务。'
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

const careerPriorityBadge = (priority: CareerActionPriority) => {
  if (priority === 'urgent') return '紧急'
  if (priority === 'high') return '优先'
  if (priority === 'low') return '观察'
  return '建议'
}

const badgeClass = (badge: string) => {
  if (badge === '紧急') return 'cc-badge--danger'
  if (badge === '优先' || badge === '建议' || badge === '待跟进') return 'cc-badge--warning'
  if (badge === '可用') return 'cc-badge--success'
  if (badge === '待复习') return 'cc-badge--warning'
  if (badge === '失败') return 'cc-badge--danger'
  return ''
}

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
  overviewErrorMessage.value = ''
  try {
    overview.value = await getUserDashboardOverviewApi()
  } catch (error) {
    overview.value = null
    overviewError.value = true
    overviewErrorMessage.value = getErrorMessage(error, '工作台数据暂时加载失败，可以先使用快捷入口，或稍后重试。')
  } finally {
    overviewLoading.value = false
  }
}

const fetchReadinessContext = async () => {
  readinessLoading.value = true
  readinessError.value = ''
  try {
    const [v3Res, skillRes] = await Promise.allSettled([
      getV3DashboardOverviewApi(),
      getSkillProfileOverviewApi()
    ])

    if (v3Res.status === 'fulfilled') {
      v3Overview.value = v3Res.value
    } else {
      v3Overview.value = null
      readinessError.value = getErrorMessage(
        v3Res.reason,
        '求职准备完整上下文暂时不可用，已保留原工作台内容。'
      )
    }

    if (skillRes.status === 'fulfilled') {
      skillOverview.value = skillRes.value
    } else {
      skillOverview.value = null
      if (!readinessError.value) {
        readinessError.value = getErrorMessage(
          skillRes.reason,
          '能力画像概览暂时不可用，就绪度已降级计算。'
        )
      }
    }
  } finally {
    readinessLoading.value = false
  }
}

const fetchWrongQuestions = async () => {
  wrongQuestionsLoading.value = true
  wrongQuestionsError.value = ''
  try {
    const result = await getWrongQuestionsApi({ pageNum: 1, pageSize: 5 }, { silentError: true })
    wrongQuestions.value = result.records || []
  } catch (error) {
    wrongQuestions.value = []
    wrongQuestionsError.value = getErrorMessage(error, '错题复盘数据暂时加载失败。')
  } finally {
    wrongQuestionsLoading.value = false
  }
}

const fetchAgentTasks = async () => {
  agentTasksLoading.value = true
  agentTasksError.value = ''
  try {
    const result = await getTodayAgentTasksApi({ date: formatLocalDate() })
    agentTasks.value = result.tasks || []
  } catch (error) {
    agentTasks.value = []
    agentTasksError.value = getErrorMessage(error, '今日任务暂时加载失败，可以先进入今日任务页重试。')
  } finally {
    agentTasksLoading.value = false
  }
}

const fetchApplicationStats = async () => {
  applicationStatsError.value = ''
  if (!appConfig.enableV4Preview) {
    applicationStats.value = null
    return
  }
  try {
    applicationStats.value = await getApplicationStatsApi()
  } catch (error) {
    applicationStats.value = null
    applicationStatsError.value = getErrorMessage(error, '投递跟进统计暂时加载失败。')
  }
}

const fetchNotifications = async () => {
  notificationsLoading.value = true
  notificationsError.value = ''
  try {
    const page = await getNotificationsApi({ pageNo: 1, pageSize: 5, isRead: 0 })
    notifications.value = page.records || []
  } catch (error) {
    notifications.value = []
    notificationsError.value = getErrorMessage(error, '通知提醒暂时加载失败。')
  } finally {
    notificationsLoading.value = false
  }
}

const fetchCareerInsights = async () => {
  careerInsightsLoading.value = true
  careerInsightsError.value = ''
  try {
    careerInsights.value = await getPersonalCareerInsightsApi({ days: 30 }, { silentError: true })
    careerInsightsLoaded.value = true
  } catch (error) {
    careerInsights.value = null
    careerInsightsLoaded.value = true
    careerInsightsError.value = getErrorMessage(error, '求职洞察暂时加载失败，可以进入完整洞察页稍后重试。')
  } finally {
    careerInsightsLoading.value = false
  }
}

const refreshTodayActions = () => {
  fetchAgentTasks()
  fetchApplicationStats()
  fetchNotifications()
}

onMounted(() => {
  fetchOverview()
  fetchReadinessContext()
  fetchWrongQuestions()
  refreshTodayActions()
  fetchCareerInsights()
})
</script>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 24px;
  overflow: hidden;
  padding: 28px;
}

.dashboard-section {
  padding: 20px;
}

.dashboard-readiness {
  display: grid;
  gap: 16px;
}

.today-focus-section {
  border-color: rgba(34, 211, 238, 0.24);
}

.today-source-errors {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    padding: 6px 10px;
    border: 1px solid rgba(245, 158, 11, 0.24);
    border-radius: 8px;
    background: rgba(245, 158, 11, 0.1);
    color: #fde68a;
    font-size: 12px;
    line-height: 1.45;
  }
}

.dashboard-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  color: #fed7aa;
}

.dashboard-inline-error {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 78px;
  padding: 14px;
  border: 1px solid rgba(248, 113, 113, 0.24);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.16);
  color: #fecaca;
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

.cc-terminal code {
  display: grid;
  gap: 10px;
  color: #a7f3d0;
  font-size: 13px;
  line-height: 1.6;
  white-space: normal;
}

.dashboard-metrics {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.metric-card--interactive {
  display: flex;
  min-height: 166px;
  flex-direction: column;
  align-items: flex-start;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  padding: 18px;
  transition: border-color 0.2s ease, transform 0.15s ease;
}

.metric-card--interactive:hover:not(:disabled) {
  border-color: rgba(129, 140, 248, 0.45);
  transform: translateY(-2px);
}

.metric-card--interactive:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.metric-card__icon,
.action-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
}

.metric-card__label {
  margin-top: 16px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.metric-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
}

.metric-card__hint {
  margin-top: auto;
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.5;
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

.today-focus-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.today-focus-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  min-height: 132px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(6, 182, 212, 0.1), transparent 55%),
    rgba(15, 23, 42, 0.64);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.today-focus-card:hover {
  border-color: rgba(34, 211, 238, 0.42);
  background:
    linear-gradient(135deg, rgba(6, 182, 212, 0.14), transparent 55%),
    rgba(15, 23, 42, 0.78);
  transform: translateY(-2px);
}

.today-focus-card__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.18);
  color: #67e8f9;
  font-weight: 800;
}

.today-focus-card__content {
  display: grid;
  min-width: 0;
  gap: 6px;

  strong {
    color: #f8fafc;
    line-height: 1.35;
  }

  span,
  small {
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.55;
  }
}

.career-insight-section {
  border-color: rgba(129, 140, 248, 0.22);
}

.career-insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.career-insight-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  min-height: 112px;
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.58);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
}

.career-insight-card:hover {
  border-color: rgba(129, 140, 248, 0.42);
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-2px);
}

.career-insight-card__content {
  display: grid;
  min-width: 0;
  gap: 6px;

  strong {
    color: #f8fafc;
    line-height: 1.35;
  }

  span,
  small {
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.55;
  }
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
  transition: border-color 0.2s ease, background 0.2s ease;
}

.action-card {
  min-height: 118px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
}

.action-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  background: rgba(99, 102, 241, 0.08);
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

.info-item--button:hover {
  border-color: rgba(129, 140, 248, 0.4);
  background: rgba(99, 102, 241, 0.08);
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

.loading-placeholder {
  min-height: 120px;
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
  .action-grid,
  .today-focus-grid,
  .career-insight-grid {
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
  .today-focus-grid,
  .career-insight-grid,
  .study-summary {
    grid-template-columns: 1fr;
  }

  .today-focus-card {
    grid-template-columns: auto minmax(0, 1fr);

    .cc-badge {
      grid-column: 2;
      justify-self: flex-start;
    }
  }

  .career-insight-card {
    grid-template-columns: minmax(0, 1fr);

    .cc-badge {
      justify-self: flex-start;
    }
  }

  .panel-header,
  .section-heading,
  .dashboard-alert {
    flex-direction: column;
  }
}
</style>
