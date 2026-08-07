<template>
  <div class="arena arena-practice practice-session-page page-shell">
    <section v-if="!practicing && !finished" class="practice-ready">
      <div class="practice-ready__head">
        <span class="arena-kicker">答题间</span>
        <span class="arena-xp-tag">+18 / 题</span>
      </div>
      <h1>{{ loadError ? '本轮训练暂未开始' : '正在准备本轮训练' }}</h1>
      <p>{{ loadError ? '题目暂时无法加载。请返回推荐训练页调整题组后再进入答题间。' : heroSubtitle }}</p>
      <div class="practice-ready__actions">
        <el-button @click="router.push('/questions/recommendations')">回推荐题组</el-button>
        <el-button v-if="loadError" type="primary" size="large" :loading="loadingQuestions" @click="startPractice">
          <Play :size="16" /> 重新加载
        </el-button>
      </div>
      <AppState v-if="loadError" type="error" title="题目加载失败" :description="loadError" />
      <el-alert v-if="partialLoadWarning && !loadError" type="warning" :title="partialLoadWarning" :closable="false" show-icon />
    </section>

    <section v-if="practicing" class="practice-stage">
      <header class="practice-progress">
        <div class="practice-progress__head">
          <div class="practice-progress__identity"><el-button class="practice-progress__exit" plain @click="finishPractice">‹ 退出</el-button><strong>{{ currentModeLabel }}</strong></div>
          <span class="practice-progress__count">第 {{ currentIndex + 1 }} / {{ questions.length }} 题</span>
        </div>
        <el-progress :percentage="progressPercent" :show-text="false" />
      </header>

      <main v-if="currentQuestion" class="practice-question-card">
        <div class="practice-question-card__meta"><span class="arena-chip arena-chip--grn">{{ difficultyLabel(currentQuestion.difficulty) }}</span><span>建议 3 分钟</span></div>
        <h2>{{ currentQuestion.title }}</h2>
        <MarkdownPreview
          v-if="shouldShowCurrentQuestionPrompt"
          class="practice-question-card__prompt"
          :content="currentQuestionPrompt"
        />

        <template v-if="!answered">
          <el-input v-model="userAnswer" class="practice-answer-input" type="textarea" :rows="7" maxlength="5000" show-word-limit placeholder="按你的真实排查思路写，AI 会对照评分点给反馈…" :disabled="submitting" />
          <div class="practice-answer-actions">
            <el-button class="practice-answer-actions__skip" :disabled="submitting" @click="skipQuestion">跳过 · 不记分</el-button>
            <div><span>答对 +18 XP</span><el-button type="primary" :loading="submitting" :disabled="!userAnswer.trim()" @click="submitAnswer"><Send :size="16" /> 提交答案 ✓</el-button></div>
          </div>
        </template>

        <section v-else class="practice-review">
          <el-alert :type="lastResult?.isCorrect ? 'success' : 'warning'" show-icon :closable="false" :title="lastResult?.isCorrect ? '回答通过' : '需要补强'" :description="resultDescription" />
          <div class="practice-review__coverage">
            <span v-for="item in answerCoverageItems" :key="item.title" :class="{ 'is-done': item.done }">{{ item.title }}：{{ item.done ? '已覆盖' : item.hint }}</span>
          </div>
          <details><summary>查看参考答案与 AI 点评</summary><div class="practice-review__detail"><section><h3>参考答案</h3><MarkdownPreview :content="referenceAnswerText" /></section><section><h3>AI 点评与解析</h3><MarkdownPreview :content="analysisText" /></section></div></details>
          <div class="practice-review__actions">
            <el-button type="primary" @click="nextQuestion">{{ isLastQuestion ? '查看结果' : '下一题' }} <ArrowRight :size="16" /></el-button>
            <el-button-group><el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.MASTERED ? 'success' : ''" @click="markMastery(MASTERY_STATUS.MASTERED)">已掌握</el-button><el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.VAGUE ? 'warning' : ''" @click="markMastery(MASTERY_STATUS.VAGUE)">模糊</el-button><el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.UNKNOWN ? 'danger' : ''" @click="markMastery(MASTERY_STATUS.UNKNOWN)">未掌握</el-button></el-button-group>
          </div>
        </section>
      </main>
      <AppState v-else type="empty" title="当前没有可作答的题目" description="请重新加载，或返回推荐题组。" />

      <div class="practice-support-grid">
        <section class="practice-support-card practice-support-card--ai"><div><span>✦ AI 骨架</span><b>评分点提示（可关）</b></div><p>{{ answered ? '已生成点评，展开当前题中的复盘即可查看。' : '① 先给结论 ② 说明排查路径 ③ 补充对象来源 ④ 给出修复与验证。' }}</p></section>
        <section class="practice-support-card"><b>📎 可引用项目证据</b><p>{{ sourceText }}</p></section>
      </div>
    </section>

    <section v-if="finished" class="practice-finish">
      <span class="arena-kicker">本轮结算</span><h1>训练完成</h1><p>{{ completionInsight }}</p>
      <div class="practice-finish__stats"><span>总题数 <b>{{ questions.length }}</b></span><span>已答 <b>{{ answeredCount }}</b></span><span>正确 <b>{{ correctCount }}</b></span><span>跳过 <b>{{ skippedCount }}</b></span><span>正确率 <b>{{ accuracyText }}</b></span><span>用时 <b>{{ elapsedText }}</b></span></div>
      <el-alert v-if="lastResult?.agentTaskCompleted" type="success" :closable="false" show-icon :title="lastResult.agentTaskTitle || '今日计划已同步记录'" />
      <div class="practice-finish__actions"><el-button type="primary" @click="resetPractice">再练一轮</el-button><el-button @click="router.push('/questions/wrong-records')">错题复盘</el-button><el-button @click="router.push('/questions/favorites')">收藏复习</el-button><el-button @click="router.push('/ability-map')">能力图谱</el-button><el-button @click="router.push('/interviews/create')">模拟面试</el-button></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  Bookmark,
  Boxes,
  Dumbbell,
  Play,
  RotateCcw,
  Send,
  Shuffle,
  Target
} from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getFavoriteQuestionsApi,
  getQuestionDetailApi,
  getQuestionsApi,
  getWrongQuestionsApi,
  submitQuestionAnswerApi,
  updateQuestionMasteryApi
} from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import { MASTERY_STATUS } from '@/constants/enums'
import { useGameProfileStore } from '@/features/game-profile'
import type { FavoriteQuestionVO, MasteryStatus, QuestionDetailVO, WrongQuestionVO } from '@/types/question'
import { confirmDangerActionPreview } from '@/utils/dangerAction'
import { getErrorMessage } from '@/utils/error'

type PracticeMode = 'recommended' | 'random' | 'category' | 'wrong' | 'favorite'
type PracticeQuestionRecord = QuestionDetailVO | FavoriteQuestionVO | WrongQuestionVO

interface ModeOption {
  value: PracticeMode
  label: string
  desc: string
  icon: Component
}

interface PracticeAnswerResult {
  isCorrect?: boolean
  wrong?: boolean
  aiComment?: string
  referenceAnswer?: string
  answerResult?: string
  masteryStatus?: string
  agentTaskCompleted?: boolean
  agentTaskId?: number
  agentTaskTitle?: string
  agentTaskStatus?: string
  agentReviewSummary?: string
}

const route = useRoute()
const router = useRouter()
const gameProfile = useGameProfileStore()

const queryString = (name: string) => {
  const value = route.query[name]
  const raw = Array.isArray(value) ? value[0] : value
  return raw ? String(raw) : ''
}

const parseQuestionIds = () => {
  const raw = queryString('questionIds') || queryString('questionId')
  return raw
    .split(/[,\s]+/)
    .map((item) => Number(item))
    .filter((id) => Number.isFinite(id) && id > 0)
}

const initialMode = (() => {
  const mode = queryString('mode') as PracticeMode
  if (['recommended', 'random', 'category', 'wrong', 'favorite'].includes(mode)) return mode
  if (parseQuestionIds().length) return 'recommended'
  if (
    queryString('skillName')
    || queryString('keyword')
    || queryString('categoryId')
    || queryString('difficulty')
  ) {
    return 'category'
  }
  return 'random'
})()

const routeQuestionIds = computed(parseQuestionIds)
const routeRecommendReason = computed(() => '')
const routeSourceType = computed(() => queryString('sourceType'))
const routeSourceId = computed(() => queryString('sourceId'))
const routeTargetJobId = computed(() => {
  const value = Number(queryString('targetJobId'))
  return Number.isFinite(value) && value > 0 ? value : undefined
})
const routeTrustStatus = computed(() => queryString('trustStatus'))
const routeEvidenceSummary = computed(() => '')
const routeFallback = computed(() => queryString('fallback') === 'true')
const shouldAutoStart = computed(() => ['1', 'true'].includes(queryString('autoStart').toLowerCase()))
const hasRouteSourceContext = computed(() => Boolean(
  routeSourceType.value ||
  routeSourceId.value ||
  routeTrustStatus.value ||
  routeEvidenceSummary.value ||
  routeFallback.value
))
const routeSourceLabel = computed(() => {
  const labels: Record<string, string> = {
    RESUME_JOB_MATCH: '来自匹配报告',
    SKILL_PROFILE: '来自能力画像',
    TARGET_JOB: '来自今日计划',
    JOB_COACH_AGENT_TASK: '来自今日计划',
    STUDY_PLAN: '来自学习计划',
    FALLBACK: '通用练习'
  }
  const label = labels[routeSourceType.value] || '推荐来源'
  return routeSourceId.value ? `${label}已绑定` : label
})
const routeTrustLabel = computed(() => {
  if (routeFallback.value || routeTrustStatus.value === 'FALLBACK') return '推荐依据不足'
  if (routeTrustStatus.value === 'VERIFIED') return '推荐来源已记录'
  if (routeTrustStatus.value === 'PARTIAL') return '部分上下文'
  return '来源待确认'
})
const routeTrustType = computed<'success' | 'warning' | 'info'>(() => {
  if (routeFallback.value || routeTrustStatus.value === 'FALLBACK') return 'warning'
  if (routeTrustStatus.value === 'VERIFIED') return 'success'
  return 'info'
})
const routeTrustBoundary = computed(() => {
  if (routeFallback.value || routeTrustStatus.value === 'FALLBACK' || routeSourceType.value === 'FALLBACK') return '当前为通用训练，暂未绑定具体简历、岗位描述或匹配报告。'
  if (routeTrustStatus.value === 'PARTIAL') return '本轮只接入了部分上下文，答题后建议结合题目详情复核。'
  if (routeTrustStatus.value === 'VERIFIED') return '本轮已记录推荐来源，回答时仍建议结合自己的项目经历。'
  return '来源信息不足时，请把它当作训练建议，而不是强结论。'
})

const config = reactive({
  mode: initialMode,
  keyword: queryString('skillName') || queryString('keyword'),
  categoryId: Number(queryString('categoryId')) > 0 ? Number(queryString('categoryId')) : undefined,
  count: Number(queryString('count')) > 0 ? Math.min(30, Number(queryString('count'))) : 10,
  difficulty: queryString('difficulty')
})

const modeOptions: ModeOption[] = [
  { value: 'recommended', label: '推荐题组', desc: '承接简历、岗位描述或学习计划里的短板。', icon: Target },
  { value: 'random', label: '随机练习', desc: '快速抽题，适合保持手感。', icon: Shuffle },
  { value: 'category', label: '专项突破', desc: '按 Redis、JVM、事务等关键词集中练。', icon: Boxes },
  { value: 'wrong', label: '错题重刷', desc: '优先修复已经暴露的问题。', icon: RotateCcw },
  { value: 'favorite', label: '收藏练习', desc: '复盘自己标记过的高价值题。', icon: Bookmark }
]

const practicing = ref(false)
const finished = ref(false)
const loadingQuestions = ref(false)
const submitting = ref(false)
const loadError = ref('')
const partialLoadWarning = ref('')
const questions = ref<QuestionDetailVO[]>([])
const currentIndex = ref(0)
const userAnswer = ref('')
const answered = ref(false)
const lastResult = ref<PracticeAnswerResult | null>(null)
const masteryChoice = ref<MasteryStatus | ''>('')
const correctCount = ref(0)
const skippedCount = ref(0)
const answeredCount = ref(0)
const elapsedSeconds = ref(0)
let elapsedTimer: number | undefined

const heroTitle = computed(() => config.mode === 'recommended' ? '按推荐题组训练' : '进入面试口径练习')
const heroSubtitle = computed(() => {
  if (config.mode === 'recommended') return '从岗位风险或能力短板进入，每道题都按真实面试回答来训练。'
  if (config.mode === 'wrong') return '把错题重新讲清楚，比继续刷新题更重要。'
  if (config.mode === 'favorite') return '复盘收藏题，沉淀高频题的稳定表达。'
  if (config.mode === 'category') return '围绕一个知识点连续作答，补齐概念、方案和项目说法。'
  return '随机抽题保持训练节奏，答完后及时标记掌握状态。'
})
const currentModeLabel = computed(() => modeOptions.find((item) => item.value === config.mode)?.label || '题库训练')
const sourceText = computed(() => {
  if (routeEvidenceSummary.value) return routeEvidenceSummary.value
  if (routeRecommendReason.value) return routeRecommendReason.value
  if (config.categoryId) return `围绕题目分类 ${config.categoryId} 进行本轮专项训练。`
  if (config.keyword) return `围绕 ${config.keyword} 进行本轮训练。`
  if (config.mode === 'recommended') return '来自推荐题组。'
  return modeOptions.find((item) => item.value === config.mode)?.desc || '题库训练'
})
const currentQuestion = computed(() => questions.value[currentIndex.value] || null)
const isLastQuestion = computed(() => currentIndex.value >= questions.value.length - 1)
const progressPercent = computed(() => {
  if (!questions.value.length) return 0
  return Math.min(100, Math.round(((currentIndex.value + 1) / questions.value.length) * 100))
})
const accuracyText = computed(() => {
  if (!answeredCount.value) return '0%'
  return `${Math.round((correctCount.value / answeredCount.value) * 100)}%`
})
const completionInsight = computed(() => {
  if (!answeredCount.value) return '本轮还没有提交答案，可以再练一轮或换一种模式重新开始。'
  if (skippedCount.value) return '本轮有跳过题目，建议进入错题或收藏复盘，把不稳的题重新讲清楚。'
  return '把已提交的回答沉淀到错题、收藏、能力图谱或下一场模拟面试里。'
})
const elapsedText = computed(() => {
  const min = Math.floor(elapsedSeconds.value / 60)
  const sec = elapsedSeconds.value % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})
const currentTags = computed(() => normalizeTagNames(currentQuestion.value?.tags).slice(0, 5))
const currentQuestionPrompt = computed(() => {
  const question = currentQuestion.value
  if (!question) return ''
  if (question.content?.trim()) return question.content
  const topic = question.title || config.keyword || question.categoryName || '当前知识点'
  const tags = currentTags.value.length ? `，可结合 ${currentTags.value.join('、')} 展开` : ''
  return `请用真实面试口径回答「${topic}」：先说明概念或问题边界，再讲核心方案、关键取舍和项目中的落地证据${tags}。`
})
const shouldShowCurrentQuestionPrompt = computed(() => {
  const question = currentQuestion.value
  if (!question) return false

  const content = question.content?.trim()
  if (!content) return true
  return content !== (question.title || '').trim()
})
const referenceAnswerText = computed(() => {
  if (lastResult.value?.referenceAnswer) return lastResult.value.referenceAnswer
  if (currentQuestion.value?.referenceAnswer) return currentQuestion.value.referenceAnswer
  return '参考答案暂未返回。建议按“概念边界 -> 核心方案 -> 风险取舍 -> 项目证据”的顺序补齐，并在答完后标记掌握状态。'
})
const analysisText = computed(() => {
  if (lastResult.value?.aiComment) return lastResult.value.aiComment
  if (currentQuestion.value?.analysis) return currentQuestion.value.analysis
  return '点评内容暂未返回。先按下方覆盖检查复盘：是否讲清定义/场景、核心方案、风险取舍、项目指标；缺哪一项就把掌握状态标为“模糊”或“未掌握”。'
})
const answerCoverageItems = computed(() => {
  const answer = userAnswer.value.trim()
  const normalized = answer.toLowerCase()
  const hasAny = (tokens: string[]) => tokens.some((token) => normalized.includes(token.toLowerCase()))
  return [
    {
      title: '定义或场景',
      done: answer.length >= 30 || hasAny(['是什么', '场景', '问题', '背景', '边界']),
      hint: '先说明问题边界'
    },
    {
      title: '方案或原理',
      done: hasAny(['方案', '原理', '流程', '步骤', '实现', '机制', '架构']),
      hint: '补核心方案'
    },
    {
      title: '风险取舍',
      done: hasAny(['风险', '缺点', '取舍', '代价', '一致性', '性能', '异常']),
      hint: '补权衡和失败场景'
    },
    {
      title: '项目证据',
      done: hasAny(['项目', '线上', '指标', 'qps', '耗时', '监控', '压测', '用户']),
      hint: '补项目指标或结果'
    }
  ]
})
const resultDescription = computed(() => {
  if (!lastResult.value?.answerResult) return ''
  const map: Record<string, string> = {
    CORRECT: '回答结构基本通过，继续补项目表达。',
    PARTIAL_CORRECT: '方向正确，但关键点还需要补齐。',
    WRONG: '建议先看参考答案，再标记为未掌握。'
  }
  return map[lastResult.value.answerResult] || '本次点评结果待确认，请先查看参考答案和解析。'
})
const mobilePracticeTitle = computed(() => {
  if (finished.value) return `正确率 ${accuracyText.value}`
  return currentQuestion.value?.title || '准备下一题'
})
const mobilePracticeSubtitle = computed(() => {
  if (finished.value) return `已答 ${answeredCount.value} · 用时 ${elapsedText.value}`
  if (answered.value) return '先标记掌握状态，再进入下一题。'
  if (!userAnswer.value.trim()) return '按真实面试口径先组织回答。'
  return `已输入 ${userAnswer.value.trim().length} 字，可提交点评。`
})
const mobilePrimaryActionLabel = computed(() => answered.value ? (isLastQuestion.value ? '结果' : '下一题') : '提交')
const mobilePrimaryDisabled = computed(() => submitting.value || (!answered.value && !userAnswer.value.trim()))

const isWrongQuestionRecord = (record: PracticeQuestionRecord): record is WrongQuestionVO => {
  return 'wrongRecordId' in record && 'questionId' in record
}

const isFavoriteQuestionRecord = (record: PracticeQuestionRecord): record is FavoriteQuestionVO => {
  return 'favoriteId' in record || ('questionId' in record && !('content' in record))
}

const normalizePracticeQuestion = (record: PracticeQuestionRecord): QuestionDetailVO => {
  const questionId = isWrongQuestionRecord(record) || isFavoriteQuestionRecord(record)
    ? record.questionId
    : record.id

  return {
    ...record,
    id: questionId || ('id' in record ? record.id : undefined) || 0,
    title: record.title,
    content: 'content' in record ? record.content : '',
    difficulty: record.difficulty,
    categoryName: record.categoryName,
    tags: record.tags,
    favorite: 'favorite' in record ? Boolean(record.favorite) : isFavoriteQuestionRecord(record),
    masteryStatus: 'masteryStatus' in record ? record.masteryStatus : undefined,
    lastAnswer: 'lastAnswer' in record ? record.lastAnswer : undefined,
    lastAnswerResult: 'lastAnswerResult' in record ? record.lastAnswerResult : undefined
  }
}

const normalizeTagNames = (tags?: QuestionDetailVO['tags']) => {
  if (!tags) return []
  return tags
    .map((tag) => {
      if (!tag) return ''
      if (typeof tag === 'string') return tag
      return tag.name || tag.tagName || ''
    })
    .filter(Boolean)
}

const difficultyLabel = (value?: string) => {
  const map: Record<string, string> = {
    EASY: '简单',
    MEDIUM: '中等',
    HARD: '困难'
  }
  return value ? map[value] || '难度待确认' : '未标注'
}

const setMode = (mode: PracticeMode) => {
  config.mode = mode
  loadError.value = ''
  partialLoadWarning.value = ''
}

const startTimer = () => {
  stopTimer()
  elapsedSeconds.value = 0
  elapsedTimer = window.setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

const stopTimer = () => {
  if (elapsedTimer) {
    window.clearInterval(elapsedTimer)
    elapsedTimer = undefined
  }
}

const fetchRecommendedQuestions = async () => {
  const ids = routeQuestionIds.value.slice(0, config.count)
  if (ids.length) {
    const results = await Promise.allSettled(ids.map(async (id) => {
      try {
        return await getQuestionDetailApi(id)
      } catch (error) {
        throw { id, error }
      }
    }))
    const loadedQuestions = results
      .filter((item): item is PromiseFulfilledResult<QuestionDetailVO> => item.status === 'fulfilled')
      .map((item) => item.value)
    const failedResults = results.filter((item): item is PromiseRejectedResult => item.status === 'rejected')
    if (failedResults.length) {
      partialLoadWarning.value = `推荐题组中 ${failedResults.length} 道题暂时无法读取，已先加载 ${loadedQuestions.length} 道可练习题。`
    }
    return loadedQuestions
  }

  if (!config.keyword) return []
  const result = await getQuestionsApi({
    pageNo: 1,
    pageSize: config.count,
    keyword: config.keyword,
    difficulty: config.difficulty || undefined
  })
  return (result.records || []).map(normalizePracticeQuestion)
}

const fetchQuestions = async () => {
  loadingQuestions.value = true
  loadError.value = ''
  partialLoadWarning.value = ''
  try {
    const baseParams = {
      pageNo: 1,
      pageSize: config.count,
      keyword: config.mode === 'category' || config.mode === 'recommended' ? config.keyword : '',
      categoryId: config.mode === 'category' ? config.categoryId : undefined,
      difficulty: config.difficulty || undefined
    }

    let records: QuestionDetailVO[] = []

    if (config.mode === 'recommended') {
      records = await fetchRecommendedQuestions()
    } else if (config.mode === 'wrong') {
      const result = await getWrongQuestionsApi(baseParams)
      records = (result.records || []).map(normalizePracticeQuestion)
    } else if (config.mode === 'favorite') {
      const result = await getFavoriteQuestionsApi(baseParams)
      records = (result.records || []).map(normalizePracticeQuestion)
    } else {
      const result = await getQuestionsApi(baseParams)
      records = (result.records || []).map(normalizePracticeQuestion)
    }

    if (config.mode === 'random') {
      records = records.sort(() => Math.random() - 0.5)
    }

    if (!records.length) {
      loadError.value = '未找到符合条件的题目，请调整训练方式或筛选条件。'
      ElMessage.warning(loadError.value)
      return false
    }

    questions.value = records
    return true
  } catch (error) {
    loadError.value = getErrorMessage(error, '题目加载失败')
    ElMessage.error(loadError.value)
    return false
  } finally {
    loadingQuestions.value = false
  }
}

const startPractice = async () => {
  const success = await fetchQuestions()
  if (!success) return
  practicing.value = true
  finished.value = false
  currentIndex.value = 0
  correctCount.value = 0
  skippedCount.value = 0
  answeredCount.value = 0
  answered.value = false
  userAnswer.value = ''
  lastResult.value = null
  masteryChoice.value = ''
  startTimer()
}

const submitAnswer = async () => {
  if (submitting.value || !currentQuestion.value || !userAnswer.value.trim()) return
  submitting.value = true
  try {
    const result = await submitQuestionAnswerApi(currentQuestion.value.id, {
      userAnswer: userAnswer.value,
      answerContent: userAnswer.value,
      targetJobId: routeTargetJobId.value
    })
    const normalizedAnswerResult = String(result.answerResult || '').toUpperCase()
    const isCorrect = normalizedAnswerResult === 'CORRECT'
    currentQuestion.value.referenceAnswer = result.referenceAnswer || currentQuestion.value.referenceAnswer
    currentQuestion.value.analysis = result.analysis || currentQuestion.value.analysis
    currentQuestion.value.masteryStatus = result.masteryStatus || currentQuestion.value.masteryStatus
    currentQuestion.value.lastAnswer = userAnswer.value
    currentQuestion.value.lastAnswerResult = normalizedAnswerResult || (result.wrong === true ? 'WRONG' : 'UNKNOWN')
    lastResult.value = {
      isCorrect,
      wrong: result.wrong,
      aiComment: result.analysis,
      referenceAnswer: result.referenceAnswer,
      answerResult: currentQuestion.value.lastAnswerResult,
      masteryStatus: result.masteryStatus,
      agentTaskCompleted: result.agentTaskCompleted,
      agentTaskId: result.agentTaskId,
      agentTaskTitle: result.agentTaskTitle,
      agentTaskStatus: result.agentTaskStatus,
      agentReviewSummary: result.agentReviewSummary
    }
    answeredCount.value++
    if (isCorrect) correctCount.value++
    answered.value = true
    if (isCorrect && Number.isFinite(result.recordId) && result.recordId > 0) {
      gameProfile.grantXpOnce('practice_correct', `practice:answer:${result.recordId}`)
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '提交失败'))
  } finally {
    submitting.value = false
  }
}

const handleMobilePrimaryAction = () => {
  if (answered.value) {
    nextQuestion()
    return
  }
  submitAnswer()
}

const skipQuestion = () => {
  if (submitting.value) return
  skippedCount.value++
  nextQuestion()
}

const nextQuestion = () => {
  if (submitting.value) return
  if (isLastQuestion.value) {
    completePractice()
    return
  }
  currentIndex.value++
  answered.value = false
  userAnswer.value = ''
  lastResult.value = null
  masteryChoice.value = ''
}

const markMastery = async (status: MasteryStatus) => {
  if (!currentQuestion.value) return
  submitting.value = true
  try {
    await updateQuestionMasteryApi(currentQuestion.value.id, { masteryStatus: status })
    currentQuestion.value.masteryStatus = status
    masteryChoice.value = status
    ElMessage.success('掌握状态已保存')
  } catch (error) {
    ElMessage.warning(getErrorMessage(error, '掌握状态暂时没有保存成功，请稍后重试。'))
  } finally {
    submitting.value = false
  }
}

const completePractice = () => {
  practicing.value = false
  finished.value = true
  stopTimer()
}

const finishPractice = async () => {
  if (answeredCount.value < questions.value.length) {
    const confirmed = await confirmDangerActionPreview({
      title: '结束练习',
      action: '提前结束当前专项练习',
      target: `已答 ${answeredCount.value} / 共 ${questions.value.length || config.count} 道题`,
      impact: '本轮会立即进入练习结果页，未完成的题目不会继续出题，也不会自动生成答题记录。',
      rollback: '可以点击再练一轮重新开始，但本轮未答题目不会自动补回当前进度。',
      audit: '练习结果会保留本页已答、正确、跳过和用时统计，便于回到错题本或推荐题继续训练。',
      tips: ['确认当前题目的回答已经提交或不需要继续作答。', '如果只是想离开页面，可稍后再从训练入口进入。'],
      confirmButtonText: '确认结束'
    })
    if (!confirmed) return
  }
  completePractice()
}

const resetPractice = () => {
  practicing.value = false
  finished.value = false
  questions.value = []
  currentIndex.value = 0
  loadError.value = ''
  partialLoadWarning.value = ''
}

onMounted(async () => {
  const hasPracticeContext = Boolean(
    routeQuestionIds.value.length
    || queryString('mode')
    || config.keyword
    || config.categoryId
    || config.difficulty
    || hasRouteSourceContext.value
  )
  if (!hasPracticeContext) {
    config.mode = 'random'
    config.count = 5
    await router.replace({
      path: '/questions/practice',
      query: {
        mode: 'random',
        sourceType: 'FALLBACK',
        fallback: 'true',
        count: '5'
      }
    })
  }

  if (!practicing.value && !finished.value) void startPractice()
})

onBeforeUnmount(stopTimer)
</script>

<style scoped lang="scss">
.practice-session-page {
  min-width: 0;
  gap: 16px;
}

.session-hero {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  box-shadow: none;

  h1,
  p {
    margin: 0;
  }

  h1 {
    margin-top: 12px;
    font-size: 24px;
    line-height: 1.22;
  }

  p {
    max-width: 680px;
    margin-top: 10px;
    color: var(--user-text-muted);
    line-height: 1.7;
  }
}

.eyebrow,
.hero-actions,
.section-head,
.progress-info,
.question-meta,
.answer-actions,
.result-actions,
.result-final-actions,
.side-title,
.room-status,
.current-question-head,
.route-context {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  align-self: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.active-grid {
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
    color: var(--user-text-muted);
    line-height: 1.6;
  }
}

.section-label {
  display: inline-block;
  margin-bottom: 5px;
  color: var(--user-primary);
  font-size: 12px;
  font-weight: 800;
}

.setup-xp {
  flex: 0 0 auto;
  padding: 7px 10px;
  border-radius: 999px;
  background: var(--user-warning-soft);
  color: var(--user-warning);
  font-size: 12px;
  font-weight: 800;
}

.room-flow {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;

  article {
    min-width: 0;
    flex: 1 1 220px;
    padding: 12px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
  }

  strong,
  span,
  p {
    display: block;
  }

  strong {
    width: 28px;
    height: 28px;
    border: 1px solid var(--user-primary-border);
    border-radius: 8px;
    background: var(--user-primary-faint);
    color: var(--user-primary);
    line-height: 28px;
    text-align: center;
  }

  span {
    margin-top: 10px;
    color: var(--user-text);
    font-weight: 800;
  }

  p {
    margin: 6px 0 0;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.6;
  }
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.mode-card {
  min-height: 128px;
  padding: 14px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface);
  color: var(--user-text);
  cursor: pointer;
  text-align: left;

  svg {
    color: var(--user-primary);
  }

  strong,
  span {
    display: block;
  }

  strong {
    margin-top: 10px;
    font-size: 15px;
  }

  span {
    margin-top: 6px;
    color: var(--user-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  &.is-active {
    border-color: var(--user-primary-border);
    background: var(--user-primary-faint);
  }
}

.setup-error {
  margin-top: 16px;
}

.setup-warning {
  margin-top: 16px;
}

.setup-panel {
  h2 {
    margin: 0 0 14px;
    font-size: 20px;
  }
}

.setup-details {
  margin-top: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 0 14px;
    color: var(--user-text-secondary);
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary span {
    font-size: 13px;
    font-weight: 800;
  }

  summary strong {
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 600;
  }

  &[open] summary {
    border-bottom: 1px solid var(--user-border);
  }
}

.setup-details__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  padding: 14px;

  :deep(.el-form) {
    display: contents;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

.setup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--user-border);
  color: var(--user-text-muted);
  font-size: 13px;

  :deep(.el-button) {
    min-width: 172px;
  }
}

.route-context {
  margin-top: 4px;
  padding: 10px;
  border: 1px solid var(--user-success-border);
  border-radius: 8px;
  background: var(--user-success-soft);
  color: var(--user-success);
  font-size: 13px;
}

.reason-note {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--user-surface-muted);
  color: var(--user-text-muted);
  line-height: 1.6;
}

.source-trust-box {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-faint);

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  p,
  small {
    margin: 0;
    color: var(--user-text-secondary);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  p {
    font-size: 13px;
  }

  small {
    font-size: 12px;
  }
}

.start-button {
  width: 100%;
  margin-top: 16px;
}

.mobile-practice-rail {
  display: none;
}

.practice-workspace {
  display: grid;
  gap: 16px;
}

.progress-body {
  display: grid;
  grid-template-columns: auto auto minmax(160px, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.room-status {
  align-items: flex-start;
  flex-direction: column;
  gap: 3px;
  min-width: 116px;

  strong {
    color: var(--user-text);
    font-size: 14px;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }
}

.progress-info {
  flex-wrap: wrap;
  color: var(--user-text-muted);
  font-size: 13px;
  white-space: nowrap;
}

.question-panel {
  min-width: 0;

  h2 {
    margin: 16px 0 0;
    color: var(--user-text);
    font-size: 22px;
    line-height: 1.45;
  }
}

.current-question-head {
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-faint);

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    color: var(--user-text);
    font-size: 13px;
  }
}

.question-meta {
  flex-wrap: wrap;
  margin-top: 12px;
}

.question-content {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
}

.answer-area {
  margin-top: 18px;
}

.answer-area :deep(.el-textarea__inner) {
  border-color: var(--user-border-strong);
  background: var(--user-surface);
  box-shadow: 0 0 0 1px var(--user-border-strong) inset;
  color: var(--user-text);
}

.answer-area :deep(.el-textarea__inner::placeholder) {
  color: var(--user-text-muted);
}

.answer-area :deep(.el-input__count) {
  background: transparent;
  color: var(--user-text-muted);
}

.answer-frame {
  display: grid;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);

  span {
    color: var(--user-text-muted);
    font-size: 12px;
    font-weight: 800;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  em {
    padding: 5px 10px;
    border-radius: 8px;
    background: var(--user-surface);
    color: var(--user-primary);
    font-style: normal;
    font-weight: 700;
  }
}

.answer-actions,
.result-actions {
  flex-wrap: wrap;
  margin-top: 12px;
}

.result-area {
  display: grid;
  gap: 14px;
  margin-top: 18px;
}

.review-stage-head {
  padding: 12px;
  border: 1px solid var(--user-primary-border);
  border-radius: 8px;
  background: var(--user-primary-faint);

  span,
  strong {
    display: block;
  }

  span {
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  strong {
    margin-top: 5px;
    color: var(--user-text);
    line-height: 1.5;
  }
}

.coverage-list {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;

  article {
    min-width: 0;
    flex: 1 1 180px;
    padding: 10px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-warning-soft);
  }

  article.done {
    border-color: var(--user-success-border);
    background: var(--user-success-soft);
  }

  strong,
  span {
    display: block;
  }

  strong {
    color: var(--user-text);
    font-size: 13px;
  }

  span {
    margin-top: 5px;
    color: var(--user-text-muted);
    font-size: 12px;
    line-height: 1.5;
  }
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  section {
    min-width: 0;
    padding: 14px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
  }

  h3 {
    margin: 0 0 10px;
    color: var(--user-text);
    font-size: 15px;
  }
}

.side-stack {
  display: grid;
  gap: 12px;
}

.side-title {
  margin-bottom: 10px;

  h2 {
    margin: 0;
    font-size: 17px;
  }
}

.coach-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: var(--user-text-muted);
  line-height: 1.7;
}

.side-muted {
  margin: 0;
  color: var(--user-text-muted);
  line-height: 1.7;
}

.result-stats {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-card {
  min-width: 0;
  flex: 1 1 130px;
  padding: 10px 12px;
  border: 1px solid var(--user-border);
  border-radius: 8px;
  background: var(--user-surface-muted);
  text-align: center;

  span {
    display: block;
    color: var(--user-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--user-text);
    font-size: 24px;
  }
}

.result-final-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

.result-next-grid {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;

  article {
    min-width: 0;
    flex: 1 1 220px;
    padding: 14px;
    border: 1px solid var(--user-border);
    border-radius: 8px;
    background: var(--user-surface-muted);
  }

  span {
    display: block;
    color: var(--user-primary);
    font-size: 12px;
    font-weight: 800;
  }

  p {
    min-height: 44px;
    margin: 8px 0 12px;
    color: var(--user-text-muted);
    line-height: 1.6;
  }

  :deep(.el-button) {
    width: 100%;
  }
}

.agent-sync-alert__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  color: var(--user-text-muted);
  font-size: 12px;
}

:deep(.app-state) {
  background: var(--user-surface-muted);
}

@media (max-width: 1080px) {
  .mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 880px) {
  .session-hero,
  .setup-grid,
  .active-grid,
  .progress-body {
    grid-template-columns: 1fr;
  }

  .session-hero {
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 640px) {
  .practice-session-page {
    padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  }

  .session-hero {
    padding: 16px;
  }

  .mode-grid,
  .review-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions :deep(.el-button),
  .answer-actions :deep(.el-button),
  .result-actions :deep(.el-button),
  .result-final-actions :deep(.el-button) {
    width: 100%;
    justify-content: center;
  }

  .progress-body {
    gap: 10px;
  }

  .progress-info {
    white-space: normal;
  }

  .source-trust-box > div {
    align-items: flex-start;
    flex-direction: column;

    :deep(.el-tag) {
      max-width: 100%;
      white-space: normal;
    }
  }

}

// 方向 D · 答题间。保留题目加载、判分、复盘与来源可信边界，改为连续闯关反馈。
.arena-practice {
  width: min(900px, 100%);
  margin: 0 auto;
  padding: 28px 24px 46px;
  gap: 16px;

  .session-hero,
  .content-card {
    border: 1.5px solid var(--arena-line);
    border-radius: var(--arena-radius-card);
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
  }

  .session-hero {
    border-color: #b9e7cd;
    background: linear-gradient(135deg, #f0fbf4, #ffffff 72%);
    padding: 22px;

    h1 {
      font-size: 28px;
      font-weight: 900;
    }
  }

  .eyebrow,
  .room-status span,
  .current-question-head span,
  .review-stage-head span {
    color: var(--arena-grn-d);
  }

  .room-flow article,
  .mode-card,
  .setup-details,
  .route-context,
  .reason-note,
  .source-trust-box,
  .current-question-head,
  .question-content,
  .answer-frame,
  .review-stage-head,
  .coverage-list article,
  .review-grid section,
  .result-next-grid article {
    border: 1.5px solid var(--arena-line);
    border-radius: 14px;
    background: #ffffff;
  }

  .room-flow strong {
    border: 0;
    border-radius: 11px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
  }

  .mode-card {
    min-height: 148px;
    transition: transform 0.15s ease, border-color 0.15s ease;

    &:hover {
      border-color: var(--arena-grn);
      transform: translateY(-1px);
    }

    &.is-active {
      border-color: var(--arena-grn);
      background: linear-gradient(135deg, var(--arena-grn-soft), #ffffff 78%);
      box-shadow: 0 0 0 3px rgba(23, 178, 106, 0.1);
    }
  }

  .practice-setup {
    max-width: 900px;
    margin: 0 auto;
  }

  .practice-workspace {
    width: min(900px, 100%);
    margin: 0 auto;
    gap: 16px;
  }

  .practice-progress {
    display: grid;
    gap: 12px;
    padding: 0;

    :deep(.el-progress-bar__outer) {
      height: 9px !important;
      border-radius: 999px;
    }
  }

  .practice-progress__head,
  .practice-progress__identity,
  .answer-actions,
  .answer-actions__submit {
    display: flex;
    align-items: center;
  }

  .practice-progress__head {
    justify-content: space-between;
    gap: 12px;
  }

  .practice-progress__identity {
    min-width: 0;
    gap: 10px;

    strong {
      overflow: hidden;
      color: var(--arena-ink);
      font-size: 13.5px;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .practice-progress__exit {
    min-height: 34px;
    margin: 0;
    padding: 0 13px;
    border: 1.5px solid var(--arena-line);
    border-radius: 12px;
    background: #ffffff;
    color: var(--arena-grn-d);
    font-size: 12.5px;
    font-weight: 800;
    box-shadow: 0 3px 0 var(--arena-line);
  }

  .practice-progress__count {
    flex: 0 0 auto;
    padding: 7px 10px;
    border-radius: 999px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
    font-size: 11px;
    font-weight: 900;
  }

  .active-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .side-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    > section {
      &:nth-child(3) {
        display: none;
      }
    }
  }

  .question-panel {
    .content-card__body {
      padding: 26px 28px;
    }

    h2 {
      margin-top: 14px;
      font-size: 19px;
      font-weight: 900;
      line-height: 1.5;
    }
  }

  .current-question-head {
    display: none;
  }

  .question-meta {
    margin-top: 0;
  }

  .question-content {
    margin-top: 0;
    padding: 0;
    border: 0;
    background: transparent;

    :deep(p) {
      margin: 0;
      color: var(--arena-ink);
      font-size: 14px;
      line-height: 1.75;
    }
  }

  .answer-area {
    margin-top: 18px;
  }

  .answer-area :deep(.el-textarea__inner) {
    min-height: 168px !important;
    padding: 14px;
    border: 1.5px solid var(--arena-line);
    background: #ffffff;
    color: var(--arena-ink);
    font-size: 13px;
    line-height: 1.75;
  }

  .answer-actions {
    justify-content: space-between;
    gap: 12px;
    margin-top: 18px;
  }

  .answer-actions__skip {
    min-height: 42px;
    margin: 0;
    padding: 0 16px;
    border: 1.5px solid var(--arena-line);
    border-radius: 13px;
    background: #ffffff;
    color: var(--arena-grn-d);
    font-weight: 800;
    box-shadow: 0 3px 0 var(--arena-line);
  }

  .answer-actions__submit {
    gap: 12px;

    > span {
      color: var(--arena-amber);
      font-size: 11px;
      font-weight: 900;
    }

    :deep(.el-button) {
      min-height: 44px;
      margin: 0;
      padding: 0 22px;
    }
  }

  .side-stack > section {
    .content-card__body {
      padding: 16px 18px;
    }
  }

  .side-title {
    margin-bottom: 6px;

    h2 {
      font-size: 12px;
      font-weight: 900;
    }
  }

  .coach-list,
  .side-muted {
    color: var(--arena-sub);
    font-size: 11.5px;
    line-height: 1.65;
  }

  .practice-setup .content-card__body {
    padding: 24px;
  }

  .setup-details {
    border-color: var(--arena-line);
    background: #f8faf8;
  }

  .setup-details summary {
    color: var(--arena-grn-d);
  }

  .setup-xp {
    background: #fff7ec;
    color: #b4560a;
  }

  .setup-footer {
    border-color: var(--arena-line);
  }

  .route-context,
  .current-question-head,
  .review-stage-head {
    border-color: #b9e7cd;
    background: #f5fcf7;
  }

  .source-trust-box {
    border-color: #d7ccff;
    background: linear-gradient(135deg, var(--arena-vio-soft), #ffffff 75%);
  }

  .reason-note,
  .question-content,
  .answer-frame,
  .review-grid section {
    background: #f8faf8;
  }

  .answer-frame em {
    border-radius: 999px;
    background: var(--arena-grn-soft);
    color: var(--arena-grn-d);
  }

  .coverage-list article {
    background: #fffaf2;
    border-color: #f3ddc0;
  }

  .coverage-list article.done {
    border-color: #b9e7cd;
    background: #f5fcf7;
  }

  .progress-body :deep(.el-progress-bar__outer),
  :deep(.el-progress-bar__outer) {
    background: var(--arena-line);
  }

  :deep(.el-progress-bar__inner) {
    background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
  }

  :deep(.el-button--primary) {
    border-color: var(--arena-grn);
    background: var(--arena-grn);
    box-shadow: 0 4px 0 var(--arena-grn-d);
    font-weight: 800;
  }

  :deep(.el-textarea__inner) {
    border-radius: 14px;
    box-shadow: 0 0 0 1.5px var(--arena-line) inset;
  }
}

@media (max-width: 640px) {
  .arena-practice {
    padding: 16px 14px calc(184px + var(--user-mobile-nav-height, 0px));

    .session-hero {
      padding: 18px;
    }

    .mode-card {
      min-height: 116px;
    }

    .section-head,
    .setup-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .setup-details__body {
      grid-template-columns: 1fr;
    }

    .setup-footer :deep(.el-button) {
      width: 100%;
    }

    .practice-workspace {
      width: 100%;
    }

    .practice-progress__head {
      align-items: flex-start;
    }

    .practice-progress__count {
      margin-top: 4px;
    }

    .question-panel .content-card__body {
      padding: 20px 18px;
    }

    .question-panel h2 {
      font-size: 18px;
    }

    .side-stack {
      grid-template-columns: 1fr;
    }

    .answer-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .answer-actions__skip,
    .answer-actions__submit,
    .answer-actions__submit :deep(.el-button) {
      width: 100%;
    }

    .answer-actions__submit {
      justify-content: space-between;
    }

  }
}

// Direction D: single-task answer surface. Legacy setup/workspace selectors above
// are no longer mounted; these rules own every rendered state in the template.
.practice-session-page {
  width: min(900px, 100%);
  margin: 0 auto;
  padding: 30px 24px 48px;
}

.practice-ready,
.practice-stage,
.practice-finish {
  display: grid;
  gap: 16px;
}

.practice-ready {
  padding: 26px 28px;
  border: 1.5px solid #b9e7cd;
  border-radius: var(--arena-radius-card);
  background: linear-gradient(135deg, #f0fbf4, #fff 74%);
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.practice-ready__head,
.practice-ready__actions,
.practice-progress__head,
.practice-progress__identity,
.practice-answer-actions,
.practice-review__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.practice-ready h1,
.practice-finish h1 {
  margin: 0;
  color: var(--arena-ink);
  font-size: 28px;
  font-weight: 900;
}

.practice-ready p,
.practice-finish > p {
  margin: -6px 0 0;
  color: var(--arena-sub);
  line-height: 1.65;
}

.practice-ready__actions {
  justify-content: flex-start;
  margin-top: 4px;
}

.practice-ready__settings {
  overflow: hidden;
  margin-top: 4px;
  border: 1.5px solid var(--arena-line);
  border-radius: 12px;
  background: #fff;
}

.practice-ready__settings summary {
  padding: 12px 14px;
  color: var(--arena-ink);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  list-style: none;
}

.practice-ready__settings summary::-webkit-details-marker {
  display: none;
}

.practice-ready__settings summary::after {
  content: '+';
  float: right;
  color: var(--arena-grn-d);
  font-size: 16px;
}

.practice-ready__settings[open] summary::after {
  content: '-';
}

.practice-ready__settings > :not(summary) {
  margin: 0 14px 14px;
}

.practice-mode-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 7px;
}

.practice-mode-list button {
  display: grid;
  justify-items: start;
  gap: 6px;
  min-height: 72px;
  padding: 9px;
  border: 1.5px solid var(--arena-line);
  border-radius: 10px;
  background: #fff;
  color: var(--arena-sub);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  text-align: left;
}

.practice-mode-list button.is-active {
  border-color: var(--arena-grn);
  background: var(--arena-grn-soft);
  color: var(--arena-grn-d);
}

.practice-mode-list span,
.practice-mode-list b {
  display: block;
}

.practice-mode-list b {
  color: var(--arena-ink);
  font-size: 11px;
}

.practice-ready__context {
  color: var(--arena-sub);
  font-size: 12px;
  line-height: 1.55;
}

.practice-stage {
  width: min(900px, 100%);
  margin: 0 auto;
}

.practice-progress {
  display: grid;
  gap: 12px;
}

.practice-progress__identity {
  justify-content: flex-start;
}

.practice-progress__exit {
  border-color: var(--arena-line);
  border-radius: 10px;
  color: var(--arena-grn-d);
  font-weight: 800;
}

.practice-progress__count {
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--arena-grn-soft);
  color: var(--arena-grn-d);
  font-size: 12px;
  font-weight: 800;
}

.practice-question-card,
.practice-support-card,
.practice-finish {
  border: 1.5px solid var(--arena-line);
  border-radius: var(--arena-radius-card);
  background: #fff;
  box-shadow: 0 2px 4px rgba(21, 33, 27, 0.04);
}

.practice-question-card {
  display: grid;
  gap: 18px;
  padding: 26px 28px 22px;
}

.practice-question-card__meta {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--arena-mut);
  font-size: 12px;
}

.practice-question-card h2 {
  margin: 0;
  color: var(--arena-ink);
  font-size: 19px;
  font-weight: 900;
  line-height: 1.5;
}

.practice-question-card__prompt {
  margin: -4px 0 0;
  color: var(--arena-sub);
  font-size: 13px;
  line-height: 1.7;
}

.practice-answer-input {
  margin-top: 1px;
}

.practice-answer-input :deep(.el-textarea__inner) {
  min-height: 168px !important;
  padding: 14px;
  border-radius: 12px;
  box-shadow: 0 0 0 1.5px var(--arena-line) inset;
  color: var(--arena-ink);
  font-weight: 600;
  line-height: 1.7;
}

.practice-answer-actions {
  margin-top: 4px;
}

.practice-answer-actions__skip {
  border-color: var(--arena-line);
  border-radius: 11px;
  color: var(--arena-grn-d);
  font-weight: 800;
}

.practice-answer-actions > div {
  display: flex;
  align-items: center;
  gap: 14px;
}

.practice-answer-actions > div > span {
  color: var(--arena-amber);
  font-size: 12px;
  font-weight: 800;
}

.practice-review {
  display: grid;
  gap: 14px;
}

.practice-review__coverage {
  display: grid;
  gap: 7px;
}

.practice-review__coverage span {
  padding: 8px 10px;
  border-radius: 9px;
  background: #f8faf8;
  color: var(--arena-sub);
  font-size: 12px;
}

.practice-review__coverage .is-done {
  background: var(--arena-grn-soft);
  color: var(--arena-grn-d);
}

.practice-review details {
  overflow: hidden;
  border: 1px solid var(--arena-line);
  border-radius: 11px;
}

.practice-review summary {
  padding: 11px 12px;
  color: var(--arena-vio);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.practice-review__detail {
  display: grid;
  gap: 12px;
  padding: 0 12px 12px;
}

.practice-review__detail h3 {
  margin: 0 0 7px;
  color: var(--arena-ink);
  font-size: 13px;
}

.practice-review__actions {
  flex-wrap: wrap;
  justify-content: flex-start;
}

.practice-support-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.practice-support-card {
  padding: 15px 18px;
}

.practice-support-card > div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.practice-support-card span {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--arena-vio-soft);
  color: var(--arena-vio);
  font-size: 11px;
  font-weight: 800;
}

.practice-support-card b {
  color: var(--arena-ink);
  font-size: 12px;
}

.practice-support-card p {
  margin: 8px 0 0;
  color: var(--arena-sub);
  font-size: 12px;
  line-height: 1.65;
}

.practice-support-card--ai {
  border-left: 3px solid var(--arena-vio);
}

.practice-finish {
  padding: 26px;
}

.practice-finish__stats {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 2px;
}

.practice-finish__stats span {
  padding: 7px 9px;
  border-radius: 9px;
  background: #f2f4f2;
  color: var(--arena-sub);
  font-size: 12px;
}

.practice-finish__stats b {
  color: var(--arena-grn-d);
}

.practice-finish__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.practice-session-page :deep(.el-progress-bar__outer) {
  background: var(--arena-line);
}

.practice-session-page :deep(.el-progress-bar__inner) {
  background: linear-gradient(90deg, var(--arena-grn), var(--arena-lime));
}

.practice-session-page :deep(.el-button--primary) {
  border-color: var(--arena-grn);
  background: var(--arena-grn);
  box-shadow: 0 4px 0 var(--arena-grn-d);
  font-weight: 800;
}

@media (max-width: 640px) {
  .practice-session-page {
    padding: 20px 14px calc(26px + var(--user-mobile-nav-height, 0px));
  }

  .practice-ready,
  .practice-question-card,
  .practice-finish {
    padding: 22px 20px;
  }

  .practice-ready__actions,
  .practice-progress__head {
    align-items: stretch;
    flex-direction: column;
  }

  .practice-ready__actions :deep(.el-button),
  .practice-review__actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .practice-mode-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .practice-question-card h2 {
    font-size: 19px;
  }

  .practice-support-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .practice-answer-actions > div {
    gap: 8px;
  }

  .practice-answer-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.25fr);
    align-items: center;
    gap: 8px;
  }

  .practice-answer-actions > div {
    display: contents;
  }

  .practice-answer-actions__skip {
    grid-column: 1;
  }

  .practice-answer-actions > div > span {
    grid-column: 2;
    white-space: nowrap;
  }

  .practice-answer-actions > div :deep(.el-button) {
    grid-column: 3;
    width: 100%;
    margin-left: 0;
  }

  .practice-review__actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
