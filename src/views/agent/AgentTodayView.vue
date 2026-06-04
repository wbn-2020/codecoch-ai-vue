<template>
  <div class="page-shell agent-page">
    <section class="agent-hero">
      <div>
        <div class="agent-eyebrow">
          <Sparkles :size="16" />
          <span>今日训练</span>
        </div>
        <h1>今日求职准备计划</h1>
        <p>根据目标岗位、简历证据和薄弱点生成当天任务，你可以按优先级开始、完成或跳过。</p>
      </div>
      <div class="agent-hero__actions">
        <el-date-picker v-model="queryDate" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="loadPage" />
        <el-button :icon="RefreshCw" :loading="loading" @click="loadPage">刷新</el-button>
        <el-button type="primary" :icon="WandSparkles" :loading="generating" @click="openGenerateDialog">生成计划</el-button>
      </div>
    </section>

    <AppState v-if="errorMessage" type="error" title="今日计划加载失败" :description="errorMessage">
      <el-button type="primary" @click="loadPage">重试</el-button>
    </AppState>

    <template v-else>
      <section class="agent-summary-grid">
        <article class="agent-metric">
          <span>任务总数</span>
          <strong>{{ todayTasks?.total ?? taskList.length }}</strong>
        </article>
        <article class="agent-metric">
          <span>已完成</span>
          <strong>{{ todayTasks?.doneCount ?? doneCount }}</strong>
        </article>
        <article class="agent-metric">
          <span>待推进</span>
          <strong>{{ todayTasks?.todoCount ?? todoCount }}</strong>
        </article>
        <article class="agent-metric">
          <span>预计耗时</span>
          <strong>{{ todayTasks?.estimatedTotalMinutes ?? estimatedMinutes }}m</strong>
        </article>
      </section>

      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">计划</p>
              <h2>{{ plan?.targetJobTitle || '今日计划' }}</h2>
              <span>{{ plan?.date || queryDate }}</span>
            </div>
            <el-button v-if="plan?.runId" text type="primary" @click="router.push(`/agent/runs/${plan.runId}`)">查看运行详情</el-button>
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
          <div v-if="planFixAction" class="plan-fix-row">
            <el-button type="primary" plain @click="router.push(planFixAction.path)">{{ planFixAction.label }}</el-button>
            <el-button :loading="generating" @click="openGenerateDialog">重新生成</el-button>
          </div>

          <div v-loading="loading" class="plan-panel">
            <AppState
              v-if="isPlanEmpty"
              type="empty"
              title="今天还没有计划"
              :description="plan?.emptyMessage || emptyPlanDescription"
            >
              <el-button type="primary" :loading="generating" @click="openGenerateDialog">生成今日计划</el-button>
            </AppState>
            <template v-else>
              <p class="plan-summary">{{ cleanUserText(plan?.summary, '暂无计划摘要') }}</p>
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
                      <span>{{ taskTypeMap[task.taskType || ''] || task.taskType || '未分类' }}</span>
                      <span>{{ priorityMap[task.priority || ''] || task.priority || '无优先级' }}</span>
                      <span>{{ task.estimatedMinutes ?? 0 }} 分钟</span>
                      <span v-if="task.relatedSkillName">{{ task.relatedSkillName }}</span>
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
                <AppState v-if="!taskList.length" type="empty" title="当前日期暂无任务" description="当前日期还没有生成训练任务。" />
              </div>
            </template>
          </div>
        </div>
      </section>
    </template>

    <el-dialog v-model="generateDialogVisible" title="生成今日计划" width="460px">
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
      <template #footer>
        <el-button @click="generateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="handleGenerate">生成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="taskDialogMode === 'complete' ? '完成任务' : '跳过任务'" width="460px">
      <el-input v-model="taskNote" type="textarea" :rows="4" :placeholder="taskDialogMode === 'complete' ? '可填写完成备注' : '请填写跳过原因'" maxlength="200" show-word-limit />
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="selectedTask ? isTaskActionPending(selectedTask, taskDialogMode) : false" @click="submitTaskAction">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="feedbackDialogVisible" title="Agent 反馈" width="460px">
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
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { MoreHorizontal, RefreshCw, Sparkles, WandSparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  completeAgentTaskApi,
  generateDailyPlanApi,
  getLatestDailyPlanApi,
  getTodayAgentTasksApi,
  restoreAgentTaskApi,
  skipAgentTaskApi,
  startAgentTaskApi,
  submitAgentFeedbackApi
} from '@/api/agent'
import { getCurrentJobTargetApi, getJobTargetsApi } from '@/api/jobTarget'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { AgentTaskVO, AgentTodayTaskVO, DailyPlanVO } from '@/types/agent'
import type { TargetJobVO } from '@/types/jobTarget'
import { getErrorMessage as normalizeErrorMessage, toFriendlyMessage } from '@/utils/error'
import { formatLocalDate } from '@/utils/format'

const router = useRouter()
const today = formatLocalDate()

const loading = ref(false)
const generating = ref(false)
const errorMessage = ref('')
const queryDate = ref(today)
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

const priorityMap: Record<string, string> = {
  HIGH: '高优先级',
  MEDIUM: '中优先级',
  LOW: '低优先级'
}

const feedbackTypeOptions = [
  { label: '有帮助', value: 'HELPFUL' },
  { label: '没有帮助', value: 'NOT_HELPFUL' },
  { label: '内容不准确', value: 'INACCURATE' },
  { label: '不是我的经历', value: 'NOT_MY_EXPERIENCE' },
  { label: '疑似幻觉', value: 'HALLUCINATION' },
  { label: '太难', value: 'TOO_HARD' },
  { label: '太简单', value: 'TOO_EASY' },
  { label: '不相关', value: 'IRRELEVANT' }
]

const emptyPlanDescription = '先确认目标岗位和默认简历；如果缺少弱点证据，可以先完成一次题目练习或模拟面试，再生成今日计划。'

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
const isPlanEmpty = computed(() => !loading.value && !taskList.value.length && (plan.value?.empty || !plan.value?.runId))
const doneCount = computed(() => taskList.value.filter((task) => task.status === 'DONE').length)
const todoCount = computed(() => taskList.value.filter((task) => task.status === 'TODO' || task.status === 'DOING').length)
const estimatedMinutes = computed(() => taskList.value.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0))
const planStatus = computed(() => String(plan.value?.status || '').toUpperCase())
const planStatusType = computed(() => (planStatus.value === 'FAILED' ? 'error' : planStatus.value === 'RUNNING' ? 'warning' : 'info'))
const planStatusTitle = computed(() => {
  if (planStatus.value === 'RUNNING') return '计划生成中'
  if (planStatus.value === 'FAILED') return '计划生成失败'
  return '计划状态'
})
const planStatusMessage = computed(() => {
  if (planStatus.value === 'RUNNING') {
    return '计划正在生成，请稍后刷新；系统会避免重复提交同一天同岗位的生成请求。'
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

const getErrorMessage = (error: unknown) => {
  return normalizeErrorMessage(error, '请求失败，请稍后重试。')
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
    RESUME_OPTIMIZE: `${skill} 简历证据优化`,
    STUDY_TASK: `${skill} 学习任务`,
    REPORT_REVIEW: '面试报告复盘',
    SKILL_REVIEW: `${skill} 核心概念复习`,
    KNOWLEDGE_REVIEW: `${skill} 个人知识复盘`
  }
  return map[task.taskType || ''] || cleanUserText(task.title, `Agent 任务 #${task.id}`)
}

const displayTaskDescription = (task: AgentTaskVO) => {
  const map: Record<string, string> = {
    QUESTION_PRACTICE: '完成一组聚焦题目练习，并记录薄弱点。',
    WRONG_QUESTION_REVIEW: '复盘历史错题，确认相关知识点是否已经掌握。',
    INTERVIEW: '围绕目标岗位进行项目深挖和技术追问练习。',
    RESUME_OPTIMIZE: '检查项目经历是否清楚证明目标技能和业务影响。',
    STUDY_TASK: '完成学习计划中的阶段任务。',
    REPORT_REVIEW: '复盘报告结论，提炼下一步改进动作。',
    SKILL_REVIEW: '梳理概念、应用场景、常见误区和项目表达。',
    KNOWLEDGE_REVIEW: '从个人知识库中提取可复用的项目例子和面试表达。'
  }
  return map[task.taskType || ''] || cleanUserText(task.description, '暂无任务描述')
}

const displayTaskReason = (task: AgentTaskVO) => cleanUserText(task.reason, '')

const formatTargetOption = (target: TargetJobVO) => {
  const title = target.jobTitle || `岗位 #${target.id}`
  const company = target.companyName || '未填写公司'
  const current = target.currentFlag === 1 ? ' · 当前' : ''
  return `${title} · ${company}${current}`
}

const loadJobTargets = async () => {
  if (targetLoading.value) return
  targetLoading.value = true
  targetLoadError.value = ''
  try {
    const [list, current] = await Promise.all([
      getJobTargetsApi({ pageNo: 1, pageSize: 50 }),
      getCurrentJobTargetApi().catch(() => null)
    ])
    targets.value = list || []
    currentTarget.value = current || null
  } catch (error) {
    targets.value = []
    currentTarget.value = null
    targetLoadError.value = getErrorMessage(error) || '岗位目标列表暂时加载失败，不选择时仍会按当前主目标生成。'
  } finally {
    targetLoading.value = false
  }
}

const loadPage = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = {
      date: queryDate.value,
      targetJobId: currentTargetJobId.value
    }
    const [latestPlan, tasks] = await Promise.all([
      getLatestDailyPlanApi(params),
      getTodayAgentTasksApi(params)
    ])
    plan.value = latestPlan
    todayTasks.value = tasks
  } catch (error) {
    plan.value = undefined
    todayTasks.value = undefined
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const openGenerateDialog = () => {
  generateForm.date = queryDate.value
  generateForm.targetJobId = currentTargetJobId.value
  generateDialogVisible.value = true
  if (!targets.value.length) {
    void loadJobTargets()
  }
}

const handleGenerate = async () => {
  if (generateForm.forceRegenerate && plan.value?.runId) {
    try {
      await ElMessageBox.confirm(
        '强制重新生成会重新创建当天计划，并刷新当前任务视图。请确认已有任务状态和反馈已经记录。',
        '重新生成今日计划',
        { type: 'warning', confirmButtonText: '确认重新生成', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  generating.value = true
  errorMessage.value = ''
  try {
    plan.value = await generateDailyPlanApi({
      ...generateForm,
      targetJobId: generateForm.targetJobId || undefined
    })
    currentTargetJobId.value = generateForm.targetJobId || undefined
    queryDate.value = generateForm.date
    generateDialogVisible.value = false
    ElMessage.success('今日计划已生成')
    await loadPage()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
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
    } else {
      await skipAgentTaskApi(task.id, { skipReason: taskNote.value || undefined })
      ElMessage.success('任务已跳过')
    }
    taskDialogVisible.value = false
    await loadPage()
  })
}

const handleStartTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'start', async () => {
    await startAgentTaskApi(task.id)
    ElMessage.success('任务已开始')
    await loadPage()
  })
}

const handleRestoreTask = async (task: AgentTaskVO) => {
  await withTaskPending(task, 'restore', async () => {
    await restoreAgentTaskApi(task.id)
    ElMessage.success('任务已恢复')
    await loadPage()
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
      agentRunId: task.agentRunId,
      feedbackType: feedbackForm.feedbackType,
      comment: feedbackForm.comment || undefined
    })
    feedbackDialogVisible.value = false
    ElMessage.success('反馈已提交')
  })
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
  void loadPage()
})
</script>

<style scoped lang="scss">
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
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius);
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.16), rgba(6, 182, 212, 0.08)), var(--app-surface);
  box-shadow: var(--app-shadow);
}

.agent-eyebrow,
.agent-hero__actions,
.task-meta,
.task-actions,
.skill-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.agent-eyebrow {
  color: #a5b4fc;
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
  font-size: 28px;
}

.agent-hero p,
.section-head span,
.plan-summary,
.agent-task-card p {
  color: var(--app-text-muted);
  line-height: 1.7;
}

.agent-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.agent-metric,
.agent-task-card {
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.58);
}

.agent-metric {
  padding: 16px;
}

.agent-metric span,
.section-kicker {
  color: var(--app-text-muted);
  font-size: 13px;
}

.agent-metric strong {
  display: block;
  margin-top: 8px;
  font-size: 26px;
}

.section-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-kicker {
  margin: 0 0 6px;
  text-transform: uppercase;
}

.plan-panel {
  min-height: 220px;
}

.plan-status-alert {
  margin-bottom: 16px;
}

.plan-summary {
  margin: 18px 0 0;
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
}

.task-title-row {
  align-items: flex-start;
  justify-content: space-between;
}

.agent-task-card h3 {
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
}

.task-meta span {
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: var(--app-text-muted);
  font-size: 12px;
}

.task-reason {
  margin-bottom: 0;
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
  color: var(--app-text-muted);
  font-size: 12px;
  line-height: 1.6;
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
  .agent-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
