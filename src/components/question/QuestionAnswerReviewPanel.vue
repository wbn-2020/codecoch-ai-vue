<template>
  <section class="answer-review-panel">
    <div class="answer-review-panel__header">
      <div>
        <p class="answer-review-panel__eyebrow">AI 简答点评</p>
        <h2>{{ question.title }}</h2>
      </div>
      <el-tag v-if="currentReview?.reviewStatus" effect="dark">{{ currentReview.reviewStatus }}</el-tag>
    </div>

    <div class="answer-review-panel__question">
      <MarkdownPreview :content="question.content" />
    </div>

    <div v-if="question.referenceAnswer || question.analysis" class="answer-review-panel__reference">
      <div v-if="question.referenceAnswer">
        <span>参考答案</span>
        <MarkdownPreview :content="question.referenceAnswer" />
      </div>
      <div v-if="question.analysis">
        <span>解析</span>
        <MarkdownPreview :content="question.analysis" />
      </div>
    </div>

    <el-input
      v-model="answerContent"
      type="textarea"
      :rows="8"
      maxlength="5000"
      show-word-limit
      placeholder="请输入你的简答题答案，提交后将调用真实 AI 点评接口。"
    />

    <div class="answer-review-panel__actions">
      <span>答题用时：{{ elapsedSeconds }} 秒</span>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交 AI 点评
      </el-button>
    </div>

    <el-alert
      v-if="submitError"
      class="answer-review-panel__alert"
      type="error"
      :closable="false"
      :title="submitError"
      show-icon
    />

    <div v-if="currentReview" class="answer-review-panel__result">
      <div class="answer-review-panel__score">
        <strong>{{ displayValue(currentReview.score) }}</strong>
        <span>评分 / {{ displayValue(currentReview.level) }}</span>
      </div>

      <dl>
        <div>
          <dt>状态</dt>
          <dd>{{ displayValue(currentReview.reviewStatus) }}</dd>
        </div>
        <div>
          <dt>概要</dt>
          <dd>{{ displayValue(currentReview.summary || currentReview.aiComment) }}</dd>
        </div>
        <div>
          <dt>亮点</dt>
          <dd><p v-for="item in normalizeList(currentReview.strengths)" :key="item">{{ item }}</p></dd>
        </div>
        <div>
          <dt>不足</dt>
          <dd><p v-for="item in normalizeList(currentReview.weaknesses)" :key="item">{{ item }}</p></dd>
        </div>
        <div>
          <dt>改进建议</dt>
          <dd><p v-for="item in normalizeList(currentReview.improvementSuggestions || currentReview.suggestions)" :key="item">{{ item }}</p></dd>
        </div>
        <div>
          <dt>参考对比</dt>
          <dd>{{ displayValue(currentReview.referenceComparison) }}</dd>
        </div>
        <div>
          <dt>知识缺口</dt>
          <dd><p v-for="item in normalizeList(currentReview.knowledgeGaps || currentReview.knowledgePoints)" :key="item">{{ item }}</p></dd>
        </div>
        <div>
          <dt>追问建议</dt>
          <dd><p v-for="item in normalizeList(currentReview.suggestedFollowUps)" :key="item">{{ item }}</p></dd>
        </div>
        <div>
          <dt>参考答案快照</dt>
          <dd>{{ displayValue(currentReview.referenceAnswerSnapshot || currentReview.referenceAnswer) }}</dd>
        </div>
        <div>
          <dt>AI 调用日志</dt>
          <dd>{{ displayValue(currentReview.aiCallLogId) }}</dd>
        </div>
        <div>
          <dt>创建时间</dt>
          <dd>{{ displayValue(currentReview.createdAt) }}</dd>
        </div>
        <div v-if="currentReview.errorMessage">
          <dt>错误信息</dt>
          <dd>{{ currentReview.errorMessage }}</dd>
        </div>
      </dl>
    </div>

    <div class="answer-review-panel__history">
      <div class="answer-review-panel__history-title">
        <h3>最近点评历史</h3>
        <el-button text :loading="historyLoading" @click="fetchHistory">刷新</el-button>
      </div>
      <el-empty v-if="!historyLoading && history.length === 0" description="暂无点评历史" />
      <button
        v-for="item in history"
        v-else
        :key="item.id"
        class="answer-review-panel__history-item"
        type="button"
        @click="currentReview = item"
      >
        <span>{{ item.createdAt || `记录 ${item.id}` }}</span>
        <strong>{{ displayValue(item.score) }}</strong>
        <em>{{ displayValue(item.reviewStatus) }}</em>
      </button>
      <p v-if="historyError" class="answer-review-panel__history-error">{{ historyError }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  getQuestionAnswerReviewsApi,
  submitQuestionAnswerReviewApi
} from '@/api/question'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import type { PracticeRecordVO, QuestionDetailVO } from '@/types/question'

const props = defineProps<{
  question: QuestionDetailVO
}>()

const answerContent = ref(props.question.lastAnswer || '')
const startedAt = ref(Date.now())
const now = ref(Date.now())
const submitting = ref(false)
const historyLoading = ref(false)
const submitError = ref('')
const historyError = ref('')
const currentReview = ref<PracticeRecordVO | null>(null)
const history = ref<PracticeRecordVO[]>([])
let timer: number | undefined

const elapsedSeconds = computed(() =>
  Math.max(1, Math.floor((now.value - startedAt.value) / 1000))
)

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '--'
  return String(value)
}

const normalizeList = (value?: string[] | string) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[;；]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return ['--']
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'AI 点评请求失败'
}

const fetchHistory = async () => {
  historyLoading.value = true
  historyError.value = ''
  try {
    const result = await getQuestionAnswerReviewsApi(props.question.id, {
      pageNo: 1,
      pageSize: 5
    })
    history.value = result.records || []
  } catch (error) {
    historyError.value = getErrorMessage(error)
  } finally {
    historyLoading.value = false
  }
}

const handleSubmit = async () => {
  const content = answerContent.value.trim()
  submitError.value = ''
  if (!content) {
    ElMessage.warning('请先填写答案')
    return
  }
  if (content.length > 5000) {
    ElMessage.warning('答案不能超过 5000 字')
    return
  }

  submitting.value = true
  try {
    const result = await submitQuestionAnswerReviewApi(props.question.id, {
      answerContent: content,
      answerDurationSeconds: elapsedSeconds.value,
      source: 'QUESTION_BANK'
    })
    currentReview.value = result
    startedAt.value = Date.now()
    await fetchHistory()
    ElMessage.success('AI 点评已生成')
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
  fetchHistory()
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped lang="scss">
.answer-review-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
  padding: 18px;
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.78));
}

.answer-review-panel__header,
.answer-review-panel__actions,
.answer-review-panel__history-title,
.answer-review-panel__history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.answer-review-panel__eyebrow {
  margin: 0 0 6px;
  color: var(--cc-ai-cyan);
  font-size: 12px;
  font-weight: 700;
}

.answer-review-panel h2,
.answer-review-panel h3 {
  margin: 0;
}

.answer-review-panel__question,
.answer-review-panel__reference,
.answer-review-panel__result {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.35);
}

.answer-review-panel__reference {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  span {
    display: block;
    margin-bottom: 8px;
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 700;
  }
}

.answer-review-panel__actions span,
.answer-review-panel__history-error {
  color: var(--app-text-muted);
  font-size: 13px;
}

.answer-review-panel__alert {
  margin-top: 0;
}

.answer-review-panel__score {
  margin-bottom: 16px;

  strong {
    margin-right: 8px;
    color: var(--cc-ai-cyan);
    font-size: 32px;
  }

  span {
    color: var(--app-text-muted);
  }
}

dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

dt {
  margin-bottom: 6px;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 700;
}

dd {
  margin: 0;
  color: var(--app-text);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;

  p {
    margin: 0 0 4px;
  }
}

.answer-review-panel__history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-review-panel__history-item {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  color: var(--app-text);
  background: rgba(15, 23, 42, 0.72);
  cursor: pointer;

  strong {
    color: var(--cc-ai-cyan);
  }

  em {
    color: var(--app-text-muted);
    font-style: normal;
  }
}

@media (max-width: 720px) {
  .answer-review-panel__reference,
  dl {
    grid-template-columns: 1fr;
  }

  .answer-review-panel__actions,
  .answer-review-panel__history-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
