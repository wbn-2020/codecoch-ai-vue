<template>
  <div class="question-page page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <BookOpenCheck :size="16" />
          题库训练
        </p>
        <h1>先练今天最影响面试的题</h1>
        <p>按岗位、分类、标签和掌握状态筛题，把刷题变成围绕目标岗位的专项补强。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/questions/recommendations')">
            <Sparkles :size="17" />
            查看推荐题
          </el-button>
          <el-button size="large" @click="router.push('/questions/practice')">
            <Dumbbell :size="17" />
            开始专项练习
          </el-button>
          <el-button size="large" text @click="router.push('/questions/wrong-records')">
            <RotateCcw :size="17" />
            复盘错题
          </el-button>
        </div>
      </div>

      <aside class="hero-panel">
        <div class="hero-panel__stat">
          <span>当前页题目</span>
          <strong>{{ total }}</strong>
        </div>
        <div class="hero-panel__stat">
          <span>已收藏</span>
          <strong>{{ favoriteCount }}</strong>
        </div>
        <div class="hero-panel__stat">
          <span>已掌握</span>
          <strong>{{ masteredCount }}</strong>
        </div>
        <div class="hero-panel__stat">
          <span>待补强</span>
          <strong>{{ weakCount }}</strong>
        </div>
        <p>收藏、错题和掌握状态都会影响下一轮推荐，这里只呈现真实题库内容。</p>
      </aside>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <span>当前页题目</span>
        <strong>{{ total }}</strong>
        <p>符合筛选条件的题目总数。</p>
      </article>
      <article class="metric-card">
        <span>已收藏</span>
        <strong>{{ favoriteCount }}</strong>
        <p>适合面试前反复复习的题目。</p>
      </article>
      <article class="metric-card">
        <span>已掌握</span>
        <strong>{{ masteredCount }}</strong>
        <p>掌握状态为已掌握的题目。</p>
      </article>
      <article class="metric-card">
        <span>待补强</span>
        <strong>{{ weakCount }}</strong>
        <p>模糊或未掌握，需要优先回看的题。</p>
      </article>
    </section>

    <section class="content-card question-workbench">
      <div class="content-card__body workbench-head">
        <div>
          <p class="section-kicker">筛选器</p>
          <h2>缩小今天要练的题</h2>
          <p class="section-desc">先用筛选器找到当前岗位最需要补强的题。</p>
        </div>
        <div class="workbench-actions">
          <el-button text :loading="loading" @click="fetchQuestions">刷新</el-button>
          <el-button text @click="router.push('/questions/practice')">专项练习</el-button>
          <el-button text @click="router.push('/questions/wrong-records')">错题复盘</el-button>
        </div>
      </div>

      <div class="content-card__body">
        <QuestionFilters
          :model="query"
          :categories="categoryOptions"
          :tags="tagOptions"
          @search="handleSearch"
          @reset="handleReset"
        />
      </div>

      <div class="question-feed" v-loading="loading">
        <AppState
          v-if="!loading && loadError"
          type="error"
          title="题目列表加载失败"
          :description="loadError"
        >
          <el-button type="primary" @click="fetchQuestions">重新加载</el-button>
        </AppState>

        <AppState
          v-else-if="!loading && questions.length === 0"
          type="empty"
          title="暂无符合条件的题目"
          description="换一个分类、标签或掌握状态，看看是否能找到更贴近当前岗位的题。"
        >
          <el-button type="primary" @click="handleReset">清空筛选条件</el-button>
        </AppState>

        <article
          v-for="item in questions"
          v-else
          :key="item.id"
          class="question-card"
          @click="router.push(`/questions/${item.id}`)"
        >
          <div class="question-card__main">
            <div class="question-card__head">
              <div>
                <h3>{{ item.title }}</h3>
                <QuestionMeta
                  :category-name="item.categoryName"
                  :difficulty="item.difficulty"
                  :question-type="item.questionType"
                  :tags="item.tags"
                />
              </div>
              <StatusTag :status="item.masteryStatus" :map="masteryMap" />
            </div>

            <p class="question-desc">
              {{ item.experienceLevel || '这道题进入详情后，可以直接提交答案、看参考思路和回到训练记录。' }}
            </p>
          </div>

          <div class="question-card__side">
            <div class="side-meta">
              <span>收藏</span>
              <strong>{{ item.favorite ? '已收藏' : '未收藏' }}</strong>
            </div>
            <div class="side-actions">
              <el-button
                :type="item.favorite ? 'warning' : 'primary'"
                :loading="favoriteChangingId === item.id"
                @click.stop="toggleFavorite(item)"
              >
                {{ item.favorite ? '取消收藏' : '收藏' }}
              </el-button>
              <el-button text @click.stop="router.push(`/questions/${item.id}`)">
                进入详情
              </el-button>
            </div>
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

import { favoriteQuestionApi, getQuestionsApi, unfavoriteQuestionApi } from '@/api/question'
import AppState from '@/components/common/AppState.vue'
import QuestionFilters from '@/components/question/QuestionFilters.vue'
import QuestionMeta from '@/components/question/QuestionMeta.vue'
import StatusTag from '@/components/common/StatusTag.vue'
import type { QuestionCategoryVO, QuestionQueryDTO, QuestionTagVO, QuestionVO } from '@/types/question'
import { toFriendlyMessage } from '@/utils/error'

const router = useRouter()
const loading = ref(false)
const favoriteChangingId = ref<number | null>(null)
const loadError = ref('')
const questions = ref<QuestionVO[]>([])
const total = ref(0)

const query = reactive<QuestionQueryDTO>({
  keyword: '',
  categoryId: undefined,
  tagId: undefined,
  difficulty: '',
  masteryStatus: '',
  favoriteOnly: false,
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
  const byName = new Map<string, QuestionTagVO>()

  questions.value.forEach((item) => {
    item.tags?.forEach((tag) => {
      const name = (tag?.name || tag?.tagName || '').trim()
      const id = Number(tag?.id)
      if (!Number.isFinite(id) || id <= 0) return
      if (!name || byName.has(String(id))) return
      byName.set(String(id), { ...(tag || {}), id, name, status: tag?.status ?? 1 })
    })
  })

  return Array.from(byName.values())
})

const favoriteCount = computed(() => questions.value.filter((item) => item.favorite).length)
const masteredCount = computed(() => questions.value.filter((item) => item.masteryStatus === 'MASTERED').length)
const weakCount = computed(() => questions.value.filter((item) => item.masteryStatus === 'VAGUE' || item.masteryStatus === 'UNKNOWN').length)

const fetchQuestions = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const result = await getQuestionsApi(query)
    questions.value = result.records || []
    total.value = result.total || 0
  } catch (error) {
    questions.value = []
    total.value = 0
    loadError.value = toFriendlyMessage(error, '题目列表暂时加载失败，请稍后重试。')
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
    tagId: undefined,
    difficulty: '',
    masteryStatus: '',
    favoriteOnly: false,
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
.question-page {
  display: grid;
  gap: 18px;
}

.hero-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(20, 184, 166, 0.05)),
    var(--app-surface, #ffffff);
  box-shadow: var(--app-shadow);
}

.hero-kicker,
.hero-actions,
.question-card__head,
.side-actions,
.side-meta,
.workbench-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-kicker,
.section-kicker {
  margin: 0;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
}

.hero-copy h1,
.question-card h3,
.workbench-head h2 {
  margin: 0;
  color: var(--app-text);
}

.hero-copy h1 {
  font-size: 32px;
  line-height: 1.18;
}

.hero-copy p,
.hero-panel p,
.question-desc,
.metric-card p,
.side-meta span,
.section-desc {
  color: var(--app-text-muted);
}

.hero-copy p {
  max-width: 720px;
  margin: 12px 0 0;
  line-height: 1.8;
}

.hero-actions {
  flex-wrap: wrap;
  margin-top: 22px;
}

.hero-panel {
  display: grid;
  gap: 12px;
  align-content: start;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.88);
}

.hero-panel__stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.hero-panel__stat span {
  color: var(--app-text-muted);
  font-size: 12px;
}

.hero-panel__stat strong {
  color: var(--app-text);
  font-size: 18px;
  line-height: 1.4;
}

.hero-panel p {
  margin: 2px 0 0;
  line-height: 1.7;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 26px;
}

.metric-card p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.question-workbench {
  overflow: hidden;
}

.workbench-head {
  justify-content: space-between;
  padding-bottom: 18px;
}

.workbench-head h2 {
  font-size: 20px;
  line-height: 1.35;
}

.section-desc {
  margin: 6px 0 0;
  line-height: 1.6;
}

.question-feed {
  display: grid;
  gap: 14px;
  padding: 0 20px 20px;
}

.question-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  padding: 16px 0 0;
  border-top: 1px solid #edf2f7;
  cursor: pointer;
}

.question-card:first-child {
  border-top: 0;
}

.question-card__head {
  justify-content: space-between;
  align-items: flex-start;
}

.question-card h3 {
  font-size: 17px;
  line-height: 1.45;
}

.question-desc {
  margin: 12px 0 0;
  line-height: 1.7;
}

.question-card__side {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.side-meta {
  justify-content: space-between;
}

.side-meta strong {
  color: var(--app-text);
}

.side-actions {
  flex-wrap: wrap;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 20px;
}

@media (max-width: 1080px) {
  .hero-band,
  .metric-grid,
  .question-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-band {
    padding: 22px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .workbench-head,
  .workbench-actions,
  .hero-actions,
  .side-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .workbench-head :deep(.el-button),
  .workbench-actions :deep(.el-button),
  .hero-actions :deep(.el-button),
  .side-actions :deep(.el-button) {
    width: 100%;
  }

  .question-feed,
  .pagination-wrap {
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
