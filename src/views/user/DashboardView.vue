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
          <el-button type="primary" size="large" @click="go(primaryNextAction.path)">
            <component :is="primaryNextAction.icon" :size="18" />
            {{ primaryNextAction.cta }}
          </el-button>
          <el-button size="large" text @click="go('/agent/tasks')">
            <Route :size="18" />
            任务中心
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

    <!-- Error alert -->
    <section v-if="overviewError" class="cc-glass dashboard-alert">
      <AlertTriangle :size="18" />
      <span>{{ overviewErrorMessage || '今日计划数据暂时加载失败，可以先使用快捷入口，或稍后重试。' }}</span>
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
    <section class="cc-glass dashboard-section today-focus-section" v-loading="agentTasksLoading">
      <div class="section-heading">
        <div>
          <p class="section-kicker">今日闭环</p>
          <h2>今天先做这几件事</h2>
        </div>
        <el-button text @click="go('/agent/today')">进入今日任务</el-button>
      </div>

      <div v-if="agentTasksError" class="dashboard-inline-error">
        <AlertTriangle :size="16" />
        <span>{{ agentTasksError }}</span>
        <el-button text @click="fetchAgentTasks">重试</el-button>
      </div>

      <div v-else class="today-focus-grid">
        <button
          v-for="item in todayFocusCards"
          :key="item.key"
          class="today-focus-card"
          type="button"
          @click="go(item.path)"
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

    <!-- Main grid: 简历与学习计划 -->
    <div class="dashboard-main-grid">
      <section class="cc-glass dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">简历</p>
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
            <p class="section-kicker">学习计划</p>
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
          <strong>{{ overview.activeStudyPlan.planTitle || '学习计划' }}</strong>
          <span>{{ overview.activeStudyPlan.doneTaskCount || 0 }}/{{ overview.activeStudyPlan.totalTaskCount || 0 }} · {{ overview.activeStudyPlan.progressPercent || 0 }}%</span>
        </div>
        <AppState
          v-else
          type="empty"
          title="还没有进行中的学习计划"
          description="学习计划通常由面试报告或能力短板生成。先做一次模拟面试，或从历史报告生成训练路线。"
        >
          <el-button type="primary" @click="go('/interviews/history')">从报告生成</el-button>
          <el-button @click="go('/interviews/create')">先做面试</el-button>
        </AppState>
      </section>
    </div>

    <!-- Main grid: 最近面试与错题复盘 -->
    <div class="dashboard-main-grid">
      <section class="cc-glass dashboard-section">
        <div class="section-heading">
          <div>
            <p class="section-kicker">最近面试</p>
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
          <AppState
            v-else
            type="empty"
            title="还没有面试记录"
            description="完成一次模拟面试后，这里会展示最近面试和报告入口，方便继续复盘。"
          >
            <el-button type="primary" @click="go('/interviews/create')">开始模拟面试</el-button>
          </AppState>

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
            <p class="section-kicker">错题复盘</p>
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
              <strong>{{ item.title || '待复习题目' }}</strong>
              <span>错误次数 {{ item.wrongCount ?? 1 }} · {{ formatDateTime(item.lastWrongAt) }}</span>
            </div>
            <span class="cc-badge cc-badge--warning">待复习</span>
          </button>
        </div>
        <AppState
          v-else
          type="empty"
          title="暂时没有待复习错题"
          description="提交练习或面试回答后，答错和低分题会回流到这里。可以先做一组专项练习。"
        >
          <el-button type="primary" @click="go('/questions/practice')">开始练习</el-button>
        </AppState>
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
        <AppState
          v-if="!entryStatuses.length"
          type="empty"
          title="入口状态还在等待数据"
          description="完成简历、岗位或面试后，系统会判断哪些入口可继续推进；也可以先从简历与岗位页补齐证据。"
        >
          <el-button type="primary" @click="go('/resumes')">补齐简历与岗位</el-button>
        </AppState>
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
  Sparkles
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  fetchCachedDashboardOverview,
  fetchCachedTodayAgentTasks,
  fetchCachedWrongQuestions
} from '@/composables/useUserHomeDataCache'
import AppState from '@/components/common/AppState.vue'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO } from '@/types/agent'
import type { UserDashboardEntryStatusVO, UserDashboardOverviewVO } from '@/types/dashboard'
import type { WrongQuestionVO } from '@/types/question'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

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

const wrongQuestionsLoading = ref(false)
const wrongQuestionsError = ref('')
const wrongQuestions = ref<WrongQuestionVO[]>([])
const agentTasksLoading = ref(false)
const agentTasksError = ref('')
const agentTasks = ref<AgentTaskVO[]>([])
let secondaryDataCancelled = false

const displayName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || 'CodeCoachAI 用户')
const entryStatuses = computed(() => overview.value?.entryStatuses || [])
const todayTotalCount = computed(() => agentTasks.value.length || overview.value?.todayTaskCount || 0)
const todayDoneCount = computed(() =>
  agentTasks.value.length
    ? agentTasks.value.filter((task) => task.status === 'DONE').length
    : overview.value?.todayCompletedTaskCount || 0
)

const primaryNextAction = computed(() => {
  const firstTodo = agentTasks.value.find((task) => task.status !== 'DONE' && task.status !== 'SKIPPED')
  if (firstTodo) {
    return {
      title: displayAgentTaskTitle(firstTodo),
      cta: '继续今日任务',
      path: firstTodo.actionUrl && firstTodo.actionUrl.startsWith('/') ? firstTodo.actionUrl : '/agent/today',
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

const todayFocusCards = computed(() => {
  const openTasks = agentTasks.value.filter((task) => task.status !== 'DONE' && task.status !== 'SKIPPED').slice(0, 3)
  if (openTasks.length) {
    return openTasks.map((task, index) => ({
      key: `agent-${task.id}`,
      index: index + 1,
      title: displayAgentTaskTitle(task),
      desc: displayAgentTaskDescription(task),
      reason: task.reason || task.relatedSkillName || '来自今日训练任务',
      path: task.actionUrl && task.actionUrl.startsWith('/') ? task.actionUrl : '/agent/today',
      badge: formatStatus(task.status)
    }))
  }

  return [
    {
      key: 'generate-plan',
      index: 1,
      title: '生成今日训练计划',
      desc: '根据目标岗位和最近训练记录生成 3-5 个任务。',
      reason: '适合每天开始训练前先执行',
      path: '/agent/today',
      badge: '待处理'
    },
    {
      key: 'resume',
      index: 2,
      title: overview.value?.resumeCount ? '检查简历匹配状态' : '补充第一份简历',
      desc: overview.value?.resumeCount ? resumeOptimizeText.value : '上传或创建简历后，系统才能给出岗位匹配建议。',
      reason: '简历证据会影响任务推荐质量',
      path: '/resumes',
      badge: entryStatusText(findEntryStatus('resume')?.status)
    },
    {
      key: 'interview-or-wrong',
      index: 3,
      title: wrongQuestions.value.length ? '复盘最近错题' : '完成一次模拟面试',
      desc: wrongQuestions.value.length ? `${wrongQuestions.value.length} 道错题可用于校准薄弱点。` : '用一次模拟面试补充系统对表达和项目深度的判断。',
      reason: '练习证据越多，明天的计划越准',
      path: wrongQuestions.value.length ? '/questions/wrong-records' : '/interviews/create',
      badge: wrongQuestions.value.length ? '待复习' : '待处理'
    }
  ]
})

const metrics = computed<MetricItem[]>(() => [
  {
    label: '今日任务',
    value: `${todayDoneCount.value}/${todayTotalCount.value}`,
    hint: primaryNextAction.value.title,
    icon: BookOpenCheck,
    tone: 'tone-green',
    path: '/agent/today'
  },
  {
    label: '简历证据',
    value: overview.value?.resumeCount ?? 0,
    hint: resumeParseText.value,
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes'
  },
  {
    label: '最近报告分',
    value: overview.value?.recentReport?.totalScore ?? '--',
    hint: overview.value?.recentReport ? '来自最近面试报告' : `${overview.value?.interviewCount ?? 0} 次面试记录`,
    icon: BrainCircuit,
    tone: 'tone-purple',
    path: overview.value?.recentReport ? `/interviews/${overview.value.recentReport.interviewId}/report` : '/interviews/create'
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
    title: primaryNextAction.value.title,
    desc: '优先完成这一项，系统会据此更新后续推荐。',
    icon: primaryNextAction.value.icon,
    tone: 'tone-green',
    path: primaryNextAction.value.path,
    badge: '下一步'
  },
  {
    title: '模拟面试',
    desc: '用一次面试补充表达、项目深度和岗位匹配证据。',
    icon: PlayCircle,
    tone: 'tone-blue',
    path: '/interviews/create',
    badge: entryStatusText(findEntryStatus('interview')?.status)
  },
  {
    title: '简历中心',
    desc: resumeOptimizeText.value,
    icon: FileText,
    tone: 'tone-cyan',
    path: '/resumes',
    badge: entryStatusText(findEntryStatus('resume')?.status)
  },
  {
    title: '题库练习',
    desc: wrongQuestions.value.length ? '先复盘错题，再补一组专项练习。' : '按分类和难度做一组专项训练。',
    icon: BookOpenCheck,
    tone: 'tone-purple',
    path: wrongQuestions.value.length ? '/questions/wrong-records' : '/questions',
    badge: wrongQuestions.value.length > 0 ? '待复习' : '可用'
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
  return `${plan.planTitle || '学习计划'} · ${plan.progressPercent || 0}%`
})

const findEntryStatus = (key: string) => entryStatuses.value.find((item) => item.key === key)

const go = (path: string) => {
  router.push(path)
}

const shouldForceRefresh = (force: unknown = true) => force !== false

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
    KNOWLEDGE_REVIEW: `${skill} 表达素材复盘`
  }
  return map[String(task.taskType || '').toUpperCase()] || cleanUserTaskText(task.title, '新的训练任务')
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
  return map[String(task.taskType || '').toUpperCase()] || cleanUserTaskText(task.description, '根据你的当前准备状态生成的训练任务。')
}

const cleanUserTaskText = (value?: string | null, fallback = '') => {
  const text = String(value || '').trim()
  if (!text) return fallback
  if (/^[A-Z0-9_./-]+$/.test(text)) return fallback
  return text
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
  return map[value] || (value ? '状态待确认' : '未知')
}

const entryStatusText = (status?: string) => formatStatus(status || 'TODO')

const badgeClass = (badge: string) => {
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
  return map[key] || '入口状态'
}

const formatDateTime = (value?: string) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

const fetchOverview = async (force: unknown = true) => {
  overviewLoading.value = true
  overviewError.value = false
  overviewErrorMessage.value = ''
  try {
    overview.value = await fetchCachedDashboardOverview(shouldForceRefresh(force))
  } catch (error) {
    overview.value = null
    overviewError.value = true
    overviewErrorMessage.value = getErrorMessage(error, '今日计划数据暂时加载失败，可以先使用快捷入口，或稍后重试。')
  } finally {
    overviewLoading.value = false
  }
}

const fetchWrongQuestions = async (force: unknown = true) => {
  wrongQuestionsLoading.value = true
  wrongQuestionsError.value = ''
  try {
    const result = await fetchCachedWrongQuestions(shouldForceRefresh(force))
    wrongQuestions.value = result.records || []
  } catch (error) {
    wrongQuestions.value = []
    wrongQuestionsError.value = getErrorMessage(error, '错题复盘数据暂时加载失败。')
  } finally {
    wrongQuestionsLoading.value = false
  }
}

const fetchAgentTasks = async (force: unknown = true) => {
  agentTasksLoading.value = true
  agentTasksError.value = ''
  try {
    const result = await fetchCachedTodayAgentTasks(formatLocalDate(), shouldForceRefresh(force))
    agentTasks.value = result.tasks || []
  } catch (error) {
    agentTasks.value = []
    agentTasksError.value = getErrorMessage(error, '今日任务暂时加载失败，可以先进入今日任务页重试。')
  } finally {
    agentTasksLoading.value = false
  }
}

const deferSecondaryDashboardData = (callback: () => void, timeout = 1200, fallbackDelay = 240) => {
  const run = () => {
    if (!secondaryDataCancelled) {
      void callback()
    }
  }
  const requestIdleCallback = (window as Window & {
    requestIdleCallback?: (handler: () => void, options?: { timeout?: number }) => number
  }).requestIdleCallback

  if (requestIdleCallback) {
    requestIdleCallback(run, { timeout })
    return
  }

  window.setTimeout(run, fallbackDelay)
}

onMounted(() => {
  secondaryDataCancelled = false
  fetchOverview(false)
  deferSecondaryDashboardData(() => fetchAgentTasks(false), 900, 180)
  deferSecondaryDashboardData(() => fetchWrongQuestions(false), 1600, 420)
})

onBeforeUnmount(() => {
  secondaryDataCancelled = true
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

.today-focus-section {
  border-color: rgba(34, 211, 238, 0.24);
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  .today-focus-grid {
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

  .panel-header,
  .section-heading,
  .dashboard-alert {
    flex-direction: column;
  }
}
</style>
