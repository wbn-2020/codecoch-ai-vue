<template>
  <div class="practice-page page-shell">
    <section class="practice-hero cc-glass--ai">
      <div class="hero-copy">
        <div class="eyebrow">
          <Dumbbell :size="16" />
          练习模式
        </div>
        <h1>刷题练习</h1>
        <p>连续答题模式，支持随机抽题、按分类专项、错题重刷。答题后可查看参考答案和 AI 点评。</p>
      </div>
      <div class="hero-actions">
        <el-button @click="router.push('/questions')">
          <BookOpen :size="16" />
          题库浏览
        </el-button>
        <el-button @click="router.push('/dashboard')">
          <LayoutDashboard :size="16" />
          工作台
        </el-button>
      </div>
    </section>

    <!-- 配置面板 -->
    <section v-if="!practicing" class="content-card cc-glass">
      <div class="content-card__body">
        <h2>练习配置</h2>
        <el-form :model="config" label-position="top" class="practice-config">
          <el-form-item label="练习模式">
            <el-radio-group v-model="config.mode">
              <el-radio-button value="random">随机刷题</el-radio-button>
              <el-radio-button value="category">按分类</el-radio-button>
              <el-radio-button value="wrong">错题重刷</el-radio-button>
              <el-radio-button value="favorite">收藏练习</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="config.mode === 'category'" label="分类方向">
            <el-input v-model="config.keyword" placeholder="输入分类关键词（如 Redis、JVM）" clearable />
          </el-form-item>
          <el-form-item label="题目数量">
            <el-input-number v-model="config.count" :min="5" :max="50" :step="5" />
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="config.difficulty" clearable placeholder="不限">
              <el-option label="入门" value="BEGINNER" />
              <el-option label="初级" value="EASY" />
              <el-option label="中级" value="MEDIUM" />
              <el-option label="高级" value="HARD" />
              <el-option label="进阶" value="EXPERT" />
            </el-select>
          </el-form-item>
          <el-button type="primary" size="large" :loading="loadingQuestions" @click="startPractice">
            <Play :size="16" />
            开始练习
          </el-button>
        </el-form>
      </div>
    </section>

    <!-- 练习进行中 -->
    <section v-if="practicing" class="practice-workspace">
      <div class="practice-progress cc-glass">
        <div class="progress-info">
          <span>进度：{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <span>正确：{{ correctCount }}</span>
          <span>计时：{{ elapsedText }}</span>
        </div>
        <el-progress :percentage="progressPercent" :show-text="false" />
        <el-button type="danger" plain size="small" @click="finishPractice">结束练习</el-button>
      </div>

      <div class="practice-main cc-glass">
        <div v-if="currentQuestion" class="question-panel">
          <div class="question-header">
            <el-tag effect="plain" size="small">{{ currentQuestion.difficulty || '未标注' }}</el-tag>
            <el-tag v-if="currentQuestion.categoryName" effect="plain" size="small" type="info">{{ currentQuestion.categoryName }}</el-tag>
            <span class="question-index">#{{ currentIndex + 1 }}</span>
          </div>
          <h2 class="question-title">{{ currentQuestion.title }}</h2>
          <div v-if="currentQuestion.content" class="question-content">
            <MarkdownPreview :content="currentQuestion.content" />
          </div>

          <!-- 答题区 -->
          <div v-if="!answered" class="answer-area">
            <el-input
              v-model="userAnswer"
              type="textarea"
              :rows="6"
              placeholder="输入你的回答..."
              :disabled="submitting"
              @keyup.ctrl.enter="submitAnswer"
            />
            <div class="answer-actions">
              <el-button type="primary" :loading="submitting" :disabled="!userAnswer.trim()" @click="submitAnswer">
                <Send :size="16" />
                提交回答
              </el-button>
              <el-button :disabled="submitting" @click="skipQuestion">跳过</el-button>
              <span class="hint">Ctrl + Enter 提交</span>
            </div>
          </div>

          <!-- 答题结果 -->
          <div v-else class="result-area">
            <el-alert
              :type="lastResult?.isCorrect ? 'success' : 'warning'"
              show-icon
              :closable="false"
              :title="lastResult?.isCorrect ? '回答正确' : '需要加强'"
              :description="lastResult?.score ? `得分：${lastResult.score}` : ''"
            />
            <div v-if="showReference" class="reference-block">
              <h3>参考答案</h3>
              <MarkdownPreview :content="currentQuestion.referenceAnswer || '暂无参考答案'" />
            </div>
            <div v-if="lastResult?.aiComment" class="ai-comment-block">
              <h3>AI 点评</h3>
              <MarkdownPreview :content="lastResult.aiComment" />
            </div>
            <div class="result-actions">
              <el-button type="primary" :disabled="submitting" @click="nextQuestion">
                <ArrowRight :size="16" />
                {{ isLastQuestion ? '查看结果' : '下一题' }}
              </el-button>
              <el-button v-if="!showReference" @click="showReference = true">查看参考答案</el-button>
              <el-button-group>
                <el-button :type="masteryChoice === 'MASTERED' ? 'success' : ''" @click="markMastery('MASTERED')">已掌握</el-button>
                <el-button :type="masteryChoice === 'FUZZY' ? 'warning' : ''" @click="markMastery('FUZZY')">模糊</el-button>
                <el-button :type="masteryChoice === 'NOT_MASTERED' ? 'danger' : ''" @click="markMastery('NOT_MASTERED')">不会</el-button>
              </el-button-group>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 练习结果 -->
    <section v-if="finished" class="content-card cc-glass practice-result">
      <div class="content-card__body">
        <h2>练习完成</h2>
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
            <strong class="is-success">{{ correctCount }}</strong>
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
          <el-button type="primary" @click="resetPractice">再来一轮</el-button>
          <el-button @click="router.push('/questions/wrong-records')">查看错题本</el-button>
          <el-button @click="router.push('/dashboard')">返回工作台</el-button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowRight, BookOpen, Dumbbell, LayoutDashboard, Play, Send } from 'lucide-vue-next'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  getFavoriteQuestionsApi,
  getQuestionsApi,
  getWrongQuestionsApi,
  submitQuestionAnswerApi,
  updateQuestionMasteryApi
} from '@/api/question'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import type { FavoriteQuestionVO, QuestionDetailVO, WrongQuestionVO } from '@/types/question'

interface PracticeAnswerResult {
  isCorrect?: boolean
  wrong?: boolean
  score?: number
  aiComment?: string
  referenceAnswer?: string
  analysis?: string
  answerResult?: string
  masteryStatus?: string
}

type PracticeQuestionRecord = QuestionDetailVO | FavoriteQuestionVO | WrongQuestionVO

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
    favorite: 'favorite' in record ? record.favorite : isFavoriteQuestionRecord(record),
    masteryStatus: 'masteryStatus' in record ? record.masteryStatus : undefined,
    lastAnswer: 'lastAnswer' in record ? record.lastAnswer : undefined,
    lastAnswerResult: 'lastAnswerResult' in record ? record.lastAnswerResult : undefined
  }
}

const router = useRouter()

const config = reactive({
  mode: 'random' as 'random' | 'category' | 'wrong' | 'favorite',
  keyword: '',
  count: 10,
  difficulty: ''
})

const practicing = ref(false)
const finished = ref(false)
const loadingQuestions = ref(false)
const submitting = ref(false)
const questions = ref<QuestionDetailVO[]>([])
const currentIndex = ref(0)
const userAnswer = ref('')
const answered = ref(false)
const showReference = ref(false)
const lastResult = ref<PracticeAnswerResult | null>(null)
const masteryChoice = ref('')
const correctCount = ref(0)
const skippedCount = ref(0)
const answeredCount = ref(0)
const elapsedSeconds = ref(0)
let elapsedTimer: number | undefined

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
  const s = elapsedSeconds.value
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

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

const fetchQuestions = async () => {
  loadingQuestions.value = true
  try {
    const params = {
      pageNo: 1,
      pageSize: config.count,
      keyword: config.mode === 'category' ? config.keyword : '',
      difficulty: config.difficulty || undefined
    }

    let records: QuestionDetailVO[] = []

    if (config.mode === 'wrong') {
      const result = await getWrongQuestionsApi({ pageNo: 1, pageSize: config.count })
      records = (result.records || []).map(normalizePracticeQuestion)
    } else if (config.mode === 'favorite') {
      const result = await getFavoriteQuestionsApi(params)
      records = (result.records || []).map(normalizePracticeQuestion)
    } else {
      const result = await getQuestionsApi(params)
      records = (result.records || []).map(normalizePracticeQuestion)
    }

    if (config.mode === 'random') {
      records = records.sort(() => Math.random() - 0.5)
    }

    if (!records.length) {
      ElMessage.warning('未找到符合条件的题目，请调整筛选条件')
      return false
    }

    questions.value = records
    return true
  } catch {
    ElMessage.error('题目加载失败')
    return false
  } finally {
    loadingQuestions.value = false
  }
}

const startPractice = async () => {
  const success = await fetchQuestions()
  if (!success) return
  stopTimer()
  practicing.value = true
  finished.value = false
  currentIndex.value = 0
  correctCount.value = 0
  skippedCount.value = 0
  answeredCount.value = 0
  answered.value = false
  userAnswer.value = ''
  showReference.value = false
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
    lastResult.value = {
      isCorrect,
      wrong: result.wrong,
      score: undefined,
      aiComment: result.analysis,
      referenceAnswer: result.referenceAnswer,
      answerResult: result.answerResult
    }
    answeredCount.value++
    if (isCorrect) {
      correctCount.value++
    }
    answered.value = true
  } catch {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

const skipQuestion = () => {
  if (submitting.value) return
  skippedCount.value++
  nextQuestion()
}

const nextQuestion = () => {
  if (submitting.value) return
  if (isLastQuestion.value) {
    finishPractice()
    return
  }
  currentIndex.value++
  answered.value = false
  userAnswer.value = ''
  showReference.value = false
  lastResult.value = null
  masteryChoice.value = ''
}

const markMastery = async (status: string) => {
  masteryChoice.value = status
  if (!currentQuestion.value) return
  try {
    await updateQuestionMasteryApi(currentQuestion.value.id, { masteryStatus: status })
  } catch {
    // 静默失败
  }
}

const finishPractice = () => {
  practicing.value = false
  finished.value = true
  stopTimer()
}

const resetPractice = () => {
  practicing.value = false
  finished.value = false
  questions.value = []
  currentIndex.value = 0
}

onBeforeUnmount(stopTimer)
</script>

<style scoped lang="scss">
.practice-page {
  gap: 20px;
}

.practice-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px;
  border-radius: var(--cc-radius-xl);
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.hero-copy {
  h1 {
    margin: 14px 0 0;
    font-size: 30px;
  }

  p {
    max-width: 600px;
    margin: 10px 0 0;
    color: var(--app-text-muted);
    line-height: 1.7;
  }
}

.hero-actions {
  display: flex;
  gap: 10px;
}

.practice-config {
  max-width: 600px;
  margin-top: 16px;
}

.practice-workspace {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.practice-progress {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: var(--cc-radius-xl);
}

.progress-info {
  display: flex;
  gap: 16px;
  color: var(--app-text-muted);
  font-size: 13px;
  white-space: nowrap;
}

.practice-main {
  padding: 24px;
  border-radius: var(--cc-radius-xl);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.question-index {
  margin-left: auto;
  color: var(--app-text-muted);
  font-size: 13px;
}

.question-title {
  margin: 16px 0 0;
  font-size: 20px;
  line-height: 1.5;
}

.question-content {
  margin-top: 14px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.28);
}

.answer-area {
  margin-top: 20px;
}

.answer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;

  .hint {
    margin-left: auto;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.result-area {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.reference-block,
.ai-comment-block {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.28);

  h3 {
    margin: 0 0 10px;
    font-size: 15px;
    color: var(--app-text-muted);
  }
}

.ai-comment-block {
  border-color: rgba(34, 211, 238, 0.22);
  background: rgba(8, 47, 73, 0.18);
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.practice-result {
  .content-card__body {
    padding: 24px;
  }
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.stat-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  background: rgba(2, 6, 23, 0.28);
  text-align: center;

  span {
    display: block;
    color: var(--app-text-muted);
    font-size: 12px;
  }

  strong {
    display: block;
    margin-top: 6px;
    font-size: 22px;
  }

  .is-success {
    color: #86efac;
  }
}

.result-final-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

@media (max-width: 860px) {
  .practice-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .result-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .progress-info {
    gap: 10px;
    font-size: 12px;
  }
}
</style>
