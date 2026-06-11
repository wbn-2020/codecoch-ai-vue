<template>
  <div class="question-training-page page-shell">
    <section class="training-hero">
      <div class="hero-copy">
        <div class="eyebrow">
          <BookOpenCheck :size="16" />
          题库训练
        </div>
        <h1>今天先练这组题</h1>
        <p>围绕简历匹配、岗位短板和学习计划生成推荐题，把刷题变成面试前的专项补强。</p>
      </div>
      <div class="hero-actions">
        <el-button :loading="loading" @click="loadRecommendations">
          <RefreshCw :size="16" />
          刷新
        </el-button>
        <el-button type="primary" :loading="generating" :disabled="!canGenerate" @click="generateRecommendations">
          <Sparkles :size="16" />
          生成推荐
        </el-button>
        <el-button type="success" @click="startPrimaryPractice">
          <Play :size="16" />
          {{ primaryPracticeLabel }}
        </el-button>
      </div>
      <div class="hero-metrics">
        <div class="metric-tile">
          <span>推荐题</span>
          <strong>{{ items.length }}</strong>
        </div>
        <div class="metric-tile">
          <span>可练习</span>
          <strong>{{ actionableItems.length }}</strong>
        </div>
        <div class="metric-tile">
          <span>高风险</span>
          <strong>{{ highRiskCount }}</strong>
        </div>
      </div>
    </section>

    <section class="training-controls content-card">
      <div class="content-card__body controls-body">
        <div>
          <h2>推荐依据</h2>
          <p>{{ sourceDescription }}</p>
        </div>
        <div class="control-fields">
          <el-segmented v-model="query.source" :options="sourceOptions" @change="handleSourceChange" />
          <el-input-number v-model="query.questionCount" :min="3" :max="30" />
        </div>
        <div class="context-state" :class="{ 'is-ready': Boolean(query.sourceId) }">
          <Target :size="16" />
          <span>{{ contextStatusText }}</span>
        </div>
        <div v-if="showFallbackNotice" class="fallback-notice">
          <AlertTriangle :size="16" />
          <div>
            <strong>{{ fallbackNoticeTitle }}</strong>
            <p>{{ fallbackNoticeDesc }}</p>
          </div>
          <div class="fallback-notice__actions">
            <el-button type="success" plain @click="startFallbackPractice">先练一组</el-button>
            <el-button text type="primary" @click="router.push('/resumes')">补简历和岗位</el-button>
          </div>
        </div>
        <div class="trust-strip">
          <el-tag v-for="tag in recommendationTrustTags" :key="tag.label" :type="tag.type" effect="plain">
            {{ tag.label }}
          </el-tag>
        </div>
        <div v-if="generationDiagnostic" class="generation-diagnostic">
          <div class="generation-diagnostic__main">
            <span>{{ generationDiagnostic.batchId ? '推荐批次已记录' : '推荐批次待生成' }}</span>
            <strong>{{ generationStatusText }}</strong>
          </div>
          <div class="generation-diagnostic__meta">
            <span v-if="generationDiagnostic.questionCount">题量 {{ generationDiagnostic.questionCount }}</span>
            <span v-if="generationDiagnostic.aiCallLogId">推荐依据已保存</span>
            <span v-if="generationDiagnostic.asyncMessageId">任务已提交</span>
            <span v-if="generationDiagnostic.asyncTraceId">处理线索已记录</span>
            <span v-if="generationDiagnostic.sourceId">{{ generationSourceLabel }}已绑定</span>
            <span v-if="generationDiagnostic.errorMessage" class="is-error">{{ generationDiagnostic.errorMessage }}</span>
          </div>
          <el-button
            v-if="generationDiagnostic.asyncMessageId || generationDiagnostic.asyncTraceId"
            text
            type="primary"
            @click="openRecommendationTask"
          >
            查看任务中心
          </el-button>
        </div>
      </div>
    </section>

    <section class="training-grid">
      <main class="recommendations-panel content-card" v-loading="loading">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <h2>推荐训练组</h2>
              <p>{{ recommendationSummary }}</p>
            </div>
            <el-button text type="primary" @click="router.push('/questions/practice')">
              专项练习
              <ChevronRight :size="15" />
            </el-button>
          </div>

          <AppState v-if="loadError" type="error" title="推荐题加载失败" :description="loadError">
            <el-button type="primary" @click="loadRecommendations">重试</el-button>
          </AppState>
          <AppState
            v-else-if="!items.length"
            type="empty"
            title="还没有可用推荐"
            description="可以基于最近的能力画像、匹配报告或学习计划生成一组题。"
          >
            <el-button type="primary" :loading="generating" @click="generateRecommendations">生成推荐</el-button>
            <el-button type="success" @click="startFallbackPractice">推荐依据不足，先练一组</el-button>
            <el-button @click="router.push('/resumes')">补齐简历与岗位</el-button>
          </AppState>

          <div v-else class="question-stack">
            <article v-for="(item, index) in items" :key="item.id" class="question-card">
              <div class="question-rank">
                <span>{{ index + 1 }}</span>
              </div>
              <div class="question-body">
                <div class="question-title-row">
                  <div>
                    <h3>{{ item.questionTitle || `推荐题 ${index + 1}` }}</h3>
                    <p>
                      {{ item.skillName || item.skillCode || '综合能力' }}
                      <span>·</span>
                      {{ difficultyLabel(item.difficulty) }}
                      <span>·</span>
                      {{ questionTypeLabel(item.questionType) }}
                    </p>
                  </div>
                  <div class="question-badges">
                    <el-tag :type="severityTag(item.gapSeverity)" effect="plain">
                      {{ severityLabel(item.gapSeverity) }}
                    </el-tag>
                    <el-tag v-if="itemPracticeQuestionId(item)" type="success" effect="plain">已入库</el-tag>
                    <el-tag v-else type="warning" effect="plain">待入库</el-tag>
                  </div>
                </div>

                <div class="reason-box">
                  <div class="reason-title">
                    <strong>推荐原因</strong>
                    <el-tag size="small" :type="trustTagForItem(item).type" effect="plain">{{ trustTagForItem(item).label }}</el-tag>
                  </div>
                  <span>{{ item.recommendReason || item.questionContent || '这道题用于补齐当前岗位方向下的面试风险点。' }}</span>
                </div>

                <div class="hint-grid">
                  <div>
                    <span>回答提示</span>
                    <p>{{ item.answerHint || '先讲场景，再讲方案、权衡和项目指标。' }}</p>
                  </div>
                  <div>
                    <span>考察点</span>
                    <p>{{ item.evaluatePoints || item.skillName || item.skillCode || '核心概念、落地经验和追问边界。' }}</p>
                  </div>
                  <div>
                    <span>依据来源</span>
                    <p>{{ itemSourceText(item) }}</p>
                  </div>
                  <div>
                    <span>证据状态</span>
                    <p>{{ itemTrustText(item) }}</p>
                  </div>
                </div>

                <div class="question-actions">
                  <el-button :disabled="!itemPracticeQuestionId(item)" type="primary" @click="openQuestion(item)">
                    练这题
                    <ChevronRight :size="15" />
                  </el-button>
                  <el-button
                    :disabled="!itemPracticeQuestionId(item)"
                    @click="startSinglePractice(item)"
                  >
                    加入练习
                  </el-button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </main>

      <aside class="side-stack">
        <section class="content-card fallback-panel">
          <div class="content-card__body">
            <div class="side-title">
              <Play :size="17" />
              <h2>通用训练建议</h2>
            </div>
            <el-tag class="fallback-tag" type="warning" effect="plain">推荐依据不足</el-tag>
            <p class="side-muted">
              如果暂时没有简历、岗位描述或学习计划，先完成一组可练的题，练完后再把错题和反馈回流到今日计划。
            </p>
            <el-button type="success" plain @click="startFallbackPractice">
              {{ fallbackPanelActionText }}
            </el-button>
          </div>
        </section>

        <section class="content-card coach-panel">
          <div class="content-card__body">
            <div class="side-title">
              <Brain :size="17" />
              <h2>训练建议</h2>
            </div>
            <ol class="coach-steps">
              <li v-for="step in coachSteps" :key="step.title">
                <strong>{{ step.title }}</strong>
                <span>{{ step.desc }}</span>
              </li>
            </ol>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="side-title">
              <ListChecks :size="17" />
              <h2>快速入口</h2>
            </div>
            <div class="quick-links">
              <button type="button" @click="router.push('/questions/practice')">
                <Dumbbell :size="16" />
                <span>专项练习</span>
              </button>
              <button type="button" @click="router.push('/questions/wrong-records')">
                <RotateCcw :size="16" />
                <span>错题复盘</span>
              </button>
              <button type="button" @click="router.push('/questions/favorites')">
                <Bookmark :size="16" />
                <span>收藏题</span>
              </button>
              <button type="button" @click="router.push('/interviews/create')">
                <MessageSquare :size="16" />
                <span>模拟面试</span>
              </button>
            </div>
          </div>
        </section>

        <section class="content-card">
          <div class="content-card__body">
            <div class="side-title">
              <AlertTriangle :size="17" />
              <h2>高频风险</h2>
            </div>
            <div v-if="topSkillNames.length" class="skill-chips">
              <el-tag v-for="skill in topSkillNames" :key="skill" effect="plain">{{ skill }}</el-tag>
            </div>
            <p v-else class="side-muted">生成推荐后会汇总本轮最需要补强的知识点。</p>
          </div>
        </section>
      </aside>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  AlertTriangle,
  BookOpenCheck,
  Bookmark,
  Brain,
  ChevronRight,
  Dumbbell,
  ListChecks,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import type { LocationQueryRaw, LocationQueryValue } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import {
  getQuestionRecommendationBatchDetailApi,
  getQuestionRecommendationBatchItemsApi,
  getQuestionRecommendationItemsFromGapBatchApi,
  getQuestionRecommendationItemsFromMatchReportBatchApi,
  getQuestionRecommendationItemsFromStudyPlanBatchApi,
  submitQuestionRecommendationsFromGapApi,
  submitQuestionRecommendationsFromMatchReportApi,
  submitQuestionRecommendationsFromStudyPlanApi
} from '@/api/questionRecommendation'
import { getResumeJobMatchReportDetailApi, getResumeJobMatchReportsApi } from '@/api/resumeJobMatch'
import { getSkillProfileOverviewApi } from '@/api/skillProfile'
import { getStudyPlansApi } from '@/api/studyPlan'
import AppState from '@/components/common/AppState.vue'
import {
  QUESTION_RECOMMENDATION_SOURCE_TYPE,
  type QuestionRecommendationBatchDetailVO,
  type QuestionRecommendationGenerateVO,
  type QuestionRecommendationItemVO,
  type QuestionRecommendationStatus
} from '@/types/questionRecommendation'
import { getErrorMessage } from '@/utils/error'

type Source = 'gap' | 'matchReport' | 'studyPlan'
type RouterQueryValue = string | number | boolean | null | undefined
type GenerationDiagnostic = {
  batchId?: number
  status?: QuestionRecommendationStatus
  questionCount?: number
  aiCallLogId?: number
  sourceType?: string
  sourceId?: number
  errorMessage?: string
  trustStatus?: string
  evidenceSummary?: string
  fallback?: boolean
  asyncMessageId?: string | null
  asyncTraceId?: string | null
  asyncBizType?: string | null
  asyncBizId?: string | null
  asyncSendStatus?: string | null
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const generating = ref(false)
const loadError = ref('')
const items = ref<QuestionRecommendationItemVO[]>([])
const generationDiagnostic = ref<GenerationDiagnostic | null>(null)
const matchReportContextWarning = ref('')

const sourceByRouteValue: Record<string, Source> = {
  gap: 'gap',
  JD_GAP: 'gap',
  matchReport: 'matchReport',
  RESUME_JOB_MATCH: 'matchReport',
  studyPlan: 'studyPlan',
  STUDY_PLAN: 'studyPlan'
}

const sourceOptions = [
  { label: '能力短板', value: 'gap' },
  { label: '简历匹配', value: 'matchReport' },
  { label: '学习计划', value: 'studyPlan' }
]

const difficultyMap: Record<string, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难'
}

const questionTypeMap: Record<string, string> = {
  SINGLE_CHOICE: '单选',
  MULTIPLE_CHOICE: '多选',
  SHORT_ANSWER: '简答',
  SCENARIO: '场景题',
  CODING: '编程题',
  CASE_ANALYSIS: '案例分析'
}

const severityMap: Record<string, string> = {
  CRITICAL: '关键短板',
  HIGH: '高风险',
  MEDIUM: '中风险',
  LOW: '轻量补强',
  NORMAL: '常规训练'
}

const routeSource = String(route.query.source || route.query.sourceType || '')
const initialSource = (
  sourceByRouteValue[routeSource] || (route.query.studyPlanId ? 'studyPlan' : route.query.matchReportId ? 'matchReport' : 'gap')
) as Source

const toSingleValue = (value: LocationQueryValue | LocationQueryValue[]) => Array.isArray(value) ? value[0] : value

const getQueryNumber = (name: string) => {
  const raw = toSingleValue(route.query[name])
  const numberValue = Number(raw)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined
}

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

const sourceTypeBySource: Record<Source, string> = {
  gap: QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP,
  matchReport: QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH,
  studyPlan: QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN
}

const sourceDescriptions: Record<Source, string> = {
  gap: '从能力画像和岗位要求短板里挑最高风险的知识点。',
  matchReport: '从简历与岗位匹配报告里提取最可能被追问的题。',
  studyPlan: '把当前学习计划转成可立即练习的题组。'
}
const sourceLabels: Record<string, string> = {
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP]: '能力短板',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH]: '匹配报告',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN]: '学习计划',
  FALLBACK: '通用练习'
}
const sourceTrustLabels: Record<string, string> = {
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.JD_GAP]: '来自岗位要求 / 能力画像',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.RESUME_JOB_MATCH]: '来自简历匹配报告',
  [QUESTION_RECOMMENDATION_SOURCE_TYPE.STUDY_PLAN]: '来自学习计划',
  FALLBACK: '推荐依据不足'
}

const itemPracticeQuestionId = (item: QuestionRecommendationItemVO) => {
  if (item.canPractice === false) return undefined
  return item.practiceQuestionId || item.questionId
}
const actionableItems = computed(() => items.value.filter((item) => Boolean(itemPracticeQuestionId(item))))
const practiceQuestionIds = computed(() =>
  actionableItems.value
    .map(itemPracticeQuestionId)
    .filter((id): id is number => typeof id === 'number' && id > 0)
)
const hasPracticeQuestions = computed(() => practiceQuestionIds.value.length > 0)
const primaryPracticeLabel = computed(() => hasPracticeQuestions.value ? '开始推荐题组' : '先做一组通用训练')
const highRiskCount = computed(() =>
  items.value.filter((item) => ['CRITICAL', 'HIGH'].includes(String(item.gapSeverity || ''))).length
)
const topSkillNames = computed(() => {
  const names = items.value
    .map((item) => item.skillName || item.skillCode)
    .filter((name): name is string => Boolean(name))
  return [...new Set(names)].slice(0, 8)
})
const sourceDescription = computed(() => sourceDescriptions[query.source])
const canGenerate = computed(() => !generating.value)
const generationStatusText = computed(() => {
  const status = String(generationDiagnostic.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return '生成成功'
  if (status === 'FALLBACK' || generationDiagnostic.value?.fallback) return '推荐依据不足'
  if (status === 'FAILED') return '生成失败'
  if (generationDiagnostic.value?.asyncMessageId || generationDiagnostic.value?.asyncTraceId) return '已提交生成任务'
  if (status === 'PROCESSING') return '生成中'
  if (status === 'PENDING') return '待生成'
  return '推荐已生成'
})
const generationSourceLabel = computed(() => {
  const sourceType = generationDiagnostic.value?.sourceType || sourceTypeBySource[query.source]
  return sourceLabels[sourceType] || '来源'
})
const contextStatusText = computed(() => {
  if (matchReportContextWarning.value) return matchReportContextWarning.value
  if (query.sourceId) return '已读取到可用上下文'
  if (loading.value) return '正在读取最近上下文'
  return '会自动查找最近的简历、岗位描述或学习计划'
})
const showFallbackNotice = computed(() => !loading.value && !query.sourceId)
const fallbackNoticeTitle = computed(() => {
  if (query.source === 'matchReport') return '没有找到可信成功的简历匹配报告'
  if (query.source === 'studyPlan') return '没有找到进行中的学习计划'
  return '还没有可用能力画像'
})
const fallbackNoticeDesc = computed(() => {
  if (query.source === 'matchReport') return '这次没有可用的匹配结果；你可以先练一组，或补齐简历和岗位后重新生成。'
  if (query.source === 'studyPlan') return '当前没有可转成题组的学习计划；可以先做一组通用训练，或回到今日计划生成任务。'
  return '资料不足时会先给一组通用练习，帮你保持训练节奏；练完后错题和反馈仍可回流。'
})
const recommendationTrustTags = computed(() => [
  {
    label: generationDiagnostic.value?.evidenceSummary || sourceTrustLabels[sourceTypeBySource[query.source]] || sourceDescription.value,
    type: trustStatusType(generationDiagnostic.value?.trustStatus, query.sourceId ? 'success' : 'info')
  },
  {
    label: query.sourceId ? '推荐来源已绑定' : '暂无明确来源，可先练一组',
    type: generationDiagnostic.value?.fallback ? 'warning' : (query.sourceId ? 'success' : 'warning')
  },
  {
    label: hasPracticeQuestions.value ? `${practiceQuestionIds.value.length} 道可直接练习` : '已准备通用练习',
    type: hasPracticeQuestions.value ? 'success' : 'warning'
  }
] as Array<{ label: string; type: 'success' | 'warning' | 'info' }>)
const recommendationSummary = computed(() => {
  if (!items.value.length) return '生成推荐后，这里会按风险顺序展示今天优先练习的题；资料不足时也可以直接随机练一组。'
  if (!hasPracticeQuestions.value) return '本轮推荐暂时不能直接进入专项题，已为你准备一组通用练习，可以先练再回来刷新推荐。'
  return `已准备 ${practiceQuestionIds.value.length} 道可练习题，建议按顺序完成并提交 AI 点评。`
})
const coachSteps = computed(() => [
  {
    title: '先练高风险',
    desc: highRiskCount.value ? `本轮有 ${highRiskCount.value} 个高风险题，优先处理。` : '先完成推荐题组前 3 题。'
  },
  {
    title: '每题都要说项目',
    desc: '回答时补充业务场景、指标和权衡，避免只背概念。'
  },
  {
    title: '练完进面试房间',
    desc: '把不会的题带进模拟面试，训练追问和表达节奏。'
  }
])

const difficultyLabel = (value?: string | null) => value ? difficultyMap[value] || '难度待确认' : '未标注'
const questionTypeLabel = (value?: string | null) => value ? questionTypeMap[value] || '题型待确认' : '简答'
const severityLabel = (value?: string | null) => value ? severityMap[value] || '风险待确认' : '常规训练'
const severityTag = (value?: string | null) => {
  if (value === 'CRITICAL' || value === 'HIGH') return 'danger'
  if (value === 'MEDIUM') return 'warning'
  return 'info'
}
const trustStatusType = (
  value?: string | null,
  fallback: 'success' | 'warning' | 'info' = 'info'
): 'success' | 'warning' | 'info' => {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'VERIFIED') return 'success'
  if (normalized === 'FALLBACK') return 'warning'
  if (normalized === 'PARTIAL') return 'info'
  return fallback
}

const itemSourceText = (item: QuestionRecommendationItemVO) => {
  const sourceType = item.sourceType || sourceTypeBySource[query.source]
  const sourceLabel = sourceTrustLabels[sourceType] || sourceDescriptions[query.source]
  const sourceId = item.sourceId || query.sourceId
  return sourceId ? `${sourceLabel}已绑定` : `${sourceLabel}，暂无明确来源`
}

const itemTrustText = (item: QuestionRecommendationItemVO) => {
  if (item.evidenceSummary) return item.evidenceSummary
  if (!itemPracticeQuestionId(item)) return '这条暂时不能直接练，已为你准备通用练习。'
  if (!item.recommendReason && !item.answerHint && !item.evaluatePoints) return '已准备可练习题，建议结合题目详情复核。'
  return '已准备可练习题，并带有推荐原因、回答提示或考察点。'
}

const trustTagForItem = (item: QuestionRecommendationItemVO): { label: string; type: 'success' | 'warning' | 'info' } => {
  if (item.trustStatus) {
    const normalized = String(item.trustStatus || '').toUpperCase()
    const labels: Record<string, string> = {
      VERIFIED: '证据已记录',
      PARTIAL: '部分证据',
      FALLBACK: '推荐依据不足'
    }
    return { label: labels[normalized] || '证据待确认', type: trustStatusType(item.trustStatus) }
  }
  if (!itemPracticeQuestionId(item)) return { label: '仅建议，待入库', type: 'warning' }
  const sourceType = item.sourceType || sourceTypeBySource[query.source]
  return { label: sourceTrustLabels[sourceType] || '来源已记录', type: 'success' }
}

const trimForQuery = (value?: string | null, max = 180) => {
  const text = String(value || '').trim()
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const getQueryText = (...names: string[]) => {
  for (const name of names) {
    const raw = toSingleValue(route.query[name])
    const text = raw == null ? '' : String(raw).trim()
    if (text) return text
  }
  return ''
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
  '当前匹配报告暂不适合直接生成专项题；可以重新生成匹配报告，或先练一组通用题。'
const matchReportVerifyFailedMessage =
  '当前匹配报告暂时无法用于专项推荐，已切换为通用训练。'
const latestMatchReportVerifyFailedMessage =
  '最近一份匹配报告暂时无法用于专项推荐，已切换为通用训练。'

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

const fallbackKeyword = computed(() => getQueryText('skillName', 'keyword', 'jobTitle', 'targetPosition', 'targetJobName'))
const fallbackPracticeMode = computed(() => fallbackKeyword.value ? 'category' : 'random')
const fallbackEvidenceSummary = computed(() =>
  fallbackKeyword.value
    ? `暂时缺少可直接生成专项题的匹配报告，先围绕“${fallbackKeyword.value}”做岗位关键词练习。`
    : '暂时缺少可直接生成专项题的匹配报告，先做一组通用训练保持训练节奏。'
)
const fallbackPanelActionText = computed(() =>
  fallbackKeyword.value ? `按 ${fallbackKeyword.value} 先练 ${query.questionCount} 题` : `先随机练 ${query.questionCount} 题`
)

const compactRouterQuery = (params: Record<string, RouterQueryValue>) => {
  const result: LocationQueryRaw = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    result[key] = String(value)
  })
  return result
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
        '没有找到可用于推荐题的简历匹配报告；可以先生成报告，或先做一组通用训练。'
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

const setGenerationDiagnosticFromBatch = (batch?: QuestionRecommendationBatchDetailVO | null) => {
  if (!batch) return
  generationDiagnostic.value = {
    batchId: batch.batchId,
    status: batch.status,
    questionCount: batch.questionCount,
    aiCallLogId: batch.aiCallLogId,
    sourceType: batch.sourceType,
    sourceId: batch.sourceId,
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
    sourceType: result.sourceType || sourceTypeBySource[query.source],
    sourceId: result.sourceId || query.sourceId,
    trustStatus: result.trustStatus,
    evidenceSummary: result.evidenceSummary,
    fallback: result.fallback,
    asyncMessageId: result.asyncMessageId,
    asyncTraceId: result.asyncTraceId,
    asyncBizType: result.asyncBizType,
    asyncBizId: result.asyncBizId,
    asyncSendStatus: result.asyncSendStatus
  }
}

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
  if (message) {
    matchReportContextWarning.value = query.source === 'matchReport'
      ? message
      : matchReportContextWarning.value
  }
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
      setFallbackDiagnostic(matchReportContextWarning.value)
      items.value = []
      return
    }

    if (query.source === 'gap') {
      items.value = await getQuestionRecommendationItemsFromGapBatchApi({ skillProfileId: query.sourceId })
    } else if (query.source === 'matchReport') {
      items.value = await getQuestionRecommendationItemsFromMatchReportBatchApi(query.sourceId)
    } else {
      items.value = await getQuestionRecommendationItemsFromStudyPlanBatchApi(query.sourceId)
    }
  } catch (error) {
    items.value = []
    loadError.value = getErrorMessage(error, '读取推荐题失败。')
  } finally {
    loading.value = false
  }
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
      setFallbackDiagnostic(matchReportContextWarning.value)
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
    ElMessage.success(result?.asyncMessageId ? '推荐生成已提交，可在任务中心查看进度。' : '推荐生成已提交')
    if (!result?.asyncMessageId && result?.status === 'SUCCESS') {
      await loadRecommendations()
    }
  } catch (error) {
    loadError.value = getErrorMessage(error, '生成推荐题失败，请稍后重试。')
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

const buildQuestionQuery = (item: QuestionRecommendationItemVO) => {
  const skillProfileId = query.source === 'gap'
    ? query.sourceId
    : getQueryNumber('skillProfileId') || getQueryNumber('profileId')
  const matchReportId = query.source === 'matchReport' ? query.sourceId : getQueryNumber('matchReportId')
  const studyPlanId = query.source === 'studyPlan' ? query.sourceId : getQueryNumber('studyPlanId')
  const recommendationSourceId = item.sourceId || query.sourceId

  return compactRouterQuery({
    mode: 'recommended',
    recommendationItemId: item.id,
    batchId: item.batchId,
    sourceType: item.sourceType || sourceTypeBySource[query.source],
    sourceId: recommendationSourceId,
    skillProfileId,
    matchReportId,
    studyPlanId,
    targetJobId: getQueryNumber('targetJobId'),
    resumeId: getQueryNumber('resumeId'),
    skillName: trimForQuery(item.skillName || item.skillCode, 60),
    gapSeverity: item.gapSeverity,
    trustStatus: item.trustStatus || generationDiagnostic.value?.trustStatus,
    evidenceSummary: trimForQuery(item.evidenceSummary || generationDiagnostic.value?.evidenceSummary),
    fallback: item.fallback || generationDiagnostic.value?.fallback,
    recommendReason: trimForQuery(item.recommendReason || item.questionContent),
    answerHint: trimForQuery(item.answerHint),
    evaluatePoints: trimForQuery(item.evaluatePoints),
    questionIds: itemPracticeQuestionId(item)
  })
}

const buildPracticeQuery = (questionIds: number[], item?: QuestionRecommendationItemVO) => compactRouterQuery({
  mode: 'recommended',
  questionIds: questionIds.join(','),
  sourceType: item?.sourceType || sourceTypeBySource[query.source],
  sourceId: item?.sourceId || query.sourceId,
  trustStatus: item?.trustStatus || generationDiagnostic.value?.trustStatus,
  evidenceSummary: trimForQuery(item?.evidenceSummary || generationDiagnostic.value?.evidenceSummary),
  fallback: item?.fallback || generationDiagnostic.value?.fallback,
  skillName: trimForQuery(item?.skillName || item?.skillCode || topSkillNames.value[0], 60),
  recommendReason: trimForQuery(item?.recommendReason),
  count: Math.min(questionIds.length || query.questionCount, query.questionCount)
})

const openQuestion = (item: QuestionRecommendationItemVO) => {
  const questionId = itemPracticeQuestionId(item)
  if (!questionId) {
    ElMessage.warning('这条推荐暂时不能直接练，已为你准备通用练习。')
    return
  }
  router.push({
    path: `/questions/${questionId}`,
    query: buildQuestionQuery(item)
  })
}

const startRecommendedPractice = () => {
  if (!practiceQuestionIds.value.length) {
    ElMessage.warning('当前没有可练习的推荐题')
    return
  }
  router.push({
    path: '/questions/practice',
    query: buildPracticeQuery(practiceQuestionIds.value.slice(0, query.questionCount))
  })
}

const startPrimaryPractice = () => {
  if (hasPracticeQuestions.value) {
    startRecommendedPractice()
    return
  }
  startFallbackPractice()
}

const startFallbackPractice = () => {
  router.push({
    path: '/questions/practice',
    query: compactRouterQuery({
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
  })
}

const startSinglePractice = (item: QuestionRecommendationItemVO) => {
  const questionId = itemPracticeQuestionId(item)
  if (!questionId) return
  router.push({
    path: '/questions/practice',
    query: buildPracticeQuery([questionId], item)
  })
}

const handleSourceChange = async () => {
  query.sourceId = undefined
  matchReportContextWarning.value = ''
  items.value = []
  await loadRecommendations()
}

onMounted(loadRecommendations)
</script>

<style scoped lang="scss">
.question-training-page {
  gap: 18px;
}

.training-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 22px;
  padding: 28px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(16, 185, 129, 0.08)),
    #ffffff;
  box-shadow: var(--app-shadow);
}

.eyebrow,
.hero-actions,
.section-head,
.side-title,
.context-state,
.question-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.hero-copy {
  h1 {
    margin: 12px 0 0;
    color: var(--app-text);
    font-size: 32px;
    line-height: 1.18;
  }

  p {
    max-width: 680px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.hero-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.hero-metrics {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-tile {
  padding: 14px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);

  span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    color: var(--app-text);
    font-size: 26px;
  }
}

.controls-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 18px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 18px;
  }

  p {
    margin-top: 6px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.control-fields {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.context-state {
  justify-content: center;
  min-height: 34px;
  padding: 7px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: var(--app-text-muted);
  font-size: 13px;
  white-space: nowrap;

  &.is-ready {
    border-color: rgba(22, 163, 74, 0.2);
    background: #f0fdf4;
    color: #166534;
  }
}

.trust-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;

  :deep(.el-tag) {
    max-width: 100%;
    height: auto;
    min-height: 24px;
    white-space: normal;
  }
}

.fallback-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;

  > svg {
    margin-top: 2px;
    color: #f59e0b;
  }

  strong {
    display: block;
    color: #9a3412;
    font-size: 13px;
  }

  p {
    margin: 4px 0 0;
    color: #7c2d12;
    font-size: 13px;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
}

.fallback-notice__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.generation-diagnostic {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 10px 12px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 8px;
  background: #f8fafc;
}

.generation-diagnostic__main,
.generation-diagnostic__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.generation-diagnostic__main {
  color: var(--app-text);

  span {
    color: var(--app-text-muted);
    font-size: 13px;
  }

  strong {
    font-size: 14px;
  }
}

.generation-diagnostic__meta {
  color: var(--app-text-muted);
  font-size: 12px;

  .is-error {
    color: var(--el-color-danger);
  }
}

.training-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.section-head {
  justify-content: space-between;
  margin-bottom: 16px;

  h2,
  p {
    margin: 0;
  }

  h2 {
    font-size: 20px;
  }

  p {
    margin-top: 6px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.question-stack,
.side-stack,
.coach-steps,
.quick-links {
  display: grid;
  gap: 12px;
}

.question-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
}

.question-rank {
  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 800;
  }
}

.question-body {
  min-width: 0;
}

.question-title-row {
  display: flex;
  justify-content: space-between;
  gap: 14px;

  h3,
  p {
    margin: 0;
  }

  h3 {
    color: var(--app-text);
    font-size: 17px;
    line-height: 1.45;
  }

  p {
    margin-top: 6px;
    color: var(--app-text-muted);
    font-size: 13px;

    span {
      margin: 0 5px;
    }
  }
}

.question-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.reason-box {
  display: grid;
  gap: 6px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;

  strong {
    color: var(--app-text);
    font-size: 13px;
  }

  span {
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.reason-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.hint-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;

  div {
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
  }

  span {
    color: #2563eb;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 6px 0 0;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.question-actions {
  flex-wrap: wrap;
  margin-top: 14px;
}

.side-title {
  margin-bottom: 12px;

  h2 {
    margin: 0;
    font-size: 17px;
  }
}

.coach-panel {
  border-color: rgba(37, 99, 235, 0.18);
}

.fallback-panel {
  border-color: rgba(22, 163, 74, 0.2);

  .el-button {
    margin-top: 12px;
    width: 100%;
  }
}

.fallback-tag {
  margin-bottom: 10px;
}

.coach-steps {
  margin: 0;
  padding-left: 18px;

  li {
    padding-left: 4px;
  }

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--app-text);
  }

  span {
    margin-top: 4px;
    color: var(--app-text-muted);
    line-height: 1.6;
  }
}

.quick-links {
  grid-template-columns: repeat(2, minmax(0, 1fr));

  button {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 42px;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    color: var(--app-text);
    cursor: pointer;
    text-align: left;
  }
}

.skill-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.side-muted {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

:deep(.app-state) {
  background: #f8fafc;
}

@media (max-width: 980px) {
  .training-hero,
  .controls-body,
  .training-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .control-fields {
    justify-content: flex-start;
  }
}

@media (max-width: 680px) {
  .training-hero {
    padding: 20px;
  }

  .fallback-notice {
    grid-template-columns: 1fr;
  }

  .fallback-notice__actions {
    display: grid;
    grid-template-columns: 1fr;
    justify-content: stretch;

    :deep(.el-button) {
      width: 100%;
      margin-left: 0;
    }
  }

  .hero-metrics,
  .hint-grid,
  .quick-links {
    grid-template-columns: 1fr;
  }

  .question-card {
    grid-template-columns: 1fr;
  }

  .question-title-row {
    flex-direction: column;
  }

  .question-badges {
    justify-content: flex-start;
  }
}
</style>
