<template>
  <div class="interview-history-page page-shell">
    <section class="history-hero">
      <div>
        <div class="eyebrow">
          <History :size="16" />
          模拟面试记录
        </div>
        <h1>按复盘路径回看每一轮面试</h1>
        <p>这里按复盘路径组织每一轮记录，方便继续面试、查看报告、重练短板。</p>
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

    <section class="history-panel">
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

      <el-alert
        v-if="loadError"
        class="history-alert"
        type="warning"
        :closable="false"
        show-icon
        :title="loadError"
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

        <article v-for="item in interviews" :key="item.interviewId" class="interview-card">
          <div class="card-main">
            <div class="card-head">
              <div>
                <span class="card-time">{{ formatDateTime(item.finishedAt || item.startedAt || item.createdAt) }}</span>
                <h2>{{ item.interviewName || item.targetPosition || '未命名模拟面试' }}</h2>
              </div>
              <div class="status-group">
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
              <p>{{ nextActionText(item) }}</p>
            </div>
          </div>

          <aside class="score-panel">
            <span>报告得分</span>
            <strong>{{ displayInterviewScore(item) }}</strong>
            <p>{{ scoreHint(item) }}</p>
          </aside>

          <div class="card-actions">
            <el-button type="primary" @click="openPrimary(item)">
              {{ primaryActionLabel(item) }}
              <ChevronRight :size="16" />
            </el-button>
            <el-button @click="router.push(`/interviews/room/${item.interviewId}`)">
              <MessageSquare :size="16" />
              面试房间
            </el-button>
            <el-button :disabled="!canOpenReportPage(item)" @click="router.push(`/interviews/${item.interviewId}/report`)">
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
import { ChevronRight, FileText, History, MessageSquare, Plus, RefreshCw, Search, Wrench } from 'lucide-vue-next'

import { getInterviewsApi } from '@/api/interview'
import AppState from '@/components/common/AppState.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import { interviewModeOptions } from '@/constants/enums'
import type { InterviewListVO, InterviewQueryDTO } from '@/types/interview'
import { getErrorMessage } from '@/utils/error'

interface SelectOption {
  label: string
  value: string
}

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const interviews = ref<InterviewListVO[]>([])
const total = ref(0)

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
const activeInterviews = computed(() => interviews.value.filter((item) => !isInterviewDone(item.status)))
const averageScore = computed(() => {
  const scores = generatedReports.value
    .map((item) => Number(item.totalScore))
    .filter((score) => Number.isFinite(score) && score > 0)
  if (!scores.length) return '-'
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})

const metrics = computed(() => [
  { label: '全部记录', value: total.value || interviews.value.length, desc: '你的累计面试记录' },
  { label: '本页已出报告', value: generatedReports.value.length, desc: '可以直接进入报告复盘' },
  { label: '本页平均分', value: averageScore.value, desc: '只统计已生成且有分数的报告' },
  { label: '可继续面试', value: activeInterviews.value.length, desc: '未完成记录可回到面试房间' }
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
  return '面试已结束但报告未生成，可以进入详情或房间确认当前状态。'
}

const primaryActionLabel = (row: InterviewListVO) => {
  if (!isInterviewDone(row.status)) return '继续面试'
  if (isReportSuccess(row.reportStatus)) return '查看复盘'
  if (isReportInProgress(row.reportStatus)) return '查看进度'
  if (isReportFailed(row.reportStatus)) return '查看失败'
  if (canSubmitOrViewReport(row.status)) return '生成报告'
  return '查看详情'
}

const reportActionLabel = (row: InterviewListVO) => {
  if (isReportInProgress(row.reportStatus)) return '查看进度'
  if (isReportFailed(row.reportStatus)) return '查看失败'
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
.history-panel,
.interview-card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--app-shadow);
}

.history-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 28px;

  h1 {
    margin: 12px 0 10px;
    color: var(--app-text);
    font-size: 40px;
    line-height: 1.1;
  }

  p {
    max-width: 760px;
    margin: 0;
    color: var(--app-text-muted);
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
  color: #2563eb;
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
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--app-text);
    font-size: 28px;
  }

  p {
    margin: 8px 0 0;
    color: var(--app-text-muted);
    line-height: 1.55;
  }
}

.history-panel {
  padding: 18px;
}

.history-alert {
  margin-bottom: 14px;
}

.filter-bar {
  flex-wrap: wrap;
  margin-bottom: 16px;

  :deep(.el-input) {
    width: min(340px, 100%);
  }

  :deep(.el-select) {
    width: 170px;
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

.card-main {
  min-width: 0;
}

.card-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h2 {
    margin: 6px 0 0;
    color: var(--app-text);
    font-size: 20px;
    line-height: 1.3;
  }
}

.card-time {
  color: #2563eb;
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
    border: 1px solid #dbeafe;
    border-radius: 999px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 700;
  }
}

.card-desc {
  margin-top: 12px;

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.score-panel {
  display: grid;
  align-content: center;
  justify-items: center;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;

  span {
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    margin-top: 6px;
    color: #2563eb;
    font-size: 32px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.45;
  }
}

.card-actions {
  grid-column: 1 / -1;
  padding-top: 14px;
  border-top: 1px solid var(--app-border);
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
  .card-head {
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

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 4px;
  }

  .pagination-wrap :deep(.el-pagination) {
    min-width: max-content;
  }
}
</style>
