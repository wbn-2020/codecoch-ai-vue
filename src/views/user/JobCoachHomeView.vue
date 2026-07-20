<template>
  <div class="jobcoach-home">
    <section class="dashboard-cockpit-grid" :aria-busy="isHomeLoading">
      <article
        v-if="orderedActionList[0]"
        class="primary-action-shell"
        data-action-item
        data-primary="true"
      >
        <div class="primary-action-panel">
          <div class="card-heading">
            <span class="card-kicker">今日主行动</span>
            <span class="pill" :class="statusClass(orderedActionList[0].statusLabel)">
              {{ orderedActionList[0].statusLabel }}
            </span>
          </div>
          <h2 data-primary-title>{{ orderedActionList[0].title }}</h2>
          <p>{{ orderedActionList[0].description }}</p>
          <div class="primary-action-meta">
            <span>{{ orderedActionList[0].sourceLabel }}</span>
            <span>{{ orderedActionList[0].minutes }} 分钟</span>
          </div>
          <button
            type="button"
            class="primary-action-cta"
            data-primary-cta
            :disabled="orderedActionList[0].disabled || (!orderedActionList[0].action && (agentTasksLoading || applicationStatsLoading))"
            @click="runPrimaryTask(orderedActionList[0])"
          >
            <PlayCircle :size="18" />
            {{ orderedActionList[0].cta }}
          </button>
        </div>

        <details
          v-if="orderedActionList[0].taskId && canCompleteTask(orderedActionList[0].taskId)"
          class="task-operations"
          data-task-operations
        >
          <summary tabindex="0">任务操作</summary>
          <div>
            <button
              type="button"
              :disabled="taskMutationLocked"
              @click="completeTask(orderedActionList[0].taskId)"
            >
              完成
            </button>
            <button
              type="button"
              :disabled="taskMutationLocked"
              @click="skipTask(orderedActionList[0].taskId)"
            >
              跳过
            </button>
          </div>
        </details>
      </article>

      <aside class="signal-panel" aria-label="求职关键信号">
        <div class="signal-heading">
          <span>关键信号</span>
          <strong>4 项</strong>
        </div>
        <div class="cockpit-signal-grid">
          <button
            v-for="signal in dashboardSignals"
            :key="signal.key"
            type="button"
            class="cockpit-signal"
            :class="{ 'is-ready': signal.ready, 'is-error': Boolean(signal.error) }"
            :data-signal="signal.key"
            @click="go(signal.path)"
          >
            <component :is="signal.icon" :size="17" />
            <span>
              <small>{{ signal.label }}</small>
              <strong>{{ signal.value }}</strong>
              <em>{{ signal.error || signal.detail }}</em>
            </span>
          </button>
        </div>
      </aside>
    </section>

    <section class="action-timeline">
      <div class="section-head">
        <div>
          <p class="section-kicker">行动时间线</p>
          <h2>主行动之后，最多再推进两步</h2>
        </div>
        <div class="section-actions">
          <el-button text :loading="agentTasksLoading" @click="fetchAgentTasks">刷新</el-button>
          <el-button @click="go('/agent/tasks')">查看全部</el-button>
        </div>
      </div>

      <p v-if="actionModuleErrorText" class="module-error">
        {{ actionModuleErrorText }}
      </p>

      <div v-if="orderedActionList.length > 1" class="timeline-list">
        <article
          v-for="(task, index) in orderedActionList.slice(1)"
          :key="task.key"
          class="timeline-row"
          data-action-item
          data-primary="false"
        >
          <span class="timeline-index">{{ index + 2 }}</span>
          <span class="task-row__type" :class="task.tone">
            <component :is="task.icon" :size="17" />
          </span>
          <div class="task-row__body">
            <div>
              <strong>{{ task.title }}</strong>
              <span class="pill" :class="statusClass(task.statusLabel)">{{ task.statusLabel }}</span>
            </div>
            <div class="timeline-meta">
              <span>{{ task.sourceLabel }}</span>
              <span>{{ task.minutes }} 分钟</span>
            </div>
          </div>
          <button type="button" class="timeline-enter" @click="go(task.path)">进入</button>
          <details
            v-if="task.taskId && canCompleteTask(task.taskId)"
            class="task-operations"
            data-task-operations
          >
            <summary tabindex="0">更多</summary>
            <div>
              <button
                type="button"
                :disabled="taskMutationLocked"
                @click="completeTask(task.taskId)"
              >
                完成
              </button>
              <button
                type="button"
                :disabled="taskMutationLocked"
                @click="skipTask(task.taskId)"
              >
                跳过
              </button>
            </div>
          </details>
        </article>
      </div>

      <p v-else class="timeline-empty">当前只有主行动，完成后会继续生成下一步。</p>
    </section>

    <article ref="recommendationSummary" class="recommendation-summary">
      <div class="card-heading">
        <span class="card-kicker">推荐依据摘要</span>
        <span class="pill" :class="confidencePillClass">{{ confidenceLabel }}</span>
      </div>
      <p class="source-boundary">{{ recommendationBoundaryText }}</p>
      <p v-if="evidenceModuleErrorText" class="module-error">{{ evidenceModuleErrorText }}</p>

      <details class="recommendation-details" :open="showRecommendationDetails" @toggle="updateRecommendationDetails">
        <summary tabindex="0">查看完整依据、来源与边界</summary>
        <div class="recommendation-details__content">
          <dl class="recommendation-facts">
            <div>
              <dt>主行动依据</dt>
              <dd>{{ primaryTask.reason }}</dd>
            </div>
            <div>
              <dt>信任边界</dt>
              <dd>{{ primaryTask.trustBoundary }}</dd>
            </div>
            <div>
              <dt>预期收益</dt>
              <dd>{{ primaryTask.benefit }}</dd>
            </div>
          </dl>
          <div v-if="trustedSuggestionSummaries.length" class="trusted-summary-list">
            <div v-for="summary in trustedSuggestionSummaries" :key="summary.id">
              <strong>{{ summary.title }}</strong>
              <span>{{ summary.sourceLabel }} · {{ summary.boundary }}</span>
            </div>
          </div>
          <div class="source-list">
            <div v-for="source in recommendationSources" :key="source.key" class="source-item" :class="{ 'is-missing': source.missing }">
              <component :is="source.icon" :size="17" />
              <div>
                <strong>{{ source.title }}</strong>
                <span>{{ source.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </details>
    </article>

    <nav class="mobile-discovery-links" aria-label="推荐依据和资料工具">
      <button type="button" @click="openRecommendationDetails">查看推荐依据</button>
      <button type="button" @click="openSecondaryMaterials">打开资料与工具</button>
    </nav>

    <section class="secondary-toggle-section">
      <button type="button" class="secondary-toggle" :aria-expanded="showSecondarySections" @click="showSecondarySections = !showSecondarySections">
        <span>
          <strong>{{ showSecondarySections ? '收起资料和工具' : '展开资料和工具' }}</strong>
          <small>简历、岗位、反馈和面试前工具都在这里；今天先完成上面的优先动作。</small>
        </span>
        <ChevronDown :size="18" :class="{ 'is-open': showSecondarySections }" />
      </button>
    </section>

    <section v-if="showSecondarySections" ref="secondaryMaterial" class="secondary-material">
      <div class="path-section path-section--secondary">
        <div class="section-head">
          <div>
            <p class="section-kicker">资料辅助</p>
            <h2>需要补资料时，再按这 6 步完善推荐依据</h2>
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
      </div>

      <div class="insight-grid">
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

        <article class="insight-card recent-artifacts-panel">
          <div class="section-head section-head--compact">
            <div>
              <p class="section-kicker">最近产物</p>
              <h2>可继续转成行动</h2>
            </div>
          </div>
          <div v-if="careerRecentArtifacts.length" class="artifact-list">
            <button
              v-for="artifact in careerRecentArtifacts"
              :key="artifact.id"
              type="button"
              @click="go(artifact.actionUrl || '/agent/today')"
            >
              <strong>{{ artifact.title }}</strong>
              <small>{{ artifact.summary || '回到产物页继续推进。' }}</small>
            </button>
          </div>
          <p v-else class="empty-small">完成 JD 匹配、面试报告或今日计划后，这里会出现最近产物。</p>
        </article>

        <article class="insight-card agent-loop-panel">
          <div class="section-head section-head--compact">
            <div>
              <p class="section-kicker">Agent loop</p>
              <h2>详细统计</h2>
            </div>
          </div>
          <dl class="agent-loop-stats">
            <div><dt>全部</dt><dd>{{ agentLoopHomeSummary.total }}</dd></div>
            <div><dt>进行中</dt><dd>{{ agentLoopHomeSummary.active }}</dd></div>
            <div><dt>完成</dt><dd>{{ agentLoopHomeSummary.done }}</dd></div>
            <div><dt>跳过</dt><dd>{{ agentLoopHomeSummary.skipped }}</dd></div>
            <div><dt>预计分钟</dt><dd>{{ agentLoopHomeSummary.estimatedMinutes }}</dd></div>
          </dl>
          <div v-if="agentLoopHomeLatestReview" class="agent-loop-review-meta" data-latest-review>
            <span>最近复盘 {{ agentLoopHomeLatestReview.reviewDate || agentLoopHomeLatestReview.createdAt || '日期待确认' }}</span>
            <span>{{ agentLoopHomeReviewConfidence }}</span>
            <span v-if="agentLoopHomeLatestReview.fallback">规则兜底</span>
          </div>
          <p data-agent-loop-adjustment>{{ agentLoopHomeAdjustment }}</p>
          <el-button text @click="go('/agent/reviews')">查看复盘</el-button>
        </article>
      </div>
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
        <p class="review-hint">下一步建议：优先点击「{{ completionReviewNextAction.label }}」继续。</p>
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
  ClipboardCheck,
  FileText,
  History,
  MessageSquare,
  PlayCircle,
  Route,
  Sparkles,
  Target
} from 'lucide-vue-next'
import type { Component, Ref } from 'vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'

import {
  completeAgentTaskApi,
  skipAgentTaskApi
} from '@/api/agent'
import { getNotificationsApi, type NotificationVO } from '@/api/notification'
import {
  getAgentReviewsApi,
  getApplicationStatsApi,
  type AgentReviewVO,
  type JobApplicationStatsVO
} from '@/api/v4'
import {
  fetchCachedDashboardOverview,
  fetchCachedLatestDailyPlan,
  fetchCachedTodayAgentTasks,
  fetchCachedV3DashboardOverview,
  fetchCachedWrongQuestions,
  invalidateUserHomeTrainingCaches
} from '@/composables/useUserHomeDataCache'
import { buildAgentLoopOverview } from '@/features/agent-loop/agentLoopAdapter'
import {
  buildCareerActionQueue,
  buildCareerRecentArtifacts,
  buildCareerRiskSignals,
  buildTrustedSuggestionSummaries,
  canPromoteCareerAction,
  getCareerActionSourceLabel,
  getCareerActionTrustBoundary,
  isCareerActionClosed,
  type CareerActionItemVO
} from '@/features/career-command-center'
import { buildTodayActions, type TodayActionItem } from '@/features/today-actions'
import type { AgentTaskVO, DailyPlanVO } from '@/types/agent'
import type { UserDashboardOverviewVO, V3DashboardOverviewVO } from '@/types/dashboard'
import type { WrongQuestionVO } from '@/types/question'
import {
  buildAgentTaskActionPath,
  hasAgentTaskActionEntry,
  isAgentJobApplicationTask
} from '@/utils/agentTaskAction'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'
import request from '@/utils/request'
import { sanitizeLocalActionPath } from '@/utils/routeSecurity'

interface HomeTask {
  key: string
  taskId?: number
  action?: 'retry-home-data'
  disabled?: boolean
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
  sourceLabel: string
  trustBoundary: string
  promoted: boolean
}

type ResourceLoadState = 'idle' | 'loading' | 'success' | 'error'

interface LatestRequestOptions<T> {
  request: () => Promise<T>
  apply: (value: T) => void
  clear: () => void
  preserveCurrent: boolean
  fallbackError: string
}

interface DashboardSignal {
  key: 'target-job' | 'evidence' | 'recent-report' | 'risk-gap'
  label: string
  value: string
  detail: string
  path: string
  ready: boolean
  error?: string
  icon: Component
}

const router = useRouter()

const overview = ref<UserDashboardOverviewVO | null>(null)
const v3Overview = ref<V3DashboardOverviewVO | null>(null)
const overviewLoading = ref(false)
const v3OverviewLoading = ref(false)
const overviewError = ref('')
const v3OverviewError = ref('')

const applicationStats = ref<JobApplicationStatsVO | null>(null)
const applicationStatsLoading = ref(false)
const applicationStatsError = ref('')

const notifications = ref<NotificationVO[]>([])
const notificationsLoading = ref(false)
const notificationsError = ref('')

const dailyPlan = ref<DailyPlanVO | null>(null)
const dailyPlanLoading = ref(false)
const dailyPlanError = ref('')

const agentTasks = ref<AgentTaskVO[]>([])
const agentTasksLoading = ref(false)
const agentTasksError = ref('')

const agentReviews = ref<AgentReviewVO[]>([])
const agentReviewsLoading = ref(false)
const agentReviewsError = ref('')

const taskMutationLocked = ref(false)
const completionReviewVisible = ref(false)
const completionReviewTask = ref<AgentTaskVO | null>(null)
const completionReviewNote = ref('')
const showSecondarySections = ref(false)
const showRecommendationDetails = ref(false)
const recommendationSummary = ref<HTMLElement>()
const secondaryMaterial = ref<HTMLElement>()

const wrongQuestions = ref<WrongQuestionVO[]>([])
const wrongQuestionsError = ref('')

const overviewLoadState = ref<ResourceLoadState>('idle')
const v3OverviewLoadState = ref<ResourceLoadState>('idle')
const applicationStatsLoadState = ref<ResourceLoadState>('idle')
const notificationsLoadState = ref<ResourceLoadState>('idle')
const dailyPlanLoadState = ref<ResourceLoadState>('idle')
const agentTasksLoadState = ref<ResourceLoadState>('idle')
const agentReviewsLoadState = ref<ResourceLoadState>('idle')

const createLatestRequestRunner = (
  loading: Ref<boolean>,
  state: Ref<ResourceLoadState>,
  errorText: Ref<string>
) => {
  let latestGeneration = 0

  return async <T>(options: LatestRequestOptions<T>) => {
    const generation = ++latestGeneration
    loading.value = true
    if (!options.preserveCurrent || state.value === 'idle') state.value = 'loading'
    errorText.value = ''

    try {
      const value = await options.request()
      if (generation !== latestGeneration) return
      options.apply(value)
      state.value = 'success'
    } catch (error) {
      if (generation !== latestGeneration) return
      if (!options.preserveCurrent) options.clear()
      errorText.value = getErrorMessage(error, options.fallbackError)
      state.value = 'error'
    } finally {
      if (generation === latestGeneration) loading.value = false
    }
  }
}

const runLatestOverviewRequest = createLatestRequestRunner(overviewLoading, overviewLoadState, overviewError)
const runLatestV3OverviewRequest = createLatestRequestRunner(v3OverviewLoading, v3OverviewLoadState, v3OverviewError)
const runLatestApplicationStatsRequest = createLatestRequestRunner(
  applicationStatsLoading,
  applicationStatsLoadState,
  applicationStatsError
)
const runLatestNotificationsRequest = createLatestRequestRunner(
  notificationsLoading,
  notificationsLoadState,
  notificationsError
)
const runLatestDailyPlanRequest = createLatestRequestRunner(dailyPlanLoading, dailyPlanLoadState, dailyPlanError)
const runLatestAgentTasksRequest = createLatestRequestRunner(agentTasksLoading, agentTasksLoadState, agentTasksError)
const runLatestAgentReviewsRequest = createLatestRequestRunner(
  agentReviewsLoading,
  agentReviewsLoadState,
  agentReviewsError
)

const hasResumeSignal = computed(() => Boolean(overview.value?.resumeCount))
const currentTargetJob = computed(() => v3Overview.value?.currentTargetJob || null)
const currentTargetJobId = computed(() => {
  const id = Number(currentTargetJob.value?.targetJobId || currentTargetJob.value?.id)
  return Number.isFinite(id) && id > 0 ? id : undefined
})
const hasTargetJobSignal = computed(() => Boolean(currentTargetJobId.value))
const hasTodayPlanSignal = computed(() => Boolean(agentTasks.value.length || dailyPlan.value?.tasks?.length))
const isHomeLoading = computed(() =>
  overviewLoading.value ||
  v3OverviewLoading.value ||
  applicationStatsLoading.value ||
  dailyPlanLoading.value ||
  agentTasksLoading.value
)
const primaryDependenciesPending = computed(() => [
  overviewLoadState.value,
  v3OverviewLoadState.value,
  applicationStatsLoadState.value,
  dailyPlanLoadState.value,
  agentTasksLoadState.value
].some((state) => state === 'idle' || state === 'loading'))
const primaryDependenciesFailed = computed(() => [
  overviewLoadState.value,
  v3OverviewLoadState.value,
  applicationStatsLoadState.value,
  dailyPlanLoadState.value,
  agentTasksLoadState.value
].some((state) => state === 'error'))
const overviewPending = computed(() => ['idle', 'loading'].includes(overviewLoadState.value))
const v3OverviewPending = computed(() => ['idle', 'loading'].includes(v3OverviewLoadState.value))
const firstDayReadiness = computed(() => [
  hasResumeSignal.value,
  hasTargetJobSignal.value,
  hasTodayPlanSignal.value,
  Boolean(wrongQuestions.value.length || overview.value?.recentReport || overview.value?.recentInterview)
])
const firstDayReadyCount = computed(() => firstDayReadiness.value.filter(Boolean).length)
const homeAgentTasks = computed<AgentTaskVO[]>(() =>
  agentTasks.value.length ? agentTasks.value : dailyPlan.value?.tasks || []
)
const careerActions = computed(() => buildCareerActionQueue(homeAgentTasks.value))
const agentLoopHomeOverview = computed(() => buildAgentLoopOverview({
  plan: dailyPlan.value,
  todayTasks: homeAgentTasks.value,
  historyTasks: homeAgentTasks.value,
  reviews: agentReviews.value
}))
const agentLoopHomeSummary = computed(() => agentLoopHomeOverview.value.weekSummary)
const agentLoopHomeAdjustment = computed(() => agentLoopHomeOverview.value.nextAdjustmentSummary)
const agentLoopHomeLatestReview = computed(() => agentLoopHomeOverview.value.latestReview)
const agentLoopHomeReviewConfidence = computed(() => {
  const confidence = String(agentLoopHomeLatestReview.value?.confidenceLevel || '').toUpperCase()
  return {
    HIGH: '高置信度',
    MEDIUM: '中等置信度',
    LOW: '低置信度',
    INSUFFICIENT: '证据不足'
  }[confidence] || '置信度待确认'
})
const primaryCareerAction = computed(() =>
  careerActions.value.find(canPromoteCareerAction)
  || careerActions.value.find((action) => !isCareerActionClosed(action))
  || null
)
const taskCards = computed<HomeTask[]>(() => {
  return careerActions.value.slice(0, 5).map(toHomeTaskFromCareerAction)
})
const readinessNextAction = computed(() => {
  if (!overview.value?.resumeCount) {
    return {
      title: '先补一份可用于匹配的简历',
      description: '没有简历时，AI 只能给通用训练建议。上传或创建简历后，推荐才能围绕项目经历和岗位要求展开。',
      reason: '缺少简历资料',
      label: '补充简历',
      path: '/resumes'
    }
  }
  if (!overview.value?.recentInterview && !overview.value?.recentReport) {
    return {
      title: '完成一次目标岗位模拟面试',
      description: '系统需要真实面试反馈来判断表达、项目深度和知识薄弱点。先做一轮轻量模拟面试，再把报告反哺到今日计划。',
      reason: '缺少面试反馈',
      label: '创建模拟面试',
      path: '/interviews/create'
    }
  }
  if (wrongQuestions.value.length) {
    return {
      title: '复盘最近错题，校准今日短板',
      description: `${wrongQuestions.value.length} 道错题可用于确认知识点是否真正掌握。先从最近出错的题开始。`,
      reason: '来自错题记录',
      label: '复盘错题',
      path: '/questions/wrong-records'
    }
  }
  return {
    title: '生成今天的智能教练计划',
    description: '当前还没有安排好的训练动作。生成计划后，你会看到任务、推荐理由、预计耗时和开始入口。',
    reason: '等待智能教练生成',
    label: '去生成计划',
    path: '/agent/today'
  }
})
const todayActions = computed(() => buildTodayActions({
  agentTasks: homeAgentTasks.value,
  applicationStats: applicationStats.value,
  notifications: notifications.value,
  readinessNextAction: readinessNextAction.value
}, {
  maxItems: 5
}))
const todayActionCards = computed<HomeTask[]>(() => todayActions.value.map(toHomeTaskFromTodayAction))

const primaryTask = computed<HomeTask>(() => {
  if (primaryDependenciesPending.value) {
    return fallbackTask({
      title: '正在整理今天的行动',
      description: '正在读取简历、目标岗位、今日计划和投递状态，完成后再给出明确的下一步。',
      reason: '核心资料仍在加载',
      cta: '正在整理',
      path: '/dashboard',
      statusLabel: '加载中',
      icon: Sparkles,
      tone: 'tone-blue',
      benefit: '避免在资料尚未返回时误判为缺失',
      reasons: ['等待最新资料返回', '旧请求不会覆盖新结果', '加载完成后自动更新'],
      disabled: true
    })
  }

  if (primaryDependenciesFailed.value) {
    return fallbackTask({
      title: '重新加载今日行动',
      description: '部分核心资料暂时没有加载成功。重新加载后再判断今天最该推进什么。',
      reason: '核心资料加载失败',
      cta: '重新加载',
      path: '/dashboard',
      statusLabel: '待重试',
      icon: Sparkles,
      tone: 'tone-blue',
      benefit: '避免把接口失败误判成资料缺失',
      reasons: ['保留已成功返回的数据', '重新获取失败模块', '只采用最新一轮响应'],
      action: 'retry-home-data'
    })
  }

  if (todayActionCards.value.length) return todayActionCards.value[0]

  if (primaryCareerAction.value) {
    const task = findTaskByCareerAction(primaryCareerAction.value)
    const promoted = canPromoteCareerAction(primaryCareerAction.value)
    return {
      ...toHomeTaskFromCareerAction(primaryCareerAction.value),
      cta: promoted ? '开始第 1 个任务' : '查看今日任务',
      reasons: [
        primaryCareerAction.value.reason || '来自智能教练今日计划',
        `来源：${getCareerActionSourceLabel(primaryCareerAction.value)}`,
        getCareerActionTrustBoundary(primaryCareerAction.value)
      ],
      benefit: task ? taskBenefit(task) : '完成后会回流到下一轮智能教练推荐'
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

const orderedActionList = computed<HomeTask[]>(() => {
  const seenKeys = new Set<string>()
  const seenIntents = new Set<string>()
  const candidates = [primaryTask.value, ...todayActionCards.value, ...taskCards.value]

  return candidates.filter((task, index) => {
    if (index > 0 && ['已完成', '已跳过'].includes(task.statusLabel)) return false
    const key = task.key || `${task.path}:${task.title}`
    const intent = `${task.path.split('?')[0]}:${task.title}`
    if (seenKeys.has(key) || seenIntents.has(intent)) return false
    seenKeys.add(key)
    seenIntents.add(intent)
    return true
  }).slice(0, 3)
})

const completionReviewItems = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  const skill = task?.relatedSkillName || task?.targetJobTitle || '当前方向'
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) {
    return [
      `回到「${skill}」专项练习，再完成 1 组同方向题目，巩固刚完成的内容。`,
      '把刚才仍不稳定的知识点补进错题或笔记，避免下一轮回答再次卡住。',
      '如果还缺项目语境，先补场景、指标和取舍，再继续下一题。'
    ]
  }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) {
    return [
      `先查看这次「${skill}」里最低分的 1 个点，确认下一轮优先修哪一项。`,
      '把缺少细节支撑的项目经历补成可直接回答的表达，再继续后续训练。',
      '继续做一轮相关题目或下一次模拟面试，验证刚才的调整是否生效。'
    ]
  }
  if (type.includes('RESUME')) {
    return [
      `先检查这次补充的「${skill}」证据，确认它能直接支撑目标岗位要求。`,
      '把仍缺数字、业务场景或职责边界的内容补完整，再进入下一步。',
      '回到简历匹配再跑一轮，确认今天这项修改是否真正提升匹配度。'
    ]
  }
  return [
    '先确认这次任务已经沉淀出可复用的结论、素材或表达。',
    '把仍不确定、无法举例或暂时落不到项目里的点补进反馈里。',
    '继续处理下一项今日任务，保持今天的训练闭环。'
  ]
})

const completionReviewNextAction = computed(() => {
  const task = completionReviewTask.value
  if (!task) return { label: '继续今日计划', path: '/agent/tasks' }
  const type = String(task?.taskType || '').toUpperCase()
  if (hasAgentTaskActionEntry(task)) {
    return {
      label: isAgentJobApplicationTask(task) ? '查看投递进度' : '继续当前任务',
      path: buildAgentTaskActionPath(task, '/agent/today')
    }
  }
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) return { label: '继续专项练习', path: '/questions/practice' }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return { label: '查看面试历史', path: '/interviews/history' }
  if (type.includes('RESUME')) return { label: '查看简历匹配', path: '/resume-match' }
  return { label: '继续今日计划', path: '/agent/tasks' }
})

const targetJobText = computed(() => {
  const job = currentTargetJob.value
  if (!job) return '待选择目标岗位'
  return [job.companyName, job.jobTitle, job.jobLevel].filter(Boolean).join(' · ') || '已选择目标岗位'
})

const hasTrustedReport = computed(() => {
  const report = overview.value?.recentReport
  if (!report) return false
  const status = String(report.status || '').toUpperCase()
  const trustStatus = String(report.trustStatus || '').toUpperCase()
  if (report.fallback || ['FAILED', 'FAIL', 'ERROR', 'UNSCORABLE'].includes(status)) return false
  if (['FALLBACK', 'UNVERIFIED', 'REVIEW_REQUIRED'].includes(trustStatus)) return false
  return !status || ['SUCCESS', 'GENERATED', 'COMPLETED'].includes(status) || trustStatus === 'VERIFIED'
})

const hasUntrustedRecentReport = computed(() => Boolean(overview.value?.recentReport && !hasTrustedReport.value))

const evidenceProgressItems = computed(() => [
  Boolean(overview.value?.resumeCount),
  targetJobText.value !== '待选择目标岗位',
  hasTrustedReport.value,
  wrongQuestions.value.length > 0,
  Boolean(agentTasks.value.length || dailyPlan.value?.tasks?.length)
])
const evidenceProgressCount = computed(() => evidenceProgressItems.value.filter(Boolean).length)

const confidenceLabel = computed(() => {
  if (hasUntrustedRecentReport.value) return '待复核'
  if (evidenceProgressCount.value >= 4) return '证据较全'
  if (evidenceProgressCount.value >= 2) return '继续补证据'
  return '待补资料'
})
const confidencePillClass = computed(() => {
  if (hasUntrustedRecentReport.value) return 'pill--warning'
  if (evidenceProgressCount.value >= 4) return 'pill--success'
  if (evidenceProgressCount.value >= 2) return 'pill--neutral'
  return 'pill--warning'
})

const trustedLatestMatch = computed(() => {
  const match = v3Overview.value?.latestMatch
  if (!match || match.fallback) return null
  const status = String(match.status || '').toUpperCase()
  const trustStatus = String(match.trustStatus || '').toUpperCase()
  if (['FAILED', 'FAIL', 'ERROR', 'UNSCORABLE'].includes(status)) return null
  if (['FALLBACK', 'UNVERIFIED', 'REVIEW_REQUIRED'].includes(trustStatus)) return null
  return typeof match.overallScore === 'number' ? match : null
})

const readinessDisplay = computed(() => {
  if (overviewPending.value || v3OverviewPending.value) {
    return {
      label: '资料状态',
      value: '加载中',
      detail: '正在读取简历和目标岗位资料，完成后再判断接入情况。'
    }
  }

  if (overviewLoadState.value === 'error' || v3OverviewLoadState.value === 'error') {
    return {
      label: '资料状态',
      value: '暂不可用',
      detail: '部分资料暂时加载失败，重新加载后再判断接入情况。'
    }
  }

  const match = trustedLatestMatch.value
  if (match) {
    return {
      label: '简历匹配参考',
      value: `${Math.round(match.overallScore || 0)} 分`,
      detail: match.summary || match.evidenceSummary || '来自最近一次岗位匹配报告，仅作为简历与目标岗位匹配参考。'
    }
  }

  if (!hasResumeSignal.value || !hasTargetJobSignal.value) {
    return {
      label: '资料状态',
      value: '资料不足',
      detail: '补齐简历和目标岗位后，再展示有来源的匹配参考。'
    }
  }

  return {
    label: '资料接入',
    value: confidenceLabel.value,
    detail: '当前只按已接入资料展示进度，不把它包装成能力分或 Offer 概率。'
  }
})

const recommendationBoundaryText = computed(() => {
  if (overviewPending.value || v3OverviewPending.value) return '正在读取推荐依据，资料返回前不会推断缺失项。'
  if (overviewLoadState.value === 'error' || v3OverviewLoadState.value === 'error') return '部分推荐依据暂不可用，重新加载后再判断资料缺口。'
  if (!overview.value?.resumeCount) return '当前是通用建议：补充简历后，匹配和训练建议会更贴近你的项目经历。'
  if (hasUntrustedRecentReport.value) return '最近报告失败、降级或待复核，当前计划不会把它作为高可信依据。建议先重新生成报告或继续用简历、岗位和错题训练。'
  if (!hasTrustedReport.value) return '当前推荐先结合已有简历、岗位和错题记录；报告完成后会继续补充训练重点。'
  return '当前推荐已接入简历、训练反馈和报告内容；仍建议在开始训练前确认岗位方向是否最新。'
})

const recommendationSources = computed(() => {
  const overviewUnavailable = overviewLoadState.value === 'error'
  const v3OverviewUnavailable = v3OverviewLoadState.value === 'error'

  return [
    {
      key: 'resume',
      title: overviewPending.value
        ? '简历资料加载中'
        : overviewUnavailable
          ? '简历资料暂不可用'
          : overview.value?.resumeCount ? '简历资料已接入' : '缺少简历资料',
      desc: overviewPending.value || overviewUnavailable
        ? '资料状态确定后再展示简历接入结论。'
        : overview.value?.resumeCount ? `已有 ${overview.value.resumeCount} 份简历，可用于判断项目经历。` : '补充简历后才能围绕项目经历推荐训练。',
      icon: FileText,
      missing: overviewLoadState.value === 'success' && !overview.value?.resumeCount
    },
    {
      key: 'jd',
      title: v3OverviewPending.value
        ? '岗位目标加载中'
        : v3OverviewUnavailable
          ? '岗位目标暂不可用'
          : hasTargetJobSignal.value ? '岗位目标已接入' : '缺少目标岗位',
      desc: v3OverviewPending.value || v3OverviewUnavailable
        ? '岗位状态确定后再展示接入结论。'
        : hasTargetJobSignal.value ? targetJobText.value : '选择岗位方向或粘贴岗位描述后，推荐会更贴近面试要求。',
      icon: Briefcase,
      missing: v3OverviewLoadState.value === 'success' && !hasTargetJobSignal.value
    },
    {
      key: 'report',
      title: overviewPending.value
        ? '面试报告加载中'
        : overviewUnavailable
          ? '面试报告暂不可用'
          : hasTrustedReport.value ? '面试报告已接入' : overview.value?.recentReport ? '最近报告待复核' : '暂无面试报告',
      desc: overviewPending.value || overviewUnavailable
        ? '概览状态确定后再展示报告结论。'
        : hasTrustedReport.value
          ? reportInsightText.value
          : overview.value?.recentReport
            ? `报告状态：${formatStatus(overview.value.recentReport.status)}，失败或待复核报告不会作为高可信依据。`
            : '完成一次模拟面试后，薄弱点会回流到计划。',
      icon: BarChart3,
      missing: overviewLoadState.value === 'success' && !hasTrustedReport.value
    },
    {
      key: 'wrong',
      title: wrongQuestions.value.length ? '错题记录已接入' : '暂无错题记录',
      desc: wrongQuestions.value.length ? `${wrongQuestions.value.length} 道错题可用于校准薄弱点。` : '刷题后产生的错题会影响下一轮推荐。',
      icon: AlertTriangle,
      missing: !wrongQuestions.value.length
    }
  ]
})

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
  },
  {
    key: 'knowledge',
    order: 5,
    title: '知识资料',
    desc: '补充可影响推荐的项目、概念和表达素材',
    path: '/knowledge',
    icon: BookOpenCheck,
    status: '可补充',
    tone: 'pill--neutral'
  },
  {
    key: 'memory',
    order: 6,
    title: '长期记忆',
    desc: '确认偏好、约束和候选记忆是否进入 Agent 上下文',
    path: '/agent/memory',
    icon: Sparkles,
    status: '待确认',
    tone: 'pill--warning'
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

const pageErrors = computed(() => [
  overviewError.value
    ? { key: 'overview', message: overviewError.value, retry: fetchOverview }
    : null,
  v3OverviewError.value
    ? { key: 'v3-overview', message: v3OverviewError.value, retry: fetchV3Overview }
    : null,
  applicationStatsError.value
    ? { key: 'application-stats', message: applicationStatsError.value, retry: fetchApplicationStats }
    : null,
  notificationsError.value
    ? { key: 'notifications', message: notificationsError.value, retry: fetchNotifications }
    : null,
  dailyPlanError.value
    ? { key: 'daily-plan', message: dailyPlanError.value, retry: fetchDailyPlan }
    : null,
  agentTasksError.value
    ? { key: 'agent-tasks', message: agentTasksError.value, retry: fetchAgentTasks }
    : null,
  agentReviewsError.value
    ? { key: 'agent-reviews', message: agentReviewsError.value, retry: fetchAgentReviews }
    : null,
  wrongQuestionsError.value
    ? { key: 'wrong-questions', message: wrongQuestionsError.value, retry: fetchWrongQuestions }
    : null
].filter((item): item is { key: string; message: string; retry: () => Promise<void> } => Boolean(item)))

const actionModuleErrorText = computed(() => [
  applicationStatsError.value,
  dailyPlanError.value,
  agentTasksError.value,
  notificationsError.value
].filter(Boolean).join('；'))

const evidenceModuleErrorText = computed(() => [
  wrongQuestionsError.value,
  overviewError.value,
  agentReviewsError.value
].filter(Boolean).join('；'))

const careerRiskSignals = computed(() => buildCareerRiskSignals({
  hasResume: hasResumeSignal.value,
  hasTargetJob: hasTargetJobSignal.value,
  hasTodayPlan: hasTodayPlanSignal.value,
  hasTrustedReport: hasTrustedReport.value,
  hasUntrustedRecentReport: hasUntrustedRecentReport.value,
  pageErrorCount: pageErrors.value.length
}))

const dashboardSignals = computed<DashboardSignal[]>(() => {
  const recentReport = overview.value?.recentReport
  const reportScore = recentReport?.totalScore
  const risk = careerRiskSignals.value[0]

  return [
    {
      key: 'target-job',
      label: '目标岗位',
      value: v3OverviewPending.value ? '加载中' : v3OverviewError.value ? '暂不可用' : targetJobText.value,
      detail: v3OverviewPending.value
        ? '正在读取目标岗位'
        : hasTargetJobSignal.value ? '训练与推荐按该岗位收束' : '选择岗位后再生成强推荐',
      path: hasTargetJobSignal.value ? '/job-targets' : '/job-targets/create',
      ready: hasTargetJobSignal.value,
      error: v3OverviewError.value,
      icon: Target
    },
    {
      key: 'evidence',
      label: '资料接入',
      value: overviewPending.value ? '加载中' : overviewError.value ? '暂不可用' : `${firstDayReadyCount.value}/${firstDayReadiness.value.length}`,
      detail: readinessDisplay.value.detail,
      path: '/resumes',
      ready: firstDayReadyCount.value >= 3,
      error: overviewError.value,
      icon: FileText
    },
    {
      key: 'recent-report',
      label: '最近报告',
      value: overviewPending.value
        ? '加载中'
        : overviewError.value
        ? '暂不可用'
        : recentReport
          ? reportScore == null ? '已生成' : `${reportScore} 分`
          : '待生成',
      detail: recentReport ? reportInsightText.value : '完成模拟面试后生成报告',
      path: recentReport?.interviewId ? `/interviews/${recentReport.interviewId}/report` : '/interviews/history',
      ready: hasTrustedReport.value,
      error: overviewError.value,
      icon: BarChart3
    },
    {
      key: 'risk-gap',
      label: '风险缺口',
      value: primaryDependenciesPending.value
        ? '整理中'
        : primaryDependenciesFailed.value
          ? '待重试'
          : careerRiskSignals.value.length ? `${careerRiskSignals.value.length} 项` : '暂无',
      detail: primaryDependenciesPending.value
        ? '资料返回后再判断风险'
        : primaryDependenciesFailed.value
          ? '重新加载后再判断风险'
          : risk?.title || '当前资料可支持今日行动',
      path: '/agent/today',
      ready: !careerRiskSignals.value.length,
      icon: AlertTriangle
    }
  ]
})

const careerRecentArtifacts = computed(() => buildCareerRecentArtifacts({
  latestMatch: (v3Overview.value?.latestMatch || null) as Record<string, unknown> | null,
  recentReport: (overview.value?.recentReport || null) as Record<string, unknown> | null,
  dailyPlan: dailyPlan.value
}))

const trustedSuggestionSummaries = computed(() => buildTrustedSuggestionSummaries([], careerActions.value))

const tools = [
  { title: '面试历史', path: '/interviews/history', icon: History },
  { title: '训练分析', path: '/analytics/personal', icon: BarChart3 },
  { title: '学习计划', path: '/study-plans', icon: Route },
  { title: '每日任务', path: '/daily-tasks', icon: ClipboardCheck }
]

const go = (path: string) => {
  router.push(sanitizeLocalActionPath(path, '/dashboard'))
}

const getTaskRunId = (task?: AgentTaskVO | null) => task?.agentRunId ?? task?.runId ?? null
const getTaskPlanDate = (task?: AgentTaskVO | null) =>
  task?.activationHandoffs?.find((item) => item?.planDate)?.planDate
  || task?.dueDate
  || dailyPlan.value?.planDate
  || dailyPlan.value?.date
  || formatLocalDate()
  || undefined

const trackCompletionReviewCtaClick = (targetPath: string) => {
  const task = completionReviewTask.value
  if (!task?.id || !targetPath) return
  void request.post('/agent/metrics/events', {
    eventCode: 'feedback_cta_clicked',
    taskId: task.id,
    runId: getTaskRunId(task) ?? undefined,
    planDate: getTaskPlanDate(task),
    targetPath,
    sourcePage: 'dashboard_home'
  }, {
    silentError: true
  }).catch(() => undefined)
}

const shouldForceRefresh = (force: unknown = true) => force !== false

const fallbackTask = (task: Omit<HomeTask, 'key' | 'taskId' | 'minutes' | 'sourceLabel' | 'trustBoundary' | 'promoted'>
  & Partial<Pick<HomeTask, 'sourceLabel' | 'trustBoundary' | 'promoted'>>): HomeTask => ({
  ...task,
  key: `fallback-${task.path}`,
  minutes: 30,
  sourceLabel: task.sourceLabel || '本地可执行入口',
  trustBoundary: task.trustBoundary || '资料不足时只提示下一步，不生成强判断',
  promoted: task.promoted ?? false
})

const toHomeTaskFromTodayAction = (action: TodayActionItem): HomeTask => {
  const isUrgent = action.priority === 'urgent'
  const isHigh = action.priority === 'high'
  const taskId = action.source === 'agent-task'
    ? Number(action.key.replace(/^agent-task-/, ''))
    : undefined
  const sourceTask = Number.isFinite(taskId) ? homeAgentTasks.value.find((task) => task.id === taskId) : undefined

  if (sourceTask) {
    return {
      ...toHomeTask(sourceTask),
      key: action.key,
      title: action.title,
      description: action.description,
      reason: action.reason,
      cta: action.actionLabel,
      path: action.actionPath
    }
  }

  const isApplicationAction = action.source === 'application-follow-up'
  const isCalendarAction = action.source === 'notification' && action.actionPath.startsWith('/career-calendar')
  const sourceLabel = isApplicationAction
    ? '投递漏斗'
    : isCalendarAction
      ? '求职日历提醒'
      : action.source === 'notification'
        ? '通知提醒'
        : '求职准备'
  const icon = isApplicationAction
    ? Briefcase
    : isCalendarAction
      ? ClipboardCheck
      : action.source === 'notification'
        ? Sparkles
        : FileText

  return {
    key: action.key,
    title: action.title,
    description: action.description,
    reason: action.reason,
    reasons: [
      action.reason,
      action.dueText ? `时间：${action.dueText}` : `来源：${sourceLabel}`,
      isApplicationAction
        ? '只做提醒和记录，不自动投递或自动发送消息'
        : '仅提供可执行入口，不会自动完成业务动作'
    ],
    benefit: isApplicationAction
      ? '把投递状态、跟进日期和事件记录沉淀回个人投递漏斗'
      : '完成动作后继续把结果回流到今日任务与复盘',
    cta: action.actionLabel,
    path: action.actionPath,
    statusLabel: isUrgent ? '优先处理' : isHigh ? '今日优先' : '待处理',
    minutes: isUrgent ? 10 : isHigh ? 12 : 8,
    icon,
    tone: isUrgent ? 'tone-orange' : isCalendarAction ? 'tone-green' : 'tone-blue',
    sourceLabel,
    trustBoundary: isApplicationAction
      ? applicationStatsError.value ? '统计接口降级，保留手动入口' : '来自投递统计，只提示下一步行动'
      : action.source === 'notification'
  ? notificationsError.value ? '提醒来源暂不可用，保留其他行动入口' : '来自可行动提醒，可直接前往对应处理页面'
        : '资料不足时只提示下一步，不生成强判断',
    promoted: isUrgent || isHigh
  }
}

const toHomeTask = (task: AgentTaskVO): HomeTask => {
  const icon = taskIcon(task)
  return {
    key: `task-${task.id}`,
    taskId: task.id,
    title: displayAgentTaskTitle(task),
    description: displayAgentTaskDescription(task),
    reason: task.reason || task.relatedSkillName || '来自今日训练任务',
    reasons: taskReasons(task),
    benefit: taskBenefit(task),
    cta: '开始训练',
    path: buildAgentTaskActionPath(task, '/agent/today'),
    statusLabel: formatStatus(task.status || 'TODO'),
    minutes: Number(task.estimatedMinutes) || 20,
    icon: icon.icon,
    tone: icon.tone,
    sourceLabel: 'Agent 今日任务',
    trustBoundary: task.fallback || task.mock ? '当前只能给出保守建议' : '可执行，建议完成后回流复盘',
    promoted: !task.fallback && !task.mock
  }
}

const findTaskByCareerAction = (action?: CareerActionItemVO | null) => {
  if (!action?.sourceId) return undefined
  return findTaskById(Number(action.sourceId))
}

const toHomeTaskFromCareerAction = (action: CareerActionItemVO): HomeTask => {
  const task = findTaskByCareerAction(action)
  const numericSourceId = Number(action.sourceId)
  const base = task ? toHomeTask(task) : fallbackTask({
    title: action.title,
    description: action.description || '来自今日行动队列的可执行任务。',
    reason: action.reason || '来自 Agent 今日计划',
    cta: '查看任务',
    path: action.actionUrl || '/agent/today',
    statusLabel: formatStatus(action.status),
    icon: Sparkles,
    tone: 'tone-blue',
    benefit: '完成后会回流到下一轮智能教练推荐',
    reasons: [
      action.reason || '来自智能教练今日计划',
      `来源：${getCareerActionSourceLabel(action)}`,
      getCareerActionTrustBoundary(action)
    ],
    sourceLabel: getCareerActionSourceLabel(action),
    trustBoundary: getCareerActionTrustBoundary(action),
    promoted: canPromoteCareerAction(action)
  })
  return {
    ...base,
    key: action.id,
    taskId: Number.isFinite(numericSourceId) && numericSourceId > 0 ? numericSourceId : task?.id,
    title: action.title || base.title,
    description: action.description || base.description,
    reason: action.reason || base.reason,
    reasons: [
      action.reason || base.reason,
      `来源：${getCareerActionSourceLabel(action)}`,
      getCareerActionTrustBoundary(action)
    ],
    path: action.actionUrl || base.path || '/agent/today',
    statusLabel: formatStatus(action.status),
    minutes: action.estimatedMinutes || base.minutes,
    sourceLabel: getCareerActionSourceLabel(action),
    trustBoundary: getCareerActionTrustBoundary(action),
    promoted: canPromoteCareerAction(action)
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
  if (isAgentJobApplicationTask(task)) return '把投递状态和下一次跟进沉淀回今日计划'
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

const taskIcon = (task?: AgentTaskVO): { icon: Component; tone: string } => {
  if (isAgentJobApplicationTask(task)) return { icon: Briefcase, tone: 'tone-green' }
  const type = String(task?.taskType || '').toUpperCase()
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
    APPLICATION_FOLLOW_UP: '投递跟进',
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
    APPLICATION_FOLLOW_UP: '查看投递进度并补充沟通记录。',
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
  await runLatestOverviewRequest({
    request: () => fetchCachedDashboardOverview(shouldForceRefresh(force)),
    apply: (value) => {
      overview.value = value
    },
    clear: () => {
      overview.value = null
    },
    preserveCurrent,
    fallbackError: '首页概览暂时加载失败，已保留可执行入口。'
  })
}

const fetchV3Overview = async (force: unknown = true, preserveCurrent = false) => {
  await runLatestV3OverviewRequest({
    request: () => fetchCachedV3DashboardOverview(shouldForceRefresh(force)),
    apply: (value) => {
      v3Overview.value = value
    },
    clear: () => {
      v3Overview.value = null
    },
    preserveCurrent,
    fallbackError: '目标岗位状态暂时加载失败，可以先补简历或稍后重试。'
  })
}

const fetchApplicationStats = async (_force: unknown = true, preserveCurrent = false) => {
  void _force
  await runLatestApplicationStatsRequest({
    request: () => getApplicationStatsApi(),
    apply: (value) => {
      applicationStats.value = value
    },
    clear: () => {
      applicationStats.value = null
    },
    preserveCurrent,
    fallbackError: '投递漏斗统计暂时加载失败，首页已保留投递管理入口。'
  })
}

const fetchNotifications = async (_force: unknown = true, preserveCurrent = false) => {
  void _force
  await runLatestNotificationsRequest({
    request: () => getNotificationsApi({
      pageNo: 1,
      pageSize: 20,
      isRead: ''
    }),
    apply: (value) => {
      notifications.value = value.records || []
    },
    clear: () => {
      notifications.value = []
    },
    preserveCurrent,
    fallbackError: '行动提醒暂时加载失败，Agent 任务和投递行动仍可继续使用。'
  })
}

const fetchDailyPlan = async (force: unknown = true, preserveCurrent = false) => {
  await runLatestDailyPlanRequest({
    request: () => fetchCachedLatestDailyPlan(formatLocalDate(), shouldForceRefresh(force), currentTargetJobId.value),
    apply: (value) => {
      dailyPlan.value = value
    },
    clear: () => {
      dailyPlan.value = null
    },
    preserveCurrent,
    fallbackError: '今日计划暂时不可用，可以手动生成或稍后重试。'
  })
}

const fetchAgentTasks = async (force: unknown = true, preserveCurrent = false) => {
  await runLatestAgentTasksRequest({
    request: () => fetchCachedTodayAgentTasks(formatLocalDate(), shouldForceRefresh(force), currentTargetJobId.value),
    apply: (value) => {
      agentTasks.value = value.tasks || []
    },
    clear: () => {
      agentTasks.value = []
    },
    preserveCurrent,
    fallbackError: '今日任务暂时加载失败，可以稍后重试或去今日计划页继续。'
  })
}

const fetchAgentReviews = async (_force: unknown = true, preserveCurrent = false) => {
  void _force
  await runLatestAgentReviewsRequest({
    request: () => getAgentReviewsApi({ targetJobId: currentTargetJobId.value }),
    apply: (value) => {
      agentReviews.value = value || []
    },
    clear: () => {
      agentReviews.value = []
    },
    preserveCurrent,
    fallbackError: '最新每日复盘暂时加载失败，闭环摘要已按任务事实降级生成。'
  })
}

const fetchWrongQuestions = async (force: unknown = true) => {
  wrongQuestionsError.value = ''
  try {
    const result = await fetchCachedWrongQuestions(shouldForceRefresh(force))
    wrongQuestions.value = result.records || []
  } catch (error) {
    wrongQuestions.value = []
    wrongQuestionsError.value = getErrorMessage(error, '错题记录暂时加载失败。')
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
    fetchV3Overview(true, true),
    fetchApplicationStats(true, true),
    fetchNotifications(true, true),
    fetchDailyPlan(true, true),
    fetchAgentTasks(true, true),
    fetchAgentReviews(true, true)
  ])
}

const retryPrimaryDependencies = async () => {
  await Promise.allSettled([
    fetchOverview(true, true),
    fetchV3Overview(true, true),
    fetchApplicationStats(true, true),
    fetchNotifications(true, true),
    fetchDailyPlan(true, true),
    fetchAgentTasks(true, true),
    fetchAgentReviews(true, true)
  ])
}

const runPrimaryTask = (task: HomeTask) => {
  if (task.disabled) return
  if (task.action === 'retry-home-data') {
    void retryPrimaryDependencies()
    return
  }
  go(task.path)
}

const updateRecommendationDetails = (event: Event) => {
  showRecommendationDetails.value = (event.currentTarget as HTMLDetailsElement).open
}

const openRecommendationDetails = () => {
  showRecommendationDetails.value = true
  void nextTick(() => recommendationSummary.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
}

const openSecondaryMaterials = () => {
  showSecondarySections.value = true
  void nextTick(() => secondaryMaterial.value?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
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

const withTaskMutationLock = async (mutation: () => Promise<void>) => {
  if (taskMutationLocked.value) return
  taskMutationLocked.value = true
  try {
    await mutation()
  } finally {
    taskMutationLocked.value = false
  }
}

const skipTask = async (taskId: number) => {
  await withTaskMutationLock(async () => {
    const task = findTaskById(taskId)
    const confirmed = await confirmDangerActionPreview({
      title: '今天跳过任务',
      action: '将首页第 1 个训练任务标记为今天跳过',
      target: task?.title || '训练记录已保存',
      impact: '该任务会从今日优先动作中移出，今日任务完成率和后续推荐可能跟随变化。',
      rollback: '可以在今日任务列表把任务恢复为待完成，或重新生成今日计划。',
      audit: '训练记录、跳过状态和跳过原因会保留，便于稍后复盘。',
      tips: ['确认今天确实不准备推进这个任务。', '如果只是暂时没时间，可以稍后回到今日计划处理。'],
      confirmButtonText: '今天跳过'
    }).catch(() => false)
    if (!confirmed) return
    const promptResult = await ElMessageBox.prompt('请填写本轮跳过原因，方便下一轮计划避开不合适的安排。', '跳过原因', {
      confirmButtonText: '确认跳过',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '例如：今天时间不够、任务不符合当前岗位、需要先补资料',
      inputValidator: (value) => Boolean(String(value || '').trim()) || '请填写跳过原因',
      inputErrorMessage: '请填写跳过原因'
    }).catch(() => null)
    const skipReason = String(promptResult?.value || '').trim()
    if (!skipReason) return
    try {
      const skippedTask = await skipAgentTaskApi(taskId, { skipReason })
      mergeAgentTask(skippedTask)
      invalidateUserHomeTrainingCaches(formatLocalDate(), currentTargetJobId.value)
      await refreshTrainingSnapshotAfterMutation()
    } catch (error) {
      agentTasksError.value = getErrorMessage(error, '任务跳过失败，请稍后重试。')
    }
  })
}

const completeTask = async (taskId: number) => {
  await withTaskMutationLock(async () => {
    try {
      const completedTask = await completeAgentTaskApi(taskId, { note: '用户在今日首页标记完成' })
      mergeAgentTask(completedTask)
      completionReviewTask.value = completedTask
      completionReviewNote.value = ''
      completionReviewVisible.value = true
      invalidateUserHomeTrainingCaches(formatLocalDate(), currentTargetJobId.value)
      await refreshTrainingSnapshotAfterMutation()
    } catch (error) {
      agentTasksError.value = getErrorMessage(error, '任务完成状态保存失败，请稍后重试。')
    }
  })
}

const goCompletionNextAction = () => {
  const targetPath = completionReviewNextAction.value.path
  trackCompletionReviewCtaClick(targetPath)
  completionReviewVisible.value = false
  go(targetPath)
}

onMounted(() => {
  secondaryDataCancelled = false
  if (window.matchMedia?.('(max-width: 720px)').matches) {
    showRecommendationDetails.value = true
  }
  fetchOverview(false)
  void fetchApplicationStats(false)
  void fetchNotifications(false)
  void fetchV3Overview(false).finally(() => {
    void fetchDailyPlan(false)
    void fetchAgentReviews(false)
    deferSecondaryHomeData(() => fetchAgentTasks(false), 900, 180)
  })
  deferSecondaryHomeData(() => fetchWrongQuestions(false), 1800, 450)
})

onBeforeUnmount(() => {
  secondaryDataCancelled = true
})
</script>

<style scoped lang="scss">
.jobcoach-home {
  display: grid;
  min-width: 0;
  gap: 12px;
  color: var(--user-text);
}

.dashboard-heading {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 2px;

  h1 {
    margin: 7px 0 0;
    color: var(--user-text);
    font-size: 24px;
    line-height: 1.25;
    text-wrap: balance;
  }
}

.eyebrow,
.section-kicker,
.card-kicker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
}

.dashboard-context {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;

  span {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
    min-height: 28px;
    padding: 0 9px;
    border: 1px solid var(--user-border);
    border-radius: 6px;
    background: var(--user-surface-muted);
    color: var(--user-text-secondary);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  b {
    color: var(--user-text-muted);
    font-weight: 600;
  }
}

.dashboard-cockpit-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.58fr);
  gap: 12px;
  min-width: 0;
  align-items: stretch;
}

.primary-action-shell,
.signal-panel,
.action-timeline,
.recommendation-summary,
.path-section,
.insight-card {
  min-width: 0;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
}

.primary-action-shell {
  position: relative;
  display: grid;
  align-content: space-between;
}

.primary-action-panel {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding: 18px 20px 16px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    max-width: 34ch;
    color: var(--user-text);
    font-size: 25px;
    line-height: 1.24;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }

  p {
    max-width: 70ch;
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }
}

.card-heading,
.section-head,
.signal-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.primary-action-meta,
.timeline-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--user-text-muted);
  font-size: 12px;
}

.primary-action-cta {
  display: inline-flex;
  width: fit-content;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border: 1px solid var(--user-primary);
  border-radius: 7px;
  background: var(--user-primary);
  color: var(--user-primary-contrast);
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease;

  &:hover {
    border-color: var(--user-primary-hover);
    background: var(--user-primary-hover);
  }

  &:disabled {
    border-color: var(--user-border);
    background: var(--user-disabled-bg);
    color: var(--user-disabled);
    cursor: not-allowed;
  }
}

.task-operations {
  position: relative;
  justify-self: end;
  margin: 0 12px 10px;
  color: var(--user-text-muted);
  font-size: 12px;

  summary {
    min-height: 28px;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    list-style-position: inside;
  }

  > div {
    display: flex;
    z-index: 3;
    gap: 5px;
    margin-top: 5px;
    padding: 6px;
    border: 1px solid var(--user-border);
    border-radius: 7px;
    background: var(--user-surface-raised);
  }

  button {
    min-height: 28px;
    padding: 0 8px;
    border: 1px solid var(--user-border);
    border-radius: 6px;
    background: var(--user-surface-muted);
    color: var(--user-text-secondary);
    font: inherit;
    cursor: pointer;
  }
}

.signal-panel {
  padding: 12px;
}

.signal-heading {
  padding: 0 2px 9px;
  color: var(--user-text-muted);
  font-size: 12px;

  strong {
    color: var(--user-text-secondary);
    font-size: 12px;
  }
}

.cockpit-signal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  min-width: 0;
}

.cockpit-signal {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 82px;
  align-items: start;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--user-border);
  border-radius: 7px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease;

  > svg {
    margin-top: 2px;
    color: var(--user-primary);
  }

  span,
  small,
  strong,
  em {
    min-width: 0;
  }

  small,
  strong,
  em {
    display: block;
    overflow-wrap: anywhere;
  }

  small {
    color: var(--user-text-muted);
    font-size: 11px;
  }

  strong {
    margin-top: 3px;
    color: var(--user-text);
    font-size: 12px;
    line-height: 1.35;
  }

  em {
    margin-top: 4px;
    color: var(--user-text-muted);
    font-size: 10px;
    font-style: normal;
    line-height: 1.35;
  }

  &:hover {
    border-color: var(--user-primary-border);
    background: var(--user-surface-tint);
  }

  &.is-ready > svg {
    color: var(--user-success);
  }

  &.is-error {
    border-color: var(--user-danger-border);
  }
}

.action-timeline,
.recommendation-summary {
  padding: 14px;
}

.section-head {
  margin-bottom: 10px;

  h2 {
    margin: 4px 0 0;
    color: var(--user-text);
    font-size: 17px;
    line-height: 1.3;
  }
}

.section-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.module-error {
  margin: 0 0 9px;
  padding: 8px 10px;
  border: 1px solid var(--user-danger-border);
  border-radius: 6px;
  background: var(--user-danger-soft);
  color: var(--user-danger);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.timeline-list {
  display: grid;
  min-width: 0;
}

.timeline-row {
  display: grid;
  grid-template-columns: 22px 32px minmax(0, 1fr) auto auto;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 10px 0;
  border-top: 1px solid var(--user-border);

  &:first-child {
    border-top: 0;
  }
}

.timeline-index,
.journey-step__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--user-primary-soft);
  color: var(--user-primary);
  font-size: 11px;
  font-weight: 800;
}

.task-row__type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: var(--user-primary-faint);
  color: var(--user-primary);
}

.task-row__body {
  min-width: 0;

  > div:first-child {
    display: flex;
    min-width: 0;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  strong {
    min-width: 0;
    color: var(--user-text);
    font-size: 13px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.timeline-meta {
  margin-top: 4px;
  font-size: 11px;
}

.timeline-enter {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.timeline-empty {
  margin: 0;
  padding: 12px 0 2px;
  border-top: 1px solid var(--user-border);
  color: var(--user-text-muted);
  font-size: 12px;
}

.pill {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  padding: 0 7px;
  border: 1px solid var(--user-border);
  border-radius: 999px;
  background: var(--user-surface-raised);
  color: var(--user-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.pill--success {
  border-color: var(--user-success-border);
  background: var(--user-success-soft);
  color: var(--user-success);
}

.pill--warning {
  border-color: rgba(230, 173, 85, 0.34);
  background: var(--user-warning-soft);
  color: var(--user-warning);
}

.pill--danger {
  border-color: var(--user-danger-border);
  background: var(--user-danger-soft);
  color: var(--user-danger);
}

.source-boundary {
  margin: 8px 0 0;
  color: var(--user-text-secondary);
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.recommendation-details {
  margin-top: 10px;
  border-top: 1px solid var(--user-border);

  summary {
    padding: 10px 0 2px;
    color: var(--user-primary);
    font-size: 12px;
    cursor: pointer;
  }
}

.recommendation-details__content {
  display: grid;
  gap: 10px;
  padding-top: 10px;
}

.recommendation-facts,
.agent-loop-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin: 0;

  div {
    min-width: 0;
    padding: 8px;
    border-radius: 6px;
    background: var(--user-surface-muted);
  }

  dt {
    color: var(--user-text-muted);
    font-size: 11px;
  }

  dd {
    margin: 4px 0 0;
    color: var(--user-text-secondary);
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.trusted-summary-list,
.source-list,
.readiness-list,
.feedback-list,
.tool-list,
.artifact-list {
  display: grid;
  gap: 7px;
}

.trusted-summary-list div,
.source-item,
.readiness-item,
.feedback-list button,
.tool-list button,
.artifact-list button,
.empty-small {
  min-width: 0;
  padding: 9px;
  border: 1px solid var(--user-border);
  border-radius: 6px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);
}

.trusted-summary-list strong,
.trusted-summary-list span,
.source-item strong,
.source-item span,
.feedback-list strong,
.feedback-list small,
.artifact-list strong,
.artifact-list small {
  display: block;
  overflow-wrap: anywhere;
}

.trusted-summary-list strong,
.source-item strong,
.feedback-list strong,
.artifact-list strong {
  color: var(--user-text);
  font-size: 12px;
}

.trusted-summary-list span,
.source-item span,
.feedback-list small,
.artifact-list small {
  margin-top: 3px;
  color: var(--user-text-muted);
  font-size: 11px;
  line-height: 1.4;
}

.source-item,
.readiness-item,
.feedback-list button,
.tool-list button {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.secondary-toggle-section {
  display: flex;
}

.mobile-discovery-links {
  display: none;
}

.secondary-toggle {
  display: flex;
  width: 100%;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--user-text);
  font: inherit;
  text-align: left;
  cursor: pointer;

  strong,
  small {
    display: block;
    overflow-wrap: anywhere;
  }

  small {
    margin-top: 3px;
    color: var(--user-text-muted);
    font-size: 11px;
  }

  svg {
    transition: transform 0.16s ease;
  }

  svg.is-open {
    transform: rotate(180deg);
  }
}

.secondary-material {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.path-section,
.insight-card {
  padding: 14px;
}

.journey {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.journey-step {
  display: grid;
  min-width: 0;
  min-height: 120px;
  align-content: start;
  gap: 7px;
  padding: 10px;
  border: 1px solid var(--user-border);
  border-radius: 7px;
  background: var(--user-surface-muted);
  color: var(--user-text-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;

  strong,
  small {
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-text);
    font-size: 12px;
  }

  small {
    color: var(--user-text-muted);
    font-size: 11px;
    line-height: 1.4;
  }
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tool-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.feedback-list button,
.tool-list button,
.artifact-list button {
  width: 100%;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.readiness-item > span {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 999px;
  background: var(--user-warning);

  &.is-ready {
    background: var(--user-success);
  }
}

.agent-loop-stats {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.agent-loop-review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 10px;
  color: var(--user-text-secondary);
  font-size: 11px;
}

.agent-loop-panel > p {
  margin: 10px 0 0;
  color: var(--user-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.completion-review {
  display: grid;
  gap: 12px;
  color: var(--user-text-secondary);

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--user-text);
  }

  ul {
    display: grid;
    gap: 7px;
    margin: 0;
    padding-left: 18px;
  }
}

.review-kicker {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 700;
}

.review-note {
  padding: 8px;
  border-radius: 6px;
  background: var(--user-surface-muted);
}

.jobcoach-home button:focus-visible,
.jobcoach-home summary:focus-visible,
.jobcoach-home :deep(.el-button:focus-visible) {
  outline: 2px solid var(--user-primary);
  outline-offset: 2px;
}

@media (max-height: 800px) and (min-width: 901px) {
  .jobcoach-home {
    gap: 10px;
  }

  .primary-action-panel {
    gap: 8px;
    padding: 14px 18px 12px;

    h2 {
      font-size: 22px;
    }
  }

  .cockpit-signal {
    min-height: 72px;
    padding: 8px;
  }

  .action-timeline,
  .recommendation-summary {
    padding: 12px;
  }

  .timeline-row {
    padding: 8px 0;
  }
}

@media (max-width: 900px) {
  .dashboard-heading {
    align-items: flex-start;
  }

  .dashboard-cockpit-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .insight-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .jobcoach-home {
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
  }

  .dashboard-heading {
    display: none;
  }

  .dashboard-cockpit-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
  }

  .primary-action-panel {
    gap: 8px;
    padding: 13px;

    h2 {
      font-size: 19px;
    }

    p {
      display: none;
    }
  }

  .primary-action-meta {
    font-size: 11px;
  }

  .primary-action-cta {
    width: 100%;
    min-height: 44px;
  }

  .mobile-discovery-links {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    button {
      min-width: 0;
      min-height: 44px;
      padding: 8px 10px;
      border: 1px solid var(--user-primary-border);
      border-radius: 8px;
      background: var(--user-primary-faint);
      color: var(--user-primary);
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
  }

  .signal-panel,
  .action-timeline {
    padding: 10px;
  }

  .cockpit-signal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cockpit-signal {
    min-height: 84px;
    padding: 8px;
  }

  .timeline-row {
    grid-template-columns: 22px 30px minmax(0, 1fr);
    align-items: start;
  }

  .timeline-enter,
  .timeline-row > .task-operations {
    grid-column: 3;
    justify-self: start;
    margin: 0;
  }

  .section-actions {
    display: none;
  }
}

@media (max-width: 390px) {
  .cockpit-signal {
    min-height: 92px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jobcoach-home *,
  .jobcoach-home *::before,
  .jobcoach-home *::after {
    transition-duration: 0.01ms;
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
</style>
