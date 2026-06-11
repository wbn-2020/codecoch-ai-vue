<template>
  <div class="jobcoach-home">
    <section class="home-hero">
      <div class="hero-main">
        <p class="eyebrow">
          <Sparkles :size="16" />
          今日计划
        </p>
        <h1>{{ displayName }}，今天先补最影响面试表现的短板</h1>
        <p class="hero-desc">
          CodeCoachAI 会根据你的简历、目标岗位、刷题和模拟面试记录，挑出今天最该完成的 1-3 个动作。资料还不完整时，先带你补齐关键证据。
        </p>

        <div class="hero-actions">
          <el-button type="primary" size="large" :loading="agentTasksLoading" @click="go(primaryTask.path)">
            <PlayCircle :size="18" />
            {{ primaryTask.cta }}
          </el-button>
          <el-button size="large" @click="go('/agent/tasks')">
            <ClipboardList :size="18" />
            任务中心
          </el-button>
        </div>
      </div>

      <aside class="hero-side" v-loading="overviewLoading || dailyPlanLoading">
        <div class="side-header">
          <span>计划可信度</span>
          <strong>{{ confidenceLabel }}</strong>
        </div>
        <div class="confidence-meter" aria-hidden="true">
          <span :style="{ width: `${confidencePercent}%` }"></span>
        </div>
        <dl>
          <div>
            <dt>目标岗位</dt>
            <dd>{{ targetJobText }}</dd>
          </div>
          <div>
            <dt>最大短板</dt>
            <dd>{{ topWeaknessText }}</dd>
          </div>
          <div>
            <dt>预计训练</dt>
            <dd>{{ estimatedMinutes }} 分钟</dd>
          </div>
          <div>
            <dt>计划状态</dt>
            <dd>{{ planStatusText }}</dd>
          </div>
        </dl>
      </aside>
    </section>

    <section v-if="pageErrors.length" class="error-stack">
      <article v-for="error in pageErrors" :key="error.key" class="state-strip state-strip--warning">
        <AlertTriangle :size="18" />
        <span>{{ error.message }}</span>
        <el-button text @click="error.retry">重试</el-button>
      </article>
    </section>

    <section class="mobile-action-dock" aria-label="手机快速训练入口">
      <button type="button" class="mobile-action-dock__primary" @click="go(primaryTask.path)">
        <span>下一步</span>
        <strong>{{ primaryTask.title }}</strong>
        <small>{{ primaryTask.minutes }} 分钟 · {{ primaryTask.statusLabel }}</small>
      </button>
      <div class="mobile-action-dock__meta">
        <span><b>依据</b>{{ confidenceLabel }}</span>
        <span><b>耗时</b>{{ estimatedMinutes }} 分钟</span>
        <span><b>状态</b>{{ planStatusText }}</span>
      </div>
      <div class="mobile-action-dock__quick">
        <button v-for="action in mobileQuickActions" :key="action.label" type="button" @click="go(action.path)">
          <component :is="action.icon" :size="17" />
          <span>{{ action.label }}</span>
        </button>
      </div>
    </section>

    <section class="focus-grid">
      <article class="focus-card focus-card--primary" v-loading="agentTasksLoading || dailyPlanLoading">
        <div class="card-heading">
          <span class="card-kicker">第 1 个动作</span>
          <span class="pill" :class="statusClass(primaryTask.statusLabel)">{{ primaryTask.statusLabel }}</span>
        </div>
        <h2>{{ primaryTask.title }}</h2>
        <p>{{ primaryTask.description }}</p>
        <ul class="reason-list">
          <li v-for="reason in primaryTask.reasons" :key="reason">
            <CheckCircle2 :size="15" />
            <span>{{ reason }}</span>
          </li>
        </ul>
        <div class="action-facts">
          <span>依据：{{ primaryTask.reason }}</span>
          <span>耗时：{{ primaryTask.minutes }} 分钟</span>
          <span>收益：{{ primaryTask.benefit }}</span>
        </div>
        <div class="focus-actions">
          <el-button type="primary" @click="go(primaryTask.path)">
            {{ primaryTask.cta }}
          </el-button>
          <el-button
            v-if="primaryTask.taskId && canCompleteTask(primaryTask.taskId)"
            type="success"
            :loading="taskMutatingId === primaryTask.taskId"
            @click="completeTask(primaryTask.taskId)"
          >
            完成并复盘
          </el-button>
          <el-button
            v-if="primaryTask.taskId && canSkipTask(primaryTask.taskId)"
            :loading="taskMutatingId === primaryTask.taskId"
            @click="skipTask(primaryTask.taskId)"
          >
            今天跳过
          </el-button>
        </div>
      </article>

      <article class="focus-card">
        <div class="card-heading">
          <span class="card-kicker">AI 推荐依据</span>
          <span class="pill" :class="confidencePillClass">{{ confidenceLabel }}</span>
        </div>
        <p class="source-boundary">{{ recommendationBoundaryText }}</p>
        <div class="source-list">
          <div v-for="source in recommendationSources" :key="source.key" class="source-item" :class="{ 'is-missing': source.missing }">
            <component :is="source.icon" :size="17" />
            <div>
              <strong>{{ source.title }}</strong>
              <span>{{ source.desc }}</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="task-section">
      <div class="section-head">
        <div>
          <p class="section-kicker">后续训练</p>
          <h2>今天的任务流</h2>
        </div>
        <div class="section-actions">
          <el-button :loading="agentTasksLoading" @click="fetchAgentTasks">刷新任务</el-button>
          <el-button type="primary" @click="go('/agent/tasks')">查看全部</el-button>
        </div>
      </div>

      <div v-if="taskCards.length" class="task-list">
        <article v-for="task in taskCards" :key="task.key" class="task-row">
          <span class="task-row__type" :class="task.tone">
            <component :is="task.icon" :size="18" />
          </span>
          <div class="task-row__body">
            <div>
              <strong>{{ task.title }}</strong>
              <span class="pill" :class="statusClass(task.statusLabel)">{{ task.statusLabel }}</span>
            </div>
            <p>{{ task.description }}</p>
            <div class="task-row__facts">
              <span>依据：{{ task.reason }}</span>
              <span>收益：{{ task.benefit }}</span>
            </div>
          </div>
          <div class="task-row__actions">
            <span>{{ task.minutes }} 分钟</span>
            <el-button text @click="go(task.path)">开始</el-button>
            <el-button
              v-if="task.taskId && canCompleteTask(task.taskId)"
              text
              type="success"
              :loading="taskMutatingId === task.taskId"
              @click="completeTask(task.taskId)"
            >
              完成
            </el-button>
          </div>
        </article>
      </div>

      <div v-else class="empty-panel">
        <ClipboardList :size="26" />
        <strong>今天还没有安排任务</strong>
        <span>{{ emptyTaskText }}</span>
        <el-button type="primary" :loading="dailyPlanGenerating" @click="generatePlan">生成今日计划</el-button>
      </div>
    </section>

    <section class="secondary-toggle-section">
      <button type="button" class="secondary-toggle" :aria-expanded="showSecondarySections" @click="showSecondarySections = !showSecondarySections">
        <span>
          <strong>{{ showSecondarySections ? '收起资料和工具' : '展开资料和工具' }}</strong>
          <small>简历、岗位、反馈和面试前工具都在这里；今天先完成上面的优先动作。</small>
        </span>
        <ChevronDown :size="18" :class="{ 'is-open': showSecondarySections }" />
      </button>
    </section>

    <section v-if="showSecondarySections" class="path-section path-section--secondary">
      <div class="section-head">
        <div>
          <p class="section-kicker">资料辅助</p>
          <h2>需要补资料时，再按这 4 步完善推荐依据</h2>
        </div>
        <div class="section-actions">
          <el-button @click="go('/onboarding')">查看完整引导</el-button>
        </div>
      </div>

      <div class="journey">
        <button v-for="step in journeySteps" :key="step.key" class="journey-step" type="button" @click="go(step.path)">
          <span class="journey-step__index">{{ step.order }}</span>
          <component :is="step.icon" :size="19" />
          <strong>{{ step.title }}</strong>
          <small>{{ step.desc }}</small>
          <span class="pill" :class="step.tone">{{ step.status }}</span>
        </button>
      </div>
    </section>

    <section v-if="showSecondarySections" class="insight-grid">
      <article class="insight-card">
        <div class="section-head section-head--compact">
          <div>
            <p class="section-kicker">简历与岗位</p>
            <h2>资料完整度</h2>
          </div>
          <el-button text @click="go('/resumes')">查看</el-button>
        </div>
        <div class="readiness-list">
          <div v-for="item in readinessItems" :key="item.key" class="readiness-item">
            <span :class="{ 'is-ready': item.ready }"></span>
            <div>
              <strong>{{ item.title }}</strong>
              <small>{{ item.desc }}</small>
            </div>
          </div>
        </div>
      </article>

      <article class="insight-card">
        <div class="section-head section-head--compact">
          <div>
            <p class="section-kicker">最近反馈</p>
            <h2>报告与错题</h2>
          </div>
          <el-button text @click="go('/analytics/personal')">分析</el-button>
        </div>
        <div class="feedback-list">
          <button v-if="overview?.recentReport" type="button" @click="go(`/interviews/${overview.recentReport.interviewId}/report`)">
            <BarChart3 :size="18" />
            <span>
              <strong>最近面试报告 {{ overview.recentReport.totalScore ?? '--' }} 分</strong>
              <small>{{ reportInsightText }}</small>
            </span>
          </button>
          <button v-if="wrongQuestions.length" type="button" @click="go('/questions/wrong-records')">
            <AlertTriangle :size="18" />
            <span>
              <strong>{{ wrongQuestions.length }} 道错题待复盘</strong>
              <small>{{ wrongQuestions[0]?.title || '从最近错题开始校准薄弱点' }}</small>
            </span>
          </button>
          <div v-if="!overview?.recentReport && !wrongQuestions.length" class="empty-small">
            完成一次模拟面试或刷题后，这里会出现可回流到今日计划的反馈。
          </div>
        </div>
      </article>

      <article class="insight-card">
        <div class="section-head section-head--compact">
          <div>
            <p class="section-kicker">记录与工具</p>
            <h2>面试前工具箱</h2>
          </div>
        </div>
        <div class="tool-list">
          <button v-for="tool in tools" :key="tool.title" type="button" @click="go(tool.path)">
            <component :is="tool.icon" :size="17" />
            <span>{{ tool.title }}</span>
          </button>
        </div>
      </article>
    </section>

    <el-dialog v-model="completionReviewVisible" title="完成后复盘" width="520px">
      <div class="completion-review">
        <div>
          <span class="review-kicker">刚完成</span>
          <h3>{{ completionReviewTask ? displayAgentTaskTitle(completionReviewTask) : '训练任务' }}</h3>
          <p>{{ completionReviewTask ? displayAgentTaskDescription(completionReviewTask) : '记录这次训练结果，下一轮计划会更好接住反馈。' }}</p>
        </div>
        <ul>
          <li v-for="item in completionReviewItems" :key="item">{{ item }}</li>
        </ul>
        <p v-if="completionReviewNote" class="review-note">备注：{{ completionReviewNote }}</p>
      </div>
      <template #footer>
        <el-button @click="completionReviewVisible = false">稍后再看</el-button>
        <el-button @click="go('/agent/tasks')">补充反馈</el-button>
        <el-button type="primary" @click="goCompletionNextAction">{{ completionReviewNextAction.label }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  ChevronDown,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  History,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Route,
  Sparkles,
  Target
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  generateDailyPlanApi,
  skipAgentTaskApi
} from '@/api/agent'
import {
  fetchCachedDashboardOverview,
  fetchCachedLatestDailyPlan,
  fetchCachedTodayAgentTasks,
  fetchCachedWrongQuestions,
  invalidateUserHomeTrainingCaches
} from '@/composables/useUserHomeDataCache'
import { useAuthStore } from '@/stores/auth'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import type { UserDashboardOverviewVO } from '@/types/dashboard'
import type { WrongQuestionVO } from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

interface HomeTask {
  key: string
  taskId?: number
  title: string
  description: string
  reason: string
  reasons: string[]
  benefit: string
  cta: string
  path: string
  statusLabel: string
  minutes: number
  icon: Component
  tone: string
}

const router = useRouter()
const authStore = useAuthStore()

const overview = ref<UserDashboardOverviewVO | null>(null)
const overviewLoading = ref(false)
const overviewError = ref('')

const dailyPlan = ref<DailyPlanVO | null>(null)
const dailyPlanLoading = ref(false)
const dailyPlanGenerating = ref(false)
const dailyPlanError = ref('')

const agentTasks = ref<AgentTaskVO[]>([])
const agentTasksLoading = ref(false)
const agentTasksError = ref('')
const taskMutatingId = ref<number | null>(null)
const completionReviewVisible = ref(false)
const completionReviewTask = ref<AgentTaskVO | null>(null)
const completionReviewNote = ref('')
const showSecondarySections = ref(false)

const wrongQuestions = ref<WrongQuestionVO[]>([])
const wrongQuestionsLoading = ref(false)
const wrongQuestionsError = ref('')

const displayName = computed(() => authStore.userInfo?.nickname || authStore.userInfo?.username || '同学')
const activeTasks = computed(() => agentTasks.value.filter((task) => !['DONE', 'SKIPPED'].includes(String(task.status || '').toUpperCase())))
const taskCards = computed<HomeTask[]>(() => {
  const tasks = agentTasks.value.length ? agentTasks.value : dailyPlan.value?.tasks || []
  return tasks.slice(0, 5).map(toHomeTask)
})

const primaryTask = computed<HomeTask>(() => {
  const task = activeTasks.value[0] || dailyPlan.value?.tasks?.find((item) => !['DONE', 'SKIPPED'].includes(String(item.status || '').toUpperCase()))
  if (task) {
    return {
      ...toHomeTask(task),
      cta: '开始第 1 个任务',
      reasons: taskReasons(task)
    }
  }

  if (!overview.value?.resumeCount) {
    return fallbackTask({
      title: '先补一份可用于匹配的简历',
      description: '没有简历时，AI 只能给通用训练建议。上传或创建简历后，推荐才能围绕项目经历和岗位要求展开。',
      reason: '缺少简历资料',
      cta: '补充简历',
      path: '/resumes',
      statusLabel: '待补充',
      icon: FileText,
      tone: 'tone-blue',
      benefit: '让后续匹配、追问和推荐题更贴合你的项目经历',
      reasons: ['简历内容决定面试追问方向', '补全后才能做岗位匹配', '资料更完整时评分更有参考价值']
    })
  }

  if (!overview.value?.recentInterview && !overview.value?.recentReport) {
    return fallbackTask({
      title: '完成一次目标岗位模拟面试',
      description: '系统需要真实面试反馈来判断表达、项目深度和知识薄弱点。先做一轮轻量模拟面试，再把报告反哺到今日计划。',
      reason: '缺少面试反馈',
      cta: '创建模拟面试',
      path: '/interviews/create',
      statusLabel: '待开始',
      icon: MessageSquare,
      tone: 'tone-green',
      benefit: '拿到一份可回流到今日计划的表达和短板反馈',
      reasons: ['报告会沉淀薄弱点', '下一轮计划会更聚焦', '可选择项目深挖或技术面模式']
    })
  }

  if (wrongQuestions.value.length) {
    return fallbackTask({
      title: '复盘最近错题，校准今日短板',
      description: `${wrongQuestions.value.length} 道错题可用于确认知识点是否真正掌握。先从最近出错的题开始。`,
      reason: '来自错题记录',
      cta: '复盘错题',
      path: '/questions/wrong-records',
      statusLabel: '待复盘',
      icon: BookOpenCheck,
      tone: 'tone-orange',
      benefit: '把已经暴露的知识短板转成下一轮训练重点',
      reasons: ['错题能帮助定位短板', '复盘后可继续做推荐题', '数量会结合题目质量一起判断']
    })
  }

  return fallbackTask({
    title: '生成今天的智能教练计划',
    description: '当前还没有安排好的训练动作。生成计划后，你会看到任务、推荐理由、预计耗时和开始入口。',
    reason: '等待智能教练生成',
    cta: '去生成计划',
    path: '/agent/today',
    statusLabel: '待生成',
    icon: Sparkles,
    tone: 'tone-blue',
    benefit: '得到今天 3-5 个可执行动作和恢复入口',
    reasons: ['按你的岗位和简历生成', '资料不足时先补关键证据', '生成后可直接开始任务']
  })
})

const completionReviewItems = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  const skill = task?.relatedSkillName || task?.targetJobTitle || '当前方向'
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) {
    return [
      `掌握度：已完成一轮「${skill}」训练，先把能稳定讲清楚的点记为可复用表达。`,
      '暴露短板：如果回答仍停在概念层，优先补项目场景、指标、取舍和追问边界。',
      '下一步建议：进入专项练习或错题本，再刷一组同方向题，巩固今天暴露的问题。'
    ]
  }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) {
    return [
      `掌握度：已完成一次「${skill}」复盘，先确认哪些回答能支撑目标岗位要求。`,
    '暴露短板：重点查看低分项、追问失败点和缺少细节支撑的项目描述。',
      '下一步建议：把 1 个薄弱点回填到题库训练或下一次模拟面试，优先练项目背景、指标和取舍。'
    ]
  }
  if (type.includes('RESUME')) {
    return [
      `掌握度：已完成一次「${skill}」简历证据整理，先确认新增内容能被面试官追问。`,
    '暴露短板：如果仍缺少数字、业务场景或个人职责，匹配结论的参考价值会下降。',
    '下一步建议：用目标岗位关键词再跑一次匹配，把仍缺少细节的技能放回今日训练。'
    ]
  }
  return [
    '掌握度：本次任务已经完成，先确认是否产出了可复用结论。',
    '暴露短板：把仍不确定、无法举例或无法落到项目里的点写进反馈。',
    '下一步建议：继续推进下一项待办，保持今天的训练闭环。'
  ]
})

const completionReviewNextAction = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  if (task?.actionUrl) return { label: '打开任务入口', path: normalizeTaskPath(task.actionUrl) }
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) return { label: '继续专项练习', path: '/questions/practice' }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return { label: '查看面试历史', path: '/interviews/history' }
  if (type.includes('RESUME')) return { label: '查看简历匹配', path: '/resume-match' }
  return { label: '继续任务中心', path: '/agent/tasks' }
})

const targetJobText = computed(() =>
  dailyPlan.value?.targetJobTitle
    || overview.value?.recentInterview?.title
    || '待选择目标岗位'
)

const topWeaknessText = computed(() => {
  const reportWeak = overview.value?.recentReport?.weakPoints?.[0]
  if (reportWeak) return reportWeak
  const taskSkill = activeTasks.value[0]?.relatedSkillName
  if (taskSkill) return taskSkill
  if (wrongQuestions.value[0]?.title) return wrongQuestions.value[0].title
  return '完成训练后自动归因'
})

const estimatedMinutes = computed(() => {
  const fromTasks = agentTasks.value.reduce((sum, task) => sum + (Number(task.estimatedMinutes) || 0), 0)
  if (fromTasks > 0) return fromTasks
  const fromPlan = dailyPlan.value?.tasks?.reduce((sum, task) => sum + (Number(task.estimatedMinutes) || 0), 0) || 0
  return fromPlan || 30
})

const planStatusText = computed(() => {
  if (dailyPlan.value?.empty) return dailyPlan.value.emptyMessage || '暂无计划'
  if (dailyPlan.value?.status) return formatStatus(dailyPlan.value.status)
  if (agentTasks.value.length) return '已有今日任务'
  return '待生成'
})

const confidencePercent = computed(() => {
  let score = 20
  if (overview.value?.resumeCount) score += 20
  if (targetJobText.value !== '待选择目标岗位') score += 15
  if (overview.value?.recentReport) score += 20
  if (wrongQuestions.value.length) score += 10
  if (agentTasks.value.length || dailyPlan.value?.tasks?.length) score += 15
  return Math.min(score, 100)
})

const confidenceLabel = computed(() => {
  if (confidencePercent.value >= 80) return '高'
  if (confidencePercent.value >= 55) return '中'
  return '待补资料'
})
const confidencePillClass = computed(() => {
  if (confidencePercent.value >= 80) return 'pill--success'
  if (confidencePercent.value >= 55) return 'pill--neutral'
  return 'pill--warning'
})

const hasTrustedReport = computed(() => {
  const status = String(overview.value?.recentReport?.status || '').toUpperCase()
  return Boolean(overview.value?.recentReport && (!status || ['SUCCESS', 'GENERATED', 'COMPLETED'].includes(status)))
})

const recommendationBoundaryText = computed(() => {
  if (!overview.value?.resumeCount) return '当前是通用建议：补充简历后，匹配和训练建议会更贴近你的项目经历。'
  if (!hasTrustedReport.value) return '当前推荐先结合已有简历、岗位和错题记录；报告完成后会继续补充训练重点。'
  return '当前推荐已接入简历、训练反馈和报告内容；仍建议在开始训练前确认岗位方向是否最新。'
})

const recommendationSources = computed(() => [
  {
    key: 'resume',
    title: overview.value?.resumeCount ? '简历资料已接入' : '缺少简历资料',
    desc: overview.value?.resumeCount ? `已有 ${overview.value.resumeCount} 份简历，可用于判断项目经历。` : '补充简历后才能围绕项目经历推荐训练。',
    icon: FileText,
    missing: !overview.value?.resumeCount
  },
  {
    key: 'jd',
    title: targetJobText.value !== '待选择目标岗位' ? '岗位目标已接入' : '缺少目标岗位',
    desc: targetJobText.value !== '待选择目标岗位' ? targetJobText.value : '选择岗位方向或粘贴岗位描述后，推荐会更贴近面试要求。',
    icon: Briefcase,
    missing: targetJobText.value === '待选择目标岗位'
  },
  {
    key: 'report',
    title: hasTrustedReport.value ? '面试报告已接入' : overview.value?.recentReport ? '最近报告待复核' : '暂无面试报告',
    desc: hasTrustedReport.value
      ? reportInsightText.value
      : overview.value?.recentReport
        ? `报告状态：${formatStatus(overview.value.recentReport.status)}，完成后会补充到训练建议里。`
        : '完成一次模拟面试后，薄弱点会回流到计划。',
    icon: BarChart3,
    missing: !hasTrustedReport.value
  },
  {
    key: 'wrong',
    title: wrongQuestions.value.length ? '错题记录已接入' : '暂无错题记录',
    desc: wrongQuestions.value.length ? `${wrongQuestions.value.length} 道错题可用于校准薄弱点。` : '刷题后产生的错题会影响下一轮推荐。',
    icon: AlertTriangle,
    missing: !wrongQuestions.value.length
  }
])

const journeySteps = computed(() => [
  {
    key: 'resume',
    order: 1,
    title: '补齐资料',
    desc: '简历证据 + 目标岗位',
    path: '/resumes',
    icon: FileText,
    status: overview.value?.resumeCount ? '已接入' : '待补充',
    tone: overview.value?.resumeCount ? 'pill--success' : 'pill--warning'
  },
  {
    key: 'match',
    order: 2,
    title: '匹配画像',
    desc: '识别优势、风险和关键词缺口',
    path: '/resume-match',
    icon: Target,
    status: overview.value?.recentResumeOptimize ? '可继续' : '待分析',
    tone: overview.value?.recentResumeOptimize ? 'pill--success' : 'pill--neutral'
  },
  {
    key: 'practice',
    order: 3,
    title: '推荐训练',
    desc: '先练推荐题和最近错题',
    path: '/questions/recommendations',
    icon: BookOpenCheck,
    status: wrongQuestions.value.length ? '有反馈' : '可开始',
    tone: wrongQuestions.value.length ? 'pill--warning' : 'pill--neutral'
  },
  {
    key: 'coach',
    order: 4,
    title: '今日计划',
    desc: '按任务推进，并完成即时复盘',
    path: '/agent/today',
    icon: Sparkles,
    status: agentTasks.value.length ? '有任务' : '待生成',
    tone: agentTasks.value.length ? 'pill--success' : 'pill--warning'
  }
])

const readinessItems = computed(() => [
  {
    key: 'resume',
    ready: Boolean(overview.value?.resumeCount),
    title: overview.value?.resumeCount ? `已有 ${overview.value.resumeCount} 份简历` : '还没有简历',
    desc: overview.value?.recentResumeParse ? `最近解析：${formatStatus(overview.value.recentResumeParse.parseStatus)}` : '建议先上传或创建简历'
  },
  {
    key: 'optimize',
    ready: Boolean(overview.value?.recentResumeOptimize),
    title: overview.value?.recentResumeOptimize ? '已有简历优化记录' : '暂无简历优化记录',
    desc: overview.value?.recentResumeOptimize ? `状态：${formatStatus(overview.value.recentResumeOptimize.optimizeStatus)}` : '完成匹配后再优化更有针对性'
  },
  {
    key: 'interview',
    ready: Boolean(overview.value?.recentInterview),
    title: overview.value?.recentInterview ? '已有模拟面试记录' : '暂无模拟面试记录',
    desc: overview.value?.recentInterview ? formatStatus(overview.value.recentInterview.status) : '先完成一次轻量模拟面试'
  }
])

const reportInsightText = computed(() => {
  const report = overview.value?.recentReport
  if (!report) return '暂无面试报告反馈'
  const insights = [...(report.weakPoints || []), ...(report.suggestions || [])].filter(Boolean).slice(0, 2)
  return insights.join(' · ') || `${formatStatus(report.status)} · ${report.totalScore ?? '--'} 分`
})

const emptyTaskText = computed(() => {
  if (dailyPlanError.value || agentTasksError.value) return '今日任务暂时加载失败，可以稍后重试，或先去刷题/面试。'
  if (!overview.value?.resumeCount) return '先补简历或岗位后，今日计划会更可信。'
  return '生成计划后，这里会出现今天最该推进的训练动作。'
})

const pageErrors = computed(() => [
  overviewError.value
    ? { key: 'overview', message: overviewError.value, retry: fetchOverview }
    : null,
  dailyPlanError.value
    ? { key: 'daily-plan', message: dailyPlanError.value, retry: fetchDailyPlan }
    : null,
  agentTasksError.value
    ? { key: 'agent-tasks', message: agentTasksError.value, retry: fetchAgentTasks }
    : null,
  wrongQuestionsError.value
    ? { key: 'wrong-questions', message: wrongQuestionsError.value, retry: fetchWrongQuestions }
    : null
].filter((item): item is { key: string; message: string; retry: () => Promise<void> } => Boolean(item)))

const tools = [
  { title: '面试历史', path: '/interviews/history', icon: History },
  { title: '训练分析', path: '/analytics/personal', icon: BarChart3 },
  { title: '学习计划', path: '/study-plans', icon: Route },
  { title: '每日任务', path: '/daily-tasks', icon: ClipboardCheck }
]

const mobileQuickActions = computed(() => [
  {
    label: wrongQuestions.value.length ? '复盘错题' : '刷推荐题',
    path: wrongQuestions.value.length ? '/questions/wrong-records' : '/questions/recommendations',
    icon: BookOpenCheck
  },
  {
    label: '模拟面试',
    path: '/interviews/create',
    icon: MessageSquare
  },
  {
    label: '今日任务',
    path: '/agent/today',
    icon: Sparkles
  }
])

const go = (path: string) => {
  router.push(path)
}

const shouldForceRefresh = (force: unknown = true) => force !== false

const fallbackTask = (task: Omit<HomeTask, 'key' | 'taskId' | 'minutes'>): HomeTask => ({
  ...task,
  key: `fallback-${task.path}`,
  minutes: 30
})

const toHomeTask = (task: AgentTaskVO): HomeTask => {
  const icon = taskIcon(task.taskType)
  return {
    key: `task-${task.id}`,
    taskId: task.id,
    title: displayAgentTaskTitle(task),
    description: displayAgentTaskDescription(task),
    reason: task.reason || task.relatedSkillName || '来自今日训练任务',
    reasons: taskReasons(task),
    benefit: taskBenefit(task),
    cta: '开始训练',
    path: normalizeTaskPath(task.actionUrl),
    statusLabel: formatStatus(task.status || 'TODO'),
    minutes: Number(task.estimatedMinutes) || 20,
    icon: icon.icon,
    tone: icon.tone
  }
}

const findAgentTaskById = (taskId?: number) => {
  if (!taskId) return undefined
  const tasks = [...agentTasks.value, ...(dailyPlan.value?.tasks || [])]
  return tasks.find((task) => Number(task.id) === Number(taskId))
}

const isTaskClosed = (task?: AgentTaskVO) => ['DONE', 'SKIPPED'].includes(String(task?.status || '').toUpperCase())

const canCompleteTask = (taskId?: number) => {
  const task = findAgentTaskById(taskId)
  return Boolean(task && !isTaskClosed(task))
}

const canSkipTask = (taskId?: number) => canCompleteTask(taskId)

const findTaskById = (taskId: number) =>
  agentTasks.value.find((item) => item.id === taskId) || dailyPlan.value?.tasks?.find((item) => item.id === taskId)

const taskReasons = (task: AgentTaskVO) => [
  task.reason || '来自智能教练今日计划',
  task.relatedSkillName ? `聚焦 ${task.relatedSkillName}` : '围绕当前求职准备状态推荐',
  task.estimatedMinutes ? `预计 ${task.estimatedMinutes} 分钟，可单次完成` : '适合今天先推进'
]

const taskBenefit = (task: AgentTaskVO) => {
  const skill = task.relatedSkillName || task.targetJobTitle || ''
  const type = String(task.taskType || '').toUpperCase()
  if (type.includes('WRONG')) {
    return skill ? `把 ${skill} 的错题转成稳定掌握点` : '减少同类题反复出错'
  }
  if (type.includes('QUESTION')) {
    return skill ? `验证 ${skill} 是否能答清楚` : '用题目结果校准当前知识短板'
  }
  if (type.includes('INTERVIEW')) {
    return '生成可复盘的表达、追问和面试报告反馈'
  }
  if (type.includes('RESUME')) {
    return '把简历表达改成更能支撑面试追问的证据'
  }
  if (type.includes('REPORT')) {
    return '从报告里提炼下一次训练优先级'
  }
  if (type.includes('REVIEW')) {
    return skill ? `巩固 ${skill} 的项目表达和常见误区` : '把零散材料整理成可复用表达'
  }
  return '完成后会回流到下一轮智能教练推荐'
}

const normalizeTaskPath = (path?: string) => {
  if (path && path.startsWith('/')) return path
  return '/agent/today'
}

const taskIcon = (taskType?: string): { icon: Component; tone: string } => {
  const type = String(taskType || '').toUpperCase()
  if (type.includes('QUESTION')) return { icon: BookOpenCheck, tone: 'tone-blue' }
  if (type.includes('INTERVIEW')) return { icon: MessageSquare, tone: 'tone-green' }
  if (type.includes('RESUME')) return { icon: FileText, tone: 'tone-orange' }
  if (type.includes('REPORT')) return { icon: BarChart3, tone: 'tone-purple' }
  return { icon: Sparkles, tone: 'tone-blue' }
}

const displayAgentTaskTitle = (task: AgentTaskVO) => {
  if (task.title) return task.title
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
  return map[String(task.taskType || '').toUpperCase()] || '今日训练任务'
}

const displayAgentTaskDescription = (task: AgentTaskVO) => {
  if (task.description) return task.description
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
  return map[String(task.taskType || '').toUpperCase()] || '根据你的当前准备状态生成的训练任务。'
}

const formatStatus = (status?: string) => {
  const value = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    TODO: '待处理',
    DOING: '进行中',
    PENDING: '待处理',
    RUNNING: '生成中',
    SUCCESS: '已生成',
    DONE: '已完成',
    COMPLETED: '已完成',
    SKIPPED: '已跳过',
    FAILED: '失败',
    ERROR: '失败',
    PARSED: '已解析',
    ANALYZED: '已分析',
    GENERATED: '已生成'
  }
  return map[value] || '状态待确认'
}

const statusClass = (status: string) => {
  if (['已完成', '已生成', '已解析', '已分析', '可用', '已接入'].includes(status)) return 'pill--success'
  if (['待处理', '待补充', '待生成', '待开始', '待复盘'].includes(status)) return 'pill--warning'
  if (['失败'].includes(status)) return 'pill--danger'
  return 'pill--neutral'
}

const fetchOverview = async (force: unknown = true, preserveCurrent = false) => {
  overviewLoading.value = true
  overviewError.value = ''
  try {
    overview.value = await fetchCachedDashboardOverview(shouldForceRefresh(force))
  } catch (error) {
    if (!preserveCurrent) overview.value = null
    overviewError.value = getErrorMessage(error, '首页概览暂时加载失败，已保留可执行入口。')
  } finally {
    overviewLoading.value = false
  }
}

const fetchDailyPlan = async (force: unknown = true, preserveCurrent = false) => {
  dailyPlanLoading.value = true
  dailyPlanError.value = ''
  try {
    dailyPlan.value = await fetchCachedLatestDailyPlan(formatLocalDate(), shouldForceRefresh(force))
  } catch (error) {
    if (!preserveCurrent) dailyPlan.value = null
    dailyPlanError.value = getErrorMessage(error, '今日计划暂时不可用，可以手动生成或稍后重试。')
  } finally {
    dailyPlanLoading.value = false
  }
}

const fetchAgentTasks = async (force: unknown = true, preserveCurrent = false) => {
  agentTasksLoading.value = true
  agentTasksError.value = ''
  try {
    const result = await fetchCachedTodayAgentTasks(formatLocalDate(), shouldForceRefresh(force))
    agentTasks.value = result.tasks || []
  } catch (error) {
    if (!preserveCurrent) agentTasks.value = []
    agentTasksError.value = getErrorMessage(error, '今日任务暂时加载失败，可以稍后重试或去今日计划页继续。')
  } finally {
    agentTasksLoading.value = false
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
    wrongQuestionsError.value = getErrorMessage(error, '错题记录暂时加载失败。')
  } finally {
    wrongQuestionsLoading.value = false
  }
}

let secondaryDataCancelled = false

const deferSecondaryHomeData = (callback: () => void | Promise<void>, timeout = 1600, fallbackDelay = 350) => {
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

const refreshTrainingSnapshotAfterMutation = async () => {
  await Promise.allSettled([
    fetchOverview(true, true),
    fetchDailyPlan(true, true),
    fetchAgentTasks(true, true)
  ])
}

const mergeAgentTask = (updatedTask: AgentTaskVO) => {
  const patchTask = (task: AgentTaskVO) => (Number(task.id) === Number(updatedTask.id) ? { ...task, ...updatedTask } : task)
  agentTasks.value = agentTasks.value.map(patchTask)
  if (dailyPlan.value?.tasks?.length) {
    dailyPlan.value = {
      ...dailyPlan.value,
      tasks: dailyPlan.value.tasks.map(patchTask)
    }
  }
}

const generatePlan = async () => {
  dailyPlanGenerating.value = true
  dailyPlanError.value = ''
  try {
    dailyPlan.value = await generateDailyPlanApi({
      date: formatLocalDate(),
      taskCount: 4,
      maxTotalMinutes: 90,
      forceRegenerate: true
    })
    agentTasks.value = dailyPlan.value.tasks || agentTasks.value
    invalidateUserHomeTrainingCaches(formatLocalDate())
    await refreshTrainingSnapshotAfterMutation()
  } catch (error) {
    dailyPlanError.value = getErrorMessage(error, '今日计划生成失败，未新增任务；可以稍后重试，或先去题库/面试训练。')
  } finally {
    dailyPlanGenerating.value = false
  }
}

const skipTask = async (taskId: number) => {
  const task = findTaskById(taskId)
  const confirmed = await confirmDangerActionPreview({
    title: '今天跳过任务',
    action: '将首页第 1 个训练任务标记为今天跳过',
    target: task?.title || '训练记录已保存',
    impact: '该任务会从今日优先动作中移出，今日任务完成率和后续推荐可能跟随变化。',
    rollback: '可以在任务中心把任务恢复为待完成，或重新生成今日计划。',
    audit: '训练记录、跳过状态和跳过原因会保留，便于稍后复盘。',
    tips: ['确认今天确实不准备推进这个任务。', '如果只是暂时没时间，可以进入任务中心稍后处理。'],
    confirmButtonText: '今天跳过'
  })
  if (!confirmed) return
  taskMutatingId.value = taskId
  try {
    const skippedTask = await skipAgentTaskApi(taskId, { skipReason: '今日首页选择跳过' })
    mergeAgentTask(skippedTask)
    invalidateUserHomeTrainingCaches(formatLocalDate())
    await refreshTrainingSnapshotAfterMutation()
  } catch (error) {
    agentTasksError.value = getErrorMessage(error, '任务跳过失败，请稍后重试。')
  } finally {
    taskMutatingId.value = null
  }
}

const completeTask = async (taskId: number) => {
  taskMutatingId.value = taskId
  try {
    const completedTask = await completeAgentTaskApi(taskId, { note: '用户在今日首页标记完成' })
    mergeAgentTask(completedTask)
    completionReviewTask.value = completedTask
    completionReviewNote.value = ''
    completionReviewVisible.value = true
    invalidateUserHomeTrainingCaches(formatLocalDate())
    await refreshTrainingSnapshotAfterMutation()
  } catch (error) {
    agentTasksError.value = getErrorMessage(error, '任务完成状态保存失败，请稍后重试。')
  } finally {
    taskMutatingId.value = null
  }
}

const goCompletionNextAction = () => {
  completionReviewVisible.value = false
  go(completionReviewNextAction.value.path)
}

onMounted(() => {
  secondaryDataCancelled = false
  fetchOverview(false)
  fetchDailyPlan(false)
  deferSecondaryHomeData(() => fetchAgentTasks(false), 900, 180)
  deferSecondaryHomeData(() => fetchWrongQuestions(false), 1800, 450)
})

onBeforeUnmount(() => {
  secondaryDataCancelled = true
})
</script>

<style scoped lang="scss">
.jobcoach-home {
  display: grid;
  gap: 18px;
  color: #172033;
}

.home-hero,
.focus-card,
.path-section,
.task-section,
.insight-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
}

.secondary-toggle-section {
  display: flex;
  justify-content: center;
}

.secondary-toggle {
  width: min(100%, 760px);
  min-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid #d8e1ec;
  border-radius: 8px;
  background: #f8fafc;
  color: #1f2a44;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.secondary-toggle:hover {
  border-color: #a9bdd6;
  background: #fff;
  transform: translateY(-1px);
}

.secondary-toggle strong,
.secondary-toggle small {
  display: block;
}

.secondary-toggle strong {
  font-size: 14px;
  font-weight: 800;
}

.secondary-toggle small {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.secondary-toggle svg {
  flex: 0 0 auto;
  transition: transform 0.2s ease;
}

.secondary-toggle svg.is-open {
  transform: rotate(180deg);
}

.path-section--secondary {
  background: rgba(248, 250, 252, 0.9);
  box-shadow: none;
}

.path-section--secondary .journey-step {
  min-height: 112px;
  background: #fff;
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr);
  gap: 22px;
  padding: 30px;
}

.hero-main {
  min-width: 0;
}

.eyebrow,
.section-kicker,
.card-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.home-hero h1 {
  max-width: 780px;
  margin: 12px 0 0;
  color: #0f172a;
  font-size: 38px;
  font-weight: 800;
  line-height: 1.16;
  letter-spacing: 0;
}

.hero-desc {
  max-width: 760px;
  margin: 16px 0 0;
  color: #526071;
  font-size: 15px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.hero-actions :deep(.el-button),
.focus-actions :deep(.el-button),
.section-actions :deep(.el-button) {
  gap: 6px;
}

.hero-side {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 54%),
    #f8fbff;
}

.side-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;

  strong {
    color: #1d4ed8;
    font-size: 20px;
  }
}

.confidence-meter {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e2e8f0;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #2563eb, #15946f);
  }
}

.hero-side dl {
  display: grid;
  gap: 12px;
  margin: 0;
}

.hero-side dl div {
  display: grid;
  gap: 4px;
}

.hero-side dt {
  color: #64748b;
  font-size: 12px;
}

.hero-side dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: #172033;
  font-weight: 700;
  line-height: 1.45;
}

.error-stack {
  display: grid;
  gap: 10px;
}

.state-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
}

.state-strip--warning {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.mobile-action-dock {
  display: none;
}

.focus-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.focus-card,
.path-section,
.task-section,
.insight-card {
  padding: 20px;
}

.focus-card--primary {
  border-color: #bfdbfe;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 58%),
    #fff;
}

.card-heading,
.section-head,
.task-row__body > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.focus-card h2,
.section-head h2,
.insight-card h2 {
  margin: 5px 0 0;
  color: #0f172a;
  font-size: 20px;
  line-height: 1.3;
}

.focus-card h2 {
  margin-top: 16px;
  font-size: 24px;
}

.focus-card p {
  margin: 10px 0 0;
  color: #526071;
  line-height: 1.75;
}

.source-boundary {
  padding: 10px 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  overflow-wrap: anywhere;
}

.reason-list {
  display: grid;
  gap: 9px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #334155;
    font-size: 14px;
    line-height: 1.55;
  }

  svg {
    flex: 0 0 auto;
    margin-top: 3px;
    color: #15946f;
  }
}

.action-facts,
.task-row__facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;

  span {
    max-width: 100%;
    padding: 6px 9px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
}

.focus-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #eef2f7;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.pill--success {
  background: #dcfce7;
  color: #166534;
}

.pill--warning {
  background: #ffedd5;
  color: #9a3412;
}

.pill--danger {
  background: #fee2e2;
  color: #991b1b;
}

.pill--neutral {
  background: #eef2f7;
  color: #475569;
}

.source-list,
.readiness-list,
.feedback-list,
.tool-list {
  display: grid;
  gap: 10px;
}

.source-item,
.readiness-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #f8fafc;

  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: #2563eb;
  }

  strong {
    display: block;
    color: #172033;
    font-size: 14px;
  }

  span,
  small {
    display: block;
    margin-top: 3px;
    overflow-wrap: anywhere;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
  }
}

.source-item.is-missing svg {
  color: #f47a1f;
}

.section-head {
  margin-bottom: 16px;
}

.section-head--compact {
  margin-bottom: 12px;
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.journey {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.journey-step,
.task-row,
.feedback-list button,
.tool-list button {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  font: inherit;
}

.journey-step {
  display: grid;
  min-height: 166px;
  align-content: start;
  gap: 8px;
  padding: 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  svg {
    color: #2563eb;
  }

  strong {
    color: #0f172a;
  }

  small {
    color: #64748b;
    line-height: 1.5;
  }
}

.journey-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 800;
}

.task-list {
  display: grid;
  gap: 10px;
}

.task-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
}

.task-row__type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #dbeafe;
  color: #2563eb;
}

.tone-green {
  background: #dcfce7;
  color: #15803d;
}

.tone-orange {
  background: #ffedd5;
  color: #c2410c;
}

.tone-purple {
  background: #ede9fe;
  color: #6d28d9;
}

.tone-blue {
  background: #dbeafe;
  color: #2563eb;
}

.task-row__body {
  min-width: 0;

  strong {
    color: #0f172a;
    line-height: 1.35;
  }

  p {
    margin: 6px 0 0;
    color: #526071;
    font-size: 14px;
    line-height: 1.55;
  }

}

.task-row__facts {
  margin-top: 10px;
}

.task-row__actions {
  display: grid;
  align-content: center;
  justify-items: end;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
}

.empty-panel {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 32px 20px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;

  svg {
    color: #2563eb;
  }

  strong {
    color: #0f172a;
    font-size: 18px;
  }

  span {
    max-width: 520px;
    color: #64748b;
    line-height: 1.6;
  }
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.readiness-item > span {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 999px;
  background: #f59e0b;

  &.is-ready {
    background: #15946f;
  }
}

.feedback-list button,
.tool-list button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: #bfdbfe;
    background: #f8fbff;
  }

  svg {
    flex: 0 0 auto;
    color: #2563eb;
  }
}

.feedback-list strong,
.feedback-list small {
  display: block;
}

.feedback-list strong {
  color: #172033;
  font-size: 14px;
}

.feedback-list small {
  margin-top: 3px;
  color: #64748b;
  line-height: 1.5;
}

.tool-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tool-list button {
  justify-content: flex-start;
  min-height: 44px;
}

.empty-small {
  padding: 14px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.completion-review {
  display: grid;
  gap: 14px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    margin-top: 6px;
    color: #0f172a;
    font-size: 18px;
    line-height: 1.45;
  }

  p,
  li {
    color: #526071;
    line-height: 1.7;
  }

  ul {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 18px;
  }
}

.review-kicker {
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.review-note {
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 1080px) {
  .home-hero,
  .focus-grid,
  .insight-grid {
    grid-template-columns: 1fr;
  }

  .journey {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .jobcoach-home {
    gap: 10px;
  }

  .home-hero,
  .focus-card,
  .path-section,
  .task-section,
  .insight-card {
    padding: 14px;
  }

  .home-hero {
    gap: 10px;
    padding-bottom: 12px;
  }

  .home-hero h1 {
    margin-top: 8px;
    font-size: 23px;
    line-height: 1.22;
  }

  .hero-desc {
    display: none;
  }

  .hero-side {
    padding: 14px;
  }

  .hero-side dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mobile-action-dock {
    position: sticky;
    top: calc(var(--user-mobile-top-height, 62px) + 6px);
    z-index: 30;
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(14px);
  }

  .mobile-action-dock__primary,
  .mobile-action-dock__quick button {
    border: 0;
    border-radius: 8px;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .mobile-action-dock__primary {
    display: grid;
    gap: 3px;
    padding: 10px;
    background: #2563eb;
    color: #fff;

    span,
    small {
      color: rgba(255, 255, 255, 0.78);
      font-size: 12px;
      line-height: 1.35;
    }

    strong {
      overflow-wrap: anywhere;
      line-height: 1.35;
    }
  }

  .mobile-action-dock__meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;

    span {
      display: grid;
      gap: 2px;
      min-width: 0;
      padding: 6px;
      border-radius: 8px;
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
      line-height: 1.3;
      overflow-wrap: anywhere;
      text-align: center;
    }

    b {
      color: #64748b;
      font-size: 11px;
      font-weight: 700;
    }
  }

  .mobile-action-dock__quick {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .mobile-action-dock__quick button {
    display: grid;
    justify-items: center;
    gap: 5px;
    min-height: 52px;
    padding: 8px 4px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    line-height: 1.2;
    text-align: center;

    svg {
      color: currentColor;
    }

    span {
      max-width: 100%;
      overflow-wrap: anywhere;
    }
  }

  .focus-actions,
  .section-actions {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .focus-actions :deep(.el-button),
  .section-actions :deep(.el-button) {
    width: 100%;
  }

  .hero-actions {
    display: none;
  }

  .secondary-toggle {
    width: 100%;
    align-items: flex-start;
    padding: 12px;

    small {
      max-width: 100%;
      overflow-wrap: anywhere;
    }
  }

  .hero-side,
  .task-list .task-row:nth-of-type(n + 4) {
    display: none;
  }

  .card-heading,
  .section-head,
  .task-row__body > div {
    display: grid;
    justify-content: stretch;
  }

  .journey,
  .tool-list {
    grid-template-columns: 1fr;
  }

  .task-row {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 12px;
  }

  .task-row__actions {
    justify-items: start;
  }
}
</style>
