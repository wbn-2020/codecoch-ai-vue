<template>
  <div class="practice-session-page page-shell">
    <section class="session-hero">
      <div>
        <div class="eyebrow">
          <Dumbbell :size="16" />
          专项练习
        </div>
        <h1>{{ heroTitle }}</h1>
        <p>{{ heroSubtitle }}</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/questions/recommendations')">
          <BookOpenCheck :size="16" />
          推荐题
        </el-button>
        <el-button @click="router.push('/questions/wrong-records')">
          <RotateCcw :size="16" />
          错题本
        </el-button>
      </div>
    </section>

    <section v-if="!practicing && !finished" class="setup-grid">
      <main class="content-card">
        <div class="content-card__body">
          <div class="section-head">
            <div>
              <h2>选择训练方式</h2>
              <p>推荐题用于补短板，专项和错题用于集中突破。</p>
            </div>
          </div>

          <div class="mode-grid">
            <button
              v-for="mode in modeOptions"
              :key="mode.value"
              class="mode-card"
              :class="{ 'is-active': config.mode === mode.value }"
              type="button"
              @click="setMode(mode.value)"
            >
              <component :is="mode.icon" :size="18" />
              <strong>{{ mode.label }}</strong>
              <span>{{ mode.desc }}</span>
            </button>
          </div>

          <AppState v-if="loadError" class="setup-error" type="error" title="题目加载失败" :description="loadError" />
          <el-alert
            v-if="partialLoadWarning && !loadError"
            class="setup-warning"
            type="warning"
            :title="partialLoadWarning"
            :closable="false"
            show-icon
          />
        </div>
      </main>

      <aside class="content-card">
        <div class="content-card__body setup-panel">
          <h2>本轮设置</h2>
          <el-form label-position="top">
            <el-form-item v-if="config.mode === 'category' || config.mode === 'recommended'" label="训练关键词">
              <el-input v-model="config.keyword" placeholder="例如 Redis、JVM、Spring Cloud" clearable />
            </el-form-item>
            <el-form-item label="题目数量">
              <el-input-number v-model="config.count" :min="1" :max="30" />
            </el-form-item>
            <el-form-item label="难度">
              <el-select v-model="config.difficulty" clearable placeholder="不限">
                <el-option label="简单" value="EASY" />
                <el-option label="中等" value="MEDIUM" />
                <el-option label="困难" value="HARD" />
              </el-select>
            </el-form-item>
          </el-form>

          <div v-if="routeQuestionIds.length" class="route-context">
            <Target :size="16" />
            <span>已接收 {{ routeQuestionIds.length }} 道推荐题</span>
          </div>
          <div v-if="hasRouteSourceContext" class="source-trust-box">
            <div>
              <span>{{ routeSourceLabel }}</span>
              <el-tag :type="routeTrustType" effect="plain">{{ routeTrustLabel }}</el-tag>
            </div>
            <p>{{ routeEvidenceSummary || routeRecommendReason || routeTrustBoundary }}</p>
            <small v-if="routeEvidenceSummary || routeRecommendReason">{{ routeTrustBoundary }}</small>
          </div>
          <div v-if="routeRecommendReason" class="reason-note">
            {{ routeRecommendReason }}
          </div>

          <el-button class="start-button" type="primary" size="large" :loading="loadingQuestions" @click="startPractice">
            <Play :size="16" />
            开始练习
          </el-button>
        </div>
      </aside>
    </section>

    <section v-if="practicing" class="practice-workspace">
      <div class="practice-progress content-card">
        <div class="content-card__body progress-body">
          <div class="progress-info">
            <span>{{ currentIndex + 1 }} / {{ questions.length }}</span>
            <span>已答 {{ answeredCount }}</span>
            <span>正确 {{ correctCount }}</span>
            <span>{{ elapsedText }}</span>
          </div>
          <el-progress :percentage="progressPercent" :show-text="false" />
          <el-button type="danger" plain @click="finishPractice">结束</el-button>
        </div>
      </div>

      <div class="active-grid">
        <main class="content-card question-panel">
          <div v-if="currentQuestion" class="content-card__body">
            <div class="question-meta">
              <el-tag effect="plain">{{ difficultyLabel(currentQuestion.difficulty) }}</el-tag>
              <el-tag v-if="currentQuestion.categoryName" effect="plain" type="info">
                {{ currentQuestion.categoryName }}
              </el-tag>
              <el-tag v-for="tag in currentTags" :key="tag" effect="plain">{{ tag }}</el-tag>
            </div>
            <h2>{{ currentQuestion.title }}</h2>
            <div class="question-content">
              <MarkdownPreview :content="currentQuestion.content || '暂无题干内容'" />
            </div>

            <div v-if="!answered" class="answer-area">
              <el-input
                v-model="userAnswer"
                type="textarea"
                :rows="7"
                maxlength="5000"
                show-word-limit
                placeholder="按真实面试口径组织回答：场景、方案、权衡、项目指标。"
                :disabled="submitting"
              />
              <div class="answer-actions">
                <el-button type="primary" :loading="submitting" :disabled="!userAnswer.trim()" @click="submitAnswer">
                  <Send :size="16" />
                  提交回答
                </el-button>
                <el-button :disabled="submitting" @click="skipQuestion">跳过</el-button>
              </div>
            </div>

            <div v-else class="result-area">
              <el-alert
                :type="lastResult?.isCorrect ? 'success' : 'warning'"
                show-icon
                :closable="false"
                :title="lastResult?.isCorrect ? '回答通过' : '需要补强'"
                :description="resultDescription"
              />
              <div class="review-grid">
                <section>
                  <h3>参考答案</h3>
                  <MarkdownPreview :content="lastResult?.referenceAnswer || currentQuestion.referenceAnswer || '暂无参考答案'" />
                </section>
                <section>
                  <h3>点评与解析</h3>
                  <MarkdownPreview :content="lastResult?.aiComment || currentQuestion.analysis || '暂无解析'" />
                </section>
              </div>
              <div class="result-actions">
                <el-button type="primary" @click="nextQuestion">
                  {{ isLastQuestion ? '查看结果' : '下一题' }}
                  <ArrowRight :size="16" />
                </el-button>
                <el-button-group>
                  <el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.MASTERED ? 'success' : ''" @click="markMastery(MASTERY_STATUS.MASTERED)">已掌握</el-button>
                  <el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.VAGUE ? 'warning' : ''" @click="markMastery(MASTERY_STATUS.VAGUE)">模糊</el-button>
                  <el-button :disabled="submitting" :type="masteryChoice === MASTERY_STATUS.UNKNOWN ? 'danger' : ''" @click="markMastery(MASTERY_STATUS.UNKNOWN)">未掌握</el-button>
                </el-button-group>
              </div>
            </div>
          </div>
        </main>

        <aside class="side-stack">
          <section class="content-card">
            <div class="content-card__body">
              <div class="side-title">
                <Brain :size="17" />
                <h2>答题结构</h2>
              </div>
              <ul class="coach-list">
                <li>先定义问题边界，不直接背结论。</li>
                <li>给出方案后说明取舍和失败场景。</li>
                <li>最后补项目指标、监控或上线效果。</li>
              </ul>
            </div>
          </section>
          <section class="content-card">
            <div class="content-card__body">
              <div class="side-title">
                <Target :size="17" />
                <h2>本轮来源</h2>
              </div>
              <p class="side-muted">{{ sourceText }}</p>
            </div>
          </section>
        </aside>
      </div>
    </section>

    <section v-if="finished" class="content-card practice-result">
      <div class="content-card__body">
        <div class="section-head">
          <div>
            <h2>练习完成</h2>
            <p>把未掌握题继续带入错题复盘或模拟面试。</p>
          </div>
        </div>
        <div class="result-stats">
          <div class="stat-card">
            <span>总题数</span>
            <strong>{{ questions.length }}</strong>
          </div>
          <div class="stat-card">
            <span>已答</span>
            <strong>{{ answeredCount }}</strong>
          </div>
          <div class="stat-card">
            <span>正确</span>
            <strong>{{ correctCount }}</strong>
          </div>
          <div class="stat-card">
            <span>跳过</span>
            <strong>{{ skippedCount }}</strong>
          </div>
          <div class="stat-card">
            <span>正确率</span>
            <strong>{{ accuracyText }}</strong>
          </div>
          <div class="stat-card">
            <span>用时</span>
            <strong>{{ elapsedText }}</strong>
          </div>
        </div>
        <div class="result-final-actions">
          <el-button type="primary" @click="resetPractice">再练一轮</el-button>
          <el-button @click="router.push('/questions/wrong-records')">错题复盘</el-button>
          <el-button @click="router.push('/interviews/create')">模拟面试</el-button>
          <el-button @click="router.push('/dashboard')">返回今日计划</el-button>
        </div>
      </div>
    </section>

    <section v-if="practicing || finished" class="mobile-practice-rail" aria-label="手机练习快捷操作">
      <div class="mobile-practice-rail__main">
        <span>{{ finished ? '练习完成' : `${currentIndex + 1}/${questions.length || config.count}` }}</span>
        <strong>{{ mobilePracticeTitle }}</strong>
        <small>{{ mobilePracticeSubtitle }}</small>
      </div>
      <div class="mobile-practice-rail__actions">
        <el-button
          v-if="practicing"
          type="primary"
          size="small"
          :loading="submitting"
          :disabled="mobilePrimaryDisabled"
          @click="handleMobilePrimaryAction"
        >
          {{ mobilePrimaryActionLabel }}
        </el-button>
        <el-button v-if="practicing" size="small" plain @click="finishPractice">结束</el-button>
        <el-button v-else type="primary" size="small" @click="resetPractice">再练</el-button>
        <el-button size="small" plain @click="router.push('/questions/wrong-records')">错题</el-button>
      </div>
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
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
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
}

const route = useRoute()
const router = useRouter()

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
  return parseQuestionIds().length ? 'recommended' : 'random'
})()

const routeQuestionIds = computed(parseQuestionIds)
const routeRecommendReason = computed(() => queryString('recommendReason'))
const routeSourceType = computed(() => queryString('sourceType'))
const routeSourceId = computed(() => queryString('sourceId'))
const routeTrustStatus = computed(() => queryString('trustStatus'))
const routeEvidenceSummary = computed(() => queryString('evidenceSummary'))
const routeFallback = computed(() => queryString('fallback') === 'true')
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
const sourceText = computed(() => {
  if (routeEvidenceSummary.value) return routeEvidenceSummary.value
  if (routeRecommendReason.value) return routeRecommendReason.value
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
const elapsedText = computed(() => {
  const min = Math.floor(elapsedSeconds.value / 60)
  const sec = elapsedSeconds.value % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})
const currentTags = computed(() => normalizeTagNames(currentQuestion.value?.tags).slice(0, 5))
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
      answerContent: userAnswer.value
    })
    const isCorrect = result.wrong === false || result.answerResult === 'CORRECT'
    currentQuestion.value.referenceAnswer = result.referenceAnswer || currentQuestion.value.referenceAnswer
    currentQuestion.value.analysis = result.analysis || currentQuestion.value.analysis
    currentQuestion.value.masteryStatus = result.masteryStatus || currentQuestion.value.masteryStatus
    currentQuestion.value.lastAnswer = userAnswer.value
    currentQuestion.value.lastAnswerResult = result.answerResult || (result.wrong ? 'WRONG' : 'CORRECT')
    lastResult.value = {
      isCorrect,
      wrong: result.wrong,
      aiComment: result.analysis,
      referenceAnswer: result.referenceAnswer,
      answerResult: currentQuestion.value.lastAnswerResult,
      masteryStatus: result.masteryStatus
    }
    answeredCount.value++
    if (isCorrect) correctCount.value++
    answered.value = true
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
      tips: ['确认当前题目的回答已经提交或不需要继续作答。', '如果只是想离开页面，可优先返回任务中心或稍后再进练习入口。'],
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

onBeforeUnmount(stopTimer)
</script>

<style scoped lang="scss">
.practice-session-page {
  gap: 18px;
}

.session-hero {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 28px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(245, 158, 11, 0.08)),
    #ffffff;
  box-shadow: var(--app-shadow);

  h1,
  p {
    margin: 0;
  }

  h1 {
    margin-top: 12px;
    font-size: 30px;
    line-height: 1.22;
  }

  p {
    max-width: 680px;
    margin-top: 10px;
    color: var(--app-text-muted);
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
.route-context {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.hero-actions {
  align-self: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.setup-grid,
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
    color: var(--app-text-muted);
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: var(--app-text);
  cursor: pointer;
  text-align: left;

  svg {
    color: #2563eb;
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
    color: var(--app-text-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  &.is-active {
    border-color: rgba(37, 99, 235, 0.48);
    background: #eff6ff;
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

.route-context {
  margin-top: 4px;
  padding: 10px;
  border: 1px solid rgba(22, 163, 74, 0.2);
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  font-size: 13px;
}

.reason-note {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.source-trust-box {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  span {
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
  }

  p,
  small {
    margin: 0;
    color: #475569;
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
  grid-template-columns: auto minmax(160px, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.progress-info {
  flex-wrap: wrap;
  color: var(--app-text-muted);
  font-size: 13px;
  white-space: nowrap;
}

.question-panel {
  min-width: 0;

  h2 {
    margin: 16px 0 0;
    color: var(--app-text);
    font-size: 22px;
    line-height: 1.45;
  }
}

.question-meta {
  flex-wrap: wrap;
}

.question-content {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.answer-area {
  margin-top: 18px;
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

.review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  section {
    min-width: 0;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  h3 {
    margin: 0 0 10px;
    color: var(--app-text);
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
  color: var(--app-text-muted);
  line-height: 1.7;
}

.side-muted {
  margin: 0;
  color: var(--app-text-muted);
  line-height: 1.7;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;

  span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 8px;
    color: var(--app-text);
    font-size: 24px;
  }
}

.result-final-actions {
  flex-wrap: wrap;
  margin-top: 18px;
}

:deep(.app-state) {
  background: #f8fafc;
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
    padding-bottom: calc(190px + env(safe-area-inset-bottom, 0px));
  }

  .session-hero {
    padding: 20px;
  }

  .mode-grid,
  .review-grid,
  .result-stats {
    grid-template-columns: 1fr;
  }

  .source-trust-box > div {
    align-items: flex-start;
    flex-direction: column;

    :deep(.el-tag) {
      max-width: 100%;
      white-space: normal;
    }
  }

  .mobile-practice-rail {
    position: fixed;
    right: 12px;
    bottom: calc(
      var(--user-mobile-nav-height, 0px) + var(--user-mobile-nav-gap, 12px) + 12px +
        env(safe-area-inset-bottom, 0px)
    );
    left: 12px;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border: 1px solid rgba(37, 99, 235, 0.22);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
    backdrop-filter: blur(12px);
  }

  .mobile-practice-rail__main {
    min-width: 0;

    span,
    small,
    strong {
      display: block;
    }

    span {
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
    }

    strong {
      overflow: hidden;
      margin-top: 2px;
      color: var(--app-text);
      font-size: 14px;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      overflow: hidden;
      margin-top: 2px;
      color: var(--app-text-muted);
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mobile-practice-rail__actions {
    display: flex;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    max-width: 154px;
  }
}
</style>
