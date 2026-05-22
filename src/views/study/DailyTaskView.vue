<template>
  <div class="daily-task-page page-shell">
    <section class="page-hero">
      <div>
        <div class="eyebrow">Daily Tasks</div>
        <h1>每日任务</h1>
        <p>按学习计划读取真实 daily-view，支持完成、跳过和学习记录提交。</p>
      </div>
      <div class="hero-actions">
        <el-date-picker v-model="selectedDate" type="date" value-format="YYYY-MM-DD" :clearable="false" @change="loadDailyView" />
        <el-button :loading="loading" @click="loadDailyView">刷新</el-button>
      </div>
    </section>

    <div class="daily-layout">
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Plans</p>
              <h2>选择学习计划</h2>
            </div>
            <el-button text @click="router.push('/study-plans')">学习计划</el-button>
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
              <strong>{{ plan.planTitle || `学习计划 #${plan.id}` }}</strong>
              <span>{{ plan.doneTaskCount || 0 }}/{{ plan.totalTaskCount || 0 }} 已完成</span>
            </button>
            <AppState v-if="!plansLoading && !plans.length" type="empty" title="暂无学习计划" description="可以先从面试报告或能力短板生成学习计划。">
              <el-button type="primary" @click="router.push('/study-plans')">创建学习计划</el-button>
              <el-button @click="router.push('/skill-profile')">查看能力画像</el-button>
            </AppState>
          </div>
        </div>
      </section>

      <section class="content-card daily-main">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Today</p>
              <h2>{{ dailyView?.planTitle || '每日任务视图' }}</h2>
            </div>
            <el-button type="primary" :loading="checkingIn" :disabled="!selectedPlanId" @click="handleCheckin">今日打卡</el-button>
          </div>

          <AppState v-if="loadError" type="error" title="任务加载失败" :description="loadError">
            <el-button type="primary" @click="loadDailyView">重试</el-button>
          </AppState>
          <AppState v-else-if="!selectedPlanId" type="empty" title="请选择学习计划" description="选择左侧计划后查看对应日期的任务。">
            <el-button type="primary" @click="router.push('/study-plans')">学习计划</el-button>
          </AppState>
          <div v-else v-loading="loading">
            <div class="metric-grid">
              <div class="metric"><span>总任务</span><strong>{{ dailyView?.totalTaskCount ?? 0 }}</strong></div>
              <div class="metric"><span>已完成</span><strong>{{ dailyView?.completedTaskCount ?? 0 }}</strong></div>
              <div class="metric"><span>待完成</span><strong>{{ dailyView?.pendingTaskCount ?? 0 }}</strong></div>
              <div class="metric"><span>完成率</span><strong>{{ dailyView?.completionRate ?? 0 }}%</strong></div>
            </div>

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
                  <span v-if="task.taskType">{{ task.taskType }}</span>
                  <span v-if="task.estimatedHours">{{ task.estimatedHours }} 小时</span>
                </div>
                <div class="task-actions">
                  <el-button size="small" type="success" plain :disabled="isDone(task.taskStatus)" @click="changeTask(task.id, 'complete')">完成</el-button>
                  <el-button size="small" plain :disabled="task.taskStatus === 'SKIPPED'" @click="changeTask(task.id, 'skip')">跳过</el-button>
                </div>
              </article>
              <AppState v-if="!tasks.length" type="empty" title="当日暂无任务" description="可切换日期或到学习计划详情查看全部任务。">
                <el-button @click="router.push('/study-plans')">查看学习计划</el-button>
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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { checkinApi, completeTaskApi, skipTaskApi } from '@/api/dailyTask'
import { getStudyPlanDailyViewApi, getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type { StudyPlanDailyViewVO, StudyPlanListVO, StudyTaskStatus } from '@/types/studyPlan'

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

const tasks = computed(() => dailyView.value?.tasks || [])

const loadPlans = async () => {
  plansLoading.value = true
  try {
    const page = await getStudyPlansApi({ pageNo: 1, pageSize: 50, planStatus: 'ACTIVE' })
    plans.value = page.records || []
    selectedPlanId.value ||= plans.value[0]?.id
    if (selectedPlanId.value) await loadDailyView()
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
    dailyView.value = await getStudyPlanDailyViewApi(selectedPlanId.value, selectedDate.value)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '接口请求失败'
  } finally {
    loading.value = false
  }
}

const changeTask = async (taskId: number, action: 'complete' | 'skip') => {
  if (action === 'complete') {
    await completeTaskApi(taskId)
    ElMessage.success('已标记完成')
  } else {
    await skipTaskApi(taskId)
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
  return map[String(status).toUpperCase()] || String(status)
}

onMounted(loadPlans)
</script>

<style scoped lang="scss">
.page-hero,
.section-head,
.task-card__head,
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-hero {
  margin-bottom: 18px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 6px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.page-hero h1,
.section-head h2,
.task-card h3 {
  margin: 0;
}

.page-hero p,
.task-card p,
.plan-item span {
  color: var(--app-text-muted);
}

.daily-layout {
  display: grid;
  grid-template-columns: minmax(260px, 340px) 1fr;
  gap: 18px;
}

.plan-list,
.task-list {
  display: grid;
  gap: 12px;
}

.plan-item {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.55);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
}

.plan-item.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.metric span {
  display: block;
  color: var(--app-text-muted);
}

.metric strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
}

.task-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
}

.task-card__head span,
.task-meta span {
  color: var(--app-text-muted);
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
  background: rgba(148, 163, 184, 0.12);
}

@media (max-width: 900px) {
  .daily-layout,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .page-hero,
  .section-head,
  .hero-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
