<template>
  <div class="interview-report page-shell">
    <section class="report-top">
      <div>
        <div class="eyebrow">
          <ChartNoAxesCombined :size="16" />
          AI Interview Report
        </div>
        <h1>结构化 AI 面试报告</h1>
        <p>报告内容全部来自后端 report 接口；缺失维度显示空状态，不在前端补造评分或建议。</p>
      </div>
      <div class="report-actions">
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          工作台
        </el-button>
        <el-button @click="router.push('/interviews/history')">
          <History :size="16" />
          返回历史
        </el-button>
        <el-button v-if="interviewId" type="primary" @click="router.push('/interviews/create')">
          <RotateCcw :size="16" />
          重新面试
        </el-button>
      </div>
    </section>

    <section v-if="isGenerating" class="content-card">
      <div class="content-card__body generating-panel">
        <el-icon class="generating-icon"><Loading /></el-icon>
        <h2>阶段式报告生成进度</h2>
        <p>{{ sseMessage || '系统正在根据真实问答记录生成结构化报告，当前展示后端阶段事件。' }}</p>
        <el-progress :percentage="pollProgress" :show-text="false" />
        <div class="sse-stage-list">
          <article v-for="item in sseEvents" :key="item.key" class="sse-stage-item">
            <span>{{ item.event }}</span>
            <strong>{{ item.stage || item.message || '-' }}</strong>
            <p>{{ item.message || item.stage || '-' }}</p>
          </article>
        </div>
        <div v-if="sseMetaText" class="sse-meta">{{ sseMetaText }}</div>
      </div>
    </section>

    <section v-else class="content-card" v-loading="loading">
      <div v-if="report && isGenerated" class="content-card__body">
        <div class="overview-grid">
          <div class="score-hero">
            <span>综合得分</span>
            <strong>{{ report.totalScore ?? 0 }}</strong>
            <StatusTag :status="report.reportStatus" />
          </div>
          <div class="overview-card">
            <span>面试编号</span>
            <strong>#{{ report.interviewId || interviewId }}</strong>
          </div>
          <div class="overview-card">
            <span>生成时间</span>
            <strong>{{ report.generatedAt || report.createdAt || '-' }}</strong>
          </div>
          <div class="overview-card">
            <span>题目明细</span>
            <strong>{{ qaMessages.length }} 条</strong>
          </div>
        </div>

        <el-alert
          class="score-source"
          type="info"
          show-icon
          :closable="false"
          title="总分来源于后端面试报告 totalScore 字段；为空时按 0 分展示，不在前端重新计算。"
        />

        <div class="dimension-section">
          <div class="section-head">
            <h2>评分维度</h2>
            <p>优先展示后端 stageReports/stageScores；无拆分维度时显示空状态。</p>
          </div>
          <ReportChart v-if="stageReports.length" :stages="stageReports" />
          <el-empty v-else description="暂无维度评分数据" />
        </div>
      </div>

      <div v-else-if="isFailed" class="content-card__body failed-panel">
        <el-alert
          type="error"
          show-icon
          :closable="false"
          title="报告生成失败"
          :description="failureReason"
        />
        <div class="retry-row">
          <el-button type="primary" :loading="retrying || sseGenerating" :disabled="sseGenerating" @click="handleRetry">重新生成报告</el-button>
          <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        </div>
      </div>

      <el-empty v-else-if="!loading" description="报告暂不可用，可能仍在生成中" />
    </section>

    <section v-if="report && isGenerated" class="analysis-grid">
      <article class="analysis-card wide">
        <div class="section-head">
          <h2>AI 总结</h2>
          <p>整体评价 / 报告正文</p>
        </div>
        <MarkdownPreview v-if="report.reportContent || report.summary" :content="report.reportContent || report.summary" />
        <el-empty v-else description="暂无总结" />
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>表现亮点</h2>
        </div>
        <MarkdownPreview v-if="report.strengths" :content="report.strengths" />
        <el-empty v-else description="暂无亮点数据" />
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>明显短板</h2>
        </div>
        <MarkdownPreview v-if="report.mainProblems || report.weaknesses" :content="report.mainProblems || report.weaknesses" />
        <el-empty v-else description="暂无短板数据" />
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>建议提升方向</h2>
        </div>
        <MarkdownPreview v-if="report.reviewSuggestions || report.suggestions" :content="report.reviewSuggestions || report.suggestions" />
        <el-empty v-else description="暂无建议数据" />
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>薄弱知识点</h2>
        </div>
        <MarkdownPreview v-if="weakPointText" :content="weakPointText" />
        <el-empty v-else description="暂无薄弱知识点" />
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>项目表达问题</h2>
        </div>
        <MarkdownPreview
          v-if="report.projectProblems || report.projectExpressionProblems"
          :content="report.projectProblems || report.projectExpressionProblems"
        />
        <el-empty v-else description="暂无项目表达问题" />
      </article>
    </section>

    <section v-if="stageReports.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>阶段得分</h2>
          <p>阶段名、类型、得分、总结、短板与建议均来自后端报告。</p>
        </div>
        <el-table :data="stageReports" row-key="stageId">
          <el-table-column prop="stageName" label="阶段" min-width="160" />
          <el-table-column prop="stageType" label="类型" min-width="140" />
          <el-table-column prop="score" label="得分" width="90" />
          <el-table-column prop="summary" label="总结" min-width="220" show-overflow-tooltip />
          <el-table-column prop="weaknesses" label="短板" min-width="220" show-overflow-tooltip />
          <el-table-column prop="suggestions" label="建议" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <section v-if="qaMessages.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>题目明细</h2>
          <p>展示后端返回的问题、回答、AI 评分、点评、推荐方向和追问记录。</p>
        </div>
        <div class="qa-list">
          <article v-for="message in qaMessages" :key="message.messageId" class="qa-item">
            <div class="qa-head">
              <div>
                <strong>{{ message.questionContent ? '面试题' : message.role }}</strong>
                <el-tag v-if="message.isFollowUp" size="small" type="warning" effect="plain">追问</el-tag>
              </div>
              <span>{{ message.score ?? '-' }} 分</span>
            </div>
            <div class="qa-block">
              <label>问题</label>
              <MarkdownPreview :content="message.questionContent || message.content || '暂无问题内容'" />
            </div>
            <div v-if="message.userAnswer" class="qa-block">
              <label>用户回答</label>
              <p>{{ message.userAnswer }}</p>
            </div>
            <div v-if="message.aiComment" class="qa-block">
              <label>AI 点评</label>
              <MarkdownPreview :content="message.aiComment" />
            </div>
            <div v-if="message.followUpReason" class="qa-block">
              <label>追问记录</label>
              <p>{{ message.followUpReason }}</p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="isGenerated" class="content-card">
      <div class="content-card__body action-zone">
        <div>
          <h2>下一步行动</h2>
          <p>仅启用已有真实路由；未接入能力明确标注待接入。</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="router.push('/interviews/create')">
            <RotateCcw :size="16" />
            重新面试
          </el-button>
          <el-button :disabled="!firstRecommendedQuestionPath" @click="goPracticeQuestion">
            <BookOpenCheck :size="16" />
            练习相关题目
          </el-button>
          <el-button type="success" plain :loading="studyPlanGenerating" @click="handleGenerateStudyPlan">
            <CalendarClock :size="16" />
            生成学习计划
          </el-button>
          <el-button @click="router.push('/dashboard')">返回工作台</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { BookOpenCheck, CalendarClock, ChartNoAxesCombined, History, LayoutDashboard, RotateCcw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  finishInterviewApi,
  getInterviewReportApi,
  retryInterviewReportApi,
  streamInterviewReportApi
} from '@/api/interview'
import { generateStudyPlanApi } from '@/api/studyPlan'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import type {
  InterviewMessageVO,
  InterviewReportSseEvent,
  InterviewReportSseEventType,
  InterviewReportVO,
  RecommendedQuestionVO,
  StageReportVO
} from '@/types/interview'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const retrying = ref(false)
const studyPlanGenerating = ref(false)
const report = ref<InterviewReportVO | null>(null)
const pollCount = ref(0)
const pollFailures = ref(0)
const sseGenerating = ref(false)
const sseMessage = ref('')
const sseReportId = ref<number | undefined>()
const sseAiCallLogId = ref<number | undefined>()
const sseEvents = ref<Array<{ key: string; event: string; stage?: string; message?: string }>>([])
let pollTimer: number | undefined
let reportSseHandle: ReturnType<typeof streamInterviewReportApi> | null = null

const normalizedStatus = computed(() => {
  const status = report.value?.reportStatus || report.value?.status || ''
  return String(status).toUpperCase()
})

const isGenerating = computed(() => sseGenerating.value || ['GENERATING', 'REPORT_GENERATING'].includes(normalizedStatus.value))
const isFailed = computed(() => normalizedStatus.value === 'FAILED')
const isGenerated = computed(() => {
  if (['GENERATED', 'COMPLETED'].includes(normalizedStatus.value)) return true
  return Boolean(report.value?.totalScore || report.value?.summary || report.value?.reportContent)
})

const objectItems = <T>(value: unknown): T[] => {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as T[])
    : []
}

const stageReports = computed<StageReportVO[]>(() => objectItems<StageReportVO>(report.value?.stageReports || report.value?.stageScores))
const recommendedQuestions = computed<RecommendedQuestionVO[]>(() => objectItems<RecommendedQuestionVO>(report.value?.recommendedQuestions))
const qaMessages = computed<InterviewMessageVO[]>(() =>
  objectItems<InterviewMessageVO>(report.value?.questionReviews || report.value?.qaReview || report.value?.messages)
)
const pollProgress = computed(() => Math.min(100, Math.round((pollCount.value / 30) * 100)))
const failureReason = computed(() => report.value?.failedReason || report.value?.failureReason || report.value?.errorMessage || '请稍后重试')
const sseMetaText = computed(() => {
  const items = []
  if (sseReportId.value) items.push(`reportId: ${sseReportId.value}`)
  if (sseAiCallLogId.value) items.push(`aiCallLogId: ${sseAiCallLogId.value}`)
  return items.join(' / ')
})

const weakPointText = computed(() => {
  const value = report.value?.weakPoints || report.value?.weakKnowledgePoints
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => `- ${item}`).join('\n') : ''
  }
  return value || ''
})

const firstRecommendedQuestionPath = computed(() => {
  const first = recommendedQuestions.value.find((item) => item.questionId || item.id)
  const id = first?.questionId || first?.id
  return id ? `/questions/${id}` : ''
})

const goPracticeQuestion = async () => {
  if (!firstRecommendedQuestionPath.value) {
    ElMessage.info('暂无可跳转的推荐题目')
    return
  }
  await router.push(firstRecommendedQuestionPath.value)
}

const stopPolling = () => {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
}

const stopReportSse = () => {
  reportSseHandle?.abort()
  reportSseHandle = null
  sseGenerating.value = false
}

const resetSseState = () => {
  sseMessage.value = ''
  sseReportId.value = undefined
  sseAiCallLogId.value = undefined
  sseEvents.value = []
  pollCount.value = 0
}

const schedulePolling = () => {
  stopPolling()
  if (!isGenerating.value) return
  if (pollCount.value >= 30) {
    ElMessage.warning('报告生成时间较长，请稍后刷新查看')
    return
  }
  pollTimer = window.setTimeout(fetchReport, 2000)
}

const fetchReport = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    report.value = await getInterviewReportApi(interviewId)
    pollFailures.value = 0
    if (isGenerating.value) {
      pollCount.value += 1
      schedulePolling()
    } else {
      stopPolling()
    }
  } catch (error) {
    pollFailures.value += 1
    if (pollFailures.value >= 3) {
      stopPolling()
      ElMessage.error('报告状态查询失败，请稍后刷新')
    } else {
      schedulePolling()
    }
  } finally {
    loading.value = false
  }
}

const refreshFinalReport = async () => {
  if (!interviewId) return
  report.value = await getInterviewReportApi(interviewId)
  stopPolling()
}

const runSyncFallback = async (forceRegenerate: boolean) => {
  if (!interviewId) return
  const id = interviewId
  retrying.value = forceRegenerate
  try {
    if (forceRegenerate) {
      await retryInterviewReportApi(id)
    } else {
      await finishInterviewApi(id)
    }
    report.value = {
      interviewId: id,
      reportStatus: 'GENERATING',
      status: 'GENERATING'
    }
    pollFailures.value = 0
    schedulePolling()
  } finally {
    retrying.value = false
  }
}

const applySseEvent = (event: InterviewReportSseEventType | string, data?: InterviewReportSseEvent) => {
  const message = data?.message || ''
  const stage = data?.stage ? String(data.stage) : ''
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}
  const reportId = data?.reportId || Number(metadata.reportId || 0)
  const aiCallLogId = data?.aiCallLogId || Number(metadata.aiCallLogId || 0)
  if (reportId) sseReportId.value = reportId
  if (aiCallLogId) sseAiCallLogId.value = aiCallLogId
  if (data?.result && typeof data.result === 'object') {
    const result = data.result as Partial<InterviewReportVO>
    if (result.reportId || result.id) sseReportId.value = result.reportId || result.id
  }
  sseMessage.value = message || stage || sseMessage.value
  sseEvents.value.push({
    key: `${Date.now()}-${sseEvents.value.length}`,
    event,
    stage,
    message
  })
  pollCount.value = Math.min(30, pollCount.value + (event === 'progress' || event === 'delta' ? 5 : 2))
}

const startReportSse = (forceRegenerate = false) => {
  if (!interviewId || sseGenerating.value) return
  const id = interviewId
  stopPolling()
  stopReportSse()
  resetSseState()
  sseGenerating.value = true
  report.value = {
    ...(report.value || {}),
    interviewId: id,
    reportId: report.value?.reportId || report.value?.id,
    reportStatus: 'GENERATING',
    status: 'GENERATING'
  }

  reportSseHandle = streamInterviewReportApi(
    {
      interviewId: id,
      reportId: report.value?.reportId || report.value?.id,
      forceRegenerate
    },
    {
      onEvent: async (event, data) => {
        applySseEvent(event, data)
        if ((event === 'result' || event === 'done') && data?.result && typeof data.result === 'object') {
          report.value = {
            ...(data.result as InterviewReportVO),
            interviewId: id,
            reportStatus: 'GENERATING',
            status: 'GENERATING'
          }
        }
        if (event === 'done') {
          sseGenerating.value = false
          await refreshFinalReport()
          ElMessage.success('报告生成完成')
        }
      },
      onError: async (error, hasStarted) => {
        sseGenerating.value = false
        reportSseHandle = null
        if (!hasStarted) {
          ElMessage.warning('SSE 启动失败，已回退到同步报告接口')
          await runSyncFallback(forceRegenerate)
          return
        }
        report.value = {
          ...(report.value || {}),
          interviewId: id,
          reportStatus: 'FAILED',
          status: 'FAILED',
          failedReason: error.message
        }
        ElMessage.error(error.message || '报告 SSE 生成失败')
      },
      onDone: () => {
        sseGenerating.value = false
        reportSseHandle = null
      }
    }
  )
  void reportSseHandle.finished.catch(() => undefined)
}

const loadReportOrStartSse = async () => {
  if (!interviewId) return
  loading.value = true
  try {
    report.value = await getInterviewReportApi(interviewId)
    pollFailures.value = 0
    if (isGenerated.value || isFailed.value) {
      stopPolling()
      return
    }
    startReportSse(false)
  } catch {
    startReportSse(false)
  } finally {
    loading.value = false
  }
}

const handleRetry = async () => {
  if (!interviewId) return
  startReportSse(true)
}

const handleGenerateStudyPlan = async () => {
  const reportId = report.value?.reportId || report.value?.id
  if (!reportId) {
    ElMessage.warning('当前报告缺少 reportId，无法生成学习计划')
    return
  }
  studyPlanGenerating.value = true
  try {
    const result = await generateStudyPlanApi({ reportId })
    if (result.planStatus === 'FAILED') {
      ElMessage.error(result.failureReason || '学习计划生成失败，请稍后重试')
    } else {
      ElMessage.success('学习计划已生成')
    }
    await router.push(`/study-plans?planId=${result.planId || ''}`)
  } finally {
    studyPlanGenerating.value = false
  }
}

onMounted(loadReportOrStartSse)
onBeforeUnmount(() => {
  stopPolling()
  stopReportSse()
})
</script>

<style scoped lang="scss">
.interview-report {
  color: var(--app-text);
}

.report-top,
.analysis-card {
  border: 1px solid var(--app-border);
  border-radius: var(--cc-radius-xl);
  background: rgba(15, 23, 42, 0.78);
  box-shadow: var(--app-shadow);
  backdrop-filter: blur(18px);
}

.report-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  padding: 24px;

  h1 {
    margin: 8px 0;
    font-size: 30px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.65;
  }
}

.eyebrow,
.report-actions,
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.eyebrow {
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.report-actions,
.action-buttons {
  justify-content: flex-end;
}

.generating-panel,
.failed-panel {
  padding: 42px 24px;
  text-align: center;
}

.generating-panel {
  h2 {
    margin: 12px 0 8px;
    font-size: 22px;
  }

  p {
    margin: 0 auto 18px;
    color: var(--app-text-muted);
  }
}

.generating-icon {
  color: var(--app-primary);
  font-size: 36px;
  animation: spin 1.1s linear infinite;
}

.sse-stage-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  text-align: left;
}

.sse-stage-item {
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.38);

  span {
    color: var(--cc-ai-cyan);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--app-text);
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
  }
}

.sse-meta {
  margin-top: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: 1.3fr repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.score-hero,
.overview-card {
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.36);
  padding: 18px;

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    display: block;
    margin-top: 10px;
    font-size: 22px;
    line-height: 1.2;
  }
}

.score-hero {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(6, 182, 212, 0.08));

  strong {
    margin: 8px 0 12px;
    font-size: 52px;
    line-height: 1;
  }
}

.score-source,
.retry-row {
  margin: 16px 0;
}

.dimension-section {
  margin-top: 20px;
}

.section-head {
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.analysis-card {
  padding: 18px;

  &.wide {
    grid-column: 1 / -1;
  }
}

.qa-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.qa-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: rgba(2, 6, 23, 0.34);
}

.qa-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  span {
    color: var(--cc-ai-cyan);
    font-weight: 700;
  }
}

.qa-block {
  padding: 12px 0;
  border-top: 1px solid var(--app-border);

  label {
    display: block;
    margin-bottom: 8px;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  p {
    margin: 0;
    color: var(--app-text);
    line-height: 1.7;
    white-space: pre-wrap;
  }
}

.action-zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
  }
}

@media (max-width: 1080px) {
  .overview-grid,
  .analysis-grid {
    grid-template-columns: 1fr 1fr;
  }

  .score-hero {
    grid-column: 1 / -1;
  }

  .action-zone {
    align-items: flex-start;
    flex-direction: column;
  }

  .action-buttons {
    justify-content: flex-start;
  }
}

@media (max-width: 760px) {
  .report-top {
    flex-direction: column;
  }

  .report-actions {
    justify-content: flex-start;
  }

  .overview-grid,
  .analysis-grid {
    grid-template-columns: 1fr;
  }
}
</style>
