<template>
  <div class="study-plan-page page-shell">
    <section class="study-hero">
      <div>
        <div class="eyebrow">
          <Route :size="16" />
          Learning Plan
        </div>
        <h1>AI 学习计划</h1>
        <p>基于真实面试报告生成阶段化训练计划，任务状态与计划详情均来自后端学习计划接口。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="fetchPlans">
          <RefreshCcw :size="16" />
          刷新列表
        </el-button>
        <el-button type="primary" @click="router.push('/interviews/history')">
          <History :size="16" />
          面试报告
        </el-button>
      </div>
    </section>

    <section class="content-card generate-card">
      <div class="content-card__body">
        <div class="section-head">
          <div>
            <p class="section-kicker">Generate</p>
            <h2>生成配置</h2>
          </div>
          <el-tag effect="plain" type="success">真实接口</el-tag>
        </div>

        <el-form class="generate-form" :model="generateForm" label-position="top">
          <el-form-item label="报告 ID">
            <el-input-number v-model="generateForm.reportId" :min="1" :precision="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="目标岗位">
            <el-input v-model="generateForm.targetPosition" placeholder="例如：Java 后端开发工程师" clearable />
          </el-form-item>
          <el-form-item label="行业方向">
            <el-input v-model="generateForm.industryDirection" placeholder="例如：电商 / 金融 / SaaS" clearable />
          </el-form-item>
          <el-form-item label="计划周期">
            <el-select v-model="generateForm.expectedDurationDays">
              <el-option label="7 天" :value="7" />
              <el-option label="14 天" :value="14" />
              <el-option label="30 天" :value="30" />
            </el-select>
          </el-form-item>
          <el-form-item class="form-wide" label="补充要求">
            <el-input
              v-model="generateForm.extraRequirements"
              type="textarea"
              :rows="3"
              maxlength="300"
              show-word-limit
              placeholder="可选：补充希望强化的知识点或复习节奏"
            />
          </el-form-item>
          <el-form-item class="form-actions">
            <el-button type="primary" :loading="generating" :disabled="!generateForm.reportId" @click="handleGenerate">
              <Sparkles :size="16" />
              生成学习计划
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="streamStatus" class="stream-panel">
          <div class="stream-panel__head">
            <span>{{ streamStatus }}</span>
            <el-button v-if="generating" link type="warning" @click="cancelStream">取消</el-button>
          </div>
          <pre>{{ streamContent || '等待流式事件返回...' }}</pre>
        </div>
      </div>
    </section>

    <div class="study-layout">
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">Plans</p>
              <h2>学习计划列表</h2>
            </div>
            <el-select v-model="query.planStatus" class="status-filter" placeholder="全部状态" clearable @change="fetchPlans">
              <el-option label="生成中" value="GENERATING" />
              <el-option label="进行中" value="ACTIVE" />
              <el-option label="失败" value="FAILED" />
              <el-option label="归档" value="ARCHIVED" />
            </el-select>
          </div>

          <div v-loading="listLoading" class="plan-list">
            <template v-if="plans.length">
              <button
                v-for="plan in plans"
                :key="plan.id"
                class="plan-item"
                type="button"
                :class="{ 'is-active': selectedPlan?.id === plan.id }"
                @click="selectPlan(plan.id)"
              >
                <span class="plan-item__main">
                  <strong>{{ plan.planTitle || `学习计划 #${plan.id}` }}</strong>
                  <span>{{ plan.targetPosition || '未设置目标岗位' }}</span>
                </span>
                <span class="plan-item__meta">
                  <el-tag size="small" :type="statusType(plan.planStatus)" effect="plain">
                    {{ statusText(plan.planStatus) }}
                  </el-tag>
                  <span>{{ plan.doneTaskCount || 0 }}/{{ plan.totalTaskCount || 0 }}</span>
                </span>
              </button>
            </template>
            <el-empty v-else description="暂无学习计划，先从面试报告生成一份真实计划" />
          </div>

          <el-pagination
            v-if="pagination.total > pagination.pageSize"
            background
            layout="prev, pager, next"
            :current-page="query.pageNo"
            :page-size="query.pageSize"
            :total="pagination.total"
            @current-change="handlePageChange"
          />
        </div>
      </section>

      <section class="content-card detail-card">
        <div class="content-card__body">
          <template v-if="selectedPlan">
            <div class="detail-head">
              <div>
                <p class="section-kicker">Detail</p>
                <h2>{{ selectedPlan.planTitle || `学习计划 #${selectedPlan.id}` }}</h2>
                <p>{{ selectedPlan.planSummary || '后端暂未返回计划摘要' }}</p>
              </div>
              <el-tag :type="statusType(selectedPlan.planStatus)" effect="plain">
                {{ statusText(selectedPlan.planStatus) }}
              </el-tag>
            </div>

            <div v-if="selectedPlan.planStatus === 'GENERATING'" class="status-panel">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <span>学习计划生成中，可等待自动刷新或手动刷新列表。</span>
            </div>
            <el-alert
              v-else-if="selectedPlan.planStatus === 'FAILED'"
              type="error"
              show-icon
              :closable="false"
              title="学习计划生成失败"
              :description="selectedPlan.failureReason || '请稍后重试或返回报告重新生成'"
            />

            <div class="progress-row">
              <span>任务进度</span>
              <el-progress :percentage="selectedPlan.progressPercent || 0" :stroke-width="10" />
            </div>

            <div class="task-list" v-loading="detailLoading">
              <template v-if="tasks.length">
                <article v-for="task in tasks" :key="task.id" class="task-item">
                  <div class="task-head">
                    <div>
                      <span class="task-stage">{{ task.stageTitle || `阶段 ${task.stageNo || '-'}` }}</span>
                      <h3>{{ task.taskTitle }}</h3>
                    </div>
                    <el-tag size="small" :type="taskStatusType(task.taskStatus)" effect="plain">
                      {{ taskStatusText(task.taskStatus) }}
                    </el-tag>
                  </div>
                  <p>{{ task.taskDescription || '暂无任务描述' }}</p>
                  <div class="task-tags">
                    <span v-if="task.knowledgePoint">{{ task.knowledgePoint }}</span>
                    <span v-if="task.priority">{{ priorityText(task.priority) }}</span>
                    <span v-if="task.estimatedHours">{{ task.estimatedHours }}h</span>
                    <span v-for="tag in task.relatedTags || []" :key="tag">{{ tag }}</span>
                  </div>
                  <div class="task-actions">
                    <el-button size="small" :disabled="task.taskStatus === 'DOING'" @click="updateTask(task.id, 'DOING')">
                      进行中
                    </el-button>
                    <el-button size="small" type="success" plain @click="completeTask(task.id)">完成</el-button>
                    <el-button size="small" plain @click="skipTask(task.id)">跳过</el-button>
                  </div>
                </article>
              </template>
              <el-empty v-else description="当前计划暂无任务明细" />
            </div>
          </template>

          <el-empty v-else description="请选择左侧学习计划查看详情" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { History, RefreshCcw, Route, Sparkles } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  generateStudyPlanApi,
  getStudyPlanDetailApi,
  getStudyPlansApi,
  streamStudyPlanGenerateApi,
  updateStudyTaskStatusApi
} from '@/api/studyPlan'
import type {
  SseEventVO,
  StudyPlanDetailVO,
  StudyPlanGenerateDTO,
  StudyPlanListVO,
  StudyPlanQueryDTO,
  StudyTaskStatus,
  StudyTaskVO
} from '@/types/studyPlan'

const route = useRoute()
const router = useRouter()

const listLoading = ref(false)
const detailLoading = ref(false)
const generating = ref(false)
const plans = ref<StudyPlanListVO[]>([])
const selectedPlan = ref<StudyPlanDetailVO | null>(null)
const tasks = ref<StudyTaskVO[]>([])
const pollCount = ref(0)
const streamContent = ref('')
const streamStatus = ref('')
let streamController: AbortController | undefined
let pollTimer: number | undefined

const query = reactive<StudyPlanQueryDTO>({
  pageNo: 1,
  pageSize: 8,
  planStatus: ''
})
const pagination = reactive({
  total: 0,
  pageSize: 8
})
const generateForm = reactive<StudyPlanGenerateDTO>({
  reportId: Number(route.query.reportId || 0) || 0,
  targetPosition: '',
  industryDirection: '',
  expectedDurationDays: 14,
  extraRequirements: ''
})

const selectedPlanId = computed(() => {
  const id = Number(route.query.planId || route.query.id || 0)
  return Number.isFinite(id) && id > 0 ? id : 0
})

const clearPoll = () => {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
}

const schedulePlanPoll = () => {
  clearPoll()
  if (!selectedPlan.value || selectedPlan.value.planStatus !== 'GENERATING') return
  if (pollCount.value >= 30) {
    ElMessage.warning('学习计划生成时间较长，请稍后手动刷新')
    return
  }
  pollTimer = window.setTimeout(async () => {
    pollCount.value += 1
    await selectPlan(selectedPlan.value?.id || 0, false)
  }, 2000)
}

const fetchPlans = async () => {
  listLoading.value = true
  try {
    const page = await getStudyPlansApi(query)
    plans.value = page.records
    pagination.total = page.total
    pagination.pageSize = page.pageSize
    const nextId = selectedPlanId.value || selectedPlan.value?.id || plans.value[0]?.id
    if (nextId) {
      await selectPlan(nextId, false)
    } else {
      selectedPlan.value = null
      tasks.value = []
    }
  } finally {
    listLoading.value = false
  }
}

const selectPlan = async (id: number, updateRoute = true) => {
  if (!id) return
  detailLoading.value = true
  try {
    const detail = await getStudyPlanDetailApi(id)
    selectedPlan.value = detail
    tasks.value = detail.tasks || []
    if (updateRoute) {
      await router.replace({ path: '/study-plans', query: { planId: String(id) } })
    }
    if (detail.planStatus === 'GENERATING') {
      schedulePlanPoll()
    } else {
      clearPoll()
    }
  } finally {
    detailLoading.value = false
  }
}

const handlePageChange = (pageNo: number) => {
  query.pageNo = pageNo
  fetchPlans()
}

const handleGenerate = async () => {
  if (!generateForm.reportId) {
    ElMessage.warning('请先填写真实报告 ID')
    return
  }
  generating.value = true
  streamContent.value = ''
  streamStatus.value = '正在建立学习计划 SSE 连接'
  let streamStarted = false
  let streamPlanId = 0
  try {
    const payload = {
      ...generateForm,
      targetPosition: generateForm.targetPosition || undefined,
      industryDirection: generateForm.industryDirection || undefined,
      extraRequirements: generateForm.extraRequirements || undefined
    }
    streamController = new AbortController()
    await streamStudyPlanGenerateApi(
      payload,
      {
        onEvent: (event, data) => {
          if (event === 'start') {
            streamStarted = true
            streamStatus.value = data?.message || '学习计划流式生成中'
          }
          if (event === 'metadata') {
            streamPlanId = resolveStreamPlanId(data) || streamPlanId
          }
          if (event === 'done') {
            streamStatus.value = '学习计划流式生成完成'
          }
        },
        onChunk: (content) => {
          streamContent.value += content
        }
      },
      streamController.signal
    )
    const result = {
      planId: streamPlanId,
      planStatus: 'ACTIVE'
    }
    ElMessage.success('学习计划已通过 SSE 生成')
    if (result.planId) {
      pollCount.value = 0
      await router.replace({ path: '/study-plans', query: { planId: String(result.planId) } })
      await fetchPlans()
      await selectPlan(result.planId, false)
    } else {
      await fetchPlans()
    }
  } catch (error) {
    if (streamController?.signal.aborted) {
      ElMessage.warning('已取消学习计划流式生成')
      return
    }
    if (streamStarted) {
      streamStatus.value = 'SSE 生成失败，请刷新后查看是否已有生成结果'
      ElMessage.error(error instanceof Error ? error.message : 'SSE 生成失败')
      await fetchPlans()
      return
    }
    streamStatus.value = 'SSE 连接失败，已回退到同步生成接口'
    const result = await generateStudyPlanApi({
      ...generateForm,
      targetPosition: generateForm.targetPosition || undefined,
      industryDirection: generateForm.industryDirection || undefined,
      extraRequirements: generateForm.extraRequirements || undefined
    })
    ElMessage.success(result.planStatus === 'FAILED' ? '学习计划任务已返回失败状态' : '学习计划已提交生成')
    if (result.planId) {
      pollCount.value = 0
      await router.replace({ path: '/study-plans', query: { planId: String(result.planId) } })
      await fetchPlans()
      await selectPlan(result.planId, false)
    } else {
      await fetchPlans()
    }
  } finally {
    generating.value = false
    streamController = undefined
  }
}

const resolveStreamPlanId = (event?: SseEventVO) => {
  const result = event?.result && typeof event.result === 'object' ? event.result : {}
  const value = event?.metadata?.planId || event?.planId || ('planId' in result ? result.planId : undefined)
  const id = Number(value || 0)
  return Number.isFinite(id) && id > 0 ? id : 0
}

const cancelStream = () => {
  streamController?.abort()
  streamController = undefined
}

const refreshSelectedPlan = async () => {
  if (selectedPlan.value?.id) {
    await selectPlan(selectedPlan.value.id, false)
    await fetchPlans()
  }
}

const updateTask = async (taskId: number, taskStatus: StudyTaskStatus) => {
  await updateStudyTaskStatusApi(taskId, taskStatus)
  ElMessage.success('任务状态已更新')
  await refreshSelectedPlan()
}

const completeTask = async (taskId: number) => {
  await updateStudyTaskStatusApi(taskId, 'COMPLETED')
  ElMessage.success('任务已完成')
  await refreshSelectedPlan()
}

const skipTask = async (taskId: number) => {
  await updateStudyTaskStatusApi(taskId, 'SKIPPED')
  ElMessage.success('任务已跳过')
  await refreshSelectedPlan()
}

const statusText = (status?: string) => {
  const map: Record<string, string> = {
    GENERATING: '生成中',
    ACTIVE: '进行中',
    FAILED: '失败',
    ARCHIVED: '已归档'
  }
  return map[String(status || '').toUpperCase()] || status || '未知'
}

const statusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'ACTIVE') return 'success'
  if (value === 'FAILED') return 'danger'
  if (value === 'GENERATING') return 'warning'
  return 'info'
}

const taskStatusText = (status?: string) => {
  const map: Record<string, string> = {
    TODO: '待开始',
    DOING: '进行中',
    DONE: '已完成',
    COMPLETED: '已完成',
    SKIPPED: '已跳过'
  }
  return map[String(status || '').toUpperCase()] || status || '未知'
}

const taskStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'DONE' || value === 'COMPLETED') return 'success'
  if (value === 'DOING') return 'warning'
  if (value === 'SKIPPED') return 'info'
  return ''
}

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    HIGH: '高优先级',
    MEDIUM: '中优先级',
    LOW: '低优先级'
  }
  return map[String(priority).toUpperCase()] || priority
}

onMounted(fetchPlans)
onBeforeUnmount(() => {
  clearPoll()
  cancelStream()
})
</script>

<style scoped lang="scss">
.study-plan-page {
  color: var(--app-text);
}

.study-hero,
.content-card {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.study-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;

  h1 {
    margin: 8px 0;
    color: #f8fafc;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.eyebrow,
.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eyebrow,
.section-kicker {
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.content-card__body {
  padding: 20px;
}

.section-head,
.detail-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.section-kicker {
  margin: 0;
  font-size: 11px;
}

.generate-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.form-wide {
  grid-column: span 3;
}

.form-actions {
  align-self: end;
}

.stream-panel {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(34, 211, 238, 0.2);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.36);

  pre {
    max-height: 180px;
    margin: 10px 0 0;
    overflow: auto;
    color: #cbd5e1;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.stream-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--cc-ai-cyan);
  font-size: 13px;
}

.study-layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.4fr);
  gap: 18px;
}

.status-filter {
  width: 160px;
}

.plan-list {
  min-height: 360px;
}

.plan-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.32);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;

  & + & {
    margin-top: 10px;
  }

  &:hover,
  &.is-active {
    border-color: rgba(129, 140, 248, 0.5);
    background: rgba(30, 41, 59, 0.78);
  }
}

.plan-item__main,
.plan-item__meta {
  display: grid;
  gap: 6px;
}

.plan-item__main {
  min-width: 0;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #f8fafc;
  }

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.plan-item__meta {
  justify-items: end;
  color: var(--app-text-muted);
  font-size: 12px;
}

.detail-card {
  min-height: 520px;
}

.status-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;
}

.loading-icon {
  animation: spin 1.1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.progress-row {
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
  color: var(--app-text-muted);
  font-size: 13px;
}

.task-list {
  display: grid;
  gap: 12px;
}

.task-item {
  padding: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.32);

  h3 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 16px;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-stage {
  color: var(--cc-ai-cyan);
  font-size: 12px;
}

.task-tags,
.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.task-tags span {
  padding: 5px 8px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.64);
  color: #cbd5e1;
  font-size: 12px;
}

@media (max-width: 1180px) {
  .generate-form,
  .study-layout {
    grid-template-columns: 1fr 1fr;
  }

  .form-wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 820px) {
  .study-hero,
  .section-head,
  .detail-head {
    flex-direction: column;
  }

  .generate-form,
  .study-layout {
    grid-template-columns: 1fr;
  }

  .status-filter {
    width: 100%;
  }
}
</style>
