<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ detail?.title || '题目详情' }}</h1>
        <p class="page-subtitle">查看题目内容，提交练习答案，并维护收藏和掌握状态。</p>
      </div>
      <el-button @click="router.back()">返回</el-button>
    </div>

    <section class="content-card" v-loading="loading">
      <div v-if="detail" class="content-card__body detail-layout">
        <div class="detail-main">
          <QuestionMeta
            :category-name="detail.category?.name || detail.categoryName"
            :difficulty="detail.difficulty"
            :question-type="detail.questionType"
            :tags="displayTags"
          />

          <section class="detail-section">
            <h2>题目内容</h2>
            <MarkdownPreview :content="detail.content" />
          </section>

          <section class="detail-section">
            <h2>我的回答</h2>
            <el-input v-model="answerForm.userAnswer" type="textarea" :rows="8" placeholder="请输入你的答案" />
            <div class="answer-actions">
              <el-select v-model="answerForm.selfResult" placeholder="自评结果" style="width: 140px">
                <el-option v-for="item in answerResultOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-select v-model="answerForm.masteryStatus" placeholder="掌握状态" style="width: 140px">
                <el-option v-for="item in masteryOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="primary" :loading="submitting" @click="handleSubmitAnswer">提交答案</el-button>
            </div>
          </section>

          <QuestionAnswerReviewPanel :question="detail" />

          <section class="detail-section">
            <h2>参考答案</h2>
            <MarkdownPreview :content="detail.referenceAnswer || '暂无参考答案'" />
          </section>

          <section class="detail-section">
            <h2>答案解析</h2>
            <MarkdownPreview :content="detail.analysis || '暂无解析'" />
          </section>
        </div>

        <aside class="detail-side">
          <el-button
            class="side-button"
            :type="detail.favorite ? 'warning' : 'primary'"
            :loading="favoriteLoading"
            @click="toggleFavorite"
          >
            {{ detail.favorite ? '取消收藏' : '收藏题目' }}
          </el-button>
          <el-divider />
          <div class="side-title">掌握状态</div>
          <el-radio-group v-model="masteryStatus" class="mastery-group">
            <el-radio-button v-for="item in masteryOptions" :key="item.value" :label="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
          <el-button class="side-button" :loading="masteryLoading" @click="handleUpdateMastery">
            保存状态
          </el-button>
          <el-divider />
          <div class="side-title">最近答题</div>
          <p class="side-muted">{{ detail.lastAnswer || '暂无最近答案' }}</p>
          <StatusTag :status="detail.lastAnswerResult" />
        </aside>
      </div>
      <el-empty v-else-if="!loading" description="题目不存在或暂不可访问" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  favoriteQuestionApi,
  getQuestionDetailApi,
  submitQuestionAnswerApi,
  unfavoriteQuestionApi,
  updateQuestionMasteryApi
} from '@/api/question'
import MarkdownPreview from '@/components/common/MarkdownPreview.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import QuestionAnswerReviewPanel from '@/components/question/QuestionAnswerReviewPanel.vue'
import QuestionMeta from '@/components/question/QuestionMeta.vue'
import { answerResultOptions, masteryOptions, MASTERY_STATUS } from '@/constants/enums'
import type { MasteryStatus, QuestionAnswerDTO, QuestionDetailVO, QuestionTagVO } from '@/types/question'
import { getRouteNumberParam } from '@/utils/route'

const route = useRoute()
const router = useRouter()
const questionId = getRouteNumberParam(route.params.id as string)

const loading = ref(false)
const submitting = ref(false)
const favoriteLoading = ref(false)
const masteryLoading = ref(false)
const detail = ref<QuestionDetailVO | null>(null)
const masteryStatus = ref<MasteryStatus>(MASTERY_STATUS.UNKNOWN)

const displayTags = computed<QuestionTagVO[]>(() => {
  const tags = detail.value?.tags || []
  const normalized = tags
    .map((tag, index) => {
      if (!tag) return null
      if (typeof tag === 'string') {
        return { id: 0, name: tag, status: 1 } as QuestionTagVO
      }
      const id = Number(tag.id || 0)
      const name = tag.name || tag.tagName || ''
      if (!Number.isFinite(id) || !name) return null
      return { ...tag, id, name, status: tag.status ?? 1 } as QuestionTagVO
    })
    .filter((item): item is QuestionTagVO => Boolean(item))

  return normalized
})

const answerForm = reactive<QuestionAnswerDTO>({
  userAnswer: '',
  selfResult: 'PARTIAL_CORRECT',
  masteryStatus: MASTERY_STATUS.VAGUE
})

const fetchDetail = async () => {
  if (!questionId) return
  loading.value = true
  try {
    detail.value = await getQuestionDetailApi(questionId)
    masteryStatus.value = detail.value.masteryStatus || MASTERY_STATUS.UNKNOWN
    answerForm.userAnswer = detail.value.lastAnswer || ''
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  if (!detail.value) return
  favoriteLoading.value = true
  try {
    if (detail.value.favorite) {
      await unfavoriteQuestionApi(detail.value.id)
      detail.value.favorite = false
      ElMessage.success('已取消收藏')
    } else {
      await favoriteQuestionApi(detail.value.id)
      detail.value.favorite = true
      ElMessage.success('已收藏')
    }
  } finally {
    favoriteLoading.value = false
  }
}

const handleUpdateMastery = async () => {
  if (!detail.value) return
  masteryLoading.value = true
  try {
    const result = await updateQuestionMasteryApi(detail.value.id, { masteryStatus: masteryStatus.value })
    detail.value.masteryStatus = result?.masteryStatus || masteryStatus.value
    ElMessage.success('掌握状态已更新')
  } finally {
    masteryLoading.value = false
  }
}

const handleSubmitAnswer = async () => {
  if (!detail.value || !answerForm.userAnswer.trim()) {
    ElMessage.warning('请先填写答案')
    return
  }

  submitting.value = true
  try {
    const result = await submitQuestionAnswerApi(detail.value.id, answerForm)
    detail.value.lastAnswer = answerForm.userAnswer
    detail.value.lastAnswerResult = result.answerResult || (result.wrong ? 'WRONG' : 'CORRECT')
    detail.value.masteryStatus = result.masteryStatus
    detail.value.referenceAnswer = result.referenceAnswer || detail.value.referenceAnswer
    detail.value.analysis = result.analysis || detail.value.analysis
    masteryStatus.value = result.masteryStatus || masteryStatus.value
    ElMessage.success(result.wrongRecordGenerated || result.wrong ? '答案已提交，已更新错题记录' : '答案已提交')
  } finally {
    submitting.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped lang="scss">
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 24px;
}

.detail-main {
  min-width: 0;
}

.detail-section {
  margin-top: 24px;

  h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }
}

.answer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.detail-side {
  position: sticky;
  top: 80px;
  align-self: start;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: var(--app-surface-soft);
}

.side-button {
  width: 100%;
}

.side-title {
  margin-bottom: 10px;
  font-weight: 700;
}

.side-muted {
  color: var(--app-text-muted);
  font-size: 13px;
  line-height: 1.6;
}

.mastery-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;

  :deep(.el-radio-button__inner) {
    width: 100%;
    border-left: 1px solid var(--el-border-color);
  }
}

@media (max-width: 880px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }

  .detail-side {
    position: static;
  }
}
</style>
