<template>
  <div class="study-plan-page page-shell">
    <section class="study-hero">
      <div>
        <div class="eyebrow">
          <Route :size="16" />
          训练路线
        </div>
        <h1>把面试报告变成一条可执行的训练路线</h1>
        <p>从面试报告生成阶段化计划，按日期安排任务，并记录完成、跳过和恢复状态。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="fetchPlans">
          <RefreshCcw :size="16" />
          刷新路线
        </el-button>
        <el-button type="primary" @click="router.push('/interviews/history')">
          <History :size="16" />
          从面试报告开始
        </el-button>
      </div>
    </section>

    <section class="content-card generate-card">
      <div class="content-card__body">
        <div class="section-head">
          <div>
            <p class="section-kicker">从报告生成</p>
            <h2>选择一份真实报告，生成下一轮训练路线</h2>
          </div>
          <el-tag effect="plain" type="success">已接入</el-tag>
        </div>

        <el-form class="generate-form" :model="generateForm" label-position="top">
        <el-form-item label="关联面试报告">
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
              placeholder="可选：例如优先补 Redis、Spring Cloud 或项目表达"
            />
          </el-form-item>
          <el-form-item class="form-actions">
            <el-button type="primary" :loading="generating" :disabled="!generateForm.reportId" @click="handleGenerate">
              <Sparkles :size="16" />
              生成训练路线
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="streamStatus" class="stream-panel">
          <div class="stream-panel__head">
            <span>{{ streamStatus }}</span>
            <el-button v-if="generating" link type="warning" @click="requestCancelStream">取消</el-button>
          </div>
          <pre>{{ streamContent || '正在整理训练路线，耗时较长时可以稍后刷新列表查看结果。' }}</pre>
          <div class="stream-panel__actions">
            <el-button @click="fetchPlans">刷新路线列表</el-button>
            <el-button @click="goStudyPlanTaskCenterByForm">去任务中心查看</el-button>
          </div>
        </div>
      </div>
    </section>

    <div class="study-layout">
      <section class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <p class="section-kicker">我的路线</p>
              <h2>正在推进的训练路线</h2>
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
                  <strong>{{ plan.planTitle || '学习计划' }}</strong>
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
            <AppState
              v-else
              type="empty"
              title="还没有训练路线"
              description="学习计划需要基于面试报告或能力短板生成。先完成一次模拟面试，或从已有报告进入生成流程。"
            >
              <el-button type="primary" @click="router.push('/interviews/history')">从面试报告开始</el-button>
              <el-button @click="router.push('/interviews/create')">先做一次面试</el-button>
            </AppState>
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
                <p class="section-kicker">路线详情</p>
                <h2>{{ selectedPlan.planTitle || '学习计划' }}</h2>
                <p>{{ selectedPlan.planSummary || '这份路线暂时还没有摘要' }}</p>
              </div>
              <el-tag :type="statusType(selectedPlan.planStatus)" effect="plain">
                {{ statusText(selectedPlan.planStatus) }}
              </el-tag>
            </div>

            <div v-if="selectedPlan.planStatus === 'GENERATING'" class="status-panel">
              <el-icon class="loading-icon"><Loading /></el-icon>
              <span>学习计划正在生成，可以离开页面；稍后回到这里或任务中心继续查看。</span>
              <div class="status-panel__actions">
                <el-button size="small" @click="fetchPlans">刷新路线</el-button>
                <el-button size="small" type="primary" plain @click="goSelectedPlanTaskCenter">去任务中心</el-button>
              </div>
            </div>
            <div v-else-if="selectedPlan.planStatus === 'FAILED'" class="status-panel status-panel--error">
              <el-alert
                type="error"
                show-icon
                :closable="false"
                title="学习计划生成失败"
                :description="toFriendlyMessage(selectedPlan.failureReason, '请稍后重试或返回报告重新生成')"
              />
              <div class="status-panel__actions">
                <el-button size="small" @click="fetchPlans">刷新路线</el-button>
                <el-button size="small" type="primary" plain @click="goSelectedPlanTaskCenter">去任务中心</el-button>
              </div>
            </div>

            <div class="progress-row">
              <span>任务进度</span>
              <el-progress :percentage="selectedPlan.progressPercent || 0" :stroke-width="10" />
            </div>

            <section class="daily-view-panel">
              <div class="daily-view-panel__head">
                <div>
                  <p class="section-kicker">当天安排</p>
                  <h3>这一天要练什么</h3>
                  <span>
                    {{ dailyView?.date || dailyDate }} · 按计划日期展示当天任务
                  </span>
                </div>
                <div class="daily-view-panel__actions">
                  <el-date-picker
                    v-model="dailyDate"
                    type="date"
                    value-format="YYYY-MM-DD"
                    placeholder="选择日期"
                    :clearable="false"
                    @change="fetchDailyView"
                  />
                  <el-button :loading="dailyLoading" @click="fetchDailyView">
                    <RefreshCcw :size="16" />
                    刷新当天任务
                  </el-button>
                </div>
              </div>

              <el-alert
                v-if="dailyError"
                class="daily-error"
                type="error"
                show-icon
                :closable="false"
                title="日报视图加载失败"
                :description="dailyError"
              />

              <div v-loading="dailyLoading" class="daily-view-panel__body">
                <div class="daily-metrics">
                  <div class="daily-metric">
                    <span>今日任务</span>
                    <strong>{{ dailyView?.totalTaskCount ?? 0 }}</strong>
                  </div>
                  <div class="daily-metric is-success">
                    <span>已完成</span>
                    <strong>{{ dailyView?.completedTaskCount ?? 0 }}</strong>
                  </div>
                  <div class="daily-metric is-warning">
                    <span>待完成</span>
                    <strong>{{ dailyView?.pendingTaskCount ?? 0 }}</strong>
                  </div>
                  <div class="daily-metric is-muted">
                    <span>已跳过</span>
                    <strong>{{ dailyView?.skippedTaskCount ?? 0 }}</strong>
                  </div>
                  <div class="daily-metric is-primary">
                    <span>完成率</span>
                    <strong>{{ dailyView?.completionRate ?? 0 }}%</strong>
                  </div>
                </div>

                <div class="daily-task-list">
                  <template v-if="dailyTasks.length">
                    <article v-for="task in dailyTasks" :key="task.id" class="daily-task-item">
                      <div class="task-head">
                        <div>
                          <span class="task-stage">{{ task.stageTitle || `阶段 ${task.stageNo || '-'}` }}</span>
                          <h3>{{ task.taskTitle || '未命名任务' }}</h3>
                        </div>
                        <el-tag size="small" :type="taskStatusType(task.taskStatus)" effect="plain">
                          {{ taskStatusText(task.taskStatus) }}
                        </el-tag>
                      </div>
                      <p>{{ task.taskDescription || '暂无任务描述' }}</p>
                      <div class="task-tags">
                        <span v-if="task.taskType">{{ taskTypeText(task.taskType) }}</span>
                        <span>{{ formatPlannedDate(task.plannedDate) }}</span>
                        <span v-if="task.knowledgePoint">{{ task.knowledgePoint }}</span>
                        <span v-if="task.estimatedHours">{{ task.estimatedHours }}h</span>
                        <span v-for="questionId in task.relatedQuestionIds || []" :key="questionId">
                          关联练习题已记录
                        </span>
                        <span v-for="resource in task.resources || []" :key="resource">{{ resource }}</span>
                      </div>
                      <div class="task-actions">
                        <template v-if="isPendingTask(task.taskStatus)">
                          <el-button size="small" type="success" plain @click="completeTask(task.id)">完成</el-button>
                          <el-button size="small" plain @click="skipTask(task)">跳过</el-button>
                        </template>
                        <el-button v-else size="small" plain @click="restoreTask(task.id)">恢复待完成</el-button>
                      </div>
                    </article>
                  </template>
                  <AppState
                    v-else
                    type="empty"
                    title="这一天没有安排任务"
                    description="当前日期可能不在计划周期内，或任务已被移动到其他日期。可以切换日期、查看完整路线，或生成新的训练路线。"
                  >
                    <el-button @click="resetDailyDateToToday">查看今天</el-button>
                  </AppState>
                </div>
              </div>
            </section>

            <div class="all-task-head">
              <p class="section-kicker">完整路线</p>
              <h3>所有训练任务</h3>
              <span>这里保留当前路线的全部任务，方便你查看后续阶段，不和上方日期筛选混在一起。</span>
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
                    <span>{{ formatPlannedDate(task.plannedDate) }}</span>
                    <span v-if="task.priority">{{ priorityText(task.priority) }}</span>
                    <span v-if="task.estimatedHours">{{ task.estimatedHours }}h</span>
                    <span v-for="tag in task.relatedTags || []" :key="tag">{{ tag }}</span>
                  </div>
                  <div class="task-actions">
                    <el-button size="small" :disabled="task.taskStatus === 'DOING'" @click="updateTask(task.id, 'DOING')">
                      进行中
                    </el-button>
                    <el-button size="small" type="success" plain @click="completeTask(task.id)">完成</el-button>
                    <el-button size="small" plain @click="skipTask(task)">跳过</el-button>
                  </div>
                </article>
              </template>
              <AppState
                v-else
                type="empty"
                title="当前路线还没有任务明细"
                description="计划可能仍在生成中，或生成结果没有拆分成可执行任务。可以刷新路线，或回到面试报告重新生成。"
              >
                <el-button type="primary" :loading="detailLoading" @click="selectedPlan && selectPlan(selectedPlan.id, false)">刷新路线详情</el-button>
                <el-button @click="router.push('/interviews/history')">返回面试报告</el-button>
              </AppState>
            </div>
          </template>

          <AppState
            v-else
            type="empty"
            title="请选择一条训练路线"
            description="左侧选择计划后，这里会展示当天任务、完整路线和完成/跳过操作；没有计划时可从面试报告生成。"
          >
            <el-button type="primary" @click="router.push('/interviews/history')">从面试报告生成</el-button>
          </AppState>
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
  getStudyPlanDailyViewApi,
  getStudyPlanDetailApi,
  getStudyPlansApi,
  streamStudyPlanGenerateApi,
  updateStudyTaskStatusApi
} from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import type {
  SseEventVO,
  StudyPlanDailyViewVO,
  StudyPlanDetailVO,
  StudyPlanGenerateDTO,
  StudyPlanGenerateVO,
  StudyPlanListVO,
  StudyPlanQueryDTO,
  StudyTaskStatus,
  StudyTaskVO
} from '@/types/studyPlan'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()
type RouterQueryValue = string | number | boolean | null | undefined
const STUDY_PLAN_TASK_BIZ_TYPE = 'study-plan.generate'

const listLoading = ref(false)
const detailLoading = ref(false)
const generating = ref(false)
const plans = ref<StudyPlanListVO[]>([])
const selectedPlan = ref<StudyPlanDetailVO | null>(null)
const tasks = ref<StudyTaskVO[]>([])
const dailyView = ref<StudyPlanDailyViewVO | null>(null)
const dailyLoading = ref(false)
const dailyError = ref('')
const dailyDate = ref(formatDate(new Date()))
const pollCount = ref(0)
const streamContent = ref('')
const streamStatus = ref('')
let streamController: AbortController | undefined
let pollTimer: number | undefined
const streamAbortReason = ref<'user' | 'dispose' | ''>('')

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

const dailyTasks = computed(() => dailyView.value?.tasks || [])

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: Record<string, string> = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
}

const hasAsyncStudyPlanReceipt = (result?: StudyPlanGenerateVO | null) =>
  Boolean(result?.asyncMessageId || result?.asyncTraceId || result?.asyncBizType)

const studyPlanTaskCenterQuery = (result: StudyPlanGenerateVO) => compactRouterQuery({
  messageId: result.asyncMessageId,
  traceId: result.asyncTraceId,
  bizType: result.asyncBizType || STUDY_PLAN_TASK_BIZ_TYPE,
  bizId: result.asyncBizId || result.planId
})

const goStudyPlanTaskCenter = (result: StudyPlanGenerateVO) => router.push({
  path: '/agent/tasks',
  query: studyPlanTaskCenterQuery(result)
})

const goSelectedPlanTaskCenter = () => router.push({
  path: '/agent/tasks',
  query: compactRouterQuery({
    bizType: STUDY_PLAN_TASK_BIZ_TYPE,
    bizId: selectedPlan.value?.id || selectedPlanId.value
  })
})

const goStudyPlanTaskCenterByForm = () => router.push({
  path: '/agent/tasks',
  query: compactRouterQuery({
    bizType: STUDY_PLAN_TASK_BIZ_TYPE,
    bizId: selectedPlan.value?.id || selectedPlanId.value || generateForm.reportId
  })
})

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    ElMessage.warning('学习计划生成时间较长，可以稍后刷新路线或到任务中心查看进度')
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
      dailyView.value = null
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
    await fetchDailyView()
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

const fetchDailyView = async () => {
  const planId = selectedPlan.value?.id
  if (!planId) {
    dailyView.value = null
    return
  }
  dailyLoading.value = true
  dailyError.value = ''
  try {
    dailyView.value = await getStudyPlanDailyViewApi(planId, dailyDate.value)
  } catch (error) {
    dailyView.value = null
    dailyError.value = getErrorMessage(error, '请稍后重试')
  } finally {
    dailyLoading.value = false
  }
}

const resetDailyDateToToday = () => {
  dailyDate.value = formatDate(new Date())
  fetchDailyView()
}

const handlePageChange = (pageNo: number) => {
  query.pageNo = pageNo
  fetchPlans()
}

const handleGenerate = async () => {
  if (!generateForm.reportId) {
    ElMessage.warning('请先关联一份面试报告')
    return
  }
  generating.value = true
  streamContent.value = ''
  streamStatus.value = '正在提交学习计划生成任务'
  streamAbortReason.value = ''
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
            streamStatus.value = toFriendlyMessage(data?.message, '学习计划正在生成')
          }
          if (event === 'metadata') {
            streamPlanId = resolveStreamPlanId(data) || streamPlanId
          }
          if (event === 'done') {
            streamStatus.value = '学习计划已生成'
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
    ElMessage.success('学习计划已生成')
    if (result.planId) {
      pollCount.value = 0
      await router.replace({ path: '/study-plans', query: { planId: String(result.planId) } })
      await fetchPlans()
      await selectPlan(result.planId, false)
    } else {
      await fetchPlans()
    }
  } catch (error) {
    const abortReason: string = streamController?.signal.aborted
      ? streamAbortReason.value || 'dispose'
      : streamAbortReason.value
    if (abortReason || streamController?.signal.aborted) {
      if (abortReason === 'user') {
        streamStatus.value = '已取消本次生成，可稍后重新提交或刷新查看是否已有计划'
        ElMessage.warning('已取消学习计划生成')
      }
      return
    }
    if (streamStarted) {
      streamStatus.value = '学习计划生成暂时中断，请刷新后查看是否已有生成结果'
      ElMessage.error(getErrorMessage(error, '学习计划生成暂时中断，请刷新后查看是否已有生成结果'))
      await fetchPlans()
      return
    }
    streamStatus.value = '生成过程暂时不稳定，已改用普通生成方式'
    const result = await generateStudyPlanApi({
      ...generateForm,
      targetPosition: generateForm.targetPosition || undefined,
      industryDirection: generateForm.industryDirection || undefined,
      extraRequirements: generateForm.extraRequirements || undefined
    })
    if (hasAsyncStudyPlanReceipt(result)) {
      ElMessage.success('学习计划已提交，可在任务中心查看进度')
      await goStudyPlanTaskCenter(result)
      return
    }
    if (String(result.planStatus || '').toUpperCase() === 'FAILED') {
      ElMessage.error(toFriendlyMessage(result.failureReason, '学习计划生成失败，请查看原因后重试'))
    } else {
      ElMessage.success('学习计划已生成')
    }
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
    streamAbortReason.value = ''
  }
}

const resolveStreamPlanId = (event?: SseEventVO) => {
  const result = event?.result && typeof event.result === 'object' ? event.result : {}
  const value = event?.metadata?.planId || event?.planId || ('planId' in result ? result.planId : undefined)
  const id = Number(value || 0)
  return Number.isFinite(id) && id > 0 ? id : 0
}

const abortStream = (reason: 'user' | 'dispose') => {
  if (!streamController) return
  streamAbortReason.value = reason
  streamController.abort()
}

const requestCancelStream = async () => {
  if (!streamController) return
  const confirmed = await confirmDangerActionPreview({
    title: '取消生成',
    action: '停止当前学习路线生成',
    target: `关联报告 ${generateForm.reportId ? '已选择' : '未选择'}，计划周期 ${generateForm.expectedDurationDays} 天`,
    impact: '当前页面的生成过程会停止；如果后台已经生成出计划，可稍后刷新路线列表查看，否则需要重新提交生成。',
    rollback: '取消不会自动恢复本次输出；重新生成时会基于当前表单重新提交一次。',
    audit: '页面会保留已经返回的片段，便于判断是否需要刷新查看结果或重新生成。',
    tips: ['确认不是因为等待时间较长而误触；长任务也可以稍后从路线列表刷新查看。', '如果只是想离开页面，系统会自动清理当前连接。'],
    confirmButtonText: '确认取消'
  })
  if (!confirmed) return
  abortStream('user')
}

const refreshSelectedPlan = async () => {
  if (selectedPlan.value?.id) {
    const planId = selectedPlan.value.id
    await selectPlan(planId, false)
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

const skipTask = async (task: StudyTaskVO) => {
  const confirmed = await confirmDangerActionPreview({
    title: '跳过训练任务',
    action: '把这条训练任务标记为跳过',
    target: task.taskTitle || task.taskDescription || `训练任务 ${task.id}`,
    impact: '这条任务会从当前待办节奏中移出，今日完成率和路线进度会按跳过状态重新计算。',
    rollback: '如果只是暂时不做，可以先标记为进行中；误跳过后可回到路线详情重新调整任务状态或重新生成路线。',
    audit: '任务状态变更会保留在训练路线中，后续复盘会看到它曾被跳过。',
    tips: ['确认这条任务今天确实不准备继续推进。', '如果任务太大，优先拆小或改为进行中，而不是直接跳过。'],
    confirmButtonText: '确认跳过'
  })
  if (!confirmed) return
  await updateStudyTaskStatusApi(task.id, 'SKIPPED')
  ElMessage.success('任务已跳过')
  await refreshSelectedPlan()
}

const restoreTask = async (taskId: number) => {
  await updateStudyTaskStatusApi(taskId, 'TODO')
  ElMessage.success('任务已恢复为待完成')
  await refreshSelectedPlan()
}

const isPendingTask = (status?: string) => {
  const value = String(status || '').toUpperCase()
  return value === 'TODO' || value === 'DOING' || value === 'PENDING'
}

const statusText = (status?: string) => {
  const map: Record<string, string> = {
    GENERATING: '生成中',
    ACTIVE: '进行中',
    FAILED: '失败',
    ARCHIVED: '已归档'
  }
  return map[String(status || '').toUpperCase()] || '状态待确认'
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
  return map[String(status || '').toUpperCase()] || '状态待确认'
}

const taskStatusType = (status?: string) => {
  const value = String(status || '').toUpperCase()
  if (value === 'DONE' || value === 'COMPLETED') return 'success'
  if (value === 'DOING') return 'warning'
  if (value === 'SKIPPED') return 'info'
  return ''
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

const priorityText = (priority: string) => {
  const map: Record<string, string> = {
    HIGH: '高优先级',
    MEDIUM: '中优先级',
    LOW: '低优先级'
  }
  return map[String(priority).toUpperCase()] || '优先级待确认'
}

const formatPlannedDate = (value?: string) => value || '未规划日期'

onMounted(fetchPlans)
onBeforeUnmount(() => {
  clearPoll()
  abortStream('dispose')
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

.stream-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
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
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  color: #fde68a;
}

.status-panel--error {
  display: grid;
  align-items: stretch;
}

.status-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
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

.daily-view-panel {
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  border-radius: 16px;
  background: rgba(8, 13, 31, 0.58);
}

.daily-view-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;

  h3 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 17px;
  }

  span {
    display: inline-block;
    margin-top: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.daily-view-panel__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.daily-error {
  margin-bottom: 12px;
}

.daily-view-panel__body {
  min-height: 220px;
}

.daily-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.daily-metric {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.64);

  span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: #f8fafc;
    font-size: 22px;
  }

  &.is-success strong {
    color: #86efac;
  }

  &.is-warning strong {
    color: #fde68a;
  }

  &.is-muted strong {
    color: #cbd5e1;
  }

  &.is-primary strong {
    color: #93c5fd;
  }
}

.daily-task-list {
  display: grid;
  gap: 10px;
}

.daily-task-item {
  padding: 14px;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);

  h3 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 15px;
  }

  p {
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.task-list {
  display: grid;
  gap: 12px;
}

.all-task-head {
  margin: 8px 0 12px;

  h3 {
    margin: 4px 0 0;
    color: #f8fafc;
    font-size: 17px;
  }

  span {
    display: inline-block;
    margin-top: 6px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
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
  .daily-view-panel__head,
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

  .daily-view-panel__actions,
  .daily-view-panel__actions :deep(.el-date-editor) {
    width: 100%;
  }

  .daily-metrics {
    grid-template-columns: 1fr 1fr;
  }
}

.study-plan-page {
  display: grid;
  gap: 18px;
}

.study-hero,
.content-card {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  backdrop-filter: none;
}

.study-hero {
  background:
    linear-gradient(135deg, rgba(239, 246, 255, 0.96), rgba(240, 253, 250, 0.92)),
    #ffffff;

  h1 {
    max-width: 720px;
    color: #172033;
    line-height: 1.18;
  }

  p {
    max-width: 760px;
    color: #64748b;
  }
}

.eyebrow,
.section-kicker,
.task-stage,
.stream-panel__head {
  color: #2563eb;
  letter-spacing: 0;
}

.section-head,
.detail-head {
  h2 {
    color: #172033;
  }

  p {
    color: #64748b;
  }
}

.generate-card {
  margin-bottom: 18px;
}

.stream-panel {
  border-color: #bfdbfe;
  border-radius: 8px;
  background: #f8fafc;

  pre {
    color: #334155;
  }
}

.plan-list {
  min-height: 320px;
}

.plan-item {
  border-color: #e2e8f0;
  border-radius: 8px;
  background: #ffffff;

  &:hover,
  &.is-active {
    border-color: #93c5fd;
    background: #eff6ff;
  }
}

.plan-item__main {
  strong {
    color: #172033;
  }

  span {
    color: #64748b;
  }
}

.plan-item__meta {
  color: #64748b;
}

.status-panel {
  border-color: #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
}

.progress-row {
  color: #64748b;
}

.daily-view-panel {
  border-color: #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.daily-view-panel__head {
  h3 {
    color: #172033;
  }

  span {
    color: #64748b;
  }
}

.daily-metric {
  border-color: #e2e8f0;
  border-radius: 8px;
  background: #ffffff;

  span {
    color: #64748b;
  }

  strong {
    color: #172033;
  }

  &.is-success strong {
    color: #15803d;
  }

  &.is-warning strong {
    color: #b45309;
  }

  &.is-muted strong {
    color: #64748b;
  }

  &.is-primary strong {
    color: #2563eb;
  }
}

.daily-task-item,
.task-item {
  border-color: #e2e8f0;
  border-radius: 8px;
  background: #ffffff;

  h3 {
    color: #172033;
  }

  p {
    color: #64748b;
  }
}

.all-task-head {
  h3 {
    color: #172033;
  }

  span {
    color: #64748b;
  }
}

.task-tags span {
  border-color: #dbe3ef;
  background: #f8fafc;
  color: #475569;
}
</style>
