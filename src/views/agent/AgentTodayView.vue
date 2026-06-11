<template>
  <div class="agent-page">
    <section class="agent-hero">
      <div>
        <div class="agent-eyebrow">
          <Sparkles :size="16" />
          <span>AI 教练计划</span>
        </div>
        <h1>今天的训练由智能教练编排</h1>
        <p>根据目标岗位、项目经历、错题和面试反馈生成当天任务。每个任务都保留原因、入口和状态，你可以开始、完成、跳过或反馈。</p>
      </div>
      <div class="agent-hero__actions">
        <el-date-picker v-model="queryDate" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="loadPage(true)" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage(true)">刷新</el-button>
        <el-button type="primary" :icon="WandSparkles" :loading="generating" @click="openGenerateDialog">生成计划</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="今日计划加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage(true)">重试</el-button>
    </AppState>

    <template v-else>
      <AppState
        v-if="partialErrors.length"
        class="agent-diagnostic-state"
        type="disabled"
        title="部分今日计划数据未返回"
        :description="partialErrorDescription"
      >
        <div class="diagnostic-actions">
          <el-button type="primary" :loading="loading" @click="loadPage(true)">重新加载</el-button>
          <el-button @click="goAsyncTaskCenter">查看任务中心</el-button>
        </div>
      </AppState>

      <section class="mobile-task-rail" aria-label="手机今日任务快捷入口">
        <div class="mobile-task-rail__main">
          <span>当前优先任务</span>
          <strong>{{ mobileNextTaskTitle }}</strong>
          <small>{{ mobileNextTaskSubtitle }}</small>
        </div>
        <div class="mobile-task-rail__actions">
          <el-button
            type="primary"
            :loading="mobilePrimaryActionLoading"
            :disabled="Boolean(mobileNextTask && isTaskPending(mobileNextTask))"
            @click="handleMobilePrimaryAction"
          >
            {{ mobilePrimaryActionLabel }}
          </el-button>
          <el-button @click="router.push('/questions/recommendations')">刷题</el-button>
          <el-button @click="router.push('/interviews/create')">面试</el-button>
        </div>
      </section>

      <section class="agent-summary-grid">
        <article class="agent-metric">
          <span>今日任务</span>
          <strong>{{ todayTasks?.total ?? taskList.length }}</strong>
          <small>根据你的准备进度生成</small>
        </article>
        <article class="agent-metric">
          <span>已完成</span>
          <strong>{{ todayTasks?.doneCount ?? doneCount }}</strong>
          <small>完成后会影响后续计划</small>
        </article>
        <article class="agent-metric">
          <span>待推进</span>
          <strong>{{ todayTasks?.todoCount ?? todoCount }}</strong>
          <small>建议按优先级从上到下做</small>
        </article>
        <article class="agent-metric">
          <span>预计耗时</span>
          <strong>{{ todayTasks?.estimatedTotalMinutes ?? estimatedMinutes }}m</strong>
          <small>适合拆成短训练块</small>
        </article>
      </section>

      <section class="content-card agent-plan-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">计划</p>
              <h2>{{ plan?.targetJobTitle || '今日计划' }}</h2>
              <span>{{ plan?.date || queryDate }}</span>
            </div>
            <el-button v-if="plan?.runId" text type="primary" @click="router.push(`/agent/runs/${plan.runId}`)">查看生成详情</el-button>
          </div>

          <el-alert
            v-if="planStatusMessage"
            class="plan-status-alert"
            :type="planStatusType"
            show-icon
            :closable="false"
            :title="planStatusTitle"
            :description="planStatusMessage"
          />
          <div v-if="showAsyncTaskEntry" class="plan-async-row">
            <div>
              <strong>生成任务已接收</strong>
              <span>{{ plan?.asyncMessageId ? '可在任务中心查看进度。' : '可在任务中心继续追踪。' }}</span>
            </div>
            <el-button type="primary" plain @click="goAsyncTaskCenter">查看任务进度</el-button>
          </div>
          <div v-if="planFixAction" class="plan-fix-row">
            <el-button type="primary" plain @click="router.push(planFixAction.path)">{{ planFixAction.label }}</el-button>
            <el-button :loading="generating" @click="openGenerateDialog">重新生成</el-button>
          </div>

          <div v-loading="loading" class="plan-panel">
            <AppState
              v-if="showPlanDataError"
              type="error"
              :title="planDataErrorTitle"
              :description="planDataErrorDescription"
            >
              <el-button type="primary" :loading="loading" @click="loadPage(true)">重新加载</el-button>
              <el-button @click="goAsyncTaskCenter">去任务中心</el-button>
            </AppState>
            <AppState
              v-else-if="isPlanEmpty"
              type="empty"
              title="今天还没有计划"
              :description="plan?.emptyMessage || emptyPlanDescription"
            >
              <el-button type="primary" :loading="generating" @click="openGenerateDialog">生成今日计划</el-button>
            </AppState>
            <AppState
              v-else-if="isAsyncPlanRunning"
              type="api-pending"
              title="今日计划正在生成"
              description="生成任务已进入队列，可以离开页面；稍后回到任务中心或刷新今日计划查看结果。"
            >
              <el-button type="primary" @click="goAsyncTaskCenter">查看任务进度</el-button>
              <el-button :loading="loading" @click="loadPage(true)">刷新今日计划</el-button>
            </AppState>
            <template v-else>
              <p class="plan-summary">{{ cleanUserText(plan?.summary, '暂无计划摘要，任务列表会优先展示可执行的训练动作。') }}</p>
              <div v-if="focusSkills.length" class="skill-strip">
                <el-tag v-for="skill in focusSkills" :key="skill.code || skill.name" effect="plain">{{ skill.name || skill.code }}</el-tag>
              </div>

              <div class="task-list">
                <article v-for="task in taskList" :key="task.id" class="agent-task-card">
                  <div class="task-main">
                    <div class="task-title-row">
                      <h3>{{ displayTaskTitle(task) }}</h3>
                      <StatusTag :status="task.status" :map="taskStatusMap" />
                    </div>
                    <p>{{ displayTaskDescription(task) }}</p>
                    <div class="task-meta">
                      <span>{{ taskTypeLabel(task.taskType) }}</span>
                      <span>{{ priorityLabel(task.priority) }}</span>
                      <span>{{ task.estimatedMinutes ?? 0 }} 分钟</span>
                      <span v-if="task.relatedSkillName">{{ task.relatedSkillName }}</span>
                    </div>
                    <div class="trust-tags">
                      <span v-for="label in taskTrustLabels(task)" :key="label">{{ label }}</span>
                    </div>
                    <p v-if="displayTaskReason(task)" class="task-reason">{{ displayTaskReason(task) }}</p>
                  </div>
                  <div class="task-actions">
                    <el-button
                      v-if="task.status === 'TODO'"
                      size="small"
                      type="primary"
                      :loading="isTaskActionPending(task, 'start')"
                      :disabled="isTaskPending(task)"
                      @click="handleStartTask(task)"
                    >
                      开始
                    </el-button>
                    <el-button v-else-if="task.status === 'DOING'" size="small" type="success" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">完成</el-button>
                    <el-button
                      v-else-if="task.status === 'SKIPPED'"
                      size="small"
                      type="warning"
                      :loading="isTaskActionPending(task, 'restore')"
                      :disabled="isTaskPending(task)"
                      @click="handleRestoreTask(task)"
                    >
                      恢复
                    </el-button>
                    <el-button v-else-if="task.status === 'DONE'" size="small" disabled>已完成</el-button>
                    <el-button v-else size="small" type="success" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">完成</el-button>
                    <el-dropdown trigger="click">
                      <el-button size="small" text class="task-more-button" :icon="MoreHorizontal">更多</el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item v-if="task.actionUrl" @click="goAction(task.actionUrl)">打开任务入口</el-dropdown-item>
                          <el-dropdown-item v-if="task.status !== 'DONE'" :disabled="isTaskPending(task)" @click="openCompleteDialog(task)">标记完成</el-dropdown-item>
                          <el-dropdown-item v-if="task.status !== 'DONE' && task.status !== 'SKIPPED'" :disabled="isTaskPending(task)" @click="openSkipDialog(task)">跳过任务</el-dropdown-item>
                          <el-dropdown-item v-if="task.status === 'SKIPPED'" :disabled="isTaskPending(task)" @click="handleRestoreTask(task)">恢复待办</el-dropdown-item>
                          <el-dropdown-item divided :disabled="isTaskPending(task)" @click="openFeedbackDialog(task)">提交反馈</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </article>
                <AppState
                  v-if="!taskList.length"
                  :type="taskListEmptyType"
                  :title="taskListEmptyTitle"
                  :description="taskListEmptyDescription"
                >
                  <el-button type="primary" :loading="loading" @click="loadPage(true)">刷新任务</el-button>
                  <el-button @click="goAsyncTaskCenter">查看任务中心</el-button>
                </AppState>
              </div>
            </template>
          </div>
        </div>
      </section>
    </template>

    <el-dialog
      v-model="generateDialogVisible"
      title="生成今日计划"
      width="460px"
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="!generating"
      :before-close="beforeCloseGenerateDialog"
      @closed="resetGenerateDialog"
    >
      <el-form label-position="top">
        <el-form-item label="日期">
          <el-date-picker v-model="generateForm.date" type="date" value-format="YYYY-MM-DD" :clearable="false" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-select
            v-model="generateForm.targetJobId"
            :loading="targetLoading"
            clearable
            filterable
            placeholder="默认使用当前主目标"
            style="width: 100%"
          >
            <el-option
              v-for="target in targets"
              :key="target.id"
              :label="formatTargetOption(target)"
              :value="target.id"
            />
          </el-select>
          <p class="form-hint">{{ currentTargetHint }}</p>
        </el-form-item>
        <el-form-item label="期望任务数">
          <el-input-number v-model="generateForm.taskCount" :min="1" :max="5" controls-position="right" />
        </el-form-item>
        <el-form-item label="最大总耗时">
          <el-input-number v-model="generateForm.maxTotalMinutes" :min="30" :max="240" :step="30" controls-position="right" />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="generateForm.forceRegenerate">强制重新生成</el-checkbox>
        </el-form-item>
      </el-form>
      <template v-if="showGenerateDialogFooter" #footer>
        <el-button :disabled="generating" @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" :disabled="generating" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogMode === 'complete' ? '完成任务' : '跳过任务'" width="460px">
      <el-input v-model="taskNote" type="textarea" :rows="4" :placeholder="taskDialogMode === 'complete' ? '可填写完成备注' : '请填写跳过原因'" maxlength="200" show-word-limit />
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="selectedTask ? isTaskActionPending(selectedTask, taskDialogMode) : false" @click="submitTaskAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDialogVisible" title="任务反馈" width="460px">
      <el-form label-position="top">
        <el-form-item label="反馈类型">
          <el-select v-model="feedbackForm.feedbackType" style="width: 100%">
            <el-option v-for="item in feedbackTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="feedbackForm.comment" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="feedbackTask ? isTaskActionPending(feedbackTask, 'feedback') : false" @click="submitFeedback">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="completionReviewVisible" title="完成后复盘" width="520px">
      <div class="completion-review">
        <div>
          <span class="review-kicker">刚完成</span>
          <h3>{{ completionReviewTask ? displayTaskTitle(completionReviewTask) : '训练任务' }}</h3>
          <p>{{ completionReviewTask ? displayTaskDescription(completionReviewTask) : '记录这次训练结果，下一轮计划会更好接住反馈。' }}</p>
        </div>
        <ul>
          <li v-for="item in completionReviewItems" :key="item">{{ item }}</li>
        </ul>
        <p v-if="completionReviewNote" class="review-note">备注：{{ completionReviewNote }}</p>
      </div>
      <template #footer>
        <el-button @click="completionReviewVisible = false">稍后再看</el-button>
        <el-button v-if="completionReviewTask" @click="openFeedbackFromReview">补充反馈</el-button>
        <el-button type="primary" @click="goCompletionNextAction">{{ completionReviewNextAction.label }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { MoreHorizontal, RefreshCw, Sparkles, WandSparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  generateDailyPlanApi,
  restoreAgentTaskApi,
  skipAgentTaskApi,
  startAgentTaskApi,
  submitAgentFeedbackApi
} from '@/api/agent'
import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import {
  fetchCachedLatestDailyPlan,
  fetchCachedTodayAgentTasks,
  invalidateUserHomeTrainingCaches
} from '@/composables/useUserHomeDataCache'
import type { AgentTaskVO, AgentTodayTaskVO, DailyPlanVO } from '@/types/agent'
import type { TargetJobVO } from '@/types/jobTarget'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage as normalizeErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

const router = useRouter()
const today = formatLocalDate()

const loading = ref(false)
const generating = ref(false)
const generateSubmitting = ref(false)
const generateSubmitted = ref(false)
const errorMessage = ref('')
const partialErrors = ref<string[]>([])
const queryDate = ref(today)
const loadedPageKey = ref('')
const plan = ref<DailyPlanVO>()
const todayTasks = ref<AgentTodayTaskVO>()
const currentTargetJobId = ref<number | undefined>()
const targets = ref<TargetJobVO[]>([])
const currentTarget = ref<TargetJobVO | null>(null)
const targetLoading = ref(false)
const targetLoadError = ref('')
const generateDialogVisible = ref(false)
const taskDialogVisible = ref(false)
const taskDialogMode = ref<'complete' | 'skip'>('complete')
const selectedTask = ref<AgentTaskVO>()
const taskNote = ref('')
const feedbackDialogVisible = ref(false)
const feedbackTask = ref<AgentTaskVO>()
const feedbackForm = reactive({
  feedbackType: 'HELPFUL',
  comment: ''
})
const completionReviewVisible = ref(false)
const completionReviewTask = ref<AgentTaskVO>()
const completionReviewNote = ref('')

const generateForm = reactive({
  targetJobId: undefined as number | undefined,
  date: today,
  maxTotalMinutes: 120,
  taskCount: 3,
  forceRegenerate: false
})

const taskStatusMap = {
  TODO: '待完成',
  DOING: '进行中',
  DONE: '已完成',
  SKIPPED: '已跳过',
  EXPIRED: '已过期'
}

const taskTypeMap: Record<string, string> = {
  QUESTION_PRACTICE: '刷题练习',
  WRONG_QUESTION_REVIEW: '错题复习',
  INTERVIEW: '模拟面试',
  RESUME_OPTIMIZE: '简历优化',
  STUDY_TASK: '学习任务',
  REPORT_REVIEW: '报告复盘',
  SKILL_REVIEW: '技能复习',
  KNOWLEDGE_REVIEW: '知识复盘'
}

const taskTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  if (!type) return '未分类'
  return taskTypeMap[type] || '专项训练'
}

const priorityMap: Record<string, string> = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
}

const priorityLabel = (value?: string | null) => {
  const priority = String(value || '').toUpperCase()
  if (!priority) return '无优先级'
  return priorityMap[priority] || '普通优先级'
}

const feedbackTypeOptions = [
  { label: '有帮助', value: 'HELPFUL' },
  { label: '没有帮助', value: 'NOT_HELPFUL' },
  { label: '内容不准确', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '内容不符合实际', value: 'HALLUCINATION' },
  { label: '太难', value: 'TOO_HARD' },
  { label: '太简单', value: 'TOO_EASY' },
  { label: '不相关', value: 'IRRELEVANT' }
]

const emptyPlanDescription = '先确认目标岗位和默认简历；如果训练资料还不完整，可以先完成一次题目练习或模拟面试，再生成今日计划。'

const dataSourceLabels = {
  plan: '今日计划',
  tasks: '今日任务'
} as const

const sourceFailed = (label: string) => partialErrors.value.includes(label)

type TaskAction = 'start' | 'complete' | 'skip' | 'restore' | 'feedback'

const pendingTaskActions = ref<Set<string>>(new Set())

const taskActionKey = (task: AgentTaskVO, action: TaskAction) => `${task.id}:${action}`
const isTaskActionPending = (task: AgentTaskVO, action: TaskAction) => pendingTaskActions.value.has(taskActionKey(task, action))
const isTaskPending = (task: AgentTaskVO) => Array.from(pendingTaskActions.value).some((key) => key.startsWith(`${task.id}:`))

const setTaskActionPending = (task: AgentTaskVO, action: TaskAction, pending: boolean) => {
  const next = new Set(pendingTaskActions.value)
  const key = taskActionKey(task, action)
  if (pending) {
    next.add(key)
  } else {
    next.delete(key)
  }
  pendingTaskActions.value = next
}

const withTaskPending = async (task: AgentTaskVO, action: TaskAction, handler: () => Promise<void>) => {
  if (isTaskActionPending(task, action)) return
  setTaskActionPending(task, action, true)
  try {
    await handler()
  } finally {
    setTaskActionPending(task, action, false)
  }
}

const focusSkills = computed(() => plan.value?.focusSkills || [])
const taskList = computed(() => todayTasks.value?.tasks?.length ? todayTasks.value.tasks : plan.value?.tasks || [])
const partialErrorDescription = computed(() =>
  `以下数据暂未返回：${partialErrors.value.join('、')}。页面会继续保留已成功加载的内容；如果你刚完成任务或刚生成计划，请重新加载或到任务中心继续查看。`
)
const hasAsyncReceipt = computed(() => Boolean(plan.value?.asyncMessageId || plan.value?.asyncTraceId || plan.value?.asyncBizType))
const planStatus = computed(() => String(plan.value?.status || '').toUpperCase())
const isAsyncPlanRunning = computed(() => planStatus.value === 'RUNNING' && !taskList.value.length)
const showAsyncTaskEntry = computed(() => hasAsyncReceipt.value || isAsyncPlanRunning.value)
const hasPlanDataError = computed(() => sourceFailed(dataSourceLabels.plan) || sourceFailed(dataSourceLabels.tasks))
const showPlanDataError = computed(() => !loading.value && !taskList.value.length && hasPlanDataError.value)
const planDataErrorTitle = computed(() => {
  if (sourceFailed(dataSourceLabels.plan) && sourceFailed(dataSourceLabels.tasks)) return '今日计划和任务加载失败'
  if (sourceFailed(dataSourceLabels.plan)) return '今日计划加载失败'
  return '今日任务加载失败'
})
const planDataErrorDescription = computed(() => {
  if (sourceFailed(dataSourceLabels.plan) && sourceFailed(dataSourceLabels.tasks)) {
    return '计划摘要和任务列表都暂未返回。你可以重新加载，或到任务中心继续查看生成进度。'
  }
  if (sourceFailed(dataSourceLabels.plan)) {
    return '计划摘要暂未返回，但任务列表可能已经生成。请重新加载；如果刚提交生成任务，可以到任务中心继续查看。'
  }
  return '任务列表暂未返回，当前不能判断今天是否真的没有训练任务。请重新加载，或到任务中心查看最近任务。'
})
const isPlanEmpty = computed(() => !loading.value && !hasPlanDataError.value && !taskList.value.length && !isAsyncPlanRunning.value && (plan.value?.empty || !plan.value?.runId))
const showGenerateDialogFooter = computed(() => generateDialogVisible.value && !generateSubmitting.value && !generateSubmitted.value)
const taskListEmptyType = computed(() => sourceFailed(dataSourceLabels.tasks) ? 'error' : 'empty')
const taskListEmptyTitle = computed(() => sourceFailed(dataSourceLabels.tasks) ? '任务列表加载失败' : '当前日期暂无任务')
const taskListEmptyDescription = computed(() =>
  sourceFailed(dataSourceLabels.tasks)
    ? '任务列表暂未返回，本次不能判断是否真的没有待办。请重新加载，或到任务中心继续查看今天的任务。'
    : '当前日期还没有生成训练任务。可以先生成今日计划，或进入题库和面试入口保持训练节奏。'
)
const doneCount = computed(() => taskList.value.filter((task) => task.status === 'DONE').length)
const todoCount = computed(() => taskList.value.filter((task) => task.status === 'TODO' || task.status === 'DOING').length)
const estimatedMinutes = computed(() => taskList.value.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0))
const mobileNextTask = computed(() => {
  const active = taskList.value.find((task) => ['DOING', 'TODO'].includes(String(task.status || '').toUpperCase()))
  return active || taskList.value.find((task) => !['DONE', 'SKIPPED'].includes(String(task.status || '').toUpperCase())) || null
})
const mobileNextTaskTitle = computed(() => mobileNextTask.value ? displayTaskTitle(mobileNextTask.value) : '生成今日计划')
const mobileNextTaskSubtitle = computed(() => {
  const task = mobileNextTask.value
  if (!task) return '还没有训练任务，先生成计划或进入刷题/面试'
  const normalizedStatus = String(task.status || '').toUpperCase()
  const status = taskStatusMap[normalizedStatus as keyof typeof taskStatusMap] || '待处理'
  const minutes = task.estimatedMinutes ? `${task.estimatedMinutes} 分钟` : '短训练'
  const source = task.relatedSkillName || task.targetJobTitle || taskTypeLabel(task.taskType) || '今日训练'
  return `${status} · ${minutes} · ${source}`
})
const mobilePrimaryActionLabel = computed(() => {
  const task = mobileNextTask.value
  if (!task) return '生成计划'
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') return '开始'
  if (status === 'DOING') return '完成'
  if (status === 'SKIPPED') return '恢复'
  if (status === 'DONE') return '查看'
  return '完成'
})
const mobilePrimaryActionLoading = computed(() => {
  const task = mobileNextTask.value
  if (!task) return generating.value
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') return isTaskActionPending(task, 'start')
  if (status === 'SKIPPED') return isTaskActionPending(task, 'restore')
  return isTaskActionPending(task, 'complete')
})
const planStatusType = computed(() => (planStatus.value === 'FAILED' ? 'error' : planStatus.value === 'RUNNING' ? 'warning' : 'info'))
const planStatusTitle = computed(() => {
  if (planStatus.value === 'RUNNING') return '计划生成中'
  if (planStatus.value === 'FAILED') return '计划生成失败'
  return '计划状态'
})
const planStatusMessage = computed(() => {
  if (planStatus.value === 'RUNNING') {
    return '计划正在生成，可以离开页面；系统会避免重复提交同一天同岗位的生成请求，也可以到任务中心查看进度。'
  }
  if (planStatus.value === 'FAILED') {
    return toFriendlyMessage(plan.value?.errorMessage || plan.value?.errorCode, '计划生成失败，请检查目标岗位、简历和能力画像后重试。')
  }
  return ''
})
const planFixAction = computed(() => {
  const value = `${plan.value?.errorCode || ''} ${plan.value?.errorMessage || ''}`.toUpperCase()
  if (value.includes('TARGET_JOB')) {
    return { label: '去创建目标岗位', path: '/job-targets' }
  }
  if (value.includes('RESUME')) {
    return { label: '去完善简历', path: '/resumes' }
  }
  if (value.includes('SKILL_PROFILE')) {
    return { label: '去生成能力画像', path: '/skill-profile' }
  }
  return null
})
const currentTargetHint = computed(() => {
  if (targetLoading.value) return '正在读取岗位目标列表...'
  if (targetLoadError.value) return targetLoadError.value
  if (currentTarget.value) return `不选择时使用当前主目标：${formatTargetOption(currentTarget.value)}`
  if (!targets.value.length) return '还没有岗位目标，系统会尝试使用默认主目标；也可以先去岗位目标页创建。'
  return '不选择时使用当前主目标。'
})
const completionReviewItems = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  const skill = task?.relatedSkillName || task?.targetJobTitle || '当前方向'
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) {
    return [
      `掌握度：已完成一轮「${skill}」训练，先把能稳定讲清楚的点记为可复用表达。`,
      '当前短板：如果回答仍停在概念层，优先补项目场景、指标、取舍和追问边界。',
      '下一步建议：进入专项练习或错题本，再刷一组同方向题，巩固今天发现的问题。'
    ]
  }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) {
    return [
      `掌握度：已完成一次「${skill}」复盘，先确认哪些回答能支撑目标岗位要求。`,
      '当前短板：重点查看低分项、追问失败点和项目描述里还缺少支撑的部分。',
      '下一步建议：把 1 个薄弱点回填到题库训练或下一次模拟面试，优先练项目背景、指标和取舍。'
    ]
  }
  if (type.includes('RESUME')) {
    return [
      `掌握度：已完成一次「${skill}」项目经历整理，先确认新增内容能被面试官追问。`,
      '当前短板：如果仍缺少数字、业务场景或个人职责，匹配建议会不够稳定。',
      '下一步建议：用目标岗位关键词再跑一次匹配，把仍缺项目支撑的技能放回今日训练。'
    ]
  }
  return [
    '掌握度：本次任务已经完成，先确认是否产出了可复用结论。',
    '当前短板：把仍不确定、无法举例或无法落到项目里的点写进反馈。',
    '下一步建议：继续推进下一项待办，保持今天的训练闭环。'
  ]
})
const completionReviewNextAction = computed(() => {
  const task = completionReviewTask.value
  const type = String(task?.taskType || '').toUpperCase()
  if (task?.actionUrl) return { label: '打开任务入口', path: task.actionUrl }
  if (type.includes('QUESTION') || type.includes('SKILL') || type.includes('KNOWLEDGE')) return { label: '继续专项练习', path: '/questions/practice' }
  if (type.includes('INTERVIEW') || type.includes('REPORT')) return { label: '查看面试历史', path: '/interviews/history' }
  if (type.includes('RESUME')) return { label: '查看简历匹配', path: '/resume-match' }
  return { label: '继续今日任务', path: '/agent/today' }
})

const getErrorMessage = (error: unknown) => {
  return normalizeErrorMessage(error, '请求失败，请稍后重试。')
}

const buildAsyncTaskCenterPath = (dailyPlan?: DailyPlanVO) => {
  const query = new URLSearchParams()
  query.set('bizType', dailyPlan?.asyncBizType || 'agent.daily-plan.generate')
  const bizId = dailyPlan?.asyncBizId || (dailyPlan?.runId == null ? '' : String(dailyPlan.runId))
  if (bizId) query.set('bizId', bizId)
  if (dailyPlan?.asyncMessageId) query.set('messageId', dailyPlan.asyncMessageId)
  if (dailyPlan?.asyncTraceId) query.set('traceId', dailyPlan.asyncTraceId)
  return `/agent/tasks?${query.toString()}`
}

const skillFromText = (value?: string) =>
  value?.match(/(?:for|with)\s+(.+?)(?:\s+interview|\s+concepts|$)/i)?.[1]?.trim()

const cleanUserText = (value?: string | null, fallback = '') => {
  const text = toFriendlyMessage(value || '', '').trim()
  if (!text) return fallback
  if (/^(Calling DeepSeek|Task completed)$/i.test(text)) return fallback
  return text
}

const displayTaskTitle = (task: AgentTaskVO) => {
  const skill = task.relatedSkillName || skillFromText(task.title) || task.targetJobTitle || '目标技能'
  const map: Record<string, string> = {
    QUESTION_PRACTICE: `${skill} 面试题练习`,
    WRONG_QUESTION_REVIEW: `${skill} 错题复习`,
    INTERVIEW: '目标岗位模拟面试',
    RESUME_OPTIMIZE: `${skill} 项目经历优化`,
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 表达素材复盘`
  }
  return map[task.taskType || ''] || cleanUserText(task.title, `训练任务 ${task.id}`)
}

const displayTaskDescription = (task: AgentTaskVO) => {
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚说明目标技能和业务影响。',
    STUDY_TASK: '完成学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '从项目经历、训练记录或面试工具中提取可复用表达。'
  }
  return map[task.taskType || ''] || cleanUserText(task.description, '暂无任务描述')
}

const displayTaskReason = (task: AgentTaskVO) => cleanUserText(task.reason, '')

const getTaskRunId = (task: AgentTaskVO) => task.agentRunId ?? task.runId ?? null

const sourceTypeLabel = (value?: string | null) => {
  const type = String(value || '').toUpperCase()
  const map: Record<string, string> = {
    TARGET_JOB: '目标岗位',
    RESUME_JOB_MATCH: '匹配报告',
    RESUME_MATCH: '匹配报告',
    QUESTION_RECOMMENDATION: '推荐题',
    QUESTION_PRACTICE: '题库练习',
    WRONG_QUESTION_REVIEW: '错题复习',
    INTERVIEW: '模拟面试',
    INTERVIEW_REPORT: '面试报告',
    RESUME_OPTIMIZE: '项目经历',
    TRAINING_MATERIAL: '训练素材',
    JOB_COACH_AGENT_TASK: '智能教练'
  }
  return map[type] || '智能教练'
}

const trustStatusLabel = (value?: string | null, fallback?: boolean | null) => {
  const status = String(value || '').toUpperCase()
  if (fallback || status === 'FALLBACK') return '推荐依据不足'
  if (status === 'VERIFIED') return '来源已记录'
  if (status === 'PARTIAL') return '部分来源待确认'
  return '来源待确认'
}

const taskEvidenceLabels = (task: AgentTaskVO) => {
  const type = String(task.taskType || '').toUpperCase()
  const bizType = String(task.relatedBizType || '').toUpperCase()
  const actionUrl = String(task.actionUrl || '').toLowerCase()
  const labels = new Set<string>()

  if (bizType.includes('MATCH') || actionUrl.includes('resume-match')) labels.add('来自匹配报告')
  if (bizType.includes('RESUME') || type.includes('RESUME') || actionUrl.includes('resume')) labels.add('来自项目经历')
  if (bizType.includes('JOB') || task.targetJobTitle || actionUrl.includes('job-target')) labels.add('来自目标岗位描述')
  if (bizType.includes('QUESTION') || type.includes('QUESTION') || actionUrl.includes('question')) labels.add('来自题库/错题')
  if (bizType.includes('INTERVIEW') || type.includes('INTERVIEW') || type.includes('REPORT') || actionUrl.includes('interview')) {
    labels.add('来自面试反馈')
  }
  if (task.relatedSkillName) labels.add(`聚焦：${task.relatedSkillName}`)

  return Array.from(labels)
}

const taskTrustLabels = (task: AgentTaskVO) => {
  const labels = [`来源：${sourceTypeLabel(task.sourceType || task.relatedBizType || task.taskType)}`]
  if (task.evidenceSummary) {
    labels.push(task.evidenceSummary)
  } else {
    labels.push(...taskEvidenceLabels(task))
    const reason = cleanUserText(task.reason, '')
    labels.push(reason ? '推荐理由已返回' : '推荐依据不足')
  }
  labels.push(trustStatusLabel(task.trustStatus, task.fallback))
  const runId = getTaskRunId(task)
  labels.push(runId ? '计划生成详情可查看' : '状态可追踪')
  return Array.from(new Set(labels))
}

const formatTargetOption = (target: TargetJobVO) => {
  const title = target.jobTitle || '当前目标岗位'
  const company = target.companyName || '未填写公司'
  const current = target.currentFlag === 1 ? ' · 当前' : ''
  return `${title} · ${company}${current}`
}

const loadJobTargets = async () => {
  if (targetLoading.value) return
  targetLoading.value = true
  targetLoadError.value = ''
  try {
    const [listResult, currentResult] = await Promise.allSettled([
      getJobTargetsApi({ pageNo: 1, pageSize: 50 }),
      getCurrentJobTargetApi()
    ])

    if (listResult.status === 'fulfilled') {
      targets.value = listResult.value || []
    } else {
      targets.value = []
      targetLoadError.value = getErrorMessage(listResult.reason) || '岗位目标列表暂时加载失败，不选择时仍会按当前主目标生成。'
    }

    if (currentResult.status === 'fulfilled') {
      currentTarget.value = currentResult.value || null
    } else {
      currentTarget.value = targets.value.find((item) => item.currentFlag === 1) || null
      targetLoadError.value = currentTarget.value
        ? '当前主目标读取失败，已先使用岗位列表中的主目标标记。'
        : (getErrorMessage(currentResult.reason) || '当前主目标暂时无法读取；可以手动选择岗位后生成计划。')
    }
  } catch (error) {
    targets.value = []
    currentTarget.value = null
    targetLoadError.value = getErrorMessage(error) || '岗位目标列表暂时加载失败，不选择时仍会按当前主目标生成。'
  } finally {
    targetLoading.value = false
  }
}

const shouldForceRefresh = (force?: unknown) => force === true

const currentPageKey = () => `${queryDate.value}:${currentTargetJobId.value || ''}`

const firstRejectedReason = (...results: PromiseSettledResult<unknown>[]) =>
  results.find((item): item is PromiseRejectedResult => item.status === 'rejected')?.reason

const invalidateCurrentTrainingCaches = () => {
  invalidateUserHomeTrainingCaches(queryDate.value, currentTargetJobId.value)
}

const loadPage = async (force?: unknown) => {
  loading.value = true
  errorMessage.value = ''
  partialErrors.value = []
  const pageKey = currentPageKey()
  const samePage = loadedPageKey.value === pageKey
  try {
    const [planResult, taskResult] = await Promise.allSettled([
      fetchCachedLatestDailyPlan(queryDate.value, shouldForceRefresh(force), currentTargetJobId.value),
      fetchCachedTodayAgentTasks(queryDate.value, shouldForceRefresh(force), currentTargetJobId.value)
    ])
    if (planResult.status === 'fulfilled') {
      plan.value = planResult.value
    } else if (!samePage) {
      plan.value = undefined
    }
    if (taskResult.status === 'fulfilled') {
      todayTasks.value = taskResult.value
    } else if (!samePage) {
      todayTasks.value = undefined
    }
    const failed = [
      planResult.status === 'rejected' ? dataSourceLabels.plan : '',
      taskResult.status === 'rejected' ? dataSourceLabels.tasks : ''
    ].filter(Boolean)
    if (failed.length === 2 && !samePage) {
      errorMessage.value = getErrorMessage(firstRejectedReason(planResult, taskResult))
      return
    }
    partialErrors.value = failed
    if (!failed.length || planResult.status === 'fulfilled' || taskResult.status === 'fulfilled') {
      loadedPageKey.value = pageKey
    }
  } catch (error) {
    if (!samePage) {
      plan.value = undefined
      todayTasks.value = undefined
    }
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openGenerateDialog = () => {
  generateSubmitted.value = false
  generateForm.date = queryDate.value
  generateForm.targetJobId = currentTargetJobId.value
  generateDialogVisible.value = true
  if (!targets.value.length) {
    void loadJobTargets()
  }
}

const resetGenerateDialog = () => {
  generateSubmitting.value = false
  generateSubmitted.value = false
  generateForm.date = queryDate.value
  generateForm.targetJobId = currentTargetJobId.value
  generateForm.maxTotalMinutes = 120
  generateForm.taskCount = 3
  generateForm.forceRegenerate = false
}

const closeGenerateDialogAfterSubmit = () => {
  generateSubmitted.value = true
  generateDialogVisible.value = false
}

const beforeCloseGenerateDialog = (done: () => void) => {
  if (generating.value) {
    ElMessage.info('今日计划正在生成，请等待任务提交完成。')
    return
  }
  done()
}

const handleGenerate = async () => {
  if (generating.value) return
  if (generateForm.forceRegenerate && plan.value?.runId) {
    const confirmed = await confirmDangerActionPreview({
      title: '重新生成今日计划',
      action: '强制重新生成今天的训练计划',
      target: `${generateForm.date} 的今日计划`,
      impact: '会重新提交当天计划生成，当前任务视图会刷新；已记录的任务完成、跳过和反馈会保留，但新计划可能调整任务优先级和入口。',
      rollback: '可回到任务中心查看已有任务状态；如新计划不合适，可以按旧任务记录继续执行或再次生成。',
      audit: '生成详情会保留必要处理线索，便于在任务中心继续查看。',
      tips: ['确认已完成或跳过的任务反馈已经提交。', '确认目标岗位和项目经历是当前要使用的版本。'],
      confirmButtonText: '确认重新生成'
    })
    if (!confirmed) {
      return
    }
  }
  generating.value = true
  generateSubmitting.value = true
  errorMessage.value = ''
  try {
    plan.value = await generateDailyPlanApi({
      ...generateForm,
      targetJobId: generateForm.targetJobId || undefined
    })
    currentTargetJobId.value = generateForm.targetJobId || undefined
    queryDate.value = generateForm.date
    closeGenerateDialogAfterSubmit()
    if (showAsyncTaskEntry.value) {
      ElMessage.success(plan.value?.asyncMessageId ? '今日计划已提交，可在任务中心查看进度。' : '今日计划已提交生成')
    } else {
      ElMessage.success('今日计划已生成')
    }
    invalidateCurrentTrainingCaches()
    if (!showAsyncTaskEntry.value) {
      await loadPage(true)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    generateSubmitting.value = false
  } finally {
    generating.value = false
  }
}

const openCompleteDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  taskDialogMode.value = 'complete'
  taskNote.value = ''
  taskDialogVisible.value = true
}

const openSkipDialog = (task: AgentTaskVO) => {
  selectedTask.value = task
  taskDialogMode.value = 'skip'
  taskNote.value = ''
  taskDialogVisible.value = true
}

const submitTaskAction = async () => {
  const task = selectedTask.value
  if (!task) return
  if (taskDialogMode.value === 'skip' && !taskNote.value.trim()) {
    ElMessage.warning('请填写跳过原因')
    return
  }
  await withTaskPending(task, taskDialogMode.value, async () => {
    if (taskDialogMode.value === 'complete') {
      await completeAgentTaskApi(task.id, { note: taskNote.value || undefined })
      ElMessage.success('任务已完成')
      completionReviewTask.value = task
      completionReviewNote.value = taskNote.value.trim()
      completionReviewVisible.value = true
    } else {
      await skipAgentTaskApi(task.id, { skipReason: taskNote.value || undefined })
      ElMessage.success('任务已跳过')
    }
    taskDialogVisible.value = false
    invalidateCurrentTrainingCaches()
    await loadPage(true)
  })
}

const handleStartTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'start', async () => {
    await startAgentTaskApi(task.id)
    ElMessage.success('任务已开始')
    invalidateCurrentTrainingCaches()
    await loadPage(true)
  })
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'restore', async () => {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('任务已恢复')
    invalidateCurrentTrainingCaches()
    await loadPage(true)
  })
}

const openFeedbackDialog = (task: AgentTaskVO) => {
  feedbackTask.value = task
  Object.assign(feedbackForm, {
    feedbackType: 'HELPFUL',
    comment: ''
  })
  feedbackDialogVisible.value = true
}

const submitFeedback = async () => {
  const task = feedbackTask.value
  if (!task) return
  await withTaskPending(task, 'feedback', async () => {
    await submitAgentFeedbackApi({
      agentTaskId: task.id,
      agentRunId: getTaskRunId(task) ?? undefined,
      feedbackType: feedbackForm.feedbackType,
      comment: feedbackForm.comment || undefined
    })
    feedbackDialogVisible.value = false
    ElMessage.success('反馈已提交')
  })
}

const openFeedbackFromReview = () => {
  if (!completionReviewTask.value) return
  completionReviewVisible.value = false
  openFeedbackDialog(completionReviewTask.value)
}

const handleMobilePrimaryAction = async () => {
  const task = mobileNextTask.value
  if (!task) {
    openGenerateDialog()
    return
  }
  const status = String(task.status || '').toUpperCase()
  if (status === 'TODO') {
    await handleStartTask(task)
    return
  }
  if (status === 'DOING') {
    openCompleteDialog(task)
    return
  }
  if (status === 'SKIPPED') {
    await handleRestoreTask(task)
    return
  }
  if (task.actionUrl) {
    goAction(task.actionUrl)
    return
  }
  router.push('/agent/tasks')
}

const goCompletionNextAction = () => {
  completionReviewVisible.value = false
  goAction(completionReviewNextAction.value.path)
}

const goAsyncTaskCenter = () => {
  router.push(buildAsyncTaskCenterPath(plan.value))
}

const goAction = (actionUrl: string) => {
  if (actionUrl.startsWith('/')) {
    router.push(actionUrl)
    return
  }
  ElMessage.warning('任务链接暂不支持跳转到站外地址')
}

onMounted(() => {
  void loadJobTargets()
  void loadPage(false)
})
</script>

<style scoped lang="scss">
.agent-page {
  display: grid;
  gap: 18px;
  color: #172033;
}

.agent-hero,
.section-head,
.task-title-row,
.agent-hero__actions {
  display: flex;
  gap: 16px;
}

.agent-hero {
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 58%),
    #ffffff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
}

.agent-eyebrow,
.agent-hero__actions,
.task-meta,
.trust-tags,
.task-actions,
.skill-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.agent-eyebrow {
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.agent-hero h1,
.section-head h2,
.agent-task-card h3 {
  margin: 0;
}

.agent-hero h1 {
  margin-top: 10px;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.18;
  letter-spacing: 0;
}

.agent-hero p,
.section-head span,
.plan-summary,
.agent-task-card p {
  color: #526071;
  line-height: 1.7;
}

.agent-hero p {
  max-width: 720px;
}

.agent-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.mobile-task-rail {
  display: none;
}

.agent-diagnostic-state {
  border-color: #fde68a;
  background: #fffbeb;
  box-shadow: none;
}

.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.agent-metric,
.agent-task-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
}

.agent-metric {
  display: grid;
  gap: 7px;
  min-height: 132px;
  padding: 16px;
}

.agent-metric span,
.section-kicker {
  color: #64748b;
  font-size: 13px;
}

.agent-metric strong {
  display: block;
  color: #0f172a;
  font-size: 28px;
  line-height: 1.1;
}

.agent-metric small {
  margin-top: auto;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.agent-plan-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.07);
}

.content-card__body {
  padding: 20px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  color: #2563eb;
  font-weight: 800;
}

.plan-panel {
  min-height: 220px;
}

.plan-status-alert {
  margin-bottom: 16px;
}

.plan-async-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}

.plan-fix-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.plan-async-row div {
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    color: #1e3a8a;
    font-size: 14px;
  }

  span {
    color: #475569;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }
}

.plan-summary {
  margin: 18px 0 0;
  padding: 14px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #f8fafc;
}

.skill-strip {
  margin-top: 14px;
}

.task-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.agent-task-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  padding: 16px;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease;

  &:hover {
    border-color: #bfdbfe;
    box-shadow: 0 14px 30px rgba(37, 99, 235, 0.08);
  }
}

.task-title-row {
  align-items: flex-start;
  justify-content: space-between;
}

.agent-task-card h3 {
  color: #0f172a;
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
}

.task-meta span {
  padding: 3px 9px;
  border-radius: 999px;
  background: #eef2f7;
  color: #475569;
  font-size: 12px;
}

.trust-tags {
  margin-top: 10px;

  span {
    padding: 3px 8px;
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
  }
}

.task-reason {
  margin-bottom: 0;
  padding: 10px 12px;
  border-left: 3px solid #2563eb;
  border-radius: 6px;
  background: #eff6ff;
}

.task-actions {
  align-content: flex-start;
  justify-content: flex-end;
}

.task-more-button {
  padding-inline: 6px;
}

.form-hint {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 12px;
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

@media (max-width: 900px) {
  .agent-hero,
  .section-head,
  .agent-task-card {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .agent-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .agent-page {
    gap: 12px;
  }

  .agent-hero {
    padding: 18px;
  }

  .agent-hero h1 {
    font-size: 25px;
  }

  .agent-hero p {
    display: none;
  }

  .agent-hero__actions,
  .agent-hero__actions :deep(.el-button),
  .agent-hero__actions :deep(.el-date-editor) {
    width: 100%;
  }

  .mobile-task-rail {
    position: sticky;
    top: 10px;
    z-index: 6;
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
  }

  .mobile-task-rail__main {
    display: grid;
    gap: 3px;
    min-width: 0;

    span {
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
    }

    strong {
      overflow: hidden;
      color: #0f172a;
      font-size: 15px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      color: #64748b;
      font-size: 12px;
      line-height: 1.4;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mobile-task-rail__actions {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 8px;

    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
      padding-inline: 8px;
    }
  }

  .agent-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agent-metric {
    min-height: 112px;
  }

  .content-card__body,
  .agent-task-card {
    padding: 14px;
  }
}
</style>
