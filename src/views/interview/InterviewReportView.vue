<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">面试报告</h1>
        <p class="page-subtitle">展示总分、阶段得分、知识薄弱点、复习建议和完整问答明细。</p>
      </div>
      <div class="header-actions">
        <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        <el-button v-if="interviewId" @click="router.push(`/interviews/${interviewId}`)">面试详情</el-button>
      </div>
    </div>

    <section v-if="isGenerating" class="content-card">
      <div class="content-card__body generating-panel">
        <el-icon class="generating-icon"><Loading /></el-icon>
        <h2>报告生成中，请稍候</h2>
        <p>系统正在根据问答记录生成结构化报告，页面会自动刷新结果。</p>
        <el-progress :percentage="pollProgress" :show-text="false" />
      </div>
    </section>

    <section v-else class="content-card" v-loading="loading">
      <div v-if="report && isGenerated" class="content-card__body">
        <div class="report-hero">
          <div>
            <div class="score">{{ report.totalScore ?? 0 }}</div>
            <p>综合得分</p>
            <p class="generated-time">生成时间：{{ report.generatedAt || report.createdAt || '-' }}</p>
          </div>
          <StatusTag :status="report.reportStatus" />
        </div>

        <el-alert
          class="score-source"
          type="info"
          show-icon
          :closable="false"
          title="总分来源于后端面试报告 totalScore 字段；为空时按 0 分展示，不在前端重新计算。"
        />

        <ReportChart v-if="stageReports.length" :stages="stageReports" />
        <el-empty v-else description="暂无阶段得分数据" />

        <div class="report-grid">
          <section class="report-section">
            <h2>AI 总结</h2>
            <MarkdownPreview :content="report.reportContent || report.summary || '暂无总结'" />
          </section>
          <section class="report-section">
            <h2>回答亮点</h2>
            <MarkdownPreview :content="report.strengths || '暂无亮点'" />
          </section>
          <section class="report-section">
            <h2>主要问题</h2>
            <MarkdownPreview :content="report.mainProblems || report.weaknesses || '暂无问题'" />
          </section>
          <section class="report-section">
            <h2>复习建议</h2>
            <MarkdownPreview :content="report.reviewSuggestions || report.suggestions || '暂无建议'" />
          </section>
          <section class="report-section">
            <h2>薄弱知识点</h2>
            <MarkdownPreview :content="weakPointText" />
          </section>
          <section class="report-section">
            <h2>项目表达问题</h2>
            <MarkdownPreview :content="report.projectProblems || report.projectExpressionProblems || '暂无项目表达问题'" />
          </section>
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
          <el-button type="primary" :loading="retrying" @click="handleRetry">重新生成报告</el-button>
          <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        </div>
      </div>

      <el-empty v-else-if="!loading" description="报告暂不可用，可能仍在生成中" />
    </section>

    <section v-if="stageReports.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">阶段得分</h2>
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

    <section v-if="recommendedQuestions.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">推荐练习题</h2>
        <el-table :data="recommendedQuestions" row-key="id">
          <el-table-column prop="title" label="题目" min-width="220" show-overflow-tooltip />
          <el-table-column prop="difficulty" label="难度" width="110" />
          <el-table-column prop="reason" label="推荐原因" min-width="260" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <section v-if="qaMessages.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <h2 class="section-title">完整问答明细</h2>
        <div class="message-list">
          <article v-for="message in qaMessages" :key="message.messageId" class="message-item">
            <div class="message-item__head">
              <strong>{{ message.role }}</strong>
              <span>{{ message.score ?? '-' }} 分</span>
            </div>
            <MarkdownPreview :content="message.questionContent || message.content" />
            <p v-if="message.userAnswer"><strong>回答：</strong>{{ message.userAnswer }}</p>
            <p v-if="message.aiComment"><strong>点评：</strong>{{ message.aiComment }}</p>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getInterviewReportApi, retryInterviewReportApi } from '@/api/interview'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import type { InterviewMessageVO, InterviewReportVO, RecommendedQuestionVO, StageReportVO } from '@/types/interview'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const retrying = ref(false)
const report = ref<InterviewReportVO | null>(null)
const pollCount = ref(0)
const pollFailures = ref(0)
let pollTimer: number | undefined

const normalizedStatus = computed(() => {
  const status = report.value?.reportStatus || report.value?.status || ''
  return String(status).toUpperCase()
})

const isGenerating = computed(() => ['GENERATING', 'REPORT_GENERATING'].includes(normalizedStatus.value))
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

const weakPointText = computed(() => {
  const value = report.value?.weakPoints || report.value?.weakKnowledgePoints
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => `- ${item}`).join('\n') : '暂无薄弱知识点'
  }
  return value || '暂无薄弱知识点'
})

const stopPolling = () => {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
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

const handleRetry = async () => {
  if (!interviewId) return
  retrying.value = true
  try {
    await retryInterviewReportApi(interviewId)
    ElMessage.success('已提交报告重新生成任务')
    report.value = {
      interviewId,
      reportStatus: 'GENERATING',
      status: 'GENERATING'
    }
    pollCount.value = 0
    pollFailures.value = 0
    schedulePolling()
  } finally {
    retrying.value = false
  }
}

onMounted(fetchReport)
onBeforeUnmount(stopPolling)
</script>

<style scoped lang="scss">
.header-actions {
  display: flex;
  gap: 10px;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.report-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.score {
  color: var(--app-primary);
  font-size: 44px;
  font-weight: 800;
  line-height: 1;
}

.generated-time {
  margin: 6px 0 0;
  color: var(--app-text-muted);
  font-size: 13px;
}

.retry-row,
.score-source {
  margin: 16px 0;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.report-section {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  h2 {
    margin: 0 0 10px;
    font-size: 17px;
  }
}

.section-title {
  margin: 0 0 16px;
  font-size: 18px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message-item {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);

  p {
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.message-item__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

@media (max-width: 860px) {
  .report-grid {
    grid-template-columns: 1fr;
  }
}
</style>
