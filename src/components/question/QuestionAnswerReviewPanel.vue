<template>
  <section class="answer-review-panel">
    <div class="answer-review-panel__header">
      <div>
        <p class="answer-review-panel__eyebrow">先答题，再点评</p>
        <h2>用面试口径回答这道题</h2>
        <span>提交后会生成 AI 点评，并把参考答案作为复盘材料展示。</span>
      </div>
      <el-tag v-if="currentReview?.reviewStatus" effect="plain">{{ reviewStatusText(currentReview.reviewStatus) }}</el-tag>
    </div>

    <div class="answer-review-panel__guide">
      <span>回答结构</span>
      <div>
        <em>问题边界</em>
        <em>核心方案</em>
        <em>风险取舍</em>
        <em>项目证据</em>
      </div>
    </div>

    <div class="answer-review-panel__composer">
      <label for="question-answer-review-input">我的回答</label>
      <el-input
        id="question-answer-review-input"
        v-model="answerContent"
        type="textarea"
        :rows="8"
        maxlength="5000"
        show-word-limit
        placeholder="先用自己的语言回答：讲清场景、方案、权衡，再补一个项目例子或指标。"
      />
    </div>

    <div class="answer-review-panel__actions">
      <span>答题用时：{{ elapsedSeconds }} 秒</span>
      <el-button type="primary" :loading="submitting" :disabled="!answerContent.trim()" @click="handleSubmit">
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
      <div class="answer-review-panel__result-head">
        <div>
          <p>AI 点评结果</p>
          <h3>{{ displayValue(currentReview.summary || currentReview.aiComment) }}</h3>
        </div>
        <div class="answer-review-panel__score" v-if="hasScore(currentReview.score)">
          <strong>{{ displayValue(currentReview.score) }}</strong>
          <span>{{ displayValue(currentReview.level) }}</span>
        </div>
      </div>

      <div class="answer-review-panel__review-grid">
        <article>
          <span>命中亮点</span>
          <p v-for="item in normalizeList(currentReview.strengths, '暂未返回亮点')" :key="item">{{ item }}</p>
        </article>
        <article>
          <span>需要补强</span>
          <p v-for="item in normalizeList(currentReview.weaknesses, '暂未返回不足')" :key="item">{{ item }}</p>
        </article>
        <article>
          <span>下一版回答</span>
          <p
            v-for="item in normalizeList(currentReview.improvementSuggestions || currentReview.suggestions, '暂未返回改进建议')"
            :key="item"
          >
            {{ item }}
          </p>
        </article>
        <article>
          <span>可能追问</span>
          <p v-for="item in normalizeList(currentReview.suggestedFollowUps, '暂无追问建议')" :key="item">{{ item }}</p>
        </article>
      </div>

      <div v-if="currentReview.referenceComparison || currentReview.knowledgeGaps || currentReview.knowledgePoints" class="answer-review-panel__compare">
        <div v-if="currentReview.referenceComparison">
          <strong>参考对比</strong>
          <p>{{ currentReview.referenceComparison }}</p>
        </div>
        <div v-if="currentReview.knowledgeGaps || currentReview.knowledgePoints">
          <strong>知识缺口</strong>
          <p v-for="item in normalizeList(currentReview.knowledgeGaps || currentReview.knowledgePoints, '暂无知识缺口')" :key="item">{{ item }}</p>
        </div>
      </div>

      <el-alert
        v-if="currentReview.errorMessage"
        class="answer-review-panel__alert"
        type="warning"
        :closable="false"
        :title="toFriendlyMessage(currentReview.errorMessage, 'AI 点评暂时不可用，请稍后重试')"
        show-icon
      />
    </div>

    <div class="answer-review-panel__reference">
      <div class="answer-review-panel__reference-head">
        <div>
          <span>提交后复盘</span>
          <strong>参考答案和解析</strong>
        </div>
        <el-tag :type="canShowReference ? 'success' : 'info'" effect="plain">
          {{ canShowReference ? '可对照' : '先完成作答' }}
        </el-tag>
      </div>
      <template v-if="canShowReference && (question.referenceAnswer || question.analysis || currentReview?.referenceAnswerSnapshot || currentReview?.referenceAnswer)">
        <div v-if="question.referenceAnswer || currentReview?.referenceAnswerSnapshot || currentReview?.referenceAnswer">
          <span>参考答案</span>
          <MarkdownPreview :content="question.referenceAnswer || currentReview?.referenceAnswerSnapshot || currentReview?.referenceAnswer || '暂无参考答案'" />
        </div>
        <div v-if="question.analysis">
          <span>答案解析</span>
          <MarkdownPreview :content="question.analysis" />
        </div>
      </template>
      <p v-else>
        先提交自己的回答，再把参考答案作为复盘材料。当前没有可用数据时，不会生成虚假的答案或点评。
      </p>
    </div>

    <div class="answer-review-panel__history">
      <div class="answer-review-panel__history-title">
        <h3>最近点评历史</h3>
        <el-button text :loading="historyLoading" @click="fetchHistory">刷新</el-button>
      </div>
      <AppState
        v-if="!historyLoading && history.length === 0"
        type="empty"
        title="还没有 AI 点评历史"
        description="提交一次答案后，这里会保留最近点评记录，方便对比分数、亮点、不足和追问建议。"
      >
        <el-button type="primary" plain :disabled="!answerContent.trim()" :loading="submitting" @click="handleSubmit">提交一次点评</el-button>
      </AppState>
      <button
        v-for="item in history"
        v-else
        :key="item.id"
        class="answer-review-panel__history-item"
        type="button"
        @click="currentReview = item"
      >
        <span>{{ item.createdAt || `记录 ${item.id}` }}</span>
        <strong>{{ hasScore(item.score) ? displayValue(item.score) : '已点评' }}</strong>
        <em>{{ reviewStatusText(item.reviewStatus) }}</em>
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
import AppState from '@/components/common/AppState.vue'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import type { PracticeRecordVO, QuestionDetailVO } from '@/types/question'
import { getErrorMessage, toFriendlyMessage } from '@/utils/error'

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
const canShowReference = computed(() => Boolean(currentReview.value || history.value.length))

const displayValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '--'
  return String(value)
}

const hasScore = (value: unknown) => {
  if (value === null || value === undefined || value === '') return false
  return Number.isFinite(Number(value))
}

const reviewStatusText = (value?: string) => {
  const map: Record<string, string> = {
    PENDING: '点评生成中',
    SUCCESS: '点评已生成',
    FAILED: '点评失败'
  }
  return value ? map[value] || value : '待点评'
}

const normalizeList = (value?: string[] | string, fallback = '--') => {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean)
    return items.length ? items : [fallback]
  }
  if (typeof value === 'string') {
    const items = value
      .split(/\r?\n|[;；]/)
      .map((item) => item.trim())
      .filter(Boolean)
    return items.length ? items : [fallback]
  }
  return [fallback]
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
    historyError.value = getErrorMessage(error, '点评历史加载失败')
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
    submitError.value = getErrorMessage(error, '点评暂时生成失败，请稍后重试')
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
  padding: 18px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 8px;
  background: #ffffff;
}

.answer-review-panel__header,
.answer-review-panel__actions,
.answer-review-panel__reference-head,
.answer-review-panel__history-title,
.answer-review-panel__history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.answer-review-panel__eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
}

.answer-review-panel h2,
.answer-review-panel h3 {
  margin: 0;
}

.answer-review-panel__header span {
  display: block;
  margin-top: 6px;
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.answer-review-panel__guide,
.answer-review-panel__reference,
.answer-review-panel__result {
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.answer-review-panel__guide {
  display: grid;
  gap: 10px;

  > span {
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  em {
    padding: 5px 10px;
    border-radius: 8px;
    background: #ffffff;
    color: #2563eb;
    font-style: normal;
    font-weight: 700;
  }
}

.answer-review-panel__composer {
  display: grid;
  gap: 8px;

  label {
    color: var(--app-text);
    font-weight: 700;
  }
}

.answer-review-panel__reference {
  display: grid;
  gap: 12px;

  > div:not(.answer-review-panel__reference-head) {
    min-width: 0;
  }

  span,
  strong {
    display: block;
  }

  span {
    margin-bottom: 8px;
    color: var(--app-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  strong {
    color: var(--app-text);
  }

  p {
    margin: 0;
    color: var(--app-text-muted);
    line-height: 1.7;
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

.answer-review-panel__result {
  display: grid;
  gap: 14px;
}

.answer-review-panel__result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  p,
  h3 {
    margin: 0;
  }

  p {
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  h3 {
    margin-top: 6px;
    font-size: 16px;
    line-height: 1.6;
  }
}

.answer-review-panel__score {
  flex-shrink: 0;
  min-width: 76px;
  text-align: right;

  strong,
  span {
    display: block;
  }

  strong {
    color: #2563eb;
    font-size: 30px;
    line-height: 1;
  }

  span {
    margin-top: 5px;
    color: var(--app-text-muted);
    font-size: 12px;
  }
}

.answer-review-panel__review-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  article {
    min-width: 0;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
  }

  span {
    display: block;
    margin-bottom: 8px;
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
  }

  p {
    margin: 0 0 4px;
    color: var(--app-text-muted);
    line-height: 1.7;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
}

.answer-review-panel__compare {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;

  strong {
    color: var(--app-text);
  }

  p {
    margin: 6px 0 0;
    color: #475569;
    line-height: 1.7;
    white-space: pre-wrap;
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
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: var(--app-text);
  background: #ffffff;
  cursor: pointer;

  strong {
    color: #2563eb;
  }

  em {
    color: var(--app-text-muted);
    font-style: normal;
  }
}

@media (max-width: 720px) {
  .answer-review-panel__review-grid {
    grid-template-columns: 1fr;
  }

  .answer-review-panel__header,
  .answer-review-panel__actions,
  .answer-review-panel__reference-head,
  .answer-review-panel__result-head,
  .answer-review-panel__history-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .answer-review-panel__score {
    text-align: left;
  }
}
</style>
