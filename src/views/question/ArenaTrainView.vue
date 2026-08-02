<template>
  <div class="arena arena-train">
    <div class="arena-train__page">
      <header class="arena-train__head">
        <div class="arena-train__kicker">训练场 · 支线</div>
        <h1 class="arena-h1 arena-train__title">{{ todayFocusTitle }}</h1>
      </header>

      <section class="arena-train__grid">
        <main class="arena-col">
          <section class="arena-card arena-card--hero arena-train__hero">
            <div class="arena-row" style="gap: 8px; flex-wrap: wrap">
              <span class="arena-chip arena-chip--grn-solid">推荐 · {{ todayTrustTag.label }}</span>
              <span class="arena-xp-tag">+90 经验</span>
              <span class="arena-tiny">{{ hasPracticeQuestions ? `${practiceQuestionIds.length} 道可练` : '通用训练' }}</span>
            </div>
            <h2 class="arena-h2" style="margin-top: 13px">{{ todayPlanName }}</h2>
            <p class="arena-p" style="margin-top: 8px">{{ todayReasonText }}</p>
            <div class="arena-row" style="margin-top: 18px; flex-wrap: wrap">
              <button class="arena-btn arena-btn--pri" style="padding: 13px 24px" @click="startPrimaryPractice">⚔ {{ primaryPracticeLabel }}</button>
              <button class="arena-btn arena-btn--sec" style="padding: 12px 18px; font-size: 13.5px" :disabled="!canGenerate || generating" @click="generateRecommendations">{{ generating ? '生成中…' : '换一组' }}</button>
            </div>
          </section>

          <section class="arena-card arena-train__preview-card">
            <template v-if="loading">
              <div v-for="i in 3" :key="i" class="arena-train__skeleton"></div>
            </template>
            <div v-else-if="loadError" class="arena-train__state">
              <b>推荐题加载失败</b><p class="arena-p">{{ loadError }}</p>
              <button class="arena-btn arena-btn--pri" style="padding: 11px 20px" @click="loadRecommendations">重试</button>
            </div>
            <div v-else-if="!items.length" class="arena-train__state">
              <b>{{ recommendationEmptyState.title }}</b><p class="arena-p">{{ recommendationEmptyState.description }}</p>
              <div class="arena-row" style="flex-wrap: wrap">
                <button v-if="recommendationEmptyState.showFallback" class="arena-btn arena-btn--pri" style="padding: 11px 20px" @click="startFallbackPractice">{{ recommendationEmptyState.fallbackText }}</button>
                <button v-if="recommendationEmptyState.showGenerate" class="arena-btn arena-btn--sec" style="padding: 10px 18px; font-size: 13px" :disabled="!canGenerate || generating" @click="generateRecommendations">{{ recommendationEmptyState.generateText }}</button>
                <button v-if="recommendationEmptyState.showResumeLink" class="arena-btn arena-btn--txt" @click="router.push('/resumes')">补齐简历与岗位 →</button>
              </div>
            </div>
            <template v-else>
              <div class="arena-train__preview-heading">
                <b class="arena-h3">本组题目预览</b>
                <span class="arena-tiny">{{ practiceQuestionIds.length || items.length }} 题 · 选择 · 简答</span>
              </div>
              <article v-for="(item, index) in items.slice(0, 3)" :key="item.id" class="arena-train__level">
                <button type="button" class="arena-train__question-row" :disabled="!itemPracticeQuestionId(item)" @click="openQuestion(item)">
                  <span class="arena-train__level-rank" :class="{ 'is-boss': item.gapSeverity === 'CRITICAL' || item.gapSeverity === 'HIGH' }">{{ index + 1 }}</span>
                  <span class="arena-train__question-copy">
                    <b>{{ item.questionTitle || `今日训练题 ${index + 1}` }}</b>
                    <small>{{ item.skillName || item.skillCode || '综合能力' }} · {{ difficultyStars(item.difficulty) }} {{ difficultyLabel(item.difficulty) }} · {{ questionTypeLabel(item.questionType) }}</small>
                  </span>
                  <span class="arena-xp-tag">+18 XP/答对</span>
                </button>
              </article>
              <button v-if="items.length > 3" type="button" class="arena-train__remaining" @click="startPrimaryPractice"><span>还有 {{ items.length - 3 }} 题</span><b>开始题组查看全部 →</b></button>
            </template>
          </section>
        </main>

        <aside class="arena-col arena-train__side">
          <section class="arena-card arena-train__panel arena-train__revive">
            <div class="arena-h3">💀 错题复活点</div>
            <p class="arena-tiny" style="margin-top: 8px; line-height: 1.6">错题和收藏是下一轮训练的弹药库，复活后可以重新获得经验。</p>
            <button class="arena-btn arena-btn--sec" style="margin-top: 12px; padding: 10px 14px; font-size: 12.5px" @click="router.push('/questions/wrong-records')">复活错题</button>
          </section>
          <section class="arena-card arena-train__panel">
            <div class="arena-h3">本周训练</div>
            <div class="arena-train__week">
              <span v-for="day in weekTrainingDays" :key="day.label" :class="{ 'is-done': day.completed }"><b>{{ day.completed ? '⚡' : '·' }}</b><small>{{ day.label }}</small></span>
            </div>
            <p class="arena-tiny arena-train__week-note">{{ weekTrainingSummary }}</p>
          </section>
          <section class="arena-card arena-train__panel">
            <div class="arena-h3">更多练习方式</div>
            <div class="arena-train__quick">
              <button type="button" @click="router.push('/questions/favorites')">收藏复习</button>
              <button type="button" @click="router.push('/questions/practice')">按知识点</button>
              <button type="button" @click="router.push('/study-plans')">学习计划</button>
            </div>
          </section>
        </aside>
      </section>

      <details class="arena-card arena-train__controls">
        <summary class="arena-train__controls-summary"><span><b>训练设置与推荐依据</b><small>{{ contextStatusText }}</small></span><span class="arena-chip arena-chip--mut">展开</span></summary>
        <div class="arena-train__controls-row">
          <div class="arena-train__tabs" role="tablist" aria-label="推荐依据">
            <button v-for="opt in sourceOptions" :key="opt.value" type="button" role="tab" :aria-selected="query.source === opt.value" :class="{ 'is-active': query.source === opt.value }" @click="query.source = opt.value as Source; handleSourceChange()">{{ opt.label }}</button>
          </div>
          <div class="arena-train__stepper"><span class="arena-lbl" style="margin: 0">题数</span><button type="button" :disabled="query.questionCount <= 3" @click="query.questionCount = Math.max(3, query.questionCount - 1)">−</button><b>{{ query.questionCount }}</b><button type="button" :disabled="query.questionCount >= 30" @click="query.questionCount = Math.min(30, query.questionCount + 1)">＋</button></div>
          <div class="arena-train__context" :class="{ 'is-ready': Boolean(query.sourceId) }">{{ query.sourceId ? '🎯' : '·' }} {{ contextStatusText }}</div>
        </div>
        <p class="arena-tiny" style="margin-top: 10px">{{ sourceDescription }}</p>
        <div v-if="showFallbackNotice && items.length" class="arena-train__notice"><span>⚠</span><div style="flex: 1"><b>{{ fallbackNoticeTitle }}</b><p class="arena-tiny" style="margin-top: 2px">{{ fallbackNoticeDesc }}</p></div><button class="arena-btn arena-btn--sec" style="padding: 8px 14px; font-size: 12.5px" @click="startFallbackPractice">先练一组</button><button class="arena-btn arena-btn--txt" @click="router.push('/resumes')">补简历和岗位</button></div>
        <div v-if="generationDiagnostic" class="arena-train__diag"><div class="arena-row" style="gap: 8px; flex-wrap: wrap"><span class="arena-chip" :class="generationDiagnostic.fallback ? 'arena-chip--amber' : 'arena-chip--vio'">生成进度</span><b style="font-size: 12.5px">{{ generationStatusText }}</b><span v-if="generationDiagnostic.questionCount" class="arena-tiny">计划 {{ generationDiagnostic.questionCount }} 题</span><span v-if="generationDiagnostic.aiCallLogId" class="arena-tiny">依据已保存</span><span v-if="generationDiagnostic.asyncMessageId" class="arena-tiny">稍后可查看结果</span><span v-if="generationDiagnostic.sourceId" class="arena-tiny">{{ generationSourceLabel }}已匹配</span><span v-if="generationDiagnostic.errorMessage" class="arena-tiny" style="color: var(--arena-red)">{{ generationDiagnostic.errorMessage }}</span><button v-if="generationDiagnostic.asyncMessageId || generationDiagnostic.asyncTraceId" class="arena-btn arena-btn--txt" style="padding: 0" @click="openRecommendationTask">查看准备进度 →</button></div></div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
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
import { useGameProfileStore } from '@/features/game-profile'
import { useAuthStore } from '@/stores/auth'
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
const authStore = useAuthStore()
const gameProfile = useGameProfileStore()
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
  gap: '优先练岗位要求里最容易丢分的短板，先把高风险知识点转成可回答的题。',
  matchReport: '优先练简历和岗位之间最容易被追问的差距，提前准备项目证据和追问边界。',
  studyPlan: '把学习计划里的下一段目标拆成题组，练完后继续回流到今日计划和错题复盘。'
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
const weekTrainingDays = computed(() =>
  ['一', '二', '三', '四', '五'].map((label) => ({ label, completed: false }))
)
const weekTrainingSummary = computed(() =>
  gameProfile.streakDays > 0
    ? `当前连胜 ${gameProfile.streakDays} 天 · 本周完成记录暂未同步`
    : '本周完成记录暂未同步 · 完成一题后会继续积累连胜'
)
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
const firstActionableItem = computed(() => actionableItems.value[0])
const sourceDescription = computed(() => sourceDescriptions[query.source])
const canGenerate = computed(() => !generating.value && !loading.value)
const todayPlanName = computed(() => {
  const firstItem = firstActionableItem.value || items.value[0]
  if (firstItem?.skillName || firstItem?.skillCode) return firstItem.skillName || firstItem.skillCode || '今日训练题组'
  if (fallbackKeyword.value) return `${fallbackKeyword.value} 通用训练`
  if (query.source === 'matchReport') return '简历匹配短板训练'
  if (query.source === 'studyPlan') return '学习计划题组'
  return '通用训练题组'
})
const todayFocusTitle = computed(() => {
  if (hasPracticeQuestions.value) return `今天先练：${todayPlanName.value}`
  if (query.sourceId && !items.value.length) return '推荐题还没准备好，先保留通用训练入口'
  return '暂无可信专项来源，先做通用训练'
})
const todayFocusLead = computed(() => {
  if (hasPracticeQuestions.value) {
    return `已从真实来源中整理出 ${practiceQuestionIds.value.length} 道可练题，先完成题组，再把反馈带回错题复盘和模拟面试。`
  }
  if (query.sourceId) return '已经找到推荐依据，但当前没有返回可直接练的题；可以重新生成，或先做一组通用题保持节奏。'
  return '没有可靠简历、岗位、能力画像或学习计划时，不会伪造专项推荐；页面会诚实提供通用训练。'
})
const todayReasonText = computed(() => {
  if (generationDiagnostic.value?.fallback || !query.sourceId) return fallbackEvidenceSummary.value
  const sourceText = generationDiagnostic.value?.evidenceSummary || sourceDescription.value
  return `${sourceText} 练完后建议提交点评，并把错题或不稳回答带回下一轮训练。`
})
const todayTrustTag = computed(() => {
  if (generationDiagnostic.value?.fallback || !query.sourceId) {
    return { label: '来源不足，通用训练', type: 'warning' as const }
  }
  if (generationDiagnostic.value?.trustStatus) {
    return {
      label: generationStatusText.value,
      type: trustStatusType(generationDiagnostic.value.trustStatus, 'success')
    }
  }
  return { label: '来源已读取', type: 'success' as const }
})
const generationStatusText = computed(() => {
  const status = String(generationDiagnostic.value?.status || '').toUpperCase()
  if (status === 'SUCCESS') return '生成成功'
  if (status === 'FALLBACK' || generationDiagnostic.value?.fallback) return '推荐依据不足'
  if (status === 'FAILED') return '生成失败'
  if (generationDiagnostic.value?.asyncMessageId || generationDiagnostic.value?.asyncTraceId) return '题组准备中'
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
  if (query.source === 'studyPlan') return '当前没有可转成题组的学习计划；可以先做一组通用训练，或回到今日计划安排下一步。'
  return '资料不足时会先给一组通用练习，帮你保持训练节奏；练完后错题和反馈仍可回流。'
})
const recommendationEmptyState = computed(() => {
  const status = String(generationDiagnostic.value?.status || '').toUpperCase()
  if (generating.value) {
    return {
      title: '正在准备今日题组',
      description: '正在整理推荐依据，完成后会刷新本页结果；当前不需要重复提交。',
      showGenerate: false,
      generateText: '生成中',
      showFallback: false,
      fallbackText: '先练一组',
      showResumeLink: false
    }
  }
  if (generationDiagnostic.value?.asyncMessageId || generationDiagnostic.value?.asyncTraceId || status === 'PROCESSING' || status === 'PENDING') {
    return {
      title: '题组正在准备',
      description: '今日题组还在生成或等待结果回写。可以稍后刷新，当前不需要重复提交。',
      showGenerate: false,
      generateText: '生成今日题组',
      showFallback: true,
      fallbackText: '等待期间先练一组',
      showResumeLink: false
    }
  }
  if (status === 'FAILED' || generationDiagnostic.value?.errorMessage) {
    return {
      title: '推荐生成没有完成',
      description: generationDiagnostic.value?.errorMessage || '本次题组生成没有完成，可以重试生成，或先进入通用训练保持节奏。',
      showGenerate: true,
      generateText: '重新生成',
      showFallback: true,
      fallbackText: '先练一组',
      showResumeLink: true
    }
  }
  if (generationDiagnostic.value?.fallback || !query.sourceId) {
    const reason = matchReportContextWarning.value || generationDiagnostic.value?.errorMessage || fallbackNoticeDesc.value
    return {
      title: fallbackNoticeTitle.value,
      description: reason,
      showGenerate: true,
      generateText: '重新查找依据',
      showFallback: true,
      fallbackText: fallbackKeyword.value ? '按岗位关键词先练一组' : '先练一组通用题',
      showResumeLink: query.source === 'matchReport' || query.source === 'gap'
    }
  }
  return {
    title: '暂时没有推荐题',
    description: '已经找到推荐依据，但本轮没有返回可练题。可以重新生成，或先做一组通用训练。',
    showGenerate: true,
    generateText: '重新生成',
    showFallback: true,
    fallbackText: '先练一组',
    showResumeLink: false
  }
})
const nextStepCards = computed(() => [
  {
    title: '提交 AI 点评',
    desc: hasPracticeQuestions.value ? '先进入题目详情作答，提交后看点评、参考答案和下一步。' : '通用训练同样可以提交答案，保留练习节奏。'
  },
  {
    title: '复盘错题和收藏',
    desc: highRiskCount.value ? `本轮有 ${highRiskCount.value} 个高风险点，练完优先沉淀到错题复盘。` : '把不确定的题加入错题或收藏，形成下一轮复习素材。'
  },
  {
    title: '带去模拟面试',
    desc: '把已练题转成面试表达，再回到能力图谱看下一组训练入口。'
  }
])

const difficultyLabel = (value?: string | null) => value ? difficultyMap[value] || '难度待确认' : '未标注'
const difficultyStars = (value?: string | null) => {
  if (value === 'EASY') return '★☆☆'
  if (value === 'MEDIUM') return '★★☆'
  if (value === 'HARD') return '★★★'
  return '☆☆☆'
}
const questionTypeLabel = (value?: string | null) => value ? questionTypeMap[value] || '题型待确认' : '简答'
const severityLabel = (value?: string | null) => value ? severityMap[value] || '风险待确认' : '常规训练'
const severityChipClass = (value?: string | null) => {
  if (value === 'CRITICAL' || value === 'HIGH') return 'arena-chip--red'
  if (value === 'MEDIUM') return 'arena-chip--amber'
  return 'arena-chip--mut'
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
  if (!itemPracticeQuestionId(item)) return { label: '仅建议，暂不可直接练', type: 'warning' }
  const sourceType = item.sourceType || sourceTypeBySource[query.source]
  return { label: sourceTrustLabels[sourceType] || '来源已记录', type: 'success' }
}

const trustChipClass = (item: QuestionRecommendationItemVO) => {
  const type = trustTagForItem(item).type
  if (type === 'success') return 'arena-chip--grn'
  if (type === 'warning') return 'arena-chip--amber'
  return 'arena-chip--mut'
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
    ElMessage.success(result?.asyncMessageId ? '题组正在准备，可查看进度。' : '题组已开始准备')
    if (!result?.asyncMessageId && result?.status === 'SUCCESS') {
      await loadRecommendations()
    }
  } catch (error) {
    loadError.value = getErrorMessage(error, '生成今日题组失败，请稍后重试。')
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
    fallback: item.fallback || generationDiagnostic.value?.fallback,
    questionIds: itemPracticeQuestionId(item)
  })
}

const buildPracticeQuery = (questionIds: number[], item?: QuestionRecommendationItemVO) => compactRouterQuery({
  mode: 'recommended',
  questionIds: questionIds.join(','),
  sourceType: item?.sourceType || sourceTypeBySource[query.source],
  sourceId: item?.sourceId || query.sourceId,
  trustStatus: item?.trustStatus || generationDiagnostic.value?.trustStatus,
  fallback: item?.fallback || generationDiagnostic.value?.fallback,
  skillName: trimForQuery(item?.skillName || item?.skillCode || topSkillNames.value[0], 60),
  autoStart: questionIds.length ? true : undefined,
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
      targetJobId: getQueryNumber('targetJobId'),
      resumeId: getQueryNumber('resumeId'),
      matchReportId: getQueryNumber('matchReportId'),
      skillProfileId: getQueryNumber('skillProfileId') || getQueryNumber('profileId')
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

onMounted(() => {
  gameProfile.hydrate(authStore.userInfo?.id)
  void loadRecommendations()
})
</script>

<style scoped lang="scss">
.arena-train {
  min-height: calc(100vh - 64px);
  margin: 0;

  &__page {
    width: min(990px, 100%);
    margin: 0 auto;
    padding: 30px 24px 48px;
  }

  &__kicker {
    color: var(--arena-grn-d);
    font-size: 12.5px;
    font-weight: 800;
  }

  &__title {
    margin-top: 5px;
    font-size: 28px;
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr);
    gap: 20px;
    align-items: start;
    margin-top: 22px;
  }

  &__hero {
    padding: 24px 26px;
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #fff 72%);
  }

  &__preview-card,
  &__panel,
  &__controls {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #fff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  &__preview-card {
    display: grid;
    gap: 8px;
    margin-top: 14px;
    padding: 18px 20px;
  }

  &__preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 5px;
  }

  &__level {
    overflow: hidden;
    border: 1.5px solid var(--arena-line2);
    border-radius: 11px;
  }

  &__question-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 11px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    background: transparent;
    color: var(--arena-ink);
    text-align: left;
    cursor: pointer;
    font: inherit;

    &:not(:disabled):hover {
      background: #f8faf8;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.62;
    }
  }

  &__level-rank {
    display: grid;
    place-items: center;
    width: 23px;
    height: 23px;
    border-radius: 8px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-size: 11px;
    font-weight: 900;

    &.is-boss {
      background: var(--arena-red-soft);
      color: var(--arena-red);
    }
  }

  &__question-copy {
    min-width: 0;

    b,
    small {
      display: block;
    }

    b {
      overflow: hidden;
      color: var(--arena-ink);
      font-size: 13px;
      line-height: 1.45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      margin-top: 3px;
      color: var(--arena-mut);
      font-size: 11px;
    }
  }

  &__question-detail {
    border-top: 1px solid var(--arena-line2);

    summary {
      padding: 8px 12px;
      color: var(--arena-sub);
      cursor: pointer;
      font-size: 11px;
      font-weight: 700;
      list-style: none;
    }

    summary::-webkit-details-marker {
      display: none;
    }

    summary::after {
      content: '+';
      float: right;
      color: var(--arena-grn-d);
    }

    &[open] summary::after {
      content: '-';
    }

    > div {
      display: grid;
      gap: 7px;
      padding: 0 12px 12px;
    }

    p {
      margin: 0;
      color: var(--arena-sub);
      font-size: 11.5px;
      line-height: 1.55;
    }
  }

  &__remaining {
    width: 100%;
    padding: 7px 10px 2px;
    border: 0;
    background: transparent;
    color: var(--arena-mut);
    cursor: pointer;
    font: inherit;
    font-size: 12px;

    b {
      margin-left: 5px;
      color: var(--arena-grn-d);
    }
  }

  &__side {
    gap: 14px;
  }

  &__panel {
    padding: 20px 22px;
  }

  &__revive {
    border-color: #f3ddc0;
    background: linear-gradient(145deg, #fff, #fffaf2);
  }

  &__week {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-top: 14px;

    span {
      display: grid;
      justify-items: center;
      gap: 5px;
      color: var(--arena-mut);
      font-size: 11px;
    }

    b {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: #e8ede9;
      color: var(--arena-mut);
      font-size: 14px;
    }

    .is-done b {
      background: var(--arena-grn);
      color: #fff;
    }

    .is-today b {
      background: var(--arena-amber);
      box-shadow: 0 0 0 3px var(--arena-amber-soft);
      color: #fff;
    }
  }

  &__week-note {
    margin: 12px 0 0;
    text-align: center;
  }

  &__quick {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;

    button {
      border: 0;
      border-radius: 999px;
      background: #f2f4f2;
      color: var(--arena-sub);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      padding: 6px 10px;

      &:hover {
        background: var(--arena-grn-soft);
        color: var(--arena-grn-d);
      }
    }
  }

  &__controls {
    margin-top: 14px;
    padding: 15px 18px;
  }

  &__controls-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }

    > span:first-child {
      display: grid;
      gap: 3px;
    }

    b {
      color: var(--arena-ink);
      font-size: 13px;
    }

    small {
      color: var(--arena-mut);
      font-size: 11px;
    }
  }

  &__controls[open] .arena-train__controls-summary {
    margin-bottom: 14px;
  }

  &__controls-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
  }

  &__tabs {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background: #f2f4f2;

    button {
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: var(--arena-sub);
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 800;
      padding: 7px 12px;

      &.is-active {
        background: #fff;
        color: var(--arena-grn-d);
        box-shadow: 0 1px 3px rgba(21, 33, 27, 0.1);
      }
    }
  }

  &__stepper {
    display: inline-flex;
    align-items: center;
    gap: 8px;

    button {
      width: 26px;
      height: 26px;
      border: 1.5px solid var(--arena-line);
      border-radius: 8px;
      background: #fff;
      color: var(--arena-grn-d);
      cursor: pointer;
      font: inherit;
      font-weight: 900;
    }
  }

  &__context,
  &__notice,
  &__diag {
    color: var(--arena-sub);
    font-size: 12px;
  }

  &__context.is-ready {
    color: var(--arena-grn-d);
  }

  &__notice,
  &__diag {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 11px;
  }

  &__notice {
    background: var(--arena-amber-soft);
  }

  &__diag {
    border: 1.5px dashed var(--arena-line);
  }

  &__state {
    display: grid;
    justify-items: start;
    gap: 9px;
    min-height: 180px;
    padding: 26px;
  }

  &__skeleton {
    height: 44px;
    border-radius: 11px;
    background: linear-gradient(90deg, #fff, #f4f7f4, #fff);
    background-size: 200% 100%;
    animation: arenaShimmer 1.4s infinite;
  }
}

@keyframes arenaShimmer {
  to {
    background-position: -200% 0;
  }
}

@media (max-width: 720px) {
  .arena-train {
    margin: 0;

    &__page {
      padding: 18px 14px calc(26px + var(--user-mobile-nav-height, 0px));
    }

    &__title {
      font-size: 27px;
    }

    &__grid {
      grid-template-columns: 1fr;
      gap: 20px;
      margin-top: 22px;
    }

    &__hero {
      padding: 25px 26px;
    }

    &__preview-card {
      padding: 18px 20px;
    }

    &__side {
      gap: 16px;
    }

    &__panel {
      padding: 20px 22px;
    }

    &__question-row {
      grid-template-columns: auto minmax(0, 1fr);
    }

    &__question-row .arena-xp-tag {
      display: none;
    }

    &__question-copy b {
      overflow: visible;
      white-space: normal;
    }

    &__controls-row,
    &__notice {
      align-items: flex-start;
    }

    &__tabs {
      max-width: 100%;
      overflow-x: auto;
    }
  }
}
</style>
