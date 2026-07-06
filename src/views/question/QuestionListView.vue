<template>
  <div class="question-page page-shell">
    <section class="hero-band">
      <div class="hero-copy">
        <p class="hero-kicker">
          <BookOpenCheck :size="16" />
          题库训练
        </p>
        <h1>题库训练中心</h1>
        <p>先选一题开始表达，再用 AI 点评、参考思路和复盘记录把它沉淀成面试可用的回答。</p>
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="router.push('/questions/practice')">
            <Dumbbell :size="17" />
            开始训练
          </el-button>
          <el-button size="large" @click="router.push('/questions/recommendations')">
            <Sparkles :size="17" />
            看今日推荐
          </el-button>
          <el-button size="large" text @click="router.push('/questions/wrong-records')">
            <RotateCcw :size="17" />
            复盘错题
          </el-button>
          <el-button size="large" text @click="router.push('/questions/favorites')">
            <Bookmark :size="17" />
            收藏复习
          </el-button>
        </div>
      </div>

      <aside class="hero-panel">
        <p class="hero-panel__label">当前训练池</p>
        <div class="hero-panel__focus">
          <strong>{{ total }}</strong>
          <span>道可训练题</span>
        </div>
        <p>{{ trainingFocusText }}</p>
        <div class="hero-panel__steps">
          <span>选题</span>
          <span>先答</span>
          <span>点评</span>
          <span>复盘</span>
        </div>
      </aside>
    </section>

    <section class="training-strip">
      <article class="training-note">
        <span>今天先练</span>
        <strong>{{ weakCount ? `${weakCount} 道待补强题` : '任选一题开练' }}</strong>
        <p>未评估、模糊和未掌握会优先提示，但不会伪造你的能力结论。</p>
      </article>
      <article class="training-note">
        <span>复盘资产</span>
        <strong>{{ favoriteCount }} 道本页收藏</strong>
        <p>收藏不抢主动作，只作为面试前回看和串联表达的入口。</p>
      </article>
      <article class="training-note is-muted">
        <span>已掌握</span>
        <strong>{{ masteredCount }} 道可低频回看</strong>
        <p>已掌握题建议用于巩固表达，不占用主训练精力。</p>
      </article>
    </section>

    <section class="content-card question-workbench">
      <div class="content-card__body workbench-head">
        <div>
          <p class="section-kicker">训练题卡</p>
          <h2>选择一道题，进入先答后评</h2>
          <p class="section-desc">{{ currentResultLabel }}</p>
        </div>
        <div class="workbench-actions">
          <el-button text :loading="loading" @click="fetchQuestions">刷新</el-button>
          <el-button text @click="router.push('/questions/practice')">专项练习</el-button>
          <el-button text @click="router.push('/questions/wrong-records')">错题复盘</el-button>
        </div>
      </div>

      <details class="filter-drawer" :open="hasActiveFilters">
        <summary>
          <span>
            <SlidersHorizontal :size="16" />
            调整训练范围
          </span>
          <small>筛选是辅助，题卡里的“开始训练”是主动作</small>
        </summary>
        <div class="filter-drawer__body">
          <QuestionFilters
            :model="query"
            :categories="categoryOptions"
            :tags="tagOptions"
            @search="handleSearch"
            @reset="handleReset"
          />
        </div>
      </details>

      <div class="question-feed" v-loading="loading">
        <AppState
          v-if="!loading && loadError"
          type="error"
          title="训练题加载失败"
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
          @click="openQuestion(item)"
        >
          <div class="question-card__top">
            <div>
              <p class="question-card__eyebrow">训练题</p>
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

          <div class="question-card__insights">
            <div>
              <span>为什么练这题</span>
              <p>{{ trainingReason(item) }}</p>
            </div>
            <div>
              <span>训练状态</span>
              <p>{{ trainingState(item) }}</p>
            </div>
            <div>
              <span>下一步</span>
              <p>{{ nextAction(item) }}</p>
            </div>
          </div>

          <div class="question-card__footer">
            <p>{{ item.experienceLevel || '进入训练页后先用自己的话回答，再看 AI 点评、参考思路和下一步。' }}</p>
            <div class="side-actions">
              <el-button type="primary" @click.stop="openQuestion(item)">
                <PlayCircle :size="16" />
                开始训练
              </el-button>
              <el-button
                :type="item.favorite ? 'warning' : 'default'"
                plain
                :loading="favoriteChangingId === item.id"
                @click.stop="toggleFavorite(item)"
              >
                {{ item.favorite ? '已收藏' : '收藏复习' }}
              </el-button>
            </div>
          </div>
        </article>
      </div>

      <div v-if="total > 0" class="pagination-wrap">
        <span>换一组训练题</span>
        <el-pagination
          v-model:current-page="query.pageNo"
          v-model:page-size="query.pageSize"
          background
          layout="prev, pager, next, sizes"
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
import { BookOpenCheck, Bookmark, Dumbbell, PlayCircle, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-vue-next'

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
const weakCount = computed(() => questions.value.filter((item) => !item.masteryStatus || item.masteryStatus === 'VAGUE' || item.masteryStatus === 'UNKNOWN').length)
const hasActiveFilters = computed(() =>
  Boolean(query.keyword || query.categoryId || query.tagId || query.difficulty || query.masteryStatus || query.favoriteOnly)
)
const currentResultLabel = computed(() => {
  if (loading.value) return '正在整理可训练题，稍后选择一题开始。'
  if (loadError.value) return '训练题暂时没有加载成功，可以重试或切到专项练习。'
  if (!total.value) return hasActiveFilters.value ? '当前筛选没有命中题目，可以放宽训练范围。' : '暂无可训练题，先从今日推荐或专项练习进入。'
  return hasActiveFilters.value
    ? `已按当前训练范围筛出 ${total.value} 道题。`
    : `当前题库共有 ${total.value} 道可训练题。`
})
const trainingFocusText = computed(() => {
  if (weakCount.value > 0) return `本页有 ${weakCount.value} 道待补强题，建议先从这些题开始练表达。`
  if (favoriteCount.value > 0) return `本页有 ${favoriteCount.value} 道收藏题，适合做面试前的稳定复习。`
  return '当前结果没有明显薄弱标记，可以选择和目标岗位最相关的一题开始。'
})

const openQuestion = (item: QuestionVO) => {
  router.push(`/questions/${item.id}`)
}

const trainingReason = (item: QuestionVO) => {
  const difficulty = String(item.difficulty || '').toUpperCase()
  if (!item.masteryStatus) return '这道题还没有训练记录，适合用来建立第一版回答。'
  if (item.masteryStatus === 'UNKNOWN') return '当前标记为未掌握，优先练能快速补齐面试短板。'
  if (item.masteryStatus === 'VAGUE') return '当前还比较模糊，适合把概念和项目表达重新讲清楚。'
  if (item.favorite) return '你已经收藏过它，适合面试前反复打磨稳定说法。'
  if (difficulty === 'HARD') return '这是一道高难题，适合训练拆解问题和组织答案的能力。'
  if (item.categoryName) return `围绕「${item.categoryName}」补强，让同类问题的回答更连贯。`
  return '作为通用训练题，适合保持答题手感和表达节奏。'
}

const trainingState = (item: QuestionVO) => {
  if (item.masteryStatus === 'MASTERED') return item.answered ? '已练过且标记为已掌握，可低频回看。' : '已标记为已掌握，建议用来巩固表达。'
  if (item.masteryStatus === 'VAGUE') return '还没讲透，建议先写答题骨架再看点评。'
  if (item.masteryStatus === 'UNKNOWN') return '需要补强，训练后再更新掌握状态。'
  return '尚未评估，先完成一次作答再判断掌握程度。'
}

const nextAction = (item: QuestionVO) => {
  if (item.masteryStatus === 'MASTERED') return '进入训练页快速复述，确认面试表达是否稳定。'
  if (item.masteryStatus === 'VAGUE') return '先用自己的话回答，再对照 AI 点评补齐遗漏。'
  if (item.masteryStatus === 'UNKNOWN') return '从基础定义、使用场景和项目例子三个点开答。'
  if (item.favorite) return '把收藏原因讲成一段面试可复用的回答。'
  return '点击开始训练，先答题，再看点评和参考思路。'
}

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
    loadError.value = toFriendlyMessage(error, '训练题暂时加载失败，请稍后重试。')
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
.question-card__top,
.side-actions,
.workbench-actions,
.filter-drawer summary span,
.hero-panel__steps {
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
.training-note p,
.question-card__insights p,
.question-card__footer p,
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
  gap: 14px;
  align-content: start;
  padding: 18px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.88);
}

.hero-panel__label {
  margin: 0;
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.hero-panel__focus {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.hero-panel__focus strong {
  color: var(--app-text);
  font-size: 34px;
  line-height: 1;
}

.hero-panel__focus span {
  color: var(--app-text-muted);
  font-size: 13px;
}

.hero-panel p {
  margin: 0;
  line-height: 1.7;
}

.hero-panel__steps {
  flex-wrap: wrap;
}

.hero-panel__steps span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  font-size: 12px;
  font-weight: 700;
}

.training-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.training-note {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 8px;
  background: #ffffff;
}

.training-note.is-muted {
  background: #f8fafc;
}

.training-note span,
.question-card__eyebrow,
.question-card__insights span,
.pagination-wrap span {
  color: var(--app-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.training-note strong {
  display: block;
  margin-top: 6px;
  color: var(--app-text);
  font-size: 20px;
}

.training-note p {
  margin: 8px 0 0;
  line-height: 1.65;
}

.question-workbench {
  overflow: hidden;
}

.workbench-head {
  display: flex;
  align-items: flex-start;
  gap: 16px;
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

.filter-drawer {
  margin: 0 20px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.filter-drawer summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
}

.filter-drawer summary::-webkit-details-marker {
  display: none;
}

.filter-drawer summary span {
  color: var(--app-text);
  font-weight: 800;
}

.filter-drawer summary small {
  color: var(--app-text-muted);
  line-height: 1.5;
}

.filter-drawer__body {
  padding: 0 16px 16px;
}

.question-feed {
  display: grid;
  gap: 16px;
  padding: 0 20px 20px;
}

.question-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.question-card:hover {
  border-color: rgba(37, 99, 235, 0.35);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.question-card__top {
  justify-content: space-between;
  align-items: flex-start;
}

.question-card__eyebrow {
  margin: 0 0 6px;
}

.question-card h3 {
  font-size: 17px;
  line-height: 1.45;
}

.question-card__insights {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
}

.question-card__insights div {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.question-card__insights p {
  margin: 6px 0 0;
  line-height: 1.65;
}

.question-card__footer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding-top: 2px;
}

.question-card__footer p {
  margin: 0;
  line-height: 1.7;
}

.side-actions {
  flex-wrap: wrap;
}

.side-actions :deep(.el-button) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pagination-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  justify-content: flex-end;
  padding: 2px 20px 20px;
}

@media (max-width: 1080px) {
  .hero-band,
  .training-strip,
  .question-card__insights,
  .question-card__footer {
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
  .side-actions,
  .filter-drawer summary,
  .pagination-wrap {
    flex-direction: column;
    align-items: stretch;
  }

  .workbench-head :deep(.el-button),
  .workbench-actions :deep(.el-button),
  .hero-actions :deep(.el-button),
  .side-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .question-feed,
  .pagination-wrap,
  .filter-drawer {
    padding-left: 0;
    padding-right: 0;
  }

  .filter-drawer {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
