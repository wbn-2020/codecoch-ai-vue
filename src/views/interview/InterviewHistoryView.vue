<template>
  <div class="interview-history-page page-shell">
    <section class="history-hero">
      <div>
        <div class="eyebrow">
          <History :size="16" />
          复盘路径中心
        </div>
        <h1>下一步从这里继续</h1>
        <p>优先处理未完成面试、生成中的报告和已出炉复盘，把每一轮面试接到下一次训练。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/tools')">
          <Wrench :size="16" />
          记录与工具
        </el-button>
        <el-button type="primary" @click="router.push('/interviews/create')">
          <Plus :size="16" />
          创建面试
        </el-button>
      </div>
    </section>

    <section class="metric-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <p>{{ metric.desc }}</p>
      </article>
    </section>

    <section v-if="voiceDeliveryTimeline.length" class="voice-trend-band">
      <div class="voice-trend-head">
        <div>
          <span class="quick-label">语音表达趋势</span>
          <h2>当前列表中的可比语音样本</h2>
        </div>
        <p>按分析完成时间正序，仅统计已成功持久化的真实指标。</p>
      </div>
      <div class="voice-trend-list">
        <article v-for="point in voiceDeliveryTimeline" :key="point.analysisId || point.interviewId">
          <time>{{ formatDateTime(point.occurredAt) }}</time>
          <strong>{{ Math.round(point.speakingRatePerMinute || 0) }} 字/分钟</strong>
          <span>填充词 {{ point.fillerCount ?? '-' }} 次</span>
          <span v-if="point.pauseMetricsAvailable">最长停顿 {{ point.longestPauseMs ?? 0 }} ms</span>
          <span v-else>停顿指标不可用</span>
        </article>
      </div>
    </section>

    <section v-if="focusInterview" class="next-step-panel">
      <div>
        <span class="quick-label">建议先处理</span>
        <h2>{{ focusInterview.interviewName || focusInterview.targetPosition || '未命名模拟面试' }}</h2>
        <p>{{ nextActionText(focusInterview) }}</p>
      </div>
      <el-button type="primary" size="large" @click="openPrimary(focusInterview)">
        {{ primaryActionLabel(focusInterview) }}
        <ChevronRight :size="16" />
      </el-button>
    </section>

    <section class="history-panel">
      <details class="filter-drawer">
        <summary>
          <Search :size="16" />
          筛一下复盘路径
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

      <section v-if="generatedReports.length" class="comparison-toolbar">
        <div>
          <span class="quick-label">跨场比较</span>
          <strong>已选择 {{ selectedComparisonCandidates.length }} / 10 轮</strong>
          <p>{{ comparisonSelectionHint }}</p>
        </div>
        <div class="comparison-toolbar__actions">
          <el-button
            v-if="selectedComparisonCandidates.length"
            :disabled="comparisonLoading"
            @click="clearComparisonSelection"
          >
            清空
          </el-button>
          <el-button
            type="primary"
            :loading="comparisonLoading"
            :disabled="!comparisonSelection.valid"
            @click="createComparison"
          >
            <GitCompareArrows :size="16" />
            比较所选记录
          </el-button>
        </div>
      </section>

      <el-alert
        v-if="comparisonError"
        class="history-alert"
        type="warning"
        :closable="false"
        show-icon
        title="暂时无法创建比较"
        :description="comparisonError"
      />

      <div v-loading="loading" class="history-list">
        <AppState
          v-if="loadError && !interviews.length && !loading"
          type="error"
          title="面试记录暂时不可用"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchInterviews">重试</el-button>
          <el-button @click="router.push('/interviews/create')">创建模拟面试</el-button>
        </AppState>

        <AppState
          v-else-if="!interviews.length && !loading"
          type="empty"
          title="还没有模拟面试记录"
          description="创建一次面试后，可以在这里继续进入房间、查看报告，并把薄弱点转成下一轮训练。"
        >
          <el-button type="primary" @click="router.push('/interviews/create')">创建模拟面试</el-button>
          <el-button @click="router.push('/onboarding')">先建立目标</el-button>
        </AppState>

        <section v-if="showMissingReportGuide" class="missing-report-guide">
          <div>
            <span class="quick-label">当前没有可查看的面试报告</span>
            <h2>先完成一次面试，再到报告页生成复盘</h2>
            <p>报告不会凭空生成：需要先进入面试房间完成答题，结束面试后点击“生成报告”。报告生成后会展示短板、推荐题和下一轮训练入口。</p>
          </div>
          <div class="missing-report-actions">
            <el-button type="primary" @click="openMissingReportGuidePrimary">
              {{ focusInterview && !isInterviewDone(focusInterview.status) ? '继续完成面试' : '去生成报告' }}
            </el-button>
            <el-button @click="router.push('/interviews/create')">新建一轮面试</el-button>
            <el-button plain @click="router.push('/questions/recommendations')">先练今日题组</el-button>
          </div>
        </section>

        <article
          v-for="item in interviews"
          :key="item.interviewId"
          class="interview-card"
          :class="{ 'interview-card--selected': isComparisonSelected(item) }"
        >
          <div class="card-main">
            <div class="card-head">
              <div>
                <span class="card-time">{{ formatDateTime(item.finishedAt || item.startedAt || item.createdAt) }}</span>
                <h2>{{ item.interviewName || item.targetPosition || '未命名模拟面试' }}</h2>
              </div>
              <div class="status-group">
                <el-tooltip
                  v-if="isReportSuccess(item.reportStatus)"
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
              </div>
            </div>

            <div class="tag-row">
              <span>{{ interviewModeLabel(item.interviewMode) }}</span>
              <span>{{ item.targetPosition || '目标岗位待补充' }}</span>
              <span>{{ item.industryDirection || '行业方向待补充' }}</span>
            </div>

            <div class="card-desc">
              <span class="next-action-chip">下一步：{{ primaryActionLabel(item) }}</span>
              <p>{{ nextActionText(item) }}</p>
              <div class="voice-history-summary">
                <strong>语音表达</strong>
                <span>{{ voiceDeliveryCompactText(item) }}</span>
              </div>
            </div>
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
const selectedComparisonCandidates = ref<InterviewHistoryComparisonCandidate[]>([])
const comparisonLoading = ref(false)
const comparisonError = ref('')
const comparisonIdempotencyKey = ref('')

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
    comparisonIdempotencyKey.value = ''
    await router.push({
      name: 'InterviewComparison',
      params: { id: result.id || 'preview' },
      query: { cacheKey }
    })
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
  loading.value = true
  loadError.value = ''
  try {
    const result = await getInterviewsApi(query)
    interviews.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    interviews.value = []
    total.value = 0
    loadError.value = getErrorMessage(error, '面试记录暂时加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

onMounted(fetchInterviews)
</script>

<style scoped lang="scss">
.interview-history-page {
  display: grid;
  gap: 20px;
}

.history-hero,
.metric-card,
.next-step-panel,
.history-panel,
.interview-card {
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;
}

.history-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;

  h1 {
    margin: 12px 0 10px;
    color: var(--user-text);
    font-size: 40px;
    line-height: 1.1;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--user-text-muted);
    font-size: 16px;
    line-height: 1.75;
  }
}

.eyebrow,
.hero-actions,
.filter-bar,
.card-head,
.status-group,
.tag-row,
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-actions,
.card-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 16px;

  span {
    color: var(--user-text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--user-text);
    font-size: 28px;
  }

  p {
    margin: 8px 0 0;
    color: var(--user-text-muted);
    line-height: 1.55;
  }
}

.voice-trend-band {
  display: grid;
  gap: 16px;
  padding: 20px 0;
  border-top: 1px solid var(--user-border);
  border-bottom: 1px solid var(--user-border);
}

.voice-trend-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;

  h2,
  p {
    margin: 0;
  }

  p {
    color: var(--user-text-muted);
  }
}

.voice-trend-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;

  article {
    display: grid;
    gap: 4px;
    min-width: 0;
    padding: 12px;
    border: 1px solid var(--user-border);
    border-radius: 6px;
    background: var(--user-surface-muted);
  }

  time,
  span {
    color: var(--user-text-muted);
  }
}

.next-step-panel,
.missing-report-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border-color: var(--user-primary-border);
  background: var(--user-surface-muted);

  h2 {
    margin: 6px 0 8px;
    color: var(--user-text);
    font-size: 22px;
    line-height: 1.25;
  }

  p {
    margin: 0;
    color: var(--user-text-muted);
    line-height: 1.65;
  }

  .el-button {
    flex: 0 0 auto;
  }
}

.missing-report-guide {
  border: 1px dashed var(--user-primary-border);
  background: var(--user-primary-soft);
  box-shadow: none;

  h2 {
    margin: 6px 0 8px;
    color: var(--user-text);
    font-size: 20px;
  }

  p {
    margin: 0;
    color: var(--user-text-secondary);
    line-height: 1.65;
  }
}

.missing-report-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.quick-label {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.history-panel {
  padding: 18px;
}

.history-alert {
  margin-bottom: 14px;
}

.comparison-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-soft);

  strong {
    display: block;
    margin-top: 5px;
    color: var(--user-text);
    font-size: 18px;
  }

  p {
    margin: 5px 0 0;
    color: var(--user-text-secondary);
    line-height: 1.55;
  }
}

.comparison-toolbar__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.filter-bar {
  flex-wrap: wrap;
  margin-top: 12px;

  :deep(.el-input) {
    width: min(340px, 100%);
  }

  :deep(.el-select) {
    width: 170px;
  }
}

.filter-drawer {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  summary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--user-text-secondary);
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }
}

.history-list {
  display: grid;
  min-height: 260px;
  gap: 14px;
}

.interview-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 16px;
  padding: 18px;
  box-shadow: none;
}

.interview-card--selected {
  border-color: var(--user-primary);
  box-shadow: 0 0 0 2px var(--user-primary-soft);
}

.comparison-checkbox-wrap {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
}

.card-main {
  min-width: 0;
}

.card-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 6px 0 0;
    color: var(--user-text);
    font-size: 20px;
    line-height: 1.3;
  }
}

.card-time {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.status-group {
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.tag-row {
  flex-wrap: wrap;
  margin-top: 12px;

  span {
    padding: 5px 9px;
    border: 1px solid var(--user-primary-border);
    border-radius: 999px;
    background: var(--user-primary-soft);
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 700;
  }
}

.card-desc {
  margin-top: 12px;

  p {
    margin: 8px 0 0;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.voice-history-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  margin-top: 10px;
  color: var(--user-text-muted);

  strong {
    color: var(--user-text);
  }
}

.next-action-chip {
  display: inline-flex;
  max-width: 100%;
  padding: 5px 9px;
  border: 1px solid var(--user-success-border);
  border-radius: 999px;
  background: var(--user-success-soft);
  color: var(--user-success);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.score-panel {
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  text-align: center;

  span {
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: var(--user-primary);
    font-size: 32px;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.45;
  }
}

.card-actions {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(180px, auto) repeat(2, auto);
  justify-content: end;
  padding-top: 14px;
  border-top: 1px solid var(--user-border);

  :deep(.el-button) {
    margin-left: 0;
  }
}

.card-primary-action {
  min-width: 180px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}

@media (max-width: 980px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .interview-card {
    grid-template-columns: 1fr;
  }

  .score-panel {
    justify-items: flex-start;
    text-align: left;
  }
}

@media (max-width: 720px) {
  .interview-history-page,
  .history-panel {
    min-width: 0;
  }

  .history-panel {
    overflow: hidden;
  }

  .history-hero,
  .card-head,
  .next-step-panel,
  .missing-report-guide,
  .comparison-toolbar {
    flex-direction: column;
  }

  .history-hero {
    padding: 18px;
  }

  .history-hero h1 {
    font-size: 30px;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar :deep(.el-select),
  .filter-bar :deep(.el-input) {
    width: 100%;
  }

  .hero-actions,
  .card-actions,
  .status-group {
    justify-content: flex-start;
  }

  .next-step-panel,
  .missing-report-guide,
  .comparison-toolbar {
    align-items: stretch;
  }

  .next-step-panel :deep(.el-button),
  .missing-report-actions :deep(.el-button),
  .hero-actions :deep(.el-button),
  .comparison-toolbar__actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .comparison-toolbar__actions {
    flex-direction: column;
  }

  .card-actions {
    grid-template-columns: 1fr;
  }

  .card-actions :deep(.el-button) {
    width: 100%;
    min-width: 0;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .pagination-wrap :deep(.el-pagination) {
    min-width: max-content;
  }
}

/* Compact history workspace */
.interview-history-page {
  gap: 14px;
  min-width: 0;
  color: var(--user-text);
}

.history-hero {
  align-items: flex-start;
  gap: 16px;
  padding: 16px 18px;

  h1 {
    margin: 6px 0;
    font-size: 24px;
  }

  p {
    max-width: 68ch;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.55;
  }
}

.eyebrow,
.quick-label {
  color: var(--user-primary);
}

.metric-grid {
  gap: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
  overflow: hidden;
}

.metric-grid .metric-card {
  min-height: 0;
  padding: 10px 14px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  &:last-child {
    border-right: 0;
  }

  strong {
    margin-top: 2px;
    font-size: 22px;
  }

  p {
    margin-top: 2px;
    font-size: 12px;
  }
}

.voice-trend-band {
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
}

.voice-trend-head {
  align-items: center;

  h2 {
    margin-top: 3px;
    font-size: 17px;
  }

  p {
    max-width: 54ch;
    color: var(--user-text-muted);
    font-size: 12px;
  }
}

.voice-trend-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border-top: 1px solid var(--user-border);

  article {
    display: grid;
    grid-template-columns: minmax(150px, 0.9fr) minmax(130px, 0.8fr) repeat(2, minmax(120px, 0.7fr));
    gap: 12px;
    align-items: center;
    padding: 9px 0;
    border: 0;
    border-bottom: 1px solid var(--user-border);
    border-radius: 0;
    background: transparent;

    &:last-child {
      border-bottom: 0;
    }
  }

  time,
  span {
    color: var(--user-text-muted);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  strong {
    color: var(--user-text);
  }
}

.next-step-panel,
.missing-report-guide,
.comparison-toolbar {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface-muted);
}

.next-step-panel h2,
.missing-report-guide h2 {
  margin: 3px 0;
  font-size: 18px;
}

.next-step-panel p,
.missing-report-guide p,
.comparison-toolbar p {
  margin-top: 3px;
  color: var(--user-text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.history-panel {
  min-width: 0;
  padding: 0;
  border: 1px solid var(--user-border);
  border-radius: var(--user-radius-sm);
  background: var(--user-surface);
  overflow: hidden;
}

.filter-drawer {
  margin: 0;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid var(--user-border);
  border-radius: 0;
  background: var(--user-surface-muted);
}

.filter-bar {
  gap: 8px;
}

.history-alert,
.comparison-toolbar,
.missing-report-guide {
  margin: 12px 14px 0;
}

.comparison-toolbar {
  background: var(--user-surface-tint);

  strong {
    margin-top: 3px;
    color: var(--user-text);
    font-size: 16px;
  }
}

.history-list {
  gap: 0;
  padding: 0 14px;
}

.history-list > .app-state,
.history-list > .missing-report-guide {
  margin-right: 0;
  margin-left: 0;
}

.interview-card {
  grid-template-columns: minmax(0, 1fr) minmax(92px, 0.24fr) minmax(280px, auto);
  gap: 14px;
  align-items: center;
  padding: 14px 0;
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
  border-color: var(--user-primary-border);
  background: var(--user-primary-faint);
  box-shadow: 14px 0 0 var(--user-primary-faint), -14px 0 0 var(--user-primary-faint);
}

.card-head {
  gap: 10px;
}

.card-head h2 {
  margin-top: 3px;
  font-size: 17px;
}

.status-group {
  gap: 6px;
}

.tag-row {
  margin-top: 8px;
}

.tag-row span {
  padding: 3px 7px;
  border-color: var(--user-border);
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
}

.card-desc {
  margin-top: 8px;

  p {
    margin-top: 5px;
    font-size: 13px;
    line-height: 1.5;
  }
}

.voice-history-summary {
  margin-top: 6px;
  font-size: 12px;
}

.score-panel {
  align-self: stretch;
  justify-content: center;
  padding: 8px 12px;
  border: 0;
  border-right: 1px solid var(--user-border);
  border-left: 1px solid var(--user-border);
  border-radius: 0;
  background: transparent;

  strong {
    font-size: 26px;
  }
}

.card-actions {
  grid-column: auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 0;
  border-top: 0;
}

.card-primary-action {
  min-width: 0;
}

.pagination-wrap {
  padding: 10px 14px;
  border-top: 1px solid var(--user-border);
  background: var(--user-surface-muted);
}

@media (max-width: 1120px) {
  .interview-card {
    grid-template-columns: minmax(0, 1fr) 100px;
  }

  .card-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
    padding-top: 10px;
    border-top: 1px solid var(--user-border);
  }
}

@media (max-width: 760px) {
  .history-hero {
    padding: 14px;
  }

  .metric-grid {
    grid-template-columns: 1fr 1fr;
  }

  .metric-grid .metric-card {
    border-right: 1px solid var(--user-border);
    border-bottom: 1px solid var(--user-border);
  }

  .metric-grid .metric-card:nth-child(2n) {
    border-right: 0;
  }

  .metric-grid .metric-card:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .voice-trend-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .voice-trend-list article {
    grid-template-columns: 1fr 1fr;
    gap: 5px 10px;
  }

  .history-list {
    padding: 0 12px;
  }

  .interview-card {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .score-panel {
    align-items: center;
    justify-items: start;
    grid-template-columns: auto auto 1fr;
    gap: 8px;
    padding: 8px 0;
    border-right: 0;
    border-left: 0;
    border-top: 1px solid var(--user-border);
    border-bottom: 1px solid var(--user-border);
    text-align: left;
  }

  .score-panel strong {
    font-size: 20px;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid .metric-card,
  .metric-grid .metric-card:nth-child(2n),
  .metric-grid .metric-card:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--user-border);
  }

  .metric-grid .metric-card:last-child {
    border-bottom: 0;
  }

  .voice-trend-list article {
    grid-template-columns: 1fr;
  }
}
</style>
