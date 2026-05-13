<template>
  <div class="page-shell">
    <div class="page-header">
      <div>
        <h1 class="page-title">题库</h1>
        <p class="page-subtitle">按关键词、分类、标签和难度浏览题目，进入详情后提交答案或维护掌握状态。</p>
      </div>
    </div>

    <section class="content-card">
      <div class="content-card__body">
        <QuestionFilters
          :model="query"
          :categories="categoryOptions"
          :tags="tagOptions"
          @search="handleSearch"
          @reset="handleReset"
        />
      </div>

      <div class="question-list" v-loading="loading">
        <el-empty v-if="!loading && questions.length === 0" description="暂无题目数据" />
        <article v-for="item in questions" v-else :key="item.id" class="question-item">
          <div class="question-item__main" @click="router.push(`/questions/${item.id}`)">
            <div class="question-item__title">{{ item.title }}</div>
            <QuestionMeta
              :category-name="item.categoryName"
              :difficulty="item.difficulty"
              :question-type="item.questionType"
              :tags="item.tags"
            />
          </div>
          <div class="question-item__side">
            <StatusTag :status="item.masteryStatus" :map="masteryMap" />
            <el-button
              :type="item.favorite ? 'warning' : 'primary'"
              text
              :loading="favoriteChangingId === item.id"
              @click="toggleFavorite(item)"
            >
              {{ item.favorite ? '取消收藏' : '收藏' }}
            </el-button>
          </div>
        </article>
      </div>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @change="fetchQuestions"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  favoriteQuestionApi,
  getQuestionsApi,
  unfavoriteQuestionApi
} from '@/api/question'
import QuestionFilters from '@/components/question/QuestionFilters.vue'
import QuestionMeta from '@/components/question/QuestionMeta.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionCategoryVO, QuestionQueryDTO, QuestionTagVO, QuestionVO } from '@/types/question'

const router = useRouter()
const loading = ref(false)
const favoriteChangingId = ref<number | null>(null)
const questions = ref<QuestionVO[]>([])
const total = ref(0)

const query = reactive<QuestionQueryDTO>({
  keyword: '',
  categoryId: undefined,
  tagIds: [],
  difficulty: '',
  pageNo: 1,
  pageSize: 10
})

const masteryMap = {
  MASTERED: '已掌握',
  VAGUE: '模糊',
  UNKNOWN: '未掌握'
}

const categoryOptions = computed<QuestionCategoryVO[]>(() => {
  const map = new Map<number, QuestionCategoryVO>()
  questions.value.forEach((item) => {
    if (item.categoryId && item.categoryName) {
      map.set(item.categoryId, {
        id: item.categoryId,
        name: item.categoryName,
        status: 1
      })
    }
  })
  return Array.from(map.values())
})

const tagOptions = computed<QuestionTagVO[]>(() => {
  const map = new Map<number, QuestionTagVO>()
  questions.value.forEach((item) => item.tags?.forEach((tag) => map.set(tag.id, tag)))
  return Array.from(map.values())
})

const fetchQuestions = async () => {
  loading.value = true
  try {
    const result = await getQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  query.pageNo = 1
  fetchQuestions()
}

const handleReset = () => {
  Object.assign(query, {
    keyword: '',
    categoryId: undefined,
    tagIds: [],
    difficulty: '',
    pageNo: 1,
    pageSize: 10
  })
  fetchQuestions()
}

const toggleFavorite = async (item: QuestionVO) => {
  favoriteChangingId.value = item.id
  try {
    if (item.favorite) {
      await unfavoriteQuestionApi(item.id)
      item.favorite = false
      ElMessage.success('已取消收藏')
    } else {
      await favoriteQuestionApi(item.id)
      item.favorite = true
      ElMessage.success('已收藏')
    }
  } finally {
    favoriteChangingId.value = null
  }
}

onMounted(fetchQuestions)
</script>

<style scoped lang="scss">
.question-list {
  min-height: 280px;
  border-top: 1px solid var(--app-border);
}

.question-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--app-border);
}

.question-item__main {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
}

.question-item__title {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.question-item__side {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px 20px;
}

@media (max-width: 720px) {
  .question-item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
