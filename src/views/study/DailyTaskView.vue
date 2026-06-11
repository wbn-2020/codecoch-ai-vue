<template>
  <div class="daily-task-page page-shell">
    <section class="daily-hero">
      <div class="hero-copy">
        <div class="eyebrow">
          <CalendarCheck :size="16" />
          今日训练节奏
        </div>
        <h1>跟着路线推进今天这一小步</h1>
        <p>每日任务来自你的学习计划，你可以切换日期、完成或跳过任务，并把当天训练记录沉淀下来。</p>
        <div class="hero-actions">
          <el-date-picker v-model="selectedDate" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="loadDailyView" />
          <el-button :loading="loading || retryingDailyView" @click="loadDailyView">
            <RefreshCw :size="16" />
            刷新任务
          </el-button>
          <el-button type="primary" :loading="checkingIn" :disabled="!selectedPlanId" @click="handleCheckin">
            <CheckCircle2 :size="16" />
            今日打卡
          </el-button>
        </div>
      </div>

      <aside class="hero-summary">
        <span>当前路线</span>
        <strong>{{ selectedPlan?.planTitle || dailyView?.planTitle || '待选择学习计划' }}</strong>
        <p>{{ selectedDateLabel }}</p>
        <el-progress :percentage="dailyView?.completionRate ?? 0" :show-text="false" />
      </aside>
    </section>

    <div class="daily-layout">
      <aside class="content-card plan-rail">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">训练路线</p>
              <h2>选择今天跟哪条路线练</h2>
            </div>
            <el-button text @click="router.push('/study-plans')">
              全部路线
              <ChevronRight :size="15" />
            </el-button>
          </div>

          <div v-loading="plansLoading" class="plan-list">
            <button
              v-for="plan in plans"
              :key="plan.id"
              class="plan-item"
              :class="{ active: selectedPlanId === plan.id }"
              type="button"
              @click="selectPlan(plan.id)"
            >
              <span class="plan-title">
                <RouteIcon :size="16" />
                <strong>{{ plan.planTitle || '学习计划' }}</strong>
              </span>
              <span>{{ plan.doneTaskCount || 0 }}/{{ plan.totalTaskCount || 0 }} 已完成</span>
            </button>
            <AppState v-if="plansError" type="error" title="学习计划加载失败" :description="plansError">
              <el-button type="primary" :loading="plansLoading" @click="loadPlans">重试</el-button>
            </AppState>
            <AppState v-else-if="!plansLoading && !plans.length" type="empty" title="暂无学习计划" description="可以先从面试报告或能力短板生成学习计划。">
              <el-button type="primary" @click="router.push('/study-plans')">生成训练路线</el-button>
              <el-button @click="router.push('/skill-profile')">查看能力画像</el-button>
            </AppState>
          </div>
        </div>
      </aside>

      <section class="content-card daily-main">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">当天任务</p>
              <h2>{{ dailyView?.planTitle || selectedPlan?.planTitle || '请选择一条训练路线' }}</h2>
              <span>{{ selectedDateLabel }}</span>
            </div>
            <el-button text @click="router.push('/dashboard')">回到今日计划</el-button>
          </div>

          <AppState v-if="loadError" type="error" title="任务加载失败" :description="loadError">
            <el-button type="primary" :loading="loading || retryingDailyView" @click="loadDailyView">重试</el-button>
          </AppState>
          <AppState v-else-if="!selectedPlanId" type="empty" title="请选择学习计划" description="选择一条训练路线后，再查看对应日期的真实任务。">
            <el-button type="primary" @click="router.push('/study-plans')">生成训练路线</el-button>
          </AppState>

          <div v-else v-loading="loading" class="daily-content">
            <div class="metric-grid">
              <div class="metric"><span>总任务</span><strong>{{ dailyView?.totalTaskCount ?? 0 }}</strong></div>
              <div class="metric is-success"><span>已完成</span><strong>{{ dailyView?.completedTaskCount ?? 0 }}</strong></div>
              <div class="metric is-warning"><span>待完成</span><strong>{{ dailyView?.pendingTaskCount ?? 0 }}</strong></div>
              <div class="metric is-primary"><span>完成率</span><strong>{{ dailyView?.completionRate ?? 0 }}%</strong></div>
            </div>

            <article v-if="focusTask" class="focus-task">
              <div>
                <span>优先推进</span>
                <h3>{{ focusTask.taskTitle || '未命名任务' }}</h3>
                <p>{{ focusTask.taskDescription || '暂无任务描述' }}</p>
              </div>
              <div class="focus-task__meta">
                <el-tag :type="taskStatusType(focusTask.taskStatus)" effect="plain">{{ taskStatusText(focusTask.taskStatus) }}</el-tag>
                <span v-if="focusTask.estimatedHours">
                  <Clock3 :size="14" />
                  {{ focusTask.estimatedHours }} 小时
                </span>
              </div>
            </article>

            <div class="task-list">
              <article v-for="task in tasks" :key="task.id" class="task-card">
                <div class="task-card__head">
                  <div>
                    <span>{{ task.stageTitle || `阶段 ${task.stageNo || '-'}` }}</span>
                    <h3>{{ task.taskTitle || '未命名任务' }}</h3>
                  </div>
                  <el-tag :type="taskStatusType(task.taskStatus)" effect="plain">{{ taskStatusText(task.taskStatus) }}</el-tag>
                </div>
                <p>{{ task.taskDescription || '暂无任务描述' }}</p>
                <div class="task-meta">
                  <span v-if="task.knowledgePoint">{{ task.knowledgePoint }}</span>
                  <span v-if="task.taskType">{{ taskTypeText(task.taskType) }}</span>
                  <span v-if="task.estimatedHours">{{ task.estimatedHours }} 小时</span>
                </div>
                <div class="task-actions">
                  <el-button size="small" type="success" plain :disabled="isDone(task.taskStatus)" @click="changeTask(task, 'complete')">完成</el-button>
                  <el-button size="small" plain :disabled="task.taskStatus === 'SKIPPED'" @click="changeTask(task, 'skip')">跳过</el-button>
                </div>
              </article>
              <AppState v-if="!tasks.length" type="empty" title="当日暂无任务" description="可以切换日期，或到训练路线详情查看后续任务。">
                <el-button @click="router.push('/study-plans')">查看训练路线</el-button>
              </AppState>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  Route as RouteIcon
} from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { checkinApi, completeTaskApi, skipTaskApi } from '@/api/dailyTask'
import { getStudyPlanDailyViewApi, getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type { StudyPlanDailyViewVO, StudyPlanListVO, StudyTaskStatus, StudyTaskVO } from '@/types/studyPlan'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

const router = useRouter()
const today = new Date().toISOString().slice(0, 10)

const plans = ref<StudyPlanListVO[]>([])
const selectedPlanId = ref<number>()
const selectedDate = ref(today)
const dailyView = ref<StudyPlanDailyViewVO>()
const plansLoading = ref(false)
const loading = ref(false)
const checkingIn = ref(false)
const loadError = ref('')
const plansError = ref('')
const retryingDailyView = ref(false)

const tasks = computed(() => dailyView.value?.tasks || [])
const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value))
const selectedDateLabel = computed(() => `${selectedDate.value} 的训练安排`)
const focusTask = computed(() =>
  tasks.value.find((task) => !['DONE', 'COMPLETED', 'SKIPPED'].includes(String(task.taskStatus).toUpperCase())) || tasks.value[0]
)

const loadPlans = async () => {
  plansLoading.value = true
  plansError.value = ''
  try {
    const page = await getStudyPlansApi({ pageNo: 1, pageSize: 50, planStatus: 'ACTIVE' })
    plans.value = page.records || []
    selectedPlanId.value ||= plans.value[0]?.id
    if (selectedPlanId.value) await loadDailyView()
  } catch (error) {
    plans.value = []
    plansError.value = getErrorMessage(error, '学习计划暂时加载失败，请稍后重试。')
  } finally {
    plansLoading.value = false
  }
}

const selectPlan = async (planId: number) => {
  selectedPlanId.value = planId
  await loadDailyView()
}

const loadDailyView = async () => {
  if (!selectedPlanId.value) return
  loading.value = true
  loadError.value = ''
  try {
    dailyView.value = await loadDailyViewWithRetry(selectedPlanId.value, selectedDate.value)
  } catch (error) {
    const status = getHttpStatus(error)
    if (status === 503) {
      loadError.value = '每日任务服务繁忙或任务正在生成，已自动重试一次；请稍后再试。'
    } else if (status === 500) {
      loadError.value = '每日任务暂时不可用，已自动重试一次；请稍后再试。'
    } else {
      loadError.value = getErrorMessage(error, '每日任务暂时加载失败，请稍后重试。')
    }
  } finally {
    retryingDailyView.value = false
    loading.value = false
  }
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

const getHttpStatus = (error: unknown) => {
  const status = (error as { response?: { status?: number } })?.response?.status
  return typeof status === 'number' ? status : 0
}

const loadDailyViewWithRetry = async (planId: number, date: string) => {
  try {
    return await getStudyPlanDailyViewApi(planId, date)
  } catch (error) {
    if (![500, 503].includes(getHttpStatus(error))) throw error
    retryingDailyView.value = true
    try {
      await sleep(600)
      return await getStudyPlanDailyViewApi(planId, date)
    } finally {
      retryingDailyView.value = false
    }
  }
}

const changeTask = async (task: StudyTaskVO, action: 'complete' | 'skip') => {
  if (action === 'complete') {
    await completeTaskApi(task.id)
    ElMessage.success('已标记完成')
  } else {
    const confirmed = await confirmDangerActionPreview({
      title: '跳过每日任务',
      action: '把这条每日训练任务标记为跳过',
      target: task.taskTitle || task.taskDescription || `训练任务 ${task.id}`,
      impact: '这条任务会从当天待办中移出，今日完成率和训练路线进度会按跳过状态重新计算。',
      rollback: '如果只是暂时不做，可以先保留待办；误跳过后可回到训练路线详情重新调整或重新生成路线。',
      audit: '任务状态变更会保留在当日训练记录里，后续复盘会看到它曾被跳过。',
      tips: ['确认今天确实不准备继续推进这条任务。', '如果任务太大，优先拆小或改到后续日期。'],
      confirmButtonText: '确认跳过'
    })
    if (!confirmed) return
    await skipTaskApi(task.id)
    ElMessage.success('已跳过任务')
  }
  await loadDailyView()
}

const handleCheckin = async () => {
  checkingIn.value = true
  try {
    await checkinApi(selectedPlanId.value ? { planId: selectedPlanId.value } : undefined)
    ElMessage.success('打卡成功')
  } finally {
    checkingIn.value = false
  }
}

const isDone = (status: StudyTaskStatus) => ['DONE', 'COMPLETED'].includes(String(status).toUpperCase())
const taskStatusType = (status: StudyTaskStatus) => {
  const value = String(status).toUpperCase()
  if (isDone(value)) return 'success'
  if (value === 'SKIPPED') return 'info'
  if (value === 'DOING') return 'warning'
  return 'primary'
}
const taskStatusText = (status: StudyTaskStatus) => {
  const map: Record<string, string> = { TODO: '待完成', DOING: '进行中', DONE: '已完成', COMPLETED: '已完成', SKIPPED: '已跳过' }
  return map[String(status).toUpperCase()] || '状态待确认'
}

const taskTypeText = (value?: string) => {
  const map: Record<string, string> = {
    PROJECT: '项目表达',
    INTERVIEW: '模拟面试',
    ALGORITHM: '算法训练',
    KNOWLEDGE: '知识巩固',
    RESUME: '简历优化',
    REVIEW: '复盘整理',
    PRACTICE: '专项练习'
  }
  return map[String(value || '').toUpperCase()] || '训练任务'
}

onMounted(loadPlans)
</script>

<style scoped lang="scss">
.daily-task-page {
  display: grid;
  gap: 18px;
  color: var(--app-text);
}

.daily-hero,
.content-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.daily-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 18px;
  padding: 24px;
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(240, 253, 250, 0.9)),
    #ffffff;
}

.hero-copy h1 {
  max-width: 720px;
  margin: 8px 0;
  color: #172033;
  font-size: 30px;
  line-height: 1.18;
}

.hero-copy p {
  max-width: 740px;
  margin: 0;
  color: #64748b;
  line-height: 1.65;
}

.eyebrow,
.hero-actions,
.section-head,
.task-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.eyebrow,
.section-kicker {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

.hero-summary {
  display: grid;
  align-content: center;
  gap: 10px;
  padding: 18px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.hero-summary span,
.hero-summary p,
.task-card p,
.plan-item span,
.section-head span {
  color: #64748b;
}

.hero-summary strong {
  color: #172033;
  font-size: 20px;
  line-height: 1.25;
}

.daily-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  gap: 18px;
}

.content-card__body {
  padding: 20px;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 16px;

  h2 {
    margin: 4px 0 0;
    color: #172033;
    font-size: 18px;
  }

  p {
    margin: 0;
  }
}

.section-kicker {
  margin: 0;
  font-size: 11px;
}

.plan-list,
.task-list {
  display: grid;
  gap: 12px;
}

.plan-item {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease;
}

.plan-item:hover,
.plan-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.plan-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.daily-content {
  min-height: 360px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;

  span {
    display: block;
    color: #64748b;
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: #172033;
    font-size: 24px;
  }

  &.is-success strong {
    color: #15803d;
  }

  &.is-warning strong {
    color: #b45309;
  }

  &.is-primary strong {
    color: #2563eb;
  }
}

.focus-task {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
  }

  h3 {
    margin: 6px 0;
    color: #172033;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #475569;
    line-height: 1.6;
  }
}

.focus-task__meta {
  display: grid;
  justify-items: end;
  gap: 8px;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-weight: 500;
  }
}

.task-card {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;

  h3 {
    margin: 4px 0 0;
    color: #172033;
    font-size: 16px;
  }
}

.task-card__head {
  justify-content: space-between;
}

.task-card__head span,
.task-meta span {
  color: #64748b;
  font-size: 12px;
}

.task-meta,
.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.task-meta span {
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f5f9;
}

@media (max-width: 900px) {
  .daily-hero,
  .daily-layout,
  .metric-grid,
  .focus-task {
    grid-template-columns: 1fr;
  }

  .section-head,
  .hero-actions,
  .task-card__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions,
  .hero-actions :deep(.el-date-editor) {
    width: 100%;
  }

  .focus-task__meta {
    justify-items: start;
  }
}
</style>
