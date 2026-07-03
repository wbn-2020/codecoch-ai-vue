<template>
  <div class="interview-report page-shell">
    <section class="report-top">
      <div>
        <div class="eyebrow">
          <ChartNoAxesCombined :size="16" />
          AI Interview Report
        </div>
        <h1>结构化 AI 面试报告</h1>
        <p>汇总面试表现、阶段评分、题目点评和后续练习建议。</p>
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
        <el-button v-if="interviewId" type="primary" @click="router.push({ path: '/interviews/create', query: interviewContextQuery })">
          <RotateCcw :size="16" />
          重新面试
        </el-button>
      </div>
    </section>

    <section v-if="isGenerating" class="content-card">
      <div class="content-card__body generating-panel">
        <el-icon class="generating-icon"><Loading /></el-icon>
        <h2>报告生成进度</h2>
        <p>{{ sseMessage || '系统正在根据真实问答记录生成结构化报告。' }}</p>
        <el-progress :percentage="pollProgress" :show-text="false" />
        <div class="sse-stage-list">
          <article v-for="item in sseEvents" :key="item.key" class="sse-stage-item">
            <span>{{ sseEventLabel(item.event) }}</span>
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
            <strong>{{ displayTotalScore }}</strong>
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

        <div class="report-feedback-row">
          <AiResultFeedback
            scene="INTERVIEW_REPORT"
            biz-type="INTERVIEW_REPORT"
            :biz-id="report.reportId || report.id"
            :ai-call-log-id="sseAiCallLogId"
            label="反馈报告问题"
            compact
          />
        </div>

        <el-alert
          v-if="applicationId"
          class="application-sync"
          type="success"
          show-icon
          :closable="false"
          title="这份报告来自投递链路"
          description="可以把面试完成结果写回投递事件，方便在投递工作台继续跟进。"
        >
          <template #default>
            <el-button
              type="primary"
              plain
              :loading="syncingApplicationEvent"
              :disabled="applicationEventSynced"
              @click="syncReportToApplication"
            >
              {{ applicationEventSynced ? '已同步到投递' : '同步到投递事件' }}
            </el-button>
          </template>
        </el-alert>

        <div class="dimension-section">
          <div class="section-head">
            <h2>评分维度</h2>
            <p>按面试阶段展示能力表现，暂无拆分时保持空状态。</p>
          </div>
          <ReportChart v-if="stageReports.length" :stages="stageReports" />
          <el-empty v-else description="暂无维度评分数据" />
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
          <el-button type="primary" :loading="retrying || sseGenerating" :disabled="sseGenerating" @click="handleRetry">重新生成报告</el-button>
          <el-button @click="router.push('/interviews/history')">返回历史</el-button>
        </div>
      </div>

      <el-empty v-else-if="!loading" description="报告暂不可用，可能仍在生成中" />
    </section>

    <section v-if="report && isGenerated" class="analysis-grid">
      <article class="analysis-card wide">
        <div class="section-head">
          <h2>Rubric 五维评分</h2>
          <p>表达结构、技术深度、业务理解、风险意识、可落地性。</p>
        </div>
        <div v-if="rubricScores.length" class="rubric-grid">
          <section v-for="item in rubricScores" :key="item.dimension" class="rubric-card">
            <div class="rubric-card__head">
              <strong>{{ rubricLabel(item.dimension) }}</strong>
              <el-tag size="small" effect="plain">{{ item.score ?? '-' }}/5</el-tag>
            </div>
            <p>{{ item.comment || '暂无解释' }}</p>
            <small>证据：{{ item.evidenceSummary || '暂无稳定证据' }}</small>
            <small>建议：{{ item.improvementSuggestion || '继续补充样本后复盘' }}</small>
            <el-alert
              v-if="item.sampleInsufficient"
              type="warning"
              :closable="false"
              show-icon
              :title="item.sampleWarning || '样本不足，仅作为候选判断'"
            />
          </section>
        </div>
        <el-empty v-else description="暂无 Rubric 评分数据" />
      </article>

      <article class="analysis-card wide">
        <div class="section-head">
          <h2>追问树回放</h2>
          <p>展示 AI 为什么追问、触发原因和暴露风险。</p>
        </div>
        <div v-if="followUpTree.length" class="trace-list">
          <section v-for="(item, index) in followUpTree" :key="item.followUpMessageId || index" class="trace-item">
            <div class="trace-step">{{ index + 1 }}</div>
            <div>
              <strong>{{ item.followUpIntent || 'FOLLOW_UP' }}</strong>
              <p v-if="item.questionSummary">原问题：{{ item.questionSummary }}</p>
              <p v-if="item.answerSummary">回答暴露：{{ item.answerSummary }}</p>
              <p>追问原因：{{ item.followUpReason || '暂无原因' }}</p>
              <p>风险提示：{{ item.exposedRisk || '暂无风险摘要' }}</p>
              <small v-if="item.followUpQuestion">追问：{{ item.followUpQuestion }}</small>
            </div>
          </section>
        </div>
        <el-empty v-else description="暂无追问树数据" />
      </article>

      <article class="analysis-card wide">
        <div class="section-head">
          <h2>AI 建议证据链</h2>
          <p>每条建议展示来源、置信度和样本不足提示。</p>
        </div>
        <div v-if="adviceEvidence.length" class="advice-grid">
          <section v-for="(item, index) in adviceEvidence" :key="`${item.title || 'advice'}-${index}`" class="advice-card">
            <div class="advice-card__head">
              <strong>{{ item.title || '建议' }}</strong>
              <el-tag :type="confidenceTagType(item.confidence)" size="small" effect="plain">
                {{ confidenceLabel(item.confidence) }}
              </el-tag>
            </div>
            <p>{{ item.content || '暂无建议内容' }}</p>
            <el-alert
              v-if="item.sampleInsufficient"
              type="warning"
              :closable="false"
              show-icon
              :title="item.sampleWarning || '样本不足，不能作为强结论'"
            />
            <div v-if="item.evidenceSources?.length" class="evidence-list">
              <span v-for="(source, sourceIndex) in item.evidenceSources" :key="`${source.sourceType}-${sourceIndex}`">
                {{ source.sourceType || 'SOURCE' }}：{{ source.sourceSummary || '暂无摘要' }}
              </span>
            </div>
            <div class="advice-actions">
              <AiResultFeedback
                scene="INTERVIEW_REPORT_ADVICE"
                biz-type="INTERVIEW_REPORT"
                :biz-id="report.reportId || report.id"
                label="反馈建议"
                compact
              />
              <el-button size="small" type="primary" plain @click="goAdviceAction(item.actionUrl)">去处理</el-button>
            </div>
          </section>
        </div>
        <el-empty v-else description="暂无建议证据链" />
      </article>

      <article v-if="abilityProfileUpdates.length" class="analysis-card wide">
        <div class="section-head">
          <h2>能力画像更新候选</h2>
          <p>训练结果只形成候选，不把样本不足的判断写成强结论。</p>
        </div>
        <div class="profile-update-list">
          <el-tag v-for="item in abilityProfileUpdates" :key="`${item.skillCode}-${item.candidateStatus}`" effect="plain">
            {{ item.skillCode }} · {{ item.candidateStatus }} · {{ confidenceLabel(item.confidence) }}
          </el-tag>
        </div>
      </article>

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

      <article class="analysis-card">
        <div class="section-head">
          <h2>简历修改建议</h2>
        </div>
        <MarkdownPreview v-if="report.resumeSuggestions || report.resumeAdvice" :content="report.resumeSuggestions || report.resumeAdvice" />
        <el-empty v-else description="暂无简历修改建议" />
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
            <el-tag v-if="item.questionId" size="small" type="success" effect="plain">可练习</el-tag>
            <el-tag v-else size="small" type="warning" effect="plain">仅建议</el-tag>
            <el-tag v-if="item.difficulty" size="small" effect="plain">{{ item.difficulty }}</el-tag>
          </button>
        </div>
        <el-empty v-else description="暂无推荐题目" />
      </article>
    </section>

    <section v-if="stageReports.length && isGenerated" class="content-card">
      <div class="content-card__body">
        <div class="section-head">
          <h2>阶段得分</h2>
          <p>阶段名称、类型、得分、总结、短板与建议会在报告生成后展示。</p>
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
import { createApplicationEventApi, getApplicationEventsApi, type JobApplicationEventVO } from '@/api/v4'
import { generateStudyPlanApi } from '@/api/studyPlan'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import AiResultFeedback from '@/components/feedback/AiResultFeedback.vue'
import ReportChart from '@/components/report/ReportChart.vue'
import {
  confidenceLabel,
  confidenceTagType,
  type DisplayRecommendedQuestion,
  normalizeInterviewReportSections,
  rubricLabel
} from '@/features/interview-report'
import { resolveAppRoutePath } from '@/features/route-safety'
import type {
  InterviewMessageVO,
  InterviewReportSseEvent,
  InterviewReportSseEventType,
  InterviewReportVO,
} from '@/types/interview'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const interviewId = getRouteNumberParam(route.params.id as string)
const loading = ref(false)
const retrying = ref(false)
const studyPlanGenerating = ref(false)
const syncingApplicationEvent = ref(false)
const applicationEventSynced = ref(false)
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

const getQueryString = (name: string) => {
  const value = route.query[name]
  return Array.isArray(value) ? value[0] : value
}

const getQueryNumber = (name: string) => {
  const value = Number(getQueryString(name))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

const applicationId = computed(() => report.value?.applicationId || getQueryNumber('applicationId'))
const interviewContextQuery = computed(() => {
  const query: Record<string, string> = {}
  ;['source', 'applicationId', 'targetJobId', 'resumeId', 'resumeVersionId', 'matchReportId', 'skillProfileId'].forEach((key) => {
    const value = getQueryString(key)
    if (value) query[key] = String(value)
  })
  if (report.value?.applicationId) {
    query.applicationId = String(report.value.applicationId)
  }
  return query
})

const normalizedStatus = computed(() => {
  const status = report.value?.reportStatus || report.value?.status || ''
  return String(status).toUpperCase()
})

const successReportStatuses = ['GENERATED', 'COMPLETED', 'SUCCESS']
const unscorableReportStatuses = ['UNSCORABLE', 'NOT_SCORABLE', 'INSUFFICIENT_SAMPLE', 'SAMPLE_INSUFFICIENT']
const isGenerating = computed(() => sseGenerating.value || ['GENERATING', 'REPORT_GENERATING'].includes(normalizedStatus.value))
const isFailed = computed(() => normalizedStatus.value === 'FAILED')
const isUnscorable = computed(() => unscorableReportStatuses.includes(normalizedStatus.value))
const isGenerated = computed(() => successReportStatuses.includes(normalizedStatus.value))

const reportSections = computed(() => normalizeInterviewReportSections(report.value))
const stageReports = computed(() => reportSections.value.stageReports)
const recommendedQuestions = computed(() => reportSections.value.recommendedQuestions)
const qaMessages = computed(() => reportSections.value.qaMessages)
const rubricScores = computed(() => reportSections.value.rubricScores)
const followUpTree = computed(() => reportSections.value.followUpTree)
const adviceEvidence = computed(() => reportSections.value.adviceEvidence)
const abilityProfileUpdates = computed(() => reportSections.value.abilityProfileUpdates)
const hasValidTotalScore = computed(() => {
  const score = Number(report.value?.totalScore)
  return isGenerated.value && Number.isFinite(score) && score > 0
})
const isScoreUnavailable = computed(() => isGenerated.value && !hasValidTotalScore.value)
const displayTotalScore = computed(() => hasValidTotalScore.value ? report.value?.totalScore : '--')
const pollProgress = computed(() => Math.min(100, Math.round((pollCount.value / 30) * 100)))
const failureReason = computed(() => toFriendlyMessage(
  report.value?.failedReason || report.value?.failureReason || report.value?.errorMessage,
  isUnscorable.value ? '本次面试答题样本不足或题目明细不完整，暂时无法生成可信评分。请继续答题或重新生成报告。' : '报告生成失败，请稍后重试。'
))
const sseMetaText = computed(() => {
  const items = []
  if (sseReportId.value) items.push(`报告 #${sseReportId.value}`)
  return items.join(' / ')
})

const goAdviceAction = async (actionUrl?: string) => {
  const result = resolveAppRoutePath(actionUrl, { fallbackPath: '/agent/today' })
  if (result.unavailableReason) {
    ElMessage.warning(result.unavailableReason)
  }
  await router.push(result.path)
}

const cleanDisplayText = (value?: string | null, fallback = '') => toFriendlyMessage(value || '', fallback)

const sseEventLabel = (event?: string) => {
  const map: Record<string, string> = {
    start: '开始',
    progress: '生成中',
    delta: '生成中',
    metadata: '状态更新',
    result: '结果返回',
    done: '完成',
    error: '失败'
  }
  return map[String(event || '').toLowerCase()] || '状态更新'
}

const sseStageLabel = (stage?: string) => {
  const map: Record<string, string> = {
    VALIDATE_REQUEST: '校验请求',
    LOAD_INTERVIEW: '读取面试记录',
    BUILD_PROMPT: '生成提示词',
    CALL_AI_REPORT: '调用 AI 生成报告',
    PARSE_AI_REPORT: '解析报告内容',
    SAVE_REPORT: '保存报告',
    COMPLETE: '生成完成'
  }
  return map[String(stage || '').toUpperCase()] || cleanDisplayText(stage, '')
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

const firstRecommendedQuestionPath = computed(() => {
  const first = recommendedQuestions.value.find((item) => item.questionId)
  const id = first?.questionId
  return id ? `/questions/${id}` : ''
})

const openRecommendedQuestion = async (item: DisplayRecommendedQuestion) => {
  if (!item.questionId) {
    ElMessage.warning('该推荐项尚未匹配到正式题库，不能作为题目 ID 跳转')
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
      await refreshApplicationEventSyncState()
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
  await refreshApplicationEventSyncState()
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
  const eventLabel = sseEventLabel(event)
  const message = cleanDisplayText(data?.message, eventLabel)
  const stage = sseStageLabel(data?.stage ? String(data.stage) : '')
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
          ElMessage.warning('报告生成流未启动，已切换为同步生成')
          await runSyncFallback(forceRegenerate)
          return
        }
        report.value = {
          ...(report.value || {}),
          interviewId: id,
          reportStatus: 'FAILED',
          status: 'FAILED',
          failedReason: toFriendlyMessage(error.message, '报告生成失败，请稍后重试。')
        }
        ElMessage.error(toFriendlyMessage(error.message, '报告生成失败，请稍后重试。'))
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
    if (isGenerated.value || isFailed.value || isUnscorable.value) {
      stopPolling()
      await refreshApplicationEventSyncState()
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

const parseApplicationEventReview = (event: JobApplicationEventVO) => {
  if (event.review && typeof event.review === 'object') return event.review
  if (!event.reviewJson) return {}
  try {
    const parsed = JSON.parse(event.reviewJson)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const hasSyncedReportEvent = async (reportId?: number) => {
  if (!applicationId.value || !interviewId) return false
  const events = await getApplicationEventsApi(applicationId.value)
  return events.some((event) => {
    if (String(event.eventType || '').toUpperCase() !== 'INTERVIEW_COMPLETED') return false
    const review = parseApplicationEventReview(event)
    return Number(review.interviewId) === interviewId || Boolean(reportId && Number(review.reportId) === reportId)
  })
}

const refreshApplicationEventSyncState = async () => {
  if (!applicationId.value || !interviewId || !report.value || !isGenerated.value) return
  const reportId = report.value.reportId || report.value.id
  try {
    applicationEventSynced.value = await hasSyncedReportEvent(reportId)
  } catch {
    applicationEventSynced.value = false
  }
}

const syncReportToApplication = async () => {
  if (!applicationId.value || !interviewId || !report.value) return
  syncingApplicationEvent.value = true
  try {
    const reportId = report.value.reportId || report.value.id
    if (await hasSyncedReportEvent(reportId)) {
      applicationEventSynced.value = true
      ElMessage.info('这份报告已经同步到投递事件')
      return
    }
    await createApplicationEventApi(applicationId.value, {
      eventType: 'INTERVIEW_COMPLETED',
      eventTime: report.value.generatedAt || report.value.createdAt || undefined,
      summary: `面试报告已生成，综合得分 ${displayTotalScore.value}`,
      reviewJson: JSON.stringify({
        source: 'interview-report',
        interviewId,
        reportId,
        reportStatus: report.value.reportStatus || report.value.status,
        totalScore: report.value.totalScore,
        targetJobId: report.value.targetJobId || getQueryNumber('targetJobId'),
        resumeVersionId: getQueryNumber('resumeVersionId'),
        matchReportId: report.value.matchReportId || getQueryNumber('matchReportId')
      })
    })
    applicationEventSynced.value = true
    ElMessage.success('已同步到投递事件')
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '投递事件同步失败，请稍后重试。'))
  } finally {
    syncingApplicationEvent.value = false
  }
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
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.46);
  color: var(--app-text);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: rgba(129, 140, 248, 0.42);
    background: rgba(15, 23, 42, 0.72);
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

.report-feedback-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.application-sync {
  margin: 14px 0 6px;
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

.rubric-grid,
.advice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.rubric-card,
.advice-card,
.trace-item {
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.3);
  padding: 14px;
}

.rubric-card__head,
.advice-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.rubric-card p,
.advice-card p,
.trace-item p {
  margin: 0 0 8px;
  color: var(--app-text);
  line-height: 1.7;
}

.rubric-card small,
.trace-item small {
  display: block;
  margin-top: 8px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.trace-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trace-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
}

.trace-step {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: rgba(6, 182, 212, 0.16);
  color: var(--cc-ai-cyan);
  font-weight: 700;
}

.evidence-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;

  span {
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }
}

.advice-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.profile-update-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  .analysis-grid,
  .rubric-grid,
  .advice-grid {
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
  .rubric-grid,
  .advice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
