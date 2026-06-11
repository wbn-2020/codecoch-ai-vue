<template>
  <div class="v3-page">
    <section class="page-hero">
      <div>
        <div class="hero-kicker"><ListChecks :size="16" /> 推荐题目</div>
        <h1>推荐题目</h1>
        <p>优先使用最近的能力画像、匹配报告或学习计划生成训练题；资料不足时也会给出可先练的一组题。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadRecommendations"><RefreshCw :size="16" /> 刷新</el-button>
        <el-button type="primary" :loading="generating" :disabled="!canGenerate" @click="generateRecommendations">
          <Sparkles :size="16" /> {{ primaryActionText }}
        </el-button>
      </div>
    </section>

    <section class="content-panel">
      <el-form class="filter-form" :model="query" inline>
        <el-form-item label="来源">
          <el-segmented v-model="query.source" :options="sourceOptions" />
        </el-form-item>
        <el-form-item label="推荐依据">
          <el-input :model-value="sourceContextText" disabled />
          <div class="field-hint">会从最近的能力画像、匹配报告或学习计划自动带入，无需手动输入。</div>
        </el-form-item>
        <el-form-item label="题目数量">
          <el-input-number v-model="query.questionCount" :min="3" :max="20" />
        </el-form-item>
      </el-form>
      <div v-if="generationDiagnostic" class="diagnostic-strip">
        <div class="diagnostic-strip__main">
          <strong>推荐批次已记录</strong>
          <el-tag :type="generationStatusTag" effect="plain">{{ generationStatusText }}</el-tag>
          <el-tag :type="generationTrustTag" effect="plain">{{ generationTrustText }}</el-tag>
          <span>{{ generationModeText }}</span>
        </div>
        <div class="diagnostic-strip__meta">
          <span v-if="generationDiagnostic.questionCount">题量 {{ generationDiagnostic.questionCount }}</span>
          <span v-if="generationDiagnostic.aiCallLogId">推荐结果已保存</span>
          <span v-if="generationDiagnostic.asyncMessageId">处理进度已提交</span>
          <span v-if="generationDiagnostic.asyncTraceId">处理线索已记录</span>
          <span v-if="generationDiagnostic.sourceId">{{ generationSourceText }}依据已绑定</span>
          <span v-if="generationDiagnostic.errorMessage" class="is-error">{{ generationDiagnostic.errorMessage }}</span>
        </div>
        <div class="diagnostic-strip__evidence">
          <strong>推荐依据</strong>
          <span>{{ generationEvidenceText }}</span>
        </div>
        <el-button
          v-if="generationDiagnostic.asyncMessageId || generationDiagnostic.asyncTraceId"
          text
          type="primary"
          @click="openRecommendationTask"
        >
          <ExternalLink :size="15" />
          查看任务中心
        </el-button>
        <el-button
          v-if="generationDiagnostic.aiCallLogId"
          v-permission="'admin:ai:log:list'"
          text
          type="primary"
          @click="openRecommendationAiLog"
        >
          <ExternalLink :size="15" />
          查看处理记录
        </el-button>
      </div>
    </section>

    <section class="content-panel" v-loading="loading">
      <AppState v-if="loadError" type="error" title="推荐题加载失败" :description="loadError"><el-button type="primary" @click="loadRecommendations">重试</el-button></AppState>
      <AppState v-else-if="!items.length" type="empty" title="暂无推荐题" :description="emptyRecommendationDescription">
        <el-button type="primary" :loading="generating" :disabled="!canGenerate" @click="generateRecommendations">{{ primaryActionText }}</el-button>
        <el-button type="success" @click="startFallbackPractice">先做一组通用训练</el-button>
        <el-button @click="router.push('/dashboard')">回到今日计划</el-button>
      </AppState>
      <div v-else class="question-list">
        <div class="practice-strip">
          <div>
            <strong>{{ practiceStripTitle }}</strong>
            <span>{{ practiceStripDesc }}</span>
          </div>
          <el-button v-if="practiceQuestionIds.length" type="primary" @click="startRecommendedPractice">开始推荐题组</el-button>
          <el-button v-else type="success" @click="startFallbackPractice">先做一组通用训练</el-button>
        </div>
        <button
          v-for="item in items"
          :key="item.id"
          class="question-card"
          :class="{ 'question-card--disabled': !item.questionId }"
          type="button"
          @click="openQuestion(item)"
        >
          <span class="question-main">
            <strong>{{ item.questionTitle || '推荐题目' }}</strong>
            <small>{{ item.skillName || item.skillCode || '--' }} · {{ difficultyLabel(item.difficulty) }} · {{ questionTypeLabel(item.questionType) }}</small>
            <em>{{ item.recommendReason || item.questionContent || '暂无推荐理由' }}</em>
            <span class="question-evidence">{{ itemEvidenceText(item) }}</span>
          </span>
          <span class="question-tags">
            <el-tag effect="plain">{{ itemSourceLabel(item) }}</el-tag>
            <el-tag :type="itemTrustTag(item)" effect="plain">{{ itemTrustLabel(item) }}</el-tag>
            <el-tag :type="severityTag(item.gapSeverity)">{{ severityLabel(item.gapSeverity) }}</el-tag>
            <el-tag v-if="item.questionId" type="success" effect="plain">可练习</el-tag>
            <el-tag v-else type="warning" effect="plain">待入库/待审核</el-tag>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ExternalLink, ListChecks, RefreshCw, Sparkles } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import type { LocationQueryRaw } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { getResumeJobMatchReportDetailApi, getResumeJobMatchReportsApi } from '@/api/resumeJobMatch'
import {
  getQuestionRecommendationBatchesApi,
  getQuestionRecommendationBatchDetailApi,
  getQuestionRecommendationBatchItemsApi,
  submitQuestionRecommendationsFromGapApi,
  submitQuestionRecommendationsFromMatchReportApi,
  submitQuestionRecommendationsFromStudyPlanApi
} from '@/api/questionRecommendation'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import { getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import {
  QUESTION_RECOMMENDATION_SOURCE_TYPE,
  type QuestionRecommendationBatchListVO,
  type QuestionRecommendationGenerateVO,
  type QuestionRecommendationItemVO,
  type QuestionRecommendationSourceType
} from '@/types/questionRecommendation'
import { getErrorMessage } from '@/utils/error'

type Source = 'gap' | 'matchReport' | 'studyPlan'
type RouterQueryValue = string | number | boolean | null | undefined

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const items = ref<QuestionRecommendationItemVO[]>([])
const matchReportContextWarning = ref('')

interface GenerationDiagnostic {
  batchId?: number
  status?: string
  questionCount?: number
  aiCallLogId?: number
  sourceType?: string
  sourceId?: number
  errorMessage?: string
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
  trustStatus?: string
  evidenceSummary?: string
  fallback?: boolean
}

const generationDiagnostic = ref<GenerationDiagnostic | null>(null)

const sourceByRouteValue: Record<string, Source> = {
  gap: 'gap',
  JD_GAP: 'gap',
  matchReport: 'matchReport',
  RESUME_JOB_MATCH: 'matchReport',
  studyPlan: 'studyPlan',
  STUDY_PLAN: 'studyPlan'
}

const routeSource = String(route.query.source || route.query.sourceType || '')
const initialSource = (
  sourceByRouteValue[routeSource] || (route.query.studyPlanId ? 'studyPlan' : route.query.matchReportId ? 'matchReport' : 'gap')
) as Source

const initialSourceId = Number(
  route.query.sourceId ||
  (initialSource === 'studyPlan'
    ? route.query.studyPlanId
    : initialSource === 'matchReport'
      ? route.query.matchReportId
      : route.query.skillProfileId || route.query.profileId)
)

const query = reactive({
  source: initialSource,
  sourceId: (Number.isFinite(initialSourceId) && initialSourceId > 0 ? initialSourceId : undefined) as number | undefined,
  questionCount: 10
})

const sourceOptions = [
  { label: '能力短板', value: 'gap' },
  { label: '匹配报告', value: 'matchReport' },
  { label: '学习计划', value: 'studyPlan' }
]
const sourceContextText = computed(() => {
  const source = sourceOptions.find((item) => item.value === query.source)?.label || '推荐依据'
  return query.sourceId ? `${source}已自动绑定` : '自动选择最近可用依据'
})
const canGenerate = computed(() => !generating.value)
const hasRecommendationContext = computed(() => Boolean(query.sourceId))
const difficultyMap: Record<string, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难'
}
const questionTypeMap: Record<string, string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  SHORT_ANSWER: '简答题',
  CODING: '编程题',
  CASE_ANALYSIS: '案例分析'
}

const getQueryNumber = (name: string) => {
  const value = route.query[name]
  const raw = Array.isArray(value) ? value[0] : value
  const numberValue = Number(raw)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

const getQueryText = (...names: string[]) => {
  for (const name of names) {
    const value = route.query[name]
    const raw = Array.isArray(value) ? value[0] : value
    const text = raw == null ? '' : String(raw).trim()
    if (text) return text
  }
  return ''
}

const severityTag = (severity?: string) => severity === 'HIGH' || severity === 'CRITICAL' ? 'danger' : severity === 'MEDIUM' ? 'warning' : 'info'
const severityLabel = (severity?: string | null) => {
  const labels: Record<string, string> = {
    CRITICAL: '严重',
    HIGH: '高',
    MEDIUM: '中',
    LOW: '低',
    NORMAL: '常规'
  }
  return labels[String(severity || '').toUpperCase()] || '常规'
}
const difficultyLabel = (value?: string | null) => value ? difficultyMap[value] || '难度待确认' : '--'
const questionTypeLabel = (value?: string | null) => value ? questionTypeMap[value] || '题型待确认' : '--'
const sourceTypeBySource: Record<Source, QuestionRecommendationSourceType> = {
  gap: QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP,
  matchReport: QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH,
  studyPlan: QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN
}
const sourceLabels: Record<string, string> = {
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP]: '能力短板',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH]: '匹配报告',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN]: '学习计划',
  MATCH_REPORT: '匹配报告',
  SKILL_PROFILE: '能力画像',
  FALLBACK: '资料不足'
}
const generationStatusText = computed(() => {
  const status = String(generationDiagnostic.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return '生成成功'
  if (status === 'FALLBACK' || generationDiagnostic.value?.fallback) return '通用训练模式'
  if (status === 'FAILED') return '生成失败'
  if (generationDiagnostic.value?.asyncMessageId || generationDiagnostic.value?.asyncTraceId) return '处理进度已提交'
  if (status === 'GENERATING' || status === 'PROCESSING') return '生成中'
  if (status === 'PENDING') return '待生成'
  return '生成结果已记录'
})
const generationStatusTag = computed(() => {
  const status = String(generationDiagnostic.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'FALLBACK' || generationDiagnostic.value?.fallback) return 'warning'
  if (status === 'GENERATING' || status === 'PROCESSING' || status === 'PENDING') return 'warning'
  return 'info'
})
const generationSourceText = computed(() => sourceLabels[generationDiagnostic.value?.sourceType || sourceTypeBySource[query.source]] || '来源')
const generationTrustText = computed(() => trustStatusLabel(generationDiagnostic.value?.trustStatus, generationDiagnostic.value?.fallback))
const generationTrustTag = computed(() => trustStatusTag(generationDiagnostic.value?.trustStatus, generationDiagnostic.value?.fallback))
const generationEvidenceText = computed(() => {
  const diagnostic = generationDiagnostic.value
  if (matchReportContextWarning.value && query.source === 'matchReport') return matchReportContextWarning.value
  if (diagnostic?.evidenceSummary) return diagnostic.evidenceSummary
  return evidenceText(diagnostic?.sourceType || sourceTypeBySource[query.source], diagnostic?.sourceId || query.sourceId, diagnostic?.fallback)
})
const generationModeText = computed(() =>
  generationDiagnostic.value?.fallback
    ? '当前资料还不足以生成精准推荐，先进入可完成的练习；画像或匹配报告准备好后会自动提升推荐准确度。'
    : '已保留推荐批次和生成线索；稍后刷新可查看最新结果，失败时可按处理线索继续处理'
)
const emptyRecommendationDescription = computed(() =>
  matchReportContextWarning.value ||
  (hasRecommendationContext.value
    ? '当前来源还没有推荐题。可以先生成推荐批次；如果生成耗时较久，可稍后从任务中心回来查看。'
    : '当前还没有可用于专项推荐的能力画像、匹配报告或学习计划。可以先进入通用训练保持节奏。')
)
const fallbackKeyword = computed(() => getQueryText('skillName', 'keyword', 'jobTitle', 'targetPosition', 'targetJobName'))
const fallbackPracticeMode = computed(() => fallbackKeyword.value ? 'category' : 'random')
const fallbackEvidenceSummary = computed(() =>
  fallbackKeyword.value
    ? `暂时缺少可直接生成专项题的资料，先围绕“${fallbackKeyword.value}”做岗位关键词练习。`
    : '暂时缺少可直接生成专项题的资料，先做一组通用训练保持训练节奏。'
)
const primaryActionText = computed(() => {
  if (hasRecommendationContext.value) return '生成推荐'
  return fallbackKeyword.value ? '按关键词先练' : '先做一组通用训练'
})
const itemPracticeQuestionId = (item: QuestionRecommendationItemVO) => {
  if (item.canPractice === false) return undefined
  return item.practiceQuestionId || item.questionId
}
const practiceQuestionIds = computed(() =>
  items.value
    .map(itemPracticeQuestionId)
    .filter((id): id is number => typeof id === 'number' && id > 0)
    .slice(0, query.questionCount)
)
const practiceStripTitle = computed(() =>
  practiceQuestionIds.value.length ? `已准备 ${practiceQuestionIds.value.length} 道可练习题` : '推荐项尚未匹配正式题库'
)
const practiceStripDesc = computed(() =>
  practiceQuestionIds.value.length
    ? `建议先按推荐顺序完成一组，再回到今日计划查看下一步。${generationTrustText.value}。`
    : '待审核题暂不进入练习；先做一组通用训练，等推荐题入库后再回来刷新。'
)

const trustStatusLabel = (value?: string | null, fallback?: boolean | null) => {
  const status = String(value || '').toUpperCase()
  if (fallback || status === 'FALLBACK') return '推荐依据不足'
  if (status === 'VERIFIED') return '推荐来源已记录'
  if (status === 'PARTIAL') return '部分上下文'
  if (status === 'LOW_CONFIDENCE') return '匹配度偏低'
  return '来源待确认'
}

const trustStatusTag = (value?: string | null, fallback?: boolean | null) => {
  const status = String(value || '').toUpperCase()
  if (fallback || status === 'FALLBACK' || status === 'PARTIAL') return 'warning'
  if (status === 'VERIFIED') return 'success'
  if (status === 'LOW_CONFIDENCE') return 'danger'
  return 'info'
}

const evidenceText = (sourceType?: string | null, sourceId?: number, fallback?: boolean | null) => {
  const type = String(sourceType || '').toUpperCase()
  const suffix = sourceId ? '（依据已绑定）' : ''
  if (fallback || type === 'FALLBACK') return '推荐依据不足，已切换为通用训练；补齐简历、岗位或匹配报告后可生成更贴合的题目。'
  if (type === QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH || type === 'MATCH_REPORT') return `来自简历匹配报告${suffix}，报告完成后推荐会更贴合岗位。`
  if (type === QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP || type === 'SKILL_PROFILE') return `来自能力画像和岗位差距${suffix}，用于定位优先补强技能。`
  if (type === QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN) return `来自学习计划${suffix}，用于承接当前训练路线。`
  return '推荐来源待确认，请刷新或重新生成后再判断训练依据。'
}

const itemSourceLabel = (item: QuestionRecommendationItemVO) => sourceLabels[item.sourceType || generationDiagnostic.value?.sourceType || sourceTypeBySource[query.source]] || '来源待确认'
const itemTrustLabel = (item: QuestionRecommendationItemVO) => trustStatusLabel(item.trustStatus || generationDiagnostic.value?.trustStatus, item.fallback ?? generationDiagnostic.value?.fallback)
const itemTrustTag = (item: QuestionRecommendationItemVO) => trustStatusTag(item.trustStatus || generationDiagnostic.value?.trustStatus, item.fallback ?? generationDiagnostic.value?.fallback)
const itemEvidenceText = (item: QuestionRecommendationItemVO) =>
  item.evidenceSummary || evidenceText(
    item.sourceType || generationDiagnostic.value?.sourceType || sourceTypeBySource[query.source],
    item.sourceId || generationDiagnostic.value?.sourceId || query.sourceId,
    item.fallback ?? generationDiagnostic.value?.fallback
  )

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: LocationQueryRaw = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
}

const hasReportSchemaWarnings = (
  report: Awaited<ReturnType<typeof getResumeJobMatchReportDetailApi>> | null
) => {
  if (report?.schemaWarningCount == null) return true
  const warningCount = Number(report?.schemaWarningCount ?? 0)
  return (
    (Number.isFinite(warningCount) && warningCount > 0) ||
    (Array.isArray(report?.schemaWarnings) && report.schemaWarnings.length > 0)
  )
}

const isTrustedMatchReport = (report: Awaited<ReturnType<typeof getResumeJobMatchReportDetailApi>> | null) =>
  Boolean(
    report &&
    String(report.status || '').toUpperCase() === 'SUCCESS' &&
    !report.fallback &&
    String(report.trustStatus || '').toUpperCase() === 'VERIFIED' &&
    !hasReportSchemaWarnings(report)
  )

const matchReportUntrustedMessage =
  '当前匹配报告暂不适合直接生成专项题；可以重新生成匹配报告，或先做一组通用训练。'
const matchReportVerifyFailedMessage =
  '当前匹配报告暂时无法完成检查，已切换为通用训练；重新生成或稍后再试后可恢复精准推荐。'
const latestMatchReportVerifyFailedMessage =
  '最近的匹配报告详情暂时无法确认，已切换为通用训练；详情恢复后可继续生成精准推荐。'

const verifyTrustedMatchReport = async (reportId: number, failureMessage: string) => {
  try {
    const report = await getResumeJobMatchReportDetailApi(reportId)
    if (isTrustedMatchReport(report)) return true
    matchReportContextWarning.value = matchReportUntrustedMessage
    return false
  } catch (error) {
    matchReportContextWarning.value = getErrorMessage(error, failureMessage)
    return false
  }
}

const buildPracticeQuery = (item: QuestionRecommendationItemVO) => {
  const skillProfileId = query.source === 'gap'
    ? query.sourceId
    : getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  const matchReportId = query.source === 'matchReport' ? query.sourceId : getQueryNumber('matchReportId')
  const studyPlanId = query.source === 'studyPlan' ? query.sourceId : getQueryNumber('studyPlanId')
  const recommendationSourceId = item.sourceId || query.sourceId
  const targetJobId = getQueryNumber('targetJobId')
  const resumeId = getQueryNumber('resumeId')
  return {
    recommendationItemId: String(item.id),
    batchId: String(item.batchId),
    sourceType: item.sourceType || sourceTypeBySource[query.source],
    sourceId: recommendationSourceId ? String(recommendationSourceId) : undefined,
    skillProfileId: skillProfileId ? String(skillProfileId) : undefined,
    matchReportId: matchReportId ? String(matchReportId) : undefined,
    studyPlanId: studyPlanId ? String(studyPlanId) : undefined,
    targetJobId: targetJobId ? String(targetJobId) : undefined,
    resumeId: resumeId ? String(resumeId) : undefined
  }
}

const buildRecommendedPracticeQuery = (questionIds: number[]) =>
  compactRouterQuery({
    mode: 'recommended',
    questionIds: questionIds.join(','),
    sourceType: sourceTypeBySource[query.source],
    sourceId: query.sourceId,
    batchId: generationDiagnostic.value?.batchId,
    trustStatus: generationDiagnostic.value?.trustStatus || 'PARTIAL',
    evidenceSummary: generationDiagnostic.value?.evidenceSummary,
    fallback: generationDiagnostic.value?.fallback,
    recommendReason: '来自推荐批次中已匹配正式题库的题目。'
  })

const buildFallbackPracticeQuery = () =>
  compactRouterQuery({
    mode: fallbackPracticeMode.value,
    sourceType: 'FALLBACK',
    fallback: true,
    trustStatus: 'FALLBACK',
    count: query.questionCount,
    keyword: fallbackKeyword.value || undefined,
    evidenceSummary: fallbackEvidenceSummary.value,
    targetJobId: getQueryNumber('targetJobId'),
    resumeId: getQueryNumber('resumeId'),
    matchReportId: getQueryNumber('matchReportId'),
    skillProfileId: getQueryNumber('skillProfileId') || getQueryNumber('profileId'),
    recommendReason: fallbackEvidenceSummary.value
  })

const setFallbackDiagnostic = (message?: string) => {
  generationDiagnostic.value = {
    status: 'FALLBACK',
    questionCount: query.questionCount,
    sourceType: 'FALLBACK',
    errorMessage: message,
    trustStatus: 'FALLBACK',
    evidenceSummary: fallbackEvidenceSummary.value,
    fallback: true
  }
}

const hydrateContext = async () => {
  const routeSourceId =
    query.source === 'studyPlan'
      ? getQueryNumber('studyPlanId')
      : query.source === 'matchReport'
        ? getQueryNumber('matchReportId')
        : getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  if (routeSourceId) {
    if (query.source === 'matchReport') {
      const verified = await verifyTrustedMatchReport(routeSourceId, matchReportVerifyFailedMessage)
      if (!verified) {
        query.sourceId = undefined
        return
      }
      matchReportContextWarning.value = ''
    }
    query.sourceId = routeSourceId
    return
  }

  if (query.source === 'gap') {
    const overview = await getSkillProfileOverviewApi(getQueryNumber('targetJobId'))
    query.sourceId = overview.profileId
    return
  }

  if (query.source === 'matchReport') {
    matchReportContextWarning.value = ''
    const page = await getResumeJobMatchReportsApi({
      pageNo: 1,
      pageSize: 1,
      targetJobId: getQueryNumber('targetJobId'),
      resumeId: getQueryNumber('resumeId'),
      status: 'SUCCESS'
    })
    const latestReportId = page.records?.[0]?.reportId
    if (latestReportId) {
      query.sourceId = await verifyTrustedMatchReport(latestReportId, latestMatchReportVerifyFailedMessage)
        ? latestReportId
        : undefined
    }
    if (!query.sourceId) {
      matchReportContextWarning.value = matchReportContextWarning.value ||
        '还没有可用于推荐的简历匹配报告，可以先做一组通用训练，或生成新的匹配报告后再获取精准题目。'
    }
    return
  }

  const plans = await getStudyPlansApi({
    pageNo: 1,
    pageSize: 1,
    planStatus: 'ACTIVE',
    targetJobId: getQueryNumber('targetJobId'),
    matchReportId: getQueryNumber('matchReportId'),
    skillProfileId: getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  })
  query.sourceId = plans.records?.[0]?.id || plans.records?.[0]?.reportId
}

const loadRecommendations = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const batchId = getQueryNumber('batchId')
    if (batchId) {
      const detail = await getQuestionRecommendationBatchDetailApi(batchId)
      setGenerationDiagnosticFromBatch(detail)
      items.value = detail.items || await getQuestionRecommendationBatchItemsApi(batchId)
      return
    }
    if (!query.sourceId) {
      try {
        await hydrateContext()
      } catch (error) {
        setFallbackDiagnostic(getErrorMessage(error, '推荐依据暂不可用。'))
      }
    }
    if (!query.sourceId) {
      setFallbackDiagnostic(matchReportContextWarning.value || generationDiagnostic.value?.errorMessage)
      items.value = []
      return
    }
    items.value = await loadLatestBatchItems()
  } catch (error) {
    items.value = []
    loadError.value = getErrorMessage(error, '读取推荐题失败。')
  } finally {
    loading.value = false
  }
}

const buildLatestBatchQuery = () => ({
  sourceType: sourceTypeBySource[query.source],
  skillProfileId: query.source === 'gap' ? query.sourceId : undefined,
  matchReportId: query.source === 'matchReport' ? query.sourceId : undefined,
  studyPlanId: query.source === 'studyPlan' ? query.sourceId : undefined,
  pageNo: 1,
  pageSize: 1
})

const setGenerationDiagnosticFromBatch = (batch?: QuestionRecommendationBatchListVO | null) => {
  if (!batch) return
  generationDiagnostic.value = {
    batchId: batch.batchId,
    status: batch.status,
    questionCount: batch.questionCount,
    aiCallLogId: batch.aiCallLogId,
    sourceType: batch.sourceType,
    sourceId: batch.sourceId,
    errorMessage: batch.errorMessage,
    trustStatus: batch.trustStatus,
    evidenceSummary: batch.evidenceSummary,
    fallback: batch.fallback
  }
}

const setGenerationDiagnosticFromResult = (result?: QuestionRecommendationGenerateVO | null) => {
  if (!result) return
  generationDiagnostic.value = {
    batchId: result.batchId,
    status: result.status,
    questionCount: result.questionCount,
    aiCallLogId: result.aiCallLogId,
    sourceType: sourceTypeBySource[query.source],
    sourceId: query.sourceId,
    errorMessage: result.errorMessage,
    asyncMessageId: result.asyncMessageId,
    asyncTraceId: result.asyncTraceId,
    asyncBizType: result.asyncBizType,
    asyncBizId: result.asyncBizId,
    asyncSendStatus: result.asyncSendStatus,
    trustStatus: result.trustStatus,
    evidenceSummary: result.evidenceSummary,
    fallback: result.fallback
  }
}

const loadLatestBatchItems = async () => {
  const page = await getQuestionRecommendationBatchesApi(buildLatestBatchQuery())
  const batch = page.records?.[0]
  setGenerationDiagnosticFromBatch(batch)
  return batch ? getQuestionRecommendationBatchItemsApi(batch.batchId) : []
}

const refreshLatestBatchDiagnostic = async () => {
  if (!query.sourceId) return
  const page = await getQuestionRecommendationBatchesApi(buildLatestBatchQuery())
  setGenerationDiagnosticFromBatch(page.records?.[0])
}

const generateRecommendations = async () => {
  generating.value = true
  loadError.value = ''
  try {
    if (!query.sourceId) {
      try {
        await hydrateContext()
      } catch (error) {
        setFallbackDiagnostic(getErrorMessage(error, '推荐依据暂不可用。'))
      }
    }
    if (!query.sourceId) {
      setFallbackDiagnostic(matchReportContextWarning.value || generationDiagnostic.value?.errorMessage)
      ElMessage.info(fallbackKeyword.value ? '暂未找到可信推荐依据，先按关键词练一组。' : '暂未找到可信推荐依据，先做一组通用训练。')
      startFallbackPractice()
      return
    }
    let result: QuestionRecommendationGenerateVO | null = null
    if (query.source === 'gap') {
      result = await submitQuestionRecommendationsFromGapApi({ skillProfileId: query.sourceId, questionCount: query.questionCount })
    } else if (query.source === 'matchReport') {
      result = await submitQuestionRecommendationsFromMatchReportApi({ matchReportId: query.sourceId, questionCount: query.questionCount })
    } else {
      result = await submitQuestionRecommendationsFromStudyPlanApi({ studyPlanId: query.sourceId, questionCount: query.questionCount })
    }
    setGenerationDiagnosticFromResult(result)
    ElMessage.success(result?.asyncMessageId ? '推荐题已开始生成，可在任务中心查看进度。' : '推荐题已开始生成')
    if (!result?.asyncMessageId && result?.status === 'SUCCESS') {
      await loadRecommendations()
    }
  } catch (error) {
    loadError.value = getErrorMessage(error, '生成推荐题失败，请稍后重试。')
    await refreshLatestBatchDiagnostic().catch(() => undefined)
    ElMessage.error(loadError.value)
  } finally {
    generating.value = false
  }
}

const openRecommendationTask = () => {
  const diagnostic = generationDiagnostic.value
  if (!diagnostic) return
  router.push({
    path: '/agent/tasks',
    query: compactRouterQuery({
      messageId: diagnostic.asyncMessageId,
      traceId: diagnostic.asyncTraceId,
      bizType: diagnostic.asyncBizType || 'question-recommendation.generate',
      bizId: diagnostic.asyncBizId || diagnostic.batchId
    })
  })
}

const openRecommendationAiLog = () => {
  const aiCallLogId = generationDiagnostic.value?.aiCallLogId
  if (!aiCallLogId) return
  router.push({
    path: '/admin/ai/logs',
    query: {
      aiCallLogId: String(aiCallLogId),
      source: 'question-recommendation',
      batchId: generationDiagnostic.value?.batchId ? String(generationDiagnostic.value.batchId) : undefined
    }
  })
}

const openQuestion = (item: QuestionRecommendationItemVO) => {
  const questionId = itemPracticeQuestionId(item)
  if (!questionId) {
    ElMessage.warning('该推荐项尚未匹配到正式题库，待入库/审核后才能进入练习')
    return
  }
  router.push({
    path: `/questions/${questionId}`,
    query: buildPracticeQuery(item)
  })
}

const startRecommendedPractice = () => {
  if (!practiceQuestionIds.value.length) {
    startFallbackPractice()
    return
  }
  router.push({
    path: '/questions/practice',
    query: buildRecommendedPracticeQuery(practiceQuestionIds.value)
  })
}

const startFallbackPractice = () => {
  router.push({
    path: '/questions/practice',
    query: buildFallbackPracticeQuery()
  })
}

onMounted(loadRecommendations)
</script>

<style scoped lang="scss">
.v3-page { display: flex; flex-direction: column; gap: 18px; }
.page-hero, .content-panel { border: 1px solid var(--app-border); border-radius: 8px; background: var(--app-card-bg); box-shadow: var(--app-shadow); }
.page-hero { display: flex; justify-content: space-between; gap: 18px; padding: 24px; }
.hero-kicker, .hero-actions { display: flex; align-items: center; gap: 10px; }
.hero-kicker { color: var(--app-primary); font-size: 12px; font-weight: 700; text-transform: uppercase; }
h1, p { margin: 0; }
h1 { margin-top: 10px; font-size: 30px; }
p { margin-top: 8px; color: var(--app-text-muted); line-height: 1.7; }
.content-panel { padding: 20px; min-width: 0; }
.filter-form { display: flex; flex-wrap: wrap; gap: 8px; }
.field-hint { margin-top: 6px; color: var(--app-text-muted); font-size: 12px; }
.diagnostic-strip { display: grid; gap: 8px; margin-top: 16px; padding: 14px; border: 1px solid rgba(96, 165, 250, 0.24); border-radius: 8px; background: rgba(37, 99, 235, 0.08); }
.diagnostic-strip__main, .diagnostic-strip__meta, .diagnostic-strip__evidence { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; min-width: 0; }
.diagnostic-strip__main span, .diagnostic-strip__meta span, .diagnostic-strip__evidence span { color: var(--app-text-muted); overflow-wrap: anywhere; }
.diagnostic-strip__meta .is-error { color: var(--el-color-danger); }
.question-list { display: grid; gap: 12px; }
.practice-strip { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px; border: 1px solid rgba(34, 197, 94, 0.24); border-radius: 8px; background: rgba(22, 163, 74, 0.08); }
.practice-strip div { display: grid; gap: 4px; min-width: 0; }
.practice-strip strong, .practice-strip span { overflow-wrap: anywhere; }
.practice-strip span { color: var(--app-text-muted); font-size: 13px; line-height: 1.6; }
.question-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; width: 100%; padding: 16px; border: 1px solid var(--app-border); border-radius: 8px; background: rgba(15, 23, 42, 0.28); color: var(--app-text); text-align: left; cursor: pointer; }
.question-card--disabled { cursor: not-allowed; opacity: 0.78; }
.question-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.question-main strong, .question-main small, .question-main em { display: block; overflow-wrap: anywhere; }
.question-main small { margin-top: 5px; color: var(--app-text-muted); }
.question-main em { margin-top: 8px; font-style: normal; line-height: 1.6; }
.question-evidence { display: block; margin-top: 8px; color: var(--app-text-muted); font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
@media (max-width: 760px) { .page-hero, .practice-strip { flex-direction: column; align-items: stretch; } .hero-actions { flex-wrap: wrap; } .question-card { grid-template-columns: 1fr; } }
</style>
