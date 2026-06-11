<template>
  <div class="interview-report page-shell">
    <section class="report-top">
      <div>
        <div class="eyebrow">
          <ChartNoAxesCombined :size="16" />
          面试复盘
        </div>
        <h1>结构化 AI 面试报告</h1>
        <p>看清这轮面试哪里说得好、哪里要补强、下一步该练什么。</p>
      </div>
      <div class="report-actions">
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          今日计划
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
        <h2>报告生成中</h2>
        <p>{{ generatingMessage }}</p>
        <el-alert
          v-if="reportRecoveryNotice"
          class="report-recovery-alert"
          type="warning"
          show-icon
          :closable="false"
          title="报告读取暂时不可用"
          :description="reportRecoveryNotice"
        />
        <el-progress :percentage="pollProgress" :show-text="false" />
        <div class="task-stage-list">
          <article v-for="item in generatingStages" :key="item.key" class="task-stage-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </article>
        </div>
        <div v-if="taskMetaText" class="task-meta">{{ taskMetaText }}</div>
        <div class="async-diagnostics">
          <span v-if="asyncReceipt.messageId">生成任务已提交</span>
          <span v-if="asyncReceipt.traceId">处理线索已记录</span>
          <span>面试记录已绑定</span>
          <span v-if="asyncReceipt.sendStatus">提交状态 {{ asyncSendStatusLabel(asyncReceipt.sendStatus) }}</span>
        </div>
        <div class="generating-actions">
          <el-button type="primary" @click="goReportTaskCenter">
            <ListChecks :size="16" />
            去任务中心查看
          </el-button>
          <el-button @click="router.push('/interviews/history')">
            <History :size="16" />
            稍后回来
          </el-button>
        </div>
      </div>
    </section>

    <section v-else class="content-card" v-loading="loading">
      <div v-if="report && isGenerated" class="content-card__body">
        <div class="overview-grid">
          <div class="score-hero">
            <span>综合得分</span>
            <strong>{{ displayTotalScore }}</strong>
            <StatusTag :status="report.reportStatus" />
          </div>
          <div class="overview-card">
            <span>面试记录</span>
            <strong>{{ report.interviewId || interviewId }}</strong>
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
          v-if="isScoreUnavailable"
          class="score-source"
          type="warning"
          show-icon
          :closable="false"
          title="评分暂未生成"
          description="本次报告没有拿到可信评分，已保留面试问答。你可以重新生成报告。"
        />

        <el-alert
          v-else
          class="score-source"
          type="info"
          show-icon
          :closable="false"
          title="综合得分已生成。"
        />

        <div class="report-trust-strip">
          <el-tag v-for="tag in reportTrustTags" :key="tag.label" :type="tag.type" effect="plain">
            {{ tag.label }}
          </el-tag>
        </div>

        <div class="report-feedback-row">
          <AiResultFeedback
            scene="INTERVIEW_REPORT"
            biz-type="INTERVIEW_REPORT"
            :biz-id="report.reportId || report.id"
            label="反馈报告问题"
            compact
          />
        </div>

        <div class="coach-next">
          <div class="section-head">
            <h2>下一轮训练建议</h2>
            <p>把报告里的短板转成可执行动作，而不是只看一个分数。</p>
          </div>
          <div class="next-grid">
            <article v-for="item in coachNextSteps" :key="item.title">
              <span>{{ item.kicker }}</span>
              <strong>{{ item.title }}</strong>
              <p>{{ item.desc }}</p>
            </article>
          </div>
        </div>

        <div class="dimension-section">
          <div class="section-head">
            <h2>评分维度</h2>
            <p>按面试阶段展示能力表现，暂未拆分时保持空状态。</p>
          </div>
          <ReportChart v-if="stageReports.length" :stages="stageReports" />
          <AppState
            v-else
            type="empty"
            title="暂未拆分维度评分"
            description="本次报告可能只返回了总评，或问答样本不足以拆分阶段得分。建议结合问答明细和短板建议继续复盘。"
          >
            <el-button type="primary" plain @click="router.push('/interviews/history')">查看面试历史</el-button>
          </AppState>
        </div>
      </div>

      <div v-else-if="isFailed || isUnscorable" class="content-card__body failed-panel">
        <el-alert
          :type="isUnscorable ? 'warning' : 'error'"
          show-icon
          :closable="false"
          :title="isUnscorable ? '报告暂不可评分' : '报告生成失败'"
          :description="failureReason"
        />
        <div class="retry-row">
          <el-button type="primary" :loading="retrying" @click="handleRetry">重新生成报告</el-button>
          <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        </div>
      </div>

      <AppState
        v-else-if="!loading"
        type="empty"
        title="报告暂不可用"
        description="报告可能仍在生成中，或当前面试记录没有可展示的复盘结果。可以去任务中心继续查看生成进度。"
      >
        <el-button type="primary" @click="goReportTaskCenter">去任务中心查看</el-button>
        <el-button @click="router.push('/interviews/history')">返回历史</el-button>
      </AppState>
    </section>

    <section v-if="report && isGenerated" class="analysis-grid">
      <article class="analysis-card wide">
        <div class="section-head">
          <h2>AI 总结</h2>
          <p>整体评价与报告正文</p>
        </div>
        <MarkdownPreview v-if="report.reportContent || report.summary" :content="report.reportContent || report.summary" />
        <AppState v-else type="empty" title="总结暂未生成" :description="emptyReportCopy.summary">
          <el-button type="primary" plain :loading="retrying" @click="handleRetry">重新生成报告</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>表现亮点</h2>
        </div>
        <MarkdownPreview v-if="report.strengths" :content="report.strengths" />
        <AppState v-else type="empty" title="亮点暂未提取" :description="emptyReportCopy.strengths">
          <el-button plain @click="router.push('/interviews/create')">重新面试</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>明显短板</h2>
        </div>
        <MarkdownPreview v-if="report.mainProblems || report.weaknesses" :content="report.mainProblems || report.weaknesses" />
        <AppState v-else type="empty" title="短板暂未提取" :description="emptyReportCopy.weaknesses">
          <el-button type="primary" plain :loading="studyPlanGenerating" @click="handleGenerateStudyPlan">生成学习计划</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>建议提升方向</h2>
        </div>
        <MarkdownPreview v-if="report.reviewSuggestions || report.suggestions" :content="report.reviewSuggestions || report.suggestions" />
        <AppState v-else type="empty" title="提升建议暂未生成" :description="emptyReportCopy.suggestions">
          <el-button type="primary" plain :loading="retrying" @click="handleRetry">重新生成报告</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>薄弱知识点</h2>
        </div>
        <MarkdownPreview v-if="weakPointText" :content="weakPointText" />
        <AppState v-else type="empty" title="暂未识别薄弱知识点" :description="emptyReportCopy.weakPoints">
          <el-button type="primary" plain :disabled="!recommendedQuestionIds.length" @click="goPracticeQuestion">练推荐题</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>项目表达问题</h2>
        </div>
        <MarkdownPreview
          v-if="report.projectProblems || report.projectExpressionProblems"
          :content="report.projectProblems || report.projectExpressionProblems"
        />
        <AppState v-else type="empty" title="项目表达问题暂未提取" :description="emptyReportCopy.project">
          <el-button plain @click="router.push('/projects')">整理项目经历</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>简历修改建议</h2>
        </div>
        <MarkdownPreview v-if="report.resumeSuggestions || report.resumeAdvice" :content="report.resumeSuggestions || report.resumeAdvice" />
        <AppState v-else type="empty" title="简历建议暂未生成" :description="emptyReportCopy.resume">
          <el-button plain @click="router.push('/resumes')">查看简历与岗位</el-button>
        </AppState>
      </article>

      <article class="analysis-card">
        <div class="section-head">
          <h2>推荐练习题目</h2>
        </div>
        <div v-if="recommendedQuestions.length" class="recommended-list">
          <button
            v-for="(item, index) in recommendedQuestions"
            :key="item.questionId || `${item.title}-${index}`"
            class="recommended-item"
            :class="{ 'recommended-item--disabled': !item.questionId }"
            type="button"
            @click="openRecommendedQuestion(item)"
          >
            <div>
              <strong>{{ item.title || item.questionTitle || '推荐题目' }}</strong>
              <span v-if="item.reason || item.recommendReason">{{ item.reason || item.recommendReason }}</span>
            </div>
            <el-tag size="small" type="info" effect="plain">来自面试报告</el-tag>
            <el-tag v-if="item.questionId" size="small" type="success" effect="plain">可练习</el-tag>
            <el-tag v-else size="small" type="warning" effect="plain">仅建议</el-tag>
            <el-tag v-if="item.difficulty" size="small" effect="plain">{{ difficultyLabel(item.difficulty) }}</el-tag>
          </button>
        </div>
        <AppState v-else type="empty" title="暂未生成推荐题目" :description="emptyReportCopy.questions">
          <el-button type="primary" plain @click="router.push('/questions')">进入题库训练</el-button>
        </AppState>
      </article>
    </section>

    <section v-if="stageReports.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>阶段得分</h2>
          <p>阶段名称、类型、得分、总结、短板与建议会在报告生成后展示。</p>
        </div>
        <div class="stage-report-list">
          <article v-for="(stage, index) in stageReports" :key="stage.stageId || index" class="stage-report-card">
            <header>
              <div>
                <span>阶段 {{ index + 1 }}</span>
                <strong>{{ stage.stageName || '未命名阶段' }}</strong>
                <p>{{ stage.stageType || '未标注类型' }}</p>
              </div>
              <div class="stage-score-pill">
                <span>得分</span>
                <strong>{{ stage.score ?? '--' }}</strong>
              </div>
            </header>
            <div class="stage-report-content">
              <div class="stage-copy">
                <label>总结</label>
                <p>{{ stage.summary || '暂无阶段总结' }}</p>
              </div>
              <div class="stage-copy">
                <label>短板</label>
                <p>{{ stage.weaknesses || '暂无短板记录' }}</p>
              </div>
              <div class="stage-copy">
                <label>建议</label>
                <p>{{ stage.suggestions || '暂无改进建议' }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-if="qaMessages.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>题目明细</h2>
          <p>展示问题、回答、AI 评分、点评、推荐方向和追问记录。</p>
        </div>
        <div class="qa-list">
          <article v-for="message in qaMessages" :key="message.messageId" class="qa-item">
            <div class="qa-head">
              <div>
                <strong>{{ message.questionContent ? '面试题' : message.role }}</strong>
                <el-tag v-if="message.isFollowUp" size="small" type="warning" effect="plain">追问</el-tag>
              </div>
              <span>{{ displayQuestionScore(message) }}</span>
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
          <p>报告已生成，可继续发起新面试、进入题库练习或生成学习计划。</p>
        </div>
        <div class="action-buttons">
          <el-button type="primary" @click="router.push('/interviews/create')">
            <RotateCcw :size="16" />
            重新面试
          </el-button>
          <el-button :disabled="!recommendedQuestionIds.length" @click="goPracticeQuestion">
            <BookOpenCheck :size="16" />
            重练薄弱题
          </el-button>
          <el-button type="success" plain :loading="studyPlanGenerating" @click="handleGenerateStudyPlan">
            <CalendarClock :size="16" />
            生成学习计划
          </el-button>
          <el-button @click="router.push('/dashboard')">返回今日计划</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { BookOpenCheck, CalendarClock, ChartNoAxesCombined, History, LayoutDashboard, ListChecks, RotateCcw } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import {
  finishInterviewApi,
  getInterviewReportApi,
  retryInterviewReportApi
} from '@/api/interview'
import { generateStudyPlanApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import { difficultyOptions } from '@/constants/enums'
import type {
  InterviewMessageVO,
  InterviewReportVO,
  RecommendedQuestionVO,
  StageReportVO
} from '@/types/interview'
import { toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
type RouterQueryValue = string | number | boolean | null | undefined
const loading = ref(false)
const retrying = ref(false)
const studyPlanGenerating = ref(false)
const report = ref<InterviewReportVO | null>(null)
const reportRecoveryNotice = ref('')
const pollCount = ref(0)
const pollFailures = ref(0)
const taskReportId = ref<number | undefined>()
const asyncReceipt = ref({
  messageId: typeof route.query.asyncMessageId === 'string' ? route.query.asyncMessageId : '',
  traceId: typeof route.query.asyncTraceId === 'string' ? route.query.asyncTraceId : '',
  bizType: typeof route.query.asyncBizType === 'string' ? route.query.asyncBizType : 'interview.report',
  bizId: typeof route.query.asyncBizId === 'string' ? route.query.asyncBizId : (interviewId ? String(interviewId) : ''),
  sendStatus: typeof route.query.asyncSendStatus === 'string' ? route.query.asyncSendStatus : ''
})
let pollTimer: number | undefined

const asyncSendStatusLabel = (value?: string | null) => {
  const status = String(value || '').toUpperCase()
  const labels: Record<string, string> = {
    SENT: '已提交',
    SUCCESS: '已提交',
    QUEUED: '排队中',
    PENDING: '排队中',
    FAILED: '提交失败',
    ERROR: '提交失败',
    SKIPPED: '暂未提交',
    DISABLED: '暂未提交',
    UNAVAILABLE: '暂不可用'
  }
  return labels[status] || '待确认'
}

const normalizedStatus = computed(() => {
  const status = report.value?.reportStatus || report.value?.status || ''
  return String(status).toUpperCase()
})

const successReportStatuses = ['GENERATED', 'COMPLETED', 'SUCCESS']
const unscorableReportStatuses = ['UNSCORABLE', 'NOT_SCORABLE', 'INSUFFICIENT_SAMPLE', 'SAMPLE_INSUFFICIENT']
const isGenerating = computed(() => ['GENERATING', 'REPORT_GENERATING'].includes(normalizedStatus.value))
const isFailed = computed(() => normalizedStatus.value === 'FAILED')
const isUnscorable = computed(() => unscorableReportStatuses.includes(normalizedStatus.value))
const isGenerated = computed(() => successReportStatuses.includes(normalizedStatus.value))

type DisplayRecommendedQuestion = RecommendedQuestionVO & { title?: string }

const objectItems = <T>(value: unknown): T[] => {
  return Array.isArray(value)
    ? (value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) as T[])
    : []
}

const normalizeRecommendedQuestions = (value: unknown): DisplayRecommendedQuestion[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { title: item }
      }
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item as DisplayRecommendedQuestion
      }
      return null
    })
    .filter((item): item is DisplayRecommendedQuestion => Boolean(item))
}

const difficultyLabel = (value?: string) => {
  if (!value) return ''
  return difficultyOptions.find((item) => item.value === value)?.label || '难度待确认'
}

const stageReports = computed<StageReportVO[]>(() => objectItems<StageReportVO>(report.value?.stageReports || report.value?.stageScores))
const recommendedQuestions = computed<DisplayRecommendedQuestion[]>(() => normalizeRecommendedQuestions(report.value?.recommendedQuestions))
const qaMessages = computed<InterviewMessageVO[]>(() =>
  objectItems<InterviewMessageVO>(report.value?.questionReviews || report.value?.qaReview || report.value?.messages)
)
const recommendedQuestionIds = computed(() =>
  recommendedQuestions.value
    .map((item) => Number(item.questionId))
    .filter((id) => Number.isFinite(id) && id > 0)
)
const hasValidTotalScore = computed(() => {
  const score = Number(report.value?.totalScore)
  return isGenerated.value && Number.isFinite(score) && score > 0
})
const isScoreUnavailable = computed(() => isGenerated.value && !hasValidTotalScore.value)
const displayTotalScore = computed(() => hasValidTotalScore.value ? report.value?.totalScore : '--')
const pollProgress = computed(() => Math.min(100, Math.round((pollCount.value / 30) * 100)))
const generatingMessage = computed(() =>
  asyncReceipt.value.messageId
    ? '报告生成进度已提交到任务中心，可以离开页面，稍后回来查看结果。'
    : '系统正在根据真实问答记录生成结构化报告。'
)
const generatingStages = computed(() => [
  {
    key: 'submitted',
    label: '已提交',
    title: asyncReceipt.value.messageId ? '报告生成任务已提交' : '等待处理进度',
    desc: asyncReceipt.value.sendStatus ? `提交状态：${asyncSendStatusLabel(asyncReceipt.value.sendStatus)}` : '已创建报告生成任务'
  },
  {
    key: 'tracking',
    label: '可追踪',
    title: '面试记录已绑定',
    desc: asyncReceipt.value.traceId ? '处理线索已记录，可稍后继续查看' : '刷新后仍可在任务中心按面试记录继续查找'
  },
  {
    key: 'polling',
    label: '轮询中',
    title: `第 ${pollCount.value} 次状态检查`,
    desc: '报告完成后会自动展示复盘；耗时较长时可以稍后回来'
  }
])

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: LocationQueryRaw = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
}

const goReportTaskCenter = () => {
  router.push({
    path: '/agent/tasks',
    query: compactRouterQuery({
      messageId: asyncReceipt.value.messageId,
      traceId: asyncReceipt.value.traceId,
      bizType: asyncReceipt.value.bizType || 'interview.report',
      bizId: asyncReceipt.value.bizId || interviewId
    })
  })
}

const failureReason = computed(() => toFriendlyMessage(
  report.value?.failedReason || report.value?.failureReason || report.value?.errorMessage,
  isUnscorable.value ? '本次面试答题样本不足或题目明细不完整，暂时无法生成可信评分。请继续答题或重新生成报告。' : '报告生成失败，请稍后重试。'
))
const taskMetaText = computed(() => {
  const items = []
  const reportId = taskReportId.value || report.value?.reportId || report.value?.id
  if (reportId) items.push('报告记录已保存')
  if (asyncReceipt.value.messageId) items.push('生成任务已提交')
  if (asyncReceipt.value.traceId) items.push('处理线索已记录')
  return items.join(' / ')
})
const reportTrustTags = computed(() => [
  {
    label: report.value?.evidenceSummary || '面试报告证据待确认',
    type: trustStatusType(report.value?.trustStatus, report.value?.fallback ? 'warning' : 'info')
  },
  {
    label: report.value?.reportId || report.value?.id ? '报告记录已保存' : '报告记录待确认',
    type: report.value?.reportId || report.value?.id ? 'success' : 'warning'
  },
  {
    label: qaMessages.value.length ? `基于 ${qaMessages.value.length} 条真实问答` : '问答样本不足，可信度降低',
    type: qaMessages.value.length ? 'success' : 'warning'
  },
  {
    label: hasValidTotalScore.value ? '评分可用' : '评分不可用或待复核',
    type: hasValidTotalScore.value ? 'success' : 'warning'
  },
  {
    label: recommendedQuestionIds.value.length ? `${recommendedQuestionIds.value.length} 道推荐题可练习` : '推荐题仅供参考',
    type: recommendedQuestionIds.value.length ? 'success' : 'info'
  }
] as Array<{ label: string; type: 'success' | 'warning' | 'info' }>)

const trustStatusType = (
  value?: string | null,
  fallback: 'success' | 'warning' | 'info' = 'info'
): 'success' | 'warning' | 'info' => {
  if (value === 'VERIFIED') return 'success'
  if (value === 'FALLBACK') return 'warning'
  if (value === 'PARTIAL') return 'info'
  return fallback
}

const displayQuestionScore = (message: InterviewMessageVO) => {
  const score = Number(message.score)
  return Number.isFinite(score) && score > 0 ? `${score} 分` : '未评分'
}

const weakPointText = computed(() => {
  const value = report.value?.weakPoints || report.value?.weakKnowledgePoints
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => `- ${item}`).join('\n') : ''
  }
  return value || ''
})

const coachNextSteps = computed(() => [
  {
    kicker: '题库',
    title: recommendedQuestionIds.value.length ? `重练 ${recommendedQuestionIds.value.length} 道薄弱题` : '等待推荐题',
    desc: recommendedQuestionIds.value.length
      ? '优先完成报告推荐题，再回到面试房间验证表达。'
      : '当前报告没有可跳转题目，可以从题库训练页重新生成推荐。'
  },
  {
    kicker: '表达',
    title: report.value?.projectProblems || report.value?.projectExpressionProblems ? '补项目证据链' : '沉淀项目说法',
    desc: '把项目背景、个人职责、指标、取舍和复盘补成一段可复用回答。'
  },
  {
    kicker: '计划',
    title: report.value?.reviewSuggestions || report.value?.suggestions ? '生成学习计划' : '补齐复盘材料',
    desc: '把报告建议转成今日计划，避免复盘停留在页面里。'
  }
])

const emptyReportCopy = computed(() => {
  const qaCount = qaMessages.value.length
  const sampleHint = qaCount
    ? `当前报告基于 ${qaCount} 条问答生成，部分模块可能因为证据不足没有拆分。`
    : '当前报告没有拿到足够的问答样本，AI 只能给出有限复盘。'
  return {
    summary: `${sampleHint} 可重新生成报告，或回到面试历史确认问答是否完整。`,
    strengths: `${sampleHint} 亮点通常需要明确回答、项目证据或指标支撑。`,
    weaknesses: `${sampleHint} 如果没有短板条目，先用学习计划把低分项和推荐题转成下一步训练。`,
    suggestions: `${sampleHint} 提升建议缺失时，可以重新生成报告或根据低分维度手动生成学习计划。`,
    weakPoints: `${sampleHint} 推荐题可用时优先练推荐题；没有推荐题时先回到题库训练做一组基础练习。`,
    project: `${sampleHint} 项目表达问题需要回答里出现项目背景、职责、指标和取舍，缺失时建议先整理项目经历。`,
    resume: `${sampleHint} 简历建议依赖岗位、简历和面试回答之间的证据链，缺失时先回到简历与岗位页补资料。`,
    questions: `${sampleHint} 推荐题缺失不会阻塞复盘，可以先进入题库训练，再把错题带回下一次模拟面试。`
  }
})

const openRecommendedQuestion = async (item: DisplayRecommendedQuestion) => {
  if (!item.questionId) {
    ElMessage.warning('这条推荐暂时不能直接打开题目详情，可以先从推荐训练进入练习。')
    return
  }
  const query: Record<string, string> = { source: 'interviewReport' }
  if (interviewId) query.interviewId = String(interviewId)
  const reportId = report.value?.reportId || report.value?.id
  if (reportId) query.reportId = String(reportId)
  await router.push({
    path: `/questions/${item.questionId}`,
    query
  })
}

const goPracticeQuestion = async () => {
  if (!recommendedQuestionIds.value.length) {
    ElMessage.info('暂无可跳转的推荐题目')
    return
  }
  const query: Record<string, string> = {
    mode: 'recommended',
    questionIds: recommendedQuestionIds.value.join(','),
    source: 'interviewReport',
    count: String(recommendedQuestionIds.value.length)
  }
  if (interviewId) query.interviewId = String(interviewId)
  const reportId = report.value?.reportId || report.value?.id
  if (reportId) query.reportId = String(reportId)
  await router.push({
    path: '/questions/practice',
    query
  })
}

const stopPolling = () => {
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
}

const rememberAsyncReceipt = (result?: {
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
}) => {
  if (!result) return
  asyncReceipt.value = {
    messageId: result.asyncMessageId || asyncReceipt.value.messageId,
    traceId: result.asyncTraceId || asyncReceipt.value.traceId,
    bizType: result.asyncBizType || asyncReceipt.value.bizType || 'interview.report',
    bizId: result.asyncBizId || asyncReceipt.value.bizId || (interviewId ? String(interviewId) : ''),
    sendStatus: result.asyncSendStatus || asyncReceipt.value.sendStatus
  }
}

const schedulePolling = () => {
  stopPolling()
  if (!isGenerating.value) return
  if (pollCount.value >= 30) {
    ElMessage.warning('报告生成时间较长，可到任务中心按面试记录继续查看。')
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
      ElMessage.error(toFriendlyMessage(error, '报告状态查询失败，请稍后刷新。'))
    } else {
      schedulePolling()
    }
  } finally {
    loading.value = false
  }
}

const runSyncFallback = async (forceRegenerate: boolean) => {
  if (!interviewId) return
  const id = interviewId
  retrying.value = forceRegenerate
  try {
    if (forceRegenerate) {
      rememberAsyncReceipt(await retryInterviewReportApi(id))
    } else {
      rememberAsyncReceipt(await finishInterviewApi(id))
    }
    report.value = {
      interviewId: id,
      reportStatus: 'GENERATING',
      status: 'GENERATING',
      asyncMessageId: asyncReceipt.value.messageId,
      asyncTraceId: asyncReceipt.value.traceId,
      asyncBizType: asyncReceipt.value.bizType,
      asyncBizId: asyncReceipt.value.bizId,
      asyncSendStatus: asyncReceipt.value.sendStatus
    }
    pollFailures.value = 0
    schedulePolling()
  } finally {
    retrying.value = false
  }
}

const loadReportOrSubmitTask = async () => {
  if (!interviewId) return
  loading.value = true
  reportRecoveryNotice.value = ''
  try {
    report.value = await getInterviewReportApi(interviewId)
    pollFailures.value = 0
    if (isGenerated.value || isFailed.value || isUnscorable.value) {
      stopPolling()
      return
    }
    if (isGenerating.value) {
      schedulePolling()
      return
    }
    await runSyncFallback(false)
  } catch (error) {
    reportRecoveryNotice.value = toFriendlyMessage(error, '当前报告暂时无法读取，已尝试重新提交生成任务。你可以稍后回来，或到任务中心按面试记录继续查看。')
    await runSyncFallback(false)
  } finally {
    loading.value = false
  }
}

const handleRetry = async () => {
  if (!interviewId) return
  await runSyncFallback(true)
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
    if (String(result.planStatus || '').toUpperCase() === 'FAILED') {
      ElMessage.error(toFriendlyMessage(result.failureReason, '学习计划生成失败，请稍后重试'))
      if (result.planId) {
        await router.push(`/study-plans?planId=${result.planId}`)
      }
      return
    } else if (result.asyncMessageId || result.asyncTraceId || result.asyncBizType) {
      ElMessage.success('学习计划已提交，可在任务中心查看进度')
      await router.push({
        path: '/agent/tasks',
        query: compactRouterQuery({
          messageId: result.asyncMessageId,
          traceId: result.asyncTraceId,
          bizType: result.asyncBizType || 'study-plan.generate',
          bizId: result.asyncBizId || result.planId
        })
      })
      return
    } else if (!result.planId) {
      ElMessage.warning('学习计划已提交，但暂未返回计划记录，可稍后到学习计划页刷新查看。')
      return
    } else {
      ElMessage.success('学习计划已生成')
    }
    await router.push(`/study-plans?planId=${result.planId}`)
  } finally {
    studyPlanGenerating.value = false
  }
}

onMounted(loadReportOrSubmitTask)
onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped lang="scss">
.interview-report {
  color: var(--app-text);
}

.report-top,
.analysis-card {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: var(--app-shadow);
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

.recommended-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recommended-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: rgba(37, 99, 235, 0.36);
    background: #eff6ff;
  }

  strong {
    display: block;
    font-size: 14px;
  }

  span {
    display: block;
    margin-top: 4px;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.recommended-item--disabled {
  cursor: not-allowed;
  opacity: 0.78;
}

.stage-report-list {
  display: grid;
  gap: 14px;
}

.stage-report-card {
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--app-border);
  }

  span,
  label {
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.stage-score-pill {
  min-width: 88px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #eff6ff;
  text-align: center;

  strong {
    color: #2563eb;
    font-size: 24px;
  }
}

.stage-report-content {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding-top: 14px;
}

.stage-copy {
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
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

.task-stage-list {
  display: grid;
  gap: 10px;
  margin-top: 18px;
  text-align: left;
}

.task-stage-item {
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;

  span {
    color: #2563eb;
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

.task-meta {
  margin-top: 12px;
  color: var(--app-text-muted);
  font-size: 12px;
}

.async-diagnostics {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;

  span {
    max-width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: #ffffff;
    color: var(--app-text-muted);
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
}

.generating-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
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
  border-radius: 8px;
  background: #f8fafc;
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
  background: linear-gradient(135deg, #eff6ff, #f0fdf4);

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

.report-trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 0;
}

.report-feedback-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.dimension-section {
  margin-top: 20px;
}

.coach-next {
  margin-top: 18px;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #f8fafc;
}

.next-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  article {
    padding: 14px;
    border: 1px solid var(--app-border);
    border-radius: 8px;
    background: #ffffff;
  }

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  strong,
  p {
    display: block;
    margin: 0;
  }

  strong {
    margin-top: 8px;
    color: var(--app-text);
    font-size: 15px;
  }

  p {
    margin-top: 8px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
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
  border-radius: 8px;
  background: #f8fafc;
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
    color: #2563eb;
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
  .analysis-grid,
  .next-grid,
  .stage-report-content {
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
  .analysis-grid,
  .next-grid,
  .stage-report-content {
    grid-template-columns: 1fr;
  }

  .stage-report-card header {
    flex-direction: column;
  }
}


@media (max-width: 720px) {
  .page-hero,
  .history-hero,
  .detail-hero,
  .report-top,
  .room-topbar,
  .notification-hero,
  .create-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions,
  .report-actions,
  .topbar-actions,
  .card-actions,
  .filter-bar,
  .notification-toolbar {
    justify-content: flex-start;
  }
}
</style>
