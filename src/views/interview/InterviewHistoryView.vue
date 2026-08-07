<template>
  <div class="interview-history-page page-shell page-shell--wide">
    <header class="history-header">
      <div>
        <div class="eyebrow">
          <History :size="16" />
          面试中心
        </div>
        <h1>从当前这一轮继续</h1>
        <p>先完成正在推进的面试，再回看报告、比较表现和安排下一轮训练。</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="router.push('/interviews/create')">
          <Plus :size="16" />
          创建面试
        </el-button>
      </div>
    </header>

    <div class="view-tabs" role="tablist" aria-label="面试中心视图">
      <button
        class="view-tab"
        :class="{ 'view-tab--active': activeView === 'continue' }"
        type="button"
        role="tab"
        :aria-selected="activeView === 'continue'"
        @click="setActiveView('continue')"
      >
        继续面试
        <span v-if="activeInterviews.length">{{ activeInterviews.length }}</span>
      </button>
      <button
        class="view-tab"
        :class="{ 'view-tab--active': activeView === 'history' }"
        type="button"
        role="tab"
        :aria-selected="activeView === 'history'"
        @click="setActiveView('history')"
      >
        历史记录与报告
      </button>
    </div>

    <section class="summary-strip" aria-label="面试概览">
      <div v-for="metric in metrics" :key="metric.label" class="summary-item">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.desc }}</small>
      </div>
    </section>

    <section v-if="activeView === 'continue'" class="continue-view" role="tabpanel">
      <el-alert
        v-if="loadError"
        class="page-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="loadError"
      />

      <div v-loading="loading" class="continue-stage">
        <AppState
          v-if="loadError && !interviews.length && !loading"
          type="error"
          title="面试记录暂时不可用"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchInterviews">重新加载</el-button>
          <el-button @click="router.push('/interviews/create')">创建面试</el-button>
        </AppState>

        <AppState
          v-else-if="!interviews.length && !loading"
          type="empty"
          title="还没有面试记录"
          description="创建一轮模拟面试后，可以在这里持续完成答题，再查看复盘报告。"
        >
          <el-button type="primary" @click="router.push('/interviews/create')">创建面试</el-button>
          <el-button @click="router.push('/onboarding')">先建立求职目标</el-button>
        </AppState>

        <section v-else-if="focusInterview" class="focus-interview">
          <div class="focus-content">
            <div class="focus-heading">
              <span class="quick-label">当前优先事项</span>
              <div class="status-group">
                <StatusTag :status="focusInterview.status" />
                <StatusTag :status="focusInterview.reportStatus" />
              </div>
            </div>
            <h2>{{ focusInterview.interviewName || focusInterview.targetPosition || '未命名模拟面试' }}</h2>
            <p>{{ nextActionText(focusInterview) }}</p>
            <div class="focus-meta">
              <span>{{ formatDateTime(focusInterview.finishedAt || focusInterview.startedAt || focusInterview.createdAt) }}</span>
              <span>{{ interviewModeLabel(focusInterview.interviewMode) }}</span>
              <span>{{ focusInterview.targetPosition || '目标岗位待补充' }}</span>
            </div>
          </div>
          <div class="focus-action">
            <el-button type="primary" size="large" @click="openPrimary(focusInterview)">
              {{ primaryActionLabel(focusInterview) }}
              <ChevronRight :size="16" />
            </el-button>
            <button class="text-action" type="button" @click="setActiveView('history')">
              查看全部记录与报告
            </button>
          </div>
        </section>
      </div>
    </section>

    <section v-else class="history-view" role="tabpanel">
      <div class="history-view-head">
        <div>
          <h2>历史记录与报告</h2>
          <p>筛选、比较和查看报告都在这里进行，不影响当前的面试推进。</p>
        </div>
        <div class="history-view-actions">
          <el-button @click="router.push('/tools')">
            <Wrench :size="16" />
            记录与工具
          </el-button>
          <el-button @click="router.push('/questions/recommendations')">练今日题组</el-button>
        </div>
      </div>

      <section class="history-panel">
        <details class="filter-drawer">
          <summary>
            <Search :size="16" />
            筛选历史记录
          </summary>
          <div class="filter-bar">
            <el-input
              v-model="query.keyword"
              clearable
              placeholder="搜索面试名称、岗位或行业"
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <Search :size="16" />
              </template>
            </el-input>
            <el-select v-model="query.status" clearable placeholder="面试状态" @change="handleSearch">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-model="query.reportStatus" clearable placeholder="报告状态" @change="handleSearch">
              <el-option v-for="item in reportStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button :loading="loading" @click="fetchInterviews">
              <RefreshCw :size="16" />
              刷新
            </el-button>
          </div>
        </details>

        <el-alert
          v-if="loadError"
          class="history-alert"
          type="warning"
          :closable="false"
          show-icon
          :title="loadError"
        />

        <details
          v-if="generatedReports.length"
          class="comparison-panel"
          @toggle="handleComparisonToggle"
        >
          <summary>
            <GitCompareArrows :size="16" />
            跨场比较
            <span>已选择 {{ selectedComparisonCandidates.length }} / 10 轮</span>
          </summary>
          <div class="comparison-panel__content">
            <p>{{ comparisonSelectionHint }}</p>
            <div class="comparison-panel__actions">
              <el-button
                v-if="selectedComparisonCandidates.length"
                :disabled="comparisonLoading"
                @click="clearComparisonSelection"
              >
                清空选择
              </el-button>
              <el-button
                type="primary"
                :loading="comparisonLoading"
                :disabled="!comparisonSelection.valid"
                @click="createComparison"
              >
                创建比较
              </el-button>
            </div>
          </div>
          <el-alert
            v-if="comparisonError"
            class="comparison-error"
            type="warning"
            :closable="false"
            show-icon
            title="暂时无法创建比较"
            :description="comparisonError"
          />
        </details>

        <details v-if="voiceDeliveryTimeline.length" class="voice-insights">
          <summary>
            <MessageSquare :size="16" />
            语音表达趋势
          </summary>
          <p>按分析完成时间排序，仅展示已保存的真实指标。</p>
          <div class="voice-trend-list">
            <article v-for="point in voiceDeliveryTimeline" :key="point.analysisId || point.interviewId">
              <time>{{ formatDateTime(point.occurredAt) }}</time>
              <strong>{{ Math.round(point.speakingRatePerMinute || 0) }} 字/分钟</strong>
              <span>填充词 {{ point.fillerCount ?? '-' }} 次</span>
              <span v-if="point.pauseMetricsAvailable">最长停顿 {{ point.longestPauseMs ?? 0 }} 毫秒</span>
              <span v-else>停顿指标不可用</span>
            </article>
          </div>
        </details>

        <div v-loading="loading" class="history-list">
          <AppState
            v-if="loadError && !interviews.length && !loading"
            type="error"
            title="面试记录暂时不可用"
            :description="loadError"
          >
            <el-button type="primary" @click="fetchInterviews">重新加载</el-button>
            <el-button @click="router.push('/interviews/create')">创建面试</el-button>
          </AppState>

          <AppState
            v-else-if="!interviews.length && !loading"
            type="empty"
            title="还没有面试记录"
            description="创建一次面试后，可以在这里继续进入房间、查看报告，并把薄弱点转成下一轮训练。"
          >
            <el-button type="primary" @click="router.push('/interviews/create')">创建面试</el-button>
            <el-button @click="router.push('/onboarding')">先建立求职目标</el-button>
          </AppState>

          <section v-if="showMissingReportGuide" class="missing-report-guide">
            <div>
              <strong>当前还没有可查看的报告</strong>
              <p>完成面试并提交报告生成后，才能获得本轮复盘与后续训练建议。</p>
            </div>
            <el-button type="primary" @click="openMissingReportGuidePrimary">
              {{ focusInterview && !isInterviewDone(focusInterview.status) ? '继续完成面试' : '去生成报告' }}
            </el-button>
          </section>

          <article
            v-for="item in interviews"
            :key="item.interviewId"
            class="interview-card"
            :class="{ 'interview-card--selected': comparisonExpanded && isComparisonSelected(item) }"
          >
            <div class="card-main">
              <div class="card-head">
                <div>
                  <span class="card-time">{{ formatDateTime(item.finishedAt || item.startedAt || item.createdAt) }}</span>
                  <h3>{{ item.interviewName || item.targetPosition || '未命名模拟面试' }}</h3>
                </div>
                <div class="status-group">
                  <el-tooltip
                    v-if="comparisonExpanded && isReportSuccess(item.reportStatus)"
                    :content="comparisonSelectionState(item).reason"
                    :disabled="!comparisonSelectionState(item).reason"
                    placement="top"
                  >
                    <span class="comparison-checkbox-wrap">
                      <el-checkbox
                        :model-value="isComparisonSelected(item)"
                        :disabled="comparisonSelectionState(item).disabled"
                        @change="toggleComparisonSelection(item, Boolean($event))"
                      >
                        加入比较
                      </el-checkbox>
                    </span>
                  </el-tooltip>
                  <StatusTag :status="item.status" />
                  <StatusTag :status="item.reportStatus" />
                  <StatusTag
                    v-if="comparisonExpanded && isReportSuccess(item.reportStatus) && item.comparisonAvailable === true"
                    status="COMPARABLE"
                    :map="comparableTagMap"
                  />
                  <el-tooltip
                    v-else-if="comparisonExpanded && isReportSuccess(item.reportStatus) && item.comparisonAvailable === false"
                    :content="comparisonUnavailableText(item)"
                    placement="top"
                  >
                    <span class="comparison-tag-wrap">
                      <StatusTag status="NOT_COMPARABLE" :map="comparableTagMap" />
                    </span>
                  </el-tooltip>
                </div>
              </div>

              <div class="tag-row">
                <span>{{ interviewModeLabel(item.interviewMode) }}</span>
                <span>{{ item.targetPosition || '目标岗位待补充' }}</span>
                <span>{{ item.industryDirection || '行业方向待补充' }}</span>
              </div>

              <details class="record-details">
                <summary>查看本轮摘要</summary>
                <p>{{ nextActionText(item) }}</p>
                <div class="voice-history-summary">
                  <strong>语音表达</strong>
                  <span>{{ voiceDeliveryCompactText(item) }}</span>
                </div>
              </details>
            </div>

            <aside class="score-panel">
              <span>报告得分</span>
              <strong>{{ displayInterviewScore(item) }}</strong>
              <p>{{ scoreHint(item) }}</p>
            </aside>

            <div class="card-actions">
              <el-button class="card-primary-action" type="primary" @click="openPrimary(item)">
                {{ primaryActionLabel(item) }}
                <ChevronRight :size="16" />
              </el-button>
              <el-button @click="router.push(`/interviews/room/${item.interviewId}`)">
                <MessageSquare :size="16" />
                面试房间
              </el-button>
              <el-button
                v-if="showReportSecondaryAction(item)"
                :disabled="!canOpenReportPage(item)"
                @click="router.push(`/interviews/${item.interviewId}/report`)"
              >
                <FileText :size="16" />
                {{ reportActionLabel(item) }}
              </el-button>
            </div>
          </article>
        </div>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="query.pageNo"
            v-model:page-size="query.pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :total="total"
            :page-sizes="[6, 10, 20, 50]"
            @change="fetchInterviews"
          />
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, FileText, GitCompareArrows, History, MessageSquare, Plus, RefreshCw, Search, Wrench } from 'lucide-vue-next'

import { getInterviewsApi } from '@/api/interview'
import {
  createInterviewComparisonApi,
  getInterviewAdvancedReportApi
} from '@/api/interviewAdvanced'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { interviewModeOptions } from '@/constants/enums'
import {
  comparisonReasonLabel,
  storeInterviewComparison,
  toInterviewComparisonCandidate,
  validateInterviewComparisonSelection
} from '@/features/interview-comparison'
import { buildVoiceDeliveryTimeline } from '@/features/interview-voice-product'
import type { InterviewListVO, InterviewQueryDTO } from '@/types/interview'
import type { InterviewHistoryComparisonCandidate } from '@/types/interviewAdvanced'
import { getErrorMessage } from '@/utils/error'
import { createOperationIdempotencyKey } from '@/utils/idempotency'

interface SelectOption {
  label: string
  value: string
}

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const interviews = ref<InterviewListVO[]>([])
const total = ref(0)
let interviewsRequestId = 0
const selectedComparisonCandidates = ref<InterviewHistoryComparisonCandidate[]>([])
const comparisonLoading = ref(false)
const comparisonError = ref('')
const comparisonIdempotencyKey = ref('')
const activeView = ref<'continue' | 'history'>('continue')
const comparisonExpanded = ref(false)

const query = reactive<InterviewQueryDTO>({
  pageNo: 1,
  pageSize: 6,
  keyword: '',
  status: '',
  reportStatus: ''
})

const statusOptions: SelectOption[] = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '等待作答', value: 'WAITING_ANSWER' },
  { label: '报告生成中', value: 'REPORT_GENERATING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '失败', value: 'FAILED' }
]

const reportStatusOptions: SelectOption[] = [
  { label: '未生成', value: 'NOT_GENERATED' },
  { label: '生成中', value: 'GENERATING' },
  { label: '已生成', value: 'GENERATED' },
  { label: '失败', value: 'FAILED' }
]

const normalizeStatus = (status?: string) => String(status || '').toUpperCase()
const isReportSuccess = (status?: string) => ['GENERATED', 'COMPLETED', 'SUCCESS'].includes(String(status || '').toUpperCase())

const comparableTagMap: Record<string, { label: string; type: 'success' | 'info' }> = {
  COMPARABLE: { label: '可比对', type: 'success' },
  NOT_COMPARABLE: { label: '不可比', type: 'info' }
}

const comparisonUnavailableText = (row: InterviewListVO) =>
  comparisonReasonLabel(row.comparisonUnavailableReason || '')
const isReportInProgress = (status?: string) => ['GENERATING', 'PROCESSING', 'PENDING', 'REPORT_GENERATING'].includes(normalizeStatus(status))
const isReportFailed = (status?: string) => ['FAILED', 'ERROR'].includes(normalizeStatus(status))
const isInterviewDone = (status?: string) => ['COMPLETED', 'CANCELED', 'FAILED'].includes(String(status || '').toUpperCase())
const canSubmitOrViewReport = (status?: string) => ['COMPLETED', 'REPORT_GENERATING'].includes(normalizeStatus(status))

const canOpenReportPage = (row: InterviewListVO) =>
  isReportSuccess(row.reportStatus)
  || isReportInProgress(row.reportStatus)
  || isReportFailed(row.reportStatus)
  || canSubmitOrViewReport(row.status)

const generatedReports = computed(() => interviews.value.filter((item) => isReportSuccess(item.reportStatus)))
const comparisonSelection = computed(() =>
  validateInterviewComparisonSelection(selectedComparisonCandidates.value)
)
const comparisonSelectionHint = computed(() => {
  if (!selectedComparisonCandidates.value.length) return '选择同一目标岗位下至少两轮已生成报告的面试。'
  if (!comparisonSelection.value.valid) return comparisonSelection.value.reason
  return '提交后会按报告生成时间比较总分和同版本评分维度。'
})
const activeInterviews = computed(() => interviews.value.filter((item) => !isInterviewDone(item.status)))
const focusInterview = computed(() =>
  activeInterviews.value[0] ||
  interviews.value.find((item) => isReportInProgress(item.reportStatus) || isReportFailed(item.reportStatus)) ||
  generatedReports.value[0] ||
  interviews.value[0]
)
const showMissingReportGuide = computed(() =>
  Boolean(interviews.value.length && !generatedReports.value.length && !loading.value && !loadError.value)
)
const averageScore = computed(() => {
  const scores = generatedReports.value
    .map((item) => Number(item.totalScore))
    .filter((score) => Number.isFinite(score) && score > 0)
  if (!scores.length) return '-'
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})
const voiceDeliveryTimeline = computed(() => buildVoiceDeliveryTimeline(interviews.value))

const voiceDeliveryCompactText = (row: InterviewListVO) => {
  const summary = row.voiceDeliverySummary
  if (summary?.available && summary.status === 'SUCCEEDED') {
    const rate = summary.speakingRatePerMinute === undefined
      ? '语速暂无'
      : `语速 ${Math.round(summary.speakingRatePerMinute)} 字/分钟`
    const fillers = summary.fillerCount === undefined ? '填充词暂无' : `填充词 ${summary.fillerCount} 次`
    const pauses = summary.pauseMetricsAvailable
      ? `最长停顿 ${summary.longestPauseMs ?? 0} ms`
      : '停顿指标不可用'
    return `${rate} · ${fillers} · ${pauses}`
  }
  const status = String(summary?.status || 'NOT_ANALYZED').toUpperCase()
  if (['QUEUED', 'RUNNING'].includes(status)) return '分析处理中'
  if (status === 'FAILED') return '分析失败，未生成可靠指标'
  if (status === 'TIMED_OUT') return '分析超时，未生成可靠指标'
  if (status === 'CANCELLED') return '分析已取消'
  return '本场没有已保存的语音表达分析'
}

const metrics = computed(() => [
  { label: '复盘总数', value: total.value || interviews.value.length, desc: '累计面试路径' },
  { label: '可继续', value: activeInterviews.value.length, desc: '先回房间完成答题' },
  { label: '已出复盘', value: generatedReports.value.length, desc: '可直接查看报告' },
  { label: '平均表现', value: averageScore.value, desc: '仅统计可信分数字段' }
])

const displayInterviewScore = (row: InterviewListVO) => {
  if (!isReportSuccess(row.reportStatus)) return '-'
  const score = Number(row.totalScore)
  return Number.isFinite(score) && score > 0 ? Math.round(score) : '-'
}

const scoreHint = (row: InterviewListVO) => {
  if (isReportSuccess(row.reportStatus)) {
    return displayInterviewScore(row) === '-' ? '报告已生成，等待分数字段返回' : '查看报告后继续转题库训练'
  }
  if (isReportInProgress(row.reportStatus)) return '报告正在生成'
  if (isReportFailed(row.reportStatus)) return '报告生成失败，可查看原因'
  if (canSubmitOrViewReport(row.status)) return '可进入报告页生成复盘'
  return '完成面试后可生成报告'
}

const interviewModeLabel = (mode?: string) => {
  if (!mode) return '面试模式待确认'
  return interviewModeOptions.find((item) => item.value === mode)?.label || '面试模式待确认'
}

const nextActionText = (row: InterviewListVO) => {
  if (!isInterviewDone(row.status)) return '这轮面试还可以继续，建议先回到房间完成答题，再查看报告。'
  if (isReportSuccess(row.reportStatus)) return '报告已生成，可以进入复盘页查看薄弱点，并跳转到专项练习。'
  if (isReportInProgress(row.reportStatus)) return '报告正在生成，可以进入报告页查看进度，也可以到任务中心稍后继续。'
  if (isReportFailed(row.reportStatus)) return '报告生成失败，可以进入报告页查看失败原因，并重新提交生成任务。'
  if (canSubmitOrViewReport(row.status)) return '面试已结束，可以进入报告页提交生成任务；耗时较久时可在任务中心继续查看。'
  return '面试已结束但报告未生成，可以回看本轮记录，确认是否需要补交复盘。'
}

const primaryActionLabel = (row: InterviewListVO) => {
  if (!isInterviewDone(row.status)) return '继续面试'
  if (isReportSuccess(row.reportStatus)) return '查看复盘'
  if (isReportInProgress(row.reportStatus)) return '查看进度'
  if (isReportFailed(row.reportStatus)) return '处理报告失败'
  if (canSubmitOrViewReport(row.status)) return '生成报告'
  return '回看这轮'
}

const showReportSecondaryAction = (row: InterviewListVO) => !isReportFailed(row.reportStatus)

const reportActionLabel = (row: InterviewListVO) => {
  if (isReportInProgress(row.reportStatus)) return '查看进度'
  if (isReportFailed(row.reportStatus)) return '失败原因'
  if (canSubmitOrViewReport(row.status) && !isReportSuccess(row.reportStatus)) return '生成报告'
  return '面试报告'
}

const openPrimary = async (row: InterviewListVO) => {
  if (!isInterviewDone(row.status)) {
    await router.push(`/interviews/room/${row.interviewId}`)
    return
  }
  if (canOpenReportPage(row)) {
    await router.push(`/interviews/${row.interviewId}/report`)
    return
  }
  await router.push(`/interviews/${row.interviewId}`)
}

const openMissingReportGuidePrimary = async () => {
  const row = focusInterview.value || interviews.value[0]
  if (!row) return
  await openPrimary(row)
}

const isComparisonSelected = (row: InterviewListVO) =>
  selectedComparisonCandidates.value.some((item) => item.interviewId === row.interviewId)

const comparisonSelectionState = (row: InterviewListVO) => {
  if (comparisonLoading.value) {
    return { disabled: true, reason: '比较创建中，请稍候。' }
  }
  if (isComparisonSelected(row)) return { disabled: false, reason: '' }
  if (row.comparisonAvailable === false) {
    return { disabled: true, reason: `该记录不可比（${comparisonUnavailableText(row)}），不能加入比较。` }
  }
  const candidate = toInterviewComparisonCandidate(row)
  if (!candidate.targetJobId) {
    return { disabled: true, reason: '该面试未绑定目标岗位，不能用于同岗位比较。' }
  }
  if (selectedComparisonCandidates.value.length >= 10) {
    return { disabled: true, reason: '单次最多比较 10 轮面试。' }
  }
  const selectedTargetJobId = selectedComparisonCandidates.value[0]?.targetJobId
  if (selectedTargetJobId && selectedTargetJobId !== candidate.targetJobId) {
    return { disabled: true, reason: '请选择与当前已选记录相同的目标岗位。' }
  }
  return { disabled: false, reason: '' }
}

const toggleComparisonSelection = (row: InterviewListVO, selected: boolean) => {
  if (comparisonLoading.value) return
  comparisonError.value = ''
  const candidate = toInterviewComparisonCandidate(row)
  if (!selected) {
    selectedComparisonCandidates.value = selectedComparisonCandidates.value
      .filter((item) => item.interviewId !== candidate.interviewId)
    comparisonIdempotencyKey.value = ''
    return
  }
  const state = comparisonSelectionState(row)
  if (state.disabled || !candidate.interviewId) {
    comparisonError.value = state.reason || '该记录暂时不能加入比较。'
    return
  }
  selectedComparisonCandidates.value = [...selectedComparisonCandidates.value, candidate]
  comparisonIdempotencyKey.value = ''
}

const clearComparisonSelection = () => {
  if (comparisonLoading.value) return
  selectedComparisonCandidates.value = []
  comparisonError.value = ''
  comparisonIdempotencyKey.value = ''
}

const setActiveView = (view: 'continue' | 'history') => {
  activeView.value = view
  comparisonExpanded.value = false
}

const handleComparisonToggle = (event: Event) => {
  const details = event.target
  comparisonExpanded.value = details instanceof HTMLDetailsElement && details.open
}

const createComparison = async () => {
  if (comparisonLoading.value) return
  const comparisonCandidatesSnapshot = selectedComparisonCandidates.value
    .map((candidate) => ({ ...candidate }))
  const validation = validateInterviewComparisonSelection(comparisonCandidatesSnapshot)
  if (!validation.valid) {
    comparisonError.value = validation.reason
    return
  }
  comparisonLoading.value = true
  comparisonError.value = ''
  try {
    const reportMetadata = await Promise.all(
      comparisonCandidatesSnapshot.map((item) => getInterviewAdvancedReportApi(item.interviewId))
    )
    const metadataByInterviewId = new Map(
      reportMetadata.map((metadata) => [metadata.interviewId, metadata])
    )
    const resolvedCandidates = comparisonCandidatesSnapshot.map((candidate) => {
      const metadata = metadataByInterviewId.get(candidate.interviewId)
      return {
        ...candidate,
        reportId: metadata?.reportId,
        targetJobId: metadata?.targetJobId || candidate.targetJobId,
        comparisonAvailable: metadata?.comparisonAvailable,
        comparisonUnavailableReason: metadata?.comparisonUnavailableReason
      }
    })
    const resolvedValidation = validateInterviewComparisonSelection(resolvedCandidates)
    if (!resolvedValidation.valid) {
      comparisonError.value = resolvedValidation.reason
      return
    }
    const reportIds = resolvedCandidates
      .map((item) => item.reportId)
      .filter((id): id is number => Boolean(id && id > 0))
    if (reportIds.length !== resolvedCandidates.length) {
      comparisonError.value = '部分面试没有可追溯的报告记录，暂时无法比较。'
      return
    }
    if (!comparisonIdempotencyKey.value) {
      comparisonIdempotencyKey.value = createOperationIdempotencyKey('interview-compare')
    }
    const result = await createInterviewComparisonApi({
      reportIds,
      idempotencyKey: comparisonIdempotencyKey.value
    })
    const cacheKey = storeInterviewComparison(result)
    let navigationFailure: unknown
    try {
      navigationFailure = await router.push({
        name: 'InterviewComparison',
        params: { id: result.id || 'preview' },
        query: { cacheKey }
      })
    } catch {
      comparisonError.value = '对比记录已创建，但页面跳转失败；重试将恢复同一记录。'
      return
    }
    if (navigationFailure) {
      comparisonError.value = '对比记录已创建，但页面跳转未完成；重试将恢复同一记录。'
      return
    }
    comparisonIdempotencyKey.value = ''
  } catch (error) {
    comparisonError.value = getErrorMessage(error, '比较请求失败，请稍后重试。')
  } finally {
    comparisonLoading.value = false
  }
}

const formatDateTime = (value?: string) => {
  if (!value) return '时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const handleSearch = () => {
  query.pageNo = 1
  fetchInterviews()
}

const fetchInterviews = async () => {
  const requestId = ++interviewsRequestId
  loading.value = true
  loadError.value = ''
  try {
    const result = await getInterviewsApi(query)
    if (requestId !== interviewsRequestId) return

    interviews.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    if (requestId !== interviewsRequestId) return

    interviews.value = []
    total.value = 0
    loadError.value = getErrorMessage(error, '面试记录暂时加载失败，请稍后重试。')
  } finally {
    if (requestId === interviewsRequestId) {
      loading.value = false
    }
  }
}

onMounted(fetchInterviews)
</script>

<style scoped lang="scss">
.interview-history-page {
  width: min(100%, 1240px);
  min-width: 0;
  margin: 0 auto;
  gap: 24px;
  padding-bottom: 40px;
}

.history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 8px 4px 0;

  h1 {
    margin: 6px 0;
    color: var(--user-text);
    font-size: 28px;
    font-weight: 900;
    line-height: 1.25;
    text-wrap: balance;
  }

  p {
    max-width: 62ch;
    margin: 0;
    color: var(--user-text-secondary);
    font-size: 14px;
    line-height: 1.65;
    text-wrap: pretty;
  }
}

.header-actions {
  flex: 0 0 auto;
}

.eyebrow,
.quick-label,
.status-group,
.focus-meta,
.tag-row,
.history-view-actions,
.card-actions,
.comparison-panel__actions,
.voice-history-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow,
.quick-label {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.view-tabs {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  padding: 4px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
}

.view-tab {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--user-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  transition: background-color 180ms ease, color 180ms ease;

  span {
    display: inline-grid;
    min-width: 18px;
    min-height: 18px;
    place-items: center;
    border-radius: 50%;
    background: var(--user-surface-muted);
    color: var(--user-text-muted);
    font-size: 11px;
  }

  &:hover {
    background: var(--user-surface-muted);
    color: var(--user-text);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 2px;
  }
}

.view-tab--active {
  background: var(--user-primary-soft);
  color: var(--user-primary);

  span {
    background: var(--user-primary);
    color: var(--user-primary-contrast);
  }
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
}

.summary-item {
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
  padding: 13px 16px;
  border-right: 1px solid var(--user-border);

  &:last-child {
    border-right: 0;
  }

  span,
  small {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    color: var(--user-text);
    font-size: 21px;
    line-height: 1;
  }

  small {
    grid-column: 1 / -1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.continue-view,
.history-view {
  min-width: 0;
}

.continue-stage {
  display: grid;
  min-height: 180px;
  align-items: center;
}

.page-alert {
  margin-bottom: 14px;
}

.focus-interview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(174px, auto);
  align-items: center;
  gap: 28px;
  padding: 24px;
  border: 1px solid var(--user-primary-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
}

.focus-content {
  min-width: 0;
}

.focus-heading,
.card-head,
.history-view-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.focus-heading .status-group,
.card-head .status-group {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.focus-interview h2 {
  max-width: 32ch;
  margin: 10px 0 8px;
  color: var(--user-text);
  font-size: 24px;
  font-weight: 900;
  line-height: 1.3;
  text-wrap: balance;
}

.focus-interview p {
  max-width: 66ch;
  margin: 0;
  color: var(--user-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.focus-meta {
  flex-wrap: wrap;
  margin-top: 16px;

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  span + span::before {
    margin-right: 8px;
    color: var(--user-border-strong);
    content: '·';
  }
}

.focus-action {
  display: grid;
  justify-items: stretch;
  gap: 12px;
}

.focus-action :deep(.el-button) {
  min-width: 174px;
  margin-left: 0;
}

.text-action {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--user-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;

  &:hover {
    color: var(--user-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--user-primary);
    outline-offset: 3px;
  }
}

.history-view {
  display: grid;
  gap: 16px;
}

.history-view-head {
  align-items: center;
  padding: 0 4px;

  h2 {
    margin: 0;
    color: var(--user-text);
    font-size: 20px;
    font-weight: 900;
    line-height: 1.3;
  }

  p {
    max-width: 62ch;
    margin: 5px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.history-view-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.history-panel {
  min-width: 0;
  padding: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-md);
  background: var(--user-surface);
  overflow: hidden;
}

.filter-drawer,
.comparison-panel,
.voice-insights {
  margin: 0;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: var(--user-surface-muted);
}

.filter-drawer summary,
.comparison-panel summary,
.voice-insights summary,
.record-details summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--user-text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  list-style: none;
}

.filter-drawer summary::-webkit-details-marker,
.comparison-panel summary::-webkit-details-marker,
.voice-insights summary::-webkit-details-marker,
.record-details summary::-webkit-details-marker {
  display: none;
}

.filter-drawer > summary,
.comparison-panel > summary,
.voice-insights > summary {
  min-height: 48px;
  padding: 0 18px;
}

.comparison-panel > summary {
  justify-content: flex-start;

  span {
    margin-left: auto;
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 700;
  }
}

.filter-drawer[open] > summary,
.comparison-panel[open] > summary,
.voice-insights[open] > summary {
  border-bottom: 1px solid var(--user-border);
  background: var(--user-surface);
  color: var(--user-text);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 18px 16px;
}

.filter-bar :deep(.el-input) {
  width: min(340px, 100%);
}

.filter-bar :deep(.el-select) {
  width: 168px;
}

.comparison-panel__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;

  p {
    max-width: 66ch;
    margin: 0;
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
}

.comparison-panel__actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.comparison-error {
  margin: 0 18px 16px;
}

.voice-insights {
  padding-bottom: 0;
}

.voice-insights > p {
  margin: 0;
  padding: 12px 18px 0;
  color: var(--user-text-muted);
  font-size: 12px;
}

.voice-trend-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 12px 18px 16px;
}

.voice-trend-list article {
  display: grid;
  grid-template-columns: minmax(94px, 0.7fr) minmax(92px, 0.7fr) minmax(86px, 0.7fr) minmax(120px, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  time,
  span {
    min-width: 0;
    color: var(--user-text-muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-text);
    font-size: 13px;
  }
}

.history-alert {
  margin: 14px 18px 0;
}

.history-list {
  display: grid;
  min-height: 280px;
  gap: 0;
  padding: 0 18px;
}

.history-list > .app-state {
  align-self: center;
}

.missing-report-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 16px 0 0;
  padding: 14px;
  border: 1px solid var(--user-primary-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-primary-soft);

  strong {
    color: var(--user-text);
    font-size: 14px;
  }

  p {
    margin: 4px 0 0;
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
}

.interview-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(104px, 0.22fr) minmax(250px, auto);
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;

  &:last-child {
    border-bottom: 0;
  }
}

.interview-card--selected {
  background: var(--user-primary-faint);
  box-shadow: 18px 0 0 var(--user-primary-faint), -18px 0 0 var(--user-primary-faint);
}

.card-main {
  min-width: 0;
}

.card-head h3 {
  margin: 4px 0 0;
  color: var(--user-text);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.4;
}

.card-time {
  color: var(--user-text-muted);
  font-size: 12px;
}

.tag-row {
  flex-wrap: wrap;
  margin-top: 9px;

  span {
    padding: 3px 7px;
    border: 1px solid var(--user-border);
    border-radius: 999px;
    background: var(--user-surface-muted);
    color: var(--user-text-secondary);
    font-size: 12px;
    line-height: 1.35;
  }
}

.record-details {
  margin-top: 10px;

  summary {
    width: fit-content;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  p {
    max-width: 72ch;
    margin: 8px 0 0;
    color: var(--user-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }
}

.voice-history-summary {
  flex-wrap: wrap;
  margin-top: 8px;
  color: var(--user-text-muted);
  font-size: 12px;
  line-height: 1.5;

  strong {
    color: var(--user-text-secondary);
  }
}

.score-panel {
  display: grid;
  align-content: center;
  gap: 3px;
  min-height: 72px;
  padding: 0 14px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-left: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;
  text-align: center;

  span,
  p {
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  strong {
    color: var(--user-text);
    font-size: 24px;
    line-height: 1.1;
  }

  p {
    margin: 0;
  }
}

.card-actions {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.card-actions :deep(.el-button) {
  margin-left: 0;
}

.card-primary-action {
  min-width: 122px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 18px;
  border-top: 1px solid var(--user-border);
  background: var(--user-surface-muted);
}

@media (max-width: 1040px) {
  .interview-card {
    grid-template-columns: minmax(0, 1fr) 110px;
  }

  .card-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .voice-trend-list {
    grid-template-columns: 1fr;
  }

  .voice-trend-list article:nth-last-child(-n + 2) {
    border-bottom: 1px solid var(--user-border);
  }

  .voice-trend-list article:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 760px) {
  .interview-history-page {
    gap: 18px;
    padding-bottom: 28px;
  }

  .history-header,
  .history-view-head,
  .focus-interview,
  .comparison-panel__content,
  .missing-report-guide {
    align-items: stretch;
    flex-direction: column;
  }

  .history-header,
  .history-view-head {
    display: flex;
  }

  .header-actions,
  .history-view-actions {
    justify-content: flex-start;
  }

  .focus-interview {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 18px;
  }

  .focus-action {
    justify-items: stretch;
  }

  .focus-action :deep(.el-button) {
    width: 100%;
  }

  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-item {
    border-bottom: 1px solid var(--user-border);

    &:nth-child(2n) {
      border-right: 0;
    }

    &:nth-last-child(-n + 2) {
      border-bottom: 0;
    }
  }

  .filter-bar :deep(.el-input),
  .filter-bar :deep(.el-select) {
    width: 100%;
  }

  .comparison-panel__content {
    display: flex;
  }

  .comparison-panel__actions {
    justify-content: flex-start;
  }

  .history-list {
    padding: 0 14px;
  }

  .interview-card {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .score-panel {
    grid-template-columns: auto auto minmax(0, 1fr);
    align-items: center;
    justify-content: start;
    gap: 8px;
    min-height: 0;
    padding: 10px 0;
    border-top: 1px solid var(--user-border);
    border-bottom: 1px solid var(--user-border);
    border-right: 0;
    border-left: 0;
    text-align: left;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .card-actions :deep(.el-button) {
    width: 100%;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}

@media (max-width: 480px) {
  .history-header h1 {
    font-size: 24px;
  }

  .summary-strip {
    grid-template-columns: 1fr;
  }

  .summary-item,
  .summary-item:nth-child(2n),
  .summary-item:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .summary-item:last-child {
    border-bottom: 0;
  }

  .view-tabs {
    width: 100%;
  }

  .view-tab {
    flex: 1 1 0;
    padding: 0 8px;
  }

  .focus-heading,
  .card-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .focus-heading .status-group,
  .card-head .status-group {
    justify-content: flex-start;
  }

  .voice-trend-list article {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .view-tab {
    transition: none;
  }
}
</style>
